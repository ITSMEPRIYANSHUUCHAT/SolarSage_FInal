# Deployment — AWS EC2 (Nginx static host)

> **Important architectural note:** SolarSage has **no Node/Express server**. The backend (Postgres, Auth, Storage, edge functions) is fully hosted by **Supabase**. Therefore EC2 only serves the **static SPA bundle** behind Nginx. "PM2/Node app" steps that would apply to a traditional MERN app are **not applicable** — there is no long-running Node process to manage. (If you later add a custom Node API, revisit this.)

## What actually gets deployed
- **EC2 + Nginx:** the `dist/` static bundle.
- **Supabase (separate):** DB + auth + storage + functions (deploy with the Supabase CLI, not on EC2).

## 1. Provision Ubuntu
- Launch Ubuntu 22.04 LTS, t3.small is plenty (it just serves static files).
- Security group: allow 80, 443, and 22 (restrict 22 to your IP).

## 2. Install Node (build) + Nginx
```bash
sudo apt update && sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Build the SPA
```bash
git clone <repo> && cd SolarSage_FInal
npm ci || npm install
printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\n' "https://glgvubxgigvrczrifcuv.supabase.co" "<anon-key>" > .env
npm run build           # → dist/
sudo mkdir -p /var/www/solarsage && sudo cp -r dist/* /var/www/solarsage/
```
> Build on EC2 or in CI and copy `dist/` up — either works. The anon key is public-by-design.

## 4. Nginx config (SPA + security headers)
`/etc/nginx/sites-available/solarsage`:
```nginx
server {
    listen 80;
    server_name solarsage.example.com;
    root /var/www/solarsage;
    index index.html;

    # SPA history fallback (react-router)
    location / { try_files $uri $uri/ /index.html; }

    # cache hashed assets aggressively
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }

    # SEC-12: security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://*.supabase.co https://api.openai.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'" always;
}
```
```bash
sudo ln -s /etc/nginx/sites-available/solarsage /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
> Tune the CSP `connect-src` to your Supabase project domain. `script-src 'self'` may need adjustment if the dev `lovable-tagger` injects anything — it should not in production builds.

## 5. SSL (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d solarsage.example.com
```
Auto-renew is installed by certbot's systemd timer.

## 6. Domain
- Point an A record at the EC2 Elastic IP. Allocate an Elastic IP so the address survives restarts.

## 7. Backend / MongoDB connection
- **There is no MongoDB.** Do not provision one. The database is Supabase Postgres.
- Deploy/refresh backend separately:
  ```bash
  supabase link --project-ref glgvubxgigvrczrifcuv
  supabase db push                       # apply migrations
  supabase functions deploy process-pdf upload-pdf
  supabase secrets set OPENAI_API_KEY=sk-...
  ```

## 8. Environment variables
- **EC2/SPA:** only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (baked into the build).
- **Supabase functions:** `OPENAI_API_KEY` (+ auto-injected `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). See [environment-variables.md](environment-variables.md).

## 9. Monitoring
- Nginx access/error logs → CloudWatch agent (optional).
- Supabase dashboard for DB/function logs + OpenAI usage dashboard for spend.
- See [monitoring.md](../operations/monitoring.md).

## When to NOT use EC2
Because the only workload is static files, a CDN/managed static host (Vercel/Netlify/CloudFront+S3) is cheaper, auto-scaling, and lower-ops than EC2. Use EC2 only if you need it for other reasons. See [managed-hosting.md](managed-hosting.md).
