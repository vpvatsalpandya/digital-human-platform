import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { bodyManifest } from '../src/engine/manifest';
import { mergeManifests } from '../src/engine/useBodyManifest';
import { isRealAnatomy } from '../src/engine/types';
import { categoryColor } from '../src/engine/detail-colors';
import { ellShell, relax, Cloud } from '../scripts/assets/schematic/gaps';
import { signedVolume } from '../scripts/assets/schematic/geom';

/**
 * Last atlas gaps (anatomy-fixes-4, scripts/assets/schematic/gaps.ts): female breast envelope, Cooper's ligaments, lactiferous ducts and axillary tail;
 * male bulbar and penile urethra and bulbourethral glands; pericardial, omental, pelvic, retropubic and tympanic cavities. All generated, flagged, never real.
 */
const CORE = 'public/assets/hra-v1', V2 = 'public/assets/anatomy-v2';
const built = existsSync(`${V2}/male.manifest.json`) && existsSync(`${V2}/male/group-schematic.bin`);
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

describe('gap-fill helpers', () => {
  it('builds a closed hollow ellipsoid with a positive volume', () => {
    const m = ellShell([0, 0, 0], [0.02, 0.01, 0.004], 0.001);
    expect(signedVolume(m)).toBeGreaterThan(0);
    expect(signedVolume(m)).toBeLessThan((4 / 3) * Math.PI * 0.02 * 0.01 * 0.004);
  });
  it('pushes a point out of the clearance ellipsoid of a cloud, within the move cap', () => {
    const cloud = new Cloud([[0, 0, 0], [0.001, 0, 0], [0, 0.001, 0]]);
    const p = relax([0.001, 0.001, 0.0005], cloud, [0.006, 0.006, 0.006], 0.02);
    for (const q of [[0, 0, 0], [0.001, 0, 0], [0, 0.001, 0]]) expect(Math.hypot(p[0] - q[0]!, p[1] - q[1]!, p[2] - q[2]!)).toBeGreaterThan(0.0055);
    expect(Math.hypot(p[0] - 0.001, p[1] - 0.001, p[2] - 0.0005)).toBeLessThanOrEqual(0.02 + 1e-9);
    expect(relax([1, 1, 1], cloud, [0.006, 0.006, 0.006])).toEqual([1, 1, 1]);
  });
});

describe('violet categories', () => {
  it('draws glands and cavities in the schematic violet family', () => {
    for (const c of ['schematic gland', 'schematic cavity']) expect(categoryColor(c)).not.toBe(categoryColor('other'));
    expect(categoryColor('schematic gland')).toMatch(/^#[c-f]/i);
  });
});

describe.runIf(built)('gap-fill batch 4 in the packs', () => {
  for (const body of ['male', 'female'] as const) {
    describe(body, () => {
      const detail = bodyManifest.parse(read(`${V2}/${body}.manifest.json`));
      const m = mergeManifests(bodyManifest.parse(read(`${CORE}/${body}.manifest.json`)) as never, detail as never);
      const by = new Map(m.structures.map((s) => [s.id, s]));
      const g = (id: string) => { const s = by.get(id); expect(s, `${body} ${id}`).toBeDefined(); return s!; };
      const skin = g('skin');
      const sexed = body === 'female'
        ? ['breast-envelope', 'suspensory-ligaments-of-breast', 'lactiferous-ducts', 'axillary-tail-of-breast'].flatMap((x) => [`${x}-l`, `${x}-r`]).concat(['rectouterine-pouch', 'vesicouterine-pouch'])
        : ['bulbar-part-of-male-urethra', 'penile-part-of-male-urethra', 'rectovesical-pouch'].concat(['bulbourethral-gland', 'duct-of-bulbourethral-gland'].flatMap((x) => [`${x}-l`, `${x}-r`]));
      const both = ['pericardial-cavity', 'transverse-pericardial-sinus', 'oblique-pericardial-sinus', 'omental-bursa', 'retropubic-space', 'tympanic-cavity-l', 'tympanic-cavity-r'];
      const all = [...both, ...sexed];

      it(`adds ${all.length} flagged placeholders: generated, schematic, violet, never real`, () => {
        expect(all).toHaveLength(body === 'female' ? 17 : 14);
        for (const id of all) {
          const s = g(id);
          expect(s.provenance, id).toBe('generated'); expect(isRealAnatomy(s.provenance), id).toBe(false);
          expect(s.name, id).toMatch(/\(schematic\)$/); expect(s.group, id).toBe('schematic'); expect(s.category, id).toMatch(/^schematic /);
          expect(categoryColor(s.category), id).not.toBe(categoryColor('other'));
        }
        for (const id of [...both.filter((i) => !/tympanic|retropubic/.test(i)), ...sexed.filter((i) => /pouch/.test(i))]) expect(g(id).category, id).toBe('schematic cavity');
        for (const id of sexed.filter((i) => /breast-envelope|lactiferous|axillary|gland/.test(i))) expect(g(id).category, id).toBe('schematic gland');
        for (const id of sexed.filter((i) => /suspensory/.test(i))) expect(g(id).category, id).toBe('schematic ligament');
      });

      it('keeps every one inside the skin box and pairs left with right', () => {
        for (const id of all) {
          const s = g(id);
          for (let k = 0; k < 3; k++) { expect(s.bounds[k], id).toBeGreaterThan(skin.bounds[k]!); expect(s.bounds[k + 3], id).toBeLessThan(skin.bounds[k + 3]!); }
          if (id.endsWith('-l')) { const r = g(`${id.slice(0, -2)}-r`); expect(s.centroid[0] - r.centroid[0], id).toBeGreaterThan(0.01); expect(s.laterality).toBe('left'); expect(r.laterality).toBe('right'); }
          else if (!/-r$/.test(id)) expect(s.laterality, id).toBe('none');
        }
      });

      it('has the sex-specific items on one body only', () => {
        const other = body === 'female' ? ['bulbar-part-of-male-urethra', 'penile-part-of-male-urethra', 'bulbourethral-gland-l', 'rectovesical-pouch'] : ['breast-envelope-l', 'lactiferous-ducts-r', 'rectouterine-pouch', 'vesicouterine-pouch'];
        for (const id of other) expect(by.has(id), id).toBe(false);
        expect([...by.keys()].filter((i) => (body === 'male' ? /breast|lactiferous|cooper|rectouterine|vesicouterine/ : /bulbourethral|bulbar-part|penile-part|rectovesical/).test(i))).toEqual([]);
      });

      it('wraps and sits next to its real neighbours', () => {
        const within = (a: number[], b: number[], tol: number) => [0, 1, 2].every((k) => a[k]! >= b[k]! - tol && a[k + 3]! <= b[k + 3]! + tol);
        // the pericardial cavity lies between the heart and the fibrous pericardium shell
        expect(within(g('heart').bounds, g('pericardial-cavity').bounds, 0.0)).toBe(true);
        expect(within(g('pericardial-cavity').bounds, g('fibrous-pericardium').bounds, 0.0005)).toBe(true);
        // the sinuses lie within the pericardial sac, the transverse one above the oblique one
        for (const id of ['transverse-pericardial-sinus', 'oblique-pericardial-sinus']) expect(within(g(id).bounds, g('fibrous-pericardium').bounds, 0.0005), id).toBe(true);
        expect(g('transverse-pericardial-sinus').centroid[1]).toBeGreaterThan(g('oblique-pericardial-sinus').centroid[1]);
        // the omental bursa is behind the stomach and in front of the pancreas's front-to-back centre, in the upper abdomen
        const ob = g('omental-bursa'), st = g('stomach');
        expect(ob.centroid[2]).toBeLessThan(st.centroid[2]);
        expect(ob.centroid[1]).toBeGreaterThan(g('pancreas').bounds[1]); expect(ob.centroid[1]).toBeLessThan(st.bounds[4]);
        expect(Math.abs(ob.centroid[0] - st.centroid[0])).toBeLessThan(0.05);
        // retropubic space: behind the symphysis, in front of the bladder's centre, at the bladder's height
        const rp = g('retropubic-space'), sym = g('pubic-symphysis'), bl = g('urinary-bladder');
        expect(rp.centroid[2]).toBeLessThan(sym.centroid[2]); expect(rp.centroid[2]).toBeGreaterThan(g('rectum').centroid[2]);
        expect(rp.centroid[1]).toBeGreaterThan(bl.bounds[1]); expect(rp.centroid[1]).toBeLessThan(bl.bounds[4] + 0.02);
        // tympanic cavity: around the ossicles of its own side
        for (const s of ['l', 'r']) for (const o of ['malleus', 'incus', 'stapes']) { const c = g(`tympanic-cavity-${s}`), ossicle = g(`${o}-${s}`); expect(within(ossicle.bounds, c.bounds, 0.001), `${o}-${s}`).toBe(true); }
        if (body === 'male') {
          // rectovesical pouch between the rectum and the bladder, above the seminal glands
          const rv = g('rectovesical-pouch');
          expect(rv.centroid[2]).toBeLessThan(bl.centroid[2]); expect(rv.centroid[2]).toBeGreaterThan(g('rectum').bounds[2]); expect(rv.centroid[1]).toBeGreaterThan(g('seminal-gland-l').bounds[4] - 0.003);
        } else {
          const rv = g('rectouterine-pouch'), vu = g('vesicouterine-pouch'), ut = g('uterus');
          expect(rv.centroid[2]).toBeLessThan(ut.centroid[2]); expect(rv.centroid[2]).toBeGreaterThan(g('rectum').bounds[2]);
          expect(vu.centroid[2]).toBeGreaterThan(rv.centroid[2]); expect(vu.centroid[1]).toBeGreaterThan(bl.centroid[1]);
        }
      });

      if (body === 'male') it('splits the male urethra along the real urethra mesh and puts the glands beside the membranous part', () => {
        const mem = g('membranous-part-of-male-urethra'), bul = g('bulbar-part-of-male-urethra'), pen = g('penile-part-of-male-urethra'), nav = g('navicular-fossa-of-male-urethra'), ur = g('urethra');
        // membranous -> bulbar -> penile -> navicular go from the prostate towards the tip (up the penis, y falls then z rises)
        expect(mem.centroid[2]).toBeLessThan(bul.centroid[2]); expect(bul.centroid[2]).toBeLessThan(pen.centroid[2]); expect(pen.centroid[2]).toBeLessThan(nav.centroid[2]);
        for (const s of [bul, pen]) for (let k = 0; k < 3; k++) { expect(s.bounds[k]).toBeGreaterThan(ur.bounds[k]! - 0.012); expect(s.bounds[k + 3]).toBeLessThan(ur.bounds[k + 3]! + 0.012); }
        const l = g('bulbourethral-gland-l'), r = g('bulbourethral-gland-r');
        for (const [gl, sgn] of [[l, 1], [r, -1]] as const) {
          expect(sgn * (gl.centroid[0] - mem.centroid[0]), gl.id).toBeGreaterThan(0.006); expect(sgn * (gl.centroid[0] - mem.centroid[0]), gl.id).toBeLessThan(0.025);
          expect(Math.hypot(gl.centroid[1] - mem.centroid[1], gl.centroid[2] - mem.centroid[2]), gl.id).toBeLessThan(0.02);
          expect(gl.bounds[5] - gl.bounds[2], gl.id).toBeLessThan(0.014); // pea sized
        }
        // the ducts run from each gland to the bulbar urethra
        for (const s of ['l', 'r']) { const d = g(`duct-of-bulbourethral-gland-${s}`), gl = g(`bulbourethral-gland-${s}`); expect(Math.hypot(d.centroid[0] - gl.centroid[0], d.centroid[1] - gl.centroid[1], d.centroid[2] - gl.centroid[2])).toBeLessThan(0.02); }
      });

      if (body === 'female') it('builds the breast on the skin of the chest, in front of the pectoralis and ribs, anchored on the nipple', () => {
        for (const s of ['l', 'r']) {
          const env = g(`breast-envelope-${s}`), nip = g(`nipple-${s}`), areola = g(`areola-${s}`), gl = g(`mammary-gland-${s}`), pec = g(`pectoralis-major-${s}`);
          expect(env.provenance).toBe('generated'); expect(gl.provenance === 'hra' || gl.provenance === 'procedural').toBe(true);
          // the nipple lies within the plate's footprint and near the front of it
          expect(nip.centroid[0]).toBeGreaterThan(env.bounds[0]); expect(nip.centroid[0]).toBeLessThan(env.bounds[3]);
          expect(nip.centroid[1]).toBeGreaterThan(env.bounds[1]); expect(nip.centroid[1]).toBeLessThan(env.bounds[4]);
          expect(Math.abs(areola.centroid[0] - nip.centroid[0])).toBeLessThan(0.005);
          expect(env.bounds[5]).toBeLessThan(nip.bounds[5] + 0.015); expect(env.bounds[5]).toBeGreaterThan(nip.centroid[2]); // the plate's front is level with the nipple (it is anchored there)
          // in front of the pectoralis and over the real gland
          expect(env.centroid[2]).toBeGreaterThan(pec.centroid[2]); expect(env.centroid[2]).toBeGreaterThan(g('rib-cage').bounds[5] - 0.03);
          expect(Math.abs(env.centroid[0] - gl.centroid[0])).toBeLessThan(0.03); expect(Math.abs(env.centroid[1] - gl.centroid[1])).toBeLessThan(0.03);
          // ducts, Cooper's ligaments and tail
          const duct = g(`lactiferous-ducts-${s}`), coop = g(`suspensory-ligaments-of-breast-${s}`), tail = g(`axillary-tail-of-breast-${s}`);
          for (const p of [duct, coop]) { expect(p.bounds[0], p.id).toBeGreaterThan(env.bounds[0] - 0.01); expect(p.bounds[3], p.id).toBeLessThan(env.bounds[3] + 0.01); expect(p.bounds[1], p.id).toBeGreaterThan(env.bounds[1] - 0.01); expect(p.bounds[4], p.id).toBeLessThan(env.bounds[4] + 0.01); }
          expect(duct.bounds[5]).toBeGreaterThan(nip.bounds[2] - 0.01); // starts at the nipple
          expect(coop.bounds[5] - coop.bounds[2]).toBeGreaterThan(0.02); // spans from the chest wall towards the skin
          expect((s === 'l' ? 1 : -1) * (tail.centroid[0] - env.centroid[0])).toBeGreaterThan(0.02); // lateral, towards the axilla
          expect(tail.centroid[1]).toBeGreaterThan(env.centroid[1] - 0.01);
        }
        expect(g('breast-envelope-l').centroid[0] - g('breast-envelope-r').centroid[0]).toBeGreaterThan(0.08);
        expect(Math.abs(g('breast-envelope-l').centroid[1] - g('breast-envelope-r').centroid[1])).toBeLessThan(0.03);
      });
    });
  }
});
