import { MeshoptEncoder } from 'meshoptimizer';
import type { Piece } from './geom';

/** Same packed layout as build-detail.ts / src/engine/packed.ts: 16-bit quantised inside the mesh bounds, meshopt streams. */
export function boundsOfPiece(m: Piece) {
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.positions.length; i += 3) for (let k = 0; k < 3; k++) { const v = m.positions[i + k]!; if (v < min[k]!) min[k] = v; if (v > max[k]!) max[k] = v; }
  return { min, max };
}

export function encodePiece(m: Piece, min: number[], max: number[]) {
  const nv = m.positions.length / 3;
  const q = new Uint16Array(nv * 4);
  for (let v = 0; v < nv; v++) for (let a = 0; a < 3; a++) {
    const span = max[a]! - min[a]!;
    q[v * 4 + a] = span > 0 ? Math.round(((m.positions[v * 3 + a]! - min[a]!) / span) * 65535) : 0;
  }
  const vb = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(q.buffer), nv, 8);
  const ib = MeshoptEncoder.encodeIndexBuffer(new Uint8Array(m.indices.buffer, m.indices.byteOffset, m.indices.byteLength), m.indices.length, 4);
  return { vb, ib, nv, ni: m.indices.length };
}
export { MeshoptEncoder };
