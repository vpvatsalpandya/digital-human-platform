'use client';
import { useState } from 'react';
import { DEFAULT_GAS, alveolarPO2, arterialPO2, sao2, type GasParams } from '@/simulations/gas-exchange';
import { Slider, Stat } from '@/components/ui';

export function GasExchangeSim() {
  const [p, setP] = useState<GasParams>(DEFAULT_GAS);
  const pa = alveolarPO2(p), pao2 = arterialPO2(p), sat = sao2(pao2) * 100;
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_320px]">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Stat label="Alveolar PO₂ (PAO₂)" value={pa.toFixed(0)} unit="mmHg" />
        <Stat label="Arterial PO₂ (PaO₂)" value={pao2.toFixed(0)} unit="mmHg" />
        <Stat label="SaO₂" value={sat.toFixed(0)} unit="%" />
      </div>
      <aside className="flex flex-col gap-3">
        <div className="card flex flex-col gap-2">
          <Slider label="FiO₂" min={0.1} max={1} step={0.01} value={p.fio2} onChange={(v) => setP({ ...p, fio2: v })} format={(v) => `${(v * 100).toFixed(0)}%`} />
          <Slider label="Barometric pressure (altitude)" min={250} max={760} step={5} value={p.barometric} onChange={(v) => setP({ ...p, barometric: v })} format={(v) => `${v} mmHg`} />
          <Slider label="PaCO₂ (ventilation)" min={20} max={80} step={1} value={p.paco2} onChange={(v) => setP({ ...p, paco2: v })} format={(v) => `${v} mmHg`} />
          <Slider label="A–a gradient (shunt/age)" min={0} max={60} step={1} value={p.aaGradient} onChange={(v) => setP({ ...p, aaGradient: v })} format={(v) => `${v} mmHg`} />
        </div>
        <details className="card text-xs"><summary className="cursor-pointer text-sm font-semibold">How this works</summary><p className="mt-2">Alveolar gas equation PAO₂ = FiO₂·(PB − 47) − PaCO₂/R; PaO₂ = PAO₂ − (A–a); SaO₂ from the Severinghaus (1979) approximation of the oxyhaemoglobin dissociation curve. West, Respiratory Physiology 10th ed., Ch. 2 &amp; 5; OpenStax A&amp;P 2e §22.4.</p></details>
      </aside>
    </div>
  );
}
