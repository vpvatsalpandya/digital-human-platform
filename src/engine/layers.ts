/**
 * Skin-to-bone layer stack for the peel-away control.
 *
 * Each structure that belongs to the stack carries a `layer` number in its manifest entry.
 * Peeling to depth N hides every structure whose layer is below N, so depth 0 shows the whole
 * body and depth 6 shows only the skeleton and joints.
 */
export const LAYER_NAMES = [
  'Skin (epidermis surface)',
  'Dermis (schematic shell)',
  'Hypodermis / subcutaneous fat',
  'Deep fascia',
  'Superficial muscles',
  'Deep muscles, tendon sheaths, bursae',
  'Skeleton, cartilage and joints',
] as const;

export const PEEL_STEPS = [
  'Nothing peeled',
  'Skin removed',
  'Dermis removed',
  'Subcutaneous layer removed',
  'Fascia removed',
  'Superficial muscles removed',
  'Deep muscles removed',
] as const;

/** Layers of core-pack structures that are not tagged in the core manifest itself. */
export const CORE_LAYERS: Record<string, number> = {
  skin: 0,
  'pectoralis-major-l': 4, 'pectoralis-major-r': 4, 'deltoid-l': 4, 'deltoid-r': 4,
  'biceps-brachii-l': 4, 'biceps-brachii-r': 4, 'rectus-abdominis': 4, 'quadriceps-femoris-l': 4,
  'quadriceps-femoris-r': 4, 'gastrocnemius-l': 4, 'gastrocnemius-r': 4,
  'thoracolumbar-fascia': 3, 'patellar-ligament-l': 5, 'patellar-ligament-r': 5,
  skull: 6, 'rib-cage': 6, 'vertebral-column': 6, pelvis: 6, 'humerus-l': 6, 'humerus-r': 6,
  'radius-ulna-l': 6, 'radius-ulna-r': 6, 'femur-l': 6, 'femur-r': 6, 'tibia-fibula-l': 6, 'tibia-fibula-r': 6,
};

/** True when a structure in the stack has been peeled away at this depth. */
export function isPeeled(layer: number | undefined, depth: number): boolean {
  return depth > 0 && layer !== undefined && layer < depth;
}
