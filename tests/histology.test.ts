import { describe, expect, it } from 'vitest';
import { DEMO_ANNOTATIONS, DEMO_SLIDES } from '@/modules/histology/demo-slides';
import { levelsFor } from '@/modules/histology/tiles';
import { pointInPolygon } from '@/modules/assessment/scoring';

describe('histology slides', () => {
  it('every slide has an exam annotation to assess against', () => {
    for (const s of DEMO_SLIDES) {
      const anns = DEMO_ANNOTATIONS[s.id] ?? [];
      expect(anns.some((a) => a.layer === 'exam'), s.id).toBe(true);
    }
  });

  it('exam regions are answerable: their own centroid is inside the polygon', () => {
    for (const [id, anns] of Object.entries(DEMO_ANNOTATIONS)) {
      for (const a of anns.filter((x) => x.layer === 'exam')) {
        const cx = a.polygon.reduce((t, p) => t + p[0], 0) / a.polygon.length;
        const cy = a.polygon.reduce((t, p) => t + p[1], 0) / a.polygon.length;
        expect(pointInPolygon([cx, cy], a.polygon), `${id}/${a.id}`).toBe(true);
      }
    }
  });

  it('annotation coordinates are normalised to the slide', () => {
    for (const anns of Object.values(DEMO_ANNOTATIONS))
      for (const a of anns)
        for (const [x, y] of a.polygon) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(1); }
  });

  it('guided steps are ordered', () => {
    for (const anns of Object.values(DEMO_ANNOTATIONS)) {
      const guided = anns.filter((a) => a.layer === 'guided');
      const orders = guided.map((a) => a.order ?? 0);
      expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    }
  });

  it('builds a pyramid deep enough to fit the slide in one tile', () => {
    expect(levelsFor(8192, 6144, 256)).toBe(6);
    expect(levelsFor(256, 256, 256)).toBe(1);
  });
});
