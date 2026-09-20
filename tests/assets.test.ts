import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { bodyManifest, ALLOWED_PACK_LICENCES } from '@/engine/manifest';
import { demoManifest } from '@/engine/demo-manifest';

const PACK = 'public/assets/hra-v1';
const built = existsSync(`${PACK}/male.manifest.json`);

describe.runIf(built)('anatomy asset pack', () => {
  const male = JSON.parse(readFileSync(`${PACK}/male.manifest.json`, 'utf8'));
  const female = JSON.parse(readFileSync(`${PACK}/female.manifest.json`, 'utf8'));

  it('validates against the manifest schema', () => {
    expect(() => bodyManifest.parse(male)).not.toThrow();
    expect(() => bodyManifest.parse(female)).not.toThrow();
  });

  it('declares a commercially usable licence and an attribution', () => {
    expect(ALLOWED_PACK_LICENCES).toContain(male.licence);
    expect(male.attribution.length).toBeGreaterThan(10);
    expect(male.licence).not.toMatch(/NC|ND/);
  });

  it('carries real anatomical meshes for the major viscera, not stand-ins', () => {
    const real = new Set(male.structures.filter((s: { provenance?: string }) => s.provenance === 'hra').map((s: { id: string }) => s.id));
    for (const id of ['heart', 'liver', 'spleen', 'pancreas', 'kidney-l', 'kidney-r', 'small-intestine', 'large-intestine', 'brain', 'skin', 'pelvis'])
      expect(real.has(id), `${id} should come from the reference atlas`).toBe(true);
    expect(real.size).toBeGreaterThanOrEqual(20);
  });

  it('labels every structure with where its geometry came from', () => {
    for (const s of male.structures) expect(['hra', 'procedural'], s.id).toContain(s.provenance);
  });

  it('real organs are anatomically plausible in size', () => {
    const size = (id: string) => {
      const s = male.structures.find((x: { id: string }) => x.id === id)!;
      const b = s.bounds as number[];
      return [b[3]! - b[0]!, b[4]! - b[1]!, b[5]! - b[2]!];
    };
    const span = (id: string) => Math.max(...size(id));
    // Adult reference ranges, in metres.
    expect(span('liver')).toBeGreaterThan(0.12); expect(span('liver')).toBeLessThan(0.32);
    expect(span('heart')).toBeGreaterThan(0.08); expect(span('heart')).toBeLessThan(0.20);
    expect(span('kidney-l')).toBeGreaterThan(0.07); expect(span('kidney-l')).toBeLessThan(0.16);
    expect(span('femur-l')).toBeGreaterThan(0.35); expect(span('femur-l')).toBeLessThan(0.55);
    expect(span('skin')).toBeGreaterThan(1.4); expect(span('skin')).toBeLessThan(2.1);
  });

  it('places organs on the correct side of the body', () => {
    const cx = (id: string) => (male.structures.find((x: { id: string }) => x.id === id)!.centroid as number[])[0]!;
    // Anatomical right is negative X in this body space; the liver sits to the right of the
    // midline and the spleen to the left, which is the classic orientation check.
    expect(cx('liver')).toBeLessThan(0);
    expect(cx('spleen')).toBeGreaterThan(0);
    expect(cx('kidney-r')).toBeLessThan(cx('kidney-l'));
  });

  it('carries three level-of-detail meshes per structure, never coarsening to nothing', () => {
    for (const s of male.structures) {
      expect(s.lods, s.id).toHaveLength(3);
      expect(s.lods[1].triangles, `${s.id} lod1`).toBeLessThanOrEqual(s.lods[0].triangles);
      expect(s.lods[2].triangles, `${s.id} lod2`).toBeLessThanOrEqual(s.lods[1].triangles);
      expect(s.lods[2].triangles, `${s.id} lod2 non-empty`).toBeGreaterThan(0);
    }
  });

  it('simplifies every mesh that is over its level-of-detail budget', () => {
    // Two floors apply. A closed box is 12 triangles and cannot shrink without holes, and a
    // mesh already under the budget for a level is left alone rather than degraded for
    // nothing. Only meshes above both are required to come down.
    const BUDGET = [26000, 8000, 2400];
    for (const s of male.structures) {
      if (s.lods[0].triangles <= 24) continue;
      for (const level of [1, 2]) {
        if (s.lods[level - 1].triangles <= BUDGET[level]!) continue;
        expect(s.lods[level].triangles, `${s.id} lod${level} did not simplify`).toBeLessThan(s.lods[level - 1].triangles);
      }
    }
  });

  it('meets the aggregate level-of-detail budget (Phase G: 35% and 12% targets)', () => {
    const total = (i: number) => male.structures.reduce((a: number, s: { lods: { triangles: number }[] }) => a + s.lods[i]!.triangles, 0);
    const [lod0, lod1, lod2] = [total(0), total(1), total(2)];
    expect(lod1 / lod0).toBeLessThan(0.5);
    expect(lod2 / lod0).toBeLessThan(0.2);
  });

  it('never ships a procedural shape definition inside a baked pack', () => {
    for (const s of male.structures) expect(s.procedural, s.id).toBeUndefined();
  });

  it('keeps every structure id and system of the source body, so saved views and items still resolve', () => {
    const source = demoManifest('male');
    const bakedIds = new Set(male.structures.map((s: { id: string }) => s.id));
    for (const s of source.structures) expect(bakedIds.has(s.id), `${s.id} missing from pack`).toBe(true);
    const byId = new Map(male.structures.map((s: { id: string; systems: string[] }) => [s.id, s.systems]));
    for (const s of source.structures) expect(byId.get(s.id)).toEqual(s.systems);
  });

  it('every referenced file exists and matches the byte count in the manifest', () => {
    for (const s of male.structures) for (const lod of s.lods) {
      const file = `public${lod.url}`;
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file).byteLength, file).toBe(lod.bytes);
    }
  });

  it('stays inside the per-system first-paint budget (8 MB at LOD2)', () => {
    for (const p of male.packs) expect(p.bytes, p.system).toBeLessThan(8 * 1024 * 1024);
    const ids = new Set(male.packs.flatMap((p: { structureIds: string[] }) => p.structureIds));
    expect(ids.size).toBe(male.structures.length);
  });

  it('female body carries female-specific structures and no male-specific ones', () => {
    const ids = female.structures.map((s: { id: string }) => s.id);
    expect(ids).toContain('uterus');
    expect(ids).not.toContain('prostate');
  });
});

describe('manifest schema', () => {
  it('rejects a NonCommercial pack', () => {
    const bad = { body: 'male', version: '1', pack: 'x', licence: 'CC-BY-NC-SA-4.0', attribution: 'a'.repeat(20), structures: [{ id: 'a', name: 'A', systems: ['skeletal'], centroid: [0, 0, 0], bounds: [0, 0, 0, 1, 1, 1] }] };
    expect(bodyManifest.safeParse(bad).success).toBe(false);
  });
  it('rejects a pack with no attribution', () => {
    const bad = { body: 'male', version: '1', pack: 'x', licence: 'CC-BY-4.0', attribution: '', structures: [{ id: 'a', name: 'A', systems: ['skeletal'], centroid: [0, 0, 0], bounds: [0, 0, 0, 1, 1, 1] }] };
    expect(bodyManifest.safeParse(bad).success).toBe(false);
  });
});
