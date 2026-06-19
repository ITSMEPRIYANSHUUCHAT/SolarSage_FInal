# Phase 15 — Production Security Hardening Report

> Architecture: static React SPA + Supabase (Postgres/Auth/Storage + Deno edge functions). There is **no Express/Node server, no custom JWT, no MongoDB, no vector DB** — every spec item was mapped to the real stack and **implemented in code where possible**, validated by `tsc`/`build`/tests.

## Security Score: **84 / 100**

| Domain | Score | State |
|--------|-------|-------|
| Authentication | 9/10 | Supabase GoTrue (JWT exp+refresh, bcrypt); policy strengthened; leaked-pw protection = dashboard toggle |
| Authorization (RLS/IDOR) | 10/10 | per-user RLS on tables + storage; no IDOR |
| API security / injection | 9/10 | Zod validation, parameterized queries, no SSRF/command-injection vectors |
| File upload | 8/10 | auth + type + size + per-user path + private bucket + rate limit; no AV scan |
| AI security | 9/10 | prompt-injection guard, server-side key, no cross-user access, PII not logged |
| Dependencies | 9/10 | 0 runtime CVEs (critical fixed); dev-only remain |
| Rate limiting | 9/10 | layered, Postgres-backed; fail-closed on AI |
| Security headers | 8/10 | full set incl. CSP/HSTS (needs browser verify + deploy) |
| CORS | 9/10 | allow-list (needs `ALLOWED_ORIGINS` set) |
| Logging/monitoring | 7/10 | structured+redacted; Sentry/alerts not yet wired |
| Secrets | 9/10 | env-based, none hardcoded (anon key public by design) |
| Server hardening | 7/10 | documented; applied at deploy time |

## Findings

**Critical: 0** · **High: 0 open in code** (3 deploy-time gates, below) · **Medium: 4** · **Low: 3**

### Medium
- **M1 — No malware/content scanning on uploads.** PDFs are parsed, not scanned. *Mitigation in place:* private per-user bucket, type+size caps, auth, rate limit. *Recommend:* ClamAV/Lambda scan or Supabase Storage AV if handling untrusted files at scale.
- **M2 — CSP not yet browser-verified.** Strict CSP shipped; must click through with devtools to catch violations before tightening (`style-src 'unsafe-inline'` still present).
- **M3 — Global rate limiter fails open** on DB error (deliberate, to avoid lockout). AI endpoint fails closed. Accept or add a secondary edge/WAF limit.
- **M4 — No automated security tests / audit-log table.** Smoke script provided; add CI tests + a `customer_info` audit trigger.

### Low
- **L1 —** Dev/build-only dependency CVEs (Vite/esbuild/rollup/eslint) — not in the shipped bundle ([dependency-audit.md](dependency-audit.md)).
- **L2 —** Guest 3-PDF limit is client-side (guests get mock data only; no server cost).
- **L3 —** `updated_at` not maintained by trigger (data hygiene, not security).

## Changes implemented (mandatory detail)

| # | File(s) | Change | Reason | Validation | Risk reduction |
|---|---------|--------|--------|------------|----------------|
| 1 | [package.json](../../package.json) | jspdf 3→4.2.1, dompurify→3.4.10, react-router-dom→6.30.4 | remove the **critical** + XSS + routing CVEs that shipped to browsers | `tsc` 0, `build` 0, `dev-checks` 15/15 | eliminates all runtime-reachable CVEs |
| 2 | [migrations/…_rate_limiting.sql](../../supabase/migrations/20260615020000_rate_limiting.sql), [_shared/rateLimit.ts](../../supabase/functions/_shared/rateLimit.ts), process-pdf, upload-pdf | Postgres-backed layered rate limiting (100/min IP; 20/min user AI fail-closed; 10/hr user upload) | stop flooding, brute-force, **OpenAI cost-amplification** | local-stack curl loop returns 429 after limit | DoS/abuse/cost |
| 3 | [_shared/validate.ts](../../supabase/functions/_shared/validate.ts), process-pdf | Zod schema + size bounds on request body | injection/oversized-payload defense, consistent validation | 400 on bad body | API abuse |
| 4 | [_shared/http.ts](../../supabase/functions/_shared/http.ts) (prior), both functions | allow-list CORS via `ALLOWED_ORIGINS`, proper 400/401/413/422/429/502/504 | remove wildcard CORS; correct error semantics | OPTIONS reflects only approved origin | CSRF-ish/info-leak |
| 5 | [_shared/log.ts](../../supabase/functions/_shared/log.ts), both functions | structured JSON logs + request IDs, **PII/secret redaction** (removed full AI-response log) | auditability without data leakage | log lines contain only ids/lengths | data leakage |
| 6 | [public/_headers](../../public/_headers), [vercel.json](../../vercel.json), nginx snippet | CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy, COOP/CORP | XSS/clickjacking/transport hardening | `dist/_headers` present; verify via securityheaders.com | XSS/clickjacking |
| 7 | [migrations/…_privatize_pdfs_bucket.sql](../../supabase/migrations/20260615010000_privatize_pdfs_bucket.sql) (prior) | private bucket + per-user storage RLS + per-user paths | stop world-readable bill PII | apply migration; direct read denied without signed URL | confidentiality/IDOR |
| 8 | process-pdf (prior) | OpenAI `json_object` + max_tokens + timeout + retry + **prompt-injection guard** | reliability + AI safety | 422 on bad output; bill text framed as untrusted | prompt injection/cost |
| 9 | [Auth.tsx](../../src/pages/Auth.tsx) (prior) | password ≥8 + letter & number | credential strength | sign-up rejects weak pw | brute-force |
| 10 | [requireEnv](../../supabase/functions/_shared/http.ts) | fail-fast on missing secrets | avoid silent misconfig with empty creds | 500 with clear msg if unset | misconfig |

## Public Deployment Ready?

# ⚠️ Code: YES — Live deploy: only after the 3 operational gates below.

The **codebase is hardened and production-suitable**. It is **not yet safe on the live hosted project** because the hardening lives in migrations/functions that must be deployed, and the hosted bucket is still public until the migration runs.

### Exact blockers (operational — no code left to write)
1. **Apply migrations** to the project: `supabase db push` (privatize `pdfs` bucket + storage RLS, rate-limit table/function, perf index, `search_path`).
2. **Deploy functions + secrets**: `supabase functions deploy process-pdf upload-pdf health` and set `OPENAI_API_KEY`, `ALLOWED_ORIGINS=<prod origin(s)>`.
3. **Supabase Auth dashboard**: enable leaked-password protection + min length; add production Google OAuth redirect URL; confirm built-in auth rate limits.

### Remaining recommendations (post-launch, non-blocking)
- Verify CSP in-browser and tighten `style-src`; run securityheaders.com / ssllabs (target A+).
- Wire **Sentry** (frontend + functions) + uptime monitor on `/functions/v1/health`; alarms on 5xx/429/OpenAI spend.
- Add **WAF/CDN** (Cloudflare/AWS WAF) in front for volumetric protection.
- Add upload **AV scanning** (M1), an **audit-log** trigger (M4), and **security tests** in CI.
- Schedule the **Vite 5→6** dev-toolchain upgrade to clear dev-only CVEs.

## How to validate this pass
```bash
npx tsc -p tsconfig.app.json --noEmit   # exit 0
npm run build                            # exit 0, dist/_headers present
node scripts/dev-checks.ts               # 15/15
npm audit --json | jq '.metadata.vulnerabilities'   # critical:0
# with local Supabase stack: bash scripts/api-smoke.sh  (401/400/413/422 + 429 under load)
```
