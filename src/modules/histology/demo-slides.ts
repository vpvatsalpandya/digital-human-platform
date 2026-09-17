import type { Annotation } from './tiles';

/** Demo slide catalogue. Real entries reference DZI pyramids and carry pack/licence ids. */
export const DEMO_SLIDES = [
  { id: 'demo-liver-normal', title: 'Liver — schematic (normal architecture)', kind: 'schematic-epithelium' as const, structureId: 'liver', isPathology: false },
  { id: 'demo-liver-cirrhosis', title: 'Liver — schematic (nodular pattern)', kind: 'schematic-nodular' as const, structureId: 'liver', isPathology: true },
];

export const DEMO_ANNOTATIONS: Record<string, Annotation[]> = {
  'demo-liver-normal': [
    { id: 'a1', label: 'Region A (schematic lobule)', polygon: [[0.40, 0.40], [0.60, 0.40], [0.60, 0.60], [0.40, 0.60]], layer: 'guided', order: 0, note: 'In a real H&E liver slide this tour would start at a classic lobule with the central vein at its centre (OpenStax A&P 2e §23.6).' },
    { id: 'a2', label: 'Region B (schematic triad position)', polygon: [[0.62, 0.38], [0.68, 0.38], [0.68, 0.44], [0.62, 0.44]], layer: 'guided', order: 1, note: 'Portal triads sit at lobule corners: hepatic artery branch, portal vein branch, bile duct.' },
    { id: 'e1', label: 'Region A', polygon: [[0.40, 0.40], [0.60, 0.40], [0.60, 0.60], [0.40, 0.60]], layer: 'exam' },
  ],
  'demo-liver-cirrhosis': [
    { id: 'a1', label: 'Nodular region (schematic)', polygon: [[0.45, 0.45], [0.55, 0.45], [0.55, 0.55], [0.45, 0.55]], layer: 'guided', order: 0, note: 'Cirrhosis shows regenerative nodules bounded by fibrous septa (Robbins 10th ed., Ch. 18). This schematic only illustrates the viewer.' },
    { id: 'e1', label: 'Nodular region', polygon: [[0.45, 0.45], [0.55, 0.45], [0.55, 0.55], [0.45, 0.55]], layer: 'exam' },
  ],
};
