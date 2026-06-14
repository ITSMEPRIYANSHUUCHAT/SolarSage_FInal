# Code Quality Audit

## Headline
The active path (auth → upload → process → insights → records) is small and coherent. Quality is dragged down by **two competing data layers**, **multiple dead/simulation modules**, **duplicated types**, and **`text` columns for numeric data**. The codebase reads like a Lovable prototype with abandoned experiments left in place.

## Maintainability score: **5.5 / 10**
Low surface area helps; dead code, duplication, and the broken mongoose layer hurt.

---

## 1. Architecture
- ✅ Clear separation: `pages` / `components` / `services` / `utils` / `integrations`.
- ❌ **Two data layers**: real Supabase (`supabaseService.ts`) vs. broken Mongoose (`customerService.ts` + `models` + `dbConnect`). Pick one (Supabase). See [FAIL-01](production-failure-report.md).
- ❌ **Insights built in two places**: server (`process-pdf`) and client (`insightsGenerator.generateInsights`, unused). Single source needed.
- ⚠️ Guest vs. auth flows diverge inside `Index.handleFileUpload` with duplicated progress logic.

## 2. Dead / unwired code inventory
| Module | Why it's dead | Action |
|--------|---------------|--------|
| `services/aiDataExtraction.ts` | `Math.random()` sim; imported nowhere | **delete** (FIX-02) |
| `services/customerService.ts` | mongoose; browser-incompatible | **delete** (FIX-01) |
| `utils/dbConnect.ts` | mongoose connect | **delete** (FIX-01) |
| `models/CustomerInfo.ts` | mongoose schema; wrong field casing | **delete** (FIX-01) |
| `utils/insightsGenerator.ts#generateInsights` | not called (server builds insights) | keep `InsightsData` type, remove fn or repurpose |
| `utils/solcastApi.ts` | only called by dead `generateInsights` | gate behind a real feature or remove |
| `components/InsightsPanel.tsx` | superseded by `ImprovedInsightsPanel` | delete |
| `components/OTPVerification.tsx` | no OTP flow wired | delete or implement |
| `components/SolcastForm.tsx`, `SolcastApiKeyForm.tsx` | not mounted | delete or wire |
| `utils/pdfUtils.ts#processPDF` | throws "use Supabase" | delete |

## 3. Duplication
- `use-toast` hook duplicated: `src/hooks/use-toast.ts` and `src/components/ui/use-toast.ts`.
- `CustomerRecord` (service) vs `ICustomerInfo` (mongoose) vs `customer_info` (DB types) — three overlapping shapes for one entity.
- Google SVG markup duplicated across both Auth tabs.
- Insight-construction logic duplicated server vs client.

## 4. Naming / typing
- ❌ Numeric data typed as `text` in DB and as `string` in `CustomerRecord` (`consumption`, `generation`, `savings`). Causes `parseFloat` churn and sorting bugs.
- ⚠️ Mixed casing for the same concept (`neigh_rank` vs `neighRank`, `d_value` vs `D_value`).
- ⚠️ `BillData.location` always required, but AI may not return coordinates → defaulted to 0 (silent bad data).

## 5. Error handling
- ✅ User-facing toasts on failures; ✅ try/catch around OpenAI parse.
- ❌ Functions return **HTTP 500 for client errors** (invalid bill, missing auth) — should be 400/401 (API correctness).
- ❌ Swallowed storage error ([FAIL-07](production-failure-report.md)).
- ⚠️ `console.log` of full AI responses and PII in functions ([process-pdf:163](../../supabase/functions/process-pdf/index.ts)) — logging hygiene.

## 6. Complexity / hotspots
- `process-pdf/index.ts` (~300 lines) mixes validation, prompt, parsing, coercion, derivation, persistence, and insight assembly. Split into `validate / extract / persist / buildInsights`.
- `Index.handleFileUpload` mixes UI progress, branching, and orchestration. Extract a hook (`useBillAnalysis`).

## 7. Tooling / hygiene
- ❌ No tests of any kind (no unit/integration/e2e). 0% coverage.
- ❌ No CI workflow; no `npm audit`/Dependabot.
- ❌ Two lockfiles ([FAIL-08](production-failure-report.md)).
- ⚠️ `client.ts` marked "do not edit" yet needs env support (FIX-03 keeps it minimal and safe).
- ✅ ESLint flat config present; TypeScript strict-ish.

## Refactoring roadmap (priority)
1. **P0** Delete mongoose layer + drop dependency; fix `InsightsDocument` save (correctness + bundle). ✅ FIX-01
2. **P0** Remove `aiDataExtraction.ts` and other dead modules. ✅ FIX-02 (partial)
3. **P1** Unify the entity type (generated DB types only); change numeric columns to `numeric` via migration + backfill.
4. **P1** Return correct HTTP status codes from functions; redact logs.
5. **P1** Extract `process-pdf` into discrete steps; add `response_format: json_object` + schema validation.
6. **P2** Introduce tests (Vitest + React Testing Library; Deno tests for functions) and a CI pipeline.
7. **P2** Consolidate duplicated hooks/types; remove the second lockfile.
8. **P3** Decide Solcast/OTP: implement properly or delete.

## Priority ranking legend
P0 = blocks safe production; P1 = correctness/maintainability; P2 = engineering health; P3 = product decisions.
