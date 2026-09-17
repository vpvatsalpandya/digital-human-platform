'use client';
import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_CARDIAC_PARAMS, simulateBeats, summarise, type CardiacParams } from '@/simulations/cardiac';
import { LineChart } from './Chart';
import { Slider, Stat } from '@/components/ui';

/** Predict → run → explain (Phase B §5.2). */
export function CardiacSim() {
  const [p, setP] = useState<CardiacParams>(DEFAULT_CARDIAC_PARAMS);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [ran, setRan] = useState(true);
  const samples = useMemo(() => simulateBeats(p, 6, 0.001), [p]);
  const summary = useMemo(() => summarise(samples, p), [samples, p]);
  const t0 = samples[0]?.t ?? 0;
  const [cursor, setCursor] = useState(0);
  useEffect(() => { const id = setInterval(() => setCursor((c) => (c + 1) % samples.length), 16); return () => clearInterval(id); }, [samples.length]);
  const cur = samples[cursor] ?? samples[0]!;
  const set = (k: keyof CardiacParams) => (v: number) => { setP((q) => ({ ...q, [k]: v })); setRan(true); };
  const period = 60 / p.heartRate;

  const pressure = [
    { name: 'LV pressure', color: '#ef4444', points: samples.map((s) => [s.t - t0, s.plv] as [number, number]) },
    { name: 'Aortic pressure', color: '#f59e0b', points: samples.map((s) => [s.t - t0, s.pao] as [number, number]) },
  ];
  const volume = [{ name: 'LV volume', color: '#22d3ee', points: samples.map((s) => [s.t - t0, s.vlv] as [number, number]) }];
  const ecg = [{ name: 'ECG (synthetic)', color: '#a3e635', points: samples.map((s) => [s.t - t0, s.ecg] as [number, number]) }];
  const pv = [{ name: 'PV loop', color: '#c084fc', points: samples.map((s) => [s.vlv, s.plv] as [number, number]) }];

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-2">
        <div className="card flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm"><span>Phase: <b>{cur.phase.replace('-', ' ')}</b> · t = {(cur.t - t0).toFixed(2)} s</span><span className="whitespace-nowrap text-muted">Wiggers diagram</span></div>
        <LineChart series={pressure} xLabel="s" yLabel="mmHg" xRange={[0, period]} yRange={[0, 140]} marker={cur.t - t0} />
        <LineChart series={volume} xLabel="s" yLabel="mL" xRange={[0, period]} yRange={[0, 160]} marker={cur.t - t0} height={120} />
        <LineChart series={ecg} xLabel="s" yLabel="mV" xRange={[0, period]} yRange={[-0.5, 1.2]} marker={cur.t - t0} height={100} />
        <LineChart series={pv} xLabel="LV volume (mL)" yLabel="mmHg" xRange={[0, 160]} yRange={[0, 140]} height={200} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Stroke volume" value={summary.strokeVolume.toFixed(0)} unit="mL" />
          <Stat label="Ejection fraction" value={(summary.ejectionFraction * 100).toFixed(0)} unit="%" />
          <Stat label="Cardiac output" value={summary.cardiacOutput.toFixed(1)} unit="L/min" />
          <Stat label="BP" value={`${summary.systolic.toFixed(0)}/${summary.diastolic.toFixed(0)}`} unit="mmHg" />
        </div>
      </div>
      <aside className="flex flex-col gap-3">
        <div className="card flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Predict, then run</h3>
          <p className="text-xs text-muted">If you raise contractility (Emax), what happens to stroke volume and end-systolic volume?</p>
          <div className="flex gap-1">{['SV ↑, ESV ↓', 'SV ↓, ESV ↑', 'No change'].map((o) => <button key={o} className={`chip ${prediction === o ? 'chip-on' : ''}`} onClick={() => { setPrediction(o); setRan(false); }}>{o}</button>)}</div>
          {prediction && ran && <p className="text-xs">Observed: change Emax below and compare. Expected from the model and Guyton Ch. 9: SV ↑, ESV ↓ (the end-systolic pressure–volume line steepens).</p>}
        </div>
        <div className="card flex flex-col gap-2">
          <Slider label="Heart rate" min={40} max={180} step={1} value={p.heartRate} onChange={set('heartRate')} format={(v) => `${v} bpm`} />
          <Slider label="Contractility (Emax)" min={0.8} max={4} step={0.05} value={p.emax} onChange={set('emax')} format={(v) => `${v.toFixed(2)} mmHg/mL`} />
          <Slider label="Preload (LA pressure)" min={2} max={20} step={0.5} value={p.atrialPressure} onChange={set('atrialPressure')} format={(v) => `${v} mmHg`} />
          <Slider label="Afterload (Rp)" min={0.5} max={2.5} step={0.05} value={p.rp} onChange={set('rp')} format={(v) => `${v.toFixed(2)} mmHg·s/mL`} />
          <Slider label="Arterial compliance" min={0.6} max={3} step={0.05} value={p.compliance} onChange={set('compliance')} format={(v) => `${v.toFixed(2)} mL/mmHg`} />
          <button className="btn-ghost" onClick={() => setP(DEFAULT_CARDIAC_PARAMS)}>Reset</button>
        </div>
        <details className="card text-xs">
          <summary className="cursor-pointer text-sm font-semibold">How this works</summary>
          <p className="mt-2">Left ventricle: P = E(t)·(V − V₀), with E(t) a double-Hill activation between Emin and Emax. Mitral and aortic valves are ideal diodes with resistances. Arterial tree: 3-element Windkessel (Rc, C, Rp). Integrated with RK4 at 1 ms.</p>
          <ul className="mt-2 list-disc pl-4">
            <li>Suga H, Sagawa K. Circ Res 1974;35:117–126.</li>
            <li>Westerhof N et al. The arterial Windkessel. Med Biol Eng Comput 2009;47:131–141.</li>
            <li>Guyton &amp; Hall 14th ed., Ch. 9; OpenStax A&amp;P 2e §19.3.</li>
          </ul>
          <p className="mt-2 text-muted">The ECG trace is a synthetic waveform for timing correlation only.</p>
        </details>
      </aside>
    </div>
  );
}
