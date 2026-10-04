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
  { match: /^breast-envelope-/, text: 'A thin plate of fat and glandular tissue 3.5 mm under the skin, anchored on the nipple and lying in front of the pectoralis and ribs. It is a placeholder for the whole breast (the real HRA mammary gland sits inside it); size and shape are not measured. Female body only.' },
  { match: /^suspensory-ligaments-of-breast-/, text: "Cooper's ligaments are fibrous septa that run from the fascia over the pectoralis to the dermis. About 40 are drawn, fanned around the nipple; the number and course are indicative only. Female body only." },
  { match: /^lactiferous-ducts-/, text: 'Fifteen lactiferous ducts are drawn running from the nipple back into the gland, each branching twice. Real breasts have about 4-18 ducts and their pattern differs from person to person. Female body only.' },
  { match: /^axillary-tail-of-breast-/, text: 'The axillary tail (tail of Spence) is the tongue of breast tissue that runs from the upper outer quadrant towards the axilla; drawn as a plate under the skin of the lateral chest. Female body only.' },
  { match: /^female-urethra$/, text: 'The female urethra is short (about 4 cm); this tube joins the real bladder neck to the vestibule schematically. Female body only.' },
  { match: /^(bulbar|penile)-part-of-male-urethra$/, text: 'Cut from the centre line of the real urethra mesh as a labelled segment: bulbar part (inside the bulb of the penis) and penile (spongy) part (through the corpus spongiosum). Male body only.' },
  { match: /^bulbourethral-gland-/, text: "Cowper's glands are pea-sized and lie beside the membranous urethra in the deep perineal pouch; this one is placed clear of the neighbouring real structures, size and exact position are indicative. Male body only." },
  { match: /^duct-of-bulbourethral-gland-/, text: 'The duct of the bulbourethral gland runs obliquely forward to open into the bulbar urethra; drawn as a straight-ish tube from the gland to the urethra. Male body only.' },
  { match: /^pericardial-cavity$/, text: 'The pericardial cavity is the potential space with a film of fluid between the heart (epicardium) and the fibrous pericardium; the shell is a thin envelope around the heart mesh, not a measured surface.' },
  { match: /^(transverse|oblique)-pericardial-sinus$/, text: 'The pericardial sinuses are recesses of the pericardial cavity: the transverse sinus behind the aorta and pulmonary trunk, the oblique sinus behind the left atrium. Drawn as small hollow ovals, placed clear of the real vessels and atria.' },
  { match: /^omental-bursa$/, text: 'The omental bursa (lesser sac) is a potential space behind the stomach and lesser omentum and in front of the pancreas. Drawn as a thin hollow sheet between them; its recesses are not modelled.' },
  { match: /^(rectovesical|rectouterine|vesicouterine)-pouch$/, text: 'A recess of the peritoneal cavity between two pelvic organs (rectum and bladder in men; rectum and uterus, and bladder and uterus, in women). Drawn as a small hollow oval at the expected level; depth varies with organ filling.' },
  { match: /^retropubic-space$/, text: 'The retropubic space (of Retzius) is the fat-filled extraperitoneal space between the pubic symphysis and the bladder. Drawn as a small hollow oval behind the symphysis; in these registered meshes the bladder touches the symphysis, so it is squeezed.' },
  { match: /^tympanic-cavity-/, text: 'The tympanic cavity (middle ear) is the air-filled space around the ossicles, medial to the tympanic membrane. Drawn as a small hollow envelope around the real ossicles; its walls touch the membrane, the labyrinth and the temporal bone by definition.' },
  { match: /-inset$/, text: 'Representative inset: skin appendages are microscopic, so this is one labelled example drawn about 3x life size with thickened radii at a patch of abdominal skin. It is not anatomical, not to scale and not a position on the body.' },
];

export function schematicNote(s: Pick<ManifestStructure, 'id' | 'provenance' | 'category'>): string | null {
  if (s.provenance !== 'generated' || !s.category?.startsWith('schematic')) return null;
  return NOTES.find((n) => n.match.test(s.id))?.text ?? null;
}
