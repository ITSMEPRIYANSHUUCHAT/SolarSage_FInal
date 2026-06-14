/**
 * Canonical solar / bill calculations for SolarSage.
 *
 * This module is the single documented source of truth for the derived
 * numbers shown in the UI. The Supabase edge function `process-pdf` mirrors
 * these formulas (it runs on Deno and cannot import from `src/`); keep the two
 * in sync and update docs/calculations.md when changing anything here.
 *
 * Design principle: only compute numbers we can defend from the bill itself.
 * We do NOT fabricate a precise "efficiency vs ideal" figure, because a real
 * performance ratio needs an independent baseline (panel capacity or Solcast
 * irradiance) that a typical bill does not contain.
 */

/** Typical residential grid tariff (₹/kWh) used only when the bill has none. */
export const DEFAULT_TARIFF_INR_PER_KWH = 7;

/** Indian grid CO2 emission factor (kg CO2 per kWh). CEA national average ~0.71. */
export const GRID_EMISSION_FACTOR_KG_PER_KWH = 0.71;

/**
 * Pick a representative ₹/kWh tariff from the bill's rate tiers.
 * Falls back to DEFAULT_TARIFF_INR_PER_KWH when no usable rate is present.
 */
export function pickEffectiveTariff(rates?: Record<string, number> | null): number {
  if (rates) {
    const values = Object.values(rates).filter(
      (v) => typeof v === 'number' && isFinite(v) && v > 0 && v < 100,
    );
    if (values.length > 0) {
      // Prefer an explicit Tier 1 rate if present, else the average tier rate.
      const tier1 = Object.entries(rates).find(([k]) => /tier\s*1|0-?500/i.test(k));
      if (tier1 && tier1[1] > 0) return tier1[1];
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  return DEFAULT_TARIFF_INR_PER_KWH;
}

export interface SolarMetrics {
  /** % of this period's consumption that solar generation offset (0–100). Real. */
  solarOffsetPct: number;
  /** kWh still drawn from the grid after solar (>= 0). */
  unmetConsumptionKwh: number;
  /** ₹ saved this period = generation × effective tariff. Real. */
  savingsInr: number;
  /** kg CO2 avoided = generation × grid emission factor. Real. */
  co2AvoidedKg: number;
  /** The ₹/kWh used for savings. */
  effectiveTariff: number;
  actualGeneration: number;
  consumption: number;
}

/**
 * Compute defensible solar metrics from bill figures.
 *
 * @param consumption  units consumed this period (kWh)
 * @param generation   solar generation this period (kWh)
 * @param rates        optional tariff tiers from the bill (₹/kWh)
 */
export function computeSolarMetrics(
  consumption: number,
  generation: number,
  rates?: Record<string, number> | null,
): SolarMetrics | null {
  const gen = Number(generation) || 0;
  if (gen <= 0) return null;

  const cons = Math.max(0, Number(consumption) || 0);
  const effectiveTariff = pickEffectiveTariff(rates);

  const solarOffsetPct = cons > 0 ? Math.min(100, (gen / cons) * 100) : 100;
  const unmetConsumptionKwh = Math.max(0, cons - gen);
  const savingsInr = gen * effectiveTariff;
  const co2AvoidedKg = gen * GRID_EMISSION_FACTOR_KG_PER_KWH;

  return {
    solarOffsetPct: Number(solarOffsetPct.toFixed(1)),
    unmetConsumptionKwh: Number(unmetConsumptionKwh.toFixed(1)),
    savingsInr: Number(savingsInr.toFixed(2)),
    co2AvoidedKg: Number(co2AvoidedKg.toFixed(1)),
    effectiveTariff: Number(effectiveTariff.toFixed(2)),
    actualGeneration: gen,
    consumption: cons,
  };
}

/** Month-over-month usage change as a percentage. */
export function usageChangePct(current: number, previous: number): number {
  if (!previous || previous <= 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}
