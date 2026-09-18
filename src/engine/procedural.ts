import * as THREE from 'three';
import type { ManifestStructure } from './types';

/**
 * Geometry for the procedural development stand-ins. Deliberately free of React and of any
 * browser API so the asset pipeline (scripts/assets/build.ts) can build the very same
 * geometry in Node and bake it into real GLB files. One definition, two consumers.
 */
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
