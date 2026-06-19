# Google Sign-in / Sign-up Setup

The app code is wired for Google OAuth (PKCE), but OAuth needs **two dashboards configured** — it cannot work from code alone.

## How it works in the app
- [AuthContext.signInWithGoogle](../../src/contexts/AuthContext.tsx) → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <origin>/, queryParams: { prompt: 'select_account' } } })`.
- The Supabase client has `detectSessionInUrl: true` + `flowType: 'pkce'` ([client.ts](../../src/integrations/supabase/client.ts)), so the `?code=…` on the redirect is exchanged for a session automatically.
- `onAuthStateChange` fires `SIGNED_IN`; `AuthContext` clears any guest flag and sets the user.
- A `profiles` row is auto-created by the `handle_new_user` Postgres trigger (works for OAuth users too — name comes from Google metadata).
- OAuth errors in the redirect URL are toasted and cleaned from the address bar.

> The same button is used for **sign-up and sign-in** — Google OAuth creates the account on first login automatically. No separate signup wiring is needed.

## 1. Google Cloud Console
1. **APIs & Services → OAuth consent screen**: configure (External), add app name, support email, and your domain; add scopes `email`, `profile`, `openid`. Add test users while in "Testing", or publish for production.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**: your app origins, e.g.
   - `http://localhost:8080`
   - `https://app.yourdomain.com`
4. **Authorized redirect URIs** — this must be the **Supabase** callback, not your app:
   ```
   https://glgvubxgigvrczrifcuv.supabase.co/auth/v1/callback
   ```
   (Replace the ref with your project's. Find it in Supabase → Authentication → Providers → Google.)
5. Copy the **Client ID** and **Client secret**.

## 2. Supabase Dashboard
1. **Authentication → Providers → Google**: toggle **Enabled**, paste the Client ID + Client secret, Save.
2. **Authentication → URL Configuration**:
   - **Site URL**: your production origin, e.g. `https://app.yourdomain.com`.
   - **Redirect URLs** (allow-list — add every origin the app runs on):
     ```
     http://localhost:8080
     http://localhost:8080/
     https://app.yourdomain.com
     https://app.yourdomain.com/
     ```
   The app calls `redirectTo: <origin>/`, so the exact origin must be allow-listed or Supabase rejects the redirect.
3. Keep this list in sync with the edge-function `ALLOWED_ORIGINS` (CORS) and the SPA CSP `connect-src`.

## 3. Verify
1. `npm run dev` → `/auth` → **Continue with Google**.
2. Pick an account → you should land back on `/` **signed in** (UserMenu shows your email).
3. Check `profiles` has a row for the new user.
4. Failure cases to test: cancel the Google prompt (expect an error toast, no crash); sign in while in guest mode (guest flag is cleared, real session wins).

## Common errors
| Symptom | Cause | Fix |
|---------|-------|-----|
| `redirect_uri_mismatch` (Google) | callback URI not in Google credentials | add `https://<ref>.supabase.co/auth/v1/callback` |
| Lands on `/guest`, not signed in | app origin not in Supabase Redirect URLs | add the exact `<origin>/` |
| `Unsupported provider` / nothing happens | Google provider not enabled in Supabase | enable + add client id/secret |
| Works on localhost, fails in prod | prod origin missing from Google origins + Supabase redirect URLs | add the prod domain to both |
| Signed in but no profile row | trigger missing | ensure `handle_new_user` migration applied |
