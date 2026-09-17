'use client';
import { useEffect, useRef } from 'react';

export interface Series { name: string; color: string; points: [number, number][] }

/** Small dependency-free canvas line chart (DPR-aware) used by the simulations. */
export function LineChart({ series, xLabel, yLabel, height = 180, xRange, yRange, marker }: { series: Series[]; xLabel: string; yLabel: string; height?: number; xRange?: [number, number]; yRange?: [number, number]; marker?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = height;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const all = series.flatMap((s) => s.points);
    if (!all.length) return;
    const [x0, x1] = xRange ?? [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
    const [y0, y1] = yRange ?? [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
    const pad = { l: 42, r: 8, t: 8, b: 24 };
    const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (w - pad.l - pad.r);
    const sy = (y: number) => h - pad.b - ((y - y0) / (y1 - y0 || 1)) * (h - pad.t - pad.b);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = y0 + ((y1 - y0) * i) / 4; ctx.beginPath(); ctx.moveTo(pad.l, sy(y)); ctx.lineTo(w - pad.r, sy(y)); ctx.stroke(); ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui'; ctx.fillText(y.toFixed(0), 4, sy(y) + 3); }
    ctx.fillText(xLabel, w - pad.r - ctx.measureText(xLabel).width, h - 6); ctx.fillText(yLabel, pad.l, 10);
    for (const s of series) {
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.8; ctx.beginPath();
      s.points.forEach((p, i) => (i ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1]))));
      ctx.stroke();
    }
    if (marker !== undefined) { ctx.strokeStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(sx(marker), pad.t); ctx.lineTo(sx(marker), h - pad.b); ctx.stroke(); }
    let lx = pad.l + 4;
    for (const s of series) { ctx.fillStyle = s.color; ctx.fillRect(lx, h - pad.b + 8, 10, 3); ctx.fillStyle = '#94a3b8'; ctx.fillText(s.name, lx + 13, h - pad.b + 12); lx += 20 + ctx.measureText(s.name).width; }
  }, [series, xLabel, yLabel, height, xRange, yRange, marker]);
  return <canvas ref={ref} style={{ width: '100%', height }} className="rounded bg-surface-2" role="img" aria-label={`${yLabel} versus ${xLabel}`} />;
}
