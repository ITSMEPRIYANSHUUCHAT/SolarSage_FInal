# Database Design

> Engine: **PostgreSQL** (Supabase-managed). Source of truth: [migrations](../../supabase/migrations/) and generated [types.ts](../../src/integrations/supabase/types.ts). The `mongoose` schema in `src/models/CustomerInfo.ts` is **not** the database — it is dead browser code and is intentionally omitted here except as a discrepancy note.

## ER diagram

```mermaid
erDiagram
  AUTH_USERS ||--o| PROFILES : "1:1 (trigger)"
  AUTH_USERS ||--o{ CUSTOMER_INFO : "1:N (user_id FK)"

  AUTH_USERS {
    uuid id PK
    text email
    jsonb raw_user_meta_data
  }
  PROFILES {
    uuid id PK_FK
    text email
    text full_name
    timestamptz created_at
    timestamptz updated_at
  }
  CUSTOMER_INFO {
    uuid id PK
    uuid user_id FK
    text name
    text address
    text month
    text consumption
    text generation
    text savings
    text neigh_rank
    text top_gen
    numeric missed_savings
    numeric latitude
    numeric longitude
    text billing_date
    text billing_mode
    numeric total_dni
    numeric d_value
    numeric e_value
    numeric f_value
    numeric g_value
    timestamptz created_at
    timestamptz updated_at
  }
```

> `auth.users` is Supabase-managed (GoTrue). Storage object metadata lives in `storage.objects` (bucket `pdfs`).

---

## Table: `public.customer_info`
Stores one row per analyzed electricity bill. Defined in [migration 2025-08-06](../../supabase/migrations/20250806173305_c9a2b3e7-4632-49a0-84d8-39517f0090a6.sql); `user_id` added in [migration 2025-08-13](../../supabase/migrations/20250813031503_a1602fa3-d692-42a6-8bef-42bec7cf7a95.sql).

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `user_id` | uuid | yes* | — | FK → `auth.users(id)` ON DELETE CASCADE. *Nullable in DDL; new rows always set it. Legacy rows may be null.* |
| `name` | text | yes | — | customer name (AI-extracted) |
| `address` | text | yes | — | AI-extracted |
| `month` | text | yes | — | billing month/period string |
| `consumption` | text | yes | — | kWh **stored as text** |
| `generation` | text | yes | — | solar kWh **stored as text** |
| `savings` | text | yes | — | computed, **stored as text** |
| `neigh_rank` | text | yes | — | heuristic ("Top 25%"/"Average") |
| `top_gen` | text | yes | — | heuristic ("Excellent"/"Good"/"N/A") |
| `missed_savings` | numeric | yes | — | potential extra kWh |
| `latitude` | numeric | yes | — | |
| `longitude` | numeric | yes | — | |
| `billing_date` | text | yes | — | duplicates `month` in practice |
| `billing_mode` | text | yes | — | "Net Metering"/"Standard" |
| `total_dni` | numeric | yes | — | ideal generation proxy |
| `d_value`..`g_value` | numeric | yes | `0` | **unused placeholders** (never written meaningfully) |
| `created_at` | timestamptz | yes | `now()` | |
| `updated_at` | timestamptz | yes | `now()` | **never updated** (no trigger) |

**Constraints / indexes**
- PK on `id` (implicit btree index).
- FK `user_id → auth.users(id)` cascade.
- ❌ **No index on `user_id`** even though every query filters/secures by it (RLS `auth.uid() = user_id` + ordering by `created_at`). See [performance-audit.md](../audits/performance-audit.md) PERF-02.
- ❌ No `CHECK` constraints; numeric-looking values (`consumption`, `generation`, `savings`) are `text`.

**RLS policies** (after 2025-08-13 migration)
| Policy | Command | Predicate |
|--------|---------|-----------|
| Users can view their own records | SELECT | `auth.uid() = user_id` |
| Users can insert their own records | INSERT | `auth.uid() = user_id` (CHECK) |
| Users can update their own records | UPDATE | `auth.uid() = user_id` |
| Users can delete their own records | DELETE | `auth.uid() = user_id` |

> The original migration's permissive `USING (true)` policies were **dropped** and replaced by per-user policies. Good. `process-pdf` inserts using the **service-role key**, which bypasses RLS but explicitly sets `user_id`.

## Table: `public.profiles`
1:1 extension of `auth.users`. Created in [migration 2025-08-13](../../supabase/migrations/20250813031503_a1602fa3-d692-42a6-8bef-42bec7cf7a95.sql).

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | uuid | no | PK, FK → `auth.users(id)` cascade |
| `email` | text | yes | copied from auth |
| `full_name` | text | yes | from `raw_user_meta_data.full_name` or email |
| `created_at` | timestamptz | yes | `now()` |
| `updated_at` | timestamptz | yes | `now()` (never updated) |

**RLS:** SELECT/UPDATE/INSERT all `auth.uid() = id`. **No DELETE policy** (rows removed only via cascade when the auth user is deleted).

**Auto-population:** trigger `on_auth_user_created AFTER INSERT ON auth.users` runs `handle_new_user()` (`SECURITY DEFINER`) to insert the profile.

> ⚠️ `handle_new_user` is `SECURITY DEFINER` but does **not** set a fixed `search_path`. Recommended hardening: `ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;` (see [security-audit.md](../audits/security-audit.md) SEC-08).

## Storage: bucket `pdfs`
- Created `public = true` in the 2025-08-06 migration.
- Policies: public INSERT and public SELECT on `bucket_id = 'pdfs'`.
- ⚠️ **Any anonymous party can upload and read every uploaded bill** — a confidentiality and abuse risk (see SEC-03). Original bills (PII) are world-readable by object path.

## Relationships summary
- `profiles (1) — (1) auth.users` via shared `id`.
- `customer_info (N) — (1) auth.users` via `user_id`.
- `customer_info` has **no FK to `profiles`** and no relationship to storage objects (the uploaded file path is not persisted on the row).

## Schema discrepancies (code vs. DB)
| Source | Field naming | Issue |
|--------|--------------|-------|
| DB / `types.ts` | `neigh_rank`, `top_gen`, `missed_savings`, `d_value`… | snake_case |
| `models/CustomerInfo.ts` (mongoose) | `neighRank`, `topGen`, `missedSavings`, `D_value`… | camelCase / different casing → would never map correctly even if mongoose ran |

This confirms the mongoose model is an abandoned parallel design, not the live schema.
