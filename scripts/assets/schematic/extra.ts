/**
 * Second batch of schematic stand-ins, closing the gaps the audit still listed after the first
 * batch: cutaneous and small nerves, cranial ganglia, small arteries and veins, cardiac
 * conduction tissue, eyelids / tarsal plates / periorbita, tracheal rings, cuneiform cartilages,
 * vestibular folds, auricular cartilage, joint capsules with no scanned counterpart, three
 * tendons and the three main cranial sutures.
 *
 * All of it is GENERATED (provenance `generated`, category `schematic …`, name ends
 * "(schematic)"): each shape is placed from registered real structures of the same body and is
 * indicative only. Nothing here is counted as real anatomy.
 */
import { MeshBuilder, gridShell, sleeve, v, type Piece, type Pt, type V3 } from './geom';
import { nearest, points, slabMean, type openBody } from './io';
import { SIDES, branch, lerp, pt, tubeMesh, type Item } from './generate';

type Body = Awaited<ReturnType<typeof openBody>>;
type Side = (typeof SIDES)[number];

export async function generateExtra(b: Body, body: 'male' | 'female', items: Item[], ends: Record<string, V3>): Promise<void> {
  const cache = new Map<string, V3[]>();
  const has = (id: string) => !!b.info(id);
  const P = async (id: string): Promise<V3[]> => { let p = cache.get(id); if (!p) { const own = items.find((x) => x.id === id); p = points(own ? own.mesh : await b.mesh(id)); cache.set(id, p); } return p; };
  const C = (id: string): V3 => b.need(id).centroid as V3;
  void 0;
  const B = (id: string) => b.need(id).bounds;
  const add = (x: Omit<Item, 'side' | 'systems' | 'aliases'> & { side?: Item['side']; systems: Item['systems']; aliases?: string[] }) =>
    items.push({ side: 'none', ...x, name: `${x.name} (schematic)` } as Item);
  const radiusPath = (ps: V3[], r0: number, r1: number): Pt[] => ps.map((p, i) => pt(p, r0 + ((r1 - r0) * i) / Math.max(1, ps.length - 1)));
  const tube = (ps: V3[], r0: number, r1 = r0): Piece => tubeMesh([radiusPath(ps, r0, r1)]);
  const off = (p: V3, d: V3): V3 => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
  /** Average of the points in n equal bins along the structure's long axis, from the end nearest `near`. */
  const follow = (pts: V3[], n: number, near: V3, keep?: (p: V3) => boolean): V3[] => {
    const src = keep ? pts.filter(keep) : pts;
    const p0 = nearest(src, near);
    let p1 = p0, bd = -1; for (const q of src) { const d = v.len(v.sub(q, p0)); if (d > bd) { bd = d; p1 = q; } }
    const ax = v.norm(v.sub(p1, p0)), L = Math.max(1e-6, bd);
    const bins: V3[][] = Array.from({ length: n }, () => []);
    for (const q of src) { const t = v.dot(v.sub(q, p0), ax) / L; if (t >= 0 && t <= 1) bins[Math.min(n - 1, Math.floor(t * n))]!.push(q); }
    const out = bins.filter((x) => x.length).map((x) => x.reduce<V3>((a, q) => [a[0] + q[0] / x.length, a[1] + q[1] / x.length, a[2] + q[2] / x.length], [0, 0, 0]));
    return out.length >= 2 ? out : [p0, p1];
  };
  const pair = async (fn: (s: Side) => Promise<void>) => { for (const sd of SIDES) { try { await fn(sd); } catch (e) { console.warn(`schematic extra: skipped the rest of a ${sd[0]} block: ${String(e).slice(0, 120)}`); } } };
  const nerve = (id: string, name: string, s: Side, region: string, ps: V3[], r0 = 0.0009, r1 = 0.0006, aliases?: string[]) =>
    add({ id: `${id}-${s[2]}`, name: `${s[3]} ${name}`, side: s[0], systems: ['nervous'], region, category: 'schematic nerve', mesh: tube(ps, r0, r1), aliases: [name, ...(aliases ?? [])] });
  const vessel = (id: string, name: string, s: Side | null, region: string, ps: V3[], r0 = 0.001, r1 = 0.0007, aliases?: string[]) =>
    add({ id: s ? `${id}-${s[2]}` : id, name: s ? `${s[3]} ${name}` : name, side: s ? s[0] : 'none', systems: ['cardiovascular'], region, category: 'schematic vessel', mesh: tube(ps, r0, r1), aliases: [name, ...(aliases ?? [])] });
  const ganglion = (id: string, name: string, s: Side, p: V3, r = 0.0028, aliases?: string[]) => {
    const g = new MeshBuilder(); g.sphere(p, r, [1.4, 0.9, 1.1]);
    add({ id: `${id}-${s[2]}`, name: `${s[3]} ${name}`, side: s[0], systems: ['nervous'], region: 'head', category: 'schematic ganglion', mesh: g.build(), aliases: [name, ...(aliases ?? [])] });
  };
  const eamOuter = (s: Side): V3 => { const bb = B(`external-acoustic-meatus-${s[2]}`); return [s[1] > 0 ? bb[3] : bb[0], (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2]; };

  // ---- cutaneous and small nerves -------------------------------------------------------------------
  const occ = B('occipital-bone'), axis = C('axis-c2'), axisB = B('axis-c2'), hy = C('hyoid-bone'), thy = C('thyroid-cartilage');
  await pair(async (s) => {
    const [, sg, l] = s;
    const follow2 = async (art: string, n = 6, dz = 0.0018) => follow(await P(`${art}-${l}`), n, off(C(`${art}-${l}`), [0, 0.03, 0.02]), undefined).map((p) => off(p, [0, 0, dz]));
    nerve('supra-orbital-nerve', 'supra-orbital nerve', s, 'head', await follow2('supra-orbital-artery'));
    nerve('supratrochlear-nerve', 'supratrochlear nerve', s, 'head', await follow2('supratrochlear-artery'));
    nerve('lacrimal-nerve', 'lacrimal nerve', s, 'head', await follow2('lacrimal-artery', 5));
    nerve('infra-orbital-nerve', 'infra-orbital nerve', s, 'head', await follow2('infra-orbital-artery', 5));
    nerve('auriculotemporal-nerve', 'auriculotemporal nerve', s, 'head', await follow2('superficial-temporal-artery', 7, -0.002));
    const scl = C(`sclera-${l}`);
    nerve('infratrochlear-nerve', 'infratrochlear nerve', s, 'head', [off(scl, [-sg * 0.012, 0.011, -0.004]), off(scl, [-sg * 0.018, 0.009, 0.002]), off(scl, [-sg * 0.022, 0.004, 0.012])], 0.0006, 0.0005);
    const zyg = C(`zygomatic-bone-${l}`);
    nerve('zygomaticotemporal-nerve', 'zygomaticotemporal nerve', s, 'head', [off(zyg, [0, 0.003, -0.002]), off(zyg, [sg * 0.004, 0.014, -0.008]), off(zyg, [sg * 0.006, 0.028, -0.014])], 0.0006, 0.0005);
    nerve('zygomaticofacial-nerve', 'zygomaticofacial nerve', s, 'head', [off(zyg, [0, 0.002, 0.002]), off(zyg, [0, -0.004, 0.009]), off(zyg, [-sg * 0.002, -0.012, 0.012])], 0.0006, 0.0005);
    // cervical plexus cutaneous branches, from the schematic C2-C4 roots
    const c2 = ends[`c2-${l}`], c3 = ends[`c3-${l}`], c4 = ends[`c4-${l}`];
    const eam = eamOuter(s), scm = C(`sternocleidomastoid-muscle-${l}`);
    if (c3) nerve('great-auricular-nerve', 'great auricular nerve', s, 'neck', [c3, off(scm, [sg * 0.008, 0.02, 0.016]), off(eam, [sg * 0.004, -0.028, -0.01]), off(eam, [sg * 0.012, -0.004, -0.012])], 0.0012, 0.0008);
    if (c2) nerve('lesser-occipital-nerve', 'lesser occipital nerve', s, 'head', [c2, off(scm, [sg * 0.014, 0.05, -0.012]), [sg * 0.05, occ[1] + 0.05, occ[2] + 0.014]], 0.001, 0.0006);
    if (c3) nerve('transverse-cervical-nerve', 'transverse cervical nerve', s, 'neck', [c3, off(scm, [0, 0.0, 0.018]), [sg * 0.014, hy[1] - 0.022, hy[2] + 0.004]], 0.001, 0.0007);
    if (c4) {
      const cl = await P(`clavicle-${l}`).catch(() => [] as V3[]);
      if (cl.length) {
        const xs = cl.map((p) => p[0] * sg).sort((a, z) => a - z);
        ['medial', 'intermediate', 'lateral'].forEach((nm, k) => {
          const tx = xs[Math.floor(xs.length * (0.2 + 0.3 * k))]! * sg;
          const tp = nearest(cl, [tx, C(`clavicle-${l}`)[1], C(`clavicle-${l}`)[2]]);
          nerve(`${nm}-supraclavicular-nerve`, `${nm} supraclavicular nerve`, s, 'neck', [c4, lerp(c4, tp, 0.5), off(tp, [0, 0.004, 0.006])], 0.0008, 0.0006, ['supraclavicular nerves']);
        });
      }
    }
    // superior laryngeal nerve: from the vagus to the thyrohyoid membrane
    const vg = await P(`vagus-nerve-x-${l}`);
    const vs = nearest(vg, [sg * 0.018, hy[1] + 0.012, hy[2] - 0.02]);
    nerve('superior-laryngeal-nerve', 'superior laryngeal nerve', s, 'neck', [vs, off(vs, [-sg * 0.004, -0.002, 0.012]), [thy[0] + sg * 0.014, thy[1] + 0.012, thy[2] - 0.004]], 0.0011, 0.0008, ['internal laryngeal nerve', 'external laryngeal nerve']);
    // cervical cardiac nerves: sympathetic trunk (neck) to the cardiac plexus
    const arch = b.need('aortic-arch'), tr = await P(`sympathetic-trunk-${l}`);
    const t0 = nearest(tr, [sg * 0.02, arch.bounds[4] + 0.05, -0.0]);
    nerve('cervical-cardiac-nerves', 'cervical cardiac nerves', s, 'neck', [t0, off(t0, [-sg * 0.01, -0.03, 0.02]), [arch.centroid[0] + 0.003 + sg * 0.012, arch.bounds[1] - 0.002, arch.centroid[2] + 0.004]], 0.001, 0.0008);
    // intercostobrachial nerve: T2 to the medial arm
    const t2 = ends[`t2-${l}`], ax = await P(`axillary-artery-${l}`), mb = await P(`medial-brachial-cutaneous-nerve-${l}`);
    if (t2) nerve('intercostobrachial-nerve', 'intercostobrachial nerve', s, 'upper-limb', [t2, nearest(ax, t2), nearest(mb, nearest(ax, t2))], 0.001, 0.0007);
    // inferior gluteal nerve follows its artery
    nerve('inferior-gluteal-nerve', 'inferior gluteal nerve', s, 'pelvis', await follow2('inferior-gluteal-artery', 5, 0.002));
    // perineal branches, inferior anal nerve (pudendal) and lateral sural cutaneous nerve
    const pud = await P(`pudendal-nerve-${l}`), sph = C(`external-anal-sphincter-${l}`);
    const pl = pud.reduce((a, p) => (p[1] < a[1] ? p : a));
    nerve('inferior-anal-nerve', 'inferior anal nerve', s, 'pelvis', [nearest(pud, sph), lerp(nearest(pud, sph), sph, 0.5), sph], 0.0008, 0.0006, ['inferior rectal nerve']);
    nerve('perineal-nerve', 'perineal nerve', s, 'pelvis', [pl, off(pl, [-sg * 0.004, -0.008, 0.02]), off(pl, [-sg * 0.006, -0.014, 0.04])], 0.0009, 0.0006, ['perineal nerves']);
    if (body === 'male') {
      nerve('dorsal-nerve-of-penis', 'dorsal nerve of penis', s, 'pelvis', follow(await P(`dorsal-artery-of-penis-${l}`), 5, C('pubic-symphysis')).map((p) => off(p, [sg * 0.0012, 0.001, 0])), 0.0008, 0.0006);
    }
    const cf = await P(`common-fibular-nerve-${l}`), su = await P(`sural-nerve-${l}`);
    const cfTop = cf.reduce((a, p) => (p[1] > a[1] ? p : a)), suTop = su.reduce((a, p) => (p[1] > a[1] ? p : a));
    nerve('lateral-sural-cutaneous-nerve', 'lateral sural cutaneous nerve', s, 'lower-limb', [cfTop, off(cfTop, [sg * 0.014, -0.05, -0.004]), suTop], 0.0009, 0.0007);
    const s2 = ends[`s2-${l}`], gl = B(`gluteus-maximus-muscle-${l}`);
    if (s2) nerve('perforating-cutaneous-nerve', 'perforating cutaneous nerve', s, 'pelvis', [s2, [s2[0] + sg * 0.03, s2[1] - 0.03, gl[2] + 0.012], [s2[0] + sg * 0.05, gl[1] + 0.09, gl[2] + 0.004]], 0.0008, 0.0006);

    // cranial ganglia
    const sr = await P(`sensory-root-of-trigeminal-nerve-${l}`);
    ganglion('trigeminal-ganglion', 'trigeminal ganglion', s, sr.reduce((a, p) => (p[0] * sg > a[0] * sg ? p : a)), 0.0042, ['semilunar ganglion', 'gasserian ganglion']);
    ganglion('ciliary-ganglion', 'ciliary ganglion', s, off(nearest(await P(`optic-nerve-ii-${l}`), off(scl, [0, 0, -0.022])), [sg * 0.003, 0, 0]), 0.0018);
    ganglion('pterygopalatine-ganglion', 'pterygopalatine ganglion', s, nearest(await P(`maxillary-nerve-${l}`), off(zyg, [-sg * 0.01, -0.012, -0.03])), 0.0026, ['sphenopalatine ganglion']);
    const md = await P(`posterior-division-of-mandibular-nerve-${l}`);
    ganglion('otic-ganglion', 'otic ganglion', s, md.reduce((a, p) => (p[1] > a[1] ? p : a)), 0.0022);
    ganglion('submandibular-ganglion', 'submandibular ganglion', s, nearest(await P(`lingual-nerve-${l}`), off(C(`sublingual-gland-${l}`), [0, 0.004, -0.008])), 0.002);
    const ear = has(`scala-vestibuli-${l}`) ? C(`scala-vestibuli-${l}`) : eam;
    ganglion('geniculate-ganglion', 'geniculate ganglion', s, nearest(await P(`facial-nerve-vii-${l}`), ear), 0.0018);
  });

  // greater / third occipital nerves, from the back of C2 / C3 up over the occiput
  {
    const occP = await P('occipital-bone'), ax2 = B('axis-c2'), ax3 = B('vertebra-c3');
    for (const s of SIDES) {
      const [, sg, l] = s;
      const scalp = (y: number, x: number): V3 => { const c = occP.filter((p) => Math.abs(p[0] - x) < 0.012 && Math.abs(p[1] - y) < 0.008); return c.length ? c.reduce((a, p) => (p[2] < a[2] ? p : a)) : [x, y, occ[2]]; };
      const top = occ[4] - 0.012, mid = (occ[1] + occ[4]) / 2;
      nerve('greater-occipital-nerve', 'greater occipital nerve', s, 'head', [[sg * 0.012, ax2[1] + 0.006, ax2[2] - 0.001], off(scalp(occ[1] + 0.02, sg * 0.03), [0, 0, -0.001]), off(scalp(mid, sg * 0.03), [0, 0, -0.001]), off(scalp(top, sg * 0.028), [0, 0, -0.001])], 0.0013, 0.0008);
      nerve('third-occipital-nerve', 'third occipital nerve', s, 'neck', [[sg * 0.008, ax3[1] + 0.004, ax3[2] - 0.001], off(scalp(occ[1] + 0.012, sg * 0.014), [0, 0, -0.001]), off(scalp(occ[1] + 0.03, sg * 0.012), [0, 0, -0.001])], 0.0009, 0.0006);
    }
  }

  // ---- small arteries and veins ------------------------------------------------------------------------
  await pair(async (s) => {
    const [, sg, l] = s;
    const eca = await P(`external-carotid-artery-${l}`), eam = eamOuter(s);
    vessel('posterior-auricular-artery', 'posterior auricular artery', s, 'head', [nearest(eca, off(eam, [-sg * 0.01, -0.02, -0.02])), off(eam, [-sg * 0.004, -0.012, -0.02]), off(eam, [sg * 0.004, 0.012, -0.03])], 0.0011, 0.0007);
    const slg = C(`sublingual-gland-${l}`), ling = await P(`lingual-artery-${l}`);
    vessel('sublingual-artery', 'sublingual artery', s, 'head', [nearest(ling, slg), lerp(nearest(ling, slg), slg, 0.5), slg], 0.0008, 0.0006);
    vessel('superior-laryngeal-artery', 'superior laryngeal artery', s, 'neck', [nearest(eca, [thy[0] + sg * 0.02, thy[1] + 0.012, thy[2] - 0.004]), off(thy, [sg * 0.016, 0.012, -0.006]), off(thy, [sg * 0.012, 0.006, 0.002])], 0.0008, 0.0006);
    const ita = await P(`inferior-thyroid-artery-${l}`), v4 = C('vertebra-c4');
    vessel('ascending-cervical-artery', 'ascending cervical artery', s, 'neck', [ita.reduce((a, p) => (p[1] > a[1] ? p : a)), off(v4, [sg * 0.024, -0.006, 0.014]), off(v4, [sg * 0.022, 0.03, 0.012])], 0.0009, 0.0007);
    const sc = await P(`scapula-${l}`), tca = await P(`transverse-cervical-artery-${l}`);
    const scMed = sc.reduce((a, p) => (p[0] * sg < a[0] * sg ? p : a));
    vessel('dorsal-scapular-artery', 'dorsal scapular artery', s, 'back', [nearest(tca, scMed), lerp(nearest(tca, scMed), scMed, 0.5), scMed], 0.001, 0.0007);
    const pm = C(`sternocostal-head-of-pectoralis-major-muscle-${l}`), axa = await P(`axillary-artery-${l}`);
    vessel('thoracoacromial-artery', 'thoracoacromial artery', s, 'thorax', [nearest(axa, pm), lerp(nearest(axa, pm), pm, 0.5), pm], 0.0011, 0.0007);
    const rad = C(`radius-${l}`), uln = C(`ulna-${l}`), rb = B(`radius-${l}`), ci = await P(`common-interosseous-artery-${l}`);
    const ciLow = ci.reduce((a, p) => (p[1] < a[1] ? p : a));
    vessel('anterior-interosseous-artery', 'anterior interosseous artery', s, 'upper-limb', [ciLow, lerp(ciLow, [(rad[0] + uln[0]) / 2, rb[1] + 0.05, (rad[2] + uln[2]) / 2 + 0.004], 0.5), [(rad[0] + uln[0]) / 2, rb[1] + 0.05, (rad[2] + uln[2]) / 2 + 0.004]], 0.001, 0.0007);
    const ra = await P(`radial-artery-${l}`), m1 = B(`first-metacarpal-bone-${l}`), m2 = B(`second-metacarpal-bone-${l}`);
    const pp: V3 = [(m1[0] + m1[3]) / 2, m1[1] + 0.004, m1[5] + 0.003], ri: V3 = [(m2[0] + m2[3]) / 2, m2[1] + 0.004, m2[5] + 0.003];
    vessel('princeps-pollicis-artery', 'princeps pollicis artery', s, 'upper-limb', [nearest(ra, pp), lerp(nearest(ra, pp), pp, 0.5), pp], 0.0008, 0.0006);
    vessel('radialis-indicis-artery', 'radialis indicis artery', s, 'upper-limb', [nearest(ra, ri), lerp(nearest(ra, ri), ri, 0.5), ri], 0.0007, 0.0005);
    const mn = await P(`median-nerve-${l}`);
    vessel('median-artery', 'median artery', s, 'upper-limb', follow(mn, 5, C(`median-nerve-${l}`), (p) => p[1] < 0.3).map((p) => off(p, [0, 0, 0.002])), 0.0007, 0.0005);
    // iliac-crest branches
    const hip = await P(`hip-bone-${l}`), hb = B(`hip-bone-${l}`);
    const asis = hip.filter((p) => p[1] > hb[4] - 0.06).reduce((a, p) => (p[2] > a[2] ? p : a));
    const eia = await P(`external-iliac-artery-${l}`), fa = await P(`femoral-artery-${l}`);
    vessel('deep-circumflex-iliac-artery', 'deep circumflex iliac artery', s, 'pelvis', [nearest(eia, asis), lerp(nearest(eia, asis), asis, 0.5), off(asis, [sg * 0.004, 0.004, -0.004])], 0.001, 0.0007);
    vessel('superficial-circumflex-iliac-artery', 'superficial circumflex iliac artery', s, 'pelvis', [fa.reduce((a, p) => (p[1] > a[1] ? p : a)), off(asis, [-sg * 0.01, -0.012, 0.012]), off(asis, [sg * 0.004, -0.002, 0.014])], 0.0007, 0.0005);
    // intracranial
    const aica = await P(`anterior-inferior-cerebellar-artery-${l}`), ut = has(`utricle-${l}`) ? C(`utricle-${l}`) : eamOuter(s);
    vessel('labyrinthine-artery', 'labyrinthine artery', s, 'head', [nearest(aica, ut), lerp(nearest(aica, ut), ut, 0.55), ut], 0.0006, 0.0005, ['internal auditory artery']);
    const hornId = `inferior-horn-of-lateral-ventricle-${l}`, horn = C(hornId), ica = await P(`internal-carotid-artery-${l}`);
    vessel('anterior-choroidal-artery', 'anterior choroidal artery', s, 'head', [nearest(ica, horn), lerp(nearest(ica, horn), horn, 0.55), horn], 0.0008, 0.0005);
    // posterior spinal arteries along the back of the cord
    const cord = await P('spinal-cord'); const cy0 = Math.min(...cord.map((p) => p[1])), cy1 = Math.max(...cord.map((p) => p[1]));
    const path: V3[] = []; for (let y = cy1 - 0.01; y >= cy0 + 0.01; y -= 0.05) { const m = slabMean(cord, y, 0.006); path.push([m.c[0] + sg * 0.0035, y, m.min[2] + 0.0012]); }
    vessel('posterior-spinal-artery', 'posterior spinal artery', s, 'back', path, 0.0007, 0.0006);
    const thv = C(has(`third-ventricle-${l}`) ? `third-ventricle-${l}` : `third-ventricle-${l === 'l' ? 'r' : 'l'}`), ss = await P('straight-sinus'), tip = ss.reduce((a, p) => (p[2] > a[2] ? p : a));
    vessel('internal-cerebral-vein', 'internal cerebral vein', s, 'head', [off(thv, [sg * 0.002, 0.008, 0.016]), off(thv, [sg * 0.002, 0.012, 0.004]), lerp(off(thv, [0, 0.012, -0.004]), tip, 0.6), tip], 0.0014, 0.0016);
  });
  if (has('third-ventricle-r') || has('third-ventricle-l')) {
    const thv = C(has('third-ventricle-l') ? 'third-ventricle-l' : 'third-ventricle-r'), ss = await P('straight-sinus'), tip = ss.reduce((a, p) => (p[2] > a[2] ? p : a));
    vessel('great-cerebral-vein', 'Great cerebral vein', null, 'head', [[0, thv[1] + 0.012, thv[2] + 0.002], [0, thv[1] + 0.014, thv[2] + 0.012], tip], 0.002, 0.0024, ['vein of Galen']);
  }

  // ---- cardiac conduction ------------------------------------------------------------------------------
  const atr = B('cardiac-atrium-r'), sep = B('interventricular-septum');
  const sa: V3 = [atr[0] + 0.007, atr[4] - 0.006, (atr[2] + atr[5]) / 2];
  const av: V3 = [sep[0] + 0.003, sep[4] - 0.012, sep[2] + 0.012];
  const hisEnd: V3 = [av[0] + 0.008, av[1] - 0.012, av[2] + 0.006];
  const apex: V3 = [(sep[0] + sep[3]) / 2, sep[1] + 0.006, (sep[2] + sep[5]) / 2 + 0.01];
  const blob = (c: V3, r: number, sc: V3): Piece => { const g = new MeshBuilder(); g.sphere(c, r, sc); return g.build(); };
  add({ id: 'sinu-atrial-node', name: 'Sinu-atrial node', systems: ['cardiovascular'], region: 'thorax', category: 'schematic conduction', mesh: blob(sa, 0.0026, [0.6, 1.8, 0.6]), aliases: ['sinoatrial node', 'SA node', 'pacemaker'] });
  add({ id: 'atrioventricular-node', name: 'Atrioventricular node', systems: ['cardiovascular'], region: 'thorax', category: 'schematic conduction', mesh: blob(av, 0.0024, [1.2, 0.9, 0.9]), aliases: ['AV node'] });
  add({ id: 'atrioventricular-bundle', name: 'Atrioventricular bundle', systems: ['cardiovascular'], region: 'thorax', category: 'schematic conduction', mesh: tube([av, lerp(av, hisEnd, 0.5), hisEnd], 0.0014), aliases: ['bundle of His', 'His bundle'] });
  add({ id: 'right-bundle-branch', name: 'Right bundle branch', side: 'right', systems: ['cardiovascular'], region: 'thorax', category: 'schematic conduction', mesh: tube([hisEnd, [hisEnd[0] + 0.002, (hisEnd[1] + apex[1]) / 2, hisEnd[2] + 0.004], [apex[0] + 0.004, apex[1] + 0.004, apex[2]]], 0.0011, 0.0007), aliases: ['right crus of atrioventricular bundle'] });
  add({ id: 'left-bundle-branch', name: 'Left bundle branch', side: 'left', systems: ['cardiovascular'], region: 'thorax', category: 'schematic conduction', mesh: tube([hisEnd, [hisEnd[0] + 0.006, (hisEnd[1] + apex[1]) / 2, hisEnd[2] - 0.002], [apex[0] + 0.006, apex[1] + 0.002, apex[2] - 0.004]], 0.0013, 0.0008), aliases: ['left crus of atrioventricular bundle'] });

  // ---- eyelids, tarsal plates, periorbita -------------------------------------------------------------
  await pair(async (s) => {
    const [, sg, l] = s;
    const sb = B(`sclera-${l}`), ctr: V3 = [(sb[0] + sb[3]) / 2, (sb[1] + sb[4]) / 2, (sb[2] + sb[5]) / 2], R = Math.max(sb[3] - sb[0], sb[4] - sb[1]) / 2;
    const dirAt = (az: number, el: number): V3 => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    const lid = (up: boolean, rIn: number, thick: number, e0: number, e1: number, az: number): Piece => {
      const f = (r: number) => (u: number, w: number): V3 => { const a = (u - 0.5) * 2 * az, e = (up ? 1 : -1) * (e0 + (e1 - e0) * w); const d = dirAt(a, e); return [ctr[0] + d[0] * r, ctr[1] + d[1] * r, ctr[2] + d[2] * r]; };
      return gridShell(f(rIn + thick), f(rIn), 10, 5);
    };
    for (const up of [true, false]) {
      const nm = up ? 'upper' : 'lower';
      add({ id: `${nm}-eyelid-${l}`, name: `${s[3]} ${nm} eyelid`, side: s[0], systems: ['nervous'], region: 'head', category: 'schematic eye', mesh: lid(up, R + 0.0004, 0.0018, 0.03, 0.95, 0.85), aliases: [`${nm} eyelid`, 'palpebra', `Palpebra ${up ? 'superior' : 'inferior'}`, 'eyelid'] });
      add({ id: `${nm}-tarsal-plate-${l}`, name: `${s[3]} ${nm} tarsal plate`, side: s[0], systems: ['nervous'], region: 'head', category: 'schematic eye', mesh: lid(up, R + 0.0022, 0.0012, 0.04, up ? 0.3 : 0.22, 0.72), aliases: [`tarsal plate of ${nm} eyelid`, 'tarsus', `Tarsus ${up ? 'superior' : 'inferior'}`] });
    }
    // periorbita: an open sleeve from the orbital rim back to the apex, around the eyeball and muscles
    const apex: V3 = [ctr[0] - sg * 0.012, ctr[1] - 0.004, ctr[2] - 0.042];
    const axisV = v.sub(ctr, apex);
    add({ id: `periorbita-${l}`, name: `${s[3]} periorbita`, side: s[0], systems: ['nervous'], region: 'head', category: 'schematic eye', mesh: sleeve(lerp(apex, ctr, 0.55), axisV, v.len(axisV) * 1.05, 0.0205, 0.0006, [1.0, 1.0]), aliases: ['orbital periosteum', 'Periorbita'] });
  });

  // ---- larynx, trachea, ear, sutures ---------------------------------------------------------------------------
  {
    const tr = await P('trachea'); const tb = b.need('trachea').bounds; const ty0 = tb[4] - 0.012, nRing = 16;
    const paths: Pt[][] = [];
    for (let k = 0; k < nRing; k++) {
      const y = ty0 - k * ((tb[4] - tb[1] - 0.03) / nRing), m = slabMean(tr, y, 0.004);
      const cx = (m.min[0] + m.max[0]) / 2, cz = (m.min[2] + m.max[2]) / 2, rx = (m.max[0] - m.min[0]) / 2 + 0.0008, rz = (m.max[2] - m.min[2]) / 2 + 0.0008;
      const ring: Pt[] = []; for (let i = 0; i <= 18; i++) { const a = (0.22 + (i / 18) * (2 * Math.PI - 0.44)) + Math.PI / 2; ring.push(pt([cx + rx * Math.cos(a), y, cz + rz * Math.sin(a)], 0.0011)); }
      paths.push(ring);
    }
    add({ id: 'tracheal-cartilages', name: 'Tracheal cartilages', systems: ['respiratory'], region: 'neck', category: 'schematic cartilage', mesh: tubeMesh(paths, 5, 0.0035), aliases: ['tracheal rings', 'cartilagines tracheales', 'C-shaped rings of trachea'] });
  }
  await pair(async (s) => {
    const [, sg, l] = s;
    const ar = C(`arytenoid-cartilage-${l}`), th = B('thyroid-cartilage');
    const cn = new MeshBuilder(); cn.sphere(off(ar, [-sg * 0.0005, 0.0055, 0.0045]), 0.0016, [0.8, 1.4, 0.8]);
    add({ id: `cuneiform-cartilage-${l}`, name: `${s[3]} cuneiform cartilage`, side: s[0], systems: ['respiratory'], region: 'neck', category: 'schematic cartilage', mesh: cn.build(), aliases: ['cuneiform cartilage', 'cartilago cuneiformis', 'cartilage of Wrisberg'] });
    const front: V3 = [sg * 0.0025, (th[1] + th[4]) / 2 + 0.006, th[5] - 0.006];
    const top = off(ar, [0, 0.002, 0.0]);
    add({ id: `vestibular-fold-${l}`, name: `${s[3]} vestibular fold`, side: s[0], systems: ['respiratory'], region: 'neck', category: 'schematic ligament', mesh: tube([front, lerp(front, top, 0.5), top], 0.0019, 0.0024), aliases: ['false vocal cord', 'ventricular fold', 'plica vestibularis'] });
    // auricular cartilage: a cupped, flattened ellipse behind the external acoustic meatus
    const eam = eamOuter(s), H = 0.032, W = 0.018;
    const surf = (t: number) => (u: number, w: number): V3 => { const a = (u - 0.5) * 2, z = (w - 0.5) * 2; const rr = Math.sqrt(a * a + z * z) > 1 ? 1 / Math.sqrt(a * a + z * z) : 1; const aa = a * rr, zz = z * rr; return [eam[0] + sg * (0.010 + 0.006 * (aa * aa + zz * zz) + t), eam[1] + 0.004 + zz * H, eam[2] - 0.022 + aa * W]; };
    add({ id: `auricular-cartilage-${l}`, name: `${s[3]} auricular cartilage`, side: s[0], systems: ['skeletal', 'connective'], region: 'head', category: 'schematic cartilage', mesh: gridShell(surf(0.0016), surf(0), 8, 10), aliases: ['ear cartilage', 'cartilago auriculae', 'pinna', 'auricle', 'ear'] });
  });
  {
    // cranial sutures: the sagittal, coronal and lambdoid lines on the parietal bones
    const pl = await P('parietal-bone-l'), pr = await P('parietal-bone-r'), pp = [...pl, ...pr];
    const zs = pp.map((p) => p[2]), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const sag: V3[] = []; for (let z = z0 + 0.004; z <= z1 - 0.004; z += (z1 - z0 - 0.008) / 10) { const c = pp.filter((p) => Math.abs(p[0]) < 0.006 && Math.abs(p[2] - z) < 0.006); if (c.length) sag.push(c.reduce((a, p) => (p[1] > a[1] ? p : a))); }
    const xs = pp.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const edge = (front: boolean): V3[] => { const out: V3[] = []; for (let x = x0 + 0.004; x <= x1 - 0.004; x += (x1 - x0 - 0.008) / 14) { const c = pp.filter((p) => Math.abs(p[0] - x) < 0.005 && p[1] > (Math.min(...pp.map((q) => q[1])) + 0.03)); if (c.length) out.push(c.reduce((a, p) => ((front ? p[2] > a[2] : p[2] < a[2]) ? p : a))); } return out; };
    const skinTop = b.need('skin').bounds[4] - 0.004;
    const mk = (id: string, name: string, ps0: V3[], aliases: string[]) => {
      // the fitted Z-Anatomy skull can poke a few mm through the HRA skin at the vertex; keep the line inside the body
      const ps = ps0.map((p): V3 => [p[0], Math.min(p[1], skinTop), p[2]]); if (ps.length >= 4) add({ id, name, systems: ['skeletal', 'connective'], region: 'head', category: 'schematic suture', mesh: tube(ps, 0.0008), aliases }); };
    mk('sagittal-suture', 'Sagittal suture', sag, ['sutura sagittalis', 'cranial suture']);
    mk('coronal-suture', 'Coronal suture', edge(true), ['sutura coronalis', 'cranial suture']);
    mk('lambdoid-suture', 'Lambdoid suture', edge(false), ['sutura lambdoidea', 'cranial suture']);
  }

  // ---- thoracic duct, middle-ear muscles, vocal folds, dorsal nerve of clitoris ----------------------------------------------
  {
    const aoP = [...(await P('thoracic-aorta')), ...(await P('abdominal-aorta'))], lbv = await P('left-brachiocephalic-vein');
    const y0 = C('vertebra-l1')[1] + 0.01, y1 = C('vertebra-t5')[1];
    const duct: V3[] = [];
    for (let y = y0; y <= y1; y += (y1 - y0) / 8) { const m = slabMean(aoP, y, 0.008); if (!Number.isFinite(m.min[0])) continue; duct.push([m.min[0] - 0.004, y, m.c[2] - 0.004]); }
    const venous = lbv.reduce((a, p) => (p[1] > a[1] ? p : a));
    const up = [duct[duct.length - 1]!, [0.004, y1 + 0.03, duct[duct.length - 1]![2] + 0.004] as V3, [0.012, (y1 + venous[1]) / 2 + 0.02, venous[2] - 0.006] as V3, venous];
    add({ id: 'thoracic-duct', name: 'Thoracic duct', systems: ['lymphatic'], region: 'thorax', category: 'schematic vessel', mesh: tubeMesh([radiusPath([...duct, ...up.slice(1)], 0.0021, 0.0026)]), aliases: ['ductus thoracicus', 'left lymphatic duct', 'cisterna chyli'] });
  }
  await pair(async (s) => {
    const [, sg, l] = s;
    const mal = C(`malleus-${l}`), stp = C(`stapes-${l}`);
    const dirT = v.norm([-sg * 0.6, -0.15, 0.75]), dirS = v.norm([-sg * 0.05, -0.05, -0.95]);
    add({ id: `tensor-tympani-${l}`, name: `${s[3]} tensor tympani`, side: s[0], systems: ['muscular'], region: 'head', category: 'schematic muscle', mesh: tube([mal, off(mal, [dirT[0] * 0.01, dirT[1] * 0.01, dirT[2] * 0.01]), off(mal, [dirT[0] * 0.022, dirT[1] * 0.022, dirT[2] * 0.022])], 0.0006, 0.0011), aliases: ['tensor tympani muscle', 'musculus tensor tympani'] });
    add({ id: `stapedius-${l}`, name: `${s[3]} stapedius`, side: s[0], systems: ['muscular'], region: 'head', category: 'schematic muscle', mesh: tube([stp, off(stp, [dirS[0] * 0.004, dirS[1] * 0.004, dirS[2] * 0.004]), off(stp, [dirS[0] * 0.009, dirS[1] * 0.009, dirS[2] * 0.009])], 0.0004, 0.0009), aliases: ['stapedius muscle', 'musculus stapedius'] });
    const ar = C(`arytenoid-cartilage-${l}`), th = B('thyroid-cartilage');
    const front: V3 = [sg * 0.0025, (th[1] + th[4]) / 2 - 0.003, th[5] - 0.006], back = off(ar, [0, -0.001, 0.0005]);
    add({ id: `vocal-fold-${l}`, name: `${s[3]} vocal fold`, side: s[0], systems: ['respiratory'], region: 'neck', category: 'schematic ligament', mesh: tube([front, lerp(front, back, 0.5), back], 0.0016, 0.0019), aliases: ['vocal cord', 'true vocal cord', 'plica vocalis', 'vocal ligament'] });
    if (body === 'female') {
      const pud = await P(`pudendal-nerve-${l}`), sym = B('pubic-symphysis');
      const a = pud.reduce((q, p) => (p[1] < q[1] ? p : q)), tip: V3 = [sg * 0.004, sym[1] - 0.004, sym[5] + 0.004];
      nerve('dorsal-nerve-of-clitoris', 'dorsal nerve of clitoris', s, 'pelvis', [a, lerp(a, tip, 0.5), tip], 0.0008, 0.0006);
    }
  });

  // ---- joint capsules with no scanned counterpart and three tendons -------------------------------------------------------
  {
    // facet (zygapophyseal) joints: one small capsule per side at each of the 23 segments C2/3 .. L5/S1
    const cord = await P('spinal-cord'), cauda = await P('cauda-equina'), canal = [...cord, ...cauda];
    const levels = ['c2-c3', 'c3-c4', 'c4-c5', 'c5-c6', 'c6-c7', 'c7-t1', ...Array.from({ length: 11 }, (_, i) => `t${i + 1}-t${i + 2}`), 't12-l1', 'l1-l2', 'l2-l3', 'l3-l4', 'l4-l5', 'l5-s1'];
    for (const lv of levels) {
      const d = C(`intervertebral-disc-${lv}`), c = slabMean(canal, d[1], 0.012).c;
      const [a, z2] = lv.split('-') as [string, string];
      for (const s of SIDES) {
        const cer = a.startsWith('c'), lum = a.startsWith('l');
        const ctr: V3 = [c[0] + s[1] * (cer ? 0.017 : lum ? 0.016 : 0.019), d[1] + 0.001, c[2] - (cer ? 0.001 : lum ? 0.006 : 0.004)];
        add({ id: `facet-joint-capsule-${lv}-${s[2]}`, name: `${s[3]} zygapophysial joint capsule ${a.toUpperCase()}/${z2.toUpperCase()}`, side: s[0], systems: ['connective'], region: 'back', category: 'schematic capsule', mesh: sleeve(ctr, [0, 1, 0], 0.007, 0.0045, 0.0008, [1.2, 1.0]), aliases: ['facet joint capsule', 'articular capsule of zygapophysial joint', `${a.toUpperCase()}-${z2.toUpperCase()} facet joint`] });
      }
    }
    const at = B('atlas-c1');
    for (const s of SIDES) {
      const x = s[1] * 0.0175, z = (at[2] + at[5]) / 2;
      add({ id: `atlanto-occipital-joint-capsule-${s[2]}`, name: `${s[3]} atlanto-occipital joint capsule`, side: s[0], systems: ['connective'], region: 'neck', category: 'schematic capsule', mesh: sleeve([x, at[4] - 0.0005, z], [0, 1, 0], 0.004, 0.0075, 0.0008, [1.5, 0.9]), aliases: ['articular capsule of atlanto-occipital joint', 'capsula articularis atlanto-occipitalis'] });
      add({ id: `lateral-atlanto-axial-joint-capsule-${s[2]}`, name: `${s[3]} lateral atlanto-axial joint capsule`, side: s[0], systems: ['connective'], region: 'neck', category: 'schematic capsule', mesh: sleeve([x, at[1] + 0.0008, z], [0, 1, 0], 0.004, 0.0075, 0.0008, [1.4, 0.9]), aliases: ['articular capsule of lateral atlanto-axial joint', 'capsula articularis atlantoaxialis lateralis'] });
    }
    await pair(async (s) => {
      const [, sg, l] = s;
      // sacro-iliac joint: a flat sleeve between the sacrum and the ilium
      const sacP = await P('sacrum'), hipP = await P(`hip-bone-${l}`);
      const aS = nearest(sacP, C(`hip-bone-${l}`)), aH = nearest(hipP, C('sacrum')), mid = lerp(aS, aH, 0.5);
      add({ id: `sacroiliac-joint-capsule-${l}`, name: `${s[3]} sacro-iliac joint capsule`, side: s[0], systems: ['connective'], region: 'pelvis', category: 'schematic capsule', mesh: sleeve([mid[0], mid[1] + 0.012, mid[2]], [0, 1, 0], 0.06, 0.013, 0.0012, [2.4, 0.45]), aliases: ['sacroiliac joint capsule', 'articular capsule of sacroiliac joint', 'capsula articularis sacroiliaca'] });
      // ankle (talocrural) capsule
      const tl = B(`talus-${l}`);
      add({ id: `talocrural-joint-capsule-${l}`, name: `${s[3]} talocrural joint capsule`, side: s[0], systems: ['connective'], region: 'lower-limb', category: 'schematic capsule', mesh: sleeve([(tl[0] + tl[3]) / 2, tl[4] - 0.002, (tl[2] + tl[5]) / 2 + 0.002], [0, 1, 0], 0.03, 0.0235, 0.0012, [1.3, 0.95]), aliases: ['ankle joint capsule', 'articular capsule of ankle joint', 'capsula articularis talocruralis'] });
      // tendons: quadriceps, distal biceps brachii, triceps brachii
      const rf = await P(`rectus-femoris-muscle-${l}`), pat = await P(`patella-${l}`);
      const rfLow = rf.reduce((a, p) => (p[1] < a[1] ? p : a)), patTop = pat.reduce((a, p) => (p[1] > a[1] ? p : a));
      add({ id: `quadriceps-tendon-${l}`, name: `${s[3]} quadriceps tendon`, side: s[0], systems: ['muscular'], region: 'lower-limb', category: 'schematic tendon', mesh: tube([rfLow, lerp(rfLow, patTop, 0.5), patTop], 0.0055, 0.0045), aliases: ['tendon of quadriceps femoris', 'tendo musculi quadricipitis femoris'] });
      const bic = await P(`biceps-brachii-${l}`), rad = await P(`radius-${l}`);
      const bLow = bic.reduce((a, p) => (p[1] < a[1] ? p : a)), rT = nearest(rad, off(bLow, [0, -0.012, 0.004]));
      add({ id: `distal-biceps-tendon-${l}`, name: `${s[3]} distal biceps brachii tendon`, side: s[0], systems: ['muscular'], region: 'upper-limb', category: 'schematic tendon', mesh: tube([bLow, lerp(bLow, rT, 0.5), rT], 0.0035, 0.003), aliases: ['tendon of biceps brachii', 'biceps tendon'] });
      const tri = await P(`long-head-of-triceps-brachii-${l}`), ul = await P(`ulna-${l}`);
      const tLow = tri.reduce((a, p) => (p[1] < a[1] ? p : a)), uT = ul.reduce((a, p) => (p[1] > a[1] ? p : a));
      add({ id: `triceps-tendon-${l}`, name: `${s[3]} triceps brachii tendon`, side: s[0], systems: ['muscular'], region: 'upper-limb', category: 'schematic tendon', mesh: tube([tLow, lerp(tLow, uT, 0.5), uT], 0.0045, 0.0035), aliases: ['tendon of triceps brachii', 'triceps tendon'] });
    });
  }
  void branch;
}
