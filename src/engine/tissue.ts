import type { SystemId } from './types';

/**
 * Tissue appearance (Phase G §4).
 *
 * Colour in an anatomy atlas is a teaching decision, not decoration. Two conventions exist:
 * the textbook convention, where every artery is bright red and every vein blue, and the
 * prosection convention, where tissue looks like tissue. This table follows the second for
 * organs, because a student who has met a real liver should recognise the one on screen, and
 * keeps the textbook convention for vessels and nerves, where the colour carries the meaning.
 *
 * `roughness` separates wet from dry: serosal surfaces (liver, spleen, bowel) are glossy,
 * bone and cartilage are matt. `sheen` adds the faint off-angle glow of a moist membrane,
 * which is most of what distinguishes a fresh organ from a plastic model.
 */
export interface TissueAppearance {
  color: string;
  roughness: number;
  /** 0 = matt dielectric, 1 = strong moist sheen */
  sheen: number;
  /** Rendered translucent at this opacity when the structure is shown (skin, capsules). */
  baseOpacity?: number;
}

const SYSTEM_DEFAULTS: Record<SystemId, TissueAppearance> = {
  skeletal: { color: '#e6ded0', roughness: 0.72, sheen: 0.05 },
  muscular: { color: '#9d3f3a', roughness: 0.55, sheen: 0.25 },
  nervous: { color: '#e8dfc8', roughness: 0.6, sheen: 0.15 },
  endocrine: { color: '#b9705f', roughness: 0.45, sheen: 0.35 },
  cardiovascular: { color: '#a3423c', roughness: 0.4, sheen: 0.4 },
  respiratory: { color: '#c98d8d', roughness: 0.45, sheen: 0.3 },
  digestive: { color: '#b57a5a', roughness: 0.4, sheen: 0.45 },
  urinary: { color: '#9c5a4c', roughness: 0.42, sheen: 0.4 },
  reproductive: { color: '#bd7a72', roughness: 0.45, sheen: 0.35 },
  lymphatic: { color: '#8a5f76', roughness: 0.45, sheen: 0.35 },
  integumentary: { color: '#d7b49b', roughness: 0.65, sheen: 0.1, baseOpacity: 0.28 },
  connective: { color: '#ddd3c0', roughness: 0.6, sheen: 0.15 },
  fascial: { color: '#e2dac9', roughness: 0.55, sheen: 0.2, baseOpacity: 0.55 },
  surface: { color: '#c9a892', roughness: 0.7, sheen: 0.05 },
};

/** Per-structure tissue, where the organ has a colour of its own. */
const BY_STRUCTURE: Record<string, TissueAppearance> = {
  liver: { color: '#8a4437', roughness: 0.34, sheen: 0.55 },
  spleen: { color: '#6e3346', roughness: 0.34, sheen: 0.55 },
  pancreas: { color: '#c9a36b', roughness: 0.45, sheen: 0.4 },
  stomach: { color: '#c08a6a', roughness: 0.38, sheen: 0.5 },
  'small-intestine': { color: '#c48a66', roughness: 0.36, sheen: 0.52 },
  'large-intestine': { color: '#bd8462', roughness: 0.38, sheen: 0.5 },
  heart: { color: '#8f3a34', roughness: 0.38, sheen: 0.45 },
  aorta: { color: '#b0554b', roughness: 0.4, sheen: 0.4 },
  'inferior-vena-cava': { color: '#5d6b8a', roughness: 0.42, sheen: 0.35 },
  'kidney-l': { color: '#93503f', roughness: 0.36, sheen: 0.5 },
  'kidney-r': { color: '#93503f', roughness: 0.36, sheen: 0.5 },
  'urinary-bladder': { color: '#cbb289', roughness: 0.42, sheen: 0.42 },
  brain: { color: '#cfc2b4', roughness: 0.55, sheen: 0.2 },
  'spinal-cord': { color: '#ddd2bf', roughness: 0.55, sheen: 0.2 },
  trachea: { color: '#cdd2c6', roughness: 0.6, sheen: 0.15 },
  'lung-r': { color: '#c08585', roughness: 0.5, sheen: 0.25 },
  'lung-l': { color: '#c08585', roughness: 0.5, sheen: 0.25 },
  thymus: { color: '#c08a86', roughness: 0.45, sheen: 0.35 },
  'thyroid-gland': { color: '#a85b4c', roughness: 0.4, sheen: 0.45 },
  'adrenal-gland-r': { color: '#c9a878', roughness: 0.45, sheen: 0.35 },
  'adrenal-gland-l': { color: '#c9a878', roughness: 0.45, sheen: 0.35 },
  prostate: { color: '#b07a72', roughness: 0.42, sheen: 0.4 },
  uterus: { color: '#b56a68', roughness: 0.4, sheen: 0.45 },
  skin: { color: '#d9b49a', roughness: 0.62, sheen: 0.12, baseOpacity: 0.26 },
  // Vessels and nerves keep the teaching convention: the colour is the label.
  'median-nerve-r': { color: '#e8d48a', roughness: 0.55, sheen: 0.2 },
  'median-nerve-l': { color: '#e8d48a', roughness: 0.55, sheen: 0.2 },
  'sciatic-nerve-r': { color: '#e8d48a', roughness: 0.55, sheen: 0.2 },
  'sciatic-nerve-l': { color: '#e8d48a', roughness: 0.55, sheen: 0.2 },
};

/** A small, stable per-structure colour shift so neighbouring organs are not identical. */
function jitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000 - 0.5) * 0.06;
}

export function tissueFor(structureId: string, systems: SystemId[]): TissueAppearance & { shade: number } {
  const base = BY_STRUCTURE[structureId] ?? SYSTEM_DEFAULTS[systems[0] ?? 'connective'];
  return { ...base, shade: jitter(structureId) };
}

export { SYSTEM_DEFAULTS as TISSUE_SYSTEM_DEFAULTS };
