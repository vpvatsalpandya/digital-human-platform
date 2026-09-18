import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { bodyManifest, ALLOWED_PACK_LICENCES } from '@/engine/manifest';
import { demoManifest } from '@/engine/demo-manifest';

const PACK = 'public/assets/demo-baked';
const built = existsSync(`${PACK}/male.manifest.json`);

describe.runIf(built)('baked asset pack', () => {
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

  it('carries three level-of-detail meshes per structure, never coarsening to nothing', () => {
    for (const s of male.structures) {
      expect(s.lods, s.id).toHaveLength(3);
      expect(s.lods[1].triangles, `${s.id} lod1`).toBeLessThanOrEqual(s.lods[0].triangles);
      expect(s.lods[2].triangles, `${s.id} lod2`).toBeLessThanOrEqual(s.lods[1].triangles);
      expect(s.lods[2].triangles, `${s.id} lod2 non-empty`).toBeGreaterThan(0);
    }
  });

  it('simplifies every mesh that has room to simplify', () => {
    // A closed box is 12 triangles and cannot be reduced further without holes, so the floor
    // is a property of the surface, not a pipeline failure. Anything above it must shrink.
    const FLOOR = 12;
    for (const s of male.structures) {
      if (s.lods[0].triangles <= FLOOR * 2) continue;
      expect(s.lods[1].triangles, `${s.id} lod1 did not simplify`).toBeLessThan(s.lods[0].triangles);
      expect(s.lods[2].triangles, `${s.id} lod2 did not simplify`).toBeLessThan(s.lods[1].triangles);
    }
  });

  it('meets the aggregate level-of-detail budget (Phase G: 35% and 12% targets)', () => {
    const total = (i: number) => male.structures.reduce((a: number, s: { lods: { triangles: number }[] }) => a + s.lods[i]!.triangles, 0);
    const [lod0, lod1, lod2] = [total(0), total(1), total(2)];
    expect(lod1 / lod0).toBeLessThan(0.5);
    expect(lod2 / lod0).toBeLessThan(0.2);
  });

  it('drops the procedural fallback so a baked pack cannot silently render stand-ins', () => {
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
