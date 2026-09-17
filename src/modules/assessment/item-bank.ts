import type { Citation } from '@/knowledge/schema';

/**
 * Global item bank seed. Items are derived from cited record fields and carry the same
 * citations; faculty approve before use in a real assessment (Phase J §1).
 */
export type Item =
  | { id: string; type: 'mcq'; mode: string; structureId: string; stem: string; options: { id: string; text: string }[]; correct: string; citations: Citation[] }
  | { id: string; type: 'multi'; mode: string; structureId: string; stem: string; options: { id: string; text: string }[]; correct: string[]; citations: Citation[] }
  | { id: string; type: 'short'; mode: string; structureId: string; stem: string; accepted: string[]; citations: Citation[] }
  | { id: string; type: 'spot3d'; mode: string; structureId: string; stem: string; citations: Citation[] };

const OS = (locator: string): Citation => ({ sourceId: 'openstax_ap2e', locator });
const MOORE = (locator: string): Citation => ({ sourceId: 'moore_coa8', locator });

export const ITEM_BANK: Item[] = [
  { id: 'q-heart-1', type: 'mcq', mode: 'mbbs', structureId: 'heart', stem: 'The coronary arteries arise from which vessel?', options: [{ id: 'a', text: 'Pulmonary trunk' }, { id: 'b', text: 'Ascending aorta' }, { id: 'c', text: 'Superior vena cava' }, { id: 'd', text: 'Left atrium' }], correct: 'b', citations: [OS('Ch. 19.1 Heart Anatomy — Coronary Arteries')] },
  { id: 'q-heart-2', type: 'multi', mode: 'mbbs', structureId: 'heart', stem: 'Which are layers of the heart wall?', options: [{ id: 'a', text: 'Epicardium' }, { id: 'b', text: 'Myocardium' }, { id: 'c', text: 'Perimysium' }, { id: 'd', text: 'Endocardium' }], correct: ['a', 'b', 'd'], citations: [OS('Ch. 19.1 Heart Anatomy — Layers of the Heart')] },
  { id: 'q-liver-1', type: 'mcq', mode: 'mbbs', structureId: 'liver', stem: 'Nutrient-rich blood from the gut reaches the liver via the:', options: [{ id: 'a', text: 'Hepatic artery proper' }, { id: 'b', text: 'Hepatic veins' }, { id: 'c', text: 'Hepatic portal vein' }, { id: 'd', text: 'Inferior vena cava' }], correct: 'c', citations: [OS('Ch. 23.6 Accessory Organs — The Liver')] },
  { id: 'q-biceps-1', type: 'short', mode: 'mbbs', structureId: 'biceps-brachii-r', stem: 'Name the nerve supplying biceps brachii.', accepted: ['musculocutaneous nerve', 'musculocutaneous'], citations: [MOORE('Ch. 3 Upper Limb — Biceps brachii')] },
  { id: 'q-median-1', type: 'mcq', mode: 'mbbs', structureId: 'median-nerve-r', stem: 'Compression of the median nerve beneath the flexor retinaculum is called:', options: [{ id: 'a', text: 'Cubital tunnel syndrome' }, { id: 'b', text: 'Carpal tunnel syndrome' }, { id: 'c', text: 'Saturday night palsy' }, { id: 'd', text: 'Erb palsy' }], correct: 'b', citations: [MOORE('Ch. 3 Upper Limb — Clinical box: Carpal tunnel syndrome')] },
  { id: 'q-kidney-1', type: 'mcq', mode: 'school', structureId: 'kidney-r', stem: 'Which kidney usually lies slightly lower?', options: [{ id: 'a', text: 'Right' }, { id: 'b', text: 'Left' }, { id: 'c', text: 'They are level' }], correct: 'a', citations: [OS('Ch. 25.3 Gross Anatomy of the Kidney — External Anatomy')] },
  { id: 'q-femur-1', type: 'short', mode: 'mbbs', structureId: 'femur-r', stem: 'Which arteries give retinacular branches to the head and neck of the femur?', accepted: ['medial and lateral circumflex femoral arteries', 'circumflex femoral arteries', 'medial circumflex femoral artery and lateral circumflex femoral artery'], citations: [MOORE('Ch. 7 Lower Limb — Blood supply of the femur')] },
  { id: 's-heart', type: 'spot3d', mode: 'mbbs', structureId: 'heart', stem: 'Identify the highlighted structure.', citations: [] },
  { id: 's-liver', type: 'spot3d', mode: 'mbbs', structureId: 'liver', stem: 'Identify the highlighted structure.', citations: [] },
  { id: 's-kidney-l', type: 'spot3d', mode: 'mbbs', structureId: 'kidney-l', stem: 'Identify the highlighted structure, including side.', citations: [] },
  { id: 's-biceps-r', type: 'spot3d', mode: 'mbbs', structureId: 'biceps-brachii-r', stem: 'Identify the highlighted muscle, including side.', citations: [] },
  { id: 's-median-l', type: 'spot3d', mode: 'mbbs', structureId: 'median-nerve-l', stem: 'Identify the highlighted nerve, including side.', citations: [] },
];
