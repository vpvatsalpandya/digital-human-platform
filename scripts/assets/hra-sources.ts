/**
 * Mapping from platform structure ids to meshes in the HuBMAP Human Reference Atlas
 * 3D Reference Object Library (CC BY 4.0 — docs/phase-a/05-licensing-audit.md §2.3).
 *
 * The library models the viscera, brain, skin, pelvis and great vessels, and it does so in a
 * single body coordinate space in metres, which is why organs from different files line up
 * without any per-organ fitting. It does not model lung parenchyma, stomach, thyroid,
 * adrenals, skull, ribs or limb bones beyond the femur, and it models no muscle or peripheral
 * nerve: those structures keep their procedural stand-ins and are marked as such in the
 * manifest so the interface can tell a student which is which.
 *
 * `include` and `exclude` match node names within the file. A structure is the union of the
 * nodes it matches, merged into one mesh.
 */
export interface HraSource {
  /** GLB file name, with `{S}` standing in for the sex letter (M or F). */
  file: string;
  include: RegExp[];
  exclude?: RegExp[];
  /** Restrict to one body where the structure only exists there. */
  only?: 'male' | 'female';
  /** Where the library's own file is named for one sex, e.g. the Allen brain. */
  fileSexToken?: boolean;
}

/** Nodes present in many files that are landmarks or annotation aids, not the organ itself. */
const LANDMARKS = [/landmark/i, /bisection/i, /_impression_of_/i, /HuBMAP/i];

export const HRA_SOURCES: Record<string, HraSource> = {
  // ── Integumentary ────────────────────────────────────────────────────────────
  skin: { file: 'VH_{S}_Skin.glb', include: [/skin/i] },

  // ── Cardiovascular ───────────────────────────────────────────────────────────
  heart: {
    file: 'VH_{S}_Heart.glb',
    // The heart file ships the great vessels too; those are separate structures here.
    include: [/heart|cardiac|ventricle|atrium|myocardium|epicardium|valve|septum|papillary|chordae|trabecula|coronary/i],
    exclude: [...LANDMARKS, /aorta|aortic_arch|brachiocephalic|carotid|subclavian|pulmonary_trunk|vena_cava/i],
  },
  aorta: {
    file: 'VH_{S}_Heart.glb',
    include: [/ascending_aorta|aortic_arch|descending_aorta|thoracic_aorta|abdominal_aorta/i],
    exclude: LANDMARKS,
  },
  'inferior-vena-cava': { file: 'VH_{S}_Heart.glb', include: [/inferior_vena_cava/i], exclude: LANDMARKS },

  // ── Respiratory (only the airway is modelled; parenchyma is not) ─────────────
  trachea: { file: 'VH_{S}_Lung.glb', include: [/^VH[M F_]*_?trachea$|tracheal_cartilage/i], exclude: LANDMARKS },

  // ── Digestive ────────────────────────────────────────────────────────────────
  liver: { file: 'VH_{S}_Liver.glb', include: [/liver|hepatic|lobe_of_liver/i], exclude: LANDMARKS },
  pancreas: { file: 'VH_{S}_Pancreas.glb', include: [/pancreas|pancreatic/i], exclude: LANDMARKS },
  'small-intestine': { file: 'VH_{S}_Small_Intestine.glb', include: [/duodenum|jejunum|ileum|intestine/i], exclude: LANDMARKS },
  'large-intestine': { file: 'SBU_{S}_Intestine_Large.glb', include: [/colon|caecum|cecum|rectum|appendix|flexure|ileocecal/i], exclude: LANDMARKS },

  // ── Urinary ──────────────────────────────────────────────────────────────────
  'kidney-l': { file: 'VH_{S}_Kidney_L.glb', include: [/kidney|renal|nephron|papilla|pyramid|calyx|calix|cortex|medulla|pelvis_of/i], exclude: LANDMARKS },
  'kidney-r': { file: 'VH_{S}_Kidney_R.glb', include: [/kidney|renal|nephron|papilla|pyramid|calyx|calix|cortex|medulla|pelvis_of/i], exclude: LANDMARKS },
  'urinary-bladder': { file: 'VH_{S}_Urinary_Bladder.glb', include: [/bladder|trigone|detrusor|urethra/i], exclude: LANDMARKS },

  // ── Lymphatic ────────────────────────────────────────────────────────────────
  spleen: { file: 'VH_{S}_Spleen.glb', include: [/spleen|splenic/i], exclude: LANDMARKS },
  thymus: { file: 'VH_{S}_Thymus.glb', include: [/thymus|thymic/i], exclude: LANDMARKS },

  // ── Nervous ──────────────────────────────────────────────────────────────────
  brain: { file: 'Allen_{S}_Brain.glb', include: [/^Allen_/], exclude: LANDMARKS },

  // ── Skeletal ─────────────────────────────────────────────────────────────────
  pelvis: { file: 'VH_{S}_Pelvis.glb', include: [/pelvis|ilium|ischium|pubis|sacrum|coccyx|acetabul/i], exclude: LANDMARKS },
  'femur-l': { file: 'VH_{S}_Knee_L.glb', include: [/femur/i], exclude: [...LANDMARKS, /condyle_of_.*_inf/i] },
  'femur-r': { file: 'VH_{S}_Knee_R.glb', include: [/femur/i], exclude: [...LANDMARKS, /condyle_of_.*_inf/i] },
  'tibia-fibula-l': { file: 'VH_{S}_Knee_L.glb', include: [/tibia|fibula|patella/i], exclude: LANDMARKS },
  'tibia-fibula-r': { file: 'VH_{S}_Knee_R.glb', include: [/tibia|fibula|patella/i], exclude: LANDMARKS },

  // ── Reproductive ─────────────────────────────────────────────────────────────
  prostate: { file: 'VH_M_Prostate.glb', include: [/prostate|prostatic|seminal|ejaculatory/i], exclude: LANDMARKS, only: 'male' },
  uterus: { file: 'VH_F_Uterus.glb', include: [/uterus|uterine|myometrium|endometrium|cervix|fundus/i], exclude: LANDMARKS, only: 'female' },
  'ovary-l': { file: 'VH_F_Ovary_L.glb', include: [/ovary|ovarian|follicle/i], exclude: LANDMARKS, only: 'female' },
  'ovary-r': { file: 'VH_F_Ovary_R.glb', include: [/ovary|ovarian|follicle/i], exclude: LANDMARKS, only: 'female' },
};

export function sourceFileFor(source: HraSource, sex: 'male' | 'female'): string {
  return source.file.replace('{S}', sex === 'male' ? 'M' : 'F');
}

export function matchesNode(source: HraSource, name: string): boolean {
  if (source.exclude?.some((re) => re.test(name))) return false;
  return source.include.some((re) => re.test(name));
}
