import { describe, expect, it } from 'vitest';
import { demoManifest } from '@/engine/demo-manifest';
import { StructureSearch } from '@/engine/search';
import { structureVisibility } from '@/store/engine';
import { chooseLod } from '@/engine/loader';
import { rasterise, extractSlice, sliceForStructure } from '@/modules/radiology/volume';
import { Bm25Index, chunkRecord } from '@/modules/tutor/retrieval';
import { SEED_RECORDS } from '@/knowledge/seed';
import { validateCitations } from '@/modules/tutor/prompts';

describe('demo manifest', () => {
  it('has unique ids and covers all 14 systems across both bodies', () => {
    const all = [...demoManifest('male').structures, ...demoManifest('female').structures];
    const ids = demoManifest('male').structures.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const systems = new Set(all.flatMap((s) => s.systems));
    expect(systems.size).toBe(14);
  });
  it('female body has uterus and no prostate', () => {
    const f = demoManifest('female').structures.map((s) => s.id);
    expect(f).toContain('uterus'); expect(f).not.toContain('prostate');
  });
});

describe('search', () => {
  const idx = new StructureSearch(demoManifest('male').structures);
  it('matches names, aliases, Latin and FMA ids', () => {
    expect(idx.query('heart')[0]!.structure.id).toBe('heart');
    expect(idx.query('cor')[0]!.structure.id).toBe('heart');
    expect(idx.query('hepar')[0]!.structure.id).toBe('liver');
    expect(idx.query('FMA:7197')[0]!.structure.id).toBe('liver');
    expect(idx.query('quads')[0]!.structure.name).toMatch(/quadriceps/i);
  });
  it('tolerates a typo', () => { expect(idx.query('kidnye').some((h) => h.structure.id.startsWith('kidney'))).toBe(true); });
});

describe('visibility resolution', () => {
  const base = { hidden: [], faded: [], isolated: null, visibleSystems: ['skeletal' as const], transparency: 0, showStandIns: true };
  it('hides structures whose systems are off', () => { expect(structureVisibility(base, 'heart', ['cardiovascular']).visible).toBe(false); });
  it('isolate dims others, fade reduces opacity, hidden hides', () => {
    expect(structureVisibility({ ...base, isolated: ['skull'] }, 'pelvis', ['skeletal']).opacity).toBeLessThan(0.1);
    expect(structureVisibility({ ...base, faded: ['skull'] }, 'skull', ['skeletal']).opacity).toBeCloseTo(0.15);
    expect(structureVisibility({ ...base, hidden: ['skull'] }, 'skull', ['skeletal']).visible).toBe(false);
  });
  it('low-bandwidth forces the coarsest LOD', () => { expect(chooseLod(0.5, 0.5, 3, true)).toBe(2); expect(chooseLod(0.5, 0.5, 3, false)).toBe(0); });

  it('hides generated stand-ins unless asked for, but never hides an isolated one', () => {
    const off = { ...base, showStandIns: false };
    expect(structureVisibility(off, 'rib-cage', ['skeletal'], 'procedural').visible).toBe(false);
    expect(structureVisibility(off, 'pelvis', ['skeletal'], 'hra').visible).toBe(true);
    expect(structureVisibility({ ...off, isolated: ['rib-cage'] }, 'rib-cage', ['skeletal'], 'procedural').visible).toBe(true);
    expect(structureVisibility(base, 'rib-cage', ['skeletal'], 'procedural').visible).toBe(true);
  });
});

describe('radiology phantom ↔ 3D sync', () => {
  const m = demoManifest('male');
  const v = rasterise(m, 0.02);
  it('the slice through the heart centroid contains the heart label', () => {
    const heart = m.structures.find((s) => s.id === 'heart')!;
    const idx = sliceForStructure(v, 'axial', heart);
    const slice = extractSlice(v, 'axial', idx);
    const heartLabel = v.structures.findIndex((s) => s.id === 'heart') + 1;
    expect(Array.from(slice.label)).toContain(heartLabel);
  });
});

describe('tutor retrieval', () => {
  const idx = new Bm25Index(SEED_RECORDS.flatMap((r) => chunkRecord(r, 'mbbs')));
  it('retrieves the liver blood-supply chunk for a blood-supply question', () => {
    const top = idx.search('what is the blood supply of the liver')[0]!;
    expect(top.chunk.structureId).toBe('liver'); expect(top.chunk.fieldKey).toBe('bloodSupply');
  });
  it('returns nothing useful for out-of-corpus questions', () => {
    expect(idx.search('treatment dose of amoxicillin for otitis media').filter((h) => h.score >= 1.0)).toHaveLength(0);
  });
  it('school mode chunks exclude surgical relevance', () => {
    const keys = SEED_RECORDS.flatMap((r) => chunkRecord(r, 'school')).map((c) => c.fieldKey);
    expect(keys).not.toContain('surgicalRelevance'); expect(keys).toContain('description');
  });
  it('validates citation markers', () => {
    expect(validateCitations('The liver is large [1].', 2).ok).toBe(true);
    expect(validateCitations('The liver is large [3].', 2).ok).toBe(false);
    expect(validateCitations('The liver is large.', 2).ok).toBe(false);
  });
});
