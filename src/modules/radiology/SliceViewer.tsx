'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { demoManifest } from '@/engine/demo-manifest';
import { SYSTEM_META } from '@/engine/types';
import { useEngineStore } from '@/store/engine';
import { extractSlice, rasterise, sliceCount, sliceForStructure, type Plane } from './volume';
import { Slider, Tabs } from '@/components/ui';

/** Slice viewer synchronised with the atlas (FR-R1, FR-R2). */
export function SliceViewer({ initialStructure }: { initialStructure?: string }) {
  const body = useEngineStore((s) => s.body);
  const manifest = useMemo(() => demoManifest(body), [body]);
  const volume = useMemo(() => rasterise(manifest, 0.01), [manifest]);
  const [plane, setPlane] = useState<Plane>('axial');
  const [index, setIndex] = useState(Math.floor(sliceCount(volume, 'axial') * 0.6));
  const [showMasks, setShowMasks] = useState(true);
  const [ww, setWw] = useState(255), [wl, setWl] = useState(128);
  const [identify, setIdentify] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const select = useEngineStore((s) => s.select);
  const selected = useEngineStore((s) => s.selected);

  // 3D → slice: jump to the selected/initial structure
  useEffect(() => {
    const id = initialStructure ?? selected[selected.length - 1];
    const s = volume.structures.find((x) => x.id === id);
    if (s) setIndex(sliceForStructure(volume, plane, s));
  }, [initialStructure, selected, plane, volume]);

  const slice = useMemo(() => extractSlice(volume, plane, index), [volume, plane, index]);
  const colour = useMemo(() => volume.structures.map((s) => hex(SYSTEM_META[s.systems[0]!].color)), [volume]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = slice.w; c.height = slice.h;
    const ctx = c.getContext('2d')!; const img = ctx.createImageData(slice.w, slice.h);
    const lo = wl - ww / 2, hi = wl + ww / 2;
    for (let i = 0; i < slice.w * slice.h; i++) {
      const v = Math.max(0, Math.min(255, ((slice.intensity[i]! - lo) / (hi - lo || 1)) * 255));
      let r = v, g = v, b = v;
      const lab = slice.label[i]!;
      if (lab && (showMasks || (identify && picked === volume.structures[lab - 1]!.id))) {
        const [cr, cg, cb] = colour[lab - 1]!; const a = selected.includes(volume.structures[lab - 1]!.id) ? 0.75 : 0.35;
        r = r * (1 - a) + cr * a; g = g * (1 - a) + cg * a; b = b * (1 - a) + cb * a;
      }
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [slice, showMasks, ww, wl, colour, selected, identify, picked, volume]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * slice.w), y = Math.floor(((e.clientY - r.top) / r.height) * slice.h);
    const lab = slice.label[x + slice.w * y] ?? 0;
    const s = lab ? volume.structures[lab - 1] : undefined;
    if (identify) { setGuess(s?.id ?? null); return; }
    if (s) select(s.id);
  };
  const current = selected.length ? volume.structures.find((s) => s.id === selected[selected.length - 1]) : undefined;
  const onSlice = new Set(Array.from(slice.label).filter(Boolean));
  const structuresHere = volume.structures.filter((_, i) => onSlice.has(i + 1));

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col md:flex-row">
      <div className="relative flex h-[50dvh] shrink-0 items-center justify-center bg-black p-2 md:h-full md:flex-1">
        <canvas ref={canvasRef} onClick={onClick} className="h-full w-full cursor-crosshair object-contain" style={{ imageRendering: 'pixelated' }} role="img" aria-label={`${plane} slice ${index}`} />
        <div className="absolute left-3 top-3 text-[11px] text-amber-300">Synthetic phantom (rasterised demo body). Real cases: TotalSegmentator / Visible Human / partner CT.</div>
        <div className="absolute bottom-3 left-3 text-[11px] text-white/70">{plane === 'axial' ? 'Anterior at top · patient right on image left' : plane === 'coronal' ? 'Superior at top · patient right on image left' : 'Superior at top · anterior on image right'}</div>
      </div>
      <aside className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-t border-border p-3 md:w-[340px] md:flex-none md:border-l md:border-t-0">
        <Tabs tabs={[{ id: 'axial', label: 'Axial' }, { id: 'coronal', label: 'Coronal' }, { id: 'sagittal', label: 'Sagittal' }]} value={plane} onChange={(p) => { setPlane(p); setIndex(Math.floor(sliceCount(volume, p) / 2)); }} />
        <Slider label="Slice" min={0} max={sliceCount(volume, plane) - 1} step={1} value={index} onChange={(v) => setIndex(Math.round(v))} format={(v) => `${v + 1} / ${sliceCount(volume, plane)}`} />
        <div className="grid grid-cols-2 gap-2"><Slider label="Window width" min={20} max={400} step={1} value={ww} onChange={setWw} format={(v) => `${v}`} /><Slider label="Window level" min={0} max={255} step={1} value={wl} onChange={setWl} format={(v) => `${v}`} /></div>
        <div className="flex gap-1">{[['Bone', 120, 200], ['Soft tissue', 160, 110], ['Lung', 200, 60]].map(([n, w, l]) => <button key={n} className="chip" onClick={() => { setWw(w as number); setWl(l as number); }}>{n}</button>)}</div>
        <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={showMasks} onChange={(e) => setShowMasks(e.target.checked)} /> Landmark labels (masks)</label>
        <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={identify} onChange={(e) => { setIdentify(e.target.checked); setShowMasks(!e.target.checked); setPicked(structuresHere[0]?.id ?? null); setGuess(null); }} /> Identify mode (assessment)</label>
        {identify && picked && (
          <div className="card text-sm">Tap the <b>{volume.structures.find((s) => s.id === picked)?.name}</b>.{guess !== null && <p className="text-xs">{guess === picked ? 'Correct.' : `That was ${volume.structures.find((s) => s.id === guess)?.name ?? 'background'}.`}</p>}
            <div className="mt-2 flex flex-wrap gap-1">{structuresHere.slice(0, 8).map((s) => <button key={s.id} className={`chip ${picked === s.id ? 'chip-on' : ''}`} onClick={() => { setPicked(s.id); setGuess(null); }}>{s.name}</button>)}</div></div>
        )}
        {!identify && (
          <div className="card text-sm">
            <div className="label">On this slice</div>
            <div className="mt-1 flex flex-wrap gap-1">{structuresHere.map((s) => <button key={s.id} className={`chip ${selected.includes(s.id) ? 'chip-on' : ''}`} onClick={() => select(s.id)}>{s.name}</button>)}</div>
            {current && <Link href={`/atlas?structure=${current.id}`} className="btn-primary mt-3 w-full">Show {current.name} in 3D</Link>}
          </div>
        )}
      </aside>
    </div>
  );
}

function hex(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
