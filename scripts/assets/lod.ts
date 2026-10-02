import { Document, Logger, type Primitive } from '@gltf-transform/core';

/** Raw mesh handed between the extract, decimate and write steps. Positions are metres. */
export interface RawMesh { positions: Float32Array; indices: Uint32Array }

/** Single-mesh glTF document from raw arrays (no normals: the client computes them). */
export function toDocument(src: RawMesh, name: string, colors?: Float32Array): Document {
  const doc = new Document();
  doc.setLogger(new Logger(Logger.Verbosity.ERROR));
  const buffer = doc.createBuffer();
  const position = doc.createAccessor('POSITION').setType('VEC3').setArray(src.positions).setBuffer(buffer);
  const prim: Primitive = doc.createPrimitive().setAttribute('POSITION', position).setMode(4);
  if (colors) prim.setAttribute('COLOR_0', doc.createAccessor('COLOR_0').setType('VEC3').setArray(colors).setBuffer(buffer));
  prim.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(src.indices).setBuffer(buffer));
  prim.setMaterial(doc.createMaterial(name).setRoughnessFactor(0.6).setMetallicFactor(0.05));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  doc.createScene().addChild(doc.createNode(name).setMesh(mesh));
  return doc;
}

export function boundsOf(positions: Float32Array): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3)
    for (let k = 0; k < 3; k++) { const v = positions[i + k]!; if (v < min[k]!) min[k] = v; if (v > max[k]!) max[k] = v; }
  return { min, max };
}
