# Calculation Logic — Current vs Improved

> Canonical implementation: [src/utils/solarCalculations.ts](../src/utils/solarCalculations.ts). The `process-pdf` edge function mirrors these formulas (Deno can't import from `src/`). Keep both in sync.

## Why this changed
Two calculations were mathematically wrong:

### 1. Solar "efficiency" was a constant 83.3%
**Before** ([process-pdf/index.ts], old code):
```ts
const idealGeneration = solarGeneration * 1.2;
efficiency = (solarGeneration / idealGeneration) * 100;  // = 1/1.2 = 83.33% ALWAYS
potentialSavings = idealGeneration - solarGeneration;     // = solarGeneration * 0.2
```
`efficiency` here can **never** be anything but 83.33%, regardless of the bill — because `ideal` is *defined* as `actual × 1.2`. "Expected generation" was just "actual + 20%". The number was meaningless and presented as a precise performance metric.

**Root problem:** a true performance ratio needs an *independent* baseline — system capacity (kWp) or irradiance (Solcast) — which a typical electricity bill does not contain. So we should not fabricate one.

**After:** we compute **Solar Offset**, a real number from the bill:
```
solarOffsetPct = min(100, generation / consumption × 100)
```
This answers a genuine question: *"What share of my usage did solar cover this period?"* It varies with the actual bill and is defensible. The field is still called `efficiency` in `InsightsData.solar` for backward compatibility, but now holds the offset %, and the UI label is **"Solar Offset (% of your usage)"**, not "Efficiency".

### 2. Savings used ₹0.15/kWh
**Before:**
```ts
savings = solarGeneration * 0.15;   // ₹0.15 per kWh — off by ~50×
```
Indian residential tariffs are typically ₹6–8/kWh. ₹0.15 understated savings by roughly 50×.

**After:**
```
effectiveTariff = bill's Tier-1 rate, else avg of bill tiers, else ₹7/kWh default
savingsInr = generation × effectiveTariff
```
Uses the **actual tariff from the bill** when available.

## Current formulas (as implemented)

| Metric | Formula | Source data | Notes |
|--------|---------|-------------|-------|
| Usage change % | `(current − previous) / previous × 100` | bill | unchanged; correct |
| Avg daily usage | `averageDailyUsage` from bill, else `round(consumption / 30)` | bill | 30-day assumption fallback |
| Largest expense | `argmax(charges)` | bill | unchanged |
| **Solar Offset %** | `min(100, generation / consumption × 100)` | bill | **real**, replaces fake efficiency |
| Unmet consumption | `max(0, consumption − generation)` kWh | bill | grid draw after solar |
| **Effective tariff** | Tier‑1 rate → avg tier → ₹7 default | bill | drives savings |
| **Savings (₹)** | `generation × effectiveTariff` | bill | replaces `×0.15` |
| **CO₂ avoided** | `generation × 0.71 kg/kWh` | bill + CEA factor | new, honest metric |

Constants: `DEFAULT_TARIFF_INR_PER_KWH = 7`, `GRID_EMISSION_FACTOR_KG_PER_KWH = 0.71` (CEA national average).

## What we deliberately do NOT compute
- **A precise performance/efficiency ratio.** Without panel capacity or Solcast irradiance, any such number is a guess. If/when Solcast is wired in ([solcastApi.ts](../src/utils/solcastApi.ts)), `expected generation` can come from irradiance and a real efficiency = `actual / expected` becomes possible — at which point add it as a *separate, clearly-sourced* field rather than overloading `efficiency`.

## Fields on `InsightsData.solar` ([insightsGenerator.ts](../src/utils/insightsGenerator.ts))
| Field | Meaning now |
|-------|-------------|
| `efficiency` | Solar offset % of usage (0–100) |
| `idealGeneration` | Reference baseline = consumption (kWh) |
| `actualGeneration` | Solar generation (kWh) |
| `potentialSavings` | Unmet consumption still drawn from grid (kWh) |
| `savingsInr` *(new)* | ₹ saved = generation × tariff |
| `co2AvoidedKg` *(new)* | kg CO₂ avoided |
| `effectiveTariff` *(new)* | ₹/kWh used |

## Validation
- Unit-checkable: for `generation=320, consumption=450, tariff=7` → offset `71.1%`, savings `₹2240`, CO₂ `227.2 kg`, unmet `130 kWh`. (Matches the guest sample.)
- Edge cases handled: `generation=0` → `solar = null`; `consumption=0` with generation → offset capped at 100%; negative/garbage tariffs filtered out.
- Build verified green after the change.
