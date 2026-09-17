import type { KnowledgeRecord, RecordFields, Citation } from './schema';

/**
 * Development seed records. Status is deliberately `in_review`: nothing here is published
 * until a credentialed reviewer approves it in the workflow (Phase E §5). Every non-empty
 * field carries a citation; fields without a clean source are left empty on purpose.
 */
const OS = (locator: string, quote?: string): Citation => ({ sourceId: 'openstax_ap2e', locator, quote });
const MOORE = (locator: string): Citation => ({ sourceId: 'moore_coa8', locator });
const GRAY = (locator: string): Citation => ({ sourceId: 'gray42', locator });
const LANG = (locator: string): Citation => ({ sourceId: 'langman14', locator });
const GUY = (locator: string): Citation => ({ sourceId: 'guyton14', locator });
const ROB = (locator: string): Citation => ({ sourceId: 'robbins10', locator });
const JUNQ = (locator: string): Citation => ({ sourceId: 'junqueira16', locator });

const empty = <T,>(value: T) => ({ value, citations: [] as Citation[] });
const f = <T,>(value: T, citations: Citation[], modes?: Record<string, T>) => ({ value, citations, modes: modes as never });

function base(name: string, latin: string, category: RecordFields['category']['value'], cites: Citation[]): Pick<RecordFields, 'name' | 'latinName' | 'category' | 'alternativeNames'> {
  return { name: f(name, cites), latinName: f(latin, cites), category: f(category, cites), alternativeNames: empty([] as string[]) };
}

const heart: RecordFields = {
  ...base('Heart', 'Cor', 'organ', [OS('Ch. 19.1 Heart Anatomy')]),
  alternativeNames: f(['cor'], [OS('Ch. 19.1 Heart Anatomy')]),
  description: f(
    'A muscular, four-chambered organ lying in the mediastinum between the lungs, roughly the size of a fist, with its apex directed inferiorly and to the left.',
    [OS('Ch. 19.1 Heart Anatomy — Location of the Heart')],
    { school: 'The heart is a muscular pump about the size of your fist, in the middle of the chest, tilted slightly to the left.' },
  ),
  function: f('Pumps blood through two circuits in series: the pulmonary circuit (right heart to lungs) and the systemic circuit (left heart to the body).', [OS('Ch. 19.1 Heart Anatomy — Shape and Size; Chambers and Circulation')]),
  relations: f({
    anterior: [{ text: 'Sternum and costal cartilages' }],
    posterior: [{ text: 'Oesophagus' }, { text: 'Descending thoracic aorta' }],
    superior: [{ text: 'Great vessels' }],
    inferior: [{ text: 'Diaphragm' }],
    medial: [], lateral: [{ text: 'Lungs (in their pleural cavities)' }], contents: [], boundaries: [],
  }, [MOORE('Ch. 4 Thorax — Heart and great vessels'), OS('Ch. 19.1 Heart Anatomy — Location of the Heart')]),
  bloodSupply: f([{ structureId: 'aorta', text: 'Right and left coronary arteries, arising from the ascending aorta' }], [OS('Ch. 19.1 Heart Anatomy — Coronary Arteries')]),
  venousDrainage: f([{ text: 'Coronary sinus (great, middle and small cardiac veins) into the right atrium' }], [OS('Ch. 19.1 Heart Anatomy — Coronary Veins')]),
  lymphaticDrainage: f([{ text: 'Brachiocephalic and tracheobronchial nodes' }], [MOORE('Ch. 4 Thorax — Heart')]),
  innervation: f([
    { nerveRef: { text: 'Cardiac plexus — sympathetic fibres (cardioaccelerator)' }, fibreType: 'sympathetic' },
    { nerveRef: { text: 'Vagus nerve (CN X) — parasympathetic fibres (cardioinhibitory)' }, fibreType: 'parasympathetic' },
  ], [OS('Ch. 19.4 Cardiac Physiology — Autonomic Innervation')]),
  histology: f({ text: 'Wall of three layers: epicardium, myocardium and endocardium. Cardiac muscle cells are branched, striated and joined by intercalated discs containing gap junctions.', slideIds: [] }, [OS('Ch. 19.1 Heart Anatomy — Layers of the Heart; Cardiac Muscle Tissue'), JUNQ('Ch. 10 Muscle Tissue — Cardiac muscle')]),
  embryology: f({ text: 'Develops from mesoderm as a primitive heart tube; the tube begins to beat around the end of the third week and folds and septates to form the four chambers.', stageIds: [], germLayer: 'mesoderm' }, [OS('Ch. 19.5 Development of the Heart'), LANG('Ch. 13 Cardiovascular System')]),
  physiology: f({ text: 'Each cardiac cycle comprises atrial and ventricular systole and diastole. Cardiac output equals heart rate multiplied by stroke volume, approximately 5 L/min at rest.', simulationIds: ['cardiac-cycle'] }, [OS('Ch. 19.3 Cardiac Cycle; Ch. 19.4 Cardiac Physiology — Cardiac Output'), GUY('Ch. 9 Cardiac Muscle; The Heart as a Pump')]),
  clinicalSignificance: f([
    { title: 'Myocardial infarction', text: 'Occlusion of a coronary artery deprives a region of myocardium of oxygen, causing cell death.', competencyCodes: ['AN21.9'] },
    { title: 'Pericarditis', text: 'Inflammation of the pericardium; may produce friction rub and effusion.', competencyCodes: [] },
  ], [OS('Ch. 19.1 Heart Anatomy — Disorders of the Heart: Myocardial Infarction; Cardiac Tamponade')]),
  surgicalRelevance: f([{ title: 'Coronary artery bypass', text: 'Grafts bypass stenosed coronary segments; knowledge of coronary distribution guides graft placement.', competencyCodes: [] }], [MOORE('Ch. 4 Thorax — Clinical box: Coronary artery bypass graft')]),
  commonDiseases: f([
    { name: 'Coronary artery disease', text: 'Atherosclerotic narrowing of the coronary arteries.' },
    { name: 'Heart failure', text: 'Inability of the heart to pump sufficient blood to meet metabolic demand.' },
  ], [ROB('Ch. 12 The Heart'), OS('Ch. 19.1 Heart Anatomy — Disorders of the Heart')]),
  radiologicalCorrelation: f([{ modality: 'xray', text: 'On a postero-anterior chest radiograph the cardiac silhouette is assessed against the thoracic width (cardiothoracic ratio).' }], [GRAY('Ch. 57 Heart and great vessels — Imaging')]),
  examinationPearls: f([
    { text: 'Apex beat is normally palpable in the left fifth intercostal space in the midclavicular line.', examType: 'osce' },
    { text: 'Be ready to name the coronary arteries and their major branches on a specimen.', examType: 'spotter' },
  ], [MOORE('Ch. 4 Thorax — Surface anatomy of the heart')]),
  references: f([OS('Ch. 19'), MOORE('Ch. 4'), GUY('Ch. 9')], []),
};

const liver: RecordFields = {
  ...base('Liver', 'Hepar', 'organ', [OS('Ch. 23.6 Accessory Organs in Digestion: The Liver, Pancreas, and Gallbladder')]),
  alternativeNames: f(['hepar'], [OS('Ch. 23.6 Accessory Organs — The Liver')]),
  description: f('The largest gland in the body, lying in the right upper quadrant of the abdomen immediately below the diaphragm; divided into right and left lobes with smaller caudate and quadrate lobes.', [OS('Ch. 23.6 Accessory Organs — The Liver')]),
  function: f('Produces bile; metabolises carbohydrates, lipids and proteins; detoxifies blood; stores glycogen and vitamins; synthesises plasma proteins.', [OS('Ch. 23.6 Accessory Organs — The Liver: Bile; Other Functions')]),
  relations: f({ anterior: [{ text: 'Diaphragm and anterior abdominal wall' }], posterior: [{ text: 'Inferior vena cava, right kidney and suprarenal gland (bare area)' }], superior: [{ text: 'Diaphragm' }], inferior: [{ text: 'Stomach, duodenum, gallbladder, hepatic flexure of colon' }], medial: [], lateral: [], contents: [], boundaries: [] }, [MOORE('Ch. 5 Abdomen — Liver: surfaces and relations')]),
  bloodSupply: f([{ text: 'Hepatic artery proper (oxygenated blood)' }, { text: 'Hepatic portal vein (nutrient-rich blood from the gut)' }], [OS('Ch. 23.6 Accessory Organs — The Liver: Histology')]),
  venousDrainage: f([{ structureId: 'inferior-vena-cava', text: 'Hepatic veins into the inferior vena cava' }], [OS('Ch. 23.6 Accessory Organs — The Liver')]),
  lymphaticDrainage: f([{ text: 'Hepatic nodes along the hepatic artery, then coeliac nodes' }], [MOORE('Ch. 5 Abdomen — Liver: lymphatic drainage')]),
  innervation: f([{ nerveRef: { text: 'Hepatic plexus (sympathetic from the coeliac plexus; parasympathetic from the vagus)' } }], [MOORE('Ch. 5 Abdomen — Liver: innervation')]),
  histology: f({ text: 'Organised into hexagonal lobules of hepatocyte plates around a central vein, with portal triads (branch of hepatic artery, portal vein and bile duct) at the corners and sinusoids between plates.', slideIds: [] }, [OS('Ch. 23.6 Accessory Organs — The Liver: Histology'), JUNQ('Ch. 16 Organs Associated with the Digestive Tract — Liver')]),
  embryology: f({ text: 'Arises as an endodermal outgrowth (hepatic diverticulum) of the foregut into the septum transversum.', stageIds: [], germLayer: 'endoderm' }, [LANG('Ch. 15 Digestive System — Liver and gallbladder')]),
  physiology: f({ text: 'Bile secreted by hepatocytes emulsifies dietary fat; the liver maintains blood glucose by glycogenesis, glycogenolysis and gluconeogenesis.', simulationIds: [] }, [OS('Ch. 23.6 Accessory Organs — The Liver'), GUY('Ch. 71 The Liver as an Organ')]),
  clinicalSignificance: f([{ title: 'Cirrhosis', text: 'Diffuse fibrosis and regenerative nodules replace normal architecture, causing portal hypertension and hepatic failure.', competencyCodes: [] }], [ROB('Ch. 18 Liver and Gallbladder — Cirrhosis')]),
  surgicalRelevance: f([{ title: 'Segmental anatomy', text: 'Functional (Couinaud) segments, each with its own portal pedicle and drained by hepatic veins, permit segmental resection.', competencyCodes: [] }], [MOORE('Ch. 5 Abdomen — Liver: hepatic segments')]),
  commonDiseases: f([{ name: 'Viral hepatitis', text: 'Inflammation of the liver most commonly caused by hepatitis viruses.' }, { name: 'Cirrhosis', text: 'End stage of chronic liver disease.', pathologyPairId: 'liver-cirrhosis' }], [ROB('Ch. 18 Liver and Gallbladder')]),
  radiologicalCorrelation: f([{ modality: 'ultrasound', text: 'Ultrasound is the first-line imaging modality for liver parenchyma and biliary dilatation.' }, { modality: 'ct', text: 'On axial CT the liver occupies the right upper abdomen, with the portal vein and hepatic veins enhancing after contrast.' }], [GRAY('Ch. 65 Liver — Imaging')]),
  examinationPearls: f([{ text: 'Percuss the upper border of liver dullness in the right midclavicular line; a normal liver edge may be palpable on deep inspiration.', examType: 'osce' }], [MOORE('Ch. 5 Abdomen — Surface anatomy of the liver')]),
  references: f([OS('Ch. 23.6'), MOORE('Ch. 5'), ROB('Ch. 18')], []),
};

const femur: RecordFields = {
  ...base('Femur', 'Femur', 'bone', [OS('Ch. 8.4 Bones of the Lower Limb — Femur')]),
  alternativeNames: f(['thigh bone'], [OS('Ch. 8.4 Bones of the Lower Limb — Femur')]),
  description: f('The single bone of the thigh and the longest and strongest bone of the body. Its rounded head articulates with the acetabulum; the neck joins the shaft near the greater and lesser trochanters; distally the medial and lateral condyles articulate with the tibia.', [OS('Ch. 8.4 Bones of the Lower Limb — Femur')]),
  function: f('Transmits body weight from the hip to the knee and provides attachment for the muscles of the hip and thigh.', [OS('Ch. 8.4 Bones of the Lower Limb — Femur')]),
  relations: f({ anterior: [{ text: 'Quadriceps femoris' }], posterior: [{ text: 'Hamstrings; adductor magnus (linea aspera)' }], superior: [{ text: 'Hip joint (acetabulum)' }], inferior: [{ text: 'Knee joint (tibia, patella)' }], medial: [], lateral: [], contents: [], boundaries: [] }, [MOORE('Ch. 7 Lower Limb — Femur; Muscles of the thigh')]),
  bloodSupply: f([{ text: 'Head and neck: retinacular branches of the medial and lateral circumflex femoral arteries' }, { text: 'Shaft: nutrient branches of the perforating branches of the profunda femoris artery' }], [MOORE('Ch. 7 Lower Limb — Blood supply of the femur')]),
  venousDrainage: empty([]),
  lymphaticDrainage: empty([]),
  innervation: empty([]),
  histology: f({ text: 'Long bone: compact bone forming the shaft around a medullary cavity, with spongy (cancellous) bone in the epiphyses.', slideIds: [] }, [OS('Ch. 6.3 Bone Structure — Gross Anatomy of Bone')]),
  embryology: f({ text: 'Forms by endochondral ossification from a cartilage model; the primary centre appears in the shaft in the embryonic period and the distal epiphyseal centre is present at birth.', stageIds: [], germLayer: 'mesoderm' }, [GRAY('Ch. 80 Pelvic girdle, gluteal region and thigh — Femur: ossification'), OS('Ch. 6.4 Bone Formation and Development — Endochondral Ossification')]),
  physiology: empty({ text: '', simulationIds: [] }),
  clinicalSignificance: f([{ title: 'Fracture of the femoral neck', text: 'Common in older adults with osteoporosis; retinacular vessels may be torn, risking avascular necrosis of the head.', competencyCodes: ['AN15.5'] }], [MOORE('Ch. 7 Lower Limb — Clinical box: Fractures of the femoral neck')]),
  surgicalRelevance: f([{ title: 'Hip arthroplasty', text: 'Replacement of the femoral head and acetabulum; approach must respect the neurovascular structures of the gluteal region.', competencyCodes: [] }], [MOORE('Ch. 7 Lower Limb — Clinical box: Hip replacement')]),
  commonDiseases: f([{ name: 'Osteoporosis', text: 'Reduced bone mass predisposing to fragility fractures, notably of the femoral neck.' }], [OS('Ch. 6.6 Exercise, Nutrition, Hormones, and Bone Tissue — Osteoporosis')]),
  radiologicalCorrelation: f([{ modality: 'xray', text: 'An antero-posterior pelvis radiograph shows the femoral head, neck and trochanters; disruption of the trabecular pattern and cortical lines suggests fracture.' }], [GRAY('Ch. 80 — Imaging of the hip')]),
  examinationPearls: f([{ text: 'Identify head, neck, greater and lesser trochanters, linea aspera and condyles; state the side.', examType: 'spotter' }], [OS('Ch. 8.4 Bones of the Lower Limb — Femur')]),
  references: f([OS('Ch. 8.4'), MOORE('Ch. 7')], []),
};

const bicepsBrachii: RecordFields = {
  ...base('Biceps brachii', 'Musculus biceps brachii', 'muscle', [OS('Ch. 11.5 Muscles of the Pectoral Girdle and Upper Limbs — Muscles That Move the Forearm')]),
  alternativeNames: f(['biceps'], [OS('Ch. 11.5 Muscles That Move the Forearm')]),
  description: f('A two-headed muscle of the anterior compartment of the arm. The long head arises from the supraglenoid tubercle of the scapula and the short head from the coracoid process; the muscle inserts on the radial tuberosity and, via the bicipital aponeurosis, into deep fascia of the forearm.', [OS('Ch. 11.5 Muscles That Move the Forearm'), MOORE('Ch. 3 Upper Limb — Muscles of the arm: Biceps brachii')]),
  function: f('Supinates the forearm and flexes the elbow; the long head also assists shoulder flexion.', [OS('Ch. 11.5 Muscles That Move the Forearm')]),
  relations: f({ anterior: [{ text: 'Deep fascia and skin of the arm' }], posterior: [{ text: 'Brachialis and coracobrachialis' }], superior: [], inferior: [{ text: 'Cubital fossa (tendon is its central landmark)' }], medial: [{ text: 'Brachial artery and median nerve' }], lateral: [], contents: [], boundaries: [] }, [MOORE('Ch. 3 Upper Limb — Cubital fossa')]),
  bloodSupply: f([{ text: 'Muscular branches of the brachial artery' }], [MOORE('Ch. 3 Upper Limb — Biceps brachii')]),
  venousDrainage: empty([]),
  lymphaticDrainage: empty([]),
  innervation: f([{ nerveRef: { text: 'Musculocutaneous nerve' }, rootValue: 'C5, C6' }], [MOORE('Ch. 3 Upper Limb — Biceps brachii'), OS('Ch. 11.5 Muscles That Move the Forearm')]),
  histology: f({ text: 'Skeletal muscle: multinucleated striated fibres arranged in fascicles.', slideIds: [] }, [OS('Ch. 10.2 Skeletal Muscle')]),
  embryology: f({ text: 'Limb musculature derives from somitic (paraxial) mesoderm that migrates into the limb bud.', stageIds: [], germLayer: 'mesoderm' }, [LANG('Ch. 12 Limbs — Limb musculature')]),
  physiology: empty({ text: '', simulationIds: [] }),
  clinicalSignificance: f([{ title: 'Rupture of the long head tendon', text: 'Produces a bulge in the distal arm on flexion (the "Popeye" deformity).', competencyCodes: [] }], [MOORE('Ch. 3 Upper Limb — Clinical box: Rupture of tendon of long head of biceps')]),
  surgicalRelevance: empty([]),
  commonDiseases: f([{ name: 'Biceps tendinopathy', text: 'Overuse inflammation of the long head tendon in the bicipital groove.' }], [MOORE('Ch. 3 Upper Limb — Clinical box: Bicipital tendinitis')]),
  radiologicalCorrelation: empty([]),
  examinationPearls: f([{ text: 'The biceps reflex tests spinal segments C5 and C6.', examType: 'osce' }, { text: 'Name origin, insertion, nerve supply and actions; identify the bicipital aponeurosis.', examType: 'viva' }], [MOORE('Ch. 3 Upper Limb — Clinical box: Biceps reflex')]),
  references: f([OS('Ch. 11.5'), MOORE('Ch. 3')], []),
};

const medianNerve: RecordFields = {
  ...base('Median nerve', 'Nervus medianus', 'nerve', [MOORE('Ch. 3 Upper Limb — Median nerve')]),
  alternativeNames: empty([]),
  description: f('A terminal branch of the brachial plexus formed by contributions from the lateral and medial cords (C5–T1). It descends with the brachial artery, passes through the cubital fossa, runs between the two heads of pronator teres and enters the hand deep to the flexor retinaculum through the carpal tunnel.', [MOORE('Ch. 3 Upper Limb — Median nerve'), OS('Ch. 13.4 The Peripheral Nervous System — Brachial plexus')]),
  function: f('Motor to most flexor muscles of the forearm (except flexor carpi ulnaris and the medial half of flexor digitorum profundus), the thenar muscles and the lateral two lumbricals; sensory to the palmar surface of the lateral three and a half digits.', [MOORE('Ch. 3 Upper Limb — Median nerve: distribution')]),
  relations: f({ anterior: [{ text: 'Flexor retinaculum (at the wrist)' }], posterior: [{ text: 'Flexor digitorum profundus tendons (in the carpal tunnel)' }], superior: [], inferior: [], medial: [{ text: 'Brachial artery in the upper arm (nerve crosses anterior to the artery to lie medial to it in the cubital fossa)' }], lateral: [], contents: [], boundaries: [] }, [MOORE('Ch. 3 Upper Limb — Cubital fossa; Carpal tunnel')]),
  bloodSupply: empty([]),
  venousDrainage: empty([]),
  lymphaticDrainage: empty([]),
  innervation: empty([]),
  histology: f({ text: 'Peripheral nerve: fascicles of myelinated and unmyelinated axons ensheathed by endoneurium, perineurium and epineurium.', slideIds: [] }, [OS('Ch. 13.4 The Peripheral Nervous System — Nerves'), JUNQ('Ch. 9 Nerve Tissue — Peripheral nerves')]),
  embryology: f({ text: 'Spinal nerve fibres grow into the developing limb bud and form the plexus and its terminal branches.', stageIds: [], germLayer: 'ectoderm (neural)' }, [LANG('Ch. 12 Limbs — Innervation of the limbs')]),
  physiology: empty({ text: '', simulationIds: [] }),
  clinicalSignificance: f([{ title: 'Carpal tunnel syndrome', text: 'Compression of the median nerve beneath the flexor retinaculum causes paraesthesia in the lateral digits and, later, thenar wasting.', competencyCodes: ['AN12.5'] }], [MOORE('Ch. 3 Upper Limb — Clinical box: Carpal tunnel syndrome')]),
  surgicalRelevance: f([{ title: 'Carpal tunnel release', text: 'Division of the flexor retinaculum decompresses the nerve; the recurrent motor branch must be protected.', competencyCodes: [] }], [MOORE('Ch. 3 Upper Limb — Clinical box: Carpal tunnel syndrome')]),
  commonDiseases: f([{ name: 'Carpal tunnel syndrome', text: 'The most common entrapment neuropathy of the upper limb.' }], [MOORE('Ch. 3 Upper Limb — Clinical box: Carpal tunnel syndrome')]),
  radiologicalCorrelation: f([{ modality: 'ultrasound', text: 'High-resolution ultrasound demonstrates the nerve in the carpal tunnel and can show swelling proximal to a compression.' }, { modality: 'mri', text: 'On axial MRI at the wrist the nerve lies immediately deep to the flexor retinaculum, superficial to the flexor tendons.' }], [GRAY('Ch. 50 Wrist and hand — Imaging')]),
  examinationPearls: f([{ text: 'Test thenar abduction (abductor pollicis brevis) and sensation over the palmar index finger.', examType: 'osce' }], [MOORE('Ch. 3 Upper Limb — Clinical box: Median nerve injury')]),
  references: f([MOORE('Ch. 3'), OS('Ch. 13.4')], []),
};

const kidney: RecordFields = {
  ...base('Kidney', 'Ren', 'organ', [OS('Ch. 25.3 Gross Anatomy of the Kidney')]),
  alternativeNames: f(['ren'], [OS('Ch. 25.3 Gross Anatomy of the Kidney')]),
  description: f('Paired, bean-shaped retroperitoneal organs lying on the posterior abdominal wall either side of the vertebral column, extending approximately from T12 to L3; the right kidney lies slightly lower than the left because of the liver.', [OS('Ch. 25.3 Gross Anatomy of the Kidney — External Anatomy')]),
  function: f('Filters blood to form urine, regulating water, electrolyte and acid–base balance, excreting metabolic waste, and secreting renin and erythropoietin.', [OS('Ch. 25.1 Physical Characteristics of Urine; Ch. 25.9 Regulation of Fluid Volume and Composition')]),
  relations: f({ anterior: [{ text: 'Right: liver, duodenum, hepatic flexure. Left: stomach, spleen, pancreas, jejunum, splenic flexure' }], posterior: [{ text: 'Diaphragm, psoas major, quadratus lumborum, 12th rib' }], superior: [{ text: 'Suprarenal gland' }], inferior: [], medial: [{ text: 'Hilum: renal vein, renal artery, renal pelvis (anterior to posterior)' }], lateral: [], contents: [], boundaries: [] }, [MOORE('Ch. 5 Abdomen — Kidneys: relations')]),
  bloodSupply: f([{ structureId: 'aorta', text: 'Renal arteries from the abdominal aorta' }], [OS('Ch. 25.3 Gross Anatomy of the Kidney — Blood Flow in the Kidney')]),
  venousDrainage: f([{ structureId: 'inferior-vena-cava', text: 'Renal veins into the inferior vena cava; the left renal vein is longer and crosses anterior to the aorta' }], [OS('Ch. 25.3 Gross Anatomy of the Kidney — Blood Flow in the Kidney'), MOORE('Ch. 5 Abdomen — Renal vessels')]),
  lymphaticDrainage: f([{ text: 'Lumbar (aortic) lymph nodes' }], [MOORE('Ch. 5 Abdomen — Kidneys: lymphatic drainage')]),
  innervation: f([{ nerveRef: { text: 'Renal plexus (sympathetic, from lower thoracic and upper lumbar splanchnic nerves)' }, fibreType: 'sympathetic' }], [MOORE('Ch. 5 Abdomen — Kidneys: innervation'), OS('Ch. 25.3 Gross Anatomy of the Kidney — Nerves')]),
  histology: f({ text: 'Outer cortex and inner medulla. Each kidney contains on the order of a million nephrons: a renal corpuscle (glomerulus in Bowman’s capsule), proximal convoluted tubule, loop of Henle, distal convoluted tubule and collecting duct.', slideIds: [] }, [OS('Ch. 25.3 Gross Anatomy of the Kidney — Internal Anatomy; Ch. 25.4 Microscopic Anatomy of the Kidney'), JUNQ('Ch. 19 The Urinary System')]),
  embryology: f({ text: 'Three successive kidney systems arise from intermediate mesoderm: pronephros, mesonephros and metanephros; the metanephros forms the definitive kidney, with the ureteric bud giving rise to the collecting system.', stageIds: [], germLayer: 'mesoderm (intermediate)' }, [LANG('Ch. 16 Urogenital System — Kidney systems')]),
  physiology: f({ text: 'Glomerular filtration, tubular reabsorption and tubular secretion produce urine; the countercurrent mechanism of the loop of Henle concentrates urine.', simulationIds: [] }, [OS('Ch. 25.5 Physiology of Urine Formation'), GUY('Ch. 26–29 The Kidneys and Body Fluids')]),
  clinicalSignificance: f([{ title: 'Renal calculi', text: 'Stones may obstruct the ureter at its narrow points, causing severe colicky loin-to-groin pain.', competencyCodes: [] }], [MOORE('Ch. 5 Abdomen — Clinical box: Renal and ureteric calculi'), OS('Ch. 25.2 Gross Anatomy of Urine Transport — Ureters')]),
  surgicalRelevance: f([{ title: 'Renal transplantation', text: 'The donor kidney is placed in the iliac fossa with its vessels anastomosed to the external iliac vessels.', competencyCodes: [] }], [MOORE('Ch. 5 Abdomen — Clinical box: Renal transplantation')]),
  commonDiseases: f([{ name: 'Chronic kidney disease', text: 'Progressive loss of nephrons and glomerular filtration.' }, { name: 'Glomerulonephritis', text: 'Immune-mediated inflammation of glomeruli.' }], [ROB('Ch. 20 The Kidney')]),
  radiologicalCorrelation: f([{ modality: 'ultrasound', text: 'Ultrasound shows the cortex, medullary pyramids and the echogenic renal sinus; it is first-line for hydronephrosis.' }, { modality: 'ct', text: 'On axial CT the kidneys lie in the perirenal fat lateral to the psoas muscles; unenhanced CT is the test of choice for calculi.' }], [GRAY('Ch. 74 Kidney and ureter — Imaging')]),
  examinationPearls: f([{ text: 'Identify hilum structures in order (vein, artery, pelvis) and state the side from the position of the hilum and the shape of the borders.', examType: 'spotter' }], [MOORE('Ch. 5 Abdomen — Kidneys')]),
  references: f([OS('Ch. 25'), MOORE('Ch. 5'), GUY('Ch. 26')], []),
};

const rec = (structureId: string, fields: RecordFields, changeSummary?: string): KnowledgeRecord => ({ structureId, version: 1, status: 'in_review', fields, authorId: 'seed', reviewerIds: [], changeSummary });

export const SEED_RECORDS: KnowledgeRecord[] = [
  rec('heart', heart, 'Initial seed from OpenStax A&P 2e with textbook citations'),
  rec('liver', liver),
  rec('femur-r', femur),
  rec('femur-l', femur),
  rec('biceps-brachii-r', bicepsBrachii),
  rec('biceps-brachii-l', bicepsBrachii),
  rec('median-nerve-r', medianNerve),
  rec('median-nerve-l', medianNerve),
  rec('kidney-r', kidney),
  rec('kidney-l', kidney),
];

export function findSeedRecord(structureId: string): KnowledgeRecord | undefined {
  return SEED_RECORDS.find((r) => r.structureId === structureId);
}
