/**
 * Cardiac cycle simulation — left ventricle time-varying elastance coupled to a 3-element
 * Windkessel (FR-P1). A real ODE model, not an animation.
 *
 * Model
 *  - LV pressure P_lv = E(t) · (V_lv − V0), with E(t) a normalised "double Hill" activation
 *    between Emin (diastolic) and Emax (end-systolic).
 *  - Filling from a constant-pressure left atrium through a mitral valve (diode with
 *    resistance R_mv); ejection through the aortic valve (R_av) into a Windkessel
 *    (characteristic resistance Rc, compliance C, peripheral resistance Rp).
 *  - Integrated with RK4 at fixed dt.
 *
 * References (planning-level; all parameters are textbook-range approximations, not fitted
 * to any patient):
 *  - Suga H, Sagawa K. Instantaneous pressure–volume relationships and their ratio in the
 *    excised, supported canine left ventricle. Circ Res 1974;35:117–126.
 *  - Westerhof N, Lankhaar JW, Westerhof BE. The arterial Windkessel. Med Biol Eng Comput
 *    2009;47:131–141.
 *  - Guyton & Hall, Textbook of Medical Physiology, 14th ed., Ch. 9 (cardiac cycle,
 *    Wiggers diagram); OpenStax Anatomy & Physiology 2e §19.3 Cardiac Cycle.
 */

export interface CardiacParams {
  heartRate: number;      // bpm
  emax: number;           // mmHg/mL (contractility)
  emin: number;           // mmHg/mL (diastolic stiffness)
  v0: number;             // mL, unstressed LV volume
  atrialPressure: number; // mmHg (preload)
  rMitral: number;        // mmHg·s/mL
  rAortic: number;        // mmHg·s/mL
  rc: number;             // mmHg·s/mL characteristic resistance
  compliance: number;     // mL/mmHg arterial compliance
  rp: number;             // mmHg·s/mL peripheral resistance (afterload)
  venousPressure: number; // mmHg downstream of Rp
}

export const DEFAULT_CARDIAC_PARAMS: CardiacParams = {
  heartRate: 72,
  emax: 2.0,
  emin: 0.06,
  v0: 10,
  atrialPressure: 8,
  rMitral: 0.005,
  rAortic: 0.01,
  rc: 0.05,
  compliance: 1.6,
  rp: 1.0,
  venousPressure: 5,
};

export interface CardiacState {
  t: number;      // s
  vlv: number;    // mL
  pao: number;    // mmHg (aortic / arterial)
}

export interface CardiacSample extends CardiacState {
  plv: number;
  elastance: number;
  qMitral: number;
  qAortic: number;
  phase: 'filling' | 'isovolumic-contraction' | 'ejection' | 'isovolumic-relaxation';
  ecg: number;
}

/** Normalised activation 0..1 over one beat (double-Hill, Stergiopulos et al. 1996). */
export function activation(tBeat: number, period: number): number {
  const tn = tBeat / period;
  const a1 = 0.303, a2 = 0.508, n1 = 1.32, n2 = 21.9;
  const rise = Math.pow(tn / a1, n1) / (1 + Math.pow(tn / a1, n1));
  const fall = 1 / (1 + Math.pow(tn / a2, n2));
  return 1.55 * rise * fall;
}

export function elastance(p: CardiacParams, tBeat: number): number {
  const period = 60 / p.heartRate;
  return p.emin + (p.emax - p.emin) * Math.min(1, activation(tBeat, period));
}

function derivatives(p: CardiacParams, tBeat: number, s: CardiacState): { dV: number; dPao: number; plv: number; qm: number; qa: number } {
  const e = elastance(p, tBeat);
  const plv = e * (s.vlv - p.v0);
  const qm = p.atrialPressure > plv ? (p.atrialPressure - plv) / p.rMitral : 0;
  // aortic valve: ejection when P_lv exceeds arterial pressure (through Rc + valve)
  const qa = plv > s.pao ? (plv - s.pao) / (p.rAortic + p.rc) : 0;
  const qOut = (s.pao - p.venousPressure) / p.rp;
  return { dV: qm - qa, dPao: (qa - qOut) / p.compliance, plv, qm, qa };
}

/** Advance one RK4 step. */
export function step(p: CardiacParams, s: CardiacState, dt: number): CardiacSample {
  const period = 60 / p.heartRate;
  const tb = (t: number) => t % period;
  const k1 = derivatives(p, tb(s.t), s);
  const s2 = { t: s.t + dt / 2, vlv: s.vlv + (dt / 2) * k1.dV, pao: s.pao + (dt / 2) * k1.dPao };
  const k2 = derivatives(p, tb(s2.t), s2);
  const s3 = { t: s.t + dt / 2, vlv: s.vlv + (dt / 2) * k2.dV, pao: s.pao + (dt / 2) * k2.dPao };
  const k3 = derivatives(p, tb(s3.t), s3);
  const s4 = { t: s.t + dt, vlv: s.vlv + dt * k3.dV, pao: s.pao + dt * k3.dPao };
  const k4 = derivatives(p, tb(s4.t), s4);
  const vlv = s.vlv + (dt / 6) * (k1.dV + 2 * k2.dV + 2 * k3.dV + k4.dV);
  const pao = s.pao + (dt / 6) * (k1.dPao + 2 * k2.dPao + 2 * k3.dPao + k4.dPao);
  const t = s.t + dt;
  const d = derivatives(p, tb(t), { t, vlv, pao });
  const phase: CardiacSample['phase'] = d.qm > 0 ? 'filling' : d.qa > 0 ? 'ejection' : d.dV === 0 && elastance(p, tb(t)) > elastance(p, tb(t - dt)) ? 'isovolumic-contraction' : 'isovolumic-relaxation';
  return { t, vlv, pao, plv: d.plv, elastance: elastance(p, tb(t)), qMitral: d.qm, qAortic: d.qa, phase, ecg: syntheticEcg(tb(t), period) };
}

/**
 * Synthetic ECG for correlation only (not a physiological model): Gaussian P, QRS, T waves
 * placed at conventional fractions of the RR interval. QRS is placed slightly before the
 * rise of ventricular pressure, as in the Wiggers diagram.
 */
export function syntheticEcg(tBeat: number, period: number): number {
  const g = (mu: number, sigma: number, amp: number) => amp * Math.exp(-0.5 * ((tBeat - mu) / sigma) ** 2);
  const wrap = (mu: number, sigma: number, amp: number) => g(mu, sigma, amp) + g(mu + period, sigma, amp) + g(mu - period, sigma, amp);
  return wrap(-0.10, 0.02, 0.15) + wrap(-0.03, 0.006, -0.12) + wrap(0.0, 0.008, 1.0) + wrap(0.025, 0.006, -0.25) + wrap(0.26, 0.035, 0.3);
}

/** Simulate N beats at dt and return samples of the last beat (steady state). */
export function simulateBeats(p: CardiacParams, beats = 6, dt = 0.001): CardiacSample[] {
  const period = 60 / p.heartRate;
  let s: CardiacState = { t: 0, vlv: 120, pao: 80 };
  const out: CardiacSample[] = [];
  const total = beats * period;
  while (s.t < total - 1e-9) {
    const sample = step(p, s, dt);
    s = { t: sample.t, vlv: sample.vlv, pao: sample.pao };
    if (s.t >= (beats - 1) * period) out.push(sample);
  }
  return out;
}

export interface CardiacSummary {
  edv: number; esv: number; strokeVolume: number; ejectionFraction: number; cardiacOutput: number; systolic: number; diastolic: number; map: number;
}

export function summarise(samples: CardiacSample[], p: CardiacParams): CardiacSummary {
  const edv = Math.max(...samples.map((s) => s.vlv));
  const esv = Math.min(...samples.map((s) => s.vlv));
  const strokeVolume = edv - esv;
  const systolic = Math.max(...samples.map((s) => s.pao));
  const diastolic = Math.min(...samples.map((s) => s.pao));
  const map = samples.reduce((a, s) => a + s.pao, 0) / samples.length;
  return { edv, esv, strokeVolume, ejectionFraction: strokeVolume / edv, cardiacOutput: (strokeVolume * p.heartRate) / 1000, systolic, diastolic, map };
}
