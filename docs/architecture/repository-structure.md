# Repository Structure

> Generated from a full source audit. **The source code is the single source of truth.** Where prior docs disagree with code, this document follows the code.

## TL;DR

SolarSage is a **single-page React application** (Vite + TypeScript + shadcn/ui) with a **Supabase backend** (PostgreSQL, Auth, Storage, and two Deno Edge Functions). There is **no Node/Express server, no MongoDB server, no LangChain, no FAISS, and no vector/RAG pipeline** in this repository. A `mongoose`-based data layer exists in the source tree but **cannot run in a browser** and is effectively dead/broken code (see [code-quality.md](../audits/code-quality.md)).

---

## Top-level layout

```
SolarSage_FInal/
├── index.html                  # Vite HTML entry
├── package.json                # Frontend deps + scripts (dev/build/lint/preview)
├── package-lock.json           # npm lockfile
├── bun.lockb                   # Bun lockfile (two lockfiles present — see note)
├── vite.config.ts              # Vite config (port 8080, @ alias, lovable-tagger)
├── tailwind.config.ts          # Tailwind theme + shadcn tokens
├── postcss.config.js
├── eslint.config.js            # ESLint flat config
├── tsconfig*.json              # TS config (app/node split)
├── components.json             # shadcn/ui generator config
├── README.md
├── public/                     # Static assets (favicon, og-image, placeholder)
├── src/                        # Frontend application (see below)
├── supabase/                   # Backend: config, edge functions, SQL migrations
└── docs/                       # Documentation (this audit + pre-existing notes)
```

> **Note — two lockfiles:** both `bun.lockb` and `package-lock.json` are committed. This is ambiguous for CI and reproducibility. Pick one package manager (see [code-quality.md](../audits/code-quality.md)).

---

## `src/` — Frontend application

### Entry & shell
| Path | Role |
|------|------|
| [src/main.tsx](../../src/main.tsx) | React DOM bootstrap |
| [src/App.tsx](../../src/App.tsx) | Providers (`QueryClientProvider`, `TooltipProvider`, `AuthProvider`) + `BrowserRouter` routes |
| [src/index.css](../../src/index.css), [src/App.css](../../src/App.css) | Global styles / Tailwind layers |
| [src/vite-env.d.ts](../../src/vite-env.d.ts) | Vite type shims |

### Routing (defined in [src/App.tsx](../../src/App.tsx))
| Route | Component | Guard |
|-------|-----------|-------|
| `/guest` | [pages/GuestLanding.tsx](../../src/pages/GuestLanding.tsx) | public |
| `/auth` | [pages/Auth.tsx](../../src/pages/Auth.tsx) | public |
| `/` | [pages/Index.tsx](../../src/pages/Index.tsx) | `ProtectedRoute` |
| `/records` | [pages/Records.tsx](../../src/pages/Records.tsx) | `ProtectedRoute` |
| `/start` | → redirect to `/guest` | public |
| `*` | [pages/NotFound.tsx](../../src/pages/NotFound.tsx) | public |

### `src/pages/`
| File | Purpose |
|------|---------|
| `Index.tsx` | Main app: upload → process → insights/tabs. Branches on `isGuest`. |
| `Auth.tsx` | Email/password + Google OAuth sign-in/up tabs. |
| `GuestLanding.tsx` | Marketing/landing + "continue as guest" entry. |
| `Records.tsx` | Wraps `CustomerRecords` to list stored bills. |
| `NotFound.tsx` | 404. |

### `src/contexts/`
| File | Purpose |
|------|---------|
| `AuthContext.tsx` | Supabase auth state, guest mode (localStorage), `signUp/signIn/signInWithGoogle/signOut`, guest counter. |

### `src/components/` (app-level)
| File | Purpose | Wiring |
|------|---------|--------|
| `UploadArea.tsx` | Dropzone for PDF | used by `Index` |
| `ProcessingFlow.tsx` | Step/progress UI | used by `Index` |
| `ImprovedInsightsPanel.tsx` | Primary insights dashboard | used by `Index`; renders `SolarComparator` |
| `InsightsPanel.tsx` | Older insights panel | **not referenced by any page** (dead) |
| `InsightsDocument.tsx` | Triggers jsPDF report; **imports broken `customerService`** | lazy-imported by `Index.handleDownloadReport` |
| `PDFViewer.tsx` | Renders uploaded PDF | used by `Index` |
| `CustomerRecords.tsx` | Lists/deletes `customer_info` rows | used by `Records` |
| `SolarComparator.tsx` | Neighbor comparison visuals | used by `ImprovedInsightsPanel` |
| `ProtectedRoute.tsx` | Auth/guest route guard | used by `App` |
| `UserMenu.tsx` | Account dropdown / sign out | used by `Index`, `Records` |
| `GuestModeNotice.tsx` | Guest banner | used by `Index` |
| `OTPVerification.tsx` | OTP UI component | **not referenced** (dead; no OTP flow wired) |
| `SolcastForm.tsx`, `SolcastApiKeyForm.tsx` | Solcast API key entry | not mounted in any route/page |
| `theme-provider.tsx` | next-themes wrapper | available |
| `ui/` (50+ files) | shadcn/ui primitives | generated component library |

### `src/services/`
| File | Backend it talks to | Status |
|------|---------------------|--------|
| `supabaseService.ts` | Supabase edge functions + `customer_info` table | **ACTIVE / real path** |
| `guestService.ts` | none — returns hardcoded mock data | active for guest mode |
| `aiDataExtraction.ts` | none — `Math.random()` simulation | **dead** (imported nowhere) |
| `customerService.ts` | Mongoose / MongoDB | **broken** (browser cannot run mongoose); imported by `InsightsDocument` |

### `src/utils/`
| File | Purpose | Status |
|------|---------|--------|
| `pdfUtils.ts` | `BillData` type; legacy `processPDF` throws | type used; fn dead |
| `insightsGenerator.ts` | `InsightsData` type + `generateInsights()` | type used everywhere; `generateInsights()` **not called** (edge function builds insights instead) |
| `solcastApi.ts` | Solcast PV forecast fetch | only called by dead `generateInsights()` |
| `pdfGenerator.ts` | jsPDF report builder | used by `InsightsDocument` |
| `dbConnect.ts` | `mongoose.connect()` | **broken in browser** |

### `src/models/`
| File | Purpose | Status |
|------|---------|--------|
| `CustomerInfo.ts` | Mongoose schema/model | **broken in browser**; duplicates Supabase `customer_info` |

### `src/integrations/supabase/`
| File | Purpose |
|------|---------|
| `client.ts` | `createClient` with **hardcoded** URL + anon key |
| `types.ts` | Generated DB types (`customer_info`, `profiles`) |

### `src/hooks/`, `src/lib/`
| File | Purpose |
|------|---------|
| `hooks/use-mobile.tsx` | breakpoint hook |
| `hooks/use-toast.ts`, `components/ui/use-toast.ts` | toast hook (duplicated) |
| `lib/utils.ts` | `cn()` class merge helper |

---

## `supabase/` — Backend

| Path | Purpose |
|------|---------|
| `config.toml` | Project id `glgvubxgigvrczrifcuv`; both functions set `verify_jwt = false` |
| `functions/upload-pdf/index.ts` | Deno fn: PDF→text via `pdfjs-dist`, stores file in `pdfs` bucket. **No auth check.** |
| `functions/process-pdf/index.ts` | Deno fn: validates bill, calls OpenAI `gpt-4o-mini`, inserts into `customer_info`. Manual auth via bearer token. |
| `migrations/2025-08-06…sql` | Creates `customer_info`, RLS, `pdfs` storage bucket (initially public) |
| `migrations/2025-08-13…sql` | Adds `user_id` + per-user RLS; creates `profiles` + `handle_new_user` trigger |

---

## `docs/` — Documentation
Pre-existing notes (`project_overview.md`, `endpoints.md`, `implemented.md`, `pending.md`, `files_structure.md`, `api_endpoints_for_solcast.md`) plus this audit set under `architecture/`, `features/`, `api/`, `database/`, `deployment/`, `audits/`, `fixes/`, `setup/`, `operations/`.

> **Caution:** the pre-existing `project_overview.md` describes aspirational features (e.g. "Real OpenAI integration" listed as *future*, custom ML models, marketplace). Treat it as product vision, not an as-built spec.

## Module dependency summary

```
pages/Index ──> services/supabaseService ──> supabase.functions(upload-pdf, process-pdf)
            └─> services/guestService (mock, guest mode)
            └─(lazy)> components/InsightsDocument ──> utils/pdfGenerator (jsPDF)
                                                  └─> services/customerService ──> utils/dbConnect + models/CustomerInfo  [BROKEN: mongoose in browser]
contexts/AuthContext ──> integrations/supabase/client
components/CustomerRecords ──> services/supabaseService ──> table: customer_info

DEAD/UNWIRED: services/aiDataExtraction, utils/insightsGenerator#generateInsights,
              utils/solcastApi, components/{InsightsPanel,OTPVerification,SolcastForm,SolcastApiKeyForm}
```
