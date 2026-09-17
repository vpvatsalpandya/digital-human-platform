'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { ManifestStructure } from '@/engine/types';
import { findSeedRecord } from '@/knowledge/seed';
import { SOURCES } from '@/knowledge/sources';
import { resolveField, type AudienceMode, type RecordFieldKey } from '@/knowledge/schema';
import { flattenValue } from '@/modules/tutor/retrieval';
import { Citations, Tabs } from '@/components/ui';
import { useEngineStore } from '@/store/engine';
import { systemsLabel } from './AtlasScreen';

type Tab = 'overview' | 'relations' | 'supply' | 'clinical' | 'histology' | 'embryo' | 'imaging';
const TAB_FIELDS: Record<Tab, RecordFieldKey[]> = {
  overview: ['description', 'function', 'physiology'],
  relations: ['relations'],
  supply: ['bloodSupply', 'venousDrainage', 'lymphaticDrainage', 'innervation'],
  clinical: ['clinicalSignificance', 'surgicalRelevance', 'commonDiseases', 'examinationPearls'],
  histology: ['histology'],
  embryo: ['embryology'],
  imaging: ['radiologicalCorrelation'],
};
const LABEL: Partial<Record<RecordFieldKey, string>> = { description: 'Description', function: 'Function', physiology: 'Physiology', relations: 'Relations', bloodSupply: 'Blood supply', venousDrainage: 'Venous drainage', lymphaticDrainage: 'Lymphatic drainage', innervation: 'Innervation', clinicalSignificance: 'Clinical significance', surgicalRelevance: 'Surgical relevance', commonDiseases: 'Common diseases', examinationPearls: 'Examination pearls', histology: 'Histology', embryology: 'Embryology', radiologicalCorrelation: 'Radiological correlation' };

export function StructureCard({ structure, mode }: { structure: ManifestStructure; mode: string }) {
  const [tab, setTab] = useState<Tab>('overview');
  const rec = findSeedRecord(structure.id);
  const bookmarks = useEngineStore((s) => s.bookmarks);
  const toggleBookmark = useEngineStore((s) => s.toggleBookmark);
  const marked = bookmarks.some((b) => b.structureId === structure.id);
  const m = mode as AudienceMode;
  return (
    <article className="flex flex-col gap-2">
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] text-muted">{systemsLabel(structure.systems)}{structure.fmaId ? ` · ${structure.fmaId}` : ''}</div>
          {structure.latinName && <div className="text-xs italic text-muted">{structure.latinName}</div>}
        </div>
        <button className={`btn-ghost ${marked ? '!bg-accent !text-black' : ''}`} onClick={() => toggleBookmark(structure.id)} aria-pressed={marked} aria-label="Bookmark structure">★</button>
      </header>
      {!rec ? (
        <p className="text-sm text-muted">No knowledge record yet for this structure. Records are authored with citations and reviewed by faculty before publication.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 text-[11px]"><span className={`chip !min-h-0 !py-0.5 ${rec.status === 'published' ? 'chip-on' : ''}`}>{rec.status.replace('_', ' ')}</span><span className="text-muted">v{rec.version} · every field cited</span></div>
          <Tabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'relations', label: 'Relations' }, { id: 'supply', label: 'Supply' }, { id: 'clinical', label: 'Clinical' }, { id: 'histology', label: 'Histology' }, { id: 'embryo', label: 'Embryo' }, { id: 'imaging', label: 'Imaging' }]} value={tab} onChange={setTab} />
          {TAB_FIELDS[tab].map((key) => {
            const v = resolveField(rec.fields, key, m);
            if (v === null) return <p key={key} className="text-xs text-muted">{LABEL[key]} is not shown in {mode} mode.</p>;
            const text = flattenValue(v);
            if (!text) return <p key={key} className="text-xs text-muted">{LABEL[key]}: not yet authored (left empty rather than guessed).</p>;
            return (
              <section key={key}>
                <h4 className="label mb-0.5">{LABEL[key]}</h4>
                <FieldBody value={v} />
                <Citations items={rec.fields[key].citations} sources={SOURCES} />
              </section>
            );
          })}
          <div className="mt-2 flex flex-wrap gap-1">
            <Link className="chip" href={`/radiology?structure=${structure.id}`}>See on CT</Link>
            <Link className="chip" href={`/histology?structure=${structure.id}`}>Slides</Link>
            <Link className="chip" href={`/assess?structure=${structure.id}`}>Quiz me</Link>
            <Link className="chip" href={`/tutor?structure=${structure.id}`}>Ask tutor</Link>
          </div>
        </>
      )}
    </article>
  );
}

function FieldBody({ value }: { value: unknown }) {
  if (typeof value === 'string') return <p className="text-sm leading-relaxed">{value}</p>;
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc pl-4 text-sm leading-relaxed">
        {value.map((v, i) => <li key={i}>{typeof v === 'string' ? v : flattenValue(v)}</li>)}
      </ul>
    );
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => flattenValue(v));
    return (
      <dl className="text-sm leading-relaxed">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2"><dt className="w-24 shrink-0 capitalize text-muted">{k}</dt><dd>{flattenValue(v)}</dd></div>
        ))}
      </dl>
    );
  }
  return null;
}
