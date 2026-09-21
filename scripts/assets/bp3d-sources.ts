/**
 * Mapping from platform structure ids to BodyParts3D concepts
 * (© The Database Center for Life Science, CC BY-SA 2.1 Japan — see the licensing audit §2.1).
 *
 * BodyParts3D fills what the Human Reference Atlas does not model: lungs, stomach, the skull
 * and rib cage, the vertebral column, the arm bones, the spinal cord, the adrenal glands and
 * the skeletal muscles. Its meshes are derived from a different subject, in millimetres and
 * Z-up, so they are carried into the atlas body space by the similarity transform in
 * `bp3d-align.json`, which is fitted by least squares over ten structures present in both
 * sources rather than assumed.
 *
 * ShareAlike applies to derivatives of these meshes, which is why they ship in the open asset
 * pack rather than being folded into proprietary content (licensing audit §5).
 */
export interface Bp3dSource {
  /** Concept names exactly as they appear in the BodyParts3D element-parts tables. */
  concepts: string[];
  /**
   * Drop any mesh that also belongs to one of these concepts. BodyParts3D files the
   * pulmonary vessels under the lung as well as the cardiovascular system, and those vessels
   * run down to the heart: left in, they stretch the right lung twelve centimetres below the
   * left, which is the wrong way round — the liver makes the right lung the shorter one.
   */
  excludeIn?: string[];
  only?: 'male' | 'female';
}

export const BP3D_SOURCES: Record<string, Bp3dSource> = {
  // Respiratory — see NO_OPEN_MESH: neither source models lung parenchyma.

  // Digestive
  stomach: { concepts: ['stomach'] },

  // Endocrine
  'adrenal-gland-r': { concepts: ['right adrenal gland'] },
  'adrenal-gland-l': { concepts: ['left adrenal gland'] },

  // Nervous — BodyParts3D's `spinal cord` concept is a single four-centimetre fragment at
  // neck level rather than the cord, so it is deliberately not used; see NO_OPEN_MESH.

  // Skeletal
  skull: { concepts: ['skull'] },
  'rib-cage': { concepts: ['rib', 'sternum'] },
  'vertebral-column': { concepts: ['cervical vertebral column', 'thoracic vertebral column', 'lumbar vertebral column'] },
  'humerus-r': { concepts: ['right humerus'] },
  'humerus-l': { concepts: ['left humerus'] },
  'radius-ulna-r': { concepts: ['right radius', 'right ulna'] },
  'radius-ulna-l': { concepts: ['left radius', 'left ulna'] },

  // Muscular — BodyParts3D models these by head or part, which are merged into the muscle.
  'deltoid-r': { concepts: ['acromial part of right deltoid', 'clavicular part of right deltoid', 'spinal part of right deltoid'] },
  'deltoid-l': { concepts: ['acromial part of left deltoid', 'clavicular part of left deltoid', 'spinal part of left deltoid'] },
  'biceps-brachii-r': { concepts: ['long head of right biceps brachii', 'short head of right biceps brachii'] },
  'biceps-brachii-l': { concepts: ['long head of left biceps brachii', 'short head of left biceps brachii'] },
  'pectoralis-major-r': { concepts: ['clavicular part of right pectoralis major', 'sternocostal part of right pectoralis major', 'abdominal part of right pectoralis major'] },
  'pectoralis-major-l': { concepts: ['clavicular part of left pectoralis major', 'sternocostal part of left pectoralis major', 'abdominal part of left pectoralis major'] },
  'quadriceps-femoris-r': { concepts: ['right rectus femoris', 'right vastus lateralis', 'right vastus medialis', 'right vastus intermedius'] },
  'quadriceps-femoris-l': { concepts: ['left rectus femoris', 'left vastus lateralis', 'left vastus medialis', 'left vastus intermedius'] },
  'gastrocnemius-r': { concepts: ['medial head of right gastrocnemius', 'lateral head of right gastrocnemius'] },
  'gastrocnemius-l': { concepts: ['medial head of left gastrocnemius', 'lateral head of left gastrocnemius'] },

  // Reproductive
  'testis-r': { concepts: ['right testis'], only: 'male' },
  'testis-l': { concepts: ['left testis'], only: 'male' },
};

/** Structures with no mesh in either source; these keep a generated stand-in. */
export const NO_OPEN_MESH = [
  // Neither source models a lung surface. BodyParts3D files the lungs as their airway and
  // vessel trees — a "bronchopulmonary segment" there is the segment's bronchus and vessels,
  // not a wedge of parenchyma — and the reference atlas models only the airway. Rendering a
  // branching tree labelled "right lung" would teach the wrong thing, so the lungs keep a
  // stand-in until a commercially usable parenchymal surface is licensed.
  'lung-r', 'lung-l',
  'spinal-cord', 'thyroid-gland', 'median-nerve-r', 'median-nerve-l', 'sciatic-nerve-r', 'sciatic-nerve-l',
  'rectus-abdominis', 'thoracolumbar-fascia', 'patellar-ligament-r', 'patellar-ligament-l',
  'jugular-notch', 'umbilicus',
];
