/**
 * Colour by anatomical category for the merged detail layers. Individual meshes in a detail
 * group are baked into one draw call with vertex colours, so this table is the appearance
 * system for them. The convention follows the core atlas: arteries red, veins blue and nerves
 * yellow because the colour carries the meaning; everything else is tissue-like.
 */
export const CATEGORY_COLOR: Record<string, string> = {
  bone: '#e6ded0', tooth: '#f4f1e6', cartilage: '#c9d6e0', ligament: '#efe8d6', capsule: '#e9dfc9',
  disc: '#b9c7d0', fibrocartilage: '#b9c7d0', membrane: '#e4dccb', bursa: '#d7e3ee', 'tendon sheath': '#eadfc4',
  muscle: '#a54540', tendon: '#eee5d2', fascia: '#e8dfcd', artery: '#c8323a', vein: '#3f5fb0',
  nerve: '#e8d060', ganglion: '#e6c94a', plexus: '#e8d060', meninges: '#d8d0c0', 'spinal cord segment': '#ddd2bf',
  'brain region': '#cfc2b4', 'lymph node': '#7fbf86', lymphoid: '#8a5f76', 'lung lobe': '#c08585', bronchus: '#d99a9a',
  'serous membrane': '#dccdc0', gland: '#b9705f', endocrine: '#b9705f', 'heart part': '#8f3a34', valve: '#d8b9a0',
  'liver part': '#8a4437', duct: '#7fa06a', 'digestive part': '#c48a66', 'urinary part': '#9c5a4c', 'reproductive part': '#bd7a72',
  adipose: '#f0d98a', 'skin layer': '#d9b49a', hair: '#4a3626', nail: '#e9c9c2', 'eye structure': '#e9e3d6', larynx: '#cdd2c6',
  'head-neck': '#c98d8d', other: '#c9b8a8',
  // Generated stand-ins are drawn in one violet family so they cannot be mistaken for scanned anatomy.
  'schematic nerve': '#b58cff', 'schematic plexus': '#a06bff', 'schematic ganglion': '#d2b3ff', 'schematic vessel': '#c79bff', 'schematic tooth': '#e2ccff',
  'schematic eye': '#cdb0ff', 'schematic capsule': '#bfa0ff', 'schematic cartilage': '#d8c2ff', 'schematic ligament': '#c9aaff', 'schematic tendon': '#dcc6ff', 'schematic muscle': '#b496f2', 'schematic conduction': '#e9d9ff', 'schematic suture': '#b89af5', 'schematic organ': '#d9a8ff', 'schematic membrane': '#c3a3f7', 'schematic inset': '#e6b8ff', 'schematic gland': '#cf9cff', 'schematic cavity': '#b9a2f2',
  // Real research-scan inner ear (OpenEar / IE-Map): a pearly pink so it reads as tissue, not as schematic.
  'inner ear': '#e7b9c4', 'ear canal': '#e3c9b8',
};

export function categoryColor(category: string | undefined): string {
  return (category && CATEGORY_COLOR[category]) || CATEGORY_COLOR.other!;
}
