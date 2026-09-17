'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Comparator, DEMO_PAIRS } from '@/modules/pathology/Comparator';
import { Tabs } from '@/components/ui';

export default function PathologyPage() {
  const [id, setId] = useState(DEMO_PAIRS[0]!.id);
  const pair = DEMO_PAIRS.find((p) => p.id === id)!;
  return (
    <div className="mx-auto max-w-3xl p-4">
      <Tabs tabs={DEMO_PAIRS.map((p) => ({ id: p.id, label: p.title }))} value={id} onChange={setId} />
      <div className="mt-3"><Comparator pair={pair} /></div>
      {pair.structureId && <Link className="chip mt-3" href={`/atlas?structure=${pair.structureId}`}>Open {pair.structureId} in the atlas</Link>}
    </div>
  );
}
