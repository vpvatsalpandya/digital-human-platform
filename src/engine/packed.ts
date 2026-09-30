import * as THREE from 'three';

/**
 * Packed mesh format for the detail pack.
 *
 * A detail group is thousands of small structures. One GLB each would spend more bytes on
 * glTF JSON than on geometry and cost thousands of requests, so a group is a single binary
 * file and each structure is a slice of it: vertices quantised to 16 bits per axis inside the
 * structure's own bounding box, then meshopt-compressed, followed by a meshopt triangle
 * index stream. The manifest entry says where the slice is and how many vertices and
 * indices it holds; the bounds (already in the manifest) give the dequantisation box.
 */
export interface PackedRef {
  /** Byte offset of the vertex stream in the group file; the index stream follows it. */
  o: number;
  /** Vertex stream length in bytes. */
  vb: number;
  /** Index stream length in bytes. */
  ib: number;
  /** Vertex count. */
  nv: number;
  /** Index count. */
  ni: number;
}

export interface MeshoptLike {
  decodeGltfBuffer(target: Uint8Array, count: number, size: number, source: Uint8Array, mode: string, filter?: string): void;
}

export const PACKED_VERTEX_STRIDE = 8;

/** Decode one structure to centroid-local float positions and 32-bit indices. */
export function decodePacked(
  file: ArrayBuffer,
  ref: PackedRef,
  bounds: [number, number, number, number, number, number],
  centroid: [number, number, number],
  decoder: MeshoptLike,
): { positions: Float32Array; indices: Uint32Array } {
  const vraw = new Uint8Array(ref.nv * PACKED_VERTEX_STRIDE);
  decoder.decodeGltfBuffer(vraw, ref.nv, PACKED_VERTEX_STRIDE, new Uint8Array(file, ref.o, ref.vb), 'ATTRIBUTES');
  const iraw = new Uint8Array(ref.ni * 4);
  decoder.decodeGltfBuffer(iraw, ref.ni, 4, new Uint8Array(file, ref.o + ref.vb, ref.ib), 'TRIANGLES');
  const q = new Uint16Array(vraw.buffer, vraw.byteOffset, ref.nv * 4);
  const positions = new Float32Array(ref.nv * 3);
  const sx = (bounds[3] - bounds[0]) / 65535, sy = (bounds[4] - bounds[1]) / 65535, sz = (bounds[5] - bounds[2]) / 65535;
  const ox = bounds[0] - centroid[0], oy = bounds[1] - centroid[1], oz = bounds[2] - centroid[2];
  for (let i = 0; i < ref.nv; i++) {
    positions[i * 3] = ox + q[i * 4]! * sx;
    positions[i * 3 + 1] = oy + q[i * 4 + 1]! * sy;
    positions[i * 3 + 2] = oz + q[i * 4 + 2]! * sz;
  }
  return { positions, indices: new Uint32Array(iraw.buffer, iraw.byteOffset, ref.ni) };
}

export function packedGeometry(mesh: { positions: Float32Array; indices: Uint32Array }): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
