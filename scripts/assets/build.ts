/**
 * Asset pipeline (Phase G §2, Sprint 1 of Phase I).
 *
 *   source geometry → weld/dedupe/prune → N level-of-detail meshes → quantise + meshopt
 *   compression → one GLB per structure per LOD, plus a LOD2 bundle per system → a manifest
 *   carrying licence, attribution, byte counts, triangle counts and content hashes.
 *
 * Two source kinds are supported. `procedural` builds the development body from the same
 * shape definitions the browser uses, so the streaming path is exercised with real files
 * today. `gltf-dir` reads `<structureId>.glb` from a directory, which is how the Z-Anatomy
 * and Human Reference Atlas exports enter (docs/phase-a/05-licensing-audit.md).
 *
 * Usage:
 *   npx tsx scripts/assets/build.ts --source procedural --pack demo-baked
 *   npx tsx scripts/assets/build.ts --source gltf-dir --in ../exports/z-anatomy \
 *     --pack z-anatomy-male --licence CC-BY-SA-4.0 --attribution "Z-Anatomy … CC BY-SA 4.0"
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Document, Logger, NodeIO, type Primitive } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import * as THREE from 'three';
import { demoManifest } from '../../src/engine/demo-manifest';
import { proceduralGeometry } from '../../src/engine/procedural';
import { bodyManifest } from '../../src/engine/manifest';
import { SYSTEM_IDS, type BodyId, type ManifestStructure, type SystemId } from '../../src/engine/types';

/** Ratios from Phase G §2: full, 35%, 12%. */
const LOD_RATIOS = [1, 0.35, 0.12];
const LOD_ERROR = [0, 0.02, 0.06];

interface Args { source: 'procedural' | 'gltf-dir'; pack: string; in?: string; licence: string; attribution: string; out: string }

function parseArgs(argv: string[]): Args {
  const get = (flag: string, fallback?: string) => {
    const i = argv.indexOf(`--${flag}`);
    if (i >= 0 && argv[i + 1]) return argv[i + 1]!;
    if (fallback !== undefined) return fallback;
    throw new Error(`missing --${flag}`);
  };
  const source = get('source', 'procedural') as Args['source'];
  return {
    source,
    pack: get('pack', source === 'procedural' ? 'demo-baked' : 'unnamed'),
    in: argv.includes('--in') ? get('in') : undefined,
    licence: get('licence', 'MIT'),
    attribution: get('attribution', 'Procedural development stand-ins generated from code; no anatomical mesh data.'),
    out: get('out', 'public/assets'),
  };
}

/** Positions/indices for one structure, in metres, centred on the structure's centroid. */
interface SourceMesh { positions: Float32Array; normals: Float32Array | null; indices: Uint32Array }

function fromThree(geometry: THREE.BufferGeometry): SourceMesh {
  const g = geometry.index ? geometry : geometry.toNonIndexed();
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const idx = g.index;
  return {
    positions: new Float32Array(pos.array),
    normals: nrm ? new Float32Array(nrm.array) : null,
    indices: idx ? new Uint32Array(idx.array) : new Uint32Array(Array.from({ length: pos.count }, (_, i) => i)),
  };
}

/** Recentre a structure's geometry on its own origin; the manifest carries world placement. */
function proceduralSource(s: ManifestStructure): SourceMesh {
  const geom = proceduralGeometry(s);
  geom.computeVertexNormals();
  return fromThree(geom);
}

async function gltfDirSource(io: NodeIO, file: string): Promise<SourceMesh> {
  const doc = await io.read(file);
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const p = prim.getAttribute('POSITION'); if (!p) continue;
      const base = positions.length / 3;
      const pa = p.getArray()!; for (let i = 0; i < pa.length; i++) positions.push(pa[i]!);
      const n = prim.getAttribute('NORMAL');
      if (n) { const na = n.getArray()!; for (let i = 0; i < na.length; i++) normals.push(na[i]!); }
      const ind = prim.getIndices();
      if (ind) { const ia = ind.getArray()!; for (let i = 0; i < ia.length; i++) indices.push(base + ia[i]!); }
      else for (let i = 0; i < p.getCount(); i++) indices.push(base + i);
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: normals.length === positions.length ? new Float32Array(normals) : null,
    indices: new Uint32Array(indices),
  };
}

/** Build a single-mesh glTF Document from raw arrays. */
function toDocument(src: SourceMesh, name: string): Document {
  const doc = new Document();
  doc.setLogger(new Logger(Logger.Verbosity.ERROR));
  const buffer = doc.createBuffer();
  const position = doc.createAccessor('POSITION').setType('VEC3').setArray(src.positions).setBuffer(buffer);
  const prim: Primitive = doc.createPrimitive().setAttribute('POSITION', position).setMode(4);
  if (src.normals) prim.setAttribute('NORMAL', doc.createAccessor('NORMAL').setType('VEC3').setArray(src.normals).setBuffer(buffer));
  prim.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(src.indices).setBuffer(buffer));
  prim.setMaterial(doc.createMaterial(name).setRoughnessFactor(0.6).setMetallicFactor(0.05));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  doc.createScene().addChild(doc.createNode(name).setMesh(mesh));
  return doc;
}

function triangleCount(doc: Document): number {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      n += idx ? idx.getCount() / 3 : (prim.getAttribute('POSITION')?.getCount() ?? 0) / 3;
    }
  return Math.round(n);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;

  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

  const outRoot = path.resolve(process.cwd(), args.out, args.pack);
  await rm(outRoot, { recursive: true, force: true });
  await mkdir(outRoot, { recursive: true });

  const bodies: BodyId[] = ['male', 'female'];
  let totalBytes = 0;

  for (const body of bodies) {
    const structures: ManifestStructure[] = args.source === 'procedural'
      ? demoManifest(body).structures
      : await structuresFromDir(args.in!, body);

    const out: ManifestStructure[] = [];
    const lod2ByStructure = new Map<string, Uint8Array>();

    for (const s of structures) {
      const src = args.source === 'procedural'
        ? proceduralSource(s)
        : await gltfDirSource(io, path.join(args.in!, `${s.id}.glb`));
      if (src.indices.length === 0) { console.warn(`  ! ${s.id}: no geometry, skipped`); continue; }

      const lods: NonNullable<ManifestStructure['lods']> = [];
      for (let level = 0; level < LOD_RATIOS.length; level++) {
        const doc = toDocument(src, s.id);
        await doc.transform(weld(), dedup(), prune());
        if (level > 0) {
          await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: LOD_RATIOS[level]!, error: LOD_ERROR[level]! }));
        }
        // Quantisation shrinks attributes; meshopt then compresses, and decodes fast on the
        // low-end CPUs that are the target device (Phase G §14).
        await doc.transform(quantize({ quantizePosition: 14, quantizeNormal: 10 }));
        doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
        const glb = new Uint8Array(await io.writeBinary(doc));
        const file = `${s.id}.lod${level}.glb`;
        await writeFile(path.join(outRoot, file), glb);
        totalBytes += glb.byteLength;
        lods.push({
          url: `/assets/${args.pack}/${file}`,
          bytes: glb.byteLength,
          triangles: triangleCount(doc),
          hash: createHash('sha256').update(glb).digest('hex').slice(0, 16),
        });
        if (level === LOD_RATIOS.length - 1) lod2ByStructure.set(s.id, glb);
      }
      // `procedural` is dropped: a baked pack must not silently fall back to a stand-in.
      const { procedural: _drop, ...rest } = s;
      out.push({ ...rest, lods });
    }

    const packs = await writeSystemPacks(outRoot, args.pack, out, lod2ByStructure);
    const manifest = {
      body, version: new Date().toISOString().slice(0, 10), pack: args.pack,
      licence: args.licence, attribution: args.attribution, packs, structures: out,
    };
    bodyManifest.parse(manifest); // fail the build, not the browser
    await writeFile(path.join(outRoot, `${body}.manifest.json`), JSON.stringify(manifest, null, 1));
    const tris = out.reduce((a, s) => a + (s.lods?.[0]?.triangles ?? 0), 0);
    const lod2 = out.reduce((a, s) => a + (s.lods?.[2]?.bytes ?? 0), 0);
    console.log(`${body}: ${out.length} structures, ${tris.toLocaleString()} triangles at LOD0, ${(lod2 / 1024).toFixed(0)} kB at LOD2`);
  }
  console.log(`pack "${args.pack}" written to ${outRoot} (${(totalBytes / 1024 / 1024).toFixed(2)} MB total)`);
}

/**
 * One LOD2 bundle per system. The first paint needs the coarse level of every visible
 * system, and 14 requests beat 200 on a phone (Phase G §2).
 */
async function writeSystemPacks(outRoot: string, pack: string, structures: ManifestStructure[], lod2: Map<string, Uint8Array>) {
  const packs: { system: SystemId; url: string; bytes: number; structureIds: string[] }[] = [];
  for (const system of SYSTEM_IDS) {
    const members = structures.filter((s) => s.systems[0] === system);
    if (!members.length) continue;
    // A length-prefixed concatenation: each member keeps its own GLB, so the client decodes
    // members independently and a corrupt entry cannot poison the rest of the system.
    const parts: Uint8Array[] = [];
    const ids: string[] = [];
    for (const m of members) {
      const glb = lod2.get(m.id); if (!glb) continue;
      const header = new Uint8Array(4);
      new DataView(header.buffer).setUint32(0, glb.byteLength, true);
      parts.push(header, glb); ids.push(m.id);
    }
    if (!ids.length) continue;
    const total = parts.reduce((a, p) => a + p.byteLength, 0);
    const blob = new Uint8Array(total);
    let off = 0; for (const p of parts) { blob.set(p, off); off += p.byteLength; }
    const file = `system-${system}.lod2.bin`;
    await writeFile(path.join(outRoot, file), blob);
    packs.push({ system, url: `/assets/${pack}/${file}`, bytes: blob.byteLength, structureIds: ids });
  }
  return packs;
}

/** Structure metadata for a directory export: `<id>.glb` plus a sidecar `structures.json`. */
async function structuresFromDir(dir: string, body: BodyId): Promise<ManifestStructure[]> {
  const sidecar = path.join(dir, `${body}.structures.json`);
  if (!existsSync(sidecar)) throw new Error(`expected ${sidecar} describing ids, names, systems and placement`);
  const listed = JSON.parse(await readFile(sidecar, 'utf8')) as ManifestStructure[];
  const present = new Set((await readdir(dir)).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')));
  const missing = listed.filter((s) => !present.has(s.id));
  if (missing.length) console.warn(`  ! ${missing.length} structures in the sidecar have no .glb and are skipped`);
  return listed.filter((s) => present.has(s.id));
}

main().catch((err) => { console.error(err); process.exit(1); });
