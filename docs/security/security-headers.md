# Security Headers

> The SPA's "server" is whatever serves `dist/`. Headers are provided for **all** target hosts. There is no Helmet because there is no Express app — Helmet's job is done by the static host / Nginx config below.

## Implemented files
- **Netlify / Cloudflare Pages**: [public/_headers](../../public/_headers) (copied into `dist/` by Vite).
- **Vercel**: [vercel.json](../../vercel.json) (`headers` + SPA `rewrites`).
- **Nginx (EC2/Docker)**: snippet below and in [server-hardening.md](server-hardening.md) / [aws-ec2.md](../deployment/aws-ec2.md).

## Final header set

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | see below | blocks XSS, restricts script/connect origins |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | force HTTPS (HSTS) |
| `X-Frame-Options` | `DENY` | clickjacking (legacy; CSP `frame-ancestors` is the modern form) |
| `X-Content-Type-Options` | `nosniff` | stop MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | disable unused powerful features + FLoC |
| `Cross-Origin-Opener-Policy` | `same-origin` | process isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | limit cross-origin embedding |

### CSP (final)
```
default-src 'self';
base-uri 'self';
frame-ancestors 'none';
object-src 'none';
form-action 'self';
img-src 'self' data: blob:;
font-src 'self' data:;
style-src 'self' 'unsafe-inline';
script-src 'self';
worker-src 'self' blob:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
upgrade-insecure-requests
```
**Rationale & caveats**
- `script-src 'self'` — no inline/`eval` scripts; **no `unsafe-eval`**. Verify the production build needs none (the dev-only `lovable-tagger` does not run in prod builds).
- `style-src 'unsafe-inline'` — required: Radix UI / recharts inject inline styles. (Tightening to nonces/hashes is a later enhancement.)
- `connect-src` — browser only talks to Supabase (REST + Realtime websocket). OpenAI is **server-side**, so it is intentionally absent. If you activate client-side Solcast, add `https://api.solcast.com.au`.
- `img-src`/`worker-src blob:` — needed by the PDF viewer / jsPDF/html2canvas.
- `frame-ancestors 'none'` + `X-Frame-Options: DENY` — defense in depth against clickjacking.

## Nginx equivalent
```nginx
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
```

## Validation
- After deploy: `curl -I https://app.example/` and confirm all headers present.
- Run the site through **securityheaders.com** and **CSP Evaluator**; target A/A+.
- Click through every screen (upload, insights, PDF download, records) with devtools open and fix any CSP violations before tightening further.
