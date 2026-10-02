import type { ManifestStructure } from '../../src/engine/types';
import BP3D_ALIGN from './bp3d-align.json';

/**
 * Carry BodyParts3D into the atlas body space.
 *
 * The axis mapping is fixed and was established by least-squares over nine organs present in
 * both sources. Scale and offset are derived per body from that body's own skin envelope:
 * uniform scale from stature, and centring laterally and front-to-back. Matching the envelope
 * axis by axis was tried and rejected, because the two figures hold their arms differently and
 * matching width stretched the skull half as wide again. Fitting once against the male body
 * was also rejected: the female body is shorter, and the male skeleton then stood proud of
 * the scalp.
 */
export function makeBodySpace(skinBounds: ManifestStructure['bounds']) {
  const { perm, signs, bp3dSkin } = BP3D_ALIGN as { perm: number[]; signs: number[]; bp3dSkin: { min: number[]; max: number[] } };
  const scale = (skinBounds[4] - skinBounds[1]) / (bp3dSkin.max[1]! - bp3dSkin.min[1]!);
  const centre = (i: number) => (skinBounds[i] + skinBounds[i + 3]) / 2;
  const bpCentre = (i: number) => (bp3dSkin.min[i]! + bp3dSkin.max[i]!) / 2;
  const translate = [
    centre(0) - scale * bpCentre(0),
    skinBounds[1] - scale * bp3dSkin.min[1]!,
    centre(2) - scale * bpCentre(2),
  ];
  return (x: number, y: number, z: number): [number, number, number] => {
    const v = [x, y, z];
    const out: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < 3; i++) out[i] = scale * signs[i]! * v[perm[i]!]! + translate[i]!;
    return out;
  };
}

