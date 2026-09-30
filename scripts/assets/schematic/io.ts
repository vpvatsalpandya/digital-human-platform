/**
 * Reading geometry back out of the shipped packs, so generated stand-ins can be placed from the
 * real, already-registered structures of the same body (vertebrae, cord, vessels, organs).
 */
import { readFileSync, existsSync } from 'node:fs';
import { MeshoptDecoder } from 'meshoptimizer';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { decodePacked } from '../../../src/engine/packed';
import type { ManifestStructure } from '../../../src/engine/types';
import type { Piece, V3 } from './geom';

export interface PackManifest { body: string; groups: { id: string; url: string; bytes: number; count: number; title: string; description?: string }[]; structures: ManifestStructure[]; [k: string]: unknown }

export async function openBody(root: string, body: 'male' | 'female') {
  await MeshoptDecoder.ready;
  const detail = JSON.parse(readFileSync(`${root}/public/assets/anatomy-v2/${body}.manifest.json`, 'utf8')) as PackManifest;
  const core = JSON.parse(readFileSync(`${root}/public/assets/hra-v1/${body}.manifest.json`, 'utf8')) as PackManifest;
  const files = new Map<string, ArrayBuffer>();
  const cache = new Map<string, Piece>();
  const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

  const info = (id: string): ManifestStructure | undefined => detail.structures.find((s) => s.id === id) ?? core.structures.find((s) => s.id === id);
  const need = (id: string): ManifestStructure => { const s = info(id); if (!s) throw new Error(`${body}: structure ${id} not found`); return s; };

  async function mesh(id: string): Promise<Piece> {
    const hit = cache.get(id); if (hit) return hit;
    const s = need(id);
    let out: Piece;
    if (s.packed && s.group) {
      const g = detail.groups.find((x) => x.id === s.group)!;
      if (!files.has(g.url)) { const b = readFileSync(`${root}/public${g.url}`); files.set(g.url, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer); }
      const d = decodePacked(files.get(g.url)!, s.packed, s.bounds, s.centroid, MeshoptDecoder as never);
      for (let i = 0; i < d.positions.length; i += 3) { d.positions[i]! += s.centroid[0]; d.positions[i + 1]! += s.centroid[1]; d.positions[i + 2]! += s.centroid[2]; }
      out = { positions: d.positions, indices: d.indices };
    } else if (s.lods?.length) {
      const file = `${root}/public${s.lods[0]!.url}`;
      if (!existsSync(file)) throw new Error(`missing ${file}`);
      const doc = await io.read(file);
      const pos: number[] = [];
      for (const node of doc.getRoot().listNodes()) {
        const m = node.getMesh(); if (!m) continue;
        const w = node.getWorldMatrix();
        for (const prim of m.listPrimitives()) {
          const acc = prim.getAttribute('POSITION')!;
          const tmp: number[] = [0, 0, 0];
          for (let i = 0; i < acc.getCount(); i++) {
            acc.getElement(i, tmp);
            const x = tmp[0]!, y = tmp[1]!, z = tmp[2]!;
            pos.push(w[0]! * x + w[4]! * y + w[8]! * z + w[12]!, w[1]! * x + w[5]! * y + w[9]! * z + w[13]!, w[2]! * x + w[6]! * y + w[10]! * z + w[14]!);
          }
        }
      }
      // Core GLBs are centred on the manifest centroid; the viewer positions them there.
      for (let i = 0; i < pos.length; i += 3) { pos[i]! += s.centroid[0]; pos[i + 1]! += s.centroid[1]; pos[i + 2]! += s.centroid[2]; }
      out = { positions: new Float32Array(pos), indices: new Uint32Array(0) };
    } else throw new Error(`${id} has no geometry`);
    cache.set(id, out);
    return out;
  }
  return { detail, core, info, need, mesh };
}

export function centreOf(s: ManifestStructure): V3 { return [s.centroid[0], s.centroid[1], s.centroid[2]]; }

/** Vertices as points. */
export function points(m: Piece): V3[] { const out: V3[] = []; for (let i = 0; i < m.positions.length; i += 3) out.push([m.positions[i]!, m.positions[i + 1]!, m.positions[i + 2]!]); return out; }

export function nearest(pts: V3[], p: V3): V3 {
  let best = pts[0]!, bd = Infinity;
  for (const q of pts) { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2; if (d < bd) { bd = d; best = q; } }
  return best;
}

/** Mean of the points within `win` of height y (nearest heights if the slab is empty). */
export function slabMean(pts: V3[], y: number, win = 0.004): { c: V3; n: number; min: V3; max: V3 } {
  let sel = pts.filter((p) => Math.abs(p[1] - y) <= win);
  let w = win;
  while (sel.length < 3 && w < 0.08) { w *= 1.6; sel = pts.filter((p) => Math.abs(p[1] - y) <= w); }
  const c: V3 = [0, 0, 0], min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of sel) for (let k = 0; k < 3; k++) { c[k]! += p[k]!; if (p[k]! < min[k]!) min[k] = p[k]!; if (p[k]! > max[k]!) max[k] = p[k]!; }
  const n = sel.length || 1;
  return { c: [c[0]! / n, y, c[2]! / n], n: sel.length, min, max };
}
