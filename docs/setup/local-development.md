# Local Development Guide

SolarSage = a Vite/React SPA + a Supabase backend (Postgres, Auth, Storage, two Deno edge functions). You can run the **frontend against the existing hosted Supabase project** with almost no setup, or run a **full local stack** with the Supabase CLI.

## Prerequisites
| Tool | Version | Why |
|------|---------|-----|
| Node.js | ≥ 18 (LTS 20 recommended) | build/run the SPA |
| npm | ≥ 9 | package manager (we standardize on npm — ignore `bun.lockb`) |
| Git | any | clone |
| Supabase CLI | latest | only for local DB/functions ([install](https://supabase.com/docs/guides/cli)) |
| Docker Desktop | latest | required by `supabase start` |
| OpenAI API key | — | for real bill processing |

> **Note:** the build verified during the audit used Node + npm and completed cleanly (`npm install && npm run build`, exit 0). Two lockfiles exist; prefer `npm` and remove `bun.lockb` to avoid drift (FAIL-08).

## Option A — Frontend only (fastest)
Talks to the live hosted Supabase project. Good for UI work.

```bash
git clone <repo> && cd SolarSage_FInal
npm install
cp .env.example .env        # optional; client falls back to the hosted project
npm run dev                 # http://localhost:8080
```
- Email/password and records work against the hosted backend.
- **Google OAuth** needs the production redirect URLs; on localhost it may fail unless `http://localhost:8080` is allow-listed in the Supabase Auth settings.
- **PDF AI processing** uses the deployed edge functions (needs their `OPENAI_API_KEY` set in Supabase). Guest mode works fully offline (mock data).

## Option B — Full local stack (DB + functions)
Run Postgres, Auth, Storage, and edge functions locally.

```bash
npm install
supabase start                       # boots local Postgres/Auth/Storage (Docker)
supabase db reset                    # applies supabase/migrations/* to local DB
supabase functions serve --no-verify-jwt   # serves upload-pdf & process-pdf locally
```

Set function secrets for local serving (in a `supabase/.env` or your shell):
```bash
export OPENAI_API_KEY=sk-...
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=<printed by `supabase start`>
```

Point the SPA at the local stack via `.env`:
```dotenv
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key printed by `supabase start`>
```
Then `npm run dev`.

## Database setup
- Migrations live in [supabase/migrations/](../../supabase/migrations/) and are applied by `supabase db reset` (local) or `supabase db push` (remote).
- They create `customer_info`, `profiles`, RLS policies, the `handle_new_user` trigger, the `pdfs` bucket, and (new) the `user_id` index + `search_path` hardening.
- Regenerate TS types after schema changes:
  `supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts`

## OpenAI setup
- Create a key at platform.openai.com.
- Hosted: `supabase secrets set OPENAI_API_KEY=sk-...` then `supabase functions deploy process-pdf`.
- The model used is `gpt-4o-mini` ([process-pdf/index.ts:137](../../supabase/functions/process-pdf/index.ts)).

## Running
| Command | Effect |
|---------|--------|
| `npm run dev` | Vite dev server on :8080 |
| `npm run build` | production bundle → `dist/` |
| `npm run build:dev` | dev-mode bundle |
| `npm run preview` | serve the built bundle |
| `npm run lint` | ESLint |
| `supabase functions serve` | run edge functions locally |

## Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| "Authentication required" on processing | not signed in / expired session | sign in; `process-pdf` requires a bearer token |
| "OpenAI API key not configured" | secret missing | set `OPENAI_API_KEY` on the function env |
| Google sign-in fails locally | redirect URL not allow-listed | add `http://localhost:8080` in Supabase Auth → URL config |
| "Could not extract sufficient text" | scanned/image PDF (<50 chars) | use a text-based PDF; OCR is not implemented |
| Records list empty after upload | RLS — row belongs to another user / null `user_id` | ensure you uploaded while signed in |
| "Only PDF files are accepted" / "File too large" | new upload guards (FIX-04) | upload a PDF ≤10 MB |
| Build complains about chunk >500 kB | known (jsPDF/recharts) | benign; see PERF-07 for chunking |
| Port 8080 in use | another dev server | change `server.port` in `vite.config.ts` |

## Repo conventions
- Path alias `@ → src` (configured in Vite + tsconfig).
- UI built from shadcn/ui primitives in `src/components/ui` — generate new ones with the shadcn CLI (`components.json`).
- Do not reintroduce a client-side database driver (no mongoose); all data goes through Supabase.
