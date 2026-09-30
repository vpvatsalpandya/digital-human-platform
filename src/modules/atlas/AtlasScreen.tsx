'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useEngineStore } from '@/store/engine';
import { demoManifest } from '@/engine/demo-manifest';
import { useBodyManifest } from '@/engine/useBodyManifest';
import { StructureSearch } from '@/engine/search';
import { SYSTEM_IDS, SYSTEM_META, isRealAnatomy, type BodyManifest, type ManifestStructure, type SystemId } from '@/engine/types';
import { LAYER_NAMES, PEEL_STEPS } from '@/engine/layers';
import { Slider, Sheet, Tabs } from '@/components/ui';
import { StructureCard } from './StructureCard';
import { focusOn } from '@/engine/Viewer';
import { useAnalytics } from '@/lib/analytics';

const Viewer = dynamic(() => import('@/engine/Viewer').then((m) => m.Viewer), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-muted">Starting engine…</div> });

type Tool = 'view' | 'explode' | 'transparency' | 'clip' | 'compare' | 'views' | 'layers' | 'detail';

export function AtlasScreen({ mode = 'mbbs' }: { mode?: string }) {
  const body = useEngineStore((s) => s.body);
  const setBody = useEngineStore((s) => s.setBody);
  const { manifest, baked, detailLoading } = useBodyManifest(body);
  const search = useMemo(() => new StructureSearch(manifest.structures), [manifest]);
  const byId = useMemo(() => new Map(manifest.structures.map((s) => [s.id, s])), [manifest]);
  const [q, setQ] = useState('');
  const hits = useMemo(() => (q ? search.query(q) : []), [q, search]);
  const schematicCount = useMemo(() => manifest.structures.filter((x) => x.provenance === 'generated' && x.category?.startsWith('schematic')).length, [manifest]);
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
                    <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2 min-h-[44px]" onClick={() => { if (h.structure.group) s.enableGroups([h.structure.group]); s.select(h.structure.id); s.setVisibleSystems([...new Set([...s.visibleSystems, ...h.structure.systems])]); setQ(''); setListView(false); focusOn(h.structure, true); }}>
                      <span>{h.structure.name}</span><span className="text-[11px] text-muted">{h.structure.provenance === 'generated' && h.structure.category?.startsWith('schematic') ? 'Schematic · ' : ''}{h.structure.systems.map((x) => SYSTEM_META[x].name).join(', ')}</span>
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
            ? `${manifest.structures.filter((x) => isRealAnatomy(x.provenance)).length} of ${manifest.structures.length} structures from real anatomy${schematicCount ? ` · ${schematicCount} schematic stand-ins (violet, generated)` : ''}${detailLoading ? ' · loading detail catalogue…' : ''} · ${manifest.licence}`
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
            {(['layers', 'detail', 'explode', 'transparency', 'clip', 'views'] as Tool[]).map((t) => (
              <button key={t} className={`btn-ghost ${tool === t ? '!bg-primary !text-primary-fg' : ''}`} onClick={() => setTool(tool === t ? 'view' : t)} aria-pressed={tool === t}>{t === 'detail' ? 'Detail packs' : t[0]!.toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          {tool === 'layers' && <LayerControls manifest={manifest} />}
          {tool === 'detail' && <DetailControls manifest={manifest} body={body} />}
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

/**
 * Peel-away through the skin-to-bone stack. Each step removes the layer above it; the layers
 * a step needs are switched on automatically, so peeling to muscle loads the muscle group.
 */
function LayerControls({ manifest }: { manifest: BodyManifest }) {
  const peel = useEngineStore((s) => s.peel);
  const setPeel = useEngineStore((s) => s.setPeel);
  const enableGroups = useEngineStore((s) => s.enableGroups);
  const toggleSystem = useEngineStore((s) => s.setVisibleSystems);
  const systems = useEngineStore((s) => s.visibleSystems);
  const counts = useMemo(() => {
    const c = new Array(7).fill(0) as number[];
    for (const st of manifest.structures) if (st.layer !== undefined) c[st.layer]! += 1;
    return c;
  }, [manifest]);
  const go = (depth: number) => {
    setPeel(depth);
    // Layers need their systems visible and their groups loaded to be meaningful.
    const need: SystemId[] = ['integumentary', 'fascial', 'muscular', 'connective', 'skeletal'];
    toggleSystem([...new Set([...systems, ...need])]);
    enableGroups(['skin-layers', 'fascia-bursae', 'muscles', 'skeleton', 'joints'].filter((g) => manifest.groups?.some((x) => x.id === g)));
  };
  const generated = manifest.structures.some((x) => x.provenance === 'generated' && x.category === 'skin layer');
  return (
    <div className="mb-3 flex flex-col gap-2">
      <Slider label="Peel away" value={peel} min={0} max={6} step={1} onChange={go} format={(v) => PEEL_STEPS[v]!} />
      <ol className="flex flex-col gap-1 text-xs">
        {LAYER_NAMES.map((n, i) => (
          <li key={n} className={`flex justify-between rounded px-2 py-1 ${i < peel ? 'bg-surface-2 text-muted line-through' : 'bg-surface-2'}`}>
            <span>{i}. {n}</span><span className="tabular-nums text-muted">{counts[i] ?? 0}</span>
          </li>
        ))}
      </ol>
      {generated && <p className="text-[11px] text-accent">The dermis and hypodermis shells are schematic — no open whole-body dermis or hypodermis mesh exists, so they are drawn as offsets of the real skin surface and labelled as generated. Subcutaneous fat over the abdomen is a real reference-atlas mesh.</p>}
      <p className="text-[11px] text-muted">Muscles, fasciae and the skeleton come from Z-Anatomy fitted to this body{manifest.body === 'female' ? ' (male reference subject, scaled to the female frame)' : ''}.</p>
    </div>
  );
}

/** Detail packs: every named structure, downloaded per group when switched on. */
function DetailControls({ manifest, body }: { manifest: BodyManifest; body: string }) {
  const enabled = useEngineStore((s) => s.groups);
  const toggle = useEngineStore((s) => s.toggleGroup);
  const enable = useEngineStore((s) => s.enableGroups);
  const groups = manifest.groups ?? [];
  if (!groups.length) return <p className="mb-3 text-xs text-muted">The detail catalogue is loading…</p>;
  const shown = groups.filter((g) => g.id !== 'core-upgrades');
  const mb = (n: number) => (n / 1048576).toFixed(1);
  const total = shown.reduce((a, g) => a + g.bytes, 0);
  return (
    <div className="mb-3 flex flex-col gap-1">
      <p className="text-[11px] text-muted">Each pack downloads once and is cached. {shown.filter((g) => g.id !== 'schematic').reduce((a, g) => a + g.count, 0).toLocaleString()} named structures from real anatomy in {shown.filter((g) => g.id !== 'schematic').length} packs, plus {(shown.find((g) => g.id === 'schematic')?.count ?? 0).toLocaleString()} generated schematic stand-ins in their own pack; {mb(total)} MB in all ({body}).</p>
      <button className="btn-ghost text-xs" onClick={() => enable(shown.map((g) => g.id))}>Load everything</button>
      {shown.map((g) => (
        <label key={g.id} className="flex items-start gap-2 rounded bg-surface-2 px-2 py-1 text-xs">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={enabled.includes(g.id) || !!g.auto} disabled={!!g.auto} onChange={() => toggle(g.id)} />
          <span><b className={g.id === 'schematic' ? 'text-[#d2b3ff]' : ''}>{g.title}</b> <span className="text-muted">· {g.count.toLocaleString()} · {mb(g.bytes)} MB</span><br /><span className="text-muted">{g.description}</span></span>
        </label>
      ))}
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
  const groups = SYSTEM_IDS.map((sys) => ({ sys, items: manifest.structures.filter((x) => x.systems[0] === sys) })).filter((g) => g.items.length);
  return (
    <div className="h-full overflow-y-auto p-4 pt-16">
      {groups.map((g) => (
        <details key={g.sys} className="mb-3" open={g.items.length <= 60}>
          <summary className="mb-1 cursor-pointer text-sm font-semibold">{SYSTEM_META[g.sys].name} <span className="font-normal text-muted">({g.items.length})</span></summary>
          <ul className="grid grid-cols-2 gap-1 md:grid-cols-3">
            {g.items.map((x) => (
              <li key={x.id}><button className={`chip w-full justify-start ${s.selected.includes(x.id) ? 'chip-on' : ''}`} onClick={() => { if (x.group) s.enableGroups([x.group]); s.select(x.id); }}>{x.name}</button></li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

export function systemsLabel(ids: SystemId[]) { return ids.map((x) => SYSTEM_META[x].name).join(', '); }
