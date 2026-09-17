/**
 * Alveolar gas exchange (FR-P3, v1 subset): alveolar gas equation and a simple
 * ventilation/perfusion-independent arterial approximation for teaching FiO2, altitude and
 * hypoventilation effects.
 * References: West JB. Respiratory Physiology: The Essentials, 10th ed., Ch. 2 & 5;
 * Guyton & Hall 14th ed., Ch. 40; OpenStax A&P 2e §22.4 Gas Exchange.
 */
export interface GasParams {
  fio2: number;            // fraction, 0.21 room air
  barometric: number;      // mmHg, 760 sea level
  paco2: number;           // mmHg arterial CO2 (set by alveolar ventilation)
  rq: number;              // respiratory quotient ~0.8
  aaGradient: number;      // mmHg alveolar–arterial O2 difference (age/shunt)
}
export const DEFAULT_GAS: GasParams = { fio2: 0.21, barometric: 760, paco2: 40, rq: 0.8, aaGradient: 10 };
const PH2O = 47; // mmHg water vapour at 37 °C

export function alveolarPO2(p: GasParams): number {
  return p.fio2 * (p.barometric - PH2O) - p.paco2 / p.rq;
}
export function arterialPO2(p: GasParams): number {
  return Math.max(0, alveolarPO2(p) - p.aaGradient);
}
/** Hill-type oxyhaemoglobin dissociation approximation (Severinghaus 1979). */
export function sao2(po2: number): number {
  const x = Math.max(po2, 0.1);
  return 1 / (23400 / (x ** 3 + 150 * x) + 1);
}
