/**
 * Containment of generated stand-ins: a signed depth field of the united skin (scripts/qa/skin_field.py, 4 mm voxels, positive inside)
 * pulls any vertex that lies outside the skin back in, along the field's gradient, smoothed over neighbouring vertices so thin shapes
 * keep their form. Without the field file the pass is skipped with a warning.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Piece, V3 } from './geom';

export interface SkinField {
  depth(p: V3): number; grad(p: V3, step?: number): V3;
  /** Height z of the front skin surface above (x, y): the first inside point marching down from the front. */
  frontZ(x: number, y: number): number | null;
}

export function loadSkinField(body: 'male' | 'female', dir = process.env.SKIN_FIELD_DIR ?? '/workspace/work'): SkinField | null {
  const file = `${dir}/skin-field-${body}.bin`;
  if (!existsSync(file)) return null;
  const buf = readFileSync(file), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const lo: V3 = [dv.getFloat32(0, true), dv.getFloat32(4, true), dv.getFloat32(8, true)], h = dv.getFloat32(12, true);
  const n = [dv.getInt32(16, true), dv.getInt32(20, true), dv.getInt32(24, true)] as const;
  const data = new Int8Array(buf.buffer, buf.byteOffset + 28, n[0] * n[1] * n[2]);
  const at = (i: number, j: number, k: number) => (i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2] ? -127 : data[(i * n[1] + j) * n[2] + k]!) * 0.0005;
  const depth = (p: V3): number => {
    const fx = (p[0] - lo[0]) / h, fy = (p[1] - lo[1]) / h, fz = (p[2] - lo[2]) / h;
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz), tx = fx - i, ty = fy - j, tz = fz - k;
    let s = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) s += at(i + a, j + b, k + c) * (a ? tx : 1 - tx) * (b ? ty : 1 - ty) * (c ? tz : 1 - tz);
    return s;
  };
  const grad = (p: V3, step?: number): V3 => {
    const e = step ?? h * 0.75; const g: V3 = [depth([p[0] + e, p[1], p[2]]) - depth([p[0] - e, p[1], p[2]]), depth([p[0], p[1] + e, p[2]]) - depth([p[0], p[1] - e, p[2]]), depth([p[0], p[1], p[2] + e]) - depth([p[0], p[1], p[2] - e])];
    const l = Math.hypot(g[0], g[1], g[2]) || 1; return [g[0] / l, g[1] / l, g[2] / l];
  };
  const frontZ = (x: number, y: number): number | null => {
    let prevZ = 0.3, prev = depth([x, y, prevZ]);
    for (let z = 0.3 - 0.001; z > -0.3; z -= 0.001) { const d = depth([x, y, z]); if (d >= 0 && prev < 0) return prevZ + (z - prevZ) * (-prev / (d - prev)); prevZ = z; prev = d; }
    return null;
  };
  return { depth, grad, frontZ };
}

/** Pull vertices more than `-trigger` outside the skin back to `margin` inside it (at most `cap` m), smoothed over neighbours. Returns the largest move (m). */
export function containPiece(m: Piece, f: SkinField, trigger = -0.003, margin = 0.0005, cap = 0.02): { moved: number; max: number } {
  const nv = m.positions.length / 3, d = new Float32Array(nv * 3), nb: number[][] = Array.from({ length: nv }, () => []);
  for (let t = 0; t < m.indices.length; t += 3) for (let a = 0; a < 3; a++) { const x = m.indices[t + a]!, y = m.indices[t + (a + 1) % 3]!; nb[x]!.push(y); nb[y]!.push(x); }
  let moved = 0;
  for (let i = 0; i < nv; i++) {
    const p: V3 = [m.positions[i * 3]!, m.positions[i * 3 + 1]!, m.positions[i * 3 + 2]!], dep = f.depth(p);
    if (dep >= trigger) continue;
    const g = f.grad(p), mv = Math.min(cap, margin - dep);
    d[i * 3] = g[0] * mv; d[i * 3 + 1] = g[1] * mv; d[i * 3 + 2] = g[2] * mv; moved++;
  }
  if (!moved) return { moved: 0, max: 0 };
  // moved vertices keep their pull; their unmoved neighbours follow by a decaying average (two rings), so a thin shape is not kinked
  const fixed = new Uint8Array(nv); for (let i = 0; i < nv; i++) if (d[i * 3] !== 0 || d[i * 3 + 1] !== 0 || d[i * 3 + 2] !== 0) fixed[i] = 1;
  for (let it = 0; it < 2; it++) {
    const e = new Float32Array(d);
    for (let i = 0; i < nv; i++) { if (fixed[i] || !nb[i]!.length) continue; for (let k = 0; k < 3; k++) { let sum = 0; for (const j of nb[i]!) sum += d[j * 3 + k]!; e[i * 3 + k] = (sum / nb[i]!.length) * 0.7; } }
    d.set(e);
  }
  let max = 0;
  for (let i = 0; i < nv; i++) { for (let k = 0; k < 3; k++) m.positions[i * 3 + k]! += d[i * 3 + k]!; max = Math.max(max, Math.hypot(d[i * 3]!, d[i * 3 + 1]!, d[i * 3 + 2]!)); }
  return { moved, max };
}
