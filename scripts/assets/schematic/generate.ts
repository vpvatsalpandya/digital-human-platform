/**
 * Schematic stand-ins: structures that no open scan in our sources provides (31 named spinal
 * nerve pairs, cervical / lumbar / sacral plexuses, autonomic plexuses and ganglia, vagus and
 * splanchnic branches, the four third molars, small vessel branches).
 *
 * Everything here is GENERATED. Each piece is a tube or blob placed from the positions of real,
 * already-registered structures of the same body (vertebrae, discs, spinal cord, vessels,
 * organs). Courses are indicative, not measured anatomy, and the manifest marks every one as
 * provenance `generated`, category `schematic …`, so the UI labels them and no count treats
 * them as real anatomy.
 */
import { MeshBuilder, v, type Piece, type Pt, type V3 } from './geom';
import { nearest, points, slabMean, type openBody } from './io';

type Body = Awaited<ReturnType<typeof openBody>>;
export interface Item {
  id: string; name: string; aliases?: string[]; side: 'left' | 'right' | 'none';
  systems: ('nervous' | 'cardiovascular' | 'skeletal' | 'digestive')[]; region: string; category: SchematicCategory; mesh: Piece;
}
export const SCHEMATIC_CATEGORIES = ['schematic nerve', 'schematic plexus', 'schematic ganglion', 'schematic vessel', 'schematic tooth'] as const;
export type SchematicCategory = (typeof SCHEMATIC_CATEGORIES)[number];

const SIDES = [['left', 1, 'l', 'Left'], ['right', -1, 'r', 'Right']] as const;
const pt = (p: V3, r: number): Pt => ({ p, r });
const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const R_SPINAL = 0.0014;

function tubeMesh(paths: Pt[][], sides = 6, step = 0.003): Piece {
  const b = new MeshBuilder();
  for (const p of paths) b.tube(p, { sides, step });
  return b.build();
}
/** A gently bowed branch from `a` to `b` (bow is a fraction of the length, perpendicular to the run). */
function branch(a: V3, b: V3, r0: number, r1: number, bow = 0.18, out: V3 = [0, 0, 1]): Pt[] {
  const d = v.sub(b, a), L = v.len(d) || 1e-3;
  let side = v.cross(v.norm(d), out); if (v.len(side) < 0.1) side = v.cross(v.norm(d), [1, 0, 0]);
  const m = v.add(lerp(a, b, 0.5), v.mul(v.norm(side), L * bow));
  return [pt(a, r0), pt(lerp(a, m, 0.5), (r0 + r1) / 2 + 1e-5), pt(m, (r0 + r1) / 2), pt(lerp(m, b, 0.5), (r0 + 2 * r1) / 3), pt(b, r1)];
}

export async function generate(b: Body, body: 'male' | 'female'): Promise<Item[]> {
  const items: Item[] = [];
  const id = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const P = async (name: string) => points(await b.mesh(name));
  const S = (name: string) => b.need(name);

  // ---- spine, cord and canal ------------------------------------------------------------
  const cord = await P('spinal-cord'), cauda = await P('cauda-equina'), sacrum = await P('sacrum'), coccyx = await P('coccyx');
  const cordBot = Math.min(...cord.map((p) => p[1])), cordTop = Math.max(...cord.map((p) => p[1]));
  const canal = (y: number): V3 => (y >= cordBot ? slabMean(cord, y, 0.006).c : slabMean(cauda, y, 0.012).c);
  const disc = (n: string) => S(`intervertebral-disc-${n}`);
  const vert = (n: string) => S(`vertebra-${n}`);
  const atlas = S('atlas-c1'), axis = S('axis-c2');

  const levels: { key: string; label: string; region: 'c' | 't' | 'l' | 's' | 'co'; yf: number; yo: number }[] = [];
  const cFor = ['atlas', 'c1c2', 'c2-c3', 'c3-c4', 'c4-c5', 'c5-c6', 'c6-c7', 'c7-t1'];
  for (let i = 0; i < 8; i++) {
    const yf = i === 0 ? atlas.centroid[1] + 0.004 : i === 1 ? (atlas.centroid[1] + axis.centroid[1]) / 2 : disc(cFor[i]!).centroid[1];
    levels.push({ key: `c${i + 1}`, label: `C${i + 1}`, region: 'c', yf, yo: Math.min(cordTop - 0.004, yf + 0.004 + i * 0.002) });
  }
  const tDisc = ['t1-t2', 't2-t3', 't3-t4', 't4-t5', 't5-t6', 't6-t7', 't7-t8', 't8-t9', 't9-t10', 't10-t11', 't11-t12', 't12-l1'];
  tDisc.forEach((d, i) => { const yf = disc(d).centroid[1]; levels.push({ key: `t${i + 1}`, label: `T${i + 1}`, region: 't', yf, yo: yf + 0.012 + i * 0.0038 }); });
  const lDisc = ['l1-l2', 'l2-l3', 'l3-l4', 'l4-l5', 'l5-s1'];
  lDisc.forEach((d, i) => { const yf = disc(d).centroid[1]; levels.push({ key: `l${i + 1}`, label: `L${i + 1}`, region: 'l', yf, yo: cordBot + 0.05 - i * 0.008 }); });
  const sacTop = Math.max(...sacrum.map((p) => p[1])), sacBot = Math.min(...sacrum.map((p) => p[1]));
  [0.17, 0.37, 0.56, 0.74].forEach((f, i) => levels.push({ key: `s${i + 1}`, label: `S${i + 1}`, region: 's', yf: sacTop - f * (sacTop - sacBot), yo: cordBot + 0.008 - i * 0.0015 }));
  levels.push({ key: 's5', label: 'S5', region: 's', yf: sacBot + 0.006, yo: cordBot + 0.002 });
  levels.push({ key: 'co1', label: 'Co1', region: 'co', yf: Math.max(...coccyx.map((p) => p[1])) - 0.004, yo: cordBot });

  const rib = await P('rib-cage');
  const ribAt = (y: number) => slabMean(rib, y, 0.006);
  const brachial: Record<string, V3[]> = {};
  const trunkPts: Record<string, V3[]> = {}, vagus: Record<string, V3[]> = {};
  for (const [, , s] of SIDES) { brachial[s] = await P(`roots-of-brachial-plexus-${s}`); trunkPts[s] = await P(`sympathetic-trunk-${s}`); vagus[s] = await P(`vagus-nerve-x-${s}`); }
  const targets: Record<string, Record<string, V3[]>> = {};
  for (const [, , s] of SIDES) targets[s] = { iliohypogastric: await P(`iliohypogastric-nerve-${s}`), genitofemoral: await P(`genitofemoral-nerve-${s}`), femoral: await P(`femoral-nerve-${s}`), obturator: await P(`obturator-nerve-${s}`), sciatic: await P(`sciatic-nerve-${s}`), pudendal: await P(`pudendal-nerve-${s}`) };
  const sacHalf = (y: number) => { const m = slabMean(sacrum, y, 0.008); return { c: m.c, hw: (m.max[0] - m.min[0]) / 2, zAnt: m.max[2] }; };

  // ---- 31 spinal nerve pairs -------------------------------------------------------------
  const ends: Record<string, V3> = {}; // distal end of each nerve, per side, for the plexuses
  const nerveMid: Record<string, V3> = {};
  for (const [side, sg, s, Side] of SIDES) {
    for (const lv of levels) {
      const o = canal(lv.yo);
      const yo = Math.max(cordBot - 0.0, lv.yo);
      const P0: V3 = [o[0] + sg * 0.0035, yo, o[2]];
      const c = canal(lv.yf);
      let F: V3, tail: V3[];
      if (lv.region === 's' || lv.region === 'co') {
        const sh = sacHalf(lv.yf);
        F = lv.region === 'co' || lv.key === 's5' ? [sh.c[0] + sg * 0.004, lv.yf, sh.zAnt - 0.002] : [sh.c[0] + sg * sh.hw * 0.3, lv.yf, sh.zAnt - 0.004];
        const sciaticTop = targets[s]!.sciatic!.reduce((a, p) => (p[1] > a[1] ? p : a));
        const drift = lv.region === 'co' ? 0.006 : 0.028;
        const end: V3 = lv.key === 's5' || lv.region === 'co' ? [F[0] + sg * 0.008, F[1] - 0.012, F[2] + 0.006] : lerp([F[0] + sg * 0.012, F[1] - 0.008, F[2] + drift], sciaticTop, 0.35);
        tail = [lerp(F, end, 0.4), end];
      } else if (lv.region === 'c') {
        F = [c[0] + sg * 0.014, lv.yf, c[2] + 0.005];
        const first: V3 = [F[0] + sg * 0.014, F[1] - 0.002 - lv.yf * 0, F[2] + 0.006];
        let end: V3 = [F[0] + sg * 0.03, F[1] - 0.01, F[2] + 0.02];
        if (lv.label === 'C5' || lv.label === 'C6' || lv.label === 'C7' || lv.label === 'C8') {
          const roots = brachial[s]!; const n = nearest(roots, [F[0] + sg * 0.02, F[1] - 0.006, F[2] + 0.008]);
          if (v.len(v.sub(n, F)) < 0.06) end = n;
        }
        tail = [first, lerp(first, end, 0.55), end];
      } else if (lv.region === 't') {
        const idx = Number(lv.label.slice(1)) - 1;
        F = [c[0] + sg * 0.014, lv.yf, c[2] + 0.005];
        // Follow the rib cage: an arc along the inside of the ribs, from the back towards the front.
        const rc = ribAt(lv.yf);
        const cx = (rc.min[0] + rc.max[0]) / 2, zc = (rc.min[2] + rc.max[2]) / 2;
        const a = Math.max(0.05, (rc.max[0] - rc.min[0]) / 2 - 0.012), bz = Math.max(0.04, (rc.max[2] - rc.min[2]) / 2 - 0.012);
        const th0 = Math.atan2((F[2] - zc) / bz, (F[0] - cx) / a * sg);
        const sweep = idx === 0 ? 0.55 : 0.85 + Math.min(idx, 9) * 0.04;
        const arc: V3[] = [];
        const drop = idx === 0 ? 0.006 : 0.016 + idx * 0.0018;
        for (let k = 1; k <= 5; k++) {
          const t = k / 5, th = th0 + (th0 < 0 ? 1 : -1) * 0; // th0 is negative towards the back; sweep forward
          const ang = th + sweep * t * (Math.PI / 2) * 1.0;
          arc.push([cx + sg * a * Math.cos(ang), F[1] - drop * t, zc + bz * Math.sin(ang)]);
        }
        tail = [lerp(F, arc[0]!, 0.5), ...arc];
      } else {
        // lumbar: out of the foramen, down and forward into psoas, then to the nearest real branch nerve
        F = [c[0] + sg * 0.016, lv.yf, c[2] + 0.006];
        const want = ['iliohypogastric', 'genitofemoral', 'femoral', 'obturator', 'sciatic'][Number(lv.label.slice(1)) - 1]!;
        const reach: V3 = [F[0] + sg * 0.03, F[1] - 0.03, F[2] + 0.03];
        const n = nearest(targets[s]![want]!, reach);
        const end = v.len(v.sub(n, reach)) < 0.07 ? n : reach;
        tail = [[F[0] + sg * 0.012, F[1] - 0.006, F[2] + 0.008], lerp([F[0] + sg * 0.012, F[1] - 0.006, F[2] + 0.008], end, 0.6), end];
      }
      // Intra-spinal part: from the cord (or cauda equina) to the foramen, staying in the canal.
      const mid: V3[] = [];
      const nMid = 3;
      for (let k = 1; k <= nMid; k++) {
        const y = yo + (F[1] - yo) * (k / (nMid + 1)); const cc = canal(y);
        const lat = 0.0035 + (0.0105 * k) / (nMid + 1);
        mid.push([cc[0] + sg * (lv.region === 'c' || lv.region === 't' ? lat : 0.004 + 0.003 * (k / 4)), y, cc[2] + 0.002 * (k / 4)]);
      }
      const ctrl = [P0, ...mid, F, ...tail];
      const path: Pt[] = ctrl.map((p, i) => pt(p, R_SPINAL * (i < ctrl.length - 2 ? 0.8 + 0.2 * (i / ctrl.length) : 1.15)));
      ends[`${lv.key}-${s}`] = ctrl[ctrl.length - 1]!;
      nerveMid[`${lv.key}-${s}`] = F;
      items.push({
        id: `spinal-nerve-${lv.key}-${s}`, name: `${Side} spinal nerve ${lv.label} (schematic)`, aliases: [`${lv.label} nerve`, `${lv.label} spinal nerve`, `${Side.toLowerCase()} ${lv.label}`, `spinal nerve ${lv.label}`],
        side, systems: ['nervous'], region: 'back', category: 'schematic nerve', mesh: tubeMesh([path]),
      });
    }
  }

  // ---- plexuses --------------------------------------------------------------------------
  for (const [side, sg, s, Side] of SIDES) {
    // cervical plexus: loops joining C1–C4
    const c = (k: string) => ends[`${k}-${s}`]!;
    const loops = [pt(c('c1'), 0.0022), pt(lerp(c('c1'), c('c2'), 0.5), 0.0024), pt(c('c2'), 0.0026), pt(lerp(c('c2'), c('c3'), 0.5), 0.0026), pt(c('c3'), 0.0026), pt(lerp(c('c3'), c('c4'), 0.5), 0.0026), pt(c('c4'), 0.0026)];
    const cp = tubeMesh([loops], 7);
    items.push({ id: `cervical-plexus-${s}`, name: `${Side} cervical plexus (schematic)`, aliases: ['cervical plexus C1-C4', `${Side.toLowerCase()} cervical plexus`], side, systems: ['nervous'], region: 'neck', category: 'schematic plexus', mesh: cp });

    // lumbar plexus: L1–L4 converge in psoas and hand over to the femoral nerve
    const L = ['l1', 'l2', 'l3', 'l4'].map((k) => ends[`${k}-${s}`]!);
    const hub = L.reduce<V3>((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    const fem = nearest(targets[s]!.femoral!, [hub[0], hub[1] - 0.02, hub[2]]);
    const lp = tubeMesh([...L.map((p) => [pt(p, 0.0026), pt(lerp(p, hub, 0.6), 0.0032), pt(hub, 0.0036)]), [pt(hub, 0.0036), pt(lerp(hub, fem, 0.5), 0.0034), pt(fem, 0.003)]], 7);
    items.push({ id: `lumbar-plexus-${s}`, name: `${Side} lumbar plexus (schematic)`, aliases: ['lumbar plexus L1-L4', `${Side.toLowerCase()} lumbar plexus`], side, systems: ['nervous'], region: 'abdomen', category: 'schematic plexus', mesh: lp });

    // sacral plexus: L4–S4 converge on the greater sciatic foramen and become the sciatic nerve
    const sac = ['l5', 's1', 's2', 's3', 's4'].map((k) => ends[`${k}-${s}`]!);
    const top = targets[s]!.sciatic!.reduce((a, p) => (p[1] > a[1] ? p : a));
    const hub2 = lerp(sac.reduce<V3>((a, p) => [a[0] + p[0] / 5, a[1] + p[1] / 5, a[2] + p[2] / 5], [0, 0, 0]), top, 0.6);
    const sp = tubeMesh([...sac.map((p) => [pt(p, 0.0028), pt(lerp(p, hub2, 0.6), 0.0036), pt(hub2, 0.0042)]), [pt(hub2, 0.0042), pt(lerp(hub2, top, 0.5), 0.0044), pt(top, 0.0042)]], 7);
    items.push({ id: `sacral-plexus-${s}`, name: `${Side} sacral plexus (schematic)`, aliases: ['sacral plexus L4-S4', `${Side.toLowerCase()} sacral plexus`], side, systems: ['nervous'], region: 'pelvis', category: 'schematic plexus', mesh: sp });
  }

  // ---- autonomic: sympathetic chain, lower trunk, ganglia ----------------------------------
  const impar = (): V3 => { const m = slabMean(coccyx, Math.max(...coccyx.map((p) => p[1])) - 0.004, 0.006); return [m.c[0], m.max[1] - 0.006, m.max[2] + 0.006]; };
  const ganglion = (p: V3, r = 0.0026): Piece => { const g = new MeshBuilder(); g.sphere(p, r, [1, 1.7, 1]); return g.build(); };
  const chainY: { key: string; name: string; y: number; region: string }[] = [
    { key: 'superior-cervical', name: 'Superior cervical ganglion', y: disc('c2-c3').centroid[1] + 0.006, region: 'neck' },
    { key: 'middle-cervical', name: 'Middle cervical ganglion', y: disc('c5-c6').centroid[1], region: 'neck' },
    { key: 'cervicothoracic', name: 'Cervicothoracic (stellate) ganglion', y: disc('c7-t1').centroid[1] - 0.004, region: 'neck' },
  ];
  for (let i = 2; i <= 12; i++) chainY.push({ key: `thoracic-t${i}`, name: `Thoracic sympathetic ganglion T${i}`, y: vert(`t${i}`).centroid[1], region: 'thorax' });
  const lowTrunkPath = (sg: number): V3[] => {
    const start = trunkLow(sg);
    const pathPts: V3[] = [start];
    for (const d of lDisc) { const dd = disc(d); pathPts.push([canalBodyX(dd) + sg * 0.019, dd.centroid[1], dd.centroid[2] + 0.004]); }
    const sh = sacHalf(sacTop - 0.2 * (sacTop - sacBot));
    for (const f of [0.17, 0.37, 0.56, 0.74]) { const q = sacHalf(sacTop - f * (sacTop - sacBot)); pathPts.push([q.c[0] + sg * q.hw * 0.16, sacTop - f * (sacTop - sacBot), q.zAnt + 0.002]); }
    void sh; pathPts.push(impar());
    return pathPts;
  };
  const canalBodyX = (d: { centroid: number[] }) => d.centroid[0];
  const trunkLow = (sg: number): V3 => {
    const t = trunkPts[sg > 0 ? 'l' : 'r']!; return t.reduce((a, p) => (p[1] < a[1] ? p : a));
  };
  for (const [side, sg, s, Side] of SIDES) {
    const tp = trunkPts[s]!;
    for (const g of chainY) {
      const m = slabMean(tp, g.y, 0.006);
      items.push({ id: `${g.key}-ganglion-${s}`.replace('-ganglion-ganglion', '-ganglion'), name: `${Side} ${g.name.charAt(0).toLowerCase()}${g.name.slice(1)} (schematic)`, aliases: [g.name], side, systems: ['nervous'], region: g.region, category: 'schematic ganglion', mesh: ganglion(m.c, g.key.startsWith('thoracic') ? 0.0024 : 0.003) });
    }
    const lowPath = lowTrunkPath(sg);
    const lp = lowPath.slice(1);
    lp.forEach((p, i) => {
      if (i < 5) items.push({ id: `lumbar-sympathetic-ganglion-l${i + 1}-${s}`, name: `${Side} lumbar sympathetic ganglion L${i + 1} (schematic)`.replace('L5', 'L5'), aliases: [`lumbar sympathetic ganglion L${i + 1}`], side, systems: ['nervous'], region: 'abdomen', category: 'schematic ganglion', mesh: ganglion(p, 0.0026) });
      else if (i < 9) items.push({ id: `sacral-sympathetic-ganglion-s${i - 4}-${s}`, name: `${Side} sacral sympathetic ganglion S${i - 4} (schematic)`, aliases: [`sacral sympathetic ganglion S${i - 4}`], side, systems: ['nervous'], region: 'pelvis', category: 'schematic ganglion', mesh: ganglion(p, 0.0022) });
    });
    items.push({ id: `sympathetic-trunk-lower-${s}`, name: `${Side} sympathetic trunk, lumbar and sacral part (schematic)`, aliases: ['lumbar sympathetic trunk', 'sacral sympathetic trunk', `${Side.toLowerCase()} sympathetic chain lower part`], side, systems: ['nervous'], region: 'abdomen', category: 'schematic nerve', mesh: tubeMesh([lowPath.map((p, i) => pt(p, i === lowPath.length - 1 ? 0.0009 : 0.0014))]) });

    // splanchnic nerves: from the chain to the coeliac plexus region, in front of the vertebral bodies
    const ce = S('coeliac-trunk').centroid as V3;
    const spl: [string, string, number, number][] = [['greater', 'Greater splanchnic nerve', 5, 9], ['lesser', 'Lesser splanchnic nerve', 10, 11], ['least', 'Least splanchnic nerve', 12, 12]];
    for (const [k, nm, t0, t1] of spl) {
      const a = slabMean(tp, vert(`t${t0}`).centroid[1], 0.006).c, m = slabMean(tp, vert(`t${t1}`).centroid[1], 0.006).c;
      const ip = disc(`t${Math.min(t1, 11)}-t${Math.min(t1 + 1, 12)}`.replace('t12-t12', 't11-t12'));
      const bodyFront: V3 = [ip.centroid[0] + sg * 0.012, ip.centroid[1] - 0.02, ip.centroid[2] + 0.004];
      const end: V3 = [ce[0] + sg * 0.008, ce[1] + 0.006 - (k === 'greater' ? 0 : 0.002), ce[2] - 0.001];
      const path = [pt(a, 0.0013), pt(lerp(a, m, 0.6), 0.0014), pt(lerp(m, bodyFront, 0.5), 0.0016), pt(bodyFront, 0.0016), pt(lerp(bodyFront, end, 0.6), 0.0016), pt(end, 0.0016)];
      items.push({ id: `${k}-splanchnic-nerve-${s}`, name: `${Side} ${nm.charAt(0).toLowerCase()}${nm.slice(1)} (schematic)`, aliases: [nm], side, systems: ['nervous'], region: 'thorax', category: 'schematic nerve', mesh: tubeMesh([path]) });
    }
  }

  // named autonomic plexuses
  const ring = (c: V3, rx: number, rz: number, r: number, n = 14): Pt[] => Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.PI * 2; return pt([c[0] + rx * Math.cos(a), c[1], c[2] + rz * Math.sin(a)], r); });
  const ce = S('coeliac-trunk'); const ceBase: V3 = [ce.centroid[0], ce.bounds[1] + 0.004, ce.centroid[2]];
  items.push({ id: 'coeliac-plexus', name: 'Coeliac plexus (schematic)', aliases: ['celiac plexus', 'solar plexus'], side: 'none', systems: ['nervous'], region: 'abdomen', category: 'schematic plexus', mesh: tubeMesh([ring(ceBase, 0.011, 0.009, 0.0022), ring([ceBase[0], ceBase[1] - 0.007, ceBase[2]], 0.009, 0.007, 0.0018)]) });
  const arch = S('aortic-arch');
  const cardiacC: V3 = [arch.centroid[0] + 0.003, arch.bounds[1] - 0.002, arch.centroid[2] + 0.004];
  items.push({ id: 'cardiac-plexus', name: 'Cardiac plexus (schematic)', aliases: ['cardiac nerve plexus'], side: 'none', systems: ['nervous'], region: 'thorax', category: 'schematic plexus', mesh: tubeMesh([ring(cardiacC, 0.012, 0.008, 0.002), ring([cardiacC[0], cardiacC[1] - 0.006, cardiacC[2]], 0.008, 0.006, 0.0016)]) });
  const l5 = disc('l5-s1'), l4 = disc('l4-l5');
  const shC: V3 = [l5.centroid[0], l5.centroid[1] + 0.02, l5.centroid[2] + 0.012];
  items.push({ id: 'superior-hypogastric-plexus', name: 'Superior hypogastric plexus (schematic)', aliases: ['presacral nerve', 'hypogastric plexus'], side: 'none', systems: ['nervous'], region: 'pelvis', category: 'schematic plexus', mesh: tubeMesh([ring(shC, 0.01, 0.005, 0.0022, 12), [pt([shC[0], shC[1] + 0.012, shC[2]], 0.0018), pt([shC[0], shC[1] - 0.012, shC[2]], 0.0018)]]) });
  const rect = S('rectum');
  for (const [side, sg, s, Side] of SIDES) {
    const ihp: V3 = [rect.centroid[0] + sg * 0.03, rect.centroid[1] + 0.005, rect.centroid[2] + 0.004];
    items.push({ id: `inferior-hypogastric-plexus-${s}`, name: `${Side} inferior hypogastric plexus (schematic)`, aliases: ['pelvic plexus', `${Side.toLowerCase()} pelvic plexus`], side, systems: ['nervous'], region: 'pelvis', category: 'schematic plexus', mesh: tubeMesh([ring(ihp, 0.006, 0.01, 0.002, 12), [pt([ihp[0], ihp[1] + 0.012, ihp[2]], 0.0018), pt([ihp[0], ihp[1] - 0.012, ihp[2]], 0.0018)]]) });
    const hyp: Pt[] = [pt([shC[0] + sg * 0.005, shC[1] - 0.008, shC[2]], 0.0015), pt([ihp[0] * 0.5 + shC[0] * 0.5 + sg * 0.015, (shC[1] + ihp[1]) / 2, ihp[2] + 0.012], 0.0016), pt([ihp[0], ihp[1] + 0.006, ihp[2]], 0.0016)];
    items.push({ id: `hypogastric-nerve-${s}`, name: `${Side} hypogastric nerve (schematic)`, aliases: ['hypogastric nerve'], side, systems: ['nervous'], region: 'pelvis', category: 'schematic nerve', mesh: tubeMesh([hyp]) });
    const s3 = ends[`s3-${s}`]!;
    items.push({ id: `pelvic-splanchnic-nerves-${s}`, name: `${Side} pelvic splanchnic nerves S2–S4 (schematic)`, aliases: ['pelvic splanchnic nerves', 'nervi erigentes'], side, systems: ['nervous'], region: 'pelvis', category: 'schematic nerve', mesh: tubeMesh([branch(s3, ihp, 0.0014, 0.0014, 0.2)]) });
  }

  // ---- vagus branches, phrenic, oesophageal plexus ---------------------------------------------
  const trachea = await P('trachea'), oes = await P('oesophagus'), stomach = S('stomach'), stomachPts = await P('stomach');
  const cric = S('cricoid-cartilage'), heart = S('heart'), dia = S('diaphragm'), diaPts = await P('diaphragm');
  const hM: [string, string] = ['right-subclavian-artery', 'aortic-arch'];
  for (const [side, sg, s, Side] of SIDES) {
    // recurrent laryngeal nerve: loops under the subclavian (right) / aortic arch (left), up the tracheo-oesophageal groove
    const loopArt = S(side === 'right' ? hM[0] : hM[1]);
    const loopY = loopArt.bounds[1] - 0.006;
    const vg = vagus[s]!; const vy = side === 'right' ? loopArt.centroid[1] + 0.006 : loopArt.centroid[1];
    const v0 = slabMean(vg, vy, 0.01).c;
    const tr = (y: number) => slabMean(trachea, y, 0.008);
    const ptGroove = (y: number): V3 => { const m = tr(y); return [m.c[0] + sg * ((m.max[0] - m.min[0]) / 2 + 0.002), y, m.c[2] - 0.006]; };
    const rl: V3[] = [v0, [v0[0] + sg * 0.002, loopY + 0.002, v0[2] - 0.002], ptGroove(loopY + 0.005), ptGroove(loopY + 0.02), ptGroove(cric.centroid[1] - 0.03), ptGroove(cric.centroid[1] - 0.012), [cric.centroid[0] + sg * 0.012, cric.centroid[1] - 0.004, cric.centroid[2] - 0.004]];
    items.push({ id: `recurrent-laryngeal-nerve-${s}`, name: `${Side} recurrent laryngeal nerve (schematic)`, aliases: ['recurrent laryngeal nerve', 'inferior laryngeal nerve'], side, systems: ['nervous'], region: 'neck', category: 'schematic nerve', mesh: tubeMesh([rl.map((p) => pt(p, 0.0013))]) });
    // phrenic nerve: C3–C5 down the neck and along the pericardium to the diaphragm
    const c4 = ends[`c4-${s}`]!;
    const hx = side === 'left' ? heart.bounds[3] + 0.006 : heart.bounds[0] - 0.006;
    const phr: V3[] = [c4, [c4[0] * 0.8 + sg * 0.006, c4[1] - 0.03, c4[2] + 0.004], [sg * 0.038, 0.60 - (0.60 - cric.centroid[1]) * 0, S('right-subclavian-artery').centroid[2] + 0.004], [sg * 0.05 + (side === 'left' ? 0.008 : -0.002), heart.bounds[4] - 0.005, heart.centroid[2]], [hx, heart.centroid[1], heart.centroid[2]], nearest(diaPts, [hx, dia.bounds[4] - 0.02, heart.centroid[2] - 0.01])];
    phr[2]![1] = arch.bounds[4] + 0.02;
    items.push({ id: `phrenic-nerve-${s}`, name: `${Side} phrenic nerve (schematic)`, aliases: ['phrenic nerve C3-C5'], side, systems: ['nervous'], region: 'thorax', category: 'schematic nerve', mesh: tubeMesh([phr.map((p) => pt(p, 0.0016))]) });
  }
  const oesC = (y: number) => slabMean(oes, y, 0.006).c;
  const oy0 = oes.reduce((a, p) => Math.min(a, p[1]), 9) + 0.035, oy1 = oy0 + 0.07;
  const helix = (phase: number): Pt[] => Array.from({ length: 31 }, (_, i) => { const t = i / 30, y = oy1 - (oy1 - oy0) * t, c = oesC(y), a = phase + t * Math.PI * 4; return pt([c[0] + 0.009 * Math.cos(a), y, c[2] + 0.009 * Math.sin(a)], 0.0011); });
  items.push({ id: 'oesophageal-plexus', name: 'Oesophageal plexus (schematic)', aliases: ['esophageal plexus'], side: 'none', systems: ['nervous'], region: 'thorax', category: 'schematic plexus', mesh: tubeMesh([helix(0), helix(Math.PI)], 5, 0.004) });
  const lesser = nearest(stomachPts, [stomach.bounds[0] + 0.018, stomach.centroid[1] - 0.005, stomach.centroid[2]]);
  const ceT = S('coeliac-trunk').centroid as V3;
  const hiatus = oesC(oy0);
  const anterior = [hiatus, [hiatus[0] + 0.003, hiatus[1], hiatus[2] + 0.011], lerp([hiatus[0] + 0.003, hiatus[1], hiatus[2] + 0.011], lesser, 0.5), lesser] as V3[];
  const posterior = [hiatus, [hiatus[0] - 0.002, hiatus[1] - 0.004, hiatus[2] - 0.011], lerp([hiatus[0] - 0.002, hiatus[1] - 0.004, hiatus[2] - 0.011], [ceT[0], ceT[1] + 0.01, ceT[2] - 0.004], 0.5), [ceT[0], ceT[1] + 0.008, ceT[2] - 0.004]] as V3[];
  items.push({ id: 'anterior-vagal-trunk', name: 'Anterior vagal trunk (schematic)', aliases: ['anterior gastric nerve'], side: 'none', systems: ['nervous'], region: 'abdomen', category: 'schematic nerve', mesh: tubeMesh([anterior.map((p) => pt(p, 0.0016))]) });
  items.push({ id: 'posterior-vagal-trunk', name: 'Posterior vagal trunk (schematic)', aliases: ['posterior gastric nerve'], side: 'none', systems: ['nervous'], region: 'abdomen', category: 'schematic nerve', mesh: tubeMesh([posterior.map((p) => pt(p, 0.0016))]) });

  // ---- third molars ------------------------------------------------------------------------
  for (const arch2 of ['upper', 'lower'] as const) for (const [side, , s, Side] of SIDES) {
    const m1 = S(`${arch2}-first-molar-tooth-${s}`), m2 = S(`${arch2}-second-molar-tooth-${s}`);
    const m = await b.mesh(`${arch2}-second-molar-tooth-${s}`);
    const d = v.sub(m2.centroid as V3, m1.centroid as V3);
    const step: V3 = [d[0] * 0.95, 0, d[2] * 0.95]; // along the arch, not up or down
    const c2 = m2.centroid as V3, cN: V3 = v.add(c2, step);
    const out = new Float32Array(m.positions.length);
    const sc = 0.92;
    for (let i = 0; i < out.length; i += 3) { out[i] = cN[0] + (m.positions[i]! - c2[0]) * sc; out[i + 1] = cN[1] + (m.positions[i + 1]! - c2[1]) * sc - 0.0005; out[i + 2] = cN[2] + (m.positions[i + 2]! - c2[2]) * sc; }
    items.push({ id: `${arch2}-third-molar-tooth-${s}`, name: `${Side} ${arch2} third molar tooth (schematic)`, aliases: ['wisdom tooth', `${Side.toLowerCase()} ${arch2} wisdom tooth`, `${arch2} third molar`], side, systems: ['skeletal'], region: 'head', category: 'schematic tooth', mesh: { positions: out, indices: m.indices } });
  }

  // ---- small vessel branches ------------------------------------------------------------------
  const thy = S('thyroid-gland'), tongue = S('dorsal-tongue'), gb = S('gallbladder'), liver = S('liver'), bladder = S('urinary-bladder');
  const V = async (name: string) => P(name);
  const vessel = (idv: string, name: string, side: 'left' | 'right' | 'none', systems: Item['systems'], region: string, paths: Pt[][], aliases?: string[]) =>
    items.push({ id: idv, name: `${name} (schematic)`, aliases, side, systems, region, category: 'schematic vessel', mesh: tubeMesh(paths, 6, 0.004) });
  const aortaPts = await V('abdominal-aorta'), thAorta = await V('thoracic-aorta'), sma = await V('superior-mesenteric-artery'), splenic = await V('splenic-artery'), phep = await V('proper-hepatic-artery');
  const smallInt = await V('small-intestine'), ivc = await V('inferior-vena-cava-abdominal-part');
  const siB = S('small-intestine').bounds;
  for (const [side, sg, s, Side] of SIDES) {
    const eca = await V(`external-carotid-artery-${s}`);
    const stT: V3 = [thy.centroid[0] + sg * 0.016, thy.bounds[4] - 0.006, thy.centroid[2] + 0.002];
    vessel(`superior-thyroid-artery-${s}`, `${Side} superior thyroid artery`, side, ['cardiovascular'], 'neck', [branch(nearest(eca, [stT[0] + sg * 0.008, stT[1] + 0.012, stT[2] + 0.005]), stT, 0.0012, 0.0008, 0.2)]);
    const lg: V3 = [tongue.centroid[0] + sg * 0.012, tongue.centroid[1] - 0.008, tongue.centroid[2] - 0.022];
    vessel(`lingual-artery-${s}`, `${Side} lingual artery`, side, ['cardiovascular'], 'head', [branch(nearest(eca, [lg[0] + sg * 0.01, lg[1] - 0.005, lg[2] - 0.01]), lg, 0.0012, 0.0008, 0.15)]);
    const br = S(`${side}-main-bronchus`);
    vessel(`bronchial-artery-${s}`, `${Side} bronchial artery`, side, ['cardiovascular'], 'thorax', [branch(nearest(thAorta, br.centroid as V3), [br.centroid[0], br.centroid[1] + 0.003, br.centroid[2]], 0.0011, 0.0007, 0.15)], ['bronchial artery']);
    const adr = S(`adrenal-gland-${s}`);
    vessel(`middle-suprarenal-artery-${s}`, `${Side} middle suprarenal artery`, side, ['cardiovascular'], 'abdomen', [branch(nearest(aortaPts, adr.centroid as V3), adr.centroid as V3, 0.001, 0.0007, 0.12)], ['middle adrenal artery']);
    const phrenA = await V('inferior-phrenic-artery');
    vessel(`superior-suprarenal-artery-${s}`, `${Side} superior suprarenal artery`, side, ['cardiovascular'], 'abdomen', [branch(nearest(phrenA, [adr.centroid[0], adr.bounds[4], adr.centroid[2]]), [adr.centroid[0], adr.bounds[4] - 0.004, adr.centroid[2]], 0.0009, 0.0006, 0.12)], ['superior adrenal artery']);
    const iia = await V(`internal-iliac-artery-${s}`);
    const rt: V3 = [rect.centroid[0] + sg * 0.01, rect.centroid[1] - 0.012, rect.centroid[2]];
    vessel(`middle-rectal-artery-${s}`, `${Side} middle rectal artery`, side, ['cardiovascular'], 'pelvis', [branch(nearest(iia, rt), rt, 0.001, 0.0007, 0.15)]);
    const bt: V3 = [bladder.centroid[0] + sg * 0.014, bladder.bounds[4] - 0.006, bladder.centroid[2]];
    vessel(`superior-vesical-artery-${s}`, `${Side} superior vesical artery`, side, ['cardiovascular'], 'pelvis', [branch(nearest(iia, bt), bt, 0.001, 0.0007, 0.15)]);
    const advV = body === 'male' ? S('prostate') : S('vagina');
    const tgt: V3 = [advV.centroid[0] + sg * 0.008, advV.centroid[1], advV.centroid[2]];
    vessel(body === 'male' ? `inferior-vesical-artery-${s}` : `vaginal-artery-${s}`, `${Side} ${body === 'male' ? 'inferior vesical' : 'vaginal'} artery`, side, ['cardiovascular'], 'pelvis', [branch(nearest(iia, tgt), tgt, 0.001, 0.0007, 0.15)]);
    const rnv = await V(`${side === 'left' ? 'left-renal-vein' : 'right-renal-vein'}`);
    const adrV: V3 = [adr.centroid[0], adr.centroid[1] - 0.004, adr.centroid[2]];
    const sv = side === 'left' ? nearest(rnv, [adr.centroid[0] - 0.01, adr.centroid[1] - 0.015, adr.centroid[2]]) : nearest(ivc, [adr.centroid[0] + 0.02, adr.centroid[1], adr.centroid[2]]);
    vessel(`suprarenal-vein-${s}`, `${Side} suprarenal vein`, side, ['cardiovascular'], 'abdomen', [branch(adrV, sv, 0.0012, 0.0018, 0.1)], ['adrenal vein']);
    if (body === 'female') {
      const uterus = S('uterus'), ov = S(`ovary-${s}`);
      const uT: V3 = [uterus.centroid[0] + sg * 0.02, uterus.centroid[1] + 0.006, uterus.centroid[2]];
      vessel(`uterine-artery-${s}`, `${Side} uterine artery`, side, ['cardiovascular'], 'pelvis', [branch(nearest(iia, uT), uT, 0.0013, 0.0009, 0.22)]);
      const ostart = nearest(aortaPts, [S(`${side}-renal-artery`).centroid[0], S(`${side}-renal-artery`).centroid[1] - 0.04, S(`${side}-renal-artery`).centroid[2]]);
      const omid: V3 = [ostart[0] * 0.4 + ov.centroid[0] * 0.6, (ostart[1] + ov.centroid[1]) / 2, (ostart[2] + ov.centroid[2]) / 2 + 0.006];
      vessel(`ovarian-artery-${s}`, `${Side} ovarian artery`, side, ['cardiovascular'], 'pelvis', [[pt(ostart, 0.0011), pt(lerp(ostart, omid, 0.5), 0.001), pt(omid, 0.001), pt(lerp(omid, ov.centroid as V3, 0.5), 0.0009), pt(ov.centroid as V3, 0.0008)]]);
      const ovC = ov.centroid as V3, vst = side === 'left' ? nearest(rnv, [ovC[0] * 0.3, S('left-renal-vein').centroid[1], ovC[2]]) : nearest(ivc, [ovC[0] * 0.2, ovC[1] + 0.12, ovC[2]]);
      const vmid: V3 = [vst[0] * 0.4 + ovC[0] * 0.6, (vst[1] + ovC[1]) / 2, (vst[2] + ovC[2]) / 2 + 0.006];
      vessel(`ovarian-vein-${s}`, `${Side} ovarian vein`, side, ['cardiovascular'], 'pelvis', [[pt(vst, 0.0018), pt(lerp(vst, vmid, 0.5), 0.0016), pt(vmid, 0.0015), pt(lerp(vmid, ovC, 0.5), 0.0013), pt(ovC, 0.0011)]]);
    }
  }
  // unpaired branches
  const stomachTop = stomachPts.reduce((a, p) => (p[1] > a[1] ? p : a));
  vessel('right-gastric-artery', 'Right gastric artery', 'none', ['cardiovascular'], 'abdomen', [branch(nearest(phep, lesser), lesser, 0.0011, 0.0008, 0.15)]);
  vessel('short-gastric-arteries', 'Short gastric arteries', 'none', ['cardiovascular'], 'abdomen', [-0.012, 0, 0.012].map((dz, k) => branch(nearest(splenic, [stomachTop[0] + 0.03, stomachTop[1] - 0.01, stomachTop[2] - 0.01]), [stomachTop[0] + 0.006 * (k - 1) + 0.006, stomachTop[1] - 0.004 - 0.003 * k, stomachTop[2] + dz + 0.012], 0.0008, 0.0006, 0.12)));
  vessel('cystic-artery', 'Cystic artery', 'none', ['cardiovascular'], 'abdomen', [branch(nearest(phep, gb.centroid as V3), [gb.centroid[0], gb.centroid[1] + 0.002, gb.centroid[2]], 0.001, 0.0007, 0.15)]);
  const lvT = liver.centroid as V3;
  vessel('right-hepatic-artery', 'Right hepatic artery', 'none', ['cardiovascular'], 'abdomen', [branch(nearest(phep, lvT), [lvT[0] - 0.035, lvT[1] + 0.008, lvT[2] + 0.005], 0.0014, 0.0009, 0.15)]);
  vessel('left-hepatic-artery', 'Left hepatic artery', 'none', ['cardiovascular'], 'abdomen', [branch(nearest(phep, lvT), [lvT[0] + 0.04, lvT[1] + 0.012, lvT[2] + 0.02], 0.0012, 0.0008, 0.15)]);
  const fan = (parent: V3[], tgts: V3[], r: number) => tgts.map((t) => branch(nearest(parent, t), t, r, r * 0.6, 0.15));
  const jT: V3[] = [0.55, 0.65, 0.75, 0.85].map((f, k) => [siB[0] + (siB[3] - siB[0]) * (0.7 + 0.08 * (k % 2)), siB[1] + (siB[4] - siB[1]) * f, siB[2] + (siB[5] - siB[2]) * (0.4 + 0.1 * (k % 3))] as V3).map((t) => nearest(smallInt, t));
  const iT: V3[] = [0.15, 0.3, 0.42, 0.52].map((f, k) => [siB[0] + (siB[3] - siB[0]) * (0.35 + 0.06 * (k % 2)), siB[1] + (siB[4] - siB[1]) * f, siB[2] + (siB[5] - siB[2]) * (0.55 + 0.08 * (k % 3))] as V3).map((t) => nearest(smallInt, t));
  vessel('jejunal-arteries', 'Jejunal arteries', 'none', ['cardiovascular'], 'abdomen', fan(sma, jT, 0.0009));
  vessel('ileal-arteries', 'Ileal arteries', 'none', ['cardiovascular'], 'abdomen', fan(sma, iT, 0.0009));
  vessel('oesophageal-arteries', 'Oesophageal arteries', 'none', ['cardiovascular'], 'thorax', [0.5, 0.7, 0.85].map((f, k) => { const y = oy0 + (oy1 - oy0) * f, c = oesC(y); return branch(nearest(thAorta, [c[0], y, c[2] - 0.01]), [c[0], y + 0.002 * k, c[2] - 0.003], 0.0008, 0.0006, 0.1); }), ['esophageal arteries']);

  return items;
}
