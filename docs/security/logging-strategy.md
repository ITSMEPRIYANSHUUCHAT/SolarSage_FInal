# Logging & Monitoring Strategy

> Implemented for the edge functions; recommendations for the SPA and platform.

## Implemented — structured JSON logging in edge functions
- [supabase/functions/_shared/log.ts](../../supabase/functions/_shared/log.ts): `createLogger(fn, req)` emits one JSON line per event with `ts, level, msg, fn, requestId` plus safe fields.
- **Request correlation**: each request gets/echoes an `x-request-id`; `upload-pdf` → `process-pdf` for the same bill can be traced if the client forwards it.
- **PII/secret redaction**: we log **lengths and IDs only** — never bill text, AI output, emails, tokens, or keys. The previous `console.log('AI Response:', content)` (full model output) was removed.
- **Levels**: `info` (lifecycle), `warn` (client errors / transient retries / rate-limit infra issues), `error` (5xx / OpenAI / DB failures).

Example line:
```json
{"ts":"2026-06-15T10:00:00.000Z","level":"info","msg":"success","fn":"process-pdf","requestId":"a1b2…","userId":"uuid"}
```

## Security-event logging (what we capture)
| Event | Where | Field(s) |
|-------|-------|----------|
| Auth failure (bad/missing token) | both functions | `status:401` via `request_failed` |
| Rate-limit breach | both functions | `status:429` |
| Upload rejected (type/size) | upload-pdf | `status:400/413` |
| Invalid bill / parse failure | process-pdf | `status:422`, `ai_parse_failed` |
| OpenAI error/timeout | process-pdf | `openai_api_error`, `openai_request_failed` |
| DB insert failure | process-pdf | `db_insert_failed` |

## Recommended stack (mapped to this architecture)
| Concern | Tool | Notes |
|---------|------|-------|
| Frontend + function error tracking | **Sentry** | React SDK in `main.tsx` (hook point in [ErrorBoundary.tsx](../../src/components/ErrorBoundary.tsx)); Deno SDK in functions' `catch` |
| Function/DB logs | **Supabase Logs** (built-in) | JSON lines above are queryable there |
| Metrics/alerting | **CloudWatch** (if on AWS) or Supabase observability | alarms on 5xx rate, 429 spikes, OpenAI spend |
| Dashboards (self-hosted) | **Grafana + Prometheus** | only if a custom server is added; not needed for static+BaaS |
| Log shipping | Pino/Winston-style is N/A (no Node server) | the functions already emit structured JSON |

> Winston/Pino are Node-server libraries; with no Node server they don't apply. The equivalent here is the structured JSON logger above, which Supabase aggregates.

## Audit logging
- Authentication events (sign-in/up/out) are recorded by **Supabase Auth**; export from the dashboard or stream to your SIEM.
- Data-access is constrained by RLS; for a full audit trail of `customer_info` changes, add a Postgres trigger writing to an append-only `audit_log` table (recommended next step).

## Alerts to configure
- Function 5xx rate > 1% (5 min) · 429 spike (possible attack) · any new `error` `msg` type.
- OpenAI daily spend over budget (cost-amplification canary).
- Uptime monitor on `/functions/v1/health`.

## Do-not-log checklist (enforced)
- ❌ bill text / extracted PII ❌ OpenAI responses ❌ access tokens / `apikey` ❌ service-role/OpenAI keys ❌ full request bodies.
