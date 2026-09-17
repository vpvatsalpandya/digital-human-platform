'use client';
import { useState } from 'react';
import { useEngineStore } from '@/store/engine';
import { SEED_RECORDS } from '@/knowledge/seed';
import { publishabilityIssues, canTransition, legalStatusTransitions, type RecordStatus } from '@/knowledge/schema';
import { ITEM_BANK } from '@/modules/assessment/item-bank';
import { itemAnalysis } from '@/modules/assessment/scoring';
import { Tabs } from '@/components/ui';

type Tab = 'lessons' | 'assessments' | 'review' | 'analytics';

interface LessonStep { title: string; capture: unknown }

/** Faculty portal v0 (FR-F1, FR-F2): lesson builder with "capture view", assessment builder, review queue, cohort analytics. */
export function FacultyPortal() {
  const [tab, setTab] = useState<Tab>('lessons');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4">
      <Tabs tabs={[{ id: 'lessons', label: 'Lessons' }, { id: 'assessments', label: 'Assessments' }, { id: 'review', label: 'Review queue' }, { id: 'analytics', label: 'Cohort analytics' }]} value={tab} onChange={setTab} />
      {tab === 'lessons' && <LessonBuilder />}
      {tab === 'assessments' && <AssessmentBuilder />}
      {tab === 'review' && <ReviewQueue />}
      {tab === 'analytics' && <CohortAnalytics />}
    </div>
  );
}

function LessonBuilder() {
  const snapshot = useEngineStore((s) => s.snapshot);
  const [title, setTitle] = useState('Brachial plexus — practical demo');
  const [steps, setSteps] = useState<LessonStep[]>([]);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="card flex flex-col gap-2">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Lesson title" />
        <p className="text-xs text-muted">Arrange the atlas in another tab, then capture the current state as a step. Steps store the full ViewState (camera, visibility, clip, explode) and replay on any device.</p>
        <button className="btn-primary" onClick={() => setSteps((s) => [...s, { title: `Step ${s.length + 1}`, capture: { kind: 'atlas', state: snapshot() } }])}>Capture current atlas view as step</button>
        <button className="btn-ghost" onClick={() => setSteps([])}>Clear</button>
      </div>
      <ol className="card flex flex-col gap-1 text-sm">{steps.map((s, i) => <li key={i} className="rounded bg-surface-2 px-2 py-1"><b>{s.title}</b> <span className="text-[11px] text-muted">{JSON.stringify(s.capture).slice(0, 80)}…</span></li>)}{!steps.length && <li className="text-xs text-muted">No steps yet.</li>}</ol>
    </div>
  );
}

function AssessmentBuilder() {
  const [kind, setKind] = useState<'SPOTTER' | 'QUIZ' | 'VIVA' | 'OSPE' | 'OSCE' | 'PRACTICAL'>('SPOTTER');
  const [picked, setPicked] = useState<string[]>([]);
  const pool = ITEM_BANK.filter((i) => (kind === 'SPOTTER' ? i.type === 'spot3d' : i.type !== 'spot3d'));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="card flex flex-col gap-2">
        <div className="flex flex-wrap gap-1">{(['SPOTTER', 'QUIZ', 'VIVA', 'OSPE', 'OSCE', 'PRACTICAL'] as const).map((k) => <button key={k} className={`chip ${kind === k ? 'chip-on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</div>
        <p className="text-xs text-muted">Item bank filtered by mode, system and competency; blueprint coverage warns before publishing. {kind === 'OSCE' || kind === 'OSPE' ? 'Station templates with checklists and room bookings (exclusion constraint prevents double-booking).' : ''}</p>
        <ul className="flex flex-col gap-1 text-sm">{pool.map((i) => <li key={i.id}><label className="flex items-center gap-2 min-h-[36px]"><input type="checkbox" checked={picked.includes(i.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, i.id] : picked.filter((x) => x !== i.id))} /><span>{i.stem}</span><span className="text-[11px] text-muted">{i.structureId}</span></label></li>)}</ul>
      </div>
      <div className="card text-sm">
        <div className="label">Publish</div>
        <p className="mt-1">{picked.length} items · 60 s per station · randomised · cohort: MBBS 2026 Batch A</p>
        <p className="mt-1 text-xs text-muted">Blueprint coverage: {new Set(pool.filter((i) => picked.includes(i.id)).map((i) => i.structureId)).size} structures.</p>
        <button className="btn-primary mt-3" disabled={!picked.length} onClick={() => alert('Persisted via /api/v1/assessments once auth lands (Sprint 3–4).')}>Publish to cohort</button>
      </div>
    </div>
  );
}

function ReviewQueue() {
  const [status, setStatus] = useState<Record<string, RecordStatus>>(Object.fromEntries(SEED_RECORDS.map((r) => [r.structureId, r.status])));
  return (
    <ul className="flex flex-col gap-2">
      {SEED_RECORDS.map((r) => {
        const issues = publishabilityIssues(r.fields);
        const st = status[r.structureId]!;
        return (
          <li key={r.structureId} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
            <div><b>{r.fields.name.value}</b> <span className="text-[11px] text-muted">{r.structureId} · v{r.version} · {st}</span>
              <div className="text-[11px]">{issues.length ? <span className="text-danger">{issues.length} field(s) without citation — cannot approve</span> : <span className="text-success">All non-empty fields cited</span>}</div></div>
            <div className="flex gap-1">{legalStatusTransitions[st].map((to) => <button key={to} className="chip" disabled={!canTransition(st, to) || ((to === 'approved' || to === 'published') && issues.length > 0)} onClick={() => setStatus({ ...status, [r.structureId]: to })}>{to.replace('_', ' ')}</button>)}</div>
          </li>
        );
      })}
    </ul>
  );
}

function CohortAnalytics() {
  // Illustrative item analysis on a synthetic response matrix; real data comes from Response rows.
  const rows = Array.from({ length: 40 }, (_, i) => ({ itemScore: i % 3 === 0 ? 0 : 1, totalScore: 10 + (i % 7) + (i % 3 === 0 ? -3 : 2) }));
  const a = itemAnalysis(rows);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="card text-sm"><div className="label">Item analysis (example)</div><p>Difficulty p = {a.p.toFixed(2)}</p><p>Discrimination = {a.discrimination.toFixed(2)}</p><p className="text-[11px] text-muted">n = {a.n}. Items with p &lt; 0.2 or discrimination &lt; 0.2 are flagged for review.</p></div>
      <div className="card text-sm"><div className="label">Cohort heatmap</div><p className="text-xs text-muted">Region × competency mastery heatmap renders from Mastery rows (Sprint 7).</p></div>
      <div className="card text-sm"><div className="label">At-risk learners</div><p className="text-xs text-muted">Learners with mastery &lt; 0.5 on ≥ 3 blueprint competencies.</p></div>
    </div>
  );
}
