# Deployment — Docker

> Containerizes the **static SPA** only (multi-stage build → Nginx). The Supabase backend is external and not containerized here. (For a fully local backend you'd use `supabase start`, which manages its own containers — separate from this image.)

## Dockerfile
Create `Dockerfile` at the repo root:

```dockerfile
# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
# Public build-time config (anon key is public by design)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

## nginx.conf
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://*.supabase.co https://api.openai.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'" always;
}
```

## docker-compose.yml
```yaml
services:
  web:
    build:
      context: .
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
    image: solarsage-web:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```
> `.dockerignore` should include `node_modules`, `dist`, `.git`, `*.lockb` to keep the build context small.

## Build & run
```bash
export VITE_SUPABASE_URL=https://glgvubxgigvrczrifcuv.supabase.co
export VITE_SUPABASE_ANON_KEY=<anon-key>
docker compose build
docker compose up -d           # http://localhost:8080
```

## Deploying the image
- Push to ECR/GHCR: `docker tag solarsage-web <registry>/solarsage-web:<sha> && docker push ...`.
- Run anywhere that runs containers (ECS, Fly, Cloud Run, a VM with Docker).

## Backend (unchanged)
The container does **not** include the DB or functions. Deploy those via Supabase CLI:
```bash
supabase db push
supabase functions deploy process-pdf upload-pdf
supabase secrets set OPENAI_API_KEY=sk-...
```

## Notes
- The anon key is embedded at **build time** (Vite inlines `VITE_*`). To retarget environments, rebuild with different args — there is no runtime env for a static SPA.
- Image is tiny (~nginx:alpine + static assets). No Node runtime ships in the final image.
