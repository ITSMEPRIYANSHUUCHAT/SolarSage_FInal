# Environment Variables & Secrets Audit

> Risk levels: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low/Informational

## Summary table

| Variable | Where | Purpose | Required | Default in code | Risk |
|----------|-------|---------|----------|-----------------|------|
| `OPENAI_API_KEY` | Supabase Function env | OpenAI auth in `process-pdf` | **Yes** | none (throws if unset) | 🔴 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Function env | DB writes / `getUser` in both functions | **Yes** | `''` (silent failure) | 🔴 |
| `SUPABASE_URL` | Supabase Function env | function → project URL | **Yes** | `''` | 🟠 |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` (anon) | **hardcoded** in `client.ts` | SPA → Supabase | **Yes** | hardcoded literals | 🟡 |
| `VITE_MONGODB_URI` | `import.meta.env` in `dbConnect.ts` | mongoose connect | No (dead code) | `mongodb://localhost:27017/electricity-insights` | 🟠 |
| Solcast API key | `localStorage` (`solcast_api_key`) | Solcast forecasts | No (dead path) | none | 🟡 |
| Google OAuth client id/secret | Supabase Auth dashboard | Google sign-in | for Google only | n/a (not in repo) | 🟡 |

There is **no `.env.example`** committed. One should be added (see [local-development.md](../setup/local-development.md)).

---

## Detail

### 🔴 `OPENAI_API_KEY` (server-only)
- **Used:** [process-pdf/index.ts:125-128](../../supabase/functions/process-pdf/index.ts) — `Deno.env.get('OPENAI_API_KEY')`; throws a clear error if missing.
- **Set via:** `supabase secrets set OPENAI_API_KEY=sk-...` (or dashboard → Edge Functions → Secrets).
- **Risk:** spend abuse if leaked; no per-request cost cap exists. Rotate on suspicion. Never expose to the SPA.

### 🔴 `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- **Used:** both functions ([upload-pdf:64](../../supabase/functions/upload-pdf/index.ts), [process-pdf:111](../../supabase/functions/process-pdf/index.ts)).
- **Danger:** bypasses **all** RLS. Must live only in function env. If it ever reaches the browser bundle, every user's data is exposed.
- **Defaulting bug:** code uses `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''` — an empty string silently produces auth failures rather than a startup error. Recommend failing fast.

### 🟠 `SUPABASE_URL` (server-only)
- **Used:** both functions. Same `?? ''` silent-default issue.
- In Supabase's managed runtime this is auto-injected; for local `supabase functions serve` it must be set.

### 🟡 Hardcoded SPA credentials — `client.ts`
- [src/integrations/supabase/client.ts:5-6](../../src/integrations/supabase/client.ts) hardcodes `SUPABASE_URL` and the **anon** publishable key.
- The anon key is *designed* to be public, so this is not a secret leak. **But** hardcoding prevents per-environment (dev/staging/prod) configuration and ties the build to one project. **Fix:** read from `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` with the current values as fallback (implemented in [fix-log.md](../fixes/fix-log.md) FIX-03).

### 🟠 `VITE_MONGODB_URI` — dead but dangerous if revived
- [src/utils/dbConnect.ts:5](../../src/utils/dbConnect.ts). A `VITE_`-prefixed var is **embedded into the client bundle** by Vite. If a real MongoDB URI (with credentials) were ever set here, it would be shipped to every browser. Because the whole mongoose path is being removed (FIX-01), this variable should be deleted.

### 🟡 Solcast API key
- Stored in `localStorage` and sent as a **URL query parameter** ([solcastApi.ts:57](../../src/utils/solcastApi.ts)) — visible in logs/proxies. Should move to a backend proxy if Solcast is ever activated.

### 🟡 Google OAuth
- Configured in Supabase Auth provider settings (not in repo). Needs authorized redirect URLs matching production origin or sign-in fails.

## Recommended `.env.example` (frontend)
```dotenv
# Frontend (Vite) — public values only
VITE_SUPABASE_URL=https://glgvubxgigvrczrifcuv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # anon/publishable key (safe to expose)
```

## Recommended Supabase function secrets (never in repo)
```bash
supabase secrets set OPENAI_API_KEY=sk-...
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided in the managed runtime;
# set them explicitly only for local `supabase functions serve`.
```

## Secrets hygiene checklist
- [ ] Rotate `OPENAI_API_KEY` and service-role key before go-live (they may have been shared during development).
- [ ] Confirm no service-role key or OpenAI key appears in any `VITE_`-prefixed var or client source.
- [ ] Add `.env*` to `.gitignore` (verify current `.gitignore`).
- [ ] Restrict the `pdfs` bucket and add auth to `upload-pdf` (see security audit) — these reduce the blast radius of credential issues.
