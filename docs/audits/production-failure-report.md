# Production Failure Report (Root Cause Analysis)

> Method: static analysis of the full source tree. Each issue lists Severity, Impact, Root Cause, Evidence (file:line), Fix, Validation, and Effort. Fixes marked ✅ implemented are recorded in [fix-log.md](../fixes/fix-log.md).

## Severity summary

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| FAIL-01 | Mongoose in the browser bundle (report + records "save") | 🔴 Critical | ✅ fixed |
| FAIL-02 | OpenAI output not constrained to JSON → parse failures | 🟠 High | documented |
| FAIL-03 | `upload-pdf` has no auth, size, or type limits | 🟠 High | partially fixed |
| FAIL-04 | Guest mode ships fake data as if real | 🟠 High | documented |
| FAIL-05 | Hardcoded single-env Supabase config | 🟡 Medium | ✅ fixed |
| FAIL-06 | No index on `customer_info.user_id` | 🟡 Medium | documented (migration provided) |
| FAIL-07 | Storage upload failure is swallowed | 🟡 Medium | documented |
| FAIL-08 | Two lockfiles → non-reproducible installs/CI | 🟡 Medium | documented |
| FAIL-09 | `verify_jwt=false` + CORS `*` on functions | 🟡 Medium | documented |
| FAIL-10 | Dead simulation code shipped (`aiDataExtraction`, etc.) | 🟢 Low | ✅ partially removed |

---

### FAIL-01 — Mongoose runs in the browser (Critical) ✅
- **Impact:** The "Download Report" flow and any record-save path pull `mongoose` into the client bundle. `mongoose.connect()` cannot work in a browser (needs Node net/tls). At minimum users get a *"PDF generated but failed to save data to database"* error toast on every report; the dead module also bloats the lazy chunk and risks a hard `ReferenceError`/module-eval crash depending on bundler polyfills.
- **Root Cause:** A parallel, abandoned MongoDB data layer left in `src/` and imported by an active component.
- **Evidence:**
  - [src/components/InsightsDocument.tsx:8](../../src/components/InsightsDocument.tsx) `import { createCustomerInfo, convertToCustomerInfo } from '@/services/customerService'`
  - [src/services/customerService.ts:2-3](../../src/services/customerService.ts) imports `dbConnect` + mongoose `CustomerInfo`
  - [src/utils/dbConnect.ts:2,19](../../src/utils/dbConnect.ts) `import mongoose ...; mongoose.connect(MONGODB_URI)`
  - [package.json:53](../../package.json) `"mongoose": "^8.13.2"`
  - The row is **already** persisted server-side by `process-pdf`, so this client save is redundant as well as broken.
- **Fix:** Remove `customerService.ts`, `models/CustomerInfo.ts`, `utils/dbConnect.ts`; drop the import and the `createCustomerInfo` call from `InsightsDocument.tsx` (PDF still generates via jsPDF); remove `mongoose` from `package.json`. (FIX-01)
- **Validation:** `npm run build` succeeds with no mongoose in `dist/`; click "Download Report" → PDF downloads, no error toast, no `mongoose` chunk. `grep -r mongoose src` returns nothing.
- **Effort:** 1–2 hrs.

### FAIL-02 — OpenAI response not forced to JSON (High)
- **Impact:** Intermittent "Failed to extract valid data" errors; the model occasionally wraps JSON in prose or markdown, or returns invalid JSON, causing `JSON.parse` to throw despite manual fence-stripping. Unreliable core feature.
- **Root Cause:** The request does not set `response_format: { type: 'json_object' }`, and parsing relies on regex fence removal.
- **Evidence:** [process-pdf/index.ts:136-167](../../supabase/functions/process-pdf/index.ts) — request body lacks `response_format`; parsing does `aiContent.replace(/```json/...).replace(/```/...); JSON.parse(...)`.
- **Fix:** Add `response_format: { type: 'json_object' }` to the request and append "Respond with a single JSON object" to the system prompt; keep the fence-strip as a fallback; wrap parse in a single retry. Consider `max_tokens` to cap cost.
- **Validation:** Run 20 representative bills; parse-success rate ≥ 95%; log any failures with raw content.
- **Effort:** 2–3 hrs.

### FAIL-03 — `upload-pdf` is unauthenticated and unbounded (High) ⚠️ partial
- **Impact:** Anyone can POST arbitrary files to the function and the public `pdfs` bucket — unbounded compute (pdfjs parsing), storage abuse, and a DoS/cost vector. No MIME or size check.
- **Root Cause:** `verify_jwt=false` and no manual auth/validation in the handler.
- **Evidence:** [config.toml:7-8](../../supabase/config.toml) `verify_jwt = false`; [upload-pdf/index.ts:35-53](../../supabase/functions/upload-pdf/index.ts) accepts any `file`, no checks.
- **Fix:** (a) Add a size cap (e.g. ≤10 MB) and MIME/extension check (`application/pdf`) — *implemented* (FIX-04). (b) Require auth: enable `verify_jwt=true` or verify the bearer token like `process-pdf` does. (c) Make the `pdfs` bucket private and write per-user paths.
- **Validation:** Upload a 50 MB file → 413/400; upload a `.exe` → rejected; unauthenticated invoke → 401 (after auth added).
- **Effort:** 3–5 hrs (auth + bucket privacy is the larger part).

### FAIL-04 — Guest mode presents fabricated numbers as analysis (High)
- **Impact:** Every guest sees identical hardcoded values (₹1250, 450 kWh, 85.2% efficiency) with no disclaimer beyond a small "demo" insight. Misleading; erodes trust; could be construed as deceptive.
- **Root Cause:** `processPDFWithAIAsGuest` returns a static object instead of analyzing the upload.
- **Evidence:** [guestService.ts:26-112](../../src/services/guestService.ts) (mock `BillData`/`InsightsData`); [Index.tsx:56-72](../../src/pages/Index.tsx) guest branch.
- **Fix:** Either (a) clearly label all guest output as "Sample/demo data — sign up for real analysis," or (b) run real analysis for guests against a rate-limited anonymous edge path. Minimum: a prominent banner + watermark.
- **Validation:** Guest result screen shows an unmissable "sample data" label; product/legal sign-off.
- **Effort:** 2–4 hrs (labeling) / 1–2 days (real anon path).

### FAIL-05 — Hardcoded single-environment config (Medium) ✅
- **Impact:** Cannot point dev/staging/prod at different Supabase projects without editing source; risky promotion.
- **Evidence:** [client.ts:5-6](../../src/integrations/supabase/client.ts).
- **Fix:** Read `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` with current literals as fallback (FIX-03).
- **Validation:** Build with env overrides → client targets the override; build without → unchanged behavior.
- **Effort:** 30 min.

### FAIL-06 — Missing index on `customer_info.user_id` (Medium)
- **Impact:** Every record read does `user_id` filtering (RLS) + `order by created_at`; without an index this is a seq scan that degrades as data grows.
- **Evidence:** No `CREATE INDEX` in either migration; queries at [supabaseService.ts:91-99](../../src/services/supabaseService.ts).
- **Fix:** Add migration: `CREATE INDEX idx_customer_info_user_id_created_at ON public.customer_info (user_id, created_at DESC);` (provided in [fix-log.md](../fixes/fix-log.md) FIX-05, not auto-applied).
- **Validation:** `EXPLAIN ANALYZE` shows index scan; p95 list latency improves at >10k rows.
- **Effort:** 30 min.

### FAIL-07 — Swallowed storage upload error (Medium)
- **Impact:** If the `pdfs` upload fails, `upload-pdf` still returns `success:true` without `storagePath`; the original bill is silently not archived. No alerting.
- **Evidence:** [upload-pdf/index.ts:76-85](../../supabase/functions/upload-pdf/index.ts) — `if (uploadError) console.error(...)` then proceeds.
- **Fix:** Decide whether archival is required; if so, return a non-200 or a `warning` flag the UI surfaces; add logging/metrics.
- **Effort:** 1 hr.

### FAIL-08 — Two lockfiles (Medium)
- **Impact:** `bun.lockb` and `package-lock.json` can resolve different trees; CI reproducibility and "works on my machine" risk.
- **Evidence:** both present at repo root.
- **Fix:** Choose one manager; delete the other lockfile; document in setup guide.
- **Effort:** 30 min + CI update.

### FAIL-09 — `verify_jwt=false` + wildcard CORS (Medium)
- **Impact:** Functions are world-invokable with `Access-Control-Allow-Origin: *`. `process-pdf` self-checks auth (ok), but the wildcard CORS and disabled JWT widen the attack surface.
- **Evidence:** [config.toml](../../supabase/config.toml); CORS headers in both functions.
- **Fix:** Restrict CORS to known origins; enable `verify_jwt` where feasible.
- **Effort:** 1–2 hrs.

### FAIL-10 — Dead/simulation code shipped (Low) ✅ partial
- **Impact:** `aiDataExtraction.ts` (`Math.random()` "AI"), unused `InsightsPanel`, `OTPVerification`, Solcast forms, and `insightsGenerator.generateInsights` increase bundle size and confuse maintainers; risk of a future dev wiring the fake path.
- **Evidence:** see [code-quality.md](../audits/code-quality.md) dead-code inventory.
- **Fix:** Remove `aiDataExtraction.ts` (FIX-02); triage the rest.
- **Effort:** 1–2 hrs.

## Build/runtime checks performed
- **Build config** ([vite.config.ts](../../vite.config.ts)): valid; dev port 8080; `lovable-tagger` dev-only. No SSR/hydration concerns (pure CSR SPA → "hydration issues" from the brief do not apply).
- **Dependency conflicts:** `mongoose` is the only fundamentally incompatible dependency (Node-only in a browser app). React/Radix/Vite versions are mutually compatible.
- **Frontend routes:** all 6 routes resolve to existing components; `/start` redirects correctly. No broken imports in the active path after FIX-01.
- **Database connectivity:** SPA→Supabase via anon key works; functions→DB via service role works; the **only** DB "connectivity" failure is the mongoose path (FAIL-01).
