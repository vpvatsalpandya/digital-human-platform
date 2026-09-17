'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Annotation, TileSource } from './tiles';
import { pointInPolygon } from '@/modules/assessment/scoring';
import { Tabs } from '@/components/ui';

type Mode = 'guided' | 'self' | 'assessment';

/**
 * Deep-zoom viewer (FR-H1–H3): tile pyramid, pinch/wheel zoom, pan, minimap, scale bar,
 * annotation layers, guided/self-study/assessment modes. Dependency-free; ~OpenSeadragon
 * semantics with normalised (0..1) annotation coordinates.
 */
export function Microscope({ source, annotations }: { source: TileSource; annotations: Annotation[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState({ zoom: 0, cx: 0.5, cy: 0.5 }); // zoom in level-0 px per screen px (log2 scale)
  const [mode, setMode] = useState<Mode>('self');
  const [showLabels, setShowLabels] = useState(true);
  const [step, setStep] = useState(0);
  const [assessTarget, setAssessTarget] = useState<Annotation | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const tileCache = useRef(new Map<string, CanvasImageSource | 'loading'>());
  const guided = useMemo(() => annotations.filter((a) => a.layer === 'guided').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [annotations]);

  // Fit on mount
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const scale = Math.max(source.width / c.clientWidth, source.height / c.clientHeight);
    setView({ zoom: Math.log2(scale), cx: 0.5, cy: 0.5 });
  }, [source]);

  // Render loop (on state change)
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext('2d')!; ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H);
    const scale = 2 ** view.zoom; // level-0 px per screen px
    const level = Math.min(source.levels - 1, Math.max(0, Math.floor(view.zoom + 0.3)));
    const lvScale = 2 ** level; // level-0 px per level px
    const screenPerLevelPx = lvScale / scale;
    const originX = view.cx * source.width - (W / 2) * scale; // level-0 px at screen (0,0)
    const originY = view.cy * source.height - (H / 2) * scale;
    const tilePxScreen = source.tileSize * screenPerLevelPx;
    const tx0 = Math.max(0, Math.floor(originX / lvScale / source.tileSize)), ty0 = Math.max(0, Math.floor(originY / lvScale / source.tileSize));
    const tx1 = Math.min(Math.ceil(source.width / lvScale / source.tileSize) - 1, Math.floor((originX + W * scale) / lvScale / source.tileSize));
    const ty1 = Math.min(Math.ceil(source.height / lvScale / source.tileSize) - 1, Math.floor((originY + H * scale) / lvScale / source.tileSize));
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const key = `${level}/${tx}/${ty}`;
      const cached = tileCache.current.get(key);
      const sx = (tx * source.tileSize * lvScale - originX) / scale, sy = (ty * source.tileSize * lvScale - originY) / scale;
      if (cached && cached !== 'loading') ctx.drawImage(cached, sx, sy, tilePxScreen + 0.5, tilePxScreen + 0.5);
      else {
        if (!cached) { tileCache.current.set(key, 'loading'); source.getTile(level, tx, ty).then((img) => { tileCache.current.set(key, img); setView((v) => ({ ...v })); }).catch(() => tileCache.current.delete(key)); }
      }
    }
    // annotations
    const toScreen = ([nx, ny]: [number, number]): [number, number] => [(nx * source.width - originX) / scale, (ny * source.height - originY) / scale];
    for (const a of annotations) {
      if (mode === 'assessment' && a.layer !== 'exam') continue;
      if (mode === 'assessment') continue; // never reveal exam polygons
      if (mode === 'guided' && a.layer === 'guided' && guided[step]?.id !== a.id) continue;
      if (!showLabels && mode === 'self') continue;
      ctx.beginPath(); a.polygon.forEach((p, i) => { const [x, y] = toScreen(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath();
      ctx.strokeStyle = a.layer === 'guided' ? '#f59e0b' : '#22d3ee'; ctx.lineWidth = 2; ctx.stroke();
      const [lx, ly] = toScreen(a.polygon[0]!); ctx.fillStyle = '#0b1020cc'; ctx.fillRect(lx, ly - 16, ctx.measureText(a.label).width + 8, 16); ctx.fillStyle = '#fff'; ctx.font = '12px system-ui'; ctx.fillText(a.label, lx + 4, ly - 4);
    }
    // scale bar
    const microns = [10, 20, 50, 100, 200, 500, 1000, 2000].find((m) => m / (source.micronsPerPixel * scale) > 60) ?? 2000;
    const barPx = microns / (source.micronsPerPixel * scale);
    ctx.fillStyle = '#fff'; ctx.fillRect(12, H - 20, barPx, 3); ctx.font = '11px system-ui'; ctx.fillText(microns >= 1000 ? `${microns / 1000} mm` : `${microns} µm`, 12, H - 26);
    // minimap
    const mmW = 96, mmH = (mmW * source.height) / source.width;
    ctx.fillStyle = '#ffffff22'; ctx.fillRect(W - mmW - 8, 8, mmW, mmH);
    ctx.strokeStyle = '#f59e0b'; ctx.strokeRect(W - mmW - 8 + (originX / source.width) * mmW, 8 + (originY / source.height) * mmH, (W * scale / source.width) * mmW, (H * scale / source.height) * mmH);
    if (source.isPlaceholder) { ctx.fillStyle = '#fbbf24'; ctx.fillText('Schematic placeholder slide — partner WSI pending', 12, 16); }
  }, [view, source, annotations, mode, showLabels, step, guided]);

  // Guided step: fly to annotation
  useEffect(() => {
    if (mode !== 'guided') return;
    const a = guided[step]; if (!a) return;
    const cx = a.polygon.reduce((s, p) => s + p[0], 0) / a.polygon.length, cy = a.polygon.reduce((s, p) => s + p[1], 0) / a.polygon.length;
    setView((v) => ({ zoom: Math.min(v.zoom, 2), cx, cy }));
  }, [mode, step, guided]);

  // Gestures
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; pinch?: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }; };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || e.buttons === 0) return;
    const scale = 2 ** view.zoom;
    setView((v) => ({ ...v, cx: drag.current!.cx - ((e.clientX - drag.current!.x) * scale) / source.width, cy: drag.current!.cy - ((e.clientY - drag.current!.y) * scale) / source.height }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const moved = drag.current ? Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) : 0;
    drag.current = null;
    if (moved < 4 && mode === 'assessment' && assessTarget) {
      const c = canvasRef.current!; const r = c.getBoundingClientRect();
      const scale = 2 ** view.zoom; const W = c.clientWidth, H = c.clientHeight;
      const nx = (view.cx * source.width - (W / 2) * scale + (e.clientX - r.left) * scale) / source.width;
      const ny = (view.cy * source.height - (H / 2) * scale + (e.clientY - r.top) * scale) / source.height;
      const ok = pointInPolygon([nx, ny], assessTarget.polygon);
      setFeedback(ok ? `Correct — that is the ${assessTarget.label}.` : `Not quite. Try again or reveal.`);
    }
  };
  const onWheel = (e: React.WheelEvent) => { setView((v) => ({ ...v, zoom: Math.min(source.levels + 1, Math.max(-2, v.zoom + e.deltaY * 0.002)) })); };
  const zoomTo = (mag: number) => setView((v) => ({ ...v, zoom: Math.log2(10 / mag) })); // 10x ≈ 1 level-0 px per screen px (schematic mapping)

  const examTargets = annotations.filter((a) => a.layer === 'exam');
  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col md:flex-row">
      <div className="relative h-[52dvh] shrink-0 touch-none md:h-full md:flex-1">
        <canvas ref={canvasRef} className="h-full w-full" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onWheel={onWheel} role="img" aria-label={source.title} />
        <div className="absolute left-2 top-6 flex gap-1">
          {[4, 10, 40].map((m) => <button key={m} className="chip" onClick={() => zoomTo(m)}>{m}×</button>)}
          <button className="chip" onClick={() => setView((v) => ({ ...v, zoom: v.zoom - 0.5 }))} aria-label="Zoom in">＋</button>
          <button className="chip" onClick={() => setView((v) => ({ ...v, zoom: v.zoom + 0.5 }))} aria-label="Zoom out">－</button>
        </div>
      </div>
      <aside className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-t border-border p-3 md:w-[340px] md:flex-none md:border-l md:border-t-0">
        <h2 className="text-sm font-semibold">{source.title}</h2>
        <Tabs tabs={[{ id: 'guided', label: 'Guided' }, { id: 'self', label: 'Self-study' }, { id: 'assessment', label: 'Assessment' }]} value={mode} onChange={(m) => { setMode(m); setFeedback(null); setAssessTarget(m === 'assessment' ? examTargets[0] ?? null : null); }} />
        {mode === 'guided' && (
          <div className="card flex flex-col gap-2 text-sm">
            <div className="text-xs text-muted">Step {step + 1} of {guided.length}</div>
            <b>{guided[step]?.label}</b><p className="text-xs">{guided[step]?.note}</p>
            <div className="flex gap-2"><button className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button><button className="btn-primary" disabled={step >= guided.length - 1} onClick={() => setStep((s) => s + 1)}>Next</button></div>
          </div>
        )}
        {mode === 'self' && <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Show labels</label>}
        {mode === 'assessment' && (
          <div className="card flex flex-col gap-2 text-sm">
            {assessTarget ? <><p>Tap the <b>{assessTarget.label}</b> on the slide.</p>{feedback && <p className="text-xs">{feedback}</p>}<div className="flex gap-2">{examTargets.map((t) => <button key={t.id} className={`chip ${t.id === assessTarget.id ? 'chip-on' : ''}`} onClick={() => { setAssessTarget(t); setFeedback(null); }}>{t.label}</button>)}</div></> : <p className="text-xs text-muted">No exam annotations on this slide.</p>}
          </div>
        )}
        <p className="text-[11px] text-muted">Pinch or scroll to zoom, drag to pan. Scale bar bottom-left; minimap top-right.</p>
      </aside>
    </div>
  );
}
