/**
 * Tiny geometry kit for the schematic stand-ins: tubes along a spline with a varying radius,
 * and low-poly spheres for ganglia. Everything is metres in the atlas body frame.
 */
export type V3 = [number, number, number];
export interface Pt { p: V3; r: number }
export interface Piece { positions: Float32Array; indices: Uint32Array }

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const v = { sub, add, mul, dot, cross, len, norm };

/** Uniform Catmull-Rom through the control points, resampled every `step` metres. */
export function resample(ctrlIn: Pt[], step: number): Pt[] {
  // Drop repeated control points (they make zero-length tangents).
  const ctrl = ctrlIn.filter((c, i) => i === 0 || len(sub(c.p, ctrlIn[i - 1]!.p)) > 2e-4);
  if (ctrl.length < 2) return ctrl;
  const out: Pt[] = [];
  const at = (i: number) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))]!;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const n = Math.max(1, Math.ceil(len(sub(p2.p, p1.p)) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ p: [f(p0.p[0], p1.p[0], p2.p[0], p3.p[0]), f(p0.p[1], p1.p[1], p2.p[1], p3.p[1]), f(p0.p[2], p1.p[2], p2.p[2], p3.p[2])], r: Math.max(1e-4, f(p0.r, p1.r, p2.r, p3.r)) });
    }
  }
  out.push(ctrl[ctrl.length - 1]!);
  return out;
}

export class MeshBuilder {
  positions: number[] = [];
  indices: number[] = [];

  /** A closed tube (end caps included), CCW outward. */
  tube(ctrl: Pt[], opts: { step?: number; sides?: number } = {}) {
    const step = opts.step ?? 0.003, sides = opts.sides ?? 6;
    const pts = resample(ctrl, step);
    if (pts.length < 2) return;
    let prevN: V3 | null = null;
    const base = this.positions.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)]!.p, b = pts[Math.min(pts.length - 1, i + 1)]!.p;
      const T = norm(sub(b, a));
      let N: V3;
      if (!prevN) { const ref: V3 = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; N = norm(cross(T, ref)); }
      else { N = norm(sub(prevN, mul(T, dot(prevN, T)))); }
      prevN = N;
      const B = cross(T, N);
      for (let s = 0; s < sides; s++) {
        const ang = (s / sides) * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang);
        const q = add(pts[i]!.p, add(mul(N, c * pts[i]!.r), mul(B, sn * pts[i]!.r)));
        this.positions.push(q[0], q[1], q[2]);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < sides; s++) {
      const a = base + i * sides + s, b = base + i * sides + ((s + 1) % sides), c = a + sides, d = b + sides;
      this.indices.push(a, b, c, b, d, c);
    }
    for (const [end, flip] of [[0, true], [pts.length - 1, false]] as const) {
      const ci = this.positions.length / 3;
      const cp = pts[end]!.p; this.positions.push(cp[0], cp[1], cp[2]);
      for (let s = 0; s < sides; s++) {
        const a = base + end * sides + s, b = base + end * sides + ((s + 1) % sides);
        if (flip) this.indices.push(ci, b, a); else this.indices.push(ci, a, b);
      }
    }
  }

  /** Icosphere, one subdivision (42 vertices). */
  sphere(c: V3, r: number, scale: V3 = [1, 1, 1]) {
    const t = (1 + Math.sqrt(5)) / 2;
    let verts: V3[] = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((x) => norm(x as V3));
    let faces: number[][] = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const mid = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const k = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = mid.get(k); if (hit !== undefined) return hit;
      verts.push(norm(mul(add(verts[a]!, verts[b]!), 0.5))); mid.set(k, verts.length - 1); return verts.length - 1;
    };
    const nf: number[][] = [];
    for (const [a, b, c2] of faces as [number, number, number][]) { const ab = midpoint(a, b), bc = midpoint(b, c2), ca = midpoint(c2, a); nf.push([a, ab, ca], [b, bc, ab], [c2, ca, bc], [ab, bc, ca]); }
    faces = nf;
    const base = this.positions.length / 3;
    for (const p of verts) this.positions.push(c[0] + p[0] * r * scale[0], c[1] + p[1] * r * scale[1], c[2] + p[2] * r * scale[2]);
    for (const f of faces) this.indices.push(base + f[0]!, base + f[1]!, base + f[2]!);
  }

  build(): Piece { return { positions: new Float32Array(this.positions), indices: new Uint32Array(this.indices) }; }
}

/** Signed volume; positive when triangles wind counter-clockwise seen from outside. */
export function signedVolume(m: Piece): number {
  let vol = 0;
  for (let t = 0; t < m.indices.length; t += 3) {
    const a = m.indices[t]! * 3, b = m.indices[t + 1]! * 3, c = m.indices[t + 2]! * 3;
    const A: V3 = [m.positions[a]!, m.positions[a + 1]!, m.positions[a + 2]!], B: V3 = [m.positions[b]!, m.positions[b + 1]!, m.positions[b + 2]!], C: V3 = [m.positions[c]!, m.positions[c + 1]!, m.positions[c + 2]!];
    vol += dot(A, cross(B, C)) / 6;
  }
  return vol;
}

/** Orthonormal frame (N, B) perpendicular to the tangent at index i of a polyline. */
export function frameAt(path: V3[], i: number): { T: V3; N: V3; B: V3 } {
  const a = path[Math.max(0, i - 1)]!, b = path[Math.min(path.length - 1, i + 1)]!;
  const T = norm(sub(b, a));
  const ref: V3 = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const N = norm(cross(T, ref));
  return { T, N, B: cross(T, N) };
}

/**
 * A closed, thin-walled solid between two parametric surfaces on the same (u, v) grid: `outer`
 * and `inner` return a point for u, v in [0, 1]. With `wrapU` the u direction is periodic (a
 * sleeve); otherwise the four edges are closed with side strips. Winding is fixed so the volume
 * is positive. Used for eyelids, tarsal plates, the periorbita and joint capsules.
 */
export function gridShell(outer: (u: number, v: number) => V3, inner: (u: number, v: number) => V3, nu: number, nv: number, wrapU = false): Piece {
  const pos: number[] = [], idx: number[] = [];
  const cols = wrapU ? nu : nu + 1;
  const at = (i: number, j: number) => (wrapU ? ((i % nu) + nu) % nu : i) + j * cols;
  for (const f of [outer, inner]) for (let j = 0; j <= nv; j++) for (let i = 0; i < cols; i++) pos.push(...f(i / nu, j / nv));
  const n = cols * (nv + 1);
  const O = (i: number, j: number) => at(i, j), I = (i: number, j: number) => n + at(i, j);
  for (let j = 0; j < nv; j++) for (let i = 0; i < (wrapU ? nu : nu); i++) {
    const A = O(i, j), B = O(i + 1, j), C = O(i + 1, j + 1), D = O(i, j + 1);
    idx.push(A, B, C, A, C, D);
    const Ai = I(i, j), Bi = I(i + 1, j), Ci = I(i + 1, j + 1), Di = I(i, j + 1);
    idx.push(Ai, Ci, Bi, Ai, Di, Ci);
  }
  const side = (P: number, Q: number, Pi: number, Qi: number) => idx.push(Q, P, Pi, Q, Pi, Qi);
  for (let i = 0; i < nu; i++) { side(O(i, 0), O(i + 1, 0), I(i, 0), I(i + 1, 0)); side(O(i + 1, nv), O(i, nv), I(i + 1, nv), I(i, nv)); }
  if (!wrapU) for (let j = 0; j < nv; j++) { side(O(nu, j), O(nu, j + 1), I(nu, j), I(nu, j + 1)); side(O(0, j + 1), O(0, j), I(0, j + 1), I(0, j)); }
  let m: Piece = { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
  if (signedVolume(m) < 0) { const f = new Uint32Array(idx.length); for (let t = 0; t < idx.length; t += 3) { f[t] = idx[t]!; f[t + 1] = idx[t + 2]!; f[t + 2] = idx[t + 1]!; } m = { positions: m.positions, indices: f }; }
  return m;
}

/** A thin hollow cylinder (open at both ends) around `centre` along `axis`: a joint-capsule sleeve. */
export function sleeve(centre: V3, axis: V3, length: number, radius: number, thickness: number, stretch: [number, number] = [1, 1]): Piece {
  const a = norm(axis);
  const ref: V3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = norm(cross(a, ref)), e2 = cross(a, e1);
  const pt = (r: number) => (u: number, t: number): V3 => {
    const ang = u * Math.PI * 2, bulge = 1 + 0.25 * Math.sin(t * Math.PI);
    return add(add(centre, mul(a, (t - 0.5) * length)), add(mul(e1, Math.cos(ang) * r * bulge * stretch[0]), mul(e2, Math.sin(ang) * r * bulge * stretch[1])));
  };
  return gridShell(pt(radius + thickness), pt(radius), 12, 4, true);
}
