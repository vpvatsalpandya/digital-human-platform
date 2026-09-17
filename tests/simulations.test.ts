import { describe, expect, it } from 'vitest';
import { DEFAULT_CARDIAC_PARAMS, simulateBeats, summarise } from '@/simulations/cardiac';
import { DEFAULT_HH, simulateHH, peakVoltage } from '@/simulations/hodgkin-huxley';
import { DEFAULT_GAS, alveolarPO2, arterialPO2, sao2 } from '@/simulations/gas-exchange';

describe('cardiac elastance + Windkessel model', () => {
  const samples = simulateBeats(DEFAULT_CARDIAC_PARAMS, 8, 0.001);
  const s = summarise(samples, DEFAULT_CARDIAC_PARAMS);
  it('reaches textbook resting ranges (Guyton Ch. 9; OpenStax §19.3)', () => {
    expect(s.strokeVolume).toBeGreaterThan(55); expect(s.strokeVolume).toBeLessThan(110);
    expect(s.ejectionFraction).toBeGreaterThan(0.5); expect(s.ejectionFraction).toBeLessThan(0.8);
    expect(s.systolic).toBeGreaterThan(95); expect(s.systolic).toBeLessThan(150);
    expect(s.diastolic).toBeGreaterThan(55); expect(s.diastolic).toBeLessThan(95);
    expect(s.cardiacOutput).toBeGreaterThan(4); expect(s.cardiacOutput).toBeLessThan(8);
  });
  it('shows all four phases in one beat', () => {
    const phases = new Set(samples.map((x) => x.phase));
    expect(phases.has('filling')).toBe(true); expect(phases.has('ejection')).toBe(true);
    expect(phases.has('isovolumic-contraction')).toBe(true); expect(phases.has('isovolumic-relaxation')).toBe(true);
  });
  it('raising contractility increases stroke volume and lowers ESV', () => {
    const hi = summarise(simulateBeats({ ...DEFAULT_CARDIAC_PARAMS, emax: 3.0 }, 8), { ...DEFAULT_CARDIAC_PARAMS, emax: 3.0 });
    expect(hi.strokeVolume).toBeGreaterThan(s.strokeVolume); expect(hi.esv).toBeLessThan(s.esv);
  });
  it('raising afterload lowers stroke volume', () => {
    const p = { ...DEFAULT_CARDIAC_PARAMS, rp: 1.8 };
    expect(summarise(simulateBeats(p, 8), p).strokeVolume).toBeLessThan(s.strokeVolume);
  });
});

describe('Hodgkin–Huxley', () => {
  it('rests near −65 mV without stimulus', () => {
    const out = simulateHH(DEFAULT_HH, { start: 100, duration: 0, amplitude: 0 }, 20);
    expect(Math.abs(out[out.length - 1]!.v + 65)).toBeLessThan(1.5);
  });
  it('fires an action potential to a suprathreshold stimulus and not to a subthreshold one', () => {
    expect(peakVoltage(simulateHH(DEFAULT_HH, { start: 2, duration: 0.5, amplitude: 15 }, 25))).toBeGreaterThan(20);
    expect(peakVoltage(simulateHH(DEFAULT_HH, { start: 2, duration: 0.5, amplitude: 1 }, 25))).toBeLessThan(-40);
  });
  it('tetrodotoxin (Na off) abolishes the spike', () => {
    expect(peakVoltage(simulateHH({ ...DEFAULT_HH, naEnabled: false }, { start: 2, duration: 0.5, amplitude: 15 }, 25))).toBeLessThan(-30);
  });
});

describe('gas exchange', () => {
  it('room air at sea level gives PAO2 ≈ 100 mmHg and SaO2 > 95%', () => {
    expect(alveolarPO2(DEFAULT_GAS)).toBeGreaterThan(95); expect(alveolarPO2(DEFAULT_GAS)).toBeLessThan(105);
    expect(sao2(arterialPO2(DEFAULT_GAS))).toBeGreaterThan(0.95);
  });
  it('altitude lowers PaO2', () => { expect(arterialPO2({ ...DEFAULT_GAS, barometric: 450 })).toBeLessThan(arterialPO2(DEFAULT_GAS)); });
});
