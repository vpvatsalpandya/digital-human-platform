/**
 * Hodgkin–Huxley action potential (FR-P2), squid giant axon parameters at 6.3 °C.
 * Hodgkin AL, Huxley AF. A quantitative description of membrane current and its
 * application to conduction and excitation in nerve. J Physiol 1952;117:500–544.
 * Units: mV, ms, µA/cm², mS/cm², µF/cm².
 */
export interface HHParams {
  cm: number; gNa: number; gK: number; gL: number; eNa: number; eK: number; eL: number;
  /** channel toggles for teaching (e.g. TTX blocks Na) */
  naEnabled: boolean; kEnabled: boolean;
}
export const DEFAULT_HH: HHParams = { cm: 1, gNa: 120, gK: 36, gL: 0.3, eNa: 50, eK: -77, eL: -54.4, naEnabled: true, kEnabled: true };

export interface HHState { t: number; v: number; m: number; h: number; n: number }

const vtrap = (x: number, y: number) => (Math.abs(x / y) < 1e-6 ? y * (1 - x / y / 2) : x / (Math.exp(x / y) - 1));
export const rates = {
  am: (v: number) => 0.1 * vtrap(-(v + 40), 10),
  bm: (v: number) => 4 * Math.exp(-(v + 65) / 18),
  ah: (v: number) => 0.07 * Math.exp(-(v + 65) / 20),
  bh: (v: number) => 1 / (1 + Math.exp(-(v + 35) / 10)),
  an: (v: number) => 0.01 * vtrap(-(v + 55), 10),
  bn: (v: number) => 0.125 * Math.exp(-(v + 65) / 80),
};

export function restingState(v = -65): HHState {
  const inf = (a: number, b: number) => a / (a + b);
  return { t: 0, v, m: inf(rates.am(v), rates.bm(v)), h: inf(rates.ah(v), rates.bh(v)), n: inf(rates.an(v), rates.bn(v)) };
}

export interface HHSample extends HHState { iNa: number; iK: number; iL: number; iStim: number }

function deriv(p: HHParams, s: HHState, iStim: number) {
  const gNa = p.naEnabled ? p.gNa * s.m ** 3 * s.h : 0;
  const gK = p.kEnabled ? p.gK * s.n ** 4 : 0;
  const iNa = gNa * (s.v - p.eNa);
  const iK = gK * (s.v - p.eK);
  const iL = p.gL * (s.v - p.eL);
  return {
    dv: (iStim - iNa - iK - iL) / p.cm,
    dm: rates.am(s.v) * (1 - s.m) - rates.bm(s.v) * s.m,
    dh: rates.ah(s.v) * (1 - s.h) - rates.bh(s.v) * s.h,
    dn: rates.an(s.v) * (1 - s.n) - rates.bn(s.v) * s.n,
    iNa, iK, iL,
  };
}

export function stepHH(p: HHParams, s: HHState, iStim: number, dt: number): HHSample {
  // RK4 on (v, m, h, n)
  const f = (st: HHState) => deriv(p, st, iStim);
  const add = (st: HHState, d: ReturnType<typeof f>, k: number): HHState => ({ t: st.t + k, v: st.v + k * d.dv, m: st.m + k * d.dm, h: st.h + k * d.dh, n: st.n + k * d.dn });
  const k1 = f(s), k2 = f(add(s, k1, dt / 2)), k3 = f(add(s, k2, dt / 2)), k4 = f(add(s, k3, dt));
  const v = s.v + (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv);
  const m = s.m + (dt / 6) * (k1.dm + 2 * k2.dm + 2 * k3.dm + k4.dm);
  const h = s.h + (dt / 6) * (k1.dh + 2 * k2.dh + 2 * k3.dh + k4.dh);
  const n = s.n + (dt / 6) * (k1.dn + 2 * k2.dn + 2 * k3.dn + k4.dn);
  const ns = { t: s.t + dt, v, m, h, n };
  const d = f(ns);
  return { ...ns, iNa: d.iNa, iK: d.iK, iL: d.iL, iStim };
}

export interface StimulusProtocol { start: number; duration: number; amplitude: number }

/** Run a protocol for `total` ms at `dt` ms. */
export function simulateHH(p: HHParams, stim: StimulusProtocol, total = 30, dt = 0.01): HHSample[] {
  let s = restingState();
  const out: HHSample[] = [];
  while (s.t < total) {
    const iStim = s.t >= stim.start && s.t < stim.start + stim.duration ? stim.amplitude : 0;
    const sample = stepHH(p, s, iStim, dt);
    out.push(sample);
    s = sample;
  }
  return out;
}

export function peakVoltage(samples: HHSample[]): number { return Math.max(...samples.map((s) => s.v)); }
