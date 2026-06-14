# Feature Catalog

> Status legend: ✅ working · ⚠️ partial / fragile · ❌ broken · 💤 present but unwired (dead)

| # | Feature | Status | Entry point |
|---|---------|--------|-------------|
| 1 | Email/password registration | ✅ | `Auth.tsx` |
| 2 | Email/password login | ✅ | `Auth.tsx` |
| 3 | Google OAuth | ⚠️ (needs provider config) | `Auth.tsx` |
| 4 | Guest mode | ⚠️ (mock data, client-only limit) | `GuestLanding.tsx` |
| 5 | Protected routing | ✅ | `ProtectedRoute.tsx` |
| 6 | PDF upload + text extraction | ✅ | `upload-pdf` |
| 7 | AI bill data extraction | ✅ | `process-pdf` + OpenAI |
| 8 | Insights generation | ✅ (server-built) | `process-pdf` |
| 9 | Insights dashboard UI | ✅ | `ImprovedInsightsPanel.tsx` |
| 10 | PDF report download | ⚠️ (jsPDF works; DB-save step crashes) | `InsightsDocument.tsx` |
| 11 | Customer records list/delete | ✅ | `CustomerRecords.tsx` |
| 12 | Solar neighbor comparison | ⚠️ (mostly mock) | `SolarComparator.tsx` |
| 13 | Solcast PV forecast | 💤 (wired into dead code) | `solcastApi.ts` |
| 14 | OTP verification | 💤 (component only) | `OTPVerification.tsx` |
| 15 | Admin functions | ❌ (do not exist) | — |

---

## 1–2. Registration & Login (email/password) — ✅
- **Purpose:** account creation/authentication.
- **Flow:** `Auth.tsx` `handleSignUp`/`handleSignIn` → `AuthContext.signUp/signIn` → `supabase.auth.signUp` / `signInWithPassword` ([AuthContext.tsx:76-96](../../src/contexts/AuthContext.tsx)).
- **DB:** on signup, `handle_new_user` trigger inserts into `profiles`.
- **Dependencies:** Supabase Auth; email confirmation enabled (UI references "check your email").
- **Failure points:** password min length enforced **client-side only** (6 chars, `Auth.tsx:61`). "Email not confirmed" path handled. No rate limiting beyond Supabase defaults.

## 3. Google OAuth — ⚠️
- **Flow:** `signInWithGoogle` → `supabase.auth.signInWithOAuth({ provider:'google', redirectTo: origin })` ([AuthContext.tsx:98-106](../../src/contexts/AuthContext.tsx)).
- **Failure points:** requires Google provider client-id/secret + redirect URLs configured in Supabase dashboard (not in repo). Will fail silently/with provider error until configured. `redirectTo` uses `window.location.origin`, so prod redirect URLs must be allow-listed.

## 4. Guest mode — ⚠️
- **Purpose:** try the product without an account, capped at 3 analyses.
- **Flow:** `enterGuestMode()` sets `localStorage.guest_mode=true` ([AuthContext.tsx:113-118](../../src/contexts/AuthContext.tsx)). `Index.handleFileUpload` branches to `processPDFWithAIAsGuest` which returns a **hardcoded mock** `BillData`/`InsightsData` ([guestService.ts:26-112](../../src/services/guestService.ts)).
- **Failure points:** the 3-PDF limit is `guestPdfCount >= 3` checked client-side; resettable via devtools. Guests never call OpenAI — every guest sees the same fake numbers (1250, 450 kWh, 85.2% efficiency). This is a demo, not analysis.

## 5. Protected routing — ✅
- `ProtectedRoute` allows access if `user || isGuest`; otherwise redirects to `/guest` ([ProtectedRoute.tsx:24-28](../../src/components/ProtectedRoute.tsx)). Shows spinner while `loading`.

## 6. PDF upload + text extraction — ✅
- **Flow:** `UploadArea` → `Index.handleFileUpload` → `uploadPDF` → `supabase.functions.invoke('upload-pdf', { body: formData })` ([supabaseService.ts:30-53](../../src/services/supabaseService.ts)).
- **Server:** `upload-pdf` reads `formData.file`, extracts text via `pdfjs-dist`, requires ≥50 chars, uploads original to `pdfs` bucket ([upload-pdf/index.ts:35-87](../../supabase/functions/upload-pdf/index.ts)).
- **Failure points:** **no auth, no file-type check, no size limit** (DoS / abuse vector — see [security-audit.md](../audits/security-audit.md)). Scanned/image PDFs yield <50 chars and fail. Storage upload error is logged but **not fatal** (returns success without `storagePath`).

## 7. AI bill data extraction — ✅
- **Flow:** `processPDFWithAI(text, name)` attaches the session bearer token and invokes `process-pdf` ([supabaseService.ts:55-89](../../src/services/supabaseService.ts)).
- **Server:** validate bill → OpenAI `gpt-4o-mini` extraction → parse JSON → coerce numeric fields → derive solar metrics → insert row ([process-pdf/index.ts:80-285](../../supabase/functions/process-pdf/index.ts)).
- **Dependencies:** `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Failure points:** model may return non-JSON or hallucinated coords; only `totalAmount` is required-validated. No JSON `response_format` enforced. No retry/backoff. Cost per call uncapped.

## 8–9. Insights generation + dashboard — ✅
- **Server-built** insights object (summary/usage/costs/solar/insights[]) returned to client ([process-pdf/index.ts:232-276](../../supabase/functions/process-pdf/index.ts)).
- **UI:** `ImprovedInsightsPanel` renders metrics + `SolarComparator`. (`utils/insightsGenerator.generateInsights` exists but is **not** the source — the server builds insights. The client only reuses the `InsightsData` *type*.)

## 10. PDF report download — ⚠️ (partially broken)
- **Flow:** `Index.handleDownloadReport` dynamically imports `InsightsDocument`, mounts it in a detached div; `useEffect` calls `generateAndDownloadPDF` → `generatePDF(reportData)` (jsPDF) ([Index.tsx:106-141](../../src/pages/Index.tsx), [InsightsDocument.tsx:23-66](../../src/components/InsightsDocument.tsx)).
- **Broken sub-step:** after jsPDF, it calls `createCustomerInfo` from the **mongoose** `customerService` → throws in the browser. It's wrapped in try/catch so the PDF still downloads, but the user gets a "failed to save data" toast and the broken module is bundled into the lazy chunk. See [FAIL-01](../audits/production-failure-report.md).

## 11. Customer records — ✅
- `CustomerRecords` calls `getAllCustomerRecords()` (`customer_info` select, ordered by `created_at`) and `deleteCustomerRecord(id)` ([supabaseService.ts:91-108](../../src/services/supabaseService.ts)). RLS scopes rows to the current user.

## 12. Solar neighbor comparison — ⚠️
- `SolarComparator.tsx` renders comparison UI driven largely by mock/derived values (e.g. `neigh_rank` is set heuristically server-side: `efficiency > 80 ? 'Top 25%' : 'Average'`). No real neighbor dataset exists.

## 13. Solcast PV forecast — 💤
- `solcastApi.ts` can fetch `estimated_actuals`/`forecasts` with a user-supplied API key in `localStorage`. **Only** called from `insightsGenerator.generateInsights`, which is itself never invoked. The `SolcastForm`/`SolcastApiKeyForm` components are not mounted in any route. Effectively dormant.

## 14. OTP verification — 💤
- `OTPVerification.tsx` exists but no page imports/mounts it; no OTP flow in `AuthContext`.

## 15. Admin functions / user dashboard / search — ❌
- No admin routes, roles, search, or analytics dashboards exist. `project_overview.md` describes these as aspirational only.
