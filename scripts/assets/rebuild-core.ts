/**
 * Re-bake the core pack's aggregates in the united body frame (see extract/core_rebase.py for why).
 *
 *   python3 scripts/assets/extract/core_rebase.py <registered> /workspace/qa/dump /workspace/work/core-rebase
 *   npx tsx scripts/assets/rebuild-core.ts --in /workspace/work/core-rebase
 *
 * Reads <in>/<body>/<id>.bin (nv,nt int32 · float32 xyz · uint32 idx) for each id found there, bakes
 * LOD0/1/2 exactly as build.ts does, and rewrites the matching manifest entries, the per-system LOD2
 * packs, and the attribution. Landmarks come from <in>/<body>/landmarks.json.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Document, Logger, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import * as THREE from 'three';
import { bodyManifest } from '../../src/engine/manifest';
import { SYSTEM_IDS, type ManifestStructure } from '../../src/engine/types';

const TARGETS = [26000, 8000, 2400];
const ERROR = [0.008, 0.02, 0.05];
const PACK = 'hra-v1';
const ZANAT = new Set(['skull', 'vertebral-column', 'rib-cage', 'humerus-r', 'humerus-l', 'radius-ulna-r', 'radius-ulna-l', 'deltoid-r', 'deltoid-l', 'biceps-brachii-r', 'biceps-brachii-l',
  'pectoralis-major-r', 'pectoralis-major-l', 'quadriceps-femoris-r', 'quadriceps-femoris-l', 'gastrocnemius-r', 'gastrocnemius-l', 'stomach', 'adrenal-gland-r', 'adrenal-gland-l', 'testis-r', 'testis-l']);
const ATTRIBUTION = 'Organs, brain, skin, pelvis and great vessels: Human Reference Atlas 3D Reference Object Library, HuBMAP Consortium, CC BY 4.0, with brain regions from the Allen Human Reference Atlas. '
  + 'Skeleton, muscles, stomach, adrenal glands and testes: Z-Anatomy, CC BY-SA 4.0 (itself derived from BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 Japan), '
  + 'registered into the reference-atlas body frame. Derivatives are released under CC BY-SA 4.0.';

interface Raw { positions: Float32Array; indices: Uint32Array }
function readBin(buf: Buffer): Raw {
  const nv = buf.readInt32LE(0), nt = buf.readInt32LE(4);
  const positions = new Float32Array(nv * 3); const indices = new Uint32Array(nt * 3);
  for (let i = 0; i < nv * 3; i++) positions[i] = buf.readFloatLE(8 + i * 4);
  for (let i = 0; i < nt * 3; i++) indices[i] = buf.readUInt32LE(8 + nv * 12 + i * 4);
  return { positions, indices };
}
function recentre(src: Raw) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < src.positions.length; i += 3) for (let k = 0; k < 3; k++) { const v = src.positions[i + k]!; if (v < min[k]!) min[k] = v; if (v > max[k]!) max[k] = v; }
  const c: [number, number, number] = [(min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, (min[2]! + max[2]!) / 2];
  for (let i = 0; i < src.positions.length; i += 3) for (let k = 0; k < 3; k++) src.positions[i + k] -= c[k]!;
  return { centroid: c, bounds: [min[0]!, min[1]!, min[2]!, max[0]!, max[1]!, max[2]!] as ManifestStructure['bounds'] };
}
function toDoc(src: Raw, name: string): Document {
  const doc = new Document(); doc.setLogger(new Logger(Logger.Verbosity.ERROR));
  const buffer = doc.createBuffer();
  const pos = doc.createAccessor('POSITION').setType('VEC3').setArray(src.positions).setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', pos).setMode(4).setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(src.indices).setBuffer(buffer));
  prim.setMaterial(doc.createMaterial(name).setRoughnessFactor(0.6).setMetallicFactor(0.05));
  doc.createScene().addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  return doc;
}
const tris = (doc: Document) => Math.round(doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0));

async function main() {
  const inDir = path.resolve(process.argv[process.argv.indexOf('--in') + 1]!);
  await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  for (const body of ['male', 'female'] as const) {
    const root = path.resolve('public/assets', PACK);
    const mpath = path.join(root, `${body}.manifest.json`);
    const manifest = JSON.parse(await readFile(mpath, 'utf8'));
    const dir = path.join(root, body);
    const files = (await readdir(path.join(inDir, body))).filter((f) => f.endsWith('.bin'));
    const sources = new Map<string, Raw>(); for (const f of files) sources.set(f.replace(/\.bin$/, ''), readBin(await readFile(path.join(inDir, body, f))));
    const lm = JSON.parse(await readFile(path.join(inDir, body, 'landmarks.json'), 'utf8')) as Record<string, number[]>;
    for (const [id, p] of Object.entries(lm)) {
      const g = new THREE.IcosahedronGeometry(0.012, 2).toNonIndexed();
      const pos = new Float32Array(g.getAttribute('position').array);
      for (let i = 0; i < pos.length; i += 3) { pos[i] += p[0]!; pos[i + 1] += p[1]!; pos[i + 2] += p[2]!; }
      sources.set(id, { positions: pos, indices: new Uint32Array(Array.from({ length: pos.length / 3 }, (_, i) => i)) });
    }
    let changed = 0;
    for (const s of manifest.structures as ManifestStructure[]) {
      const src = sources.get(s.id); if (!src) continue;
      const landmark = s.id in lm;
      const placement = recentre(src); const n = src.indices.length / 3;
      const lods: NonNullable<ManifestStructure['lods']> = [];
      for (let level = 0; level < 3; level++) {
        const doc = toDoc(src, s.id);
        await doc.transform(weld(), dedup(), prune());
        const ratio = landmark ? [1, 0.35, 0.12][level]! : Math.min(1, TARGETS[level]! / n);
        if (ratio < 0.999) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: landmark ? Math.max([0, 0.02, 0.06][level]!, 0.001) : ERROR[level]! }));
        await doc.transform(quantize({ quantizePosition: 14, quantizeNormal: 10 }));
        doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
        const glb = new Uint8Array(await io.writeBinary(doc));
        const file = `${s.id}.lod${level}.glb`;
        await writeFile(path.join(dir, file), glb);
        lods.push({ url: `/assets/${PACK}/${body}/${file}`, bytes: glb.byteLength, triangles: tris(doc), hash: createHash('sha256').update(glb).digest('hex').slice(0, 16) });
      }
      Object.assign(s, placement, { lods });
      if (ZANAT.has(s.id)) s.provenance = 'zanatomy';
      changed++;
    }
    // per-system LOD2 bundles, in manifest order
    const packs = [];
    for (const system of SYSTEM_IDS) {
      const members = (manifest.structures as ManifestStructure[]).filter((s) => s.systems[0] === system);
      const parts: Uint8Array[] = []; const ids: string[] = [];
      for (const m of members) {
        const f = path.join(dir, `${m.id}.lod2.glb`); if (!existsSync(f)) continue;
        const glb = new Uint8Array(await readFile(f)); const h = new Uint8Array(4); new DataView(h.buffer).setUint32(0, glb.byteLength, true);
        parts.push(h, glb); ids.push(m.id);
      }
      if (!ids.length) continue;
      const blob = new Uint8Array(parts.reduce((a, p) => a + p.byteLength, 0)); let off = 0; for (const p of parts) { blob.set(p, off); off += p.byteLength; }
      const file = `system-${system}.lod2.bin`; await writeFile(path.join(dir, file), blob);
      packs.push({ system, url: `/assets/${PACK}/${body}/${file}`, bytes: blob.byteLength, structureIds: ids });
    }
    manifest.packs = packs; manifest.attribution = ATTRIBUTION; manifest.version = new Date().toISOString().slice(0, 10);
    bodyManifest.parse(manifest);
    await writeFile(mpath, JSON.stringify(manifest, null, 1));
    console.log(`${body}: re-baked ${changed} core structures in the united frame`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
