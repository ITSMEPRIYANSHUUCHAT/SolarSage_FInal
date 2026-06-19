# Rate Limiting

> Implemented in code. Because SolarSage has **no Express server**, limits are enforced inside the **Supabase edge functions**, backed by a **Postgres fixed-window counter** so they hold across stateless function instances (in-memory counters would not).

## Architecture
```
request → edge fn → enforce(global per-IP) → auth → enforce(per-user route) → handler
                         │                                  │
                         └──────────── rpc check_rate_limit(key,max,window) ──────────┘
                                                  │
                                       public.rate_limits (Postgres)
```
- Migration: [supabase/migrations/20260615020000_rate_limiting.sql](../../supabase/migrations/20260615020000_rate_limiting.sql) — `rate_limits` table (RLS on, no policies → only the `SECURITY DEFINER` function can write) + `check_rate_limit(key,max,window)` (atomic `INSERT … ON CONFLICT … count+1`).
- Helper: [supabase/functions/_shared/rateLimit.ts](../../supabase/functions/_shared/rateLimit.ts) — `enforce()`, `clientIp()`, and the `RULES` table.

## Configured limits

| Scope | Endpoint | Limit | Behavior on breach |
|-------|----------|-------|--------------------|
| per IP (global) | every function request | **100 / min** | 429 (fail-open on infra error) |
| per user | `process-pdf` (AI / cost) | **20 / min** | 429 (**fail-closed** — protects OpenAI spend) |
| per user | `upload-pdf` | **10 / hour** | 429 (fail-open) |

> The spec's auth limits (login 5/min, signup 5/hr, password-reset 3/hr) are enforced by **Supabase Auth (GoTrue)**, which has built-in rate limiting configurable in the dashboard (Auth → Rate Limits) — SolarSage does not implement its own auth endpoints, so those limits live there, not in app code. See [docs/security/server-hardening.md](server-hardening.md) for the Nginx edge layer that adds an IP limit in front of everything.

## Why these choices
- **Fixed window** is simple, atomic, and cheap; good enough for abuse/cost control. (Sliding window/token bucket can replace it later if needed.)
- **Fail-open by default** so a transient DB error can't lock out all users; **fail-closed on the AI endpoint** because the downside there is real money (OpenAI). This is a deliberate, documented trade-off (`{ failClosed: true }`).
- **Global IP layer first** stops floods before auth/parse work happens.

## Defense in depth (recommended additional layers)
1. **Edge/CDN**: Cloudflare or AWS WAF rate rules in front of the SPA + functions (catches volumetric attacks before they reach Supabase).
2. **Nginx** (if self-hosting the SPA): `limit_req_zone` — see [server-hardening.md](server-hardening.md).
3. **Supabase Auth** built-in limits for login/signup/reset.

## Validation
With the local stack running (`supabase start` + `functions serve`) and the migration applied:
```bash
# exceed process-pdf 20/min:
for i in $(seq 1 25); do
  curl -s -o /dev/null -w "%{http_code} " -X POST \
    -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d '{"pdfText":"x"}' \
    "$BASE/functions/v1/process-pdf"; done; echo
# expect: ...200/4xx... then 429 once the window limit is hit
```
`scripts/api-smoke.sh` includes the auth/guard checks; add a loop like the above to observe 429s.

## Risk reduction
- Blocks credential-stuffing/flooding against the functions, file-upload abuse, and **OpenAI cost-amplification** (the highest-dollar risk) via the fail-closed per-user AI limit.
