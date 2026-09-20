'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useEngineStore } from '@/store/engine';
import { demoManifest } from '@/engine/demo-manifest';
import { useBodyManifest } from '@/engine/useBodyManifest';
import { StructureSearch } from '@/engine/search';
import { SYSTEM_IDS, SYSTEM_META, type ManifestStructure, type SystemId } from '@/engine/types';
import { Slider, Sheet, Tabs } from '@/components/ui';
import { StructureCard } from './StructureCard';
import { focusOn } from '@/engine/Viewer';
import { useAnalytics } from '@/lib/analytics';

const Viewer = dynamic(() => import('@/engine/Viewer').then((m) => m.Viewer), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-muted">Starting engine…</div> });

type Tool = 'view' | 'explode' | 'transparency' | 'clip' | 'compare' | 'views';

export function AtlasScreen({ mode = 'mbbs' }: { mode?: string }) {
  const body = useEngineStore((s) => s.body);
  const setBody = useEngineStore((s) => s.setBody);
  const { manifest, baked } = useBodyManifest(body);
  const search = useMemo(() => new StructureSearch(manifest.structures), [manifest]);
  const byId = useMemo(() => new Map(manifest.structures.map((s) => [s.id, s])), [manifest]);
  const [q, setQ] = useState('');
  const hits = useMemo(() => (q ? search.query(q) : []), [q, search]);
  const [tool, setTool] = useState<Tool>('view');
  const [listView, setListView] = useState(false);

  const s = useEngineStore();
  const selectedId = s.selected[s.selected.length - 1] ?? null;
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const track = useAnalytics((a) => a.track);
  useEffect(() => { if (selected) track('structure.view', { structureId: selected.id, system: selected.systems[0], seconds: 5 }); }, [selected, track]);

  const related = (st: ManifestStructure) => manifest.structures.filter((x) => x.region && x.region === st.region && x.id !== st.id).map((x) => x.id);

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col md:flex-row">
      <div className="relative h-[55dvh] shrink-0 md:h-full md:flex-1">
        {/* top bar */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 p-2">
          <div className="flex overflow-hidden rounded border border-border bg-surface">
            <button className={`btn !min-h-[40px] ${body === 'male' ? 'bg-primary text-primary-fg' : ''}`} onClick={() => setBody('male')} aria-pressed={body === 'male'}>♂</button>
            <button className={`btn !min-h-[40px] ${body === 'female' ? 'bg-primary text-primary-fg' : ''}`} onClick={() => setBody('female')} aria-pressed={body === 'female'}>♀</button>
          </div>
          <div className="relative flex-1">
            <input className="input" placeholder="Search structures (name, Latin, FMA)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search structures" />
            {hits.length > 0 && (
              <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded border border-border bg-surface shadow-xl" role="listbox">
                {hits.map((h) => (
                  <li key={h.structure.id}>
                    <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2 min-h-[44px]" onClick={() => { s.select(h.structure.id); s.setVisibleSystems([...new Set([...s.visibleSystems, ...h.structure.systems])]); setQ(''); setListView(false); focusOn(h.structure, true); }}>
                      <span>{h.structure.name}</span><span className="text-[11px] text-muted">{h.structure.systems.map((x) => SYSTEM_META[x].name).join(', ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="btn-ghost !min-h-[40px]" onClick={() => setListView((v) => !v)} aria-pressed={listView} title="Accessible structure list">☰</button>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 px-3 text-[11px] text-accent">
          {baked
            ? `${manifest.structures.filter((x) => x.provenance === 'hra').length} structures from real anatomy · ${manifest.licence}`
            : 'Procedural stand-ins — no anatomical mesh data'}
        </div>

        {listView ? <StructureList manifest={manifest} /> : <Viewer manifest={manifest} className="h-full w-full" />}

        {/* system chips */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto p-2">
          <button
            className={`chip ${s.showStandIns ? 'chip-on' : ''}`}
            onClick={() => s.setShowStandIns(!s.showStandIns)}
            aria-pressed={s.showStandIns}
            title="Structures with no openly licensed mesh yet are drawn as generated shapes"
          >
            Stand-ins
          </button>
          {SYSTEM_IDS.map((id) => (
            <button key={id} className={`chip ${s.visibleSystems.includes(id) ? 'chip-on' : ''}`} onClick={() => s.toggleSystem(id)} aria-pressed={s.visibleSystems.includes(id)}>
              <span className="h-2 w-2 rounded-full" style={{ background: SYSTEM_META[id].color }} aria-hidden />{SYSTEM_META[id].name}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border md:w-[380px] md:flex-none md:border-l md:border-t-0">
        <Sheet title={selected ? selected.name : 'Tools'} right={<button className="btn-ghost !min-h-[36px] text-xs" onClick={() => s.resetVisibility()}>Reset</button>}>
          {/* tool tray */}
          <div className="mb-3 flex flex-wrap gap-1">
            <button className="btn-ghost" disabled={!selected} onClick={() => s.isolateSelected()} title="Isolate">Isolate</button>
            <button className="btn-ghost" disabled={!selected} onClick={() => selected && s.isolateSelected(related(selected))} title="Isolate with region">+Region</button>
            <button className="btn-ghost" disabled={!selected} onClick={() => s.hideSelected()}>Hide</button>
            <button className="btn-ghost" disabled={!selected} onClick={() => s.fadeSelected()}>Fade</button>
            {(['explode', 'transparency', 'clip', 'views'] as Tool[]).map((t) => (
              <button key={t} className={`btn-ghost ${tool === t ? '!bg-primary !text-primary-fg' : ''}`} onClick={() => setTool(tool === t ? 'view' : t)} aria-pressed={tool === t}>{t[0]!.toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          {tool === 'explode' && <Slider label="Explode" value={s.explode} onChange={s.setExplode} />}
          {tool === 'transparency' && <Slider label="Transparency" value={s.transparency} onChange={s.setTransparency} />}
          {tool === 'clip' && <ClipControls />}
          {tool === 'views' && <ViewsPanel />}
          {s.hidden.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1 text-xs">Hidden: {s.hidden.map((id) => <button key={id} className="chip" onClick={() => s.unhide(id)}>{byId.get(id)?.name ?? id} ✕</button>)}</div>
          )}
          {selected ? <StructureCard structure={selected} mode={mode} /> : <p className="text-sm text-muted">Tap a structure. Long-press or Shift-click to multi-select. Double-tap to focus.</p>}
        </Sheet>
      </div>
    </div>
  );
}

function ClipControls() {
  const clip = useEngineStore((s) => s.clip);
  const setClip = useEngineStore((s) => s.setClip);
  const planes = { axial: [0, -1, 0], coronal: [0, 0, -1], sagittal: [-1, 0, 0] } as const;
  const current: keyof typeof planes = clip?.plane && clip.plane !== 'free' ? clip.plane : 'axial';
  const constant = clip?.constant ?? 0;
  return (
    <div className="mb-3 flex flex-col gap-2">
      <Tabs tabs={[{ id: 'axial', label: 'Axial' }, { id: 'coronal', label: 'Coronal' }, { id: 'sagittal', label: 'Sagittal' }]} value={current} onChange={(p) => setClip({ plane: p, normal: [...planes[p]] as [number, number, number], constant, enabled: true })} />
      <Slider label="Plane position" min={-1} max={1} value={constant} onChange={(c) => setClip({ plane: current, normal: [...planes[current]] as [number, number, number], constant: c, enabled: true })} />
      <button className="btn-ghost" onClick={() => setClip(null)}>Remove clip</button>
    </div>
  );
}

function ViewsPanel() {
  const views = useEngineStore((s) => s.savedViews);
  const save = useEngineStore((s) => s.saveView);
  const load = useEngineStore((s) => s.loadView);
  const del = useEngineStore((s) => s.deleteView);
  const [name, setName] = useState('');
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex gap-2"><input className="input" placeholder="View name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-primary" onClick={() => { if (name) { save(name); setName(''); } }}>Save</button></div>
      <ul className="flex flex-col gap-1">
        {views.map((v) => (
          <li key={v.id} className="flex items-center justify-between rounded bg-surface-2 px-2 py-1 text-sm">
            <button className="min-h-[36px] text-left" onClick={() => load(v.id)}>{v.name}<span className="ml-2 text-[11px] text-muted">{new Date(v.createdAt).toLocaleDateString()}</span></button>
            <button className="text-xs text-muted" onClick={() => del(v.id)} aria-label={`Delete view ${v.name}`}>✕</button>
          </li>
        ))}
        {views.length === 0 && <li className="text-xs text-muted">No saved views yet.</li>}
      </ul>
    </div>
  );
}

/** Text alternative to the canvas (Phase F §3 accessibility). */
function StructureList({ manifest }: { manifest: ReturnType<typeof demoManifest> }) {
  const s = useEngineStore();
  const groups = SYSTEM_IDS.map((sys) => ({ sys, items: manifest.structures.filter((x) => x.systems.includes(sys)) })).filter((g) => g.items.length);
  return (
    <div className="h-full overflow-y-auto p-4 pt-16">
      {groups.map((g) => (
        <section key={g.sys} className="mb-4">
          <h3 className="mb-1 text-sm font-semibold">{SYSTEM_META[g.sys].name}</h3>
          <ul className="grid grid-cols-2 gap-1 md:grid-cols-3">
            {g.items.map((x) => (
              <li key={x.id}><button className={`chip w-full justify-start ${s.selected.includes(x.id) ? 'chip-on' : ''}`} onClick={() => s.select(x.id)}>{x.name}</button></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function systemsLabel(ids: SystemId[]) { return ids.map((x) => SYSTEM_META[x].name).join(', '); }
