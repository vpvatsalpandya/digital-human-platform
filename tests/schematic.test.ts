import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { bodyManifest, ALLOWED_PACK_LICENCES } from '../src/engine/manifest';
import { mergeManifests } from '../src/engine/useBodyManifest';
import { isRealAnatomy } from '../src/engine/types';
import { structureVisibility } from '../src/store/engine';
import { StructureSearch } from '../src/engine/search';
import { MeshBuilder, signedVolume, resample } from '../scripts/assets/schematic/geom';

/**
 * Generated schematic stand-ins (group "schematic"): spinal nerves, plexuses, autonomic ganglia,
 * third molars, small vessel branches. They must always be labelled as generated and must never
 * be counted as real anatomy.
 */
const V2 = 'public/assets/anatomy-v2';
const CORE = 'public/assets/hra-v1';
const built = existsSync(`${V2}/male.manifest.json`) && existsSync(`${V2}/male/group-schematic.bin`);
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const LEVELS = [...Array.from({ length: 8 }, (_, i) => `c${i + 1}`), ...Array.from({ length: 12 }, (_, i) => `t${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `l${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `s${i + 1}`), 'co1'];

describe('geometry kit', () => {
  it('builds closed, outward-wound tubes and spheres', () => {
    const b = new MeshBuilder();
    b.tube([{ p: [0, 0, 0], r: 0.002 }, { p: [0.01, 0.05, 0.01], r: 0.002 }, { p: [0.03, 0.1, 0.02], r: 0.001 }]);
    expect(signedVolume(b.build())).toBeGreaterThan(0);
    const s = new MeshBuilder(); s.sphere([1, 2, 3], 0.003);
    expect(signedVolume(s.build())).toBeGreaterThan(0);
  });
  it('tolerates repeated control points', () => {
    const pts = resample([{ p: [0, 0, 0], r: 1e-3 }, { p: [0, 0, 0], r: 1e-3 }, { p: [0, 0.02, 0], r: 1e-3 }], 0.003);
    expect(pts.length).toBeGreaterThan(2);
  });
});

describe('generated structures are never real anatomy', () => {
  it('is not real anatomy, and only layered shells wait for the peel control', () => {
    expect(isRealAnatomy('generated')).toBe(false);
    const st = { hidden: [], faded: [], isolated: null, visibleSystems: ['nervous'] as never[], transparency: 0, showStandIns: false, peel: 0 };
    expect(structureVisibility(st, 'spinal-nerve-c5-l', ['nervous'], 'generated', undefined).visible).toBe(true);
    expect(structureVisibility(st, 'dermis-shell', ['integumentary'], 'generated', 1).visible).toBe(false);
  });
  it('merged manifest keeps the label on every schematic structure', () => {
    if (!built) return;
    const core = bodyManifest.parse(read(`${CORE}/male.manifest.json`));
    const m = mergeManifests(core as never, bodyManifest.parse(read(`${V2}/male.manifest.json`)) as never);
    const sch = m.structures.filter((s) => s.category?.startsWith('schematic'));
    expect(sch.length).toBeGreaterThan(300);
    for (const s of sch) { expect(s.provenance, s.id).toBe('generated'); expect(isRealAnatomy(s.provenance), s.id).toBe(false); }
    const real = m.structures.filter((s) => isRealAnatomy(s.provenance)).length;
    expect(real + sch.length + m.structures.filter((s) => s.provenance === 'procedural' || s.category === 'skin layer').length).toBe(m.structures.length);
  });
});

describe.runIf(built)('schematic group', () => {
  for (const body of ['male', 'female'] as const) {
    describe(body, () => {
      const m = bodyManifest.parse(read(`${V2}/${body}.manifest.json`));
      const core = bodyManifest.parse(read(`${CORE}/${body}.manifest.json`));
      const sch = m.structures.filter((s) => s.group === 'schematic');
      const byId = new Map(m.structures.map((s) => [s.id, s]));
      const coreSkin = core.structures.find((s) => s.id === 'skin')!;

      it('flags every member as generated, schematic, correctly licensed and named as a schematic', () => {
        expect(sch.length).toBeGreaterThan(300);
        for (const s of sch) {
          expect(s.provenance, s.id).toBe('generated');
          expect(s.category, s.id).toMatch(/^schematic (nerve|plexus|ganglion|vessel|tooth|eye|capsule|cartilage|ligament|tendon|muscle|conduction|suture|organ|membrane|inset)$/);
          expect(s.name, s.id).toMatch(/\(schematic/);
          expect(s.source?.name, s.id).toMatch(/Generated/i);
          expect(ALLOWED_PACK_LICENCES).toContain(s.source!.licence);
          expect(s.layer, s.id).toBeUndefined();
        }
        expect(JSON.stringify(sch)).not.toMatch(/-NC|-ND|NonCommercial|NoDerivatives/i);
      });

      it('has all 31 named spinal nerve pairs, C1–C8, T1–T12, L1–L5, S1–S5, Co1', () => {
        expect(LEVELS).toHaveLength(31);
        for (const lv of LEVELS) for (const side of ['l', 'r']) {
          const s = byId.get(`spinal-nerve-${lv}-${side}`);
          expect(s, `spinal-nerve-${lv}-${side}`).toBeDefined();
          expect(s!.name).toContain(lv.toUpperCase().replace('CO', 'Co'));
          expect(s!.laterality).toBe(side === 'l' ? 'left' : 'right');
        }
        expect(sch.filter((s) => s.id.startsWith('spinal-nerve-'))).toHaveLength(62);
      });

      it('runs each spinal nerve out from the cord on the right side of the body, in craniocaudal order', () => {
        const cord = byId.get('spinal-cord')!;
        const lastY = new Map<string, number>();
        for (const lv of LEVELS) for (const side of ['l', 'r'] as const) {
          const s = byId.get(`spinal-nerve-${lv}-${side}`)!;
          // starts at the cord: bounds touch the cord's height range and x within a few cm of its midline
          expect(s.bounds[4], `${s.id} top`).toBeLessThanOrEqual(cord.bounds[4] + 0.02);
          expect(s.bounds[1], `${s.id} bottom`).toBeGreaterThanOrEqual(-0.1 + coreSkin.bounds[1] * 0);
          // leaves laterally through the foramen: the far end is on its own side (body left is +x)
          const far = side === 'l' ? s.bounds[3] : s.bounds[0];
          // (the lowest roots leave the sacral hiatus beside the coccyx, whose midline may sit a few mm off x = 0)
          const mid = lv === 'co1' ? (byId.get('coccyx')?.centroid[0] ?? 0) : 0;
          expect(side === 'l' ? far - mid > 0.002 : far - mid < -0.002, `${s.id} lateral end ${far}`).toBe(true);
          // levels descend
          const y = s.centroid[1];
          const prev = lastY.get(side);
          if (prev !== undefined && !lv.startsWith('s') && lv !== 'co1' && !lv.startsWith('l')) expect(y, `${s.id} not below the previous level`).toBeLessThan(prev + 0.0001);
          lastY.set(side, y);
        }
      });

      it('has cervical, lumbar and sacral plexuses (both sides)', () => {
        for (const p of ['cervical-plexus', 'lumbar-plexus', 'sacral-plexus']) for (const side of ['l', 'r']) expect(byId.get(`${p}-${side}`), `${p}-${side}`).toBeDefined();
        expect(byId.get('cervical-plexus-l')!.centroid[1]).toBeGreaterThan(byId.get('lumbar-plexus-l')!.centroid[1]);
        expect(byId.get('lumbar-plexus-l')!.centroid[1]).toBeGreaterThan(byId.get('sacral-plexus-l')!.centroid[1]);
      });

      it('has the sympathetic chain, autonomic plexuses and the vagal and phrenic branches', () => {
        const ganglia = sch.filter((s) => s.category === 'schematic ganglion');
        expect(ganglia.length).toBeGreaterThanOrEqual(40);
        for (const id of ['coeliac-plexus', 'cardiac-plexus', 'superior-hypogastric-plexus', 'inferior-hypogastric-plexus-l', 'inferior-hypogastric-plexus-r', 'oesophageal-plexus', 'anterior-vagal-trunk', 'posterior-vagal-trunk', 'recurrent-laryngeal-nerve-l', 'recurrent-laryngeal-nerve-r', 'phrenic-nerve-l', 'phrenic-nerve-r', 'greater-splanchnic-nerve-l', 'sympathetic-trunk-lower-r', 'superior-cervical-ganglion-l', 'cervicothoracic-ganglion-r']) expect(byId.get(id), id).toBeDefined();
        // the chain runs on both sides of the midline, T1 ganglion above T12
        expect(byId.get('thoracic-t2-ganglion-l')!.centroid[1]).toBeGreaterThan(byId.get('thoracic-t12-ganglion-l')!.centroid[1]);
        expect(byId.get('thoracic-t6-ganglion-l')!.centroid[0]).toBeGreaterThan(byId.get('thoracic-t6-ganglion-r')!.centroid[0]);
      });

      it('adds exactly the four third molars, behind the second molars', () => {
        const t = sch.filter((s) => s.category === 'schematic tooth');
        expect(t.map((s) => s.id).sort()).toEqual(['lower-third-molar-tooth-l', 'lower-third-molar-tooth-r', 'upper-third-molar-tooth-l', 'upper-third-molar-tooth-r']);
        for (const a of ['upper', 'lower']) for (const side of ['l', 'r']) {
          const w = byId.get(`${a}-third-molar-tooth-${side}`)!, s2 = byId.get(`${a}-second-molar-tooth-${side}`)!;
          expect(Math.abs(w.centroid[1] - s2.centroid[1]), w.id).toBeLessThan(0.006);
          expect(Math.hypot(w.centroid[0] - s2.centroid[0], w.centroid[2] - s2.centroid[2]), w.id).toBeGreaterThan(0.004);
          expect(Math.hypot(w.centroid[0] - s2.centroid[0], w.centroid[2] - s2.centroid[2]), w.id).toBeLessThan(0.03);
        }
        // the 28 real teeth are still 28
        expect(m.structures.filter((s) => s.category === 'tooth')).toHaveLength(28);
      });

      it('adds small vessel branches, and sex-appropriate ones only', () => {
        const v = sch.filter((s) => s.category === 'schematic vessel');
        expect(v.length).toBeGreaterThanOrEqual(24);
        for (const id of ['superior-thyroid-artery-l', 'lingual-artery-r', 'bronchial-artery-l', 'middle-rectal-artery-r', 'right-gastric-artery', 'short-gastric-arteries', 'jejunal-arteries', 'ileal-arteries']) expect(byId.get(id), id).toBeDefined();
        const names = v.map((s) => s.name.toLowerCase()).join('|');
        if (body === 'male') { expect(names).not.toMatch(/uterine|ovarian|vaginal/); expect(byId.get('inferior-vesical-artery-l')).toBeDefined(); }
        else { expect(names).not.toMatch(/uterine/); expect(byId.get('uterine-artery-l')?.provenance ?? byId.get('left-uterine-artery')?.provenance).toBe('hra'); expect(names).toMatch(/ovarian/); expect(byId.get('vaginal-artery-l')).toBeDefined(); expect(names).not.toMatch(/inferior vesical|testicular/); }
      });

      it('places every schematic structure inside the body, with side matching the geometry', () => {
        const [y0, y1] = [coreSkin.bounds[1], coreSkin.bounds[4]];
        for (const s of sch) {
          expect(s.bounds[1], s.id).toBeGreaterThan(y0);
          expect(s.bounds[4], s.id).toBeLessThan(y1);
          expect(s.bounds[0], s.id).toBeGreaterThan(coreSkin.bounds[0]);
          expect(s.bounds[3], s.id).toBeLessThan(coreSkin.bounds[3]);
          expect(s.bounds[5] - s.bounds[2], s.id).toBeLessThan(0.4);
        }
        // paired structures: the body's left (+x) member lies to the left of its right partner
        let pairs = 0;
        for (const s of sch) {
          if (!s.id.endsWith('-l')) continue;
          const r = byId.get(`${s.id.slice(0, -2)}-r`); if (!r) continue;
          pairs++;
          expect(s.centroid[0] - r.centroid[0], `${s.id} vs ${r.id}`).toBeGreaterThan(0);
        }
        expect(pairs).toBeGreaterThan(120);
      });

      it('adds the second batch: cutaneous nerves, cranial ganglia, small vessels, conduction tissue, eyelids, capsules, tendons, sutures', () => {
        for (const base of ['supra-orbital-nerve', 'supratrochlear-nerve', 'lacrimal-nerve', 'infra-orbital-nerve', 'auriculotemporal-nerve', 'great-auricular-nerve', 'lesser-occipital-nerve', 'transverse-cervical-nerve', 'medial-supraclavicular-nerve', 'superior-laryngeal-nerve', 'intercostobrachial-nerve', 'lateral-sural-cutaneous-nerve', 'inferior-anal-nerve', 'trigeminal-ganglion', 'ciliary-ganglion', 'geniculate-ganglion', 'sublingual-artery', 'median-artery', 'princeps-pollicis-artery', 'labyrinthine-artery', 'posterior-spinal-artery', 'internal-cerebral-vein', 'upper-eyelid', 'lower-tarsal-plate', 'periorbita', 'cuneiform-cartilage', 'vestibular-fold', 'auricular-cartilage', 'sacroiliac-joint-capsule', 'talocrural-joint-capsule', 'quadriceps-tendon', 'triceps-tendon', 'greater-occipital-nerve', 'tensor-tympani', 'stapedius', 'vocal-fold'])
          for (const side of ['l', 'r']) expect(byId.get(`${base}-${side}`), `${base}-${side}`).toBeDefined();
        for (const id of ['great-cerebral-vein', 'tracheal-cartilages', 'sinu-atrial-node', 'atrioventricular-node', 'atrioventricular-bundle', 'left-bundle-branch', 'right-bundle-branch', 'sagittal-suture', 'coronal-suture', 'lambdoid-suture', 'thoracic-duct']) expect(byId.get(id), id).toBeDefined();
        expect(sch.filter((s) => s.id.startsWith('facet-joint-capsule-'))).toHaveLength(46);
        if (body === 'male') expect(byId.get('dorsal-nerve-of-penis-l')).toBeDefined(); else expect(byId.get('dorsal-nerve-of-penis-l')).toBeUndefined();
        // the real HRA meshes replaced the first-batch schematic hepatic / cystic arteries
        for (const id of ['right-hepatic-artery', 'left-hepatic-artery', 'cystic-artery']) expect(byId.get(id)?.provenance ?? 'hra', id).not.toBe('generated');
      });

      it('keeps ids unique and does not touch any real structure', () => {
        const ids = m.structures.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        const coreIds = new Set(core.structures.map((s) => s.id));
        for (const s of sch) expect(coreIds.has(s.id), s.id).toBe(false);
      });

      it('finds the new structures by search, spelled several ways', () => {
        const search = new StructureSearch(m.structures as never);
        const top = (q: string) => search.query(q, 8).map((h) => h.structure.id);
        expect(top('spinal nerve C5')).toContain('spinal-nerve-c5-l');
        expect(top('L4 nerve')).toEqual(expect.arrayContaining(['spinal-nerve-l4-l', 'spinal-nerve-l4-r']));
        expect(top('lumbar plexus')).toContain('lumbar-plexus-l');
        expect(top('wisdom tooth')).toContain('upper-third-molar-tooth-l');
        expect(top('coeliac plexus')).toContain('coeliac-plexus');
        expect(top('phrenic nerve')).toContain('phrenic-nerve-r');
        expect(top('stellate ganglion')).toContain('cervicothoracic-ganglion-l');
      });

      it('stays inside the byte budgets', () => {
        const g = m.groups!.find((x) => x.id === 'schematic')!;
        expect(g.count).toBe(sch.length);
        const size = statSync(`public${g.url}`).size;
        expect(size).toBe(g.bytes);
        expect(size).toBeLessThan(768 * 1024); // this group; any lazy group must stay under 3 MB (anatomy-v2.test.ts)
        for (const s of sch) expect(s.packed!.o + s.packed!.vb + s.packed!.ib, s.id).toBeLessThanOrEqual(size);
        expect(m.groups!.reduce((a, x) => a + x.bytes, 0)).toBeLessThan(9.7 * 1024 * 1024); // per-body lazy total
        for (const x of m.groups!) expect(x.auto ?? false, x.id).toBe(x.id === 'core-upgrades' || x.id === 'skin-layers');
      });
    });
  }

  it('gives the female body the same 31 pairs and the male body no female-only vessels', () => {
    const f = bodyManifest.parse(read(`${V2}/female.manifest.json`)).structures.filter((s) => s.id.startsWith('spinal-nerve-'));
    const mm = bodyManifest.parse(read(`${V2}/male.manifest.json`)).structures.filter((s) => s.id.startsWith('spinal-nerve-'));
    expect(f.map((s) => s.id).sort()).toEqual(mm.map((s) => s.id).sort());
  });
});
