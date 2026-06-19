# API Testing Guide

Two runnable test artifacts ship with the repo:

| Script | What it tests | Needs |
|--------|---------------|-------|
| [scripts/dev-checks.ts](../../scripts/dev-checks.ts) | Calculation + bill-validation logic (Phase 2) | Node 22.6+/24 only |
| [scripts/api-smoke.sh](../../scripts/api-smoke.sh) | Edge-function contract: auth, guards, status codes, health | local Supabase stack |

## 1. Logic checks (no backend, runs anywhere)
```bash
node scripts/dev-checks.ts
```
Verifies the fixed math: solar offset = `generation/consumption` (not the old constant 83.3%), savings = `generation × real tariff` (not ₹0.15/kWh), CO₂ avoided, tariff selection, and the bill validator's accept/reject behavior. Exits non-zero on any failure (CI-friendly).

## 2. Frontend reachability
```bash
npm run dev      # http://localhost:8080
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/    # expect 200
```
Then in a browser: `/guest` exercises the whole UI with **mock data** (theme toggle, mobile layout, "Sample data" banner) — no keys needed. `/auth` exercises real Supabase auth.

## 3. Edge-function API (local stack)
> Requires Docker running + the Supabase CLI. The hosted project still runs the *old* functions until you deploy, so use the local stack to test the current code.

```bash
npx supabase start                 # boots Postgres/Auth/Storage (Docker)
npx supabase db reset              # applies all migrations
# set secrets for local serving:
export OPENAI_API_KEY=sk-...        # only needed for the process-pdf happy path
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=<printed by `supabase start`>
npx supabase functions serve
```
Run the smoke test (ANON + a signed-in user TOKEN — see the script header for how to grab the token):
```bash
BASE=http://localhost:54321 ANON=<anon-key> TOKEN=<access-token> bash scripts/api-smoke.sh
```

### Expected results
| Call | Expected |
|------|----------|
| `GET /functions/v1/health` | `200` `{ ok:true, config:{...} }` |
| `POST /upload-pdf` no token | `401` |
| `POST /upload-pdf` non-PDF | `400` Only PDF files are accepted |
| `POST /upload-pdf` >10 MB | `413` |
| `POST /process-pdf` no token | `401` |
| `POST /process-pdf` empty `pdfText` | `400` |
| `POST /process-pdf` non-bill text | `422` |
| `POST /process-pdf` valid bill (+`OPENAI_API_KEY`) | `200` with `insights.solar.savingsInr` / `co2AvoidedKg` |

## Endpoint reference
Full schemas: [api-reference.md](../api/api-reference.md) · OpenAPI: [openapi.yaml](../api/openapi.yaml).
