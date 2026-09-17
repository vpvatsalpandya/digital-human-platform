'use client';
import { useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui';

export interface ComparePair { id: string; title: string; structureId?: string; normalLabel: string; diseaseLabel: string; normalSrc?: string; diseaseSrc?: string; description: string; citation: string }

/** Demo pairs use schematic canvases until partner specimen photographs are ingested. */
export const DEMO_PAIRS: ComparePair[] = [
  { id: 'liver-cirrhosis', title: 'Liver: normal vs cirrhosis', structureId: 'liver', normalLabel: 'Normal liver (schematic)', diseaseLabel: 'Cirrhosis (schematic nodularity)', description: 'Cirrhosis: bridging fibrous septa and regenerative parenchymal nodules replace normal architecture.', citation: 'Robbins & Cotran 10th ed., Ch. 18' },
  { id: 'lung-copd', title: 'Lung: normal vs emphysema (COPD)', structureId: 'lung-r', normalLabel: 'Normal lung (schematic)', diseaseLabel: 'Emphysema (schematic airspace enlargement)', description: 'Emphysema: irreversible enlargement of airspaces distal to terminal bronchioles with destruction of their walls.', citation: 'Robbins & Cotran 10th ed., Ch. 15' },
  { id: 'artery-atherosclerosis', title: 'Artery: normal vs atherosclerosis', structureId: 'aorta', normalLabel: 'Normal artery (schematic)', diseaseLabel: 'Atheromatous plaque (schematic)', description: 'Atherosclerosis: intimal plaques with a lipid core and fibrous cap narrow the lumen.', citation: 'Robbins & Cotran 10th ed., Ch. 11' },
];

export function Comparator({ pair }: { pair: ComparePair }) {
  const [split, setSplit] = useState(0.5);
  const [sideBySide, setSideBySide] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className={`grid gap-2 ${sideBySide ? 'md:grid-cols-2' : ''}`}>
        {sideBySide ? (
          <>
            <Panel label={pair.normalLabel} kind="normal" id={pair.id} />
            <Panel label={pair.diseaseLabel} kind="disease" id={pair.id} />
          </>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden rounded">
            <div className="absolute inset-0"><Panel label={pair.diseaseLabel} kind="disease" id={pair.id} /></div>
            <div className="absolute inset-0" style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}><Panel label={pair.normalLabel} kind="normal" id={pair.id} /></div>
            <div className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${split * 100}%` }} aria-hidden />
          </div>
        )}
      </div>
      {!sideBySide && <Slider label="Swipe" value={split} onChange={setSplit} format={(v) => `${Math.round(v * 100)}% normal`} />}
      <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={sideBySide} onChange={(e) => setSideBySide(e.target.checked)} /> Side by side</label>
      <p className="text-sm">{pair.description} <span className="text-muted">({pair.citation})</span></p>
      <p className="text-[11px] text-muted">Schematic placeholders illustrate the comparator; specimen photographs and 3D lesion meshes are ingested from partner institutions under the content agreement (ADR-002).</p>
    </div>
  );
}

function Panel({ label, kind, id }: { label: string; kind: 'normal' | 'disease'; id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!; const W = (c.width = 400), H = (c.height = 300);
    ctx.fillStyle = '#1a2440'; ctx.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    if (id === 'liver-cirrhosis') {
      ctx.fillStyle = kind === 'normal' ? '#8b3a3a' : '#a0522d'; roundRect(ctx, 40, 60, 320, 180, 60); ctx.fill();
      if (kind === 'disease') for (let i = 0; i < 90; i++) { ctx.beginPath(); ctx.arc(60 + rnd() * 280, 80 + rnd() * 140, 6 + rnd() * 10, 0, Math.PI * 2); ctx.fillStyle = '#c47a4a'; ctx.fill(); ctx.strokeStyle = '#5a2a1a'; ctx.stroke(); }
    } else if (id === 'lung-copd') {
      ctx.fillStyle = '#d98c8c';
      const n = kind === 'normal' ? 400 : 60, r = kind === 'normal' ? 6 : 22;
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(30 + rnd() * 340, 30 + rnd() * 240, r * (0.6 + rnd() * 0.8), 0, Math.PI * 2); ctx.fillStyle = '#e9b6b6'; ctx.fill(); ctx.strokeStyle = '#a05a5a'; ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 110, 0, Math.PI * 2); ctx.fillStyle = '#b84a4a'; ctx.fill();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2); ctx.fillStyle = '#e9c9c9'; ctx.fill();
      if (kind === 'disease') { ctx.beginPath(); ctx.ellipse(W / 2 + 30, H / 2 + 20, 60, 45, 0.5, 0, Math.PI * 2); ctx.fillStyle = '#e6d27a'; ctx.fill(); ctx.strokeStyle = '#9c7a2a'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(W / 2 + (kind === 'disease' ? -20 : 0), H / 2 + (kind === 'disease' ? -15 : 0), kind === 'disease' ? 30 : 60, 0, Math.PI * 2); ctx.fillStyle = '#5a1f1f'; ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.font = '13px system-ui'; ctx.fillText(label, 10, 20);
  }, [label, kind, id]);
  return <canvas ref={ref} className="aspect-[4/3] w-full rounded bg-surface-2" role="img" aria-label={label} />;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
