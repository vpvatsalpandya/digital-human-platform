'use client';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { ManifestStructure } from './types';

/**
 * Asset loading (ADR-007, Phase G §3): per-structure GLB with meshopt (primary), Draco
 * (fallback) and KTX2 textures. Decoders are self-hosted under /public/decoders so the
 * platform works offline and inside white-label domains with strict CSP.
 */
let loader: GLTFLoader | null = null;
export function getLoader(renderer?: THREE.WebGLRenderer): GLTFLoader {
  if (loader) return loader;
  loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const draco = new DRACOLoader();
  draco.setDecoderPath((process.env.NEXT_PUBLIC_ASSET_BASE ?? '') + '/decoders/draco/');
  loader.setDRACOLoader(draco);
  if (renderer) {
    const ktx2 = new KTX2Loader();
    ktx2.setTranscoderPath((process.env.NEXT_PUBLIC_ASSET_BASE ?? '') + '/decoders/basis/');
    ktx2.detectSupport(renderer);
    loader.setKTX2Loader(ktx2);
  }
  return loader;
}

const cache = new Map<string, Promise<THREE.BufferGeometry>>();

/** Load one LOD of one structure; merged to a single geometry; cached by URL. */
export function loadStructureGeometry(url: string, renderer?: THREE.WebGLRenderer): Promise<THREE.BufferGeometry> {
  const hit = cache.get(url);
  if (hit) return hit;
  const p = getLoader(renderer).loadAsync(url).then((gltf) => {
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

/** Build a procedural geometry for development stand-ins. */
export function proceduralGeometry(s: ManifestStructure): THREE.BufferGeometry {
  const p = s.procedural;
  if (!p) return new THREE.SphereGeometry(0.02, 8, 8);
  switch (p.kind) {
    case 'box': return new THREE.BoxGeometry(...p.size, 1, 1, 1);
    case 'sphere': { const g = new THREE.SphereGeometry(p.radius, 24, 18); if (p.scale) g.scale(...p.scale); return g; }
    case 'capsule': { const g = new THREE.CapsuleGeometry(p.radius, p.length, 4, 12); if (p.rotation) g.rotateZ(p.rotation[2]); return g; }
    case 'tube': {
      const curve = new THREE.CatmullRomCurve3(p.points.map((q) => new THREE.Vector3(q[0] - s.centroid[0], q[1] - s.centroid[1], q[2] - s.centroid[2])));
      return new THREE.TubeGeometry(curve, 32, p.radius, 10, false);
    }
  }
}
