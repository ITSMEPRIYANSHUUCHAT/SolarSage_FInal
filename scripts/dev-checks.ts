/**
 * Headless dev checks — runnable with: node scripts/dev-checks.ts (Node 22.6+/24).
 * Exercises the REAL calculation module and a copy of the edge-function bill
 * validator, asserting the Phase 2 fixes produce correct numbers.
 */
import { computeSolarMetrics, pickEffectiveTariff, usageChangePct } from '../src/utils/solarCalculations.ts';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}  (got: ${JSON.stringify(got)})`); }
}

console.log('\n=== Solar metrics (Phase 2 calculation fix) ===');
const m = computeSolarMetrics(450, 320, { 'Tier 1 (0-500 kWh)': 7 })!;
console.log('  computeSolarMetrics(consumption=450, generation=320, tier1=7) =>', m);
check('solar offset = 71.1% (gen/cons), NOT constant 83.3%', m.solarOffsetPct === 71.1, m.solarOffsetPct);
check('savings = 320 * 7 = 2240 (NOT 320*0.15=48)', m.savingsInr === 2240, m.savingsInr);
check('CO2 avoided = 320 * 0.71 = 227.2 kg', m.co2AvoidedKg === 227.2, m.co2AvoidedKg);
check('unmet consumption = 450-320 = 130 kWh', m.unmetConsumptionKwh === 130, m.unmetConsumptionKwh);

console.log('\n=== Tariff selection ===');
check('picks Tier-1 rate from bill', pickEffectiveTariff({ 'Tier 1 (0-500 kWh)': 6.5, 'Peak': 9 }) === 6.5);
check('averages tiers when no Tier-1', pickEffectiveTariff({ a: 4, b: 6 }) === 5);
check('defaults to ₹7 when no usable rates', pickEffectiveTariff({}) === 7);
check('ignores garbage rates (0.15 filtered? no — 0.15 is valid >0)', pickEffectiveTariff(null) === 7);

console.log('\n=== Edge cases ===');
check('no generation => null (no solar card)', computeSolarMetrics(450, 0) === null);
check('offset capped at 100% when gen>cons', computeSolarMetrics(100, 300)!.solarOffsetPct === 100);

console.log('\n=== Usage change % ===');
check('usageChangePct(420, 380) = 10.5%', usageChangePct(420, 380) === 10.5, usageChangePct(420, 380));
check('usageChangePct with 0 previous = 0 (no divide-by-zero)', usageChangePct(420, 0) === 0);

// ---- Copy of process-pdf validateElectricityBill (Deno fn can't import under Node) ----
const KNOWN_DISCOMS = ['TORRENT', 'PGVCL', 'MSEDCL', 'BESCOM', 'TNEB'];
const KW = ['units consumed', 'kwh', 'tariff', 'energy charges', 'billing period', 'meter reading', 'due date'];
function validateBill(t: string): boolean {
  const s = t.toLowerCase();
  if (KNOWN_DISCOMS.find((d) => s.includes(d.toLowerCase()))) return true;
  if (KW.filter((k) => s.includes(k)).length >= 3) return true;
  const hasUnit = /\d+\s*(units?|kwh|kw)/i.test(t);
  const hasBill = /(bill|invoice|statement)/i.test(t);
  const hasAmt = /(₹|rs\.?|rupees?)\s*\d+/i.test(t);
  return hasUnit && hasBill && hasAmt;
}
console.log('\n=== Bill validator (process-pdf) ===');
check('accepts a real TORRENT bill', validateBill('TORRENT POWER units consumed 420 kwh bill amount Rs 2800'));
check('accepts via 3+ keywords', validateBill('billing period: march, tariff slab, energy charges, meter reading'));
check('rejects a non-bill (resume text)', !validateBill('John Doe — software engineer, React and Node experience'));

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail === 0 ? 0 : 1);
