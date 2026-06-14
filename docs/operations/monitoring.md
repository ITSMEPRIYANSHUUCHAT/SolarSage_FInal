# Observability & Monitoring

> Current state: **none beyond `console.log`/`console.error`** in the edge functions and the browser console. There is no error tracking, metrics, structured logging, health check, or alerting. This is a go-live gap.

## Current logging (as-built)
- Edge functions log via `console.*` (visible in Supabase → Edge Functions → Logs). They log **PII and full AI responses** ([process-pdf/index.ts:163](../../supabase/functions/process-pdf/index.ts), file names/sizes in `upload-pdf`). Redact before production.
- The SPA logs errors to the browser console and shows `sonner` toasts; nothing is captured centrally.

## Recommended stack (mapped to this architecture)

| Concern | Recommended tool | Why here |
|---------|------------------|----------|
| Frontend + function error tracking | **Sentry** | First-class React + edge/Deno SDKs; release health, source maps, breadcrumbs |
| Function/DB logs & metrics | **Supabase Logs/Observability** (built-in) | Native to the backend; no extra infra |
| Static-host metrics | Host-native (Vercel/Netlify analytics) or **CloudWatch** (if EC2/ECS) | Request/edge metrics where the SPA runs |
| Dashboards/alerts (self-hosted) | **Grafana + Prometheus** | Only if you add a custom server worth scraping — **not needed** for the current static+BaaS design |
| LLM cost/usage | **OpenAI usage dashboard** + a custom counter | Spend is the top operational risk (no cap exists) |

> **Grafana/Prometheus guidance:** these scrape metrics endpoints from long-running services. SolarSage has none (static SPA + Supabase managed functions). Adopt them only if/when a custom backend is introduced. For now, Sentry + Supabase logs + OpenAI dashboard cover the surface with far less ops cost.

## Minimum viable observability (pre-launch checklist)
1. **Sentry (frontend):**
   ```ts
   // src/main.tsx
   import * as Sentry from "@sentry/react";
   Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, tracesSampleRate: 0.1,
     environment: import.meta.env.MODE });
   ```
   Wrap `App` in `Sentry.ErrorBoundary`. Upload source maps in CI.
2. **Sentry (edge functions):** init the Deno SDK at the top of each function; capture exceptions in the `catch` blocks already present.
3. **Structured logging:** replace ad-hoc `console.log` with a small JSON logger (`{level, fn, userId, requestId, msg}`); **redact** PII and never log full bill text or AI output.
4. **Health checks:**
   - Frontend host: `GET /` 200 (already used by Docker/ALB health checks).
   - Backend: a tiny `health` edge function returning `{ ok: true, time }` for uptime monitors (UptimeRobot/Checkly/Pingdom).
5. **OpenAI spend guardrail:** log token usage per request (`aiData.usage`) and alert on daily spend; set a hard `max_tokens` (PERF-06) and consider a per-user/day call counter table.
6. **DB monitoring:** enable Supabase's slow-query insights; alert on error rate and connection saturation.

## Key metrics to track
| Metric | Target | Source |
|--------|--------|--------|
| Bill-processing success rate | ≥ 95% | `process-pdf` outcomes (Sentry/logs) |
| OpenAI parse-failure rate | < 5% | log parse errors (FAIL-02) |
| p95 end-to-end processing time | < 30 s | client timing + function duration |
| Edge function error rate | < 1% | Supabase function logs |
| Upload rejections (size/type) | track for abuse | new FIX-04 400/413 responses |
| Daily OpenAI spend | budget-bound | OpenAI dashboard |
| Auth failures / signups | trend | Supabase Auth logs |

## Alerting (suggested)
- Sentry alert: error rate spike or any new `process-pdf` exception type.
- OpenAI: daily spend > budget threshold.
- Uptime monitor: health endpoint down > 2 min.
- Supabase: function 5xx rate > 1% over 5 min.

## Logging hygiene actions (tie-ins)
- Remove/redact `console.log('AI Response:', aiContent)` and PII logs (see [code-quality.md](../audits/code-quality.md) §5, [security-audit.md](../audits/security-audit.md)).
- Add a `requestId` to correlate `upload-pdf` → `process-pdf` for one bill.
