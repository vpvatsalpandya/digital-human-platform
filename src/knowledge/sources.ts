import type { Source } from './schema';

/**
 * Source registry. Permissive OER sources may be quoted; proprietary textbooks are cited
 * (title/edition/chapter) and never reproduced (Phase E §4; A-05).
 */
export const SOURCES: Record<string, Source> = {
  openstax_ap2e: {
    id: 'openstax_ap2e', type: 'oer', title: 'Anatomy and Physiology 2e', authors: 'Betts JG, Young KA, Wise JA, et al.', year: 2022,
    publisher: 'OpenStax, Rice University', url: 'https://openstax.org/books/anatomy-and-physiology-2e', licence: 'CC-BY-4.0',
    attributionText: 'Access for free at https://openstax.org/books/anatomy-and-physiology-2e',
  },
  moore_coa8: { id: 'moore_coa8', type: 'textbook', title: "Moore's Clinically Oriented Anatomy", authors: 'Moore KL, Dalley AF, Agur AMR', year: 2018, edition: '8th', publisher: 'Wolters Kluwer', licence: 'proprietary-cited-only' },
  gray42: { id: 'gray42', type: 'textbook', title: "Gray's Anatomy: The Anatomical Basis of Clinical Practice", authors: 'Standring S (ed.)', year: 2020, edition: '42nd', publisher: 'Elsevier', licence: 'proprietary-cited-only' },
  langman14: { id: 'langman14', type: 'textbook', title: "Langman's Medical Embryology", authors: 'Sadler TW', year: 2019, edition: '14th', publisher: 'Wolters Kluwer', licence: 'proprietary-cited-only' },
  guyton14: { id: 'guyton14', type: 'textbook', title: 'Guyton and Hall Textbook of Medical Physiology', authors: 'Hall JE, Hall ME', year: 2021, edition: '14th', publisher: 'Elsevier', licence: 'proprietary-cited-only' },
  robbins10: { id: 'robbins10', type: 'textbook', title: 'Robbins & Cotran Pathologic Basis of Disease', authors: 'Kumar V, Abbas AK, Aster JC', year: 2021, edition: '10th', publisher: 'Elsevier', licence: 'proprietary-cited-only' },
  junqueira16: { id: 'junqueira16', type: 'textbook', title: "Junqueira's Basic Histology: Text and Atlas", authors: 'Mescher AL', year: 2021, edition: '16th', publisher: 'McGraw Hill', licence: 'proprietary-cited-only' },
  hh1952: { id: 'hh1952', type: 'journal', title: 'A quantitative description of membrane current and its application to conduction and excitation in nerve', authors: 'Hodgkin AL, Huxley AF', year: 1952, publisher: 'J Physiol 117:500–544', doi: '10.1113/jphysiol.1952.sp004764', licence: 'proprietary-cited-only' },
};
