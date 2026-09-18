'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ITEM_BANK, type Item } from './item-bank';
import { scoreMcq, scoreMultiSelect, scoreTypedAnswer, type ScoreResult } from './scoring';
import { useBodyManifest } from '@/engine/useBodyManifest';
import { useEngineStore } from '@/store/engine';
import { updateMastery } from './mastery';
import { useAnalytics } from '@/lib/analytics';
import { Tabs } from '@/components/ui';

const Viewer = dynamic(() => import('@/engine/Viewer').then((m) => m.Viewer), { ssr: false });

type Kind = 'quiz' | 'spotter';

/** Quiz and spotter runners (FR-A1, FR-A4). Timing is per station; scoring is deterministic. */
export function AssessmentRunner({ structureId }: { structureId?: string }) {
  const [kind, setKind] = useState<Kind>(structureId ? 'quiz' : 'spotter');
  const pool = useMemo(() => {
    const byKind = ITEM_BANK.filter((i) => (kind === 'spotter' ? i.type === 'spot3d' : i.type !== 'spot3d'));
    const filtered = structureId ? byKind.filter((i) => i.structureId === structureId || kind === 'spotter') : byKind;
    return filtered.length ? filtered : byKind;
  }, [kind, structureId]);
  // Station order is randomised (FR-A1), but only after mount: shuffling while rendering
  // would make the server and client markup disagree.
  const [items, setItems] = useState<Item[]>(pool);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [mastery, setMastery] = useState<Record<string, number>>({});
  const track = useAnalytics((a) => a.track);
  useEffect(() => { setItems(shuffle(pool)); setIdx(0); setResults([]); }, [pool]);
  const item = items[idx];
  const done = idx >= items.length;
  const onScore = (r: ScoreResult) => {
    setResults((x) => [...x, r]);
    if (item) {
      setMastery((m) => ({ ...m, [item.structureId]: updateMastery(m[item.structureId] ?? 0.2, r.correct) }));
      track('item.answer', { itemId: item.id, structureId: item.structureId, correct: r.correct, score: r.score });
    }
  };
  const total = results.reduce((a, r) => a + r.score, 0), max = results.reduce((a, r) => a + r.max, 0);
  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <Tabs tabs={[{ id: 'spotter', label: 'Spotter (3D)' }, { id: 'quiz', label: 'Quiz' }]} value={kind} onChange={setKind} />
        <div className="text-xs text-muted tabular-nums">Station {Math.min(idx + 1, items.length)} / {items.length} · Score {total.toFixed(1)} / {max}</div>
      </div>
      {done ? (
        <div className="mx-auto max-w-lg p-6">
          <h2 className="text-lg font-semibold">Finished</h2>
          <p className="mt-1 text-sm">You scored <b>{total.toFixed(1)}</b> of <b>{max}</b>. Mastery estimates (Bayesian knowledge tracing) below feed your dashboard.</p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">{Object.entries(mastery).map(([s, p]) => <li key={s} className="flex justify-between rounded bg-surface-2 px-2 py-1"><span>{s}</span><span className={p < 0.5 ? 'text-danger' : 'text-success'}>{Math.round(p * 100)}%</span></li>)}</ul>
          <button className="btn-primary mt-4" onClick={() => { setItems(shuffle(pool)); setIdx(0); setResults([]); setMastery({}); }}>Run again</button>
        </div>
      ) : item?.type === 'spot3d' ? (
        <SpotStation key={item.id} item={item} onScore={(r) => { onScore(r); }} onNext={() => setIdx((i) => i + 1)} />
      ) : item ? (
        <QuizStation key={item.id} item={item} onScore={onScore} onNext={() => setIdx((i) => i + 1)} />
      ) : null}
    </div>
  );
}

function SpotStation({ item, onScore, onNext }: { item: Extract<Item, { type: 'spot3d' }>; onScore: (r: ScoreResult) => void; onNext: () => void }) {
  const body = useEngineStore((s) => s.body);
  const { manifest } = useBodyManifest(body);
  const target = manifest.structures.find((s) => s.id === item.structureId) ?? manifest.structures[0]!;
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    // Station setup: isolate target with faded neighbours; selection highlight; hide the name.
    const st = useEngineStore.getState();
    st.applyViewState({ ...st.snapshot(), visibleSystems: [...new Set([...st.visibleSystems, ...target.systems])], selected: [target.id], isolated: null, hidden: [], faded: [] });
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [target]);
  const submit = useCallback(() => {
    if (result) return;
    const r = scoreTypedAnswer(answer, { accepted: [target.name, ...(target.aliases ?? []), ...(target.latinName ? [target.latinName] : [])], requireLaterality: target.laterality !== 'none', tolerateTypos: true });
    setResult(r); onScore(r);
  }, [answer, target, result, onScore]);
  useEffect(() => { if (seconds === 0) submit(); }, [seconds, submit]);
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="relative h-[50dvh] shrink-0 md:h-full md:flex-1"><Viewer manifest={manifest} className="h-full w-full" /><div className="absolute right-2 top-2 rounded bg-surface px-2 py-1 text-sm tabular-nums">{seconds}s</div></div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto border-t border-border p-3 md:w-[340px] md:flex-none md:border-l md:border-t-0">
        <p className="text-sm">{item.stem}</p>
        {!result ? (
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-2">
            <input className="input" autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the structure name" aria-label="Answer" />
            <button className="btn-primary">Submit</button>
          </form>
        ) : (
          <div className="card text-sm">
            <p className={result.correct ? 'text-success' : 'text-danger'}>{result.correct ? 'Correct' : result.reason === 'wrong_or_missing_laterality' ? 'Right structure, wrong or missing side (half credit)' : 'Incorrect'}</p>
            <p className="mt-1">Answer: <b>{target.name}</b>{target.latinName ? ` (${target.latinName})` : ''}</p>
            <button className="btn-primary mt-3 w-full" onClick={onNext}>Next station</button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizStation({ item, onScore, onNext }: { item: Exclude<Item, { type: 'spot3d' }>; onScore: (r: ScoreResult) => void; onNext: () => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const submit = () => {
    const r = item.type === 'mcq' ? scoreMcq(sel[0] ?? null, item.correct) : item.type === 'multi' ? scoreMultiSelect(sel, item.correct) : scoreTypedAnswer(text, { accepted: item.accepted, tolerateTypos: true });
    setResult(r); onScore(r);
  };
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-4">
      <p className="text-sm font-medium">{item.stem}</p>
      {item.type === 'short' ? (
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} disabled={!!result} aria-label="Answer" />
      ) : (
        <div className="flex flex-col gap-1">
          {item.options.map((o) => (
            <button key={o.id} disabled={!!result} className={`btn-ghost justify-start ${sel.includes(o.id) ? '!bg-primary !text-primary-fg' : ''}`} onClick={() => setSel(item.type === 'mcq' ? [o.id] : sel.includes(o.id) ? sel.filter((x) => x !== o.id) : [...sel, o.id])} aria-pressed={sel.includes(o.id)}>{o.text}</button>
          ))}
        </div>
      )}
      {!result ? <button className="btn-primary" onClick={submit} disabled={item.type === 'short' ? !text : sel.length === 0}>Submit</button> : (
        <div className="card text-sm">
          <p className={result.correct ? 'text-success' : 'text-danger'}>{result.correct ? 'Correct' : `Score ${result.score.toFixed(2)} / ${result.max}`}</p>
          {item.type !== 'short' && <p className="mt-1">Correct: {item.options.filter((o) => (Array.isArray(item.correct) ? item.correct.includes(o.id) : item.correct === o.id)).map((o) => o.text).join(', ')}</p>}
          {item.type === 'short' && <p className="mt-1">Accepted: {item.accepted[0]}</p>}
          {item.citations.length > 0 && <p className="mt-1 text-[11px] text-muted">Source: {item.citations.map((c) => `${c.sourceId} · ${c.locator}`).join('; ')}</p>}
          <button className="btn-primary mt-3 w-full" onClick={onNext}>Next</button>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j]!, b[i]!]; } return b; }
