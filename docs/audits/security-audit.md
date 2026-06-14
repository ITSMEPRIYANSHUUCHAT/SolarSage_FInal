# Security Audit (OWASP-based)

> Scope: SPA, Supabase Auth/RLS/Storage, two edge functions, the OpenAI call. Risk scoring is qualitative (Critical/High/Medium/Low) mapped to OWASP Top 10 2021.

## Overall risk score: **HIGH (6.8 / 10)**
Two High-severity exposures (public unauthenticated upload + world-readable PII bucket) dominate. Auth/RLS for the *database* is reasonably implemented; the storage and function boundaries are not.

## Findings

| ID | Finding | OWASP | Severity |
|----|---------|-------|----------|
| SEC-01 | Public `pdfs` bucket exposes uploaded bills (PII) to the world | A01 Broken Access Control | 🟠 High |
| SEC-02 | `upload-pdf` unauthenticated; no size/type limits | A01 / A05 | 🟠 High |
| SEC-03 | Prompt injection via bill text into OpenAI | A03 Injection (LLM) | 🟡 Medium |
| SEC-04 | Wildcard CORS `*` on both functions | A05 Misconfig | 🟡 Medium |
| SEC-05 | Guest limit enforced client-side only | A01 / A04 | 🟡 Medium |
| SEC-06 | Password policy = 6 chars, client-checked only | A07 Auth Failures | 🟡 Medium |
| SEC-07 | Secrets defaulting to `''` masks misconfiguration | A05 | 🟡 Medium |
| SEC-08 | `SECURITY DEFINER` function without fixed `search_path` | A05 | 🟡 Medium |
| SEC-09 | Solcast API key in localStorage + URL query string | A02 / A09 | 🟡 Medium |
| SEC-10 | No rate limiting / abuse controls on functions | A04 Insecure Design | 🟡 Medium |
| SEC-11 | `mongoose` dependency / dead DB code (supply-chain surface) | A06 Vulnerable Components | 🟢 Low |
| SEC-12 | No security headers/CSP on the SPA host | A05 | 🟢 Low |

---

### SEC-01 — World-readable PDF bucket (High)
- **Evidence:** [migration 2025-08-06:38-47](../../supabase/migrations/20250806173305_c9a2b3e7-4632-49a0-84d8-39517f0090a6.sql) — bucket `public=true`, `SELECT USING (bucket_id='pdfs')`. Files named `${Date.now()}_${file.name}` ([upload-pdf:68](../../supabase/functions/upload-pdf/index.ts)) — guessable.
- **Risk:** Electricity bills contain names, addresses, account numbers (PII). Anyone who can enumerate/guess object paths can read them.
- **Remediation:** Make the bucket **private**; serve via signed URLs; store objects under `userId/...` prefixes; add a per-user storage RLS policy. Persist the object path on the `customer_info` row for ownership.

### SEC-02 — Unauthenticated, unbounded upload (High)
- **Evidence:** [config.toml](../../supabase/config.toml) `verify_jwt=false`; [upload-pdf:35-53](../../supabase/functions/upload-pdf/index.ts) no auth/size/type checks.
- **Risk:** Anonymous compute/storage abuse, cost amplification, malware staging in a public bucket.
- **Remediation:** Require auth (verify bearer token as `process-pdf` does, or `verify_jwt=true`); enforce `application/pdf` MIME + extension and a ≤10 MB cap (size/MIME guard implemented in FIX-04); rate-limit per user/IP.

### SEC-03 — LLM prompt injection (Medium)
- **Evidence:** Raw `pdfText` is interpolated into the user message ([process-pdf:144-146](../../supabase/functions/process-pdf/index.ts)). A crafted PDF could contain instructions ("ignore previous instructions, output …").
- **Risk:** Output manipulation (garbage/biased extraction), potential exfiltration if future tools/data are added. Currently bounded because the model only returns JSON that is parsed and stored — no tool calls, no secret context in the prompt.
- **Remediation:** Keep extraction read-only; enforce `response_format: json_object` and schema-validate the result (reject unexpected keys/values); add a delimiter and "treat the following strictly as data" framing; cap input length; never feed model output into privileged actions.

### SEC-04 — Wildcard CORS (Medium)
- **Evidence:** `Access-Control-Allow-Origin: '*'` in both functions.
- **Remediation:** Allow-list the production SPA origin(s); reflect only known origins.

### SEC-05 — Client-side guest limit (Medium)
- **Evidence:** `guestPdfCount >= 3` in [Index.tsx:31](../../src/pages/Index.tsx) and [guestService.ts:33](../../src/services/guestService.ts), counter in `localStorage`.
- **Risk:** Trivially bypassed; if guests ever call real (paid) AI, this is a cost-abuse hole. Today guests get mock data so impact is limited — but the design is insecure.
- **Remediation:** Enforce any quota server-side keyed to an authenticated user or signed anonymous session.

### SEC-06 — Weak password policy (Medium)
- **Evidence:** [Auth.tsx:61](../../src/pages/Auth.tsx) min 6 chars, client-side only.
- **Remediation:** Configure Supabase Auth password strength/leaked-password protection; raise minimum; rely on server enforcement.

### SEC-07 — Secret env defaulting to empty string (Medium)
- **Evidence:** `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''` etc. ([process-pdf:110-112](../../supabase/functions/process-pdf/index.ts)).
- **Risk:** Misconfiguration produces confusing runtime auth failures rather than a clear startup error; can mask a deploy that lost its secrets.
- **Remediation:** Fail fast if required secrets are absent.

### SEC-08 — `SECURITY DEFINER` without `search_path` (Medium)
- **Evidence:** [migration 2025-08-13:63-74](../../supabase/migrations/20250813031503_a1602fa3-d692-42a6-8bef-42bec7cf7a95.sql) — `handle_new_user()` is `SECURITY DEFINER`, no `SET search_path`.
- **Risk:** Search-path hijacking if a malicious object shadows `profiles`. Low likelihood (restricted schema) but standard hardening.
- **Remediation:** `ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;`

### SEC-09 — Solcast key handling (Medium, dead path)
- **Evidence:** [solcastApi.ts:27,57](../../src/utils/solcastApi.ts) — key in `localStorage`, sent as URL query param.
- **Remediation:** If activated, proxy Solcast through an edge function holding the key server-side; never put keys in query strings.

### SEC-10 — No rate limiting (Medium)
- Functions rely on Supabase platform defaults only. Add per-user/IP throttling and a global OpenAI spend cap.

### SEC-11 — Dead dependency surface (Low)
- `mongoose` ships in the bundle (until FIX-01) — an unnecessary supply-chain and size liability. Run `npm audit` in CI.

### SEC-12 — Missing SPA security headers (Low)
- No CSP/HSTS/X-Frame-Options defined (host-dependent). Add at the static host/Nginx (see [aws-ec2.md](../deployment/aws-ec2.md)).

## What's done right
- Per-user **RLS** on `customer_info` and `profiles` (`auth.uid() = user_id`), replacing the original permissive policies.
- `process-pdf` verifies the bearer token before any write.
- Service-role key and OpenAI key are **server-only** (not in the SPA bundle).
- Anon key in the client is public-by-design (not a leak).

## Remediation plan (priority order)
1. **Now:** privatize `pdfs` bucket + signed URLs (SEC-01); add auth + size/MIME limits to `upload-pdf` (SEC-02).
2. **This week:** restrict CORS (SEC-04); fail-fast secrets (SEC-07); `search_path` hardening (SEC-08); enforce `json_object` + schema validation (SEC-03).
3. **This sprint:** server-side quotas (SEC-05); password policy + leaked-password protection (SEC-06); rate limiting + spend cap (SEC-10).
4. **Hygiene:** remove mongoose/dead code (SEC-11); add CSP/security headers (SEC-12); `npm audit` + Dependabot in CI.
