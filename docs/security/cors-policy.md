# CORS Policy

> Wildcard CORS (`Access-Control-Allow-Origin: *`) was removed from the edge functions. Origins are now **allow-listed** via the `ALLOWED_ORIGINS` env var.

## Implementation
[supabase/functions/_shared/http.ts](../../supabase/functions/_shared/http.ts) → `buildCorsHeaders(req)`:
- Reads `ALLOWED_ORIGINS` (comma-separated).
- If the request `Origin` is in the list, it is reflected; otherwise the first allow-listed origin is returned (request from a disallowed origin is not granted credentials).
- If `ALLOWED_ORIGINS` is **unset**, falls back to `*` so local dev keeps working — so **you must set it in staging/production**.
- Sets `Vary: Origin`, restricts methods to `POST, OPTIONS`, and limits allowed headers.

```ts
'Access-Control-Allow-Origin': allowOrigin,
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
'Access-Control-Allow-Methods': 'POST, OPTIONS',
'Vary': 'Origin',
```

## Per-environment configuration
Set as a Supabase function secret:

| Env | `ALLOWED_ORIGINS` |
|-----|-------------------|
| Development | *(unset)* → `*`, or `http://localhost:8080` |
| Staging | `https://staging.solarsage.example` |
| Production | `https://app.solarsage.example` (add `www` / apex as needed) |

```bash
supabase secrets set ALLOWED_ORIGINS="https://app.solarsage.example,https://www.solarsage.example"
supabase functions deploy process-pdf upload-pdf health
```

## Notes
- The browser only calls **Supabase** cross-origin; OpenAI is called **server-side** from the function, so no OpenAI origin appears in browser CORS/CSP.
- Keep this list in sync with the Supabase **Auth redirect URLs** (Google OAuth) and the SPA's **CSP `connect-src`** ([security-headers.md](security-headers.md)).
- We do **not** send `Access-Control-Allow-Credentials: true` (auth uses bearer tokens, not cookies), which avoids the strictest credentialed-CORS pitfalls.

## Validation
```bash
curl -i -X OPTIONS "$BASE/functions/v1/process-pdf" -H "Origin: https://evil.example"
# Access-Control-Allow-Origin should NOT echo the evil origin once ALLOWED_ORIGINS is set.
curl -i -X OPTIONS "$BASE/functions/v1/process-pdf" -H "Origin: https://app.solarsage.example"
# should reflect the approved origin.
```
