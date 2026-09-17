import type { Citation } from '@/knowledge/schema';

/**
 * Embryology timeline content (FR-Em1). Status: draft pending faculty review. Each event
 * carries citations; no statement without one. Illustrations/3D per stage are commissioned
 * assets (A-05 §6) and referenced by assetUrl when available.
 */
export interface StageEvent { text: string; citations: Citation[] }
export interface Anomaly { name: string; mechanism: string; citations: Citation[] }
export interface Stage {
  id: string; title: string; weekPostFert: number; carnegie?: string; days: string; phase: 'fertilisation' | 'implantation' | 'gastrulation' | 'organogenesis' | 'fetal';
  events: StageEvent[]; anomalies: Anomaly[]; derivativeLinks: { text: string; structureId?: string }[]; assetUrl?: string;
}
const OS = (locator: string): Citation => ({ sourceId: 'openstax_ap2e', locator });
const LANG = (locator: string): Citation => ({ sourceId: 'langman14', locator });

export const STAGES: Stage[] = [
  { id: 'wk1', title: 'Fertilisation and cleavage', weekPostFert: 1, carnegie: 'CS 1–4', days: '0–6', phase: 'fertilisation',
    events: [
      { text: 'Fertilisation normally occurs in the ampulla of the uterine tube, forming the zygote.', citations: [OS('Ch. 28.1 Fertilization'), LANG('Ch. 3 First Week of Development')] },
      { text: 'Cleavage divisions produce the morula; a fluid-filled cavity forms the blastocyst with inner cell mass and trophoblast.', citations: [OS('Ch. 28.2 Embryonic Development — Pre-implantation Embryonic Development')] },
    ], anomalies: [], derivativeLinks: [] },
  { id: 'wk2', title: 'Implantation and bilaminar disc', weekPostFert: 2, carnegie: 'CS 5–6', days: '7–13', phase: 'implantation',
    events: [
      { text: 'The blastocyst implants in the endometrium about a week after fertilisation; the trophoblast differentiates into cytotrophoblast and syncytiotrophoblast.', citations: [OS('Ch. 28.2 Embryonic Development — Implantation'), LANG('Ch. 4 Second Week of Development')] },
      { text: 'The inner cell mass forms a bilaminar disc of epiblast and hypoblast; the amniotic cavity and yolk sac appear.', citations: [LANG('Ch. 4 Second Week of Development'), OS('Ch. 28.2 Embryonic Development')] },
    ], anomalies: [{ name: 'Ectopic pregnancy', mechanism: 'Implantation outside the uterine cavity, most often in the uterine tube.', citations: [LANG('Ch. 4 Clinical Correlates — Abnormal implantation')] }], derivativeLinks: [] },
  { id: 'wk3', title: 'Gastrulation and neurulation begins', weekPostFert: 3, carnegie: 'CS 7–9', days: '14–20', phase: 'gastrulation',
    events: [
      { text: 'Gastrulation: cells migrate through the primitive streak to form the three germ layers (ectoderm, mesoderm, endoderm).', citations: [OS('Ch. 28.2 Embryonic Development — Embryonic Membranes; Gastrulation'), LANG('Ch. 5 Third Week of Development')] },
      { text: 'The notochord forms and induces the overlying ectoderm to form the neural plate, beginning neurulation.', citations: [LANG('Ch. 5 Third Week — Formation of the notochord; Ch. 18 Central Nervous System')] },
    ], anomalies: [], derivativeLinks: [{ text: 'Ectoderm → nervous system, epidermis' }, { text: 'Mesoderm → muscle, bone, heart, kidneys', structureId: 'heart' }, { text: 'Endoderm → gut epithelium, liver, pancreas', structureId: 'liver' }] },
  { id: 'wk4', title: 'Neural tube closure, heartbeat, limb buds', weekPostFert: 4, carnegie: 'CS 10–13', days: '21–28', phase: 'organogenesis',
    events: [
      { text: 'The neural folds fuse to form the neural tube; the cranial neuropore closes around day 25 and the caudal neuropore around day 28.', citations: [LANG('Ch. 18 Central Nervous System — Neurulation')] },
      { text: 'The primitive heart tube begins to beat during the fourth week (around day 22).', citations: [OS('Ch. 19.5 Development of the Heart'), LANG('Ch. 13 Cardiovascular System')] },
      { text: 'Pharyngeal arches appear and the upper limb buds emerge by the end of the fourth week, followed by the lower limb buds.', citations: [LANG('Ch. 12 Limbs — Limb growth and development; Ch. 17 Head and Neck')] },
    ], anomalies: [
      { name: 'Neural tube defects (spina bifida, anencephaly)', mechanism: 'Failure of neural tube closure in the fourth week; risk reduced by periconceptional folic acid.', citations: [LANG('Ch. 18 Clinical Correlates — Neural tube defects')] },
    ], derivativeLinks: [{ text: 'Neural tube → brain and spinal cord', structureId: 'brain' }] },
  { id: 'wk5-8', title: 'Organogenesis completes the embryonic period', weekPostFert: 8, carnegie: 'CS 14–23', days: '29–56', phase: 'organogenesis',
    events: [
      { text: 'Between weeks five and eight the organ systems are established, the face forms from the facial prominences and the digits separate; by the end of week eight the embryo has a recognisably human form.', citations: [OS('Ch. 28.2 Embryonic Development — Organogenesis'), LANG('Ch. 6 Third to Eighth Weeks: The Embryonic Period')] },
      { text: 'This is the period of greatest susceptibility to teratogens because organ primordia are forming.', citations: [LANG('Ch. 9 Birth Defects and Prenatal Diagnosis')] },
    ], anomalies: [
      { name: 'Cleft lip', mechanism: 'Failure of fusion of the maxillary prominence with the medial nasal prominence.', citations: [LANG('Ch. 17 Head and Neck — Clinical Correlates: Facial clefts')] },
      { name: 'Ventricular septal defect', mechanism: 'Incomplete closure of the interventricular foramen; the most common congenital cardiac malformation.', citations: [LANG('Ch. 13 Cardiovascular System — Clinical Correlates: Heart defects')] },
    ], derivativeLinks: [{ text: 'Metanephros → definitive kidney', structureId: 'kidney-r' }, { text: 'Hepatic diverticulum → liver', structureId: 'liver' }] },
  { id: 'wk9-12', title: 'Early fetal period', weekPostFert: 12, days: '57–84', phase: 'fetal',
    events: [
      { text: 'The fetal period is characterised by growth and maturation of tissues and organs; external genitalia become distinguishable by about the twelfth week.', citations: [OS('Ch. 28.3 Fetal Development'), LANG('Ch. 8 Third Month to Birth: The Fetus and Placenta')] },
    ], anomalies: [], derivativeLinks: [] },
  { id: 'wk13-24', title: 'Mid-fetal period', weekPostFert: 24, days: '85–168', phase: 'fetal',
    events: [
      { text: 'Fetal movements are usually felt by the mother between weeks 16 and 20; surfactant production begins in the later part of this period, which is the main determinant of viability at about 24 weeks.', citations: [OS('Ch. 28.3 Fetal Development'), LANG('Ch. 8 Third Month to Birth; Ch. 14 Respiratory System')] },
    ], anomalies: [], derivativeLinks: [{ text: 'Type II pneumocytes → surfactant', structureId: 'lung-r' }] },
  { id: 'wk25-38', title: 'Late fetal period to term', weekPostFert: 38, days: '169–266', phase: 'fetal',
    events: [
      { text: 'Rapid weight gain and maturation; birth occurs at approximately 38 weeks after fertilisation (40 weeks after the last menstrual period).', citations: [OS('Ch. 28.3 Fetal Development'), LANG('Ch. 8 Third Month to Birth')] },
    ], anomalies: [], derivativeLinks: [] },
];
