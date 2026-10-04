/**
 * Fourth batch of schematic stand-ins (anatomy-fixes-4, last atlas gaps). Everything here is GENERATED, labelled "(schematic)",
 * provenance `generated`, never counted as real anatomy:
 *
 *  - female only: breast envelope (a thin plate of fat / glandular tissue under the skin, anchored on the nipple, in front of the
 *    pectoralis and ribs), Cooper's (suspensory) ligaments, 15 lactiferous ducts with branching to the nipple, the axillary tail;
 *  - male only: bulbar and penile (spongy) parts of the urethra (cut from the centre line of the real urethra mesh), bulbourethral
 *    (Cowper's) glands and their ducts on the membranous urethra;
 *  - body cavities (category `schematic cavity`): pericardial cavity, transverse and oblique pericardial sinuses, omental bursa,
 *    retropubic space, tympanic cavities (both sexes); rectovesical pouch (male); rectouterine and vesicouterine pouches (female).
 *
 * Sizes and positions come from the real neighbouring meshes of the same body. Small shapes are pushed away from the real structures
 * around them (`relax`), shapes on the chest follow the skin field, and `build-schematic.ts` pulls anything left outside the skin back in.
 */
import { MeshBuilder, gridShell, v, type Piece, type V3 } from './geom';
import { points, type openBody } from './io';
import { loadSkinField } from './skinfield';
import { SIDES, lerp, pt, tubeMesh, type Item } from './generate';
import { add3, centreLine, mean, norm3, pathLen, radialShell, scale3, sheet, sub, subLine } from './more';

type Body = Awaited<ReturnType<typeof openBody>>;
type Box = [number, number, number, number, number, number];

/** Small deterministic generator, so a rebuild gives the same shapes. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Points in a spatial hash, for "everything within r of p" queries. */
export class Cloud {
  private m = new Map<number, V3[]>();
  constructor(pts: V3[], private cell = 0.004) { for (const p of pts) { const k = this.key(p); (this.m.get(k) ?? this.m.set(k, []).get(k)!).push(p); } }
  private ck(x: number) { return Math.floor(x / this.cell) + 2048; }
  private key(p: V3) { return (this.ck(p[0]) * 4096 + this.ck(p[1])) * 4096 + this.ck(p[2]); }
  each(p: V3, r: number, fn: (q: V3) => void) {
    const n = Math.ceil(r / this.cell), cx = this.ck(p[0]), cy = this.ck(p[1]), cz = this.ck(p[2]);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) for (const q of this.m.get(((cx + i) * 4096 + (cy + j)) * 4096 + (cz + k)) ?? []) fn(q);
  }
  /** Smallest distance from p to a point, searching out to r (Infinity when none). */
  dist(p: V3, r: number): number { let d = Infinity; this.each(p, r, (q) => { const e = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (e < d) d = e; }); return d; }
}

/**
 * Push a point away from a cloud until it is outside the ellipsoid of half-axes `sc` around every cloud point (or `maxMove` is used up).
 * Works in the scaled space of the ellipsoid, so a thin disc is pushed along its short axis.
 */
export function relax(p0: V3, cloud: Cloud, sc: V3, maxMove = 0.01, iters = 40): V3 {
  let p = p0;
  const R = Math.max(sc[0], sc[1], sc[2]);
  for (let it = 0; it < iters; it++) {
    const sum: V3 = [0, 0, 0]; let worst = 0;
    cloud.each(p, R, (q) => {
      const d: V3 = [(p[0] - q[0]) / sc[0], (p[1] - q[1]) / sc[1], (p[2] - q[2]) / sc[2]], dl = Math.hypot(d[0], d[1], d[2]);
      if (dl >= 1) return;
      const k = 1 - dl, dir: V3 = dl < 1e-6 ? [0, 0, 1] : [d[0] / dl, d[1] / dl, d[2] / dl];
      sum[0] += dir[0] * k; sum[1] += dir[1] * k; sum[2] += dir[2] * k; if (k > worst) worst = k;
    });
    if (!worst) break;
    const L = Math.hypot(sum[0], sum[1], sum[2]) || 1;
    const next: V3 = [p[0] + (sum[0] / L) * worst * 0.5 * sc[0], p[1] + (sum[1] / L) * worst * 0.5 * sc[1], p[2] + (sum[2] / L) * worst * 0.5 * sc[2]];
    const dv = sub(next, p0), dl = v.len(dv);
    p = dl > maxMove ? add3(p0, scale3(dv, maxMove / dl)) : next;
  }
  return p;
}

/** A hollow ellipsoid with half-axes `h` and a wall of `wall` metres. */
export function ellShell(c: V3, h: V3, wall: number, nu = 20, nv = 12): Piece {
  const surf = (k: number) => (u: number, w: number): V3 => {
    const ph = u * Math.PI * 2, th = w * Math.PI, a = Math.max(2e-4, h[0] - k), b = Math.max(2e-4, h[1] - k), cc = Math.max(2e-4, h[2] - k);
    return [c[0] + a * Math.sin(th) * Math.cos(ph), c[1] + b * Math.cos(th), c[2] + cc * Math.sin(th) * Math.sin(ph)];
  };
  return gridShell(surf(0), surf(wall), nu, nv, true);
}

export async function generateGaps(b: Body, body: 'male' | 'female', items: Item[]): Promise<void> {
  const has = (id: string) => !!b.info(id);
  const P = async (id: string): Promise<V3[]> => points(await b.mesh(id));
  const B = (id: string) => b.need(id).bounds;
  const C = (id: string) => b.need(id).centroid as V3;
  const add = (x: Omit<Item, 'side' | 'systems' | 'aliases'> & { side?: Item['side']; systems: Item['systems']; aliases?: string[] }) => {
    if (items.some((i) => i.id === x.id)) throw new Error(`${body}: duplicate id ${x.id}`);
    items.push({ side: 'none', ...x, name: `${x.name} (schematic)` } as Item);
  };
  const tube = (ps: V3[], r0: number, r1 = r0): Piece => tubeMesh([ps.map((p, i) => pt(p, r0 + ((r1 - r0) * i) / Math.max(1, ps.length - 1)))]);
  const blob = (c: V3, r: number, sc: V3 = [1, 1, 1]): Piece => { const m = new MeshBuilder(); m.sphere(c, r, sc); return m.build(); };

  /** Real structures around a site, as points (muscle, fascia, skin and the like are left out: they pack every gap). */
  const SKIP_CAT = new Set(['muscle', 'fascia', 'skin layer', 'hair', 'nail', 'tendon sheath', 'bursa', 'brain region', 'lymph node', 'adipose', 'meninges', 'spinal cord segment']);
  const near = async (box: Box, skip: (id: string) => boolean = () => false): Promise<Cloud> => {
    const seen = new Set<string>(), pts: V3[] = [];
    for (const id of [...b.detail.structures.map((s) => s.id), ...b.core.structures.map((s) => s.id)]) {
      if (seen.has(id)) continue; seen.add(id);
      const s = b.info(id)!;
      if (s.provenance === 'generated' || s.provenance === 'procedural' || (s.category && SKIP_CAT.has(s.category)) || id === 'skin' || id === 'rib-cage' || skip(id)) continue;
      const k = s.bounds;
      if (k[3] < box[0] || k[0] > box[3] || k[4] < box[1] || k[1] > box[4] || k[5] < box[2] || k[2] > box[5]) continue;
      try { for (const p of points(await b.mesh(id))) if (p[0] >= box[0] && p[0] <= box[3] && p[1] >= box[1] && p[1] <= box[4] && p[2] >= box[2] && p[2] <= box[5]) pts.push(p); } catch { /* no geometry */ }
    }
    return new Cloud(pts, 0.004);
  };
  const around = (c: V3, r: number): Box => [c[0] - r, c[1] - r, c[2] - r, c[0] + r, c[1] + r, c[2] + r];

  // ---- front of the skin and of the chest wall ------------------------------------------------------------------------------------
  const field = loadSkinField(body);
  const skinPts = await P('skin'), zGrid = new Map<string, number>();
  const zMid = (Math.min(...skinPts.map((p) => p[2])) + Math.max(...skinPts.map((p) => p[2]))) / 2;
  for (const p of skinPts) { if (p[2] < zMid) continue; const k = `${Math.round(p[0] / 0.003)},${Math.round(p[1] / 0.003)}`; const z = zGrid.get(k); if (z === undefined || p[2] > z) zGrid.set(k, p[2]); }
  const skinZ = (x: number, y: number): number => {
    const z = field?.frontZ(x, y);
    if (z !== null && z !== undefined) return z;
    let best = -Infinity; const cx = Math.round(x / 0.003), cy = Math.round(y / 0.003);
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const q = zGrid.get(`${cx + i},${cy + j}`); if (q !== undefined && q > best) best = q; }
    return best;
  };
  const wall: Map<string, number> = new Map();
  for (const id of ['pectoralis-major-l', 'pectoralis-major-r', 'rib-cage', 'body-of-sternum', 'manubrium-of-sternum']) {
    if (!has(id)) continue;
    for (const p of await P(id)) { const k = `${Math.round(p[0] / 0.004)},${Math.round(p[1] / 0.004)}`; const z = wall.get(k); if (z === undefined || p[2] > z) wall.set(k, p[2]); }
  }
  /** Front of the pectoralis and ribs at (x, y). */
  const chestZ = (x: number, y: number): number => {
    let best = -Infinity; const cx = Math.round(x / 0.004), cy = Math.round(y / 0.004);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const q = wall.get(`${cx + i},${cy + j}`); if (q !== undefined && q > best) best = q; }
    return best;
  };

  // ==== FEMALE: breast envelope, Cooper's ligaments, lactiferous ducts, axillary tail ======================================================
  if (body === 'female') for (const s of SIDES) {
    const gid = `mammary-gland-${s[2]}`, nip = items.find((i) => i.id === `nipple-${s[2]}`);
    if (!has(gid) || !nip) continue;
    const nb = (() => { const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < nip.mesh.positions.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, nip.mesh.positions[i + k]!); hi[k] = Math.max(hi[k]!, nip.mesh.positions[i + k]!); } return { lo, hi }; })();
    const N: [number, number] = [(nb.lo[0] + nb.hi[0]) / 2, (nb.lo[1] + nb.hi[1]) / 2], nipZ = (nb.lo[2] + nb.hi[2]) / 2;
    const gb = B(gid), gx = (gb[0] + gb[3]) / 2, gy = (gb[1] + gb[4]) / 2, rx = 0.45 * (gb[3] - gb[0]), ry = 0.45 * (gb[4] - gb[1]);
    /** Distance from the nipple to the edge of the footprint (an ellipse over the real gland) along direction phi. */
    const reach = (phi: number): number => {
      const dx = Math.cos(phi), dy = Math.sin(phi), ox = (N[0] - gx) / rx, oy = (N[1] - gy) / ry, ax = dx / rx, ay = dy / ry;
      const A = ax * ax + ay * ay, Bq = 2 * (ox * ax + oy * ay), Cq = ox * ox + oy * oy - 1;
      return (-Bq + Math.sqrt(Math.max(0, Bq * Bq - 4 * A * Cq))) / (2 * A);
    };
    const xy = (phi: number, rho: number): [number, number] => [N[0] + rho * reach(phi) * Math.cos(phi), N[1] + rho * reach(phi) * Math.sin(phi)];
    const OUT = 0.0035, TH = 0.003; // the plate lies 3.5 mm under the skin and is 3 mm thick
    /** The point `d` metres under the skin at (x, y), along the skin normal. */
    const under = (x: number, y: number, d: number): V3 => { const zf = skinZ(x, y); if (!field) return [x, y, zf - d]; const p: V3 = [x, y, zf], g = field.grad(p, 0.006); return add3(p, scale3(g, d)); };
    const top = (x: number, y: number) => under(x, y, OUT)[2];
    const topP = (x: number, y: number): V3 => under(x, y, OUT);
    const bottomP = (x: number, y: number): V3 => { const t = topP(x, y), q = under(x, y, OUT + TH); return [q[0], q[1], Math.min(t[2] - 0.0015, Math.max(q[2], chestZ(q[0], q[1]) + 0.001))]; };
    // envelope: a cap that follows the skin over the gland, apex under the nipple
    const cap = (f: (x: number, y: number) => V3) => (u: number, w: number): V3 => { const [x, y] = xy(u * Math.PI * 2, w); return f(x, y); };
    add({ id: `breast-envelope-${s[2]}`, name: `${s[3]} breast envelope (fat and glandular tissue)`, side: s[0], systems: ['integumentary', 'reproductive'], region: 'thorax', category: 'schematic gland',
      mesh: gridShell(cap(topP), cap(bottomP), 36, 10, true), aliases: ['breast', 'mamma', 'corpus mammae', 'breast fat', 'adipose tissue of breast', 'mammary fat pad', 'glandular tissue of breast'] });
    // Cooper's ligaments: fibrous septa from the fascia over the pectoralis to the dermis, leaning towards the nipple
    const cb = new MeshBuilder();
    const rings: [number, number][] = [[0.3, 8], [0.55, 13], [0.8, 18]];
    rings.forEach(([rho, n], ri) => {
      for (let j = 0; j < n; j++) {
        const phi = ((j + 0.5 * (ri % 2)) / n) * Math.PI * 2, [bx, by] = xy(phi, rho), [fx, fy] = xy(phi, rho * 0.86);
        const zb = chestZ(bx, by) + 0.002, zt = top(fx, fy) - 0.0005;
        if (zt - zb < 0.006) continue;
        const mid: V3 = [(bx + fx) / 2, (by + fy) / 2, (zb + zt) / 2];
        cb.tube([pt([bx, by, zb], 0.0007), pt(mid, 0.0005), pt([fx, fy, zt], 0.0004)], { sides: 4, step: 0.006 });
      }
    });
    add({ id: `suspensory-ligaments-of-breast-${s[2]}`, name: `${s[3]} suspensory ligaments of breast (Cooper's ligaments)`, side: s[0], systems: ['connective', 'integumentary'], region: 'thorax', category: 'schematic ligament', mesh: cb.build(),
      aliases: ["Cooper's ligaments", 'ligaments of Cooper', 'ligamenta suspensoria mammae', 'suspensory ligaments of the breast', 'breast ligaments'] });
    // lactiferous ducts: 15 ducts from the nipple, each branching twice towards the lobules
    const rnd = rng(7 + (s[1] > 0 ? 0 : 100)), db = new MeshBuilder();
    const S0: V3 = [N[0], N[1], nipZ - 0.0018];
    const band = (x: number, y: number, z: number): V3 => [x, y, Math.max(chestZ(x, y) + 0.004, Math.min(top(x, y) - 0.005, z))];
    for (let i = 0; i < 15; i++) {
      const phi = ((i + 0.3 * rnd()) / 15) * Math.PI * 2, rho = 0.45 + 0.4 * rnd(), [ex, ey] = xy(phi, rho);
      const E = band(ex, ey, lerp([0, 0, chestZ(ex, ey)], [0, 0, top(ex, ey)], 0.4 + 0.2 * rnd())[2]);
      const dir = norm3(sub(E, S0)), tang = norm3([-dir[1], dir[0], 0]);
      const J1 = band(...(lerp(S0, E, 0.42) as V3) as [number, number, number]);
      db.tube([pt(S0, 0.0009), pt(lerp(S0, J1, 0.5), 0.0008), pt(J1, 0.0007)], { sides: 5, step: 0.005 });
      for (const sg of [-1, 1]) {
        const K = band(...(add3(lerp(J1, E, 0.55), scale3(tang, sg * (0.005 + 0.003 * rnd()))) as [number, number, number]));
        db.tube([pt(J1, 0.0007), pt(lerp(J1, K, 0.5), 0.0006), pt(K, 0.0005)], { sides: 5, step: 0.005 });
        for (const sg2 of [-1, 1]) {
          const T = band(...(add3(add3(E, scale3(tang, sg * 0.007 + sg2 * 0.004)), scale3(dir, 0.004 * rnd())) as [number, number, number]));
          db.tube([pt(K, 0.0005), pt(lerp(K, T, 0.5), 0.00042), pt(T, 0.00035)], { sides: 5, step: 0.005 });
        }
      }
    }
    add({ id: `lactiferous-ducts-${s[2]}`, name: `${s[3]} lactiferous ducts (15, branching to the nipple)`, side: s[0], systems: ['reproductive', 'integumentary'], region: 'thorax', category: 'schematic gland', mesh: db.build(),
      aliases: ['milk ducts', 'ductus lactiferi', 'lactiferous sinuses', 'mammary ducts', 'breast ducts'] });
    // axillary tail (tail of Spence): a tongue of breast tissue from the upper outer quadrant towards the axilla
    const phiT = Math.atan2(0.67, 0.74 * s[1]), start = xy(phiT, 0.5), endR = reach(phiT) + 0.028;
    const endP: [number, number] = [N[0] + endR * Math.cos(phiT), N[1] + endR * Math.sin(phiT)];
    const tail = (f: (x: number, y: number) => V3) => (u: number, w: number): V3 => {
      const cx = start[0] + (endP[0] - start[0]) * u, cy = start[1] + (endP[1] - start[1]) * u, hw = 0.016 * (1 - 0.55 * u);
      const px = -Math.sin(phiT), py = Math.cos(phiT), off = (2 * w - 1) * hw, x = cx + px * off, y = cy + py * off;
      return f(x, y);
    };
    add({ id: `axillary-tail-of-breast-${s[2]}`, name: `${s[3]} axillary tail of breast (tail of Spence)`, side: s[0], systems: ['integumentary', 'reproductive'], region: 'thorax', category: 'schematic gland',
      mesh: gridShell(tail((x, y) => under(x, y, 0.0045)), tail((x, y) => { const q = under(x, y, 0.0085); return [q[0], q[1], Math.max(q[2], chestZ(q[0], q[1]) + 0.001)]; }), 14, 6, false),
      aliases: ['tail of Spence', 'axillary process of breast', 'processus axillaris', 'axillary tail of Spence'] });
  }

  // ==== MALE: bulbar and penile urethra, bulbourethral glands and ducts ===================================================================
  if (body === 'male' && has('urethra') && has('prostatic-urethra')) {
    const line = centreLine(await P('urethra'), 28, C('prostatic-urethra')), L = pathLen(line);
    const at = (s: number): V3 => subLine(line, s, s + 1e-4)[0]!;
    if (line.length >= 4 && L > 0.075) {
      add({ id: 'bulbar-part-of-male-urethra', name: 'Bulbar part of male urethra', systems: ['urinary', 'reproductive'], region: 'pelvis', category: 'schematic organ', mesh: tube(subLine(line, 0.018, 0.05), 0.0042, 0.0036), aliases: ['bulbar urethra', 'pars bulbaris urethrae', 'spongy urethra, bulbar part', 'male urethra'] });
      add({ id: 'penile-part-of-male-urethra', name: 'Penile (spongy) part of male urethra', systems: ['urinary', 'reproductive'], region: 'pelvis', category: 'schematic organ', mesh: tube(subLine(line, 0.05, L - 0.014), 0.0034, 0.003), aliases: ['penile urethra', 'spongy urethra', 'pars spongiosa urethrae', 'pendulous urethra', 'male urethra'] });
      const M = at(0.011), Nn = at(0.028), T = norm3(sub(at(0.016), at(0.006)));
      const lat: V3 = [1, 0, 0], back = norm3(v.cross(lat, T)), post: V3 = back[2] <= 0 ? back : scale3(back, -1);
      const cloud = await near(around(M, 0.045), (id) => id === 'urethra' || id === 'other-urethra');
      for (const s of SIDES) {
        const want = add3(add3(M, scale3(lat, s[1] * 0.012)), scale3(post, 0.006));
        const G = relax(want, cloud, [0.0075, 0.0075, 0.0075], 0.012);
        add({ id: `bulbourethral-gland-${s[2]}`, name: `${s[3]} bulbourethral gland (Cowper's gland)`, side: s[0], systems: ['reproductive', 'urinary'], region: 'pelvis', category: 'schematic gland', mesh: blob(G, 0.0055, [1, 1, 1]),
          aliases: ["Cowper's gland", 'glandula bulbourethralis', 'bulbourethral glands', 'pea-sized gland of the membranous urethra'] });
        const mid = add3(lerp(G, Nn, 0.5), scale3(post, 0.002));
        add({ id: `duct-of-bulbourethral-gland-${s[2]}`, name: `${s[3]} duct of bulbourethral gland`, side: s[0], systems: ['reproductive', 'urinary'], region: 'pelvis', category: 'schematic gland', mesh: tube([G, mid, Nn], 0.0008, 0.0006),
          aliases: ["Cowper's duct", 'ductus glandulae bulbourethralis', 'bulbourethral duct'] });
      }
    } else console.warn(`male urethra: centre line too short (${(L * 1000).toFixed(0)} mm)`);
  }

  // ==== CAVITIES (both sexes unless noted): potential spaces drawn as thin-walled shells =====================================================
  const cav = (x: Omit<Item, 'side' | 'category' | 'aliases'> & { side?: Item['side']; aliases?: string[] }) => add({ ...x, category: 'schematic cavity' });
  // pericardial cavity: the film of fluid between the heart (epicardium) and the fibrous pericardium shell
  if (has('heart')) {
    const hp = await P('heart');
    cav({ id: 'pericardial-cavity', name: 'Pericardial cavity', systems: ['cardiovascular'], region: 'thorax', mesh: radialShell(mean(hp), hp, 0.0044, 0.0024, 30, 20),
      aliases: ['cavitas pericardialis', 'pericardial space', 'serous pericardium', 'pericardial sac cavity'] });
  }
  // pericardial sinuses
  if (has('ascending-aorta') && has('pulmonary-trunk') && has('superior-vena-cava') && has('cardiac-atrium-l')) {
    const ao = C('ascending-aorta'), la = B('cardiac-atrium-l'), laC = C('cardiac-atrium-l'), svc = B('superior-vena-cava'), pt0 = B('pulmonary-trunk'), aoB = B('ascending-aorta');
    const cloudH = await near(around([(svc[0] + pt0[3]) / 2, (aoB[1] + la[4]) / 2, (ao[2] + laC[2]) / 2], 0.07), (id) => /^(heart|aorta|inferior-vena-cava)$/.test(id));
    // transverse sinus: the passage behind the ascending aorta and pulmonary trunk, in front of the SVC and the left atrium
    const hT: V3 = [0.024, 0.0045, 0.0028];
    const c0: V3 = [(svc[0] + pt0[3]) / 2, (aoB[1] + la[4]) / 2 + 0.002, (ao[2] + laC[2]) / 2 - 0.004];
    const cT = relax(c0, cloudH, [hT[0] + 0.001, hT[1] + 0.001, hT[2] + 0.001], 0.012);
    cav({ id: 'transverse-pericardial-sinus', name: 'Transverse pericardial sinus', systems: ['cardiovascular'], region: 'thorax', mesh: ellShell(cT, hT, 0.0011), aliases: ['sinus transversus pericardii', 'transverse sinus', 'pericardial sinus'] });
    // oblique sinus: the blind recess behind the left atrium between the pulmonary veins
    const hO: V3 = [0.014, 0.0095, 0.0022];
    const o0: V3 = [laC[0], laC[1] + 0.002, la[2] - 0.0045];
    const cO = relax(o0, cloudH, [hO[0] + 0.001, hO[1] + 0.001, hO[2] + 0.001], 0.012);
    cav({ id: 'oblique-pericardial-sinus', name: 'Oblique pericardial sinus', systems: ['cardiovascular'], region: 'thorax', mesh: ellShell(cO, hO, 0.0009), aliases: ['sinus obliquus pericardii', 'oblique sinus', 'pericardial sinus'] });
  }
  // omental bursa (lesser sac): a thin pocket behind the stomach and lesser omentum, in front of the pancreas
  if (has('stomach') && has('pancreas')) {
    const st = await P('stomach'), pan = await P('pancreas'), sb = B('stomach'), pb = B('pancreas');
    const cell = 0.006, grid = (pts: V3[], pick: (a: number, c: number) => number) => { const g = new Map<string, number>(); for (const p of pts) { const k = `${Math.round(p[0] / cell)},${Math.round(p[1] / cell)}`; const z = g.get(k); g.set(k, z === undefined ? p[2] : pick(z, p[2])); } return g; };
    const back = grid(st, Math.min), front = grid(pan, Math.max);
    const look = (g: Map<string, number>, x: number, y: number, pick: (a: number, c: number) => number): number | null => { let r: number | null = null; const cx = Math.round(x / cell), cy = Math.round(y / cell); for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const z = g.get(`${cx + i},${cy + j}`); if (z !== undefined) r = r === null ? z : pick(r, z); } return r; };
    const x0 = (sb[0] + sb[3]) / 2 - 0.005, y0 = (Math.min(pb[1], sb[1]) + sb[4]) / 2 - 0.004, hx = (sb[3] - sb[0]) / 2 - 0.016, hy = (sb[4] - Math.min(pb[1], sb[1])) / 2 - 0.012;
    const nx = 14, ny = 10, lat: V3[][] = [];
    const cloud = await near([x0 - hx - 0.02, y0 - hy - 0.02, sb[2] - 0.05, x0 + hx + 0.02, y0 + hy + 0.02, sb[5] + 0.02], (id) => /^(omentum|greater-omentum)/.test(id));
    for (let j = 0; j <= ny; j++) { const row: V3[] = []; for (let i = 0; i <= nx; i++) {
      const X = (2 * i) / nx - 1, Y = (2 * j) / ny - 1, x = x0 + hx * X * Math.sqrt(1 - (Y * Y) / 2), y = y0 + hy * Y * Math.sqrt(1 - (X * X) / 2);
      const zb = look(back, x, y, Math.min) ?? sb[2] + 0.01, zp = look(front, x, y, Math.max);
      const z = zp !== null && zb - zp > 0.004 ? (zb + zp) / 2 : zb - 0.0035;
      row.push(relax([x, y, z], cloud, [0.0065, 0.0065, 0.0026], 0.008, 25)); } lat.push(row); }
    for (let pass = 0; pass < 2; pass++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) { const q = lat[j]![i]!; lat[j]![i] = [q[0], q[1], 0.5 * q[2] + 0.125 * (lat[j]![i - 1]![2] + lat[j]![i + 1]![2] + lat[j - 1]![i]![2] + lat[j + 1]![i]![2])]; }
    const Pf = (u: number, w: number): V3 => { const f = Math.min(nx - 1e-6, u * nx), g = Math.min(ny - 1e-6, w * ny), i = Math.floor(f), j = Math.floor(g), a = f - i, c = g - j; const q = (jj: number, ii: number) => lat[jj]![ii]!; return lerp(lerp(q(j, i), q(j, i + 1), a), lerp(q(j + 1, i), q(j + 1, i + 1), a), c); };
    cav({ id: 'omental-bursa', name: 'Omental bursa (lesser sac)', systems: ['digestive'], region: 'abdomen', mesh: sheet(Pf, 28, 20, 0.0012), aliases: ['lesser sac', 'bursa omentalis', 'lesser peritoneal sac', 'omental sac'] });
  }
  // peritoneal pouches and the retropubic space
  const slab = (pts: V3[], y: number, w = 0.01): V3[] => pts.filter((p) => Math.abs(p[1] - y) <= w);
  const zRange = (pts: V3[], y: number, w?: number): [number, number] | null => { const s = slab(pts, y, w); return s.length ? [Math.min(...s.map((p) => p[2])), Math.max(...s.map((p) => p[2]))] : null; };
  const pouch = async (id: string, name: string, c0: V3, h: V3, systems: Item['systems'], region: string, aliases: string[]) => {
    const cl = await near(around(c0, 0.06));
    const c = relax(c0, cl, [h[0] + 0.0012, h[1] + 0.0012, h[2] + 0.0012], 0.012);
    cav({ id, name, systems, region, mesh: ellShell(c, h, 0.0011), aliases });
  };
  if (has('rectum') && has('urinary-bladder')) {
    const rect = await P('rectum'), bl = await P('urinary-bladder'), blC = C('urinary-bladder'), rC = C('rectum');
    if (body === 'male' && has('seminal-gland-l')) {
      const y0 = Math.max(B('seminal-gland-l')[4], B('seminal-gland-r')[4]) + 0.008, zr = zRange(rect, y0, 0.012), zbk = zRange(bl, y0, 0.012);
      const z0 = zr && zbk ? (zr[1] + zbk[0]) / 2 : (rC[2] + blC[2]) / 2;
      await pouch('rectovesical-pouch', 'Rectovesical pouch', [(rC[0] + blC[0]) / 2, y0, z0], [0.015, 0.013, 0.0045], ['digestive', 'urinary'], 'pelvis', ['excavatio rectovesicalis', 'rectovesical excavation', 'peritoneal pouch', 'pouch between rectum and bladder']);
    }
    if (body === 'female' && has('uterus') && has('vagina')) {
      const uC = C('uterus'), y0 = B('vagina')[4] + 0.006, zr = zRange(rect, y0, 0.015), zu = zRange(await P('uterus'), y0, 0.015);
      const z0 = zr && zu ? (zr[1] + zu[0]) / 2 : (rC[2] + uC[2]) / 2;
      await pouch('rectouterine-pouch', 'Rectouterine pouch (pouch of Douglas)', [(rC[0] + uC[0]) / 2, y0, z0], [0.016, 0.016, 0.0045], ['reproductive', 'digestive'], 'pelvis', ['pouch of Douglas', 'excavatio rectouterina', 'rectouterine excavation', 'cul-de-sac', 'peritoneal pouch']);
      const y1 = B('urinary-bladder')[4] + 0.002;
      await pouch('vesicouterine-pouch', 'Vesicouterine pouch', [uC[0], y1, B('uterus')[5] + 0.002], [0.014, 0.008, 0.004], ['reproductive', 'urinary'], 'pelvis', ['excavatio vesicouterina', 'vesicouterine excavation', 'uterovesical pouch', 'peritoneal pouch']);
    }
  }
  if (has('pubic-symphysis') && has('urinary-bladder')) {
    const sym = await P('pubic-symphysis'), bl = await P('urinary-bladder'), sC = C('pubic-symphysis'), bC = C('urinary-bladder');
    const y0 = sC[1] + 0.014, zs = zRange(sym, sC[1], 0.016), zb = zRange(bl, y0, 0.012);
    const z0 = zs ? (zs[0] + (zb ? Math.max(zb[1], zs[0] - 0.014) : zs[0] - 0.012)) / 2 : sC[2] - 0.008;
    await pouch('retropubic-space', 'Retropubic space (space of Retzius)', [(sC[0] + bC[0]) / 2, y0, Math.min(z0, (zs ? zs[0] : sC[2]) - 0.004)], [0.02, 0.016, 0.0035], ['urinary', 'connective'], 'pelvis', ['space of Retzius', 'spatium retropubicum', 'prevesical space', 'cave of Retzius']);
  }
  // tympanic cavities: the middle-ear cavity around the ossicles, medial to the tympanic membrane
  for (const s of SIDES) {
    if (!has(`malleus-${s[2]}`) || !has(`incus-${s[2]}`) || !has(`stapes-${s[2]}`)) continue;
    const ps = [...(await P(`malleus-${s[2]}`)), ...(await P(`incus-${s[2]}`)), ...(await P(`stapes-${s[2]}`))], c = mean(ps);
    for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2; ps.push([c[0] + 0.0014 * Math.cos(a), c[1] + 0.0032 * Math.sin(a), c[2]], [c[0], c[1] + 0.0032 * Math.cos(a), c[2] + 0.004 * Math.sin(a)]); }
    cav({ id: `tympanic-cavity-${s[2]}`, name: `${s[3]} tympanic cavity (middle ear)`, side: s[0], systems: b.need(`tympanic-membrane-${s[2]}`).systems, region: 'head', mesh: radialShell(c, ps, 0.0011, 0.0005, 24, 14),
      aliases: ['middle ear', 'cavitas tympanica', 'middle ear cavity', 'tympanum'] });
  }
}
