/**
 * Split the Human Reference Atlas "united" body (one GLB holding ~900 named structures in one
 * coordinate space) into one raw mesh per named node, plus an index. The united files are
 * 240-375 MB and are not committed; this step turns them into small intermediates that
 * `build-detail.ts` selects from.
 *
 *   npx tsx scripts/assets/extract/hra-united-export.ts <united.glb> <outDir>
 *
 * Raw format per node (little endian): int32 vertexCount, int32 triangleCount,
 * float32[vertexCount*3] positions in metres (world matrix baked), uint32[triangleCount*3].
 */
import { NodeIO } from '@gltf-transform/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) throw new Error('usage: hra-united-export.ts <united.glb> <outDir>');
mkdirSync(outDir, { recursive: true });
const doc = await new NodeIO().read(input);
const index: { i: number; name: string; nv: number; nt: number; min: number[]; max: number[] }[] = [];
let k = 0;
const walk = (node: ReturnType<typeof doc.createNode>) => {
  const mesh = node.getMesh();
  if (mesh) {
    const m = node.getWorldMatrix();
    const pos: number[] = [], idx: number[] = [];
    for (const prim of mesh.listPrimitives()) {
      const p = prim.getAttribute('POSITION'); if (!p) continue;
      const base = pos.length / 3;
      const e = [0, 0, 0];
      for (let i = 0; i < p.getCount(); i++) {
        p.getElement(i, e);
        pos.push(
          m[0]! * e[0]! + m[4]! * e[1]! + m[8]! * e[2]! + m[12]!,
          m[1]! * e[0]! + m[5]! * e[1]! + m[9]! * e[2]! + m[13]!,
          m[2]! * e[0]! + m[6]! * e[1]! + m[10]! * e[2]! + m[14]!,
        );
      }
      const ind = prim.getIndices();
      if (ind) { const a = ind.getArray()!; for (let i = 0; i < a.length; i++) idx.push(base + a[i]!); }
      else for (let i = 0; i < p.getCount(); i++) idx.push(base + i);
    }
    if (pos.length && idx.length) {
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) { const v = pos[i + a]!; if (v < min[a]!) min[a] = v; if (v > max[a]!) max[a] = v; }
      const head = Buffer.alloc(8); head.writeInt32LE(pos.length / 3, 0); head.writeInt32LE(idx.length / 3, 4);
      writeFileSync(path.join(outDir, `${k}.bin`), Buffer.concat([head, Buffer.from(new Float32Array(pos).buffer), Buffer.from(new Uint32Array(idx).buffer)]));
      index.push({ i: k, name: node.getName(), nv: pos.length / 3, nt: idx.length / 3, min, max });
      k++;
    }
  }
  node.listChildren().forEach(walk);
};
doc.getRoot().listScenes().forEach((sc) => sc.listChildren().forEach(walk));
writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index));
console.log(`${input}: ${index.length} named meshes -> ${outDir}`);
