# API Reference

> SolarSage has **no REST controllers of its own**. The "API surface" is:
> 1. Two **Supabase Edge Functions** (`upload-pdf`, `process-pdf`).
> 2. **PostgREST** table access via the Supabase JS client (`customer_info`, `profiles`), governed by RLS.
> 3. **Supabase Auth (GoTrue)** endpoints, used via the JS SDK.
>
> Base URL for functions: `https://glgvubxgigvrczrifcuv.supabase.co/functions/v1`

---

## Edge Function: `POST /functions/v1/upload-pdf`

Extract text from an uploaded PDF and archive the original in storage.

- **Controller:** [supabase/functions/upload-pdf/index.ts](../../supabase/functions/upload-pdf/index.ts)
- **Auth:** **none** (`verify_jwt = false` in `config.toml`; no manual check). ⚠️ See security audit.
- **Content-Type:** `multipart/form-data`

**Request (form fields)**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | binary (PDF) | yes | No size/type validation in code |

**Success 200**
```json
{
  "success": true,
  "extractedText": "TORRENT POWER ... units consumed ...",
  "fileName": "march-bill.pdf",
  "storagePath": "1699999999999_march-bill.pdf"  // omitted if storage upload failed
}
```

**Errors**
| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "No file provided" }` | missing `file` |
| 500 | `{ "error": "Could not extract sufficient text from the PDF...", "success": false }` | <50 chars extracted (scanned/image PDF) |
| 500 | `{ "error": "Failed to extract text from PDF", "success": false }` | pdfjs failure |

---

## Edge Function: `POST /functions/v1/process-pdf`

Validate the bill text, extract structured fields with OpenAI, derive insights, and persist a `customer_info` row for the authenticated user.

- **Controller:** [supabase/functions/process-pdf/index.ts](../../supabase/functions/process-pdf/index.ts)
- **Auth:** **required** — `Authorization: Bearer <supabase access_token>`. The function calls `supabase.auth.getUser(token)` and rejects invalid tokens (despite `verify_jwt = false`, auth is enforced manually).
- **Content-Type:** `application/json`

**Request body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `pdfText` | string | yes | non-empty; output of `upload-pdf` |
| `fileName` | string | no | for logging |

**Processing contract**
1. `validateElectricityBill(pdfText)` — passes if a known DISCOM is found, OR ≥3 bill keywords, OR (units + bill + ₹-amount) regex all match.
2. OpenAI `gpt-4o-mini` chat completion (`temperature 0.1`) returns JSON with fields: `customerName, address, accountNumber, billingPeriod, totalAmount, dueDate, energyUsage, previousUsage, averageDailyUsage, solarGeneration, location{latitude,longitude}, rates{}, charges{}, discomName`.
3. Numeric coercion; `totalAmount` required (else error).
4. Insert into `customer_info` with `user_id`.

**Success 200**
```json
{
  "success": true,
  "billData": { "customerName": "...", "totalAmount": 1834.5, "energyUsage": 420, "solarGeneration": 150, "...": "..." },
  "insights": {
    "summary": { "totalAmount": 1834.5, "dueDate": "2025-04-10", "billingPeriod": "Mar 2025", "discomName": "TORRENT POWER" },
    "usage":   { "current": 420, "previous": 380, "change": 10.5, "averageDaily": 14 },
    "costs":   { "breakdown": { "Energy Charges": 1500 }, "largestExpense": "Energy Charges" },
    "solar":   { "efficiency": 83.3, "idealGeneration": 180, "actualGeneration": 150, "potentialSavings": 30 },
    "insights": [ { "title": "Solar Performance", "description": "...", "type": "info" } ]
  },
  "dbRecord": { "id": "uuid", "user_id": "uuid", "...": "..." }
}
```

**Errors** (all `500`, `{ "error": "...", "success": false }`)
| Message | Cause |
|---------|-------|
| `No valid PDF content to process` | empty `pdfText` |
| `This doesn't appear to be an electricity bill...` | validation failed |
| `Authentication required` | missing `Authorization` header |
| `Invalid authentication token` | bad/expired token |
| `OpenAI API key not configured...` | `OPENAI_API_KEY` unset |
| `OpenAI API error: <status>` | upstream OpenAI failure |
| `Failed to extract valid data...` / `Could not extract essential billing data...` | unparsable/empty model output |
| `Failed to save customer data` | DB insert error |

---

## PostgREST table access (via Supabase JS client)

These are not custom endpoints but generated REST over `customer_info` / `profiles`, constrained by RLS.

| Operation | Client call | SQL effect | RLS |
|-----------|-------------|------------|-----|
| List my bills | `supabase.from('customer_info').select('*').order('created_at',{ascending:false})` ([supabaseService.ts:91](../../src/services/supabaseService.ts)) | `SELECT` | `auth.uid() = user_id` |
| Delete a bill | `supabase.from('customer_info').delete().eq('id', id)` ([supabaseService.ts:101](../../src/services/supabaseService.ts)) | `DELETE` | `auth.uid() = user_id` |
| Insert bill | done **server-side** by `process-pdf` with service-role key | `INSERT` | bypasses RLS (service role) but sets `user_id` |
| Read/update profile | (not currently called from UI) | `SELECT/UPDATE` | `auth.uid() = id` |

## Supabase Auth (via SDK)
| Action | SDK call |
|--------|----------|
| Sign up | `auth.signUp({ email, password, options:{ emailRedirectTo, data:{ full_name } } })` |
| Sign in | `auth.signInWithPassword({ email, password })` |
| Google | `auth.signInWithOAuth({ provider:'google', options:{ redirectTo } })` |
| Sign out | `auth.signOut()` |
| Session | `auth.getSession()`, `auth.onAuthStateChange(...)` |

## External: Solcast (dead path)
`GET https://api.solcast.com.au/pv_power/estimated_actuals` and `/forecasts` with query params `latitude, longitude, capacity=5, start, end, format=json, api_key` ([solcastApi.ts:56-75](../../src/utils/solcastApi.ts)). ⚠️ `api_key` is passed as a URL query param (logged by intermediaries) and stored in `localStorage`.

See [openapi.yaml](openapi.yaml) for a machine-readable spec of the two edge functions.
