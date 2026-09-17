import type { BodyId, BodyManifest, ManifestStructure } from './types';

/**
 * Procedural development body. Real bodies come from content/manifests/*.json produced by
 * the asset pipeline (Z-Anatomy / HRA, see docs/phase-a/05-licensing-audit.md). This file
 * lets the engine, tests and CI run with zero downloaded assets. Coordinates are metres,
 * Y up, origin at the pelvis; anatomical left is +X when viewed from the front (i.e. the
 * model faces +Z).
 */
const L = 0.09; // lateral offset for paired structures

const common: ManifestStructure[] = [
  s('skull', 'Skull', ['skeletal'], [0, 0.72, 0], { kind: 'sphere', radius: 0.1, scale: [1, 1.15, 1.1] }, { fmaId: 'FMA:46565', latinName: 'Cranium', region: 'head', aliases: ['cranium'] }),
  s('vertebral-column', 'Vertebral column', ['skeletal'], [0, 0.28, -0.05], { kind: 'capsule', radius: 0.03, length: 0.62 }, { fmaId: 'FMA:13478', latinName: 'Columna vertebralis', region: 'back', aliases: ['spine', 'backbone'] }),
  s('rib-cage', 'Rib cage', ['skeletal'], [0, 0.42, 0], { kind: 'sphere', radius: 0.17, scale: [1, 1.2, 0.75] }, { fmaId: 'FMA:7480', latinName: 'Cavea thoracis', region: 'thorax', aliases: ['thoracic cage'] }),
  s('pelvis', 'Pelvis', ['skeletal'], [0, 0.02, 0], { kind: 'sphere', radius: 0.15, scale: [1.1, 0.7, 0.8] }, { fmaId: 'FMA:9578', latinName: 'Pelvis', region: 'pelvis', aliases: ['bony pelvis'] }),
  ...pair('humerus', 'Humerus', ['skeletal'], [0.24, 0.35, 0], { kind: 'capsule', radius: 0.02, length: 0.3 }, { fmaId: 'FMA:9611', latinName: 'Humerus', region: 'upper-limb' }),
  ...pair('radius-ulna', 'Radius and ulna', ['skeletal'], [0.26, 0.05, 0.02], { kind: 'capsule', radius: 0.018, length: 0.27 }, { region: 'upper-limb', aliases: ['forearm bones'] }),
  ...pair('femur', 'Femur', ['skeletal'], [0.1, -0.28, 0], { kind: 'capsule', radius: 0.028, length: 0.42 }, { fmaId: 'FMA:9611', latinName: 'Femur', region: 'lower-limb', aliases: ['thigh bone'] }),
  ...pair('tibia-fibula', 'Tibia and fibula', ['skeletal'], [0.1, -0.72, 0], { kind: 'capsule', radius: 0.022, length: 0.4 }, { region: 'lower-limb', aliases: ['leg bones', 'shin bone'] }),

  ...pair('deltoid', 'Deltoid', ['muscular'], [0.2, 0.5, 0], { kind: 'sphere', radius: 0.065, scale: [1, 1.2, 1] }, { fmaId: 'FMA:32521', latinName: 'Musculus deltoideus', region: 'upper-limb' }),
  ...pair('biceps-brachii', 'Biceps brachii', ['muscular'], [0.24, 0.35, 0.04], { kind: 'capsule', radius: 0.03, length: 0.22 }, { fmaId: 'FMA:37670', latinName: 'Musculus biceps brachii', region: 'upper-limb', aliases: ['biceps'] }),
  ...pair('pectoralis-major', 'Pectoralis major', ['muscular'], [0.09, 0.45, 0.14], { kind: 'box', size: [0.16, 0.14, 0.03] }, { fmaId: 'FMA:9627', latinName: 'Musculus pectoralis major', region: 'thorax', aliases: ['pecs'] }),
  s('rectus-abdominis', 'Rectus abdominis', ['muscular'], [0, 0.2, 0.13], { kind: 'box', size: [0.14, 0.3, 0.025] }, { fmaId: 'FMA:9628', latinName: 'Musculus rectus abdominis', region: 'abdomen', aliases: ['abs'] }),
  ...pair('quadriceps-femoris', 'Quadriceps femoris', ['muscular'], [0.1, -0.28, 0.05], { kind: 'capsule', radius: 0.05, length: 0.34 }, { fmaId: 'FMA:22428', latinName: 'Musculus quadriceps femoris', region: 'lower-limb', aliases: ['quads'] }),
  ...pair('gastrocnemius', 'Gastrocnemius', ['muscular'], [0.1, -0.68, -0.05], { kind: 'capsule', radius: 0.04, length: 0.28 }, { fmaId: 'FMA:22541', latinName: 'Musculus gastrocnemius', region: 'lower-limb', aliases: ['calf muscle'] }),

  s('brain', 'Brain', ['nervous'], [0, 0.74, 0], { kind: 'sphere', radius: 0.085, scale: [1, 0.9, 1.1] }, { fmaId: 'FMA:50801', latinName: 'Encephalon', region: 'head', aliases: ['encephalon'] }),
  s('spinal-cord', 'Spinal cord', ['nervous'], [0, 0.3, -0.05], { kind: 'capsule', radius: 0.008, length: 0.55 }, { fmaId: 'FMA:7647', latinName: 'Medulla spinalis', region: 'back' }),
  ...pair('median-nerve', 'Median nerve', ['nervous'], [0.25, 0.2, 0.03], { kind: 'capsule', radius: 0.004, length: 0.55 }, { fmaId: 'FMA:14385', latinName: 'Nervus medianus', region: 'upper-limb' }),
  ...pair('sciatic-nerve', 'Sciatic nerve', ['nervous'], [0.1, -0.3, -0.04], { kind: 'capsule', radius: 0.006, length: 0.5 }, { fmaId: 'FMA:19034', latinName: 'Nervus ischiadicus', region: 'lower-limb' }),

  s('heart', 'Heart', ['cardiovascular'], [0.03, 0.38, 0.05], { kind: 'sphere', radius: 0.065, scale: [0.9, 1.1, 0.9] }, { fmaId: 'FMA:7088', latinName: 'Cor', region: 'thorax', aliases: ['cor'] }),
  s('aorta', 'Aorta', ['cardiovascular'], [0, 0.3, 0], { kind: 'tube', radius: 0.013, points: [[0.03, 0.42, 0.05], [0, 0.5, 0.02], [-0.02, 0.45, -0.03], [-0.02, 0.2, -0.03], [0, 0.0, -0.02]] }, { fmaId: 'FMA:3734', latinName: 'Aorta', region: 'thorax' }),
  s('inferior-vena-cava', 'Inferior vena cava', ['cardiovascular'], [0.03, 0.15, -0.02], { kind: 'capsule', radius: 0.012, length: 0.3 }, { fmaId: 'FMA:10951', latinName: 'Vena cava inferior', region: 'abdomen', aliases: ['IVC'] }),

  s('trachea', 'Trachea', ['respiratory'], [0, 0.58, 0.02], { kind: 'capsule', radius: 0.012, length: 0.12 }, { fmaId: 'FMA:7394', latinName: 'Trachea', region: 'neck', aliases: ['windpipe'] }),
  ...pair('lung', 'Lung', ['respiratory'], [0.11, 0.42, 0], { kind: 'sphere', radius: 0.085, scale: [0.8, 1.4, 0.9] }, { fmaId: 'FMA:7195', latinName: 'Pulmo', region: 'thorax' }),

  s('liver', 'Liver', ['digestive'], [-0.07, 0.24, 0.04], { kind: 'sphere', radius: 0.1, scale: [1.3, 0.7, 0.9] }, { fmaId: 'FMA:7197', latinName: 'Hepar', region: 'abdomen', aliases: ['hepar'] }),
  s('stomach', 'Stomach', ['digestive'], [0.07, 0.24, 0.05], { kind: 'sphere', radius: 0.07, scale: [1, 1.2, 0.8] }, { fmaId: 'FMA:7148', latinName: 'Gaster', region: 'abdomen', aliases: ['gaster'] }),
  s('small-intestine', 'Small intestine', ['digestive'], [0, 0.08, 0.06], { kind: 'sphere', radius: 0.11, scale: [1, 0.8, 0.7] }, { fmaId: 'FMA:7200', latinName: 'Intestinum tenue', region: 'abdomen' }),
  s('large-intestine', 'Large intestine', ['digestive'], [0, 0.1, 0.03], { kind: 'tube', radius: 0.022, points: [[0.13, -0.02, 0.04], [0.13, 0.18, 0.02], [-0.13, 0.2, 0.02], [-0.13, -0.02, 0.04], [-0.02, -0.06, 0.02]] }, { fmaId: 'FMA:7201', latinName: 'Intestinum crassum', region: 'abdomen', aliases: ['colon'] }),
  s('pancreas', 'Pancreas', ['digestive', 'endocrine'], [0.02, 0.18, -0.02], { kind: 'capsule', radius: 0.02, length: 0.12, rotation: [0, 0, 1.4] }, { fmaId: 'FMA:7198', latinName: 'Pancreas', region: 'abdomen' }),

  ...pair('kidney', 'Kidney', ['urinary'], [0.07, 0.14, -0.08], { kind: 'sphere', radius: 0.045, scale: [0.7, 1.3, 0.6] }, { fmaId: 'FMA:7203', latinName: 'Ren', region: 'abdomen', aliases: ['ren'] }),
  s('urinary-bladder', 'Urinary bladder', ['urinary'], [0, -0.03, 0.07], { kind: 'sphere', radius: 0.045 }, { fmaId: 'FMA:15900', latinName: 'Vesica urinaria', region: 'pelvis', aliases: ['bladder'] }),

  s('thyroid-gland', 'Thyroid gland', ['endocrine'], [0, 0.58, 0.04], { kind: 'sphere', radius: 0.022, scale: [1.6, 0.8, 0.6] }, { fmaId: 'FMA:9603', latinName: 'Glandula thyroidea', region: 'neck', aliases: ['thyroid'] }),
  ...pair('adrenal-gland', 'Adrenal gland', ['endocrine'], [0.07, 0.21, -0.07], { kind: 'sphere', radius: 0.018, scale: [1, 0.7, 0.7] }, { fmaId: 'FMA:9604', latinName: 'Glandula suprarenalis', region: 'abdomen', aliases: ['suprarenal gland'] }),

  s('spleen', 'Spleen', ['lymphatic'], [0.14, 0.24, -0.05], { kind: 'sphere', radius: 0.045, scale: [0.6, 1.2, 1] }, { fmaId: 'FMA:7196', latinName: 'Splen', region: 'abdomen', aliases: ['lien'] }),
  s('thymus', 'Thymus', ['lymphatic', 'endocrine'], [0, 0.48, 0.08], { kind: 'sphere', radius: 0.025, scale: [1, 1.4, 0.6] }, { fmaId: 'FMA:9607', latinName: 'Thymus', region: 'thorax' }),

  s('skin', 'Skin', ['integumentary'], [0, 0.05, 0], { kind: 'capsule', radius: 0.24, length: 1.3 }, { fmaId: 'FMA:7163', latinName: 'Cutis', region: 'whole-body', aliases: ['integument'] }),
  s('thoracolumbar-fascia', 'Thoracolumbar fascia', ['fascial', 'connective'], [0, 0.18, -0.13], { kind: 'box', size: [0.24, 0.3, 0.008] }, { fmaId: 'FMA:76832', latinName: 'Fascia thoracolumbalis', region: 'back' }),
  ...pair('patellar-ligament', 'Patellar ligament', ['connective'], [0.1, -0.5, 0.06], { kind: 'box', size: [0.02, 0.06, 0.008] }, { fmaId: 'FMA:44581', latinName: 'Ligamentum patellae', region: 'lower-limb', aliases: ['patellar tendon'] }),
  s('jugular-notch', 'Jugular notch', ['surface', 'skeletal'], [0, 0.55, 0.12], { kind: 'sphere', radius: 0.012 }, { fmaId: 'FMA:7487', latinName: 'Incisura jugularis', region: 'thorax', aliases: ['suprasternal notch'] }),
  s('umbilicus', 'Umbilicus', ['surface'], [0, 0.12, 0.15], { kind: 'sphere', radius: 0.012 }, { fmaId: 'FMA:61584', latinName: 'Umbilicus', region: 'abdomen', aliases: ['navel'] }),
];

const maleOnly: ManifestStructure[] = [
  s('prostate', 'Prostate', ['reproductive'], [0, -0.09, 0.04], { kind: 'sphere', radius: 0.02 }, { fmaId: 'FMA:9600', latinName: 'Prostata', region: 'pelvis' }),
  ...pair('testis', 'Testis', ['reproductive', 'endocrine'], [0.025, -0.2, 0.08], { kind: 'sphere', radius: 0.02, scale: [0.8, 1.2, 0.8] }, { fmaId: 'FMA:7210', latinName: 'Testis', region: 'pelvis', aliases: ['testicle'] }),
];

const femaleOnly: ManifestStructure[] = [
  s('uterus', 'Uterus', ['reproductive'], [0, -0.04, 0.02], { kind: 'sphere', radius: 0.035, scale: [1, 1.3, 0.7] }, { fmaId: 'FMA:17558', latinName: 'Uterus', region: 'pelvis', aliases: ['womb'] }),
  ...pair('ovary', 'Ovary', ['reproductive', 'endocrine'], [0.06, -0.02, 0.0], { kind: 'sphere', radius: 0.015, scale: [1, 1.4, 0.8] }, { fmaId: 'FMA:7209', latinName: 'Ovarium', region: 'pelvis' }),
  ...pair('mammary-gland', 'Mammary gland', ['integumentary', 'reproductive'], [0.1, 0.44, 0.16], { kind: 'sphere', radius: 0.05, scale: [1, 1, 0.6] }, { fmaId: 'FMA:57987', latinName: 'Glandula mammaria', region: 'thorax', aliases: ['breast'] }),
];

export function demoManifest(body: BodyId): BodyManifest {
  const structures = body === 'male' ? [...common, ...maleOnly] : [...common, ...femaleOnly];
  return {
    body,
    version: 'demo-0.1',
    pack: 'procedural-demo',
    licence: 'MIT',
    attribution: 'Procedural development stand-ins (no anatomical mesh data). Replace via content/manifests.',
    structures,
  };
}

function s(id: string, name: string, systems: ManifestStructure['systems'], centroid: [number, number, number], procedural: NonNullable<ManifestStructure['procedural']>, extra: Partial<ManifestStructure> = {}): ManifestStructure {
  const r = extentOf(procedural);
  return { id, name, systems, centroid, bounds: [centroid[0] - r[0], centroid[1] - r[1], centroid[2] - r[2], centroid[0] + r[0], centroid[1] + r[1], centroid[2] + r[2]], procedural, laterality: 'none', ...extra };
}

function pair(id: string, name: string, systems: ManifestStructure['systems'], rightCentroid: [number, number, number], procedural: NonNullable<ManifestStructure['procedural']>, extra: Partial<ManifestStructure> = {}): ManifestStructure[] {
  const [x, y, z] = rightCentroid;
  // Anatomical right is at −X when the model faces the viewer (+Z).
  const right = s(`${id}-r`, `Right ${name.toLowerCase()}`, systems, [-Math.max(x, L * 0.5), y, z], procedural, { ...extra, laterality: 'right', aliases: [...(extra.aliases ?? []), name] });
  const left = s(`${id}-l`, `Left ${name.toLowerCase()}`, systems, [Math.max(x, L * 0.5), y, z], procedural, { ...extra, laterality: 'left', aliases: [...(extra.aliases ?? []), name] });
  return [right, left];
}

function extentOf(p: NonNullable<ManifestStructure['procedural']>): [number, number, number] {
  switch (p.kind) {
    case 'box': return [p.size[0] / 2, p.size[1] / 2, p.size[2] / 2];
    case 'sphere': { const sc = p.scale ?? [1, 1, 1]; return [p.radius * sc[0], p.radius * sc[1], p.radius * sc[2]]; }
    case 'capsule': return [p.radius, p.length / 2 + p.radius, p.radius];
    case 'tube': {
      const xs = p.points.map((q) => q[0]), ys = p.points.map((q) => q[1]), zs = p.points.map((q) => q[2]);
      return [(Math.max(...xs) - Math.min(...xs)) / 2 + p.radius, (Math.max(...ys) - Math.min(...ys)) / 2 + p.radius, (Math.max(...zs) - Math.min(...zs)) / 2 + p.radius];
    }
  }
}
