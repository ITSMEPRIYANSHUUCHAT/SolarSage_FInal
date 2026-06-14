# Deployment — Managed Hosting (Vercel / Netlify / Render / Railway / Fly.io / Cloudflare)

> SolarSage's frontend is a **static SPA** and its backend is **Supabase**. The cheapest, simplest, most scalable deployment is a static/CDN host for `dist/` + Supabase for everything else. This is the **recommended** path.

## The build the host needs
| Setting | Value |
|---------|-------|
| Install | `npm ci` (or `npm install`) |
| Build command | `npm run build` |
| Output dir | `dist` |
| SPA fallback | rewrite all routes → `/index.html` |
| Env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Node | 20 |

### Vercel
- Framework preset: **Vite**. Add a rewrite in `vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
- Set the two `VITE_` env vars in Project Settings. Auto-deploys on push.

### Netlify
- Build `npm run build`, publish `dist`. Add `public/_redirects` (or `netlify.toml`):
```
/*  /index.html  200
```

### Cloudflare Pages
- Build `npm run build`, output `dist`. SPA fallback is automatic (or add `_redirects`).

### Render (Static Site)
- New → **Static Site** → build `npm run build`, publish `dist`, add a rewrite rule `/* → /index.html`. (Use a "Static Site", not a "Web Service" — there is no server process.)

### Railway
- Railway is server-oriented; for a static SPA use the Docker image from [docker.md](docker.md), or prefer a true static host. If using Docker, expose port 80.

### Fly.io
- `fly launch` against the [Dockerfile](docker.md); `internal_port = 80`. Good if you want edge presence with the Nginx image. Overkill for pure static vs. a CDN.

## Backend (all options)
Independent of the frontend host:
```bash
supabase db push
supabase functions deploy process-pdf upload-pdf
supabase secrets set OPENAI_API_KEY=sk-...
```
Add your frontend's production origin to Supabase Auth redirect URLs (Google OAuth) and restrict function CORS to it (SEC-04).

## Comparison

| Option | Cost (low traffic) | Scalability | Complexity | Best for |
|--------|--------------------|-------------|------------|----------|
| **Vercel / Netlify / CF Pages** | Free–$ | Excellent (CDN) | Very low | **Recommended default** |
| Render Static Site | Free–$ | Good (CDN) | Low | already on Render |
| CloudFront + S3 | ~cents | Excellent | Medium | AWS-standardized orgs |
| Fly.io / Railway (Docker) | $ (always-on) | Good | Medium | need edge container/runtime |
| AWS ECS Fargate + ALB | $$ (ALB floor) | Excellent | High | existing ECS platform |
| AWS EC2 + Nginx | $ (always-on, self-managed) | Manual | High | full control / other workloads |

## Recommendation
**Frontend → Vercel (or Netlify/Cloudflare Pages). Backend → Supabase (already there).**
Rationale: zero servers to manage, global CDN, automatic TLS, preview deploys, near-zero cost at low traffic, and it matches the actual architecture (static client + BaaS). Reserve EC2/ECS/Docker for cases where org policy mandates self-hosting.

> Before any production launch, complete the security remediations in [security-audit.md](../audits/security-audit.md) — especially privatizing the `pdfs` bucket and adding auth to `upload-pdf`. Hosting choice does not mitigate those.
