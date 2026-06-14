# Technology Stack Analysis

> Derived from [package.json](../../package.json), [vite.config.ts](../../vite.config.ts), [supabase/](../../supabase/), and source. Versions are as pinned in `package.json`.

## At a glance

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language | TypeScript 5.5 | strict-ish; `tsconfig.app.json` |
| Frontend framework | React 18.3 | SPA |
| Build tool | Vite 5.4 + `@vitejs/plugin-react-swc` | dev server on `:8080` |
| UI | shadcn/ui (Radix UI primitives) + Tailwind 3.4 | ~50 `ui/` components |
| Routing | react-router-dom 6.26 | `BrowserRouter` |
| Server state | @tanstack/react-query 5.56 | `QueryClient` created but **barely used** (records fetched imperatively) |
| Forms | react-hook-form 7.53 + zod 3.23 + @hookform/resolvers | available; minimal usage |
| Animation | framer-motion 12 | |
| Charts | recharts 2.12 | insights visuals |
| PDF (client) | jspdf 3.0 | report generation |
| Backend (BaaS) | Supabase (`@supabase/supabase-js` 2.53) | Auth + Postgres + Storage + Edge Functions |
| Edge runtime | Deno (Supabase Functions) | `upload-pdf`, `process-pdf` |
| PDF (server) | `pdfjs-dist` 4.2 (npm via Deno) | text extraction |
| LLM | OpenAI `gpt-4o-mini` via REST | inside `process-pdf` |
| External API | Solcast PV forecast | wired only into dead code |
| Misc | sonner (toasts), next-themes, lucide-react, date-fns | |
| **Anomaly** | **mongoose 8.13** | listed as a dependency but unusable in browser — see below |

---

## Frontend

- **Framework / build:** React 18 SPA bundled by Vite 5 with the SWC React plugin. Path alias `@ → ./src` ([vite.config.ts](../../vite.config.ts)). `lovable-tagger` runs in dev mode only — this project was scaffolded by **Lovable**.
- **State management:** No global store (no Redux/Zustand). App state lives in:
  - React Context for auth ([src/contexts/AuthContext.tsx](../../src/contexts/AuthContext.tsx)).
  - Local component state in `Index.tsx` for the upload/insights workflow.
  - `localStorage` for guest mode flags and the Solcast API key.
  - `@tanstack/react-query`'s `QueryClient` is provided in [App.tsx](../../src/App.tsx) but the records page calls the service directly rather than via `useQuery`, so caching/retries are mostly unused.
- **Routing:** 6 routes (see [repository-structure.md](repository-structure.md)). Guard via [ProtectedRoute.tsx](../../src/components/ProtectedRoute.tsx).
- **Authentication (client):** Supabase Auth — email/password, Google OAuth, plus a custom **guest mode** tracked entirely client-side in `localStorage` ([AuthContext.tsx](../../src/contexts/AuthContext.tsx)).
- **Styling:** Tailwind + shadcn/ui design tokens ([tailwind.config.ts](../../tailwind.config.ts)), `@tailwindcss/typography`, `tailwindcss-animate`.

## Backend

There is **no custom Node/Express backend**. The backend is **Supabase**:

- **Auth:** Supabase GoTrue (email/password, Google OAuth). Profile rows auto-created by the `handle_new_user` trigger.
- **Database:** Managed PostgreSQL (`PostgrestVersion: 13.0.4` per [types.ts](../../src/integrations/supabase/types.ts)). Tables: `customer_info`, `profiles`. Row-Level Security enabled.
- **Storage:** `pdfs` bucket (public) for uploaded bills.
- **Compute:** Two Deno **Edge Functions**:
  - `upload-pdf` — multipart upload → `pdfjs-dist` text extraction → store in bucket. **No middleware, no auth, no validation library.**
  - `process-pdf` — bill validation (keyword/DISCOM heuristics) → OpenAI chat completion → Postgres insert. Auth done manually by verifying the bearer token via `supabase.auth.getUser()`.
- **Validation libraries:** none server-side; validation is ad-hoc regex/keyword matching in `process-pdf`. Client uses zod sparingly.
- **API structure:** RPC-style function invocation via `supabase.functions.invoke(...)`; data reads/writes via PostgREST through the JS client.

### The mongoose anomaly
[package.json](../../package.json) lists `mongoose ^8.13.2`. It is imported by [src/utils/dbConnect.ts](../../src/utils/dbConnect.ts), [src/models/CustomerInfo.ts](../../src/models/CustomerInfo.ts), and [src/services/customerService.ts](../../src/services/customerService.ts). **Mongoose is a Node.js library that depends on Node core modules and TCP sockets; it cannot run in a browser.** This code path is reachable from the "Download Report" button (`InsightsDocument` is lazy-imported). See [production-failure-report.md](../audits/production-failure-report.md) FAIL-01.

## Database

- **Engine:** PostgreSQL (Supabase-managed). *Not* MongoDB despite the mongoose dependency.
- **Collections/tables:** `customer_info` (extracted bill data, owned by `user_id`), `profiles` (1:1 with `auth.users`). See [database-design.md](../database/database-design.md).
- **Relationships:** `customer_info.user_id → auth.users.id` (FK, cascade), `profiles.id → auth.users.id` (FK, cascade).
- **Indexes:** Only implicit PK/unique indexes; **no explicit index on `customer_info.user_id`** despite all queries filtering by it (see [performance-audit.md](../audits/performance-audit.md)).

## AI layer

| Aspect | Reality in code |
|--------|-----------------|
| Embedding model | **None.** No embeddings anywhere. |
| Vector DB / FAISS | **None.** |
| LLM | OpenAI `gpt-4o-mini`, single chat-completion call, `temperature: 0.1` ([process-pdf/index.ts:130-150](../../supabase/functions/process-pdf/index.ts)) |
| Prompt chain | Single system+user prompt; expects raw JSON back; manual ```json``` fence stripping + `JSON.parse` |
| Retrieval pipeline | **None** (no RAG) |
| LangChain | **Not installed.** `aiDataExtraction.ts` only has a comment referencing "LangChain (for future implementation)" plus a dead `EXTRACTION_QUERIES` array |
| Guest "AI" | Hardcoded mock object in [guestService.ts](../../src/services/guestService.ts) |
| Legacy client "AI" | `Math.random()` simulation in [aiDataExtraction.ts](../../src/services/aiDataExtraction.ts) — **not used** |

**Conclusion:** the only genuine AI is the single OpenAI call in `process-pdf`. All references to embeddings, FAISS, LangChain, and RAG in the task brief do **not** exist in this codebase.
