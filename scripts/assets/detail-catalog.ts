/**
 * Classification rules for the detail pack: which Z-Anatomy and Human Reference Atlas meshes
 * are included, what they are called, and which group, system and skin-to-bone layer each
 * belongs to. Everything here is a decision about licensing or anatomy, so it is written
 * down rather than computed.
 */
import type { SystemId } from '../../src/engine/types';

export interface ZIndexEntry { i: number; name: string; type: string; paths: string[]; nv: number; nt: number; min: number[]; max: number[] }

export interface Classified {
  category: string;
  systems: SystemId[];
  group: string;
  layer?: number;
  region?: string;
  /** Skip reason; present when the mesh is deliberately left out. */
  skip?: string;
}

export const GROUPS: Record<string, { title: string; description: string }> = {
  'skin-layers': { title: 'Skin layers', description: 'Schematic dermis and hypodermis shells, real abdominal subcutaneous fat patches, hair, nails and eyelashes.' },
  'fascia-bursae': { title: 'Fascia, bursae and tendon sheaths', description: 'Named deep fasciae, intermuscular septa, bursae and tendon sheaths.' },
  muscles: { title: 'Muscles and tendons', description: 'Every named muscle, muscle head and tendon in the reference set.' },
  skeleton: { title: 'Skeleton', description: 'Every named bone, tooth and cartilage: vertebrae, ribs, carpals, tarsals, phalanges, skull bones, ossicles and costal cartilages.' },
  joints: { title: 'Joints and ligaments', description: 'Ligaments, joint capsules, articular discs, menisci and labra.' },
  arteries: { title: 'Arteries', description: 'Named arteries from the aorta to the digital branches.' },
  veins: { title: 'Veins and sinuses', description: 'Named veins, venous plexuses and dural sinuses.' },
  nerves: { title: 'Nerves, plexuses and ganglia', description: 'Cranial nerves, spinal nerve roots, brachial and lumbosacral plexuses, named limb nerves, sympathetic trunk and ganglia.' },
  lymphatic: { title: 'Lymph nodes and lymphoid organs', description: 'Named lymph node groups, tonsils and thymic lobes.' },
  'organ-parts': { title: 'Organ parts and small structures', description: 'Lung lobes and bronchi, liver segments and ducts, pancreatic parts, bowel segments, renal calyces and pyramids, cardiac chambers and valves, larynx, tongue, eye, glands and reproductive structures.' },
  'inner-ear': { title: 'Inner ear and ear canal', description: 'Real CC BY 4.0 research-scan meshes: cochlear scalae, round window, external acoustic meatus (OpenEar) and membranous labyrinth: semicircular ducts, ampullae, utricle, saccule, cochlear duct (IE-Map). Registered onto the Z-Anatomy ossicles; the left ear is the right ear mirrored.' },
  'brain-regions': { title: 'Brain regions', description: 'Allen Human Reference Atlas regions: cortical gyri, basal ganglia, thalamic nuclei, cerebellum and ventricles.' },
};

/** Inner-ear meshes are adapted from a CC BY-NC-SA source inside Z-Anatomy; never shipped. */
const INNER_EAR = /cochlea\b|vestibule\b|semicircular|labyrinth|utricle|saccule|modiolus|cochlear duct|endolymph|perilymph/i;
/** Z-Anatomy's kidney meshes are adapted from a CC BY-NC source; the HRA kidney is used instead. */
const KIDNEY = /^(kidney|renal pelvis)\b|calyx|calyces|renal papilla|renal pyramid|renal column|renal cortex|renal medulla/i;
/** Brain and white-matter meshes have unverified (UW Brainder) provenance; the Allen atlas is used. */
const CNS_INTERNAL = /tract|fasciculus|horn of spinal cord|white matter|nucleus|nuclei|lemniscus|commissure|gyrus|sulcus|lobule|cerebell|colliculus|thalam|hippocamp|amygdal|insula|cortex|ventricle of brain|aqueduct|central canal|medulla oblongata|pons|midbrain|corpus callosum|fornix|septum pellucidum|peduncle|cerebral|hemisphere|basal ganglia|caudate|putamen|pallidus|claustrum|substantia|tegmentum|olive|pyramid of medulla|stria|habenula|infundibul|brain|cingulate|fissure|uncus|precuneus|cuneus|operculum|planum|pole of|lingula|vermis|flocculus|tonsil of cerebellum|nodule|declive|folium|tuber|culmen|pyramis|uvula of vermis|quadrangular|biventral|semilunar|gracile|clivus|anterior perforated|mammillary|tuber cinereum|optic chiasm|third ventricle|fourth ventricle|lateral ventricle|choroid plexus/i;

/** Z-Anatomy objects duplicated by an HRA structure already shipped in the core pack or the HRA parts. */
const Z_DUPLICATES_OF_HRA = /^(stomach|liver|pancreas|urinary bladder|prostate|testis|suprarenal gland|trachea|spleen|ureter|duodenum|jejunum|ascending colon|descending colon|transverse colon|sigmoid colon|vermiform appendix|gallbladder|mucosa of stomach|bile duct|pancreatic duct|accessory pancreatic duct|tongue|greater omentum|lesser omentum)\b/i;

export function baseName(raw: string): { base: string; side: 'left' | 'right' | 'none' } {
  let n = raw.trim();
  let side: 'left' | 'right' | 'none' = 'none';
  const m = n.match(/\.(l|r)$/);
  if (m) { side = m[1] === 'l' ? 'left' : 'right'; n = n.slice(0, -2); }
  else n = n.replace(/\.(j|i|g)$/, '');
  n = n.replace('(M2-segment)', '(M2)').replace(/^\((.*)\)$/, '$1').replace(/\*/g, '').replace(/'+$/, '').replace(/\s+/g, ' ').trim();
  return { base: n, side };
}

const REGION_BY_PATH: [RegExp, string][] = [
  [/Main divisions\/(Left|Right) hand|Main divisions\/(Left|Right) upper limb/, 'upper-limb'],
  [/Main divisions\/(Left|Right) foot|Main divisions\/(Left|Right) lower limb/, 'lower-limb'],
  [/Main divisions\/Head/, 'head'],
  [/Main divisions\/Neck/, 'neck'],
  [/Main divisions\/Trunk\/Thorax/, 'thorax'],
  [/Main divisions\/Trunk\/Abdomen/, 'abdomen'],
  [/Main divisions\/Trunk\/Pelvis/, 'pelvis'],
  [/Main divisions\/Trunk\/Back/, 'back'],
  [/Main divisions\/Trunk/, 'thorax'],
];
export function regionOf(paths: string[]): string | undefined {
  for (const [re, region] of REGION_BY_PATH) if (paths.some((p) => re.test(p))) return region;
  return undefined;
}

/** Sex-specific anatomy. Used to keep each body free of the other sex's structures (see tests/anatomy-sex.test.ts). */
export const MALE_ONLY = /\bmale urethra|navicular fossa|penis|penile|prostat|scrot|testicular|testis|testes|spermatic|seminal|deferens|epididym|ejaculatory|glans|prepuce|foreskin|cremaster|dartos|bulbospongios|ischiocavernos|bulbourethral|cowper|colliculus of urethra|utricle of prostate|prostatic utricle|fibromuscular stroma/i;
export const FEMALE_ONLY = /\buter(us|ine)\b|uterus|ovar(y|ian)|vagina|fallopian|clitor|vulva|labi(um|a) (majus|minus|majora|minora)|\blabia\b|cervix|cervical os|mesosalpinx|mesovarium|broad ligament|hymen|bartholin|vestibular bulb|bulb of vestibule/i;

const has = (paths: string[], s: string) => paths.some((p) => p.includes(s));

/** Classify one Z-Anatomy object. Returns `skip` for anything deliberately excluded. */
export function classifyZ(o: ZIndexEntry, body: 'male' | 'female'): Classified {
  const raw = o.name.trim();
  const { base } = baseName(raw);
  const top = (o.paths[0] ?? '').split('/').pop() ?? '';
  const paths = o.paths;
  const none = (skip: string): Classified => ({ category: 'other', systems: ['surface'], group: 'organ-parts', skip });

  if (o.nt === 0) return none('label only');
  if (raw.includes('?')) return none('unnamed placeholder');
  if (/\.g$/.test(raw)) return none('collection label mesh');
  if (body === 'female' && (MALE_ONLY.test(base) || /^urethra$/i.test(base))) return none('male-only structure (Z-Anatomy urethra is the male, penile urethra; the female one is a labelled schematic)');
  if (body === 'male' && FEMALE_ONLY.test(base)) return none('female-only structure');
  if (/^hairs of head$/i.test(raw)) return none('scalp hair volume from another subject does not fit either skull');
  if (INNER_EAR.test(base)) return none('inner ear: CC BY-NC-SA third-party model inside Z-Anatomy');
  if (KIDNEY.test(base)) return none('kidney: CC BY-NC third-party model inside Z-Anatomy; HRA kidney used');
  if (top.startsWith('2:')) return none('muscle attachment marker, not a structure');
  if (top.startsWith('Reference')) return none('reference line, plane or movement');
  if (top.startsWith('9:') && !has(paths, 'Integument')) return none('surface-region patch on the skin');
  if (top === '' || top === 'Scene Collection') return none('not a structure');
  const region = regionOf(paths);

  if (top.startsWith('9:')) {
    const cat = /hair|lash/i.test(base) ? 'hair' : 'nail';
    return { category: cat, systems: ['integumentary'], group: 'skin-layers', layer: 0, region };
  }

  if (top.startsWith('7:')) {
    if (has(paths, 'Nervous system/Central nervous system') && !/root of spinal nerve|cauda equina|^falx|^tentorium|spinal dura/i.test(base)) {
      if (has(paths, 'Brain') || has(paths, 'Neo-cortex') || CNS_INTERNAL.test(base) || has(paths, 'Spinal cord')) return none('brain / spinal-cord internals: provenance unverified (UW Brainder); Allen atlas used for brain');
    }
    if (has(paths, 'Nervous system/Sense organs')) {
      if (/eyeball|lens|cornea|retina|iris|sclera|vitreous|choroid|pupil|ciliary/i.test(base)) return none('eye: HRA eye used');
      return { category: 'eye structure', systems: ['nervous'], group: 'organ-parts', region: region ?? 'head' };
    }
    if (CNS_INTERNAL.test(base) && !/nerve|plexus|ganglion|root|cauda|trunk|ramus|branch|cord of brachial/i.test(base)) return none('brain / spinal-cord internal');
    if (/^(anterior|posterior) (chamber|segment) of eyeball|^(cornea|iris|lens|retina|sclera|vitreous body|zonular fibres)$/i.test(base)) return none('eye: HRA eye used');
    if (/^auditory tube$/i.test(base)) return { category: 'digestive part', systems: ['respiratory'], group: 'organ-parts', region: 'head' };
    let category = 'nerve';
    if (/ganglion|ganglia/i.test(base)) category = 'ganglion';
    else if (/plexus/i.test(base)) category = 'plexus';
    else if (/^(falx|tentorium|spinal dura)/i.test(base)) category = 'meninges';
    return { category, systems: ['nervous'], group: 'nerves', region };
  }

  if (top.startsWith('1:')) {
    if (/tooth|molar|incisor|canine|premolar/i.test(base)) return { category: 'tooth', systems: ['skeletal'], group: 'skeleton', layer: 6, region: 'head' };
    if (/cartilage/i.test(base)) return { category: 'cartilage', systems: ['skeletal', 'connective'], group: 'skeleton', layer: 6, region };
    return { category: 'bone', systems: ['skeletal'], group: 'skeleton', layer: 6, region };
  }

  if (top.startsWith('3:')) {
    let category = 'ligament';
    if (/capsule/i.test(base)) category = 'capsule';
    else if (/disc|meniscus|labrum|symphysis|nucleus pulposus|annulus/i.test(base)) category = 'disc';
    else if (/membrane|syndesmosis/i.test(base)) category = 'membrane';
    return { category, systems: ['connective'], group: 'joints', layer: 6, region };
  }

  if (top.startsWith('4:')) {
    if (has(paths, 'Muscular system/Fascia')) return { category: 'fascia', systems: ['fascial', 'connective'], group: 'fascia-bursae', layer: 3, region };
    if (has(paths, 'Muscular system/Bursae')) return { category: 'bursa', systems: ['connective'], group: 'fascia-bursae', layer: 5, region };
    if (has(paths, 'Muscular system/Tendon sheaths')) return { category: 'tendon sheath', systems: ['connective'], group: 'fascia-bursae', layer: 5, region };
    const tendon = /tendon|aponeurosis|tendinous|retinaculum|raphe|linea alba|septum/i.test(base) && !/muscle$/i.test(base);
    const superficial = has(paths, 'Superficial muscles');
    return { category: tendon ? 'tendon' : 'muscle', systems: ['muscular'], group: 'muscles', layer: superficial ? 4 : 5, region };
  }

  if (top.startsWith('5:')) {
    if (has(paths, 'Cardiovascular system/Heart')) return none('cardiac chambers and valves: HRA heart used so they register with the core heart');
    const artery = paths.some((p) => /arter/i.test(p)) || /artery|aorta|aortic arch|trunk|arcade|anastomosis/i.test(base);
    const vein = paths.some((p) => /vein|venous/i.test(p)) || /vein|sinus|vena cava|plexus|azygos/i.test(base);
    if (artery && !vein) return { category: 'artery', systems: ['cardiovascular'], group: 'arteries', region };
    if (vein) return { category: 'vein', systems: ['cardiovascular'], group: 'veins', region };
    return { category: 'artery', systems: ['cardiovascular'], group: 'arteries', region };
  }

  if (top.startsWith('6:')) {
    if (/^spleen$/i.test(base)) return none('spleen: HRA spleen in core pack');
    if (/node/i.test(base)) return { category: 'lymph node', systems: ['lymphatic'], group: 'lymphatic', region };
    return { category: 'lymphoid', systems: ['lymphatic'], group: 'lymphatic', region };
  }

  if (top.startsWith('8:')) {
    if (Z_DUPLICATES_OF_HRA.test(base)) return none('duplicated by an HRA mesh');
    if (MALE_ONLY.test(base) && body === 'female') return none('male-only structure');
    const sys: SystemId[] = has(paths, 'Respiratory') || /bronch|lung|pleura|epiglottis|larynx/i.test(base) ? ['respiratory']
      : has(paths, "Genital") || /penis|epididymis|deferens|seminal|ejaculatory/i.test(base) ? ['reproductive']
      : has(paths, 'Urinary') || /urethra/i.test(base) ? ['urinary']
      : /parathyroid|thyroid|pituitary|pineal|hypophysis/i.test(base) ? ['endocrine']
      : ['digestive'];
    let category = 'digestive part';
    if (sys[0] === 'respiratory') category = /bronch/i.test(base) ? 'bronchus' : /lobe of/i.test(base) ? 'lung lobe' : /pleura/i.test(base) ? 'serous membrane' : 'head-neck';
    else if (sys[0] === 'reproductive') category = 'reproductive part';
    else if (sys[0] === 'urinary') category = 'urinary part';
    else if (sys[0] === 'endocrine') category = 'endocrine';
    else if (/liver/i.test(base)) category = 'liver part';
    else if (/gland|tonsil/i.test(base)) category = 'gland';
    else if (/duct/i.test(base)) category = 'duct';
    else if (/omentum|mesocolon|meso-|taenia/i.test(base)) category = 'serous membrane';
    return { category, systems: sys, group: 'organ-parts', region };
  }
  return none('unclassified');
}


/**
 * HRA vessel meshes that the Z-Anatomy vessels do not already cover. The general vessel rule in
 * HRA_SKIP drops HRA arteries and veins because Z-Anatomy names them; these are the exceptions
 * (coronary and cardiac-vein branches, hepatic and portal branches, bowel and pelvic vessels,
 * orbital veins), checked by name against the pack. They sit on the HRA organs themselves.
 */
export const HRA_VESSEL_ALLOW = /^(left_anterior_descending_artery|left_circumflex_artery|diagonal_branch_of_(anterior_descending_branch_of_left_coronary|left_anterior_descending)_artery|left_marginal_(branch|vein)|right_marginal_artery|right_posterior_descending_artery|left_posterior_descending_branch_of_circumflex_branch_of_left_coronary_artery|small_cardiac_vein|anterior_cardiac_vein|posterior_vein_of_left_ventricle|oblique_vein_of_left_atrium|cystic_(artery|vein)|(left|right)_hepatic_artery|(anterior|posterior)_segmental_right_hepatic_artery|middle_hepatic_artery_branch_of_left_hepatic_artery|(left|middle|right)_hepatic_vein|(left|right)_branch_of_portal_vein|sigmoid_artery_[abc]|left_colic_vein|ileocolic_vein|inferior_pancreaticoduodenal_vein|median_sacral_vein|superior_rectal_(vein|artery)|(inferior|middle)_rectal_vein_[LR]|central_retinal_vein_[LR]|ophthalmic_vein_[LR]|(left|right)_uterine_(artery|vein)|coronary_ligament_of_liver)$/;

/** HRA "united" meshes not shipped in the detail pack, with the reason. */
const HRA_SKIP: [RegExp, string][] = [
  [/skin$/i, 'skin is in the core pack'],
  [/^Allen_/, 'brain regions have their own group'],
  [/^Yao_/, 'lymph-node microanatomy, not gross anatomy'],
  [/subcutaneous_abdominal_adipose/, 'own group'],
  [/bronchopulmonary|^hilum|_hilum|bronchus$|bronchi$|posterior_basal$|^bronchus|lobar_bronchus|cartilage_of_the/i, 'airway/segment trees; Z-Anatomy lobes and bronchi used'],
  [/vein|artery|aorta|aortic_arch|trunk|sinus$|cava|portal|carotid|subclavian|marginal|descending_artery|diagonal_branch|coronary/i, 'vessels: Z-Anatomy vessels used'],
  [/vertebra|intervertebral|nucleus_pulposus|sacrum|coccyx|ilium|ischium|pubis|hyoid|^femur|^tibia|^fibula|^patella_|knee|cruciate|collateral|meniscus|cartilage_of_knee|enthesis|epicondylar|condyle|perichondular|intercondylar|patellar_surface|trochlear|distal_most|anterolateral_ligament/i, 'skeleton and knee: Z-Anatomy used (patellar ligament handled separately)'],
  [/_impression|bare_area|diaphragmatic_surface|colic_surface|gastric_surface|renal_surface|hilum_of_|^hilum/i, 'landmark surface, not a structure'],
  [/extraocular|optic_nerve|^left_optic|^right_optic|ophthalmic|central_retinal|ciliary_artery|long_posterior/i, 'Z-Anatomy or vessels'],
  [/thymus_lobe|_surface_of_spleen|hilum_of_spleen/i, 'Z-Anatomy / core'],
  [/vas_deferens|seminal_vesicle|ejaculatory_duct|^set_of_(upper|lower)_jaw_teeth|sublingual_gland|submandibular_gland|parotid_gland|palatine_tonsil/i, 'Z-Anatomy used'],
  [/cricothyroid|thyroarytenoid|thyroepiglottideus|thyroid_cartilage|cricoid_cartilage|arytenoid_cartilage|corniculate_cartilage|epiglottic_cartilage|epiglotic_cartilage/i, 'Z-Anatomy used'],
  [/placenta|chorionic|basal_plate|amnion|umbilical|uterovesical/i, 'pregnancy model, not standard anatomy'],
  [/patellar_ligament/i, 'handled as core upgrade'],
  [/^(ileum_terminal)$/, 'covered by ileum'],
  [/spinal_cord|segment_of_cervical|thoracic_spinal_cord|lumbar_spinal_cord|sacral_spinal_cord/i, 'handled as core upgrade'],
  [/mammary_lobes|main_lactiferous|areol|nipple|^fat_|suspensory_ligaments/i, 'handled as core upgrade'],
  [/^(left|right)_(ovary)$|^body_of_uterus$/i, 'core ovary/uterus'],
];
export function hraSkipReason(name: string): string | null {
  if (HRA_VESSEL_ALLOW.test(name)) return null;
  for (const [re, why] of HRA_SKIP) if (re.test(name)) return why;
  return null;
}

const HRA_TYPOS: [RegExp, string][] = [
  [/posetrior/g, 'posterior'], [/eigth/g, 'eighth'], [/ginviva/g, 'gingiva'], [/opthalmic/g, 'ophthalmic'],
  [/heptopancreatic/g, 'hepatopancreatic'], [/jejenum/g, 'jejunum'], [/segmennt/g, 'segment'], [/horizonal/g, 'horizontal'],
  [/collaterial/g, 'collateral'], [/epiglotic/g, 'epiglottic'], [/ucinate/g, 'uncinate'], [/superiomedial/g, 'superomedial'],
  [/fibria/g, 'fimbriae'], [/peduncle_crus/g, 'peduncle_crus'],
];

export function humanizeHra(name: string): { base: string; side: 'left' | 'right' | 'none' } {
  let n = name.replace(/^(VH_[MF]_|Allen_|NIH_)/, '');
  let side: 'left' | 'right' | 'none' = 'none';
  const tail = n.match(/_(L|R)(_[a-z])?$/);
  if (tail) { side = tail[1] === 'L' ? 'left' : 'right'; n = n.slice(0, tail.index) + (tail[2] ?? ''); }
  const lead = n.match(/^(left|right)_/);
  if (lead) { side = lead[1] === 'left' ? 'left' : 'right'; n = n.slice(lead[0].length); }
  n = n.replace(/_L(?=_|$)/g, '').replace(/_R(?=_|$)/g, '');
  for (const [re, to] of HRA_TYPOS) n = n.replace(re, to);
  n = n.replace(/_+/g, ' ').replace(/ 1$/, '').trim();
  return { base: n.charAt(0).toUpperCase() + n.slice(1), side };
}

export function classifyHra(name: string, body: 'male' | 'female'): Classified {
  const n = name.replace(/^VH_[MF]_/, '').toLowerCase();
  const skip = hraSkipReason(name.replace(/^VH_[MF]_/, ''));
  const none = (s: string): Classified => ({ category: 'other', systems: ['surface'], group: 'organ-parts', skip: s });
  if (skip) return none(skip);
  if (body === 'male' && /uter|fallop|ovar|vagina|cervi|mesosalpinx|mesovarium|broad_ligament|cornua|round_ligament_of_uterus|cardinal|uterosacral|infundibulum|fimbri|abdominal_ostium/.test(n)) return none('female-only structure');
  if (body === 'female' && MALE_ONLY.test(n.replace(/_/g, ' '))) return none('male-only structure');
  // The uterine-tube ampulla must not fall into the hepatopancreatic-ampulla rule below.
  if (/uterine_tube|ampulla_of_uterine|isthmus_of_fallop/.test(n) || /fallop/.test(n)) return { category: 'reproductive part', systems: ['reproductive'], group: 'organ-parts', region: 'pelvis' };
  // Allow-listed HRA vessels (coronary / cardiac-vein / hepatic / portal / bowel / pelvic / retinal branches).
  if (HRA_VESSEL_ALLOW.test(name.replace(/^VH_[MF]_/, '')) && !/coronary_ligament/.test(n)) {
    const vein = /vein/.test(n);
    const region = /cardiac|ventricle|atrium|coronary|marginal|descending|circumflex/.test(n) ? 'thorax' : /retinal/.test(n) ? 'head' : /rectal|sacral|uterine/.test(n) ? 'pelvis' : 'abdomen';
    return { category: vein ? 'vein' : 'artery', systems: ['cardiovascular'], group: vein ? 'veins' : 'arteries', region };
  }
  if (/valve|papillary|atrium|ventricle|septum/.test(n) && !/urethra|bladder/.test(n)) return { category: /valve/.test(n) ? 'valve' : 'heart part', systems: ['cardiovascular'], group: 'organ-parts', region: 'thorax' };
  if (/retina|cornea|iris|sclera|lens|vitreous|aqueous|conjunctiva|pupil|fovea|macula|optic|choroid|ciliary|schlemm|trabecular|dura_mater|ora_serrata|corneo/.test(n)) return { category: 'eye structure', systems: ['nervous'], group: 'organ-parts', region: 'head' };
  if (/larynx|vocalis|cricoarytenoid|^arytenoid$|carina|tracheal_cartilage/.test(n)) return { category: 'larynx', systems: ['respiratory'], group: 'organ-parts', region: 'neck' };
  if (/tongue|papillae|palate|gingiva|frenulum|mouth|buccal/.test(n)) return { category: 'digestive part', systems: ['digestive'], group: 'organ-parts', region: 'head' };
  if (/liver|hepatic|porta|caudate|quadrate|ligamentum_venosum|falciform|triangular|coronary_ligament|round_ligament_of_liver|cystic|bile|ampulla|sphincter/.test(n)) return { category: /duct|ampulla|sphincter/.test(n) ? 'duct' : 'liver part', systems: ['digestive'], group: 'organ-parts', region: 'abdomen' };
  if (/pancrea|santorini/.test(n)) return { category: /duct/.test(n) ? 'duct' : 'gland', systems: ['digestive', 'endocrine'], group: 'organ-parts', region: 'abdomen' };
  if (/calyx|papilla|pyramid|renal|kidney|ureter/.test(n)) return { category: 'urinary part', systems: ['urinary'], group: 'organ-parts', region: 'abdomen' };
  if (/bladder|trigone|urethra|orifice/.test(n)) return { category: 'urinary part', systems: ['urinary'], group: 'organ-parts', region: 'pelvis' };
  if (/prostat|seminal_colliculus|fibromuscular|utricle/.test(n)) return { category: 'reproductive part', systems: ['reproductive'], group: 'organ-parts', region: 'pelvis' };
  if (/uter|fallop|ovar|vagina|cervi|mesosalpinx|mesovarium|broad_ligament|cornua|ligament_of_uterus|cardinal|sacral_lig|infundibulum|ampulla_of_uterine|isthmus|abdominal_ostium|fimbri|fibria/.test(n)) return { category: 'reproductive part', systems: ['reproductive'], group: 'organ-parts', region: 'pelvis' };
  if (/duoden|jejun|ileum|ileo|colon|caecum|cecum|rectum|appendix|flexure|omentum|epiploic|gallbladder/.test(n)) return { category: 'digestive part', systems: ['digestive'], group: 'organ-parts', region: 'abdomen' };
  return { category: 'other', systems: ['surface'], group: 'organ-parts', skip: 'unclassified HRA mesh' };
}
