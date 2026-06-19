# SolarSage — Master Engineering Report

**Date:** 2026-06-15 · **Prepared by:** Codebase audit (Senior Staff Engineer / Architect / Security / DevOps / Tech Writer)
**Method:** Full static source audit; the **source code is the single source of truth**. A production build was run to validate fixes (`npm install && npm run build` → exit 0, 2987 modules).

> ⚠️ **Reality check vs. the brief.** The task assumed an Express/MongoDB/LangChain/FAISS/RAG stack. **None of that exists.** SolarSage is a **Vite/React SPA + Supabase (Postgres/Auth/Storage/Deno edge functions)** with a **single OpenAI `gpt-4o-mini`** extraction call. There are no embeddings, no vector DB, and no RAG pipeline. A `mongoose` dependency existed but could never run in the browser (now removed).

---

## 1. Project overview
SolarSage analyzes Indian electricity bills: a user uploads a PDF, an edge function extracts text (`pdfjs-dist`), OpenAI extracts structured fields, the app derives solar-performance insights and stores a per-user record, and the user can view records and download a jsPDF report. A **guest mode** returns hardcoded demo data. See [feature-catalog.md](features/feature-catalog.md).

## 2. Architecture
- **Frontend:** React 18 SPA (Vite, shadcn/ui, react-router, react-query). 6 routes; auth via React Context + Supabase.
- **Backend:** Supabase — Postgres (`customer_info`, `profiles`, RLS), Auth (email/password + Google), Storage (`pdfs` bucket), two Deno edge functions (`upload-pdf`, `process-pdf`).
- **AI:** one OpenAI chat-completion in `process-pdf`. No RAG.
- Full diagrams in [system-architecture.md](architecture/system-architecture.md); stack in [technology-stack.md](architecture/technology-stack.md); layout in [repository-structure.md](architecture/repository-structure.md).

## 3. Feature inventory (status)
✅ Email/pw auth · ✅ protected routing · ✅ PDF upload+extraction · ✅ AI extraction · ✅ insights dashboard · ✅ records list/delete · ⚠️ Google OAuth (needs config) · ⚠️ guest mode (mock data) · ⚠️ PDF report (jsPDF works; broken DB-save **fixed**) · ⚠️ solar comparator (mostly mock) · 💤 Solcast, OTP, second insights panel (dead) · ❌ admin/search (don't exist). Detail: [feature-catalog.md](features/feature-catalog.md).

## 4. Current problems (top of the list)
| ID | Problem | Sev | Status |
|----|---------|-----|--------|
| FAIL-01 | Mongoose ran in the browser, crashing the report save | 🔴 | ✅ fixed |
| SEC-01 | `pdfs` bucket public → bills (PII) world-readable | 🟠 | open |
| SEC-02/FAIL-03 | `upload-pdf` unauthenticated, unbounded | 🟠 | ⚠️ size/MIME guard added; auth still open |
| FAIL-02 | OpenAI output not forced to JSON → intermittent failures | 🟠 | open |
| FAIL-04 | Guest mode shows fabricated data with weak labeling | 🟠 | open |
| FAIL-06/PERF-02 | No index on `customer_info.user_id` | 🟡 | ✅ migration provided |
| FAIL-05 | Hardcoded single-env config | 🟡 | ✅ fixed |
| — | No tests, no CI, no monitoring | 🟡 | open |
Full RCA: [production-failure-report.md](audits/production-failure-report.md).

## 5. Security findings
**Initial risk: HIGH (6.8/10).** After Phase 15 hardening: **Security Score 84/100, 0 critical, 0 open-in-code high.** Implemented: layered Postgres-backed rate limiting, Zod input validation, allow-list CORS, full security-header set (CSP/HSTS/…), structured PII-redacted logging, private per-user storage, runtime dependency CVEs cleared (jspdf/dompurify/react-router upgraded), fail-fast secrets, prompt-injection guard. Full detail + per-change table + verdict: **[security/security-report.md](security/security-report.md)** (plus [dependency-audit](security/dependency-audit.md), [rate-limiting](security/rate-limiting.md), [cors-policy](security/cors-policy.md), [security-headers](security/security-headers.md), [logging-strategy](security/logging-strategy.md), [server-hardening](security/server-hardening.md)). Original analysis + OWASP mapping: [security-audit.md](audits/security-audit.md).

## 6. Performance findings
Main costs: LLM round-trip + edge cold starts (user-visible latency), bundle weight from now-removed mongoose/dead code, and the missing `user_id` index at scale. No server tier to tune. Quick wins shipped (mongoose removed) or staged (index migration, `max_tokens`/timeout). Detail: [performance-audit.md](audits/performance-audit.md).

## 7. Fixes applied this pass
- **FIX-01** removed the mongoose data layer (3 files + dependency) and the crashing DB-save in `InsightsDocument`; **build re-validated green**.
- **FIX-02** removed the `Math.random()` fake-AI module.
- **FIX-03** made Supabase config environment-driven (with safe fallback) + added `.env.example`.
- **FIX-04** added PDF-only + 10 MB guard to `upload-pdf`.
- **FIX-05** added a migration: `user_id` composite index + `handle_new_user` `search_path` hardening.
Log: [fix-log.md](fixes/fix-log.md).

## 8. Scorecards

### Production Readiness: **7 / 10** 🟡 (was 4/10 pre-hardening)
After Hardening Pass 2 (see [fix-log.md](fixes/fix-log.md)): bucket privatized + per-user storage RLS, `upload-pdf` authenticated, CORS allow-listed, AI extraction forced to JSON with timeout/retry, fail-fast secrets, correct status codes, guest data clearly labeled, light/dark/mobile UI, error boundary, CI. Remaining gap to 10 is **operational deployment** (apply the new migrations, deploy functions, set `ALLOWED_ORIGINS`/`OPENAI_API_KEY`, configure Supabase Auth password policy, wire monitoring) plus tests + numeric-column migration.

### Maintainability: **5.5 / 10** 🟡
Small, readable active path; dragged down by dead code, duplicated entity types, `text`-typed numerics, and no tests/CI. Detail: [code-quality.md](audits/code-quality.md).

### Deployment Readiness: **6 / 10** 🟡
Deployment is straightforward (static SPA + Supabase); guides for EC2/Docker/ECS/managed provided. Held back from higher by missing CI/CD, monitoring, restricted CORS, and the open security items.

## 9. Recommended fix order
1. **Security blockers (now):** privatize `pdfs` bucket + signed URLs (SEC-01); require auth on `upload-pdf` (SEC-02); restrict CORS (SEC-04).
2. **Core reliability (this week):** force `response_format: json_object` + schema-validate + retry/`max_tokens` (FAIL-02/PERF-06); fail-fast secrets (SEC-07); apply the FIX-05 migration; `search_path` (SEC-08).
3. **Trust/UX (this sprint):** clearly label guest data or add a real rate-limited anon path (FAIL-04); server-side quotas (SEC-05); password policy (SEC-06).
4. **Engineering health:** Sentry + structured/redacted logging + health check ([monitoring.md](operations/monitoring.md)); Vitest + Deno tests; CI with `npm audit`; remove the second lockfile; remaining dead-code cleanup.
5. **Data quality:** convert numeric `text` columns to `numeric` with backfill; unify entity types on generated DB types.

## 10. 90-day roadmap
- **Days 1–15 (stabilize & secure):** items #1–#2 above; redact logs; deploy frontend to a managed host; deploy hardening migration; basic Sentry + health check.
- **Days 16–45 (quality & trust):** guest labeling/real path; server-side quotas; password/leaked-password protection; introduce tests + CI; merge upload+process into one function; real progress events.
- **Days 46–75 (data & performance):** numeric column migration + backfill; entity-type unification; manual chunking/lazy-load heavy panels; OpenAI spend dashboard + cap; per-user storage paths.
- **Days 76–90 (product decisions):** activate or remove Solcast/OTP; decide on real neighbor-comparison data; optional OCR for scanned bills; evaluate whether any true RAG/knowledge feature is warranted (would be net-new).

---

## FINAL ASSESSMENT — Can this application safely run in production?

> **Updated after Hardening Pass 2.** The code-level blockers below have been addressed (privatized bucket + storage RLS, authenticated upload, allow-listed CORS, reliable JSON extraction, fail-fast secrets, guest labeling, error boundary, CI). The verdict now hinges on **operational deployment steps**, not code defects.

# ⚠️ CONDITIONAL YES — code is production-ready; ship after the deploy checklist.

**Ship once these ops steps are done (no code changes needed):**
1. `supabase db push` to apply the two new migrations (index + `search_path`; privatize `pdfs` bucket + storage RLS).
2. `supabase functions deploy process-pdf upload-pdf health` and set secrets: `OPENAI_API_KEY`, `ALLOWED_ORIGINS=<prod origin>`.
3. Supabase Auth: enable min-password length + leaked-password protection; add the production Google OAuth redirect URL.
4. Wire an uptime monitor to `/functions/v1/health` and a Sentry DSN (`VITE_SENTRY_DSN`).

**Recommended soon after launch (not blockers):** migrate numeric `text` columns to `numeric`; add unit/integration tests; activate or remove Solcast.

---

### Historical verdict (pre-hardening, for the record): ❌ NO — not yet.

**Justification (evidence-based):**
- 🔴 **Confidentiality breach by design:** the `pdfs` bucket is `public=true` with public SELECT and guessable object names ([migration 2025-08-06:38-47](../supabase/migrations/20250806173305_c9a2b3e7-4632-49a0-84d8-39517f0090a6.sql), [upload-pdf:68](../supabase/functions/upload-pdf/index.ts)). Uploaded bills contain PII (name, address, account number) and are world-readable. This alone disqualifies production.
- 🟠 **Open abuse surface:** `upload-pdf` runs with `verify_jwt=false` and (pre-fix) no limits ([config.toml](../supabase/config.toml)); the FIX-04 size/MIME guard reduces but does not close this — it still needs authentication.
- 🟠 **Unreliable core feature:** OpenAI output is not constrained to JSON, so extraction intermittently fails ([process-pdf:136-167](../supabase/functions/process-pdf/index.ts)).
- 🟠 **Misleading UX:** guest mode presents fabricated numbers as analysis ([guestService.ts:26-112](../src/services/guestService.ts)).
- 🟡 **No observability, no tests, no CI:** failures would be invisible and unverified.

**What is already true / fixed:** the app builds and runs; per-user **RLS is correctly enforced** on the database; server secrets are not exposed to the client; and the single hard **runtime crash (mongoose-in-browser) is fixed and re-validated by a green build**.

**Path to YES (realistically ~2–3 weeks of focused work):** complete fix-order items #1 and #2 (privatize storage + auth the uploader + restrict CORS + reliable JSON extraction + fail-fast secrets + hardening migration) and add minimal observability. After those, SolarSage can carry a limited production / beta launch. The remaining roadmap items raise it to a robust production posture.
