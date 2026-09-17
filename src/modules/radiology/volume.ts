import type { BodyManifest, ManifestStructure } from '@/engine/types';

/**
 * Label volume + pseudo-CT phantom rasterised from a body manifest (FR-R2). With real
 * bodies the label volume comes from TotalSegmentator / Open Anatomy masks and the
 * intensities from the actual CT; the rasteriser is the development fallback and the
 * tool that guarantees 3D↔slice synchronisation: both views share structure ids.
 */
export interface LabelVolume {
  dims: [number, number, number]; // nx, ny, nz (x lateral, y cranio-caudal, z antero-posterior)
  origin: [number, number, number];
  spacing: number; // metres per voxel
  labels: Uint16Array; // structure index + 1 (0 = background)
  intensity: Uint8Array; // pseudo-HU mapped 0..255
  structures: ManifestStructure[];
}

const INTENSITY: Record<string, number> = { skeletal: 235, muscular: 120, cardiovascular: 150, respiratory: 30, digestive: 105, urinary: 110, endocrine: 115, nervous: 100, lymphatic: 108, reproductive: 110, integumentary: 60, connective: 90, fascial: 85, surface: 60 };

export function rasterise(manifest: BodyManifest, spacing = 0.01): LabelVolume {
  const structs = manifest.structures.filter((s) => s.procedural && !s.systems.includes('surface'));
  // Larger structures first so small ones overwrite them.
  structs.sort((a, b) => volumeOf(b) - volumeOf(a));
  const origin: [number, number, number] = [-0.32, -0.98, -0.28];
  const dims: [number, number, number] = [Math.ceil(0.64 / spacing), Math.ceil(1.86 / spacing), Math.ceil(0.56 / spacing)];
  const n = dims[0] * dims[1] * dims[2];
  const labels = new Uint16Array(n), intensity = new Uint8Array(n);
  intensity.fill(8); // air
  structs.forEach((s, idx) => {
    const [bx0, by0, bz0, bx1, by1, bz1] = s.bounds;
    const i0 = Math.max(0, Math.floor((bx0 - origin[0]) / spacing)), i1 = Math.min(dims[0] - 1, Math.ceil((bx1 - origin[0]) / spacing));
    const j0 = Math.max(0, Math.floor((by0 - origin[1]) / spacing)), j1 = Math.min(dims[1] - 1, Math.ceil((by1 - origin[1]) / spacing));
    const k0 = Math.max(0, Math.floor((bz0 - origin[2]) / spacing)), k1 = Math.min(dims[2] - 1, Math.ceil((bz1 - origin[2]) / spacing));
    const val = INTENSITY[s.systems[0]!] ?? 100;
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = origin[0] + (i + 0.5) * spacing, y = origin[1] + (j + 0.5) * spacing, z = origin[2] + (k + 0.5) * spacing;
      if (inside(s, x, y, z)) { const o = i + dims[0] * (j + dims[1] * k); labels[o] = idx + 1; intensity[o] = s.id === 'skin' ? 45 : val; }
    }
  });
  return { dims, origin, spacing, labels, intensity, structures: structs };
}

function volumeOf(s: ManifestStructure) { const b = s.bounds; return (b[3] - b[0]) * (b[4] - b[1]) * (b[5] - b[2]); }

export function inside(s: ManifestStructure, x: number, y: number, z: number): boolean {
  const p = s.procedural!; const dx = x - s.centroid[0], dy = y - s.centroid[1], dz = z - s.centroid[2];
  switch (p.kind) {
    case 'box': return Math.abs(dx) <= p.size[0] / 2 && Math.abs(dy) <= p.size[1] / 2 && Math.abs(dz) <= p.size[2] / 2;
    case 'sphere': { const sc = p.scale ?? [1, 1, 1]; return (dx / (p.radius * sc[0])) ** 2 + (dy / (p.radius * sc[1])) ** 2 + (dz / (p.radius * sc[2])) ** 2 <= 1; }
    case 'capsule': {
      // capsule along local Y, optionally rotated about Z
      const a = p.rotation?.[2] ?? 0; const lx = Math.cos(-a) * dx - Math.sin(-a) * dy, ly = Math.sin(-a) * dx + Math.cos(-a) * dy;
      const cy = Math.max(-p.length / 2, Math.min(p.length / 2, ly));
      return lx * lx + (ly - cy) ** 2 + dz * dz <= p.radius * p.radius;
    }
    case 'tube': {
      for (let i = 0; i < p.points.length - 1; i++) {
        const a = p.points[i]!, b = p.points[i + 1]!;
        const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (y - a[1]) * aby + (z - a[2]) * abz) / (abx * abx + aby * aby + abz * abz || 1)));
        const cx = a[0] + t * abx, cy = a[1] + t * aby, cz = a[2] + t * abz;
        if ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 <= p.radius * p.radius) return true;
      }
      return false;
    }
  }
}

export type Plane = 'axial' | 'coronal' | 'sagittal';

/** Number of slices along a plane's normal. Axial = along y (cranio-caudal). */
export function sliceCount(v: LabelVolume, plane: Plane) { return plane === 'axial' ? v.dims[1] : plane === 'coronal' ? v.dims[2] : v.dims[0]; }

/** Slice index that contains a structure's centroid (used for 3D → slice jumps). */
export function sliceForStructure(v: LabelVolume, plane: Plane, s: ManifestStructure): number {
  const c = s.centroid; const axis = plane === 'axial' ? 1 : plane === 'coronal' ? 2 : 0;
  return Math.max(0, Math.min(sliceCount(v, plane) - 1, Math.floor((c[axis] - v.origin[axis]) / v.spacing)));
}

/** Extract a 2D slice: returns width, height and index accessors. */
export function extractSlice(v: LabelVolume, plane: Plane, index: number): { w: number; h: number; label: Uint16Array; intensity: Uint8Array } {
  const [nx, ny, nz] = v.dims;
  if (plane === 'axial') { // rows = z (anterior at top), cols = x
    const w = nx, h = nz; const label = new Uint16Array(w * h), intensity = new Uint8Array(w * h);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { const o = i + nx * (index + ny * k); const t = i + w * (nz - 1 - k); label[t] = v.labels[o]!; intensity[t] = v.intensity[o]!; }
    return { w, h, label, intensity };
  }
  if (plane === 'coronal') { // rows = y (superior at top), cols = x
    const w = nx, h = ny; const label = new Uint16Array(w * h), intensity = new Uint8Array(w * h);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const o = i + nx * (j + ny * index); const t = i + w * (ny - 1 - j); label[t] = v.labels[o]!; intensity[t] = v.intensity[o]!; }
    return { w, h, label, intensity };
  }
  const w = nz, h = ny; const label = new Uint16Array(w * h), intensity = new Uint8Array(w * h); // sagittal: cols = z, rows = y
  for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) { const o = index + nx * (j + ny * k); const t = k + w * (ny - 1 - j); label[t] = v.labels[o]!; intensity[t] = v.intensity[o]!; }
  return { w, h, label, intensity };
}
