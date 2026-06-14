# Performance Audit

> SPA + Supabase + one OpenAI call. No heavy server tier to profile; bottlenecks are bundle size, the LLM round-trip, and one un-indexed query.

## Findings

| ID | Area | Issue | Severity | Est. improvement |
|----|------|-------|----------|------------------|
| PERF-01 | Frontend bundle | mongoose + dead code shipped to browser | High | −300–600 KB raw on the lazy chunk; faster report open |
| PERF-02 | Database | no index on `customer_info.user_id` | Medium | O(log n) vs seq scan at scale |
| PERF-03 | AI pipeline | sequential upload→process; no streaming; cold starts | Medium | perceived latency |
| PERF-04 | Frontend data | react-query provided but not used for records | Low | caching/dedupe |
| PERF-05 | File processing | whole PDF parsed in-function, no early-exit | Low | memory on large PDFs |
| PERF-06 | Network | OpenAI call has no `max_tokens`/timeout | Low | cost + tail latency |
| PERF-07 | Build | no manual chunking; single large vendor chunk | Low | first-load TTI |

---

### PERF-01 — Browser bundle carries Node-only / dead code (High)
- **Evidence:** `mongoose` ([package.json:53](../../package.json)) is imported via `InsightsDocument → customerService → dbConnect/models`. Plus dead `aiDataExtraction.ts`, `insightsGenerator.ts`, `solcastApi.ts`, unused components.
- **Impact:** mongoose + its polyfilled deps are large; they land in the lazy report chunk and slow the "Download Report" path and overall install/build.
- **Fix:** Remove the mongoose layer and dead modules (FIX-01/FIX-02). **Validation:** compare `vite build` output sizes before/after; confirm no `mongoose` in `dist/assets/*`.

### PERF-02 — Missing index on `user_id` (Medium)
- **Evidence:** No `CREATE INDEX` in migrations; list query orders by `created_at` filtered by RLS on `user_id` ([supabaseService.ts:91-99](../../src/services/supabaseService.ts)).
- **Fix:** `CREATE INDEX idx_customer_info_user_id_created_at ON public.customer_info (user_id, created_at DESC);` (FIX-05). **Validation:** `EXPLAIN ANALYZE` → index scan.

### PERF-03 — Serial two-call pipeline + edge cold starts (Medium)
- **Evidence:** [Index.tsx:75-79](../../src/pages/Index.tsx) awaits `uploadPDF` then `processPDFWithAI` sequentially; each is a separate edge invocation (cold start possible); OpenAI adds 2–8 s.
- **Impact:** Total perceived time can exceed the 30 s product target on cold starts + large bills.
- **Fix options:** merge extraction+processing into one function call (text never needs to leave the server between steps); stream progress; keep functions warm; show realistic progress (current progress bar is a fake `setInterval`).

### PERF-04 — react-query underused (Low)
- **Evidence:** `QueryClientProvider` in [App.tsx:18](../../src/App.tsx) but `CustomerRecords` fetches imperatively. **Fix:** wrap reads in `useQuery` for caching, dedupe, and background refresh.

### PERF-05 — Full PDF parse, no guardrails (Low)
- **Evidence:** [upload-pdf:11-27](../../supabase/functions/upload-pdf/index.ts) iterates all pages into one string. **Fix:** cap page count / total chars; reject huge PDFs early (ties to FIX-04 size limit).

### PERF-06 — Unbounded OpenAI call (Low)
- **Evidence:** [process-pdf:136-150](../../supabase/functions/process-pdf/index.ts) no `max_tokens`, no client timeout. **Fix:** set `max_tokens`, add an `AbortController` timeout, and retry once on 429/5xx with backoff.

### PERF-07 — No manual chunking (Low)
- **Fix:** configure `build.rollupOptions.output.manualChunks` to split vendor (Radix/recharts/framer-motion) for better caching. Lazy-load `recharts`-heavy panels.

## Current bottleneck ranking
1. LLM round-trip + cold starts (user-visible latency).
2. Bundle weight from mongoose/dead code (load + build time).
3. Future DB scan cost without the `user_id` index.

## Quick wins (high value / low effort)
- Remove mongoose & dead modules (PERF-01) — also a correctness fix.
- Add the composite index (PERF-02).
- Set `max_tokens` + timeout + retry on OpenAI (PERF-06).
- Replace the fake progress `setInterval` with real step events.
