import type { ManifestStructure } from '@/engine/types';

/** Short, clearly worded notes shown under the schematic badge for the gap-fill placeholders (generated, never real anatomy). */
const NOTES: { match: RegExp; text: string }[] = [
  { match: /^metopic-suture$/, text: 'The metopic suture joins the two halves of the frontal bone. It is usually closed (fused) in adults and persists in a minority, so it is drawn only as a line on the frontal bone.' },
  { match: /^medial-umbilical-ligament-/, text: 'Adult remnant of the obliterated distal umbilical artery. It raises the medial umbilical fold on the inside of the anterior abdominal wall.' },
  { match: /^umbilical-artery-/, text: 'In the adult only the proximal part of the umbilical artery stays open (it gives the superior vesical arteries); the rest is the medial umbilical ligament. The vessel is fetal otherwise.' },
  { match: /^ligamentum-arteriosum$/, text: 'Fibrous remnant of the fetal ductus arteriosus, from the aortic arch to the left pulmonary artery.' },
  { match: /^pleural-cavity-/, text: 'The pleural cavity is a potential space with a film of fluid between the visceral and parietal pleura; the shell is a thin envelope around the lung, not a measured surface.' },
  { match: /^fibrous-pericardium$/, text: 'The fibrous pericardium is the tough outer sac around the heart; the shell is a thin envelope around the heart mesh, not a measured surface.' },
  { match: /^(mesentery|transverse-mesocolon|sigmoid-mesocolon|lesser-omentum|gastrosplenic-ligament|splenorenal-ligament)$/, text: 'Peritoneal folds are thin and move with the bowel; this sheet joins its real attachments schematically and is not a measured shape.' },
  { match: /^(nipple|areola)-/, text: 'Placed on the most forward point of the skin of the chest (over the centre of the mammary gland in the female body). Present in both sexes.' },
  { match: /^pituitary-infundibulum$/, text: 'The stalk joining the hypothalamus to the pituitary gland; the pituitary and hypothalamus themselves are real meshes.' },
  { match: /^(membranous-part|navicular-fossa)-of-male-urethra$/, text: 'Drawn along the centre line of the real penile urethra mesh as a labelled segment. Male body only.' },
  { match: /-inset$/, text: 'Representative inset: skin appendages are microscopic, so this is one labelled example drawn about 3x life size with thickened radii at a patch of abdominal skin. It is not anatomical, not to scale and not a position on the body.' },
];

export function schematicNote(s: Pick<ManifestStructure, 'id' | 'provenance' | 'category'>): string | null {
  if (s.provenance !== 'generated' || !s.category?.startsWith('schematic')) return null;
  return NOTES.find((n) => n.match.test(s.id))?.text ?? null;
}
