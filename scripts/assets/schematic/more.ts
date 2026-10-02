/**
 * Third batch of schematic stand-ins (all GENERATED, labelled "(schematic)", never counted as real):
 *
 *  - the female external genitalia and urethra. No open licensed mesh of these exists: the HRA
 *    female body has the uterus, tubes, ovaries and vagina, and Z-Anatomy is a male body whose
 *    urethra is the long penile one, so it is excluded from the female (see detail-catalog.ts).
 *  - articular cartilage: a thin domed pad on each articulating surface of the main synovial joints,
 *    placed where the two registered bones are closest.
 *  - the remaining named cranial sutures, traced along the line where two registered skull bones meet.
 */
import { MeshBuilder, gridShell, v, type Piece, type V3 } from './geom';
import { points, type openBody } from './io';
import { SIDES, lerp, pt, tubeMesh, type Item } from './generate';

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
  if (body === 'female' && has('vagina') && has('pubic-symphysis')) {
    const vag = await P('vagina'), sym = B('pubic-symphysis'), skin = await P('skin');
    const lowest = [...vag].sort((p, q) => p[1] - q[1]).slice(0, Math.max(5, Math.floor(vag.length * 0.03)));
    const I = mean(lowest);
    const frontZ = (y: number): number => { let z = -Infinity; for (const p of skin) if (Math.abs(p[0]) < 0.012 && Math.abs(p[1] - y) < 0.006 && p[2] > z) z = p[2]; return z; };
    const vy = I[1] - 0.004, V: V3 = [0, vy, Math.min(frontZ(vy) - 0.005, I[2] + 0.04)];
    const tri = has('trigone-of-urinary-bladder') ? B('trigone-of-urinary-bladder') : B('urinary-bladder');
    const neck: V3 = [0, tri[1] + 0.004, (tri[2] + tri[5]) / 2];
    const U: V3 = [0, V[1] + 0.012, V[2] - 0.002];
    add({ id: 'female-urethra', name: 'Female urethra', systems: ['urinary'], region: 'pelvis', category: 'schematic organ', mesh: tube([neck, lerp(neck, U, 0.5), U], 0.0032, 0.0028), aliases: ['urethra', 'urethra feminina', 'external urethral orifice'] });
    // clitoris: glans under the clitoral hood, body to the pubic arch, two crura along the ischiopubic rami
    const G: V3 = [0, V[1] + 0.03, Math.min(frontZ(V[1] + 0.03) - 0.005, V[2] + 0.004)];
    const S0: V3 = [0, sym[1] - 0.002, sym[5] - 0.007];
    const gb = new MeshBuilder(); gb.sphere(G, 0.0055, [1, 1, 1]);
    add({ id: 'glans-of-clitoris', name: 'Glans of clitoris', systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: gb.build(), aliases: ['clitoris', 'clitoral glans', 'glans clitoridis'] });
    add({ id: 'body-of-clitoris', name: 'Body of clitoris', systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: tube([G, lerp(G, S0, 0.5), S0], 0.0045, 0.0055), aliases: ['clitoris', 'corpus clitoridis', 'corpora cavernosa of clitoris'] });
    for (const s of SIDES) {
      const hip = await P(`hip-bone-${s[2]}`);
      const tub = hip.filter((p) => p[1] < sym[1] + 0.02 && p[2] < sym[2] && Math.sign(p[0]) === s[1]).reduce<V3 | null>((q, p) => (!q || p[1] < q[1] ? p : q), null) ?? [s[1] * 0.06, sym[1] - 0.05, sym[2]];
      const T: V3 = [tub[0] - s[1] * 0.012, tub[1] + 0.012, tub[2] + 0.012];
      add({ id: `crus-of-clitoris-${s[2]}`, name: `${s[3]} crus of clitoris`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: tube([S0, lerp(S0, T, 0.5), T], 0.0055, 0.0065), aliases: ['clitoral crus', 'crus clitoridis'] });
      const bc: V3 = [s[1] * 0.017, V[1] + 0.002, V[2] - 0.016];
      const bb = new MeshBuilder(); bb.sphere(bc, 0.01, [0.7, 2.2, 0.9]);
      add({ id: `bulb-of-vestibule-${s[2]}`, name: `${s[3]} bulb of vestibule`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: bb.build(), aliases: ['vestibular bulb', 'bulbus vestibuli', 'clitoral bulb'] });
      const gc: V3 = [s[1] * 0.019, V[1] - 0.014, V[2] - 0.022];
      const gl = new MeshBuilder(); gl.sphere(gc, 0.0055, [1, 1, 1]);
      add({ id: `greater-vestibular-gland-${s[2]}`, name: `${s[3]} greater vestibular gland`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: gl.build(), aliases: ["Bartholin's gland", 'glandula vestibularis major'] });
      const lm = new MeshBuilder(); lm.sphere([s[1] * 0.0085, V[1] + 0.004, V[2] - 0.003], 0.008, [0.28, 2.2, 0.6]);
      add({ id: `labium-minus-${s[2]}`, name: `${s[3]} labium minus`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: lm.build(), aliases: ['labia minora', 'nymphae', 'labium minus pudendi'] });
      const lj = new MeshBuilder(); lj.sphere([s[1] * 0.021, V[1] + 0.003, V[2] - 0.009], 0.014, [0.45, 3.0, 0.8]);
      add({ id: `labium-majus-${s[2]}`, name: `${s[3]} labium majus`, side: s[0], systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: lj.build(), aliases: ['labia majora', 'labium majus pudendi'] });
    }
    const vb = new MeshBuilder(); vb.sphere([0, V[1] + 0.002, V[2] - 0.004], 0.01, [0.6, 1.6, 0.5]);
    add({ id: 'vestibule-of-vagina', name: 'Vestibule of vagina', systems: ['reproductive'], region: 'pelvis', category: 'schematic organ', mesh: vb.build(), aliases: ['vaginal vestibule', 'vestibulum vaginae', 'introitus', 'vaginal opening'] });
  }
}
