/**
 * Tile sources for the virtual microscope (FR-H1). Real slides use DZI/IIIF pyramids
 * produced by the worker (Phase G §11); the procedural source lets the viewer, tests and
 * demos run without any slide data. Procedural tiles are schematic and labelled as such.
 */
export interface TileSource {
  id: string;
  title: string;
  width: number;   // level-0 pixels
  height: number;
  tileSize: number;
  micronsPerPixel: number;
  levels: number;  // number of pyramid levels; level 0 = full resolution
  isPlaceholder: boolean;
  getTile(level: number, x: number, y: number): Promise<CanvasImageSource>;
}

export interface Annotation { id: string; label: string; polygon: [number, number][]; note?: string; layer: 'faculty' | 'exam' | 'guided'; order?: number }

export function levelsFor(width: number, height: number, tileSize: number): number {
  let n = 1, w = width, h = height;
  while (w > tileSize || h > tileSize) { w /= 2; h /= 2; n++; }
  return n;
}

export function dziSource(opts: { id: string; title: string; base: string; width: number; height: number; tileSize?: number; micronsPerPixel: number; format?: string }): TileSource {
  const tileSize = opts.tileSize ?? 256;
  const levels = levelsFor(opts.width, opts.height, tileSize);
  const maxDzi = levels - 1 + Math.ceil(Math.log2(tileSize));
  return {
    id: opts.id, title: opts.title, width: opts.width, height: opts.height, tileSize, micronsPerPixel: opts.micronsPerPixel, levels, isPlaceholder: false,
    getTile: (level, x, y) => new Promise((resolve, reject) => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img); img.onerror = reject;
      // DZI numbers levels from smallest (0) to largest; ours are 0 = largest.
      img.src = `${opts.base}/${maxDzi - level}/${x}_${y}.${opts.format ?? 'webp'}`;
    }),
  };
}

/** Deterministic PRNG so tiles are stable across renders. */
function mulberry32(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function proceduralSource(kind: 'schematic-epithelium' | 'schematic-nodular', id: string, title: string): TileSource {
  const width = 8192, height = 6144, tileSize = 256;
  const levels = levelsFor(width, height, tileSize);
  return {
    id, title, width, height, tileSize, micronsPerPixel: 0.25, levels, isPlaceholder: true,
    async getTile(level, x, y) {
      const c = document.createElement('canvas'); c.width = tileSize; c.height = tileSize;
      const ctx = c.getContext('2d')!;
      const scale = 2 ** level; // level-0 pixels per tile pixel
      ctx.fillStyle = kind === 'schematic-nodular' ? '#f3d9dc' : '#f7e3ea'; ctx.fillRect(0, 0, tileSize, tileSize);
      // Draw "cells" in a world-space grid so they align across tiles/levels.
      const cellWorld = 48; // level-0 px
      const cellScreen = cellWorld / scale;
      if (cellScreen < 2) { ctx.fillStyle = kind === 'schematic-nodular' ? '#e3b7c4' : '#e8bfd0'; ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, tileSize, tileSize); ctx.globalAlpha = 1; return c; }
      const wx0 = x * tileSize * scale, wy0 = y * tileSize * scale;
      const gx0 = Math.floor(wx0 / cellWorld) - 1, gy0 = Math.floor(wy0 / cellWorld) - 1;
      const n = Math.ceil((tileSize * scale) / cellWorld) + 2;
      for (let gy = gy0; gy < gy0 + n; gy++) for (let gx = gx0; gx < gx0 + n; gx++) {
        const rnd = mulberry32(gx * 73856093 ^ gy * 19349663);
        const cx = (gx * cellWorld + cellWorld * (0.3 + rnd() * 0.4) - wx0) / scale;
        const cy = (gy * cellWorld + cellWorld * (0.3 + rnd() * 0.4) - wy0) / scale;
        const nodule = kind === 'schematic-nodular' && Math.hypot(((gx % 40) + 40) % 40 - 20, ((gy % 40) + 40) % 40 - 20) < 14;
        ctx.beginPath(); ctx.arc(cx, cy, (cellWorld * 0.45) / scale, 0, Math.PI * 2);
        ctx.fillStyle = nodule ? '#f2c6c6' : '#f9e9f0'; ctx.fill(); ctx.strokeStyle = nodule ? '#c97b8c' : '#d9a0b5'; ctx.lineWidth = Math.max(0.5, 1 / scale); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, (cellWorld * 0.16) / scale, 0, Math.PI * 2); ctx.fillStyle = '#5b3a7a'; ctx.fill();
      }
      if (level <= 1) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.font = '10px system-ui'; ctx.fillText('placeholder', 4, 12); }
      return c;
    },
  };
}
