'use client';
import * as THREE from 'three';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { decodePacked, type MeshoptLike, type PackedRef } from './packed';

/**
 * Asset loading (ADR-007, Phase G §3): per-structure GLB with meshopt (primary), Draco
 * (fallback) and KTX2 textures.
 *
 * The loader and every decoder are imported dynamically. They are large, they embed WebAssembly,
 * and a learner who never opens the atlas should not pay for them; Draco and KTX2 in particular
 * are only fetched when a pack actually contains geometry or textures that need them. Decoders
 * are self-hosted under /public/decoders so the platform works offline and under the strict
 * content security policy a white-label domain runs with.
 */
let loaderPromise: Promise<GLTFLoader> | null = null;

export function getLoader(renderer?: THREE.WebGLRenderer): Promise<GLTFLoader> {
  loaderPromise ??= (async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    ]);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const base = process.env.NEXT_PUBLIC_ASSET_BASE ?? '';
    // Draco and KTX2 are wired lazily on top, so their WASM never enters the atlas bundle.
    void (async () => {
      const [{ DRACOLoader }, { KTX2Loader }] = await Promise.all([
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/loaders/KTX2Loader.js'),
      ]);
      const draco = new DRACOLoader();
      draco.setDecoderPath(`${base}/decoders/draco/`);
      loader.setDRACOLoader(draco);
      if (renderer) {
        const ktx2 = new KTX2Loader();
        ktx2.setTranscoderPath(`${base}/decoders/basis/`);
        ktx2.detectSupport(renderer);
        loader.setKTX2Loader(ktx2);
      }
    })();
    return loader;
  })();
  return loaderPromise;
}

const cache = new Map<string, Promise<THREE.BufferGeometry>>();

/** Load one LOD of one structure; merged to a single geometry; cached by URL. */
export function loadStructureGeometry(url: string, renderer?: THREE.WebGLRenderer): Promise<THREE.BufferGeometry> {
  const hit = cache.get(url);
  if (hit) return hit;
  const p = getLoader(renderer).then((loader) => loader.loadAsync(url)).then((gltf) => {
    const geoms: THREE.BufferGeometry[] = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); geoms.push(g); }
    });
    if (geoms.length === 1) return geoms[0]!;
    return mergeGeometries(geoms);
  });
  cache.set(url, p);
  return p;
}

function mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Minimal non-indexed merge (positions + normals); the asset pipeline pre-merges so this
  // path is rarely hit.
  const positions: number[] = [], normals: number[] = [];
  for (const g of geoms) {
    const ng = g.index ? g.toNonIndexed() : g;
    positions.push(...Array.from(ng.getAttribute('position').array));
    if (ng.getAttribute('normal')) normals.push(...Array.from(ng.getAttribute('normal').array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length === positions.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  else out.computeVertexNormals();
  return out;
}

/** Screen-space LOD selection (Phase G §6): distance-based with hysteresis. */
export function chooseLod(distance: number, radius: number, lodCount: number, lowBandwidth: boolean): number {
  if (lowBandwidth) return lodCount - 1;
  const apparent = radius / Math.max(distance, 0.01); // ~ projected size
  if (apparent > 0.25) return 0;
  if (apparent > 0.06) return Math.min(1, lodCount - 1);
  return lodCount - 1;
}

export { proceduralGeometry } from './procedural';

/**
 * One detail group as a single merged geometry.
 *
 * Thousands of separate meshes would be thousands of draw calls, so a group is decoded into
 * one indexed geometry with per-vertex colour and a per-vertex state attribute. `ranges`
 * records where each structure's vertices and triangles sit, which is how the viewer maps a
 * picked triangle back to a structure and updates one structure's visibility without
 * rebuilding anything.
 */
export interface GroupGeometry {
  geometry: THREE.BufferGeometry;
  ids: string[];
  /** First vertex of each structure, plus a final sentinel = total vertices. */
  vertexStart: Uint32Array;
  /** First triangle of each structure, plus a final sentinel = total triangles. */
  triStart: Uint32Array;
}

const groupCache = new Map<string, Promise<GroupGeometry>>();

export function loadGroupGeometry(
  url: string,
  structures: { id: string; bounds: [number, number, number, number, number, number]; packed: PackedRef; category?: string }[],
  colorOf: (s: { id: string; category?: string }) => THREE.Color,
): Promise<GroupGeometry> {
  const hit = groupCache.get(url);
  if (hit) return hit;
  const p = (async () => {
    const [buf, { MeshoptDecoder }] = await Promise.all([
      fetch(url, { cache: 'force-cache' }).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.arrayBuffer(); }),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    ]);
    await MeshoptDecoder.ready;
    const totalV = structures.reduce((a, s) => a + s.packed.nv, 0);
    const totalI = structures.reduce((a, s) => a + s.packed.ni, 0);
    const positions = new Float32Array(totalV * 3);
    const colors = new Float32Array(totalV * 3);
    const state = new Float32Array(totalV);
    const indices = new Uint32Array(totalI);
    const vertexStart = new Uint32Array(structures.length + 1);
    const triStart = new Uint32Array(structures.length + 1);
    let vo = 0, io = 0;
    structures.forEach((s, k) => {
      vertexStart[k] = vo; triStart[k] = io / 3;
      const m = decodePacked(buf, s.packed, s.bounds, [0, 0, 0], MeshoptDecoder as unknown as MeshoptLike);
      positions.set(m.positions, vo * 3);
      for (let i = 0; i < m.indices.length; i++) indices[io + i] = m.indices[i]! + vo;
      const c = colorOf(s);
      for (let v = 0; v < s.packed.nv; v++) { colors[(vo + v) * 3] = c.r; colors[(vo + v) * 3 + 1] = c.g; colors[(vo + v) * 3 + 2] = c.b; }
      vo += s.packed.nv; io += s.packed.ni;
    });
    vertexStart[structures.length] = vo; triStart[structures.length] = io / 3;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aState', new THREE.BufferAttribute(state, 1));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return { geometry, ids: structures.map((s) => s.id), vertexStart, triStart };
  })();
  groupCache.set(url, p);
  p.catch(() => groupCache.delete(url));
  return p;
}
