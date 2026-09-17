'use client';
import { useState } from 'react';
import Link from 'next/link';
import { STAGES } from './stages';
import { SOURCES } from '@/knowledge/sources';
import { Citations, Slider } from '@/components/ui';

export function EmbryologyTimeline() {
  const [i, setI] = useState(0);
  const st = STAGES[i]!;
  const phases = ['fertilisation', 'implantation', 'gastrulation', 'organogenesis', 'fetal'] as const;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4">
      <div className="flex gap-1 overflow-x-auto">
        {phases.map((p) => <button key={p} className={`chip capitalize ${st.phase === p ? 'chip-on' : ''}`} onClick={() => setI(STAGES.findIndex((s) => s.phase === p))}>{p}</button>)}
      </div>
      <Slider label="Week post-fertilisation" min={0} max={STAGES.length - 1} step={1} value={i} onChange={(v) => setI(Math.round(v))} format={() => `Week ${st.weekPostFert}${st.carnegie ? ` · ${st.carnegie}` : ''}`} />
      <div className="grid gap-3 md:grid-cols-[1fr_280px]">
        <article className="card flex flex-col gap-3">
          <header><div className="label">Days {st.days}</div><h2 className="text-lg font-semibold">{st.title}</h2><div className="text-[11px] text-muted">Draft content pending faculty review · every statement cited</div></header>
          <div className="grid aspect-video place-items-center rounded bg-surface-2 text-xs text-muted">{st.assetUrl ? 'stage model' : 'Stage illustration/3D model: commissioned asset pending (open embryology sets are non-commercial, see licensing audit §2.10)'}</div>
          <ul className="flex flex-col gap-2 text-sm">
            {st.events.map((e, k) => <li key={k}><p>{e.text}</p><Citations items={e.citations} sources={SOURCES} /></li>)}
          </ul>
          {st.anomalies.length > 0 && (
            <section className="rounded border border-danger p-3">
              <h3 className="label mb-1 !text-danger">If this step fails</h3>
              <ul className="flex flex-col gap-2 text-sm">{st.anomalies.map((a, k) => <li key={k}><b>{a.name}</b>: {a.mechanism}<Citations items={a.citations} sources={SOURCES} /></li>)}</ul>
            </section>
          )}
        </article>
        <aside className="card text-sm">
          <h3 className="label mb-2">Lineage → adult atlas</h3>
          {st.derivativeLinks.length ? (
            <ul className="flex flex-col gap-1">{st.derivativeLinks.map((d, k) => <li key={k}>{d.structureId ? <Link className="chip" href={`/atlas?structure=${d.structureId}`}>{d.text}</Link> : <span className="chip">{d.text}</span>}</li>)}</ul>
          ) : <p className="text-xs text-muted">No derivative links at this stage.</p>}
          <div className="mt-3 flex gap-2"><button className="btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>◀ Earlier</button><button className="btn-ghost" disabled={i === STAGES.length - 1} onClick={() => setI(i + 1)}>Later ▶</button></div>
        </aside>
      </div>
    </div>
  );
}
