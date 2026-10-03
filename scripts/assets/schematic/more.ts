/**
 * Third batch of schematic stand-ins (all GENERATED, labelled "(schematic)", never counted as real):
 *
 *  - the female external genitalia and urethra. No open licensed mesh of these exists: the HRA
 *    female body has the uterus, tubes, ovaries and vagina, and Z-Anatomy is a male body whose
 *    urethra is the long penile one, so it is excluded from the female (see detail-catalog.ts).
 *  - articular cartilage: a thin domed pad on each articulating surface of the main synovial joints,
 *    placed where the two registered bones are closest.
 *  - the remaining named cranial sutures, traced along the line where two registered skull bones meet.
 *  - gap-fill batch (anatomy-fixes-4): the metopic suture, medial umbilical ligament and umbilical artery, ligamentum
 *    arteriosum, pituitary infundibulum, nipples and areolae, pleural cavities, fibrous pericardium, peritoneal sheets
 *    (mesentery, mesocolons, lesser omentum, gastrosplenic and splenorenal ligaments), the membranous urethra and
 *    navicular fossa (male only) and a REPRESENTATIVE inset of skin appendages (not anatomical, drawn about 3x life size).
 */
import { MeshBuilder, gridShell, v, type Piece, type V3 } from './geom';
import { nearest, points, slabMean, type openBody } from './io';
import { loadSkinField } from './skinfield';
import { SIDES, branch, lerp, pt, tubeMesh, type Item } from './generate';

type Body = Awaited<ReturnType<typeof openBody>>;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mean = (ps: V3[]): V3 => { const c: V3 = [0, 0, 0]; for (const p of ps) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } return [c[0] / ps.length, c[1] / ps.length, c[2] / ps.length]; };

/** Points of A that lie within `d` of some point of B, and for each the nearest point of B. */
function contact(A: V3[], B: V3[], d: number): { a: V3[]; b: V3[] } {
  const cell = d, key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  const grid = new Map<string, V3[]>();
  for (const p of B) { const k = key(p[0], p[1], p[2]); (grid.get(k) ?? grid.set(k, []).get(k)!).push(p); }
  const a: V3[] = [], b: V3[] = [];
  for (const p of A) {
    const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
    let best: V3 | null = null, bd = d * d;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) for (const q of grid.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
      const dd = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2; if (dd < bd) { bd = dd; best = q; }
    }
    if (best) { a.push(p); b.push(best); }
  }
  return { a, b };
}

/** Domed pad of thickness t on a surface patch: centre c, outward normal n, semi-axes r1, r2 along e1, e2. */
function pad(c: V3, n: V3, e1: V3, r1: number, r2: number, t: number): Piece {
  const e2 = v.cross(n, e1);
  const surf = (th: number, dome: number) => (u: number, w: number): V3 => {
    const ang = u * Math.PI * 2, rho = w;
    const h = th + dome * (1 - rho * rho);
    return add3(c, add3(add3([e1[0] * Math.cos(ang) * r1 * rho, e1[1] * Math.cos(ang) * r1 * rho, e1[2] * Math.cos(ang) * r1 * rho], [e2[0] * Math.sin(ang) * r2 * rho, e2[1] * Math.sin(ang) * r2 * rho, e2[2] * Math.sin(ang) * r2 * rho]), [n[0] * h, n[1] * h, n[2] * h]));
  };
  return gridShell(surf(t * 0.4, t * 0.6), surf(0, 0), 14, 3, true);
}


const norm3 = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const scale3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

/** Principal axis of a point cloud (power iteration on the covariance). */
function principalAxis(ps: V3[]): V3 {
  const m = mean(ps); const C = [0, 0, 0, 0, 0, 0];
  for (const p of ps) { const d = sub(p, m); C[0]! += d[0] * d[0]; C[1]! += d[0] * d[1]; C[2]! += d[0] * d[2]; C[3]! += d[1] * d[1]; C[4]! += d[1] * d[2]; C[5]! += d[2] * d[2]; }
  let a: V3 = [0.577, 0.577, 0.577];
  for (let i = 0; i < 40; i++) a = norm3([C[0]! * a[0] + C[1]! * a[1] + C[2]! * a[2], C[1]! * a[0] + C[3]! * a[1] + C[4]! * a[2], C[2]! * a[0] + C[4]! * a[1] + C[5]! * a[2]]);
  return a;
}
/** Centre line of an elongated structure: points binned along the principal axis, ordered from `from`'s end. */
function centreLine(ps: V3[], n: number, from?: V3): V3[] {
  const ax = principalAxis(ps), m = mean(ps);
  const ts = ps.map((p) => v.dot(sub(p, m), ax)); const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const bins: V3[][] = Array.from({ length: n }, () => []);
  ps.forEach((p, i) => bins[Math.min(n - 1, Math.floor(((ts[i]! - t0) / Math.max(1e-9, t1 - t0)) * n))]!.push(p));
  let line = bins.filter((q) => q.length).map(mean);
  if (from && v.len(sub(line[0]!, from)) > v.len(sub(line[line.length - 1]!, from))) line = line.reverse();
  return line;
}
const pathLen = (l: V3[]) => l.slice(1).reduce((a, p, i) => a + v.len(sub(p, l[i]!)), 0);
/** The part of a polyline between arc lengths s0 and s1 (metres from its start). */
function subLine(l: V3[], s0: number, s1: number): V3[] {
  const out: V3[] = []; let acc = 0;
  const at = (s: number): V3 => { let a = 0; for (let i = 1; i < l.length; i++) { const d = v.len(sub(l[i]!, l[i - 1]!)); if (a + d >= s || i === l.length - 1) return lerp(l[i - 1]!, l[i]!, Math.min(1, Math.max(0, (s - a) / Math.max(1e-9, d)))); a += d; } return l[l.length - 1]!; };
  out.push(at(s0));
  for (let i = 1; i < l.length; i++) { acc += v.len(sub(l[i]!, l[i - 1]!)); if (acc > s0 && acc < s1) out.push(l[i]!); }
  out.push(at(s1));
  return out;
}
/** Closest pair between two clouds (subsampled). */
function closestPair(A: V3[], B: V3[], cap = 1800): { a: V3; b: V3; d: number } {
  const sa = A.filter((_, i) => i % Math.ceil(A.length / cap) === 0), sb = B.filter((_, i) => i % Math.ceil(B.length / cap) === 0);
  let best = { a: sa[0]!, b: sb[0]!, d: Infinity };
  for (const p of sa) for (const q of sb) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < best.d) best = { a: p, b: q, d }; }
  return { ...best, d: Math.sqrt(best.d) };
}
/** Thin closed shell around a point cloud, star-shaped about `c`: radius = envelope of the points + tOut (outer) / tIn (inner). */
function radialShell(c: V3, ps: V3[], tOut: number, tIn: number, nu = 28, nv = 18): Piece {
  const R: number[][] = Array.from({ length: nv + 1 }, () => new Array<number>(nu).fill(0));
  for (const p of ps) {
    const d = sub(p, c), r = v.len(d); if (r < 1e-6) continue;
    const th = Math.acos(Math.max(-1, Math.min(1, d[1] / r))), ph = (Math.atan2(d[2], d[0]) + 2 * Math.PI) % (2 * Math.PI);
    const j = Math.round((th / Math.PI) * nv), i = Math.round((ph / (2 * Math.PI)) * nu) % nu;
    if (r > R[j]![i]!) R[j]![i] = r;
  }
  const env = (src: number[][]) => src.map((row, j) => row.map((_, i) => { let m = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const jj = j + dj; if (jj < 0 || jj > nv) continue; m = Math.max(m, src[jj]![(i + di + nu) % nu]!); } return m; }));
  let G = env(env(R));
  const blur = (src: number[][]) => src.map((row, j) => row.map((_, i) => { let s = 0, w = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const jj = j + dj; if (jj < 0 || jj > nv) continue; const k = dj === 0 && di === 0 ? 2 : 1; s += k * src[jj]![(i + di + nu) % nu]!; w += k; } return s / w; }));
  G = blur(G);
  const fill = G.flat().filter((x) => x > 0); const fb = fill.length ? Math.min(...fill) : 0.02;
  const rad = (u: number, w: number, t: number): V3 => {
    const j = Math.round(w * nv), i = Math.round(u * nu) % nu, th = w * Math.PI, ph = u * 2 * Math.PI;
    const r = (G[j]![i]! || fb) + t;
    return [c[0] + r * Math.sin(th) * Math.cos(ph), c[1] + r * Math.cos(th), c[2] + r * Math.sin(th) * Math.sin(ph)];
  };
  return gridShell((u, w) => rad(u, w, tOut), (u, w) => rad(u, w, tIn), nu, nv, true);
}
/** A thin two-sided sheet over a parametric surface P(u, w) (u, w in [0, 1]), thickness 2t along the local normal. */
function sheet(P: (u: number, w: number) => V3, nu: number, nw: number, t: number): Piece {
  const N = (u: number, w: number): V3 => {
    const e = 0.02, du = sub(P(Math.min(1, u + e), w), P(Math.max(0, u - e), w)), dw = sub(P(u, Math.min(1, w + e)), P(u, Math.max(0, w - e)));
    return norm3(v.cross(du, dw));
  };
  const off = (s: number) => (u: number, w: number): V3 => add3(P(u, w), scale3(N(u, w), s * t));
  return gridShell(off(1), off(-1), nu, nw, false);
}
/** Quadratic Bezier through a start, a control and an end point. */
const bez = (a: V3, c: V3, b: V3, t: number): V3 => lerp(lerp(a, c, t), lerp(c, b, t), t);

const JOINTS: { id: string; name: string; a: string; b: string; an: string; bn: string; near: number; aliases: string[]; sided: boolean }[] = [
  { id: 'glenohumeral', name: 'glenohumeral joint', a: 'scapula', b: 'bone-humerus', an: 'glenoid fossa', bn: 'humeral head', near: 0.012, aliases: ['shoulder joint cartilage'], sided: true },
  { id: 'humeroulnar', name: 'humero-ulnar joint', a: 'bone-humerus', b: 'ulna', an: 'trochlea of humerus', bn: 'trochlear notch of ulna', near: 0.012, aliases: ['elbow joint cartilage'], sided: true },
  { id: 'humeroradial', name: 'humeroradial joint', a: 'bone-humerus', b: 'radius', an: 'capitulum of humerus', bn: 'head of radius', near: 0.012, aliases: ['elbow joint cartilage'], sided: true },
  { id: 'radiocarpal', name: 'radiocarpal joint', a: 'radius', b: 'scaphoid-bone', an: 'distal radius', bn: 'scaphoid', near: 0.012, aliases: ['wrist joint cartilage'], sided: true },
  { id: 'hip', name: 'hip joint', a: 'hip-bone', b: 'bone-femur', an: 'acetabulum (lunate surface)', bn: 'femoral head', near: 0.014, aliases: ['coxofemoral cartilage'], sided: true },
  { id: 'tibiofemoral', name: 'tibiofemoral joint', a: 'bone-femur', b: 'tibia', an: 'femoral condyles', bn: 'tibial plateau', near: 0.02, aliases: ['knee joint cartilage'], sided: true },
  { id: 'patellofemoral', name: 'patellofemoral joint', a: 'bone-femur', b: 'patella', an: 'patellar surface of femur', bn: 'articular surface of patella', near: 0.02, aliases: ['knee joint cartilage'], sided: true },
  { id: 'talocrural', name: 'ankle (talocrural) joint', a: 'tibia', b: 'talus', an: 'tibial plafond', bn: 'trochlea of talus', near: 0.014, aliases: ['ankle joint cartilage'], sided: true },
  { id: 'subtalar', name: 'subtalar joint', a: 'talus', b: 'calcaneus', an: 'inferior talus', bn: 'posterior calcaneal facet', near: 0.012, aliases: ['talocalcaneal cartilage'], sided: true },
  { id: 'first-carpometacarpal', name: 'first carpometacarpal joint', a: 'trapezium-bone', b: 'first-metacarpal-bone', an: 'trapezium', bn: 'base of first metacarpal', near: 0.01, aliases: ['thumb saddle joint cartilage'], sided: true },
];

const SUTURES: { id: string; name: string; a: string; b: string; sided: boolean; aliases: string[] }[] = [
  { id: 'squamous-suture', name: 'Squamous suture', a: 'parietal-bone', b: 'temporal-bone', sided: true, aliases: ['sutura squamosa'] },
  { id: 'sphenofrontal-suture', name: 'Sphenofrontal suture', a: 'sphenoid-bone', b: 'frontal-bone', sided: false, aliases: ['sutura sphenofrontalis'] },
  { id: 'sphenoparietal-suture', name: 'Sphenoparietal suture', a: 'sphenoid-bone', b: 'parietal-bone', sided: true, aliases: ['sutura sphenoparietalis'] },
  { id: 'occipitomastoid-suture', name: 'Occipitomastoid suture', a: 'occipital-bone', b: 'temporal-bone', sided: true, aliases: ['sutura occipitomastoidea'] },
  { id: 'frontonasal-suture', name: 'Frontonasal suture', a: 'frontal-bone', b: 'nasal-bone', sided: true, aliases: ['sutura frontonasalis'] },
  { id: 'frontomaxillary-suture', name: 'Frontomaxillary suture', a: 'frontal-bone', b: 'maxilla', sided: true, aliases: ['sutura frontomaxillaris'] },
  { id: 'zygomaticotemporal-suture', name: 'Zygomaticotemporal suture', a: 'zygomatic-bone', b: 'temporal-bone', sided: true, aliases: ['sutura zygomaticotemporalis'] },
  { id: 'zygomaticomaxillary-suture', name: 'Zygomaticomaxillary suture', a: 'zygomatic-bone', b: 'maxilla', sided: true, aliases: ['sutura zygomaticomaxillaris'] },
  { id: 'zygomaticofrontal-suture', name: 'Zygomaticofrontal suture', a: 'zygomatic-bone', b: 'frontal-bone', sided: true, aliases: ['sutura zygomaticofrontalis'] },
];

export async function generateMore(b: Body, body: 'male' | 'female', items: Item[]): Promise<void> {
  const has = (id: string) => !!b.info(id);
  const P = async (id: string): Promise<V3[]> => points(await b.mesh(id));
  const B = (id: string) => b.need(id).bounds;
  const C = (id: string) => b.need(id).centroid as V3;
  const add = (x: Omit<Item, 'side' | 'systems' | 'aliases'> & { side?: Item['side']; systems: Item['systems']; aliases?: string[] }) =>
    items.push({ side: 'none', ...x, name: `${x.name} (schematic)` } as Item);
  const tube = (ps: V3[], r0: number, r1 = r0): Piece => tubeMesh([ps.map((p, i) => pt(p, r0 + ((r1 - r0) * i) / Math.max(1, ps.length - 1)))]);

  // ---- articular cartilage ---------------------------------------------------------------------------------
  for (const j of JOINTS) for (const s of SIDES) {
    const ia = `${j.a}-${s[2]}`, ib = `${j.b}-${s[2]}`;
    if (!has(ia) || !has(ib)) continue;
    const A = await P(ia), Bp = await P(ib);
    let c = contact(A, Bp, j.near);
    for (let d = j.near; c.a.length < 40 && d < 0.03; d *= 1.5) c = contact(A, Bp, d);
    if (c.a.length < 12) { console.warn(`articular cartilage: ${j.id} ${s[2]}: bones do not meet (${c.a.length} pts)`); continue; }
    const ca = mean(c.a), cb = mean(c.b);
    let n = v.norm(sub(cb, ca)); if (!Number.isFinite(n[0])) n = v.norm(sub(C(ib), C(ia)));
    // principal axes of the contact patch in the plane perpendicular to n
    const ref: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u1 = v.norm(v.cross(n, ref)), u2 = v.cross(n, u1);
    const pr = c.a.map((p) => [v.dot(sub(p, ca), u1), v.dot(sub(p, ca), u2)] as const);
    const sxx = pr.reduce((q, p) => q + p[0] * p[0], 0) / pr.length, syy = pr.reduce((q, p) => q + p[1] * p[1], 0) / pr.length, sxy = pr.reduce((q, p) => q + p[0] * p[1], 0) / pr.length;
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), cs = Math.cos(th), sn = Math.sin(th);
    const e1 = v.norm([u1[0] * cs + u2[0] * sn, u1[1] * cs + u2[1] * sn, u1[2] * cs + u2[2] * sn]);
    const l1 = Math.sqrt(Math.max(1e-8, sxx * cs * cs + 2 * sxy * cs * sn + syy * sn * sn)), l2 = Math.sqrt(Math.max(1e-8, sxx * sn * sn - 2 * sxy * cs * sn + syy * cs * cs));
    const r1 = Math.min(0.03, Math.max(0.008, 1.8 * l1)), r2 = Math.min(0.03, Math.max(0.006, 1.8 * l2));
    const t = 0.0018;
    const mid = lerp(ca, cb, 0.5), half = v.len(sub(cb, ca)) / 2;
    const e2 = v.cross(n, e1);
    for (const [bone, sideN, nm, flip] of [[j.a, n, j.an, 1], [j.b, [-n[0], -n[1], -n[2]] as V3, j.bn, -1]] as const) {
      // each pad sits on its own bone's surface, facing the partner
      const ctr = add3(mid, [-sideN[0] * half * 0.9, -sideN[1] * half * 0.9, -sideN[2] * half * 0.9]);
      void flip; void e2;
      add({ id: `articular-cartilage-${j.id}-${bone === j.a ? 'a' : 'b'}-${s[2]}`, name: `${s[3]} articular cartilage of ${nm}`, side: s[0], systems: ['connective', 'skeletal'], region: 'limb', category: 'schematic cartilage', mesh: pad(ctr, sideN, e1, r1, r2, t), aliases: ['articular cartilage', 'hyaline cartilage', j.aliases[0]!, `cartilago articularis`] });
    }
  }

  // ---- remaining cranial sutures -----------------------------------------------------------------------------
  for (const su of SUTURES) for (const s of su.sided ? SIDES : ([['none', 0, '', '']] as const)) {
    const sfx = su.sided ? `-${s[2]}` : '';
    const ia = su.a === 'zygomatic-bone' || su.a === 'parietal-bone' || su.a === 'temporal-bone' || su.a === 'maxilla' || su.a === 'nasal-bone' ? `${su.a}${sfx}` : su.a;
    const ib = su.b === 'temporal-bone' || su.b === 'maxilla' || su.b === 'nasal-bone' || su.b === 'parietal-bone' ? `${su.b}${sfx}` : su.b;
    if (!has(ia) || !has(ib)) continue;
    const A = await P(ia), Bp = await P(ib);
    let c = contact(A, Bp, 0.0025);
    for (let d = 0.0025; c.a.length < 10 && d < 0.008; d *= 1.5) c = contact(A, Bp, d);
    if (c.a.length < 6) { console.warn(`suture ${su.id}${sfx}: bones do not meet`); continue; }
    const pts = c.a.map((p, i) => lerp(p, c.b[i]!, 0.5));
    // order along the principal axis and average in bins
    const m = mean(pts); let ax: V3 = [1, 0, 0], bestVar = -1;
    for (const cand of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as V3[]) { const vv = pts.reduce((q, p) => q + v.dot(sub(p, m), cand) ** 2, 0); if (vv > bestVar) { bestVar = vv; ax = cand; } }
    const ts = pts.map((p) => v.dot(sub(p, m), ax)), t0 = Math.min(...ts), t1 = Math.max(...ts), nb = Math.max(4, Math.min(14, Math.floor(pts.length / 3)));
    const bins: V3[][] = Array.from({ length: nb }, () => []);
    pts.forEach((p, i) => bins[Math.min(nb - 1, Math.floor(((ts[i]! - t0) / Math.max(1e-6, t1 - t0)) * nb))]!.push(p));
    const line = bins.filter((q) => q.length).map(mean);
    if (line.length < 3) continue;
    add({ id: s[2] ? `${su.id}-${s[2]}` : su.id, name: s[2] ? `${s[3]} ${su.name.toLowerCase()}` : su.name, side: s[0], systems: ['skeletal', 'connective'], region: 'head', category: 'schematic suture', mesh: tube(line, 0.0007), aliases: [...su.aliases, 'cranial suture'] });
  }

  // ---- female external genitalia and urethra ---------------------------------------------------------------------
  // Placed about the body's own pelvic midline (the HRA female pelvis is not centred on x = 0: symphysis, vagina and bladder sit
  // about 1.5 cm to the body's right) and behind the real skin: the skin mesh has a groin cleft between the thighs, and the vulva
  // belongs on the floor of that cleft and above the crotch, not in the air of the cleft.
  if (body === 'female' && has('vagina') && has('pubic-symphysis')) {
    const vag = await P('vagina'), sym = B('pubic-symphysis'), skin = await P('skin');
    const xm = (C('vagina')[0] + C('pubic-symphysis')[0] + C('urinary-bladder')[0]) / 3;
    const lowest = [...vag].sort((p, q) => p[1] - q[1]).slice(0, Math.max(5, Math.floor(vag.length * 0.03)));
    const I = mean(lowest);
    const yLow = I[1] - 0.008; // the crotch: nothing of the vulva lies below this
    /** Front surface of the midline at height y: the floor of the groin cleft (lowest of the per-column forward skin heights near the midline). */
    const floorZ = (y: number): number => {
      const cols = new Map<number, number>();
      for (const p of skin) if (Math.abs(p[0] - xm) < 0.014 && Math.abs(p[1] - y) < 0.006 && p[2] > I[2] - 0.012) { const k = Math.round((p[0] - xm) / 0.004); const z = cols.get(k); if (z === undefined || p[2] > z) cols.set(k, p[2]); }
      return cols.size ? Math.min(...cols.values()) : sym[5] - 0.012;
    };
    /** Centre of an ellipsoid with half-extents (hx, hy, hz): kept above the crotch and behind the skin floor. */
    const place = (cx: number, cy: number, cz: number, hy: number, hz: number): V3 => {
      const y = Math.max(cy, yLow + hy);
      return [cx, y, Math.min(cz, floorZ(y) - hz - 0.003)];
    };
    const blob = (c: V3, r: number, sc: V3): Piece => { const m = new MeshBuilder(); m.sphere(c, r, sc); return m.build(); };
    const vy = I[1] + 0.003, V: V3 = [xm, vy, floorZ(vy) - 0.007];
    const tri = has('trigone-of-urinary-bladder') ? B('trigone-of-urinary-bladder') : B('urinary-bladder');
    const neck: V3 = [xm, tri[1] + 0.004, (tri[2] + tri[5]) / 2];
    const U: V3 = [xm, V[1] + 0.012, Math.min(V[2] - 0.002, floorZ(V[1] + 0.012) - 0.006)];
    add({ id: 'female-urethra', name: 'Female urethra', systems: ['urinary'], region: 'pelvis', category: 'schematic organ', mesh: tube([neck, lerp(neck, U, 0.5), U], 0.0032, 0.0028), aliases: ['urethra', 'urethra feminina', 'external urethral orifice'] });
    // clitoris: glans under the clitoral hood, body to the pubic arch, two crura along the ischiopubic rami
    const Gy = V[1] + 0.03, G: V3 = [xm, Gy, Math.min(floorZ(Gy) - 0.0055 - 0.004, V[2] + 0.004)];
    add({ id: 'glans-of-clitoris', name: 'Glans of clitoris', systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: blob(G, 0.0055, [1, 1, 1]), aliases: ['clitoris', 'clitoral glans', 'glans clitoridis'] });
    const S0: V3 = [xm, sym[1] - 0.002, sym[5] - 0.007];
    add({ id: 'body-of-clitoris', name: 'Body of clitoris', systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: tube([G, lerp(G, S0, 0.5), S0], 0.0045, 0.0055), aliases: ['clitoris', 'corpus clitoridis', 'corpora cavernosa of clitoris'] });
    for (const s of SIDES) {
      const hip = await P(`hip-bone-${s[2]}`);
      const tub = hip.filter((p) => p[1] < sym[1] + 0.02 && p[2] < sym[2] && Math.sign(p[0] - xm) === s[1]).reduce<V3 | null>((q, p) => (!q || p[1] < q[1] ? p : q), null) ?? [xm + s[1] * 0.06, sym[1] - 0.05, sym[2]];
      const T: V3 = [tub[0] - s[1] * 0.012, tub[1] + 0.012, tub[2] + 0.012];
      add({ id: `crus-of-clitoris-${s[2]}`, name: `${s[3]} crus of clitoris`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: tube([S0, lerp(S0, T, 0.5), T], 0.0055, 0.0065), aliases: ['clitoral crus', 'crus clitoridis'] });
      const bc = place(xm + s[1] * 0.017, V[1] + 0.004, V[2] - 0.01, 0.0158, 0.005);
      add({ id: `bulb-of-vestibule-${s[2]}`, name: `${s[3]} bulb of vestibule`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: blob(bc, 0.01, [0.7, 1.6, 0.9]), aliases: ['vestibular bulb', 'bulbus vestibuli', 'clitoral bulb'] });
      const gc = place(xm + s[1] * 0.019, V[1] - 0.002, V[2] - 0.016, 0.0055, 0.0055);
      add({ id: `greater-vestibular-gland-${s[2]}`, name: `${s[3]} greater vestibular gland`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: blob(gc, 0.0055, [1, 1, 1]), aliases: ["Bartholin's gland", 'glandula vestibularis major'] });
      const lmc = place(xm + s[1] * 0.0085, V[1] + 0.008, V[2] - 0.003, 0.0152, 0.0048);
      add({ id: `labium-minus-${s[2]}`, name: `${s[3]} labium minus`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: blob(lmc, 0.008, [0.28, 1.9, 0.6]), aliases: ['labia minora', 'nymphae', 'labium minus pudendi'] });
      const ljc = place(xm + s[1] * 0.021, V[1] + 0.02, V[2] - 0.009, 0.03, 0.0112);
      add({ id: `labium-majus-${s[2]}`, name: `${s[3]} labium majus`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: blob(ljc, 0.014, [0.45, 2.15, 0.8]), aliases: ['labia majora', 'labium majus pudendi'] });
    }
    add({ id: 'vestibule-of-vagina', name: 'Vestibule of vagina', systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: blob(place(xm, V[1] + 0.003, V[2] - 0.004, 0.0128, 0.005), 0.008, [0.6, 1.6, 0.6]), aliases: ['vaginal vestibule', 'vestibulum vaginae', 'introitus', 'vaginal opening'] });
  }

  // ==== gap-fill batch (anatomy-fixes-4) =====================================================================
  const skinPts = await P('skin');
  const zGrid = new Map<string, number>();
  const skinZ = skinPts.map((p) => p[2]), zMid = (Math.min(...skinZ) + Math.max(...skinZ)) / 2;
  for (const p of skinPts) { if (p[2] < zMid) continue; const k = `${Math.round(p[0] / 0.003)},${Math.round(p[1] / 0.003)}`; const z = zGrid.get(k); if (z === undefined || p[2] > z) zGrid.set(k, p[2]); }
  /** Front (anterior) skin surface height at (x, y): plane fit through the forward-facing skin points around it (the skin mesh is sparse on the trunk). */
  const skinPlane = (x: number, y: number, rad = 0.03): { z: number; n: V3 } | null => {
    for (let r = rad; r <= 0.09; r *= 1.5) {
      const near: V3[] = []; const n = Math.ceil(r / 0.003), cx = Math.round(x / 0.003), cy = Math.round(y / 0.003);
      for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const z = zGrid.get(`${cx + i},${cy + j}`); if (z !== undefined && Math.hypot(i * 0.003, j * 0.003) <= r) near.push([(cx + i) * 0.003, (cy + j) * 0.003, z]); }
      if (near.length < 6) continue;
      // normal equations for z = a + b dx + c dy
      let sx = 0, sy = 0, sz = 0, sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0; const N = near.length;
      for (const q of near) { const dx = q[0] - x, dy = q[1] - y; sx += dx; sy += dy; sz += q[2]; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; sxz += dx * q[2]; syz += dy * q[2]; }
      const det = N * (sxx * syy - sxy * sxy) - sx * (sx * syy - sxy * sy) + sy * (sx * sxy - sxx * sy);
      if (Math.abs(det) < 1e-18) continue;
      const solve = (b0: number, b1: number, b2: number): number => (b0 * (sxx * syy - sxy * sxy) - sx * (b1 * syy - sxy * b2) + sy * (b1 * sxy - sxx * b2)) / det;
      const a0 = solve(sz, sxz, syz);
      const bx = (N * (sxz * syy - sxy * syz) - sz * (sx * syy - sxy * sy) + sy * (sx * syz - sxz * sy)) / det;
      const cy2 = (N * (sxx * syz - sxz * sxy) - sx * (sx * syz - sxz * sy) + sz * (sx * sxy - sxx * sy)) / det;
      return { z: a0, n: norm3([-bx, -cy2, 1]) };
    }
    return null;
  };
  const skinFront = (x: number, y: number, rad = 0.009): number => {
    let z = -Infinity; const n = Math.ceil(rad / 0.003), cx = Math.round(x / 0.003), cy = Math.round(y / 0.003);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const q = zGrid.get(`${cx + i},${cy + j}`); if (q !== undefined && q > z) z = q; }
    return z;
  };
  const poly = (a: V3[]) => (u: number): V3 => { const f = Math.min(a.length - 1, Math.max(0, u * (a.length - 1))), i = Math.min(a.length - 2, Math.floor(f)); return lerp(a[i]!, a[i + 1]!, f - i); };
  const apart = (A: V3, Bp: V3, min = 0.005): V3 => (v.len(sub(Bp, A)) >= min ? Bp : add3(A, scale3(norm3(sub(Bp, A).some((x) => x !== 0) ? sub(Bp, A) : [1, 0, 0]), min)));
  /** A thin sheet joining two edge curves (equal-length arrays, sampled by u). */
  const link = (EA: V3[], EB: V3[], t = 0.0012, ripple = 0): Piece => {
    const fa = poly(EA), fb = poly(EB);
    return sheet((u, w) => { const a = fa(u), bb = apart(a, fb(u)); const p = lerp(a, bb, w); return ripple ? add3(p, [0, 0, ripple * w * Math.sin(u * 36)]) : p; }, 24, 6, t);
  };

  // ---- metopic suture: the midline suture of the frontal bone, from nasion to bregma. Usually closed in adults. -----------
  if (has('frontal-bone') && has('brain')) {
    const fb = await P('frontal-bone'), cb = C('brain');
    const mid = fb.filter((p) => Math.abs(p[0]) < 0.004), ang = (p: V3) => Math.atan2(p[1] - cb[1], p[2] - cb[2]);
    const a0 = Math.min(...mid.map(ang)), a1 = Math.max(...mid.map(ang)), nb = 16, line: V3[] = [];
    for (let k = 0; k < nb; k++) {
      const lo = a0 + ((a1 - a0) * k) / nb, hi = a0 + ((a1 - a0) * (k + 1)) / nb; let best: V3 | null = null, br = -1;
      for (const p of mid) { const a = ang(p); if (a >= lo && a <= hi) { const r = Math.hypot(p[1] - cb[1], p[2] - cb[2]); if (r > br) { br = r; best = p; } } }
      if (best) { const d = norm3([0, best[1] - cb[1], best[2] - cb[2]]); line.push([0, best[1] - d[1] * 0.0007, best[2] - d[2] * 0.0007]); }
    }
    if (line.length >= 5) add({ id: 'metopic-suture', name: 'Metopic suture', systems: ['skeletal', 'connective'], region: 'head', category: 'schematic suture', mesh: tube(line, 0.0009), aliases: ['frontal suture', 'sutura metopica', 'sutura frontalis', 'cranial suture'] });
  }

  // ---- umbilical artery (patent proximal part) and medial umbilical ligament (its obliterated distal part) ------------------
  if (has('umbilicus') && has('urinary-bladder')) {
    const um = B('umbilicus'), bl = B('urinary-bladder'), blC = C('urinary-bladder');
    for (const s of SIDES) {
      if (!has(`internal-iliac-artery-${s[2]}`)) continue;
      const iia = await P(`internal-iliac-artery-${s[2]}`);
      const bt: V3 = [blC[0] + s[1] * 0.014, bl[4] - 0.006, blC[2] + 0.004];
      const st = nearest(iia, [bt[0] + s[1] * 0.02, bt[1] - 0.012, bt[2]]);
      add({ id: `umbilical-artery-${s[2]}`, name: `${s[3]} umbilical artery (patent part)`, side: s[0], systems: ['cardiovascular'], region: 'pelvis', category: 'schematic vessel', mesh: tubeMesh([branch(st, bt, 0.0016, 0.0011, 0.2)]), aliases: ['umbilical artery', 'arteria umbilicalis', 'patent part of umbilical artery'] });
      const U: V3 = [s[1] * 0.007, (um[1] + um[4]) / 2, um[2] - 0.004];
      const mid: V3 = [lerp(bt, U, 0.5)[0], lerp(bt, U, 0.5)[1], lerp(bt, U, 0.5)[2] + 0.008];
      add({ id: `medial-umbilical-ligament-${s[2]}`, name: `${s[3]} medial umbilical ligament`, side: s[0], systems: ['connective', 'cardiovascular'], region: 'abdomen', category: 'schematic ligament', mesh: tube([bt, lerp(bt, mid, 0.5), mid, lerp(mid, U, 0.5), U], 0.0018, 0.0014), aliases: ['obliterated umbilical artery', 'occluded part of umbilical artery', 'ligamentum umbilicale mediale', 'umbilical artery remnant'] });
    }
  }

  // ---- ligamentum arteriosum: the fibrous remnant of the ductus arteriosus, aortic arch to left pulmonary artery -----------------
  if (has('aortic-arch') && has('left-pulmonary-artery')) {
    const cp = closestPair(await P('aortic-arch'), await P('left-pulmonary-artery'));
    if (cp.d < 0.04) add({ id: 'ligamentum-arteriosum', name: 'Ligamentum arteriosum', systems: ['connective', 'cardiovascular'], region: 'thorax', category: 'schematic ligament', mesh: tube([lerp(cp.a, cp.b, -0.2), cp.a, cp.b, lerp(cp.a, cp.b, 1.2)], 0.0024), aliases: ['arterial ligament', 'ductus arteriosus remnant', 'ligamentum arteriosum botalli'] });
    else console.warn(`ligamentum arteriosum: arch and left pulmonary artery ${(cp.d * 1000).toFixed(0)} mm apart`);
  }

  // ---- pituitary infundibulum (the real adeno- and neurohypophysis are already present) ---------------------------------------------------
  if (has('neurohypophysis') && has('adenohypophysis') && has('hypothalamus-r') && has('hypothalamus-l')) {
    const pa = B('adenohypophysis'), pn = B('neurohypophysis'), hr = B('hypothalamus-r'), hl = B('hypothalamus-l');
    const top = Math.max(pa[4], pn[4]), xm = (Math.min(pa[0], pn[0]) + Math.max(pa[3], pn[3])) / 2, zm = (Math.min(pa[2], pn[2]) + Math.max(pa[5], pn[5])) / 2;
    const hb = Math.min(hr[1], hl[1]), hz = (Math.min(hr[2], hl[2]) + Math.max(hr[5], hl[5])) / 2, hx = (Math.min(hr[0], hl[0]) + Math.max(hr[3], hl[3])) / 2;
    const P1: V3 = [xm, top - 0.002, zm], P2: V3 = [hx, Math.max(hb + 0.0015, top + 0.004), hz];
    add({ id: 'pituitary-infundibulum', name: 'Infundibulum of pituitary (infundibular stalk)', systems: ['endocrine', 'nervous'], region: 'head', category: 'schematic organ', mesh: tube([P1, lerp(P1, P2, 0.5), P2], 0.0022, 0.0017), aliases: ['pituitary stalk', 'hypophysial stalk', 'infundibular stalk', 'infundibulum hypophysis', 'hypophysis'] });
  }

  // ---- nipples and areolae (both sexes), on the skin's most forward point of the chest ----------------------------------------------------
  if (has('manubrium-of-sternum')) {
    const mb = B('manubrium-of-sternum')[1];
    const found: V3[] = [];
    for (const s of SIDES) {
      // male: the pectoral skin about 4 cm below the sternal angle; female: the most forward skin over the centre of the real HRA mammary gland
      const mg = body === 'female' && has(`mammary-gland-${s[2]}`) ? C(`mammary-gland-${s[2]}`) : null;
      const ys = mg ? [mg[1] - 0.02, mg[1] + 0.02] : [mb - 0.075, mb - 0.03], xs = mg ? [Math.abs(mg[0]) - 0.02, Math.abs(mg[0]) + 0.02] : [0.06, 0.13];
      let best: V3 | null = null;
      for (let y = ys[0]!; y <= ys[1]!; y += 0.004) for (let ax = xs[0]!; ax <= xs[1]!; ax += 0.004) { const z = skinFront(s[1] * ax, y, 0.004); if (Number.isFinite(z) && (!best || z > best[2])) best = [s[1] * ax, y, z]; }
      if (best) found.push(best);
    }
    if (found.length === 2) {
      // symmetric about the midline: the skin mesh is sparse, so average the two sides
      const ax = (Math.abs(found[0]![0]) + Math.abs(found[1]![0])) / 2, ay = (found[0]![1] + found[1]![1]) / 2, az = (found[0]![2] + found[1]![2]) / 2;
      for (const s of SIDES) {
        const n: V3 = [0, 0, 1], c: V3 = [s[1] * ax, ay, az];
        const ar = pad([c[0], c[1], c[2] - 0.0016], n, [1, 0, 0], 0.0125, 0.0125, 0.0024);
        add({ id: `areola-${s[2]}`, name: `${s[3]} areola`, side: s[0], systems: ['integumentary'], region: 'thorax', category: 'schematic organ', mesh: ar, aliases: ['areola of breast', 'areola mammae', 'nipple areola complex'] });
        const nb = new MeshBuilder(); nb.sphere([c[0], c[1], c[2] - 0.0014], 0.0048, [1, 1, 0.85]);
        add({ id: `nipple-${s[2]}`, name: `${s[3]} nipple`, side: s[0], systems: ['integumentary'], region: 'thorax', category: 'schematic organ', mesh: nb.build(), aliases: ['papilla mammaria', 'mammary papilla', 'teat', 'nipple areola complex'] });
      }
    } else console.warn('nipples: no skin found');
  }

  // ---- pleural cavities (potential space between visceral and parietal pleura) and the fibrous pericardium --------------------------------
  for (const s of SIDES) {
    if (!has(`lung-${s[2]}`)) continue;
    const lp = await P(`lung-${s[2]}`);
    add({ id: `pleural-cavity-${s[2]}`, name: `${s[3]} pleural cavity`, side: s[0], systems: ['respiratory'], region: 'thorax', category: 'schematic membrane', mesh: radialShell(mean(lp), lp, 0.0045, 0.003), aliases: ['pleural space', 'cavitas pleuralis', 'pleural sac', 'pleura'] });
  }
  if (has('heart')) {
    const hp = await P('heart');
    add({ id: 'fibrous-pericardium', name: 'Fibrous pericardium', systems: ['cardiovascular'], region: 'thorax', category: 'schematic membrane', mesh: radialShell(mean(hp), hp, 0.0075, 0.0052, 30, 20), aliases: ['pericardium', 'pericardial sac', 'pericardium fibrosum', 'fibrous pericardial sac'] });
  }

  // ---- peritoneal sheets: mesentery, transverse and sigmoid mesocolon, lesser omentum, gastrosplenic and splenorenal ligaments --------------------
  if (has('duodenum-ascending') && has('caecum') && has('small-intestine') && has('abdominal-aorta')) {
    const duo = await P('duodenum-ascending'), cae = await P('caecum'), si = await P('small-intestine'), ao = B('abdominal-aorta');
    const dj = duo.reduce((a, q) => (q[1] > a[1] ? q : a));
    const upper = cae.filter((q) => q[1] > (B('caecum')[1] + B('caecum')[4]) / 2), icj = (upper.length ? upper : cae).reduce((a, q) => (q[0] > a[0] ? q : a));
    const ctrl: V3 = [(ao[0] + ao[3]) / 2, (dj[1] + icj[1]) / 2, ao[5] + 0.012];
    const R: V3[] = [], E: V3[] = [];
    for (let k = 0; k <= 24; k++) { const r = bez(dj, ctrl, icj, k / 24); R.push(r); E.push(slabMean(si, r[1], 0.014).c); }
    add({ id: 'mesentery', name: 'Mesentery of the small intestine', systems: ['digestive'], region: 'abdomen', category: 'schematic membrane', mesh: link(R, E, 0.0012, 0.004), aliases: ['mesentery', 'mesenterium', 'root of mesentery', 'peritoneal fold'] });
  }
  if (has('transverse-colon') && has('pancreas')) {
    const tc = await P('transverse-colon'), pan = B('pancreas'), tb = B('transverse-colon'), nb = 18;
    const E: V3[] = [], R: V3[] = [];
    for (let k = 0; k <= nb; k++) {
      const x = tb[0] + ((tb[3] - tb[0]) * k) / nb, sel = tc.filter((q) => Math.abs(q[0] - x) < (tb[3] - tb[0]) / nb), e = sel.length ? mean(sel) : (E[E.length - 1] ?? C('transverse-colon'));
      E.push(e);
      const mid = 1 - Math.pow(Math.abs((2 * k) / nb - 1), 2);
      R.push([e[0], (e[1] + C('pancreas')[1]) / 2 + 0.01, lerp([0, 0, pan[2] + 0.012], [0, 0, pan[5] - 0.006], mid)[2]]);
    }
    add({ id: 'transverse-mesocolon', name: 'Transverse mesocolon', systems: ['digestive'], region: 'abdomen', category: 'schematic membrane', mesh: link(R, E, 0.0012, 0.003), aliases: ['mesocolon transversum', 'mesocolon', 'peritoneal fold'] });
  }
  if (has('sigmoid-colon') && has('descending-colon') && has('rectum')) {
    const sg = await P('sigmoid-colon'), dc = await P('descending-colon'), rc = await P('rectum');
    const dEnd = dc.reduce((a, q) => (q[1] < a[1] ? q : a)), rTop = rc.reduce((a, q) => (q[1] > a[1] ? q : a));
    const E = centreLine(sg, 14, dEnd), zb = Math.min(...sg.map((q) => q[2]));
    const ctrl: V3 = [(dEnd[0] + rTop[0]) / 2 + (dEnd[0] > rTop[0] ? 0.01 : -0.01), (dEnd[1] + rTop[1]) / 2, zb - 0.012];
    const R: V3[] = []; for (let k = 0; k < E.length; k++) R.push(bez(dEnd, ctrl, rTop, k / (E.length - 1)));
    add({ id: 'sigmoid-mesocolon', name: 'Sigmoid mesocolon', systems: ['digestive'], region: 'pelvis', category: 'schematic membrane', mesh: link(R, E, 0.0012, 0.002), aliases: ['mesosigmoid', 'mesocolon sigmoideum', 'mesocolon', 'peritoneal fold'] });
  }
  if (has('stomach') && has('liver')) {
    const st = await P('stomach'), lv = await P('liver'), sb = B('stomach'), nb = 10;
    const E: V3[] = [], F: V3[] = [];
    for (let k = 0; k <= nb; k++) {
      const y = sb[1] + 0.01 + ((sb[4] - sb[1] - 0.02) * k) / nb, sel = st.filter((q) => Math.abs(q[1] - y) < 0.008);
      if (!sel.length) continue;
      const a = sel.reduce((m, q) => (q[0] < m[0] ? q : m)); E.push(a);
      const tgt = nearest(lv, add3(a, [0, 0.03, 0])); F.push(v.len(sub(tgt, a)) > 0.07 ? lerp(a, tgt, 0.07 / v.len(sub(tgt, a))) : tgt);
    }
    if (E.length >= 4) add({ id: 'lesser-omentum', name: 'Lesser omentum (hepatogastric and hepatoduodenal ligaments)', systems: ['digestive'], region: 'abdomen', category: 'schematic membrane', mesh: link(E, F, 0.0012, 0), aliases: ['hepatogastric ligament', 'hepatoduodenal ligament', 'omentum minus', 'gastrohepatic ligament', 'peritoneal ligament'] });
  }
  if (has('stomach') && has('spleen')) {
    const st = await P('stomach'), sp = await P('spleen'), spb = B('spleen'), medial = C('stomach')[0] < spb[0] ? 1 : -1, nb = 6;
    const F: V3[] = [], E: V3[] = [];
    for (let k = 0; k <= nb; k++) {
      const y = spb[1] + 0.012 + ((spb[4] - spb[1] - 0.024) * k) / nb, sel = sp.filter((q) => Math.abs(q[1] - y) < 0.008);
      if (!sel.length) continue;
      const b = sel.reduce((m, q) => (medial * q[0] < medial * m[0] ? q : m)); F.push(b); E.push(nearest(st, b));
    }
    if (E.length >= 4) add({ id: 'gastrosplenic-ligament', name: 'Gastrosplenic ligament', systems: ['digestive', 'lymphatic'], region: 'abdomen', category: 'schematic membrane', mesh: link(E, F, 0.0012, 0), aliases: ['gastrolienal ligament', 'ligamentum gastrosplenicum', 'peritoneal ligament'] });
  }
  if (has('spleen') && has('kidney-l')) {
    const sp = await P('spleen'), kd = await P('kidney-l'), spb = B('spleen'), nb = 6;
    const F: V3[] = [], E: V3[] = [];
    for (let k = 0; k <= nb; k++) {
      const y = spb[1] + 0.012 + ((spb[4] - spb[1] - 0.024) * k) / nb, sel = sp.filter((q) => Math.abs(q[1] - y) < 0.008);
      if (!sel.length) continue;
      const kc = nearest(kd, mean(sel)); F.push(nearest(sel, kc)); E.push(kc);
    }
    if (E.length >= 4) add({ id: 'splenorenal-ligament', name: 'Splenorenal ligament', side: 'none', systems: ['digestive', 'lymphatic'], region: 'abdomen', category: 'schematic membrane', mesh: link(E, F, 0.0012, 0), aliases: ['lienorenal ligament', 'ligamentum splenorenale', 'peritoneal ligament'] });
  }

  // ---- male urethra: membranous part and navicular fossa (male only; the penile urethra mesh is real) -----------------------------------
  if (body === 'male' && has('urethra') && has('prostatic-urethra')) {
    const line = centreLine(await P('urethra'), 28, C('prostatic-urethra')), L = pathLen(line);
    if (line.length >= 4 && L > 0.04) {
      add({ id: 'membranous-part-of-male-urethra', name: 'Membranous part of male urethra', systems: ['urinary', 'reproductive'], region: 'pelvis', category: 'schematic organ', mesh: tube(subLine(line, 0, 0.018), 0.0036), aliases: ['membranous urethra', 'pars membranacea urethrae masculinae', 'male urethra'] });
      add({ id: 'navicular-fossa-of-male-urethra', name: 'Navicular fossa of male urethra', systems: ['urinary', 'reproductive'], region: 'pelvis', category: 'schematic organ', mesh: tube(subLine(line, L - 0.014, L - 0.001), 0.0028, 0.0034), aliases: ['fossa navicularis urethrae', 'navicular fossa', 'terminal dilatation of the urethra', 'male urethra'] });
    }
  }

  // ---- representative inset of the skin appendages (NOT anatomical): drawn about 3x life size with thickened radii --------------------------
  if (has('umbilicus')) {
    const x0 = 0.03, y0 = C('umbilicus')[1] + 0.06, sf = loadSkinField(body), sp0 = skinPlane(x0, y0), zf = sf?.frontZ(x0, y0);
    const zs = (zf ?? (sp0 ? sp0.z : skinFront(x0, y0, 0.03))) - 0.0045; // the 4 mm voxel field puts the surface within +-2 mm; stay clear of it
    // local frame on the skin: outward normal from the skin field (or the fitted plane), e1 along the body's left, e2 up the surface
    const g = sf ? sf.grad([x0, y0, zs], 0.016) : null, nOut: V3 = g ? norm3([-g[0], -g[1], -g[2]]) : sp0 ? sp0.n : [0, 0, 1];
    const e1 = norm3(sub([1, 0, 0], scale3(nOut, nOut[0]))), e2 = v.cross(nOut, e1);
    const loc = (a: number, d: number, bb = 0): V3 => [x0 + e1[0] * a + e2[0] * bb - nOut[0] * d, y0 + e1[1] * a + e2[1] * bb - nOut[1] * d, zs + e1[2] * a + e2[2] * bb - nOut[2] * d];
    const part = (build: (m: MeshBuilder) => void): Piece => { const m = new MeshBuilder(); build(m); return m.build(); };
    const tb = (m: MeshBuilder, ps: [number, number, number][], r0: number, r1 = r0) => m.tube(ps.map((q, i) => pt(loc(q[0], q[1], q[2]), r0 + ((r1 - r0) * i) / Math.max(1, ps.length - 1))), { step: 0.0007, sides: 6 });
    const bal = (m: MeshBuilder, a: number, d: number, bb: number, r: number, sc: V3 = [1, 1, 1]) => m.sphere(loc(a, d, bb), r, sc);
    const inset = (id: string, name: string, aliases: string[], mesh: Piece) => add({ id, name: `${name} — representative inset`, systems: ['integumentary'], region: 'abdomen', category: 'schematic inset', mesh, aliases: [...aliases, 'skin appendage', 'histology inset'] });
    inset('hair-follicle-inset', 'Hair follicle', ['hair follicle', 'folliculus pilosus', 'hair shaft', 'hair root'], part((m) => { tb(m, [[0, 0.0004, 0], [0.0014, 0.004, 0], [0.0032, 0.0078, 0], [0.0038, 0.0102, 0]], 0.0006, 0.0005); bal(m, 0.0039, 0.0112, 0, 0.0014); }));
    inset('sebaceous-gland-inset', 'Sebaceous gland', ['sebaceous gland', 'glandula sebacea', 'oil gland'], part((m) => { bal(m, -0.0011, 0.0036, 0, 0.0013, [1, 1.3, 1]); bal(m, -0.0004, 0.0057, 0, 0.001); bal(m, 0.0053, 0.0036, 0, 0.0012, [1, 1.3, 1]); tb(m, [[-0.0011, 0.0036, 0], [0.0004, 0.0034, 0]], 0.0004); tb(m, [[0.0053, 0.0036, 0], [0.0037, 0.0034, 0]], 0.0004); }));
    inset('arrector-pili-inset', 'Arrector pili muscle', ['arrector pili', 'musculus arrector pili', 'goose bump muscle', 'piloerector'], part((m) => tb(m, [[0.0033, 0.0062, 0], [0.0004, 0.0045, 0], [-0.0052, 0.0022, 0], [-0.0086, 0.0012, 0]], 0.0005, 0.0004)));
    inset('sweat-gland-inset', 'Sweat gland (eccrine)', ['sweat gland', 'eccrine gland', 'glandula sudorifera', 'apocrine sweat gland'], part((m) => {
      const coil: [number, number, number][] = []; for (let i = 0; i <= 36; i++) { const a = (i / 36) * Math.PI * 6; coil.push([0.0125 + 0.0014 * Math.cos(a), 0.0108 - 0.0036 * (i / 36) + 0.0007 * Math.sin(a), 0.0014 * Math.sin(a)]); }
      tb(m, coil, 0.0005); tb(m, [[0.0125, 0.0072, 0], [0.0129, 0.0052, 0.0004], [0.0124, 0.0032, -0.0004], [0.0128, 0.0014, 0.0003], [0.0126, 0.0002, 0]], 0.00035);
    }));
    inset('dermal-capillary-loop-inset', 'Dermal capillary loops', ['capillary loop', 'dermal papilla capillary', 'papillary capillary', 'microcirculation'], part((m) => { for (const o of [-0.0152, -0.0126]) tb(m, [[o, 0.0042, 0], [o, 0.0016, 0], [o + 0.0008, 0.0008, 0], [o + 0.0016, 0.0016, 0], [o + 0.0016, 0.0042, 0]], 0.0003); }));
    inset('dermal-nerve-ending-inset', 'Dermal nerve ending (Meissner corpuscle)', ['nerve ending', 'meissner corpuscle', 'tactile corpuscle', 'sensory nerve ending', 'dermal nerve'], part((m) => { bal(m, -0.0215, 0.0016, 0, 0.0012, [0.7, 1.4, 0.7]); tb(m, [[-0.0215, 0.003, 0], [-0.0212, 0.006, 0], [-0.0218, 0.0095, 0]], 0.0003); }));
  }
}
