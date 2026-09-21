import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Anatomical plausibility of the shipped pack.
 *
 * Geometry can be valid glTF, load without error, pass every type check and still be wrong
 * anatomy — an organ at the wrong level, a pair mirrored the wrong way, a lung stretched by
 * vessels that belong to the heart. These are the checks a demonstrator would make.
 *
 * Ranges are adult reference dimensions measured as a bounding box, which is wider than a
 * textbook length: the tibia box runs patella to lateral malleolus, the rib cage includes
 * costal cartilage.
 */
const PACK = 'public/assets/hra-v1';
const built = existsSync(`${PACK}/male.manifest.json`);

interface S { id: string; bounds: number[]; centroid: number[]; provenance?: string; systems: string[] }

const SPAN: Record<string, [number, number]> = {
  liver: [0.15, 0.30], spleen: [0.08, 0.16], pancreas: [0.10, 0.25], heart: [0.09, 0.17],
  'kidney-l': [0.09, 0.14], 'kidney-r': [0.09, 0.14], 'small-intestine': [0.15, 0.45],
  'large-intestine': [0.25, 0.60], 'urinary-bladder': [0.04, 0.12], thymus: [0.03, 0.12],
  brain: [0.13, 0.20], pelvis: [0.22, 0.40], 'femur-l': [0.38, 0.52], 'femur-r': [0.38, 0.52],
  'tibia-fibula-l': [0.32, 0.50], 'tibia-fibula-r': [0.32, 0.50], trachea: [0.08, 0.18],
  aorta: [0.30, 0.55], 'inferior-vena-cava': [0.20, 0.45], 'lung-l': [0.18, 0.32],
  'lung-r': [0.18, 0.32], stomach: [0.12, 0.30], skull: [0.17, 0.26], 'rib-cage': [0.24, 0.42],
  'vertebral-column': [0.55, 0.78], 'humerus-l': [0.26, 0.40], 'humerus-r': [0.26, 0.40],
  'radius-ulna-l': [0.22, 0.32], 'radius-ulna-r': [0.22, 0.32],
  'adrenal-gland-l': [0.02, 0.07], 'adrenal-gland-r': [0.02, 0.07],
};

/** Height of the structure's centre as a fraction from soles (0) to vertex (1). */
const LEVEL: Record<string, [number, number]> = {
  brain: [0.90, 1.00], skull: [0.89, 1.00], trachea: [0.78, 0.90], heart: [0.68, 0.80],
  'lung-l': [0.68, 0.84], 'lung-r': [0.68, 0.84], thymus: [0.72, 0.84], liver: [0.60, 0.73],
  spleen: [0.60, 0.72], stomach: [0.60, 0.73], pancreas: [0.58, 0.70],
  'kidney-l': [0.56, 0.70], 'kidney-r': [0.56, 0.70], 'small-intestine': [0.50, 0.66],
  'large-intestine': [0.48, 0.68], 'urinary-bladder': [0.44, 0.54], pelvis: [0.44, 0.58],
  'femur-l': [0.25, 0.48], 'femur-r': [0.25, 0.48], 'tibia-fibula-l': [0.08, 0.30],
  'tibia-fibula-r': [0.08, 0.30], 'rib-cage': [0.63, 0.82], 'humerus-l': [0.60, 0.78],
  'humerus-r': [0.60, 0.78],
};

describe.runIf(built)('anatomical plausibility', () => {
  for (const body of ['male', 'female'] as const) {
    describe(body, () => {
      const m = JSON.parse(readFileSync(`${PACK}/${body}.manifest.json`, 'utf8')) as { structures: S[] };
      const byId = new Map(m.structures.map((s) => [s.id, s]));
      const skin = byId.get('skin')!;
      const [y0, y1] = [skin.bounds[1]!, skin.bounds[4]!];
      const height = y1 - y0;
      const span = (s: S) => Math.max(s.bounds[3]! - s.bounds[0]!, s.bounds[4]! - s.bounds[1]!, s.bounds[5]! - s.bounds[2]!);

      it('is a plausible adult body height', () => {
        expect(height).toBeGreaterThan(1.5);
        expect(height).toBeLessThan(2.0);
      });

      it('every structure is inside the body envelope', () => {
        for (const s of m.structures) {
          if (s.id === 'skin') continue;
          expect(s.bounds[1]!, `${s.id} below the soles`).toBeGreaterThan(y0 - 0.02);
          expect(s.bounds[4]!, `${s.id} above the vertex`).toBeLessThan(y1 + 0.02);
        }
      });

      it('organs measure within adult reference ranges', () => {
        for (const [id, [lo, hi]] of Object.entries(SPAN)) {
          const s = byId.get(id); if (!s) continue;
          const v = span(s);
          expect(v, `${id} spans ${v.toFixed(3)} m`).toBeGreaterThanOrEqual(lo);
          expect(v, `${id} spans ${v.toFixed(3)} m`).toBeLessThanOrEqual(hi);
        }
      });

      it('organs sit at the right level in the body', () => {
        for (const [id, [lo, hi]] of Object.entries(LEVEL)) {
          const s = byId.get(id); if (!s) continue;
          const frac = (s.centroid[1]! - y0) / height;
          expect(frac, `${id} at ${(frac * 100).toFixed(0)}% of height`).toBeGreaterThanOrEqual(lo);
          expect(frac, `${id} at ${(frac * 100).toFixed(0)}% of height`).toBeLessThanOrEqual(hi);
        }
      });

      it('puts the liver on the right and the spleen on the left', () => {
        expect(byId.get('liver')!.centroid[0]!).toBeLessThan(0);
        expect(byId.get('spleen')!.centroid[0]!).toBeGreaterThan(0);
      });

      it('mirrors every paired structure and keeps the pair level', () => {
        for (const s of m.structures) {
          if (!s.id.endsWith('-l')) continue;
          const r = byId.get(`${s.id.slice(0, -2)}-r`); if (!r) continue;
          expect(s.centroid[0]!, `${s.id} should be left of its pair`).toBeGreaterThan(r.centroid[0]!);
          expect(Math.abs(s.centroid[1]! - r.centroid[1]!), `${s.id} pair height`).toBeLessThan(0.05);
        }
      });

      it('keeps the right lung shorter than the left, as the liver requires', () => {
        const rl = byId.get('lung-r'), ll = byId.get('lung-l');
        if (!rl || !ll) return;
        expect(rl.bounds[4]! - rl.bounds[1]!).toBeLessThanOrEqual(ll.bounds[4]! - ll.bounds[1]! + 0.02);
      });

      it('draws most of the body from real anatomical data', () => {
        const real = m.structures.filter((s) => s.provenance === 'hra' || s.provenance === 'bp3d');
        expect(real.length / m.structures.length).toBeGreaterThan(0.7);
      });
    });
  }
});
