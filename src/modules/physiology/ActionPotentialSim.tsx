'use client';
import { useMemo, useState } from 'react';
import { DEFAULT_HH, simulateHH, peakVoltage, type HHParams } from '@/simulations/hodgkin-huxley';
import { LineChart } from './Chart';
import { Slider, Stat } from '@/components/ui';

export function ActionPotentialSim() {
  const [p, setP] = useState<HHParams>(DEFAULT_HH);
  const [amp, setAmp] = useState(10);
  const [dur, setDur] = useState(0.5);
  const samples = useMemo(() => simulateHH(p, { start: 2, duration: dur, amplitude: amp }, 25, 0.01), [p, amp, dur]);
  const v = [{ name: 'Vm', color: '#22d3ee', points: samples.filter((_, i) => i % 5 === 0).map((s) => [s.t, s.v] as [number, number]) }];
  const gates = [
    { name: 'm', color: '#ef4444', points: samples.filter((_, i) => i % 5 === 0).map((s) => [s.t, s.m] as [number, number]) },
    { name: 'h', color: '#f59e0b', points: samples.filter((_, i) => i % 5 === 0).map((s) => [s.t, s.h] as [number, number]) },
    { name: 'n', color: '#a3e635', points: samples.filter((_, i) => i % 5 === 0).map((s) => [s.t, s.n] as [number, number]) },
  ];
  const fired = peakVoltage(samples) > 0;
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-2">
        <LineChart series={v} xLabel="ms" yLabel="mV" yRange={[-90, 50]} />
        <LineChart series={gates} xLabel="ms" yLabel="gate" yRange={[0, 1]} height={140} />
        <div className="grid grid-cols-2 gap-2"><Stat label="Peak Vm" value={peakVoltage(samples).toFixed(1)} unit="mV" /><Stat label="Result" value={fired ? 'Action potential' : 'Subthreshold'} /></div>
      </div>
      <aside className="flex flex-col gap-3">
        <div className="card flex flex-col gap-2">
          <Slider label="Stimulus amplitude" min={0} max={30} step={0.5} value={amp} onChange={setAmp} format={(x) => `${x} µA/cm²`} />
          <Slider label="Stimulus duration" min={0.1} max={5} step={0.1} value={dur} onChange={setDur} format={(x) => `${x.toFixed(1)} ms`} />
          <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={p.naEnabled} onChange={(e) => setP({ ...p, naEnabled: e.target.checked })} /> Na⁺ channels (uncheck = tetrodotoxin)</label>
          <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={p.kEnabled} onChange={(e) => setP({ ...p, kEnabled: e.target.checked })} /> K⁺ channels (uncheck = tetraethylammonium)</label>
          <button className="btn-ghost" onClick={() => { setP(DEFAULT_HH); setAmp(10); setDur(0.5); }}>Reset</button>
        </div>
        <details className="card text-xs">
          <summary className="cursor-pointer text-sm font-semibold">How this works</summary>
          <p className="mt-2">Hodgkin–Huxley membrane: C·dV/dt = I_stim − g_Na·m³h·(V−E_Na) − g_K·n⁴·(V−E_K) − g_L·(V−E_L), with gating variables m, h, n following first-order kinetics. Squid axon parameters at 6.3 °C, RK4 at 10 µs.</p>
          <p className="mt-1">Hodgkin AL, Huxley AF. J Physiol 1952;117:500–544.</p>
        </details>
      </aside>
    </div>
  );
}
