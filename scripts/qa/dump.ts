/**
 * Dump every structure of a body (core GLB lod0 + detail packs, as the viewer would merge them)
 * to flat binary files for the offline QA renderer (scripts/qa/render.py) and the programmatic
 * checks (scripts/qa/check.py).
 *   npx tsx scripts/qa/dump.ts <outDir>
 * Writes <outDir>/<body>/index.json and <outDir>/<body>/meshes.bin (per structure: float32 xyz, uint32 tri).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { MeshoptDecoder } from 'meshoptimizer';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { decodePacked } from '../../src/engine/packed';

const ROOT = process.cwd();
const OUT = process.argv[2] ?? '/workspace/qa/dump';
async function main() {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  for (const body of ['male', 'female'] as const) {
    const detail = JSON.parse(readFileSync(`${ROOT}/public/assets/anatomy-v2/${body}.manifest.json`, 'utf8'));
    const core = JSON.parse(readFileSync(`${ROOT}/public/assets/hra-v1/${body}.manifest.json`, 'utf8'));
    const up = new Set(detail.structures.filter((s: any) => s.group === 'core-upgrades').map((s: any) => s.id));
    const list = [...core.structures.filter((s: any) => !up.has(s.id)), ...detail.structures];
    const files = new Map<string, ArrayBuffer>();
    const chunks: Buffer[] = []; let off = 0; const index: any[] = [];
    for (const s of list) {
      let pos: Float32Array, idx: Uint32Array;
      if (s.packed && s.group) {
        const g = detail.groups.find((x: any) => x.id === s.group);
        if (!files.has(g.url)) { const b = readFileSync(`${ROOT}/public${g.url}`); files.set(g.url, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer); }
        const d = decodePacked(files.get(g.url)!, s.packed, s.bounds, s.centroid, MeshoptDecoder as never);
        pos = d.positions; for (let i = 0; i < pos.length; i += 3) { pos[i] += s.centroid[0]; pos[i + 1] += s.centroid[1]; pos[i + 2] += s.centroid[2]; }
        idx = d.indices;
      } else if (s.lods?.length) {
        const file = `${ROOT}/public${s.lods[0].url}`; if (!existsSync(file)) continue;
        const doc = await io.read(file);
        const P: number[] = [], I: number[] = [];
        for (const node of doc.getRoot().listNodes()) {
          const m = node.getMesh(); if (!m) continue; const w = node.getWorldMatrix();
          for (const prim of m.listPrimitives()) {
            const acc = prim.getAttribute('POSITION')!; const base = P.length / 3; const t: number[] = [0, 0, 0];
            for (let i = 0; i < acc.getCount(); i++) { acc.getElement(i, t); const [x, y, z] = t as [number, number, number]; P.push(w[0] * x + w[4] * y + w[8] * z + w[12] + s.centroid[0], w[1] * x + w[5] * y + w[9] * z + w[13] + s.centroid[1], w[2] * x + w[6] * y + w[10] * z + w[14] + s.centroid[2]); }
            const ia = prim.getIndices(); if (ia) for (let i = 0; i < ia.getCount(); i++) I.push(base + ia.getScalar(i)); else for (let i = 0; i < acc.getCount(); i++) I.push(base + i);
          }
        }
        pos = new Float32Array(P); idx = new Uint32Array(I);
      } else continue;
      const a = Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength), b = Buffer.from(idx.buffer, idx.byteOffset, idx.byteLength);
      index.push({ id: s.id, name: s.name, systems: s.systems, layer: s.layer, laterality: s.laterality, provenance: s.provenance, category: s.category, group: s.group ?? 'core', centroid: s.centroid, bounds: s.bounds, latin: s.latinName, aliases: s.aliases, nv: pos.length / 3, nt: idx.length / 3, off, region: s.region, defaultVisible: s.defaultVisible, hidden: s.hidden });
      chunks.push(a, b); off += a.length + b.length;
    }
    mkdirSync(`${OUT}/${body}`, { recursive: true });
    writeFileSync(`${OUT}/${body}/meshes.bin`, Buffer.concat(chunks));
    writeFileSync(`${OUT}/${body}/index.json`, JSON.stringify(index));
    console.log(body, index.length, 'structures', (off / 1048576).toFixed(0), 'MB');
  }
}
main();
