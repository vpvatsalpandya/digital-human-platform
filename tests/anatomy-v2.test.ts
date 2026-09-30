import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { bodyManifest, ALLOWED_PACK_LICENCES } from '../src/engine/manifest';
import { mergeManifests } from '../src/engine/useBodyManifest';
import { isPeeled, LAYER_NAMES, PEEL_STEPS } from '../src/engine/layers';
import { structureVisibility } from '../src/store/engine';
import { isRealAnatomy } from '../src/engine/types';
import type { BodyManifest } from '../src/engine/types';

/**
 * The detail pack (anatomy-v2): ~3,000 structures per body from Z-Anatomy (CC BY-SA 4.0) and
 * the HuBMAP HRA (CC BY 4.0), fitted into each HRA body. These tests protect the licence
 * rule, the pack's byte layout and the anatomical sanity of what was registered.
 */
const CORE = 'public/assets/hra-v1';
const V2 = 'public/assets/anatomy-v2';
const built = existsSync(`${V2}/male.manifest.json`) && existsSync(`${CORE}/male.manifest.json`);

const GROUP_BUDGET = 3 * 1024 * 1024; // any lazy group
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

describe('layer stack', () => {
  it('has seven named layers and matching peel steps', () => {
    expect(LAYER_NAMES).toHaveLength(7);
    expect(PEEL_STEPS).toHaveLength(7);
  });
  it('peels only layers below the depth', () => {
    expect(isPeeled(0, 0)).toBe(false);
    expect(isPeeled(0, 1)).toBe(true);
    expect(isPeeled(3, 3)).toBe(false);
    expect(isPeeled(3, 4)).toBe(true);
    expect(isPeeled(undefined, 6)).toBe(false);
  });
  const base = { hidden: [], faded: [], isolated: null, visibleSystems: ['muscular'] as never[], transparency: 0, showStandIns: true };
  it('hides peeled layers unless the structure is selected', () => {
    const st = { ...base, peel: 5 };
    expect(structureVisibility(st, 'x', ['muscular'], 'zanatomy', 4).visible).toBe(false);
    expect(structureVisibility(st, 'x', ['muscular'], 'zanatomy', 6).visible).toBe(true);
    expect(structureVisibility({ ...st, isolated: ['x'] }, 'x', ['muscular'], 'zanatomy', 4).visible).toBe(true);
  });
  it('only shows generated shells while peeling', () => {
    expect(structureVisibility({ ...base, peel: 0 }, 'dermis-shell', ['muscular'], 'generated', 1).visible).toBe(false);
    expect(structureVisibility({ ...base, peel: 1 }, 'dermis-shell', ['muscular'], 'generated', 1).visible).toBe(true);
  });
  it('does not count generated or procedural structures as real anatomy', () => {
    expect(isRealAnatomy('hra')).toBe(true);
    expect(isRealAnatomy('zanatomy')).toBe(true);
    expect(isRealAnatomy('openear')).toBe(true);
    expect(isRealAnatomy('iemap')).toBe(true);
    expect(isRealAnatomy('generated')).toBe(false);
    expect(isRealAnatomy('procedural')).toBe(false);
  });
});

describe('mergeManifests', () => {
  const mk = (ids: string[], pack: string): BodyManifest => ({
    body: 'male', version: '1', pack, licence: 'CC-BY-4.0', attribution: 'Attribution text here.',
    structures: ids.map((id) => ({ id, name: id, systems: ['muscular'], centroid: [0, 0, 0], bounds: [0, 0, 0, 1, 1, 1], provenance: 'procedural' as const })),
  });
  it('replaces core stand-ins with same-id detail structures and adds the rest', () => {
    const core = mk(['a', 'b'], 'core');
    const detail = { ...mk(['b', 'c'], 'detail'), structures: mk(['b', 'c'], 'detail').structures.map((s) => ({ ...s, provenance: 'zanatomy' as const })) };
    const m = mergeManifests(core, detail);
    expect(m.structures.map((s) => s.id).sort()).toEqual(['a', 'b', 'c']);
    expect(m.structures.find((s) => s.id === 'b')!.provenance).toBe('zanatomy');
  });
  it('returns the core untouched without a detail pack', () => {
    const core = mk(['a'], 'core');
    expect(mergeManifests(core, null)).toBe(core);
  });
});

describe.runIf(built)('anatomy-v2 detail pack', () => {
  for (const body of ['male', 'female'] as const) {
    describe(body, () => {
      const raw = read(`${V2}/${body}.manifest.json`);
      const m = bodyManifest.parse(raw);
      const core = bodyManifest.parse(read(`${CORE}/${body}.manifest.json`));
      const coreIds = new Set(core.structures.map((s) => s.id));
      const detailIds = m.structures.map((s) => s.id);
      const cat = (c: string) => m.structures.filter((s) => s.category === c);
      const skin = core.structures.find((s) => s.id === 'skin')!;
      const [y0, y1] = [skin.bounds[1], skin.bounds[4]];
      const height = y1 - y0;

      it('uses only allowed licences and no NonCommercial/NoDerivatives text', () => {
        expect(ALLOWED_PACK_LICENCES).toContain(m.licence);
        expect(m.licence).toBe('CC-BY-SA-4.0');
        expect(JSON.stringify(raw)).not.toMatch(/-NC|-ND|NonCommercial|NoDerivatives/i);
        for (const s of m.structures) {
          expect(s.source, `${s.id} has no source`).toBeDefined();
          expect(ALLOWED_PACK_LICENCES).toContain(s.source!.licence);
          expect(s.provenance, `${s.id} has no provenance`).toBeDefined();
        }
      });

      it('has unique ids, and every id clash with the core is a deliberate upgrade', () => {
        expect(new Set(detailIds).size).toBe(detailIds.length);
        const upgrades = m.structures.filter((s) => coreIds.has(s.id));
        expect(upgrades.length).toBeGreaterThanOrEqual(12);
        for (const u of upgrades) expect(u.group, u.id).toBe('core-upgrades');
        for (const s of m.structures.filter((s) => s.group === 'core-upgrades')) expect(coreIds.has(s.id), s.id).toBe(true);
      });

      it('has byte ranges that fit inside each group file, and groups within budget', () => {
        for (const g of m.groups ?? []) {
          const file = `public${g.url}`;
          expect(existsSync(file), file).toBe(true);
          const size = statSync(file).size;
          expect(size).toBe(g.bytes);
          expect(size, `${g.id} is ${size} bytes`).toBeLessThan(GROUP_BUDGET);
          const members = m.structures.filter((s) => s.group === g.id);
          expect(members.length).toBe(g.count);
          for (const s of members) {
            expect(s.packed, s.id).toBeDefined();
            expect(s.packed!.o + s.packed!.vb + s.packed!.ib, `${s.id} runs past the end of ${g.id}`).toBeLessThanOrEqual(size);
          }
        }
        for (const s of m.structures) expect((m.groups ?? []).some((g) => g.id === s.group), s.id).toBe(true);
      });

      it('keeps the first-paint core bundles under 8 MB per system', () => {
        for (const p of core.packs ?? []) expect(p.bytes, p.system).toBeLessThan(8 * 1024 * 1024);
      });

      it('contains no excluded third-party models (inner ear, Z-Anatomy kidney)', () => {
        // The Z-Anatomy inner ear is CC BY-NC-SA and stays out. The inner ear that IS shipped comes from two CC BY 4.0
        // research scans, carries their provenance, and is the only way such a name may appear.
        for (const s of m.structures) {
          if (s.category !== 'nerve' && !/schematic/.test(s.category ?? '') && s.provenance !== 'openear' && s.provenance !== 'iemap') expect(s.name, s.id).not.toMatch(/cochlea|vestibul|semicircular|saccule|labyrinth/i);
        }
        for (const s of m.structures.filter((x) => x.group === 'inner-ear')) {
          expect(['openear', 'iemap'], s.id).toContain(s.provenance);
          expect(s.source!.licence, s.id).toBe('CC-BY-4.0');
          expect(s.source!.name, s.id).toMatch(/OpenEar|IE-Map/);
        }
        expect(m.structures.some((s) => /kidney/i.test(s.name) && s.provenance === 'zanatomy' && !['artery', 'vein'].includes(s.category ?? ''))).toBe(false);
      });

      it('does not pass generated anatomy off as real', () => {
        const gen = m.structures.filter((s) => s.provenance === 'generated');
        const shells = gen.filter((s) => s.category === 'skin layer');
        expect(shells.map((s) => s.id).sort()).toEqual(['dermis-shell', 'epidermis-shell', 'hypodermis-shell', 'membranous-subcutaneous-shell', 'papillary-dermis-shell']);
        for (const s of shells) expect([1, 2]).toContain(s.layer);
        for (const s of shells) expect(s.name, s.id).toMatch(/\(schematic shell\)$/);
        // every other generated structure is a labelled schematic stand-in in its own group
        for (const s of gen.filter((s) => s.category !== 'skin layer')) { expect(s.group, s.id).toBe('schematic'); expect(s.category, s.id).toMatch(/^schematic /); expect(s.name, s.id).toMatch(/\(schematic\)$/); }
        expect(m.structures.filter((s) => s.provenance === 'procedural')).toHaveLength(0);
        for (const s of m.structures.filter((s) => s.provenance !== 'generated')) expect(isRealAnatomy(s.provenance)).toBe(true);
      });

      it('names the reference-list categories in useful numbers', () => {
        expect(cat('bone').length).toBeGreaterThanOrEqual(200);
        expect(cat('artery').length).toBeGreaterThanOrEqual(300);
        expect(cat('vein').length).toBeGreaterThanOrEqual(150);
        expect(cat('nerve').length + cat('plexus').length).toBeGreaterThanOrEqual(250);
        expect(cat('muscle').length).toBeGreaterThanOrEqual(400);
        expect(cat('ligament').length).toBeGreaterThanOrEqual(200);
        expect(cat('tooth').length).toBe(28);
        expect(cat('lymph node').length).toBeGreaterThanOrEqual(100);
      });

      it('ships the real inner ear: 13 structures per side from OpenEar and IE-Map, inside the temporal bone, left mirrored from right', () => {
        const ear = m.structures.filter((s) => s.group === 'inner-ear');
        expect(ear).toHaveLength(26);
        for (const key of ['scala-tympani', 'scala-vestibuli', 'round-window', 'external-acoustic-meatus', 'cochlear-duct', 'anterior-semicircular-duct', 'lateral-semicircular-duct', 'posterior-semicircular-duct', 'anterior-membranous-ampulla', 'lateral-membranous-ampulla', 'posterior-membranous-ampulla', 'utricle', 'saccule']) {
          const l = ear.find((s) => s.id === `${key}-l`), r = ear.find((s) => s.id === `${key}-r`);
          expect(l, `${key}-l`).toBeDefined(); expect(r, `${key}-r`).toBeDefined();
          expect(l!.centroid[0], key).toBeGreaterThan(0.02); expect(r!.centroid[0], key).toBeLessThan(-0.02);
          expect(l!.laterality).toBe('left'); expect(r!.laterality).toBe('right');
          if (key !== 'external-acoustic-meatus') {
            // inside the temporal bone box of the same side
            const tb = m.structures.find((s) => s.id === `temporal-bone-${l!.laterality === 'left' ? 'l' : 'r'}`)!;
            for (const x of [l!, r!]) {
              const t = m.structures.find((s) => s.id === (x === l ? 'temporal-bone-l' : 'temporal-bone-r'))!;
              for (const a of [0, 1, 2]) { expect(x.centroid[a]!, `${x.id} axis ${a}`).toBeGreaterThan(t.bounds[a]!); expect(x.centroid[a]!, `${x.id} axis ${a}`).toBeLessThan(t.bounds[a + 3]!); }
            }
            void tb;
          }
          expect(l!.latinName, key).toBeDefined();
        }
        // real size: the cochlea is about 9 mm across
        const st = ear.find((s) => s.id === 'scala-tympani-r')!;
        expect(Math.max(st.bounds[3] - st.bounds[0], st.bounds[4] - st.bounds[1], st.bounds[5] - st.bounds[2])).toBeGreaterThan(0.007);
        expect(Math.max(st.bounds[3] - st.bounds[0], st.bounds[4] - st.bounds[1], st.bounds[5] - st.bounds[2])).toBeLessThan(0.014);
        expect((raw.attribution as string)).toMatch(/OpenEar/); expect((raw.attribution as string)).toMatch(/IE-Map/);
      });

      it('adds the allow-listed HRA coronary, cardiac-vein, hepatic, portal and bowel vessels as real meshes', () => {
        const byId = new Map(m.structures.map((s) => [s.id, s]));
        for (const id of ['left-anterior-descending-artery', 'right-marginal-artery', 'small-cardiac-vein', 'anterior-cardiac-vein', 'cystic-vein', 'right-hepatic-vein', 'middle-hepatic-vein', 'left-branch-of-portal-vein', 'sigmoid-artery-a', 'median-sacral-vein', 'central-retinal-vein-l']) {
          expect(byId.get(id), id).toBeDefined(); expect(byId.get(id)!.provenance, id).toBe('hra');
        }
        if (body === 'female') for (const id of ['left-uterine-artery', 'right-uterine-vein']) expect(byId.get(id), id).toBeDefined();
      });

      it('carries all twelve cranial nerves', () => {
        for (const n of ['olfactory', 'optic', 'oculomotor', 'trochlear', 'trigeminal', 'abducens', 'facial', 'vestibulocochlear', 'glossopharyngeal', 'vagus', 'accessory', 'hypoglossal']) {
          expect(m.structures.some((s) => new RegExp(`${n} nerve`, 'i').test(s.name) || new RegExp(`${n}`, 'i').test(s.name) && s.category === 'nerve'), n).toBe(true);
        }
      });

      it('has sex-appropriate organs only', () => {
        const names = m.structures.map((s) => s.name.toLowerCase()).join('|');
        if (body === 'male') expect(names).not.toMatch(/uterus|ovary|ovarian|vagina/);
        else expect(names).not.toMatch(/prostat|testis|testicular|penis|seminal|scrot/);
      });

      it('places every detail structure inside the body envelope', () => {
        // fasciae and the scalp are allowed a small margin: they hug the skin.
        for (const s of m.structures) {
          if (s.provenance === 'generated') continue;
          const tol = 0.05 * height;
          expect(s.bounds[1], `${s.id} below the soles`).toBeGreaterThan(y0 - tol);
          expect(s.bounds[4], `${s.id} above the vertex`).toBeLessThan(y1 + tol);
          expect(Math.abs(s.centroid[0]), `${s.id} far off to the side`).toBeLessThan(0.75);
        }
      });

      it('mirrors left/right pairs across the midline', () => {
        const byId = new Map(m.structures.map((s) => [s.id, s]));
        let pairs = 0;
        for (const s of m.structures) {
          if (!s.id.endsWith('-l')) continue;
          const r = byId.get(`${s.id.slice(0, -2)}-r`);
          if (!r) continue;
          pairs++;
          // Coordinate convention: the body's left is +x. Allow structures crossing the midline.
          expect(s.centroid[0] - r.centroid[0], `${s.id} vs ${r.id}`).toBeGreaterThan(-0.03);
        }
        expect(pairs).toBeGreaterThan(300);
      });

      it('upgrades lungs, thyroid and spinal cord to plausible real geometry', () => {
        const byId = new Map(m.structures.map((s) => [s.id, s]));
        const span = (id: string) => { const s = byId.get(id)!; return Math.max(s.bounds[3] - s.bounds[0], s.bounds[4] - s.bounds[1], s.bounds[5] - s.bounds[2]); };
        const level = (id: string) => (byId.get(id)!.centroid[1] - y0) / height;
        for (const id of ['lung-l', 'lung-r']) { expect(span(id)).toBeGreaterThan(0.15); expect(span(id)).toBeLessThan(0.32); expect(level(id)).toBeGreaterThan(0.68); expect(level(id)).toBeLessThan(0.84); }
        expect(level('thyroid-gland')).toBeGreaterThan(0.82);
        expect(level('thyroid-gland')).toBeLessThan(0.9);
        expect(span('spinal-cord')).toBeGreaterThan(0.3);
        expect(span('spinal-cord')).toBeLessThan(0.55);
        expect(byId.get('lung-l')!.centroid[0]).toBeGreaterThan(byId.get('lung-r')!.centroid[0]);
        expect(byId.get('median-nerve-l')!.centroid[0]).toBeGreaterThan(byId.get('median-nerve-r')!.centroid[0]);
        expect(byId.get('sciatic-nerve-l')!.centroid[0]).toBeGreaterThan(byId.get('sciatic-nerve-r')!.centroid[0]);
      });

      it('uses layers 0..6 and puts the skeleton at the deepest layer', () => {
        for (const s of m.structures) if (s.layer !== undefined) expect(s.layer).toBeGreaterThanOrEqual(0);
        for (const s of cat('bone')) expect(s.layer, s.id).toBe(6);
        for (const s of cat('muscle')) expect([4, 5], s.id).toContain(s.layer);
        expect(new Set(m.structures.map((s) => s.layer)).size).toBeGreaterThanOrEqual(4);
      });
    });
  }
});
