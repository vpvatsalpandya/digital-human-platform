'use client';
import Link from 'next/link';
import { useEngineStore } from '@/store/engine';
import { summariseEvents, useAnalytics } from '@/lib/analytics';
import { SYSTEM_META, type SystemId } from '@/engine/types';
import { Stat } from '@/components/ui';

/** Student dashboard (FR-An1). Server-side roll-ups replace the local queue once sign-in lands. */
export default function MePage() {
  const bookmarks = useEngineStore((s) => s.bookmarks);
  const views = useEngineStore((s) => s.savedViews);
  const events = useAnalytics((a) => a.queue);
  const sum = summariseEvents(events);
  const acc = sum.quizTotal ? Math.round((sum.quizCorrect / sum.quizTotal) * 100) : 0;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Structures viewed" value={sum.structuresViewed} />
        <Stat label="Items answered" value={sum.quizTotal} />
        <Stat label="Accuracy" value={acc} unit="%" />
        <Stat label="Bookmarks" value={bookmarks.length} />
      </div>
      <section className="card">
        <h2 className="label mb-2">Time by system (this session)</h2>
        <ul className="flex flex-col gap-1 text-sm">{Object.entries(sum.timeBySystem).map(([s, t]) => <li key={s} className="flex items-center gap-2"><span className="w-32">{SYSTEM_META[s as SystemId]?.name ?? s}</span><span className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, t)}%` }} /><span className="text-xs text-muted">{t}s</span></li>)}{!Object.keys(sum.timeBySystem).length && <li className="text-xs text-muted">Open the atlas to start tracking.</li>}</ul>
      </section>
      <section className="card"><h2 className="label mb-2">Bookmarks</h2><ul className="flex flex-wrap gap-1">{bookmarks.map((b) => <li key={b.structureId}><Link className="chip" href={`/atlas?structure=${b.structureId}`}>{b.structureId}</Link></li>)}{!bookmarks.length && <li className="text-xs text-muted">Star a structure in the atlas.</li>}</ul></section>
      <section className="card"><h2 className="label mb-2">Saved views</h2><ul className="flex flex-wrap gap-1">{views.map((v) => <li key={v.id}><span className="chip">{v.name}</span></li>)}{!views.length && <li className="text-xs text-muted">Save a view from the atlas tools.</li>}</ul></section>
    </div>
  );
}
