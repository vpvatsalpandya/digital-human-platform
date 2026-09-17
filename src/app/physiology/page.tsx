'use client';
import { useState } from 'react';
import { CardiacSim } from '@/modules/physiology/CardiacSim';
import { ActionPotentialSim } from '@/modules/physiology/ActionPotentialSim';
import { GasExchangeSim } from '@/modules/physiology/GasExchangeSim';
import { Tabs } from '@/components/ui';

const SIMS = [
  { id: 'cardiac', label: 'Cardiac cycle', el: <CardiacSim /> },
  { id: 'ap', label: 'Action potential', el: <ActionPotentialSim /> },
  { id: 'gas', label: 'Gas exchange', el: <GasExchangeSim /> },
  { id: 'nephron', label: 'Nephron (Sprint 6)', el: <p className="text-sm text-muted">Countercurrent multiplier model scheduled for Sprint 6 (Phase I).</p> },
];

export default function PhysiologyPage() {
  const [id, setId] = useState('cardiac');
  return (
    <div className="mx-auto max-w-6xl p-4">
      <Tabs tabs={SIMS.map((s) => ({ id: s.id, label: s.label }))} value={id} onChange={setId} />
      <div className="mt-3">{SIMS.find((s) => s.id === id)?.el}</div>
    </div>
  );
}
