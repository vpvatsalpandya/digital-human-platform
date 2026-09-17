'use client';
import { useState } from 'react';
import { AUDIENCE_MODES, type AudienceMode } from '@/knowledge/schema';
import { Tabs } from '@/components/ui';

interface Msg { role: 'user' | 'tutor'; text: string; citations?: { n: number; structureId: string; fieldKey: string; sources: string[] }[]; refused?: boolean; mode?: string }

export function TutorChat({ structureId }: { structureId?: string }) {
  const [mode, setMode] = useState<AudienceMode>('mbbs');
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    if (!q.trim() || busy) return;
    const question = q; setQ('');
    setMsgs((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const r = await fetch('/api/v1/tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, mode, structureId }) });
      const a = await r.json();
      setMsgs((m) => [...m, { role: 'tutor', text: a.answer, citations: a.citations, refused: a.refused, mode: a.mode }]);
    } catch { setMsgs((m) => [...m, { role: 'tutor', text: 'Network error. Try again.', refused: true }]); }
    setBusy(false);
  };
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
      <Tabs tabs={AUDIENCE_MODES.filter((m) => m !== 'faculty').map((m) => ({ id: m, label: m }))} value={mode} onChange={setMode} />
      <p className="text-xs text-muted">The tutor answers only from reviewed knowledge records and cites every sentence. If the records do not cover a question, it says so instead of guessing.{structureId ? ` Context: ${structureId}.` : ''}</p>
      <div className="flex min-h-[40vh] flex-col gap-2">
        {msgs.map((m, i) => (
          <div key={i} className={`card whitespace-pre-wrap text-sm ${m.role === 'user' ? 'ml-8 bg-surface-2' : m.refused ? 'mr-8 border-danger' : 'mr-8'}`}>
            {m.text}
            {m.citations && m.citations.length > 0 && (
              <ol className="mt-2 flex flex-col gap-1 text-[11px] text-muted">
                {m.citations.map((c) => <li key={c.n}>[{c.n}] {c.structureId} · {c.fieldKey} — {c.sources.join('; ')}</li>)}
              </ol>
            )}
            {m.mode === 'extracts-only' && !m.refused && <div className="mt-1 text-[11px] text-muted">Showing source extracts directly (no model configured or model output failed citation validation).</div>}
          </div>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a structure, e.g. 'What is the blood supply of the liver?'" aria-label="Question" />
        <button className="btn-primary" disabled={busy}>{busy ? '…' : 'Ask'}</button>
      </form>
    </div>
  );
}
