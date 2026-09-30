/**
 * Detail pack builder: Z-Anatomy (CC BY-SA 4.0) and the Human Reference Atlas united body
 * (CC BY 4.0) become one manifest per body plus one packed binary per detail group.
 *
 *   npm run assets:build:v2
 *
 * Inputs are the intermediates produced by scripts/assets/extract/* (not committed):
 *   ZREG   registered Z-Anatomy meshes per body   (extract/register.py)
 *   ZIDX   Z-Anatomy index with collection paths  (extract/zanat-export.py)
 *   HRA    HRA united meshes per body             (extract/hra-united-export.mts)
 *
 * Each structure is classified (detail-catalog.ts), merged, decimated to a per-category
 * triangle budget, quantised to 16 bits inside its own bounding box and meshopt-compressed
 * into a slice of its group file (src/engine/packed.ts). Nothing is generated except the five
 * schematic skin shells, which carry provenance `generated`.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { bodyManifest } from '../../src/engine/manifest';
import type { BodyId, ManifestStructure, Provenance, SystemId } from '../../src/engine/types';
import { boundsOf, type RawMesh } from './lod';
import { GROUPS, HRA_VESSEL_ALLOW, baseName, classifyHra, classifyZ, humanizeHra, type Classified, type ZIndexEntry } from './detail-catalog';

const ROOT = process.env.ANATOMY_SOURCES ?? '/workspace/sources';
const ZREG = process.env.ZREG ?? '/workspace/work/registered';
const ZIDX = `${ROOT}/zanat/index.json`;
const PACK = 'anatomy-v2';
const OUT = path.resolve(process.cwd(), 'public/assets', PACK);

const ZLIC = 'CC-BY-SA-4.0' as const;
const HLIC = 'CC-BY-4.0' as const;
const EAR = process.env.EAR_REGISTERED ?? '/workspace/work/ear-registered';

/** [triangle cap, fraction of source triangles] per category. */
const BUDGET: Record<string, [number, number]> = {
  bone: [3500, 0.5], tooth: [300, 0.5], cartilage: [800, 0.5], muscle: [2000, 0.3], tendon: [600, 0.4],
  fascia: [1500, 0.4], bursa: [300, 0.5], 'tendon sheath': [500, 0.4], ligament: [400, 0.5], capsule: [600, 0.5],
  disc: [500, 0.5], membrane: [500, 0.5], artery: [700, 0.2], vein: [700, 0.2], nerve: [600, 0.25], ganglion: [200, 0.5],
  plexus: [600, 0.25], meninges: [800, 0.5], 'lymph node': [150, 0.5], lymphoid: [600, 0.4], hair: [1500, 0.15],
  nail: [300, 0.5], 'inner ear': [1800, 0.3], 'ear canal': [1500, 0.3], 'brain region': [1200, 0.2], 'lung lobe': [6000, 0.6], 'spinal cord segment': [400, 1],
};
const DEFAULT_BUDGET: [number, number] = [1500, 0.3];

interface Piece { positions: Float32Array; indices: Uint32Array }
function readBin(dir: string, i: number): Piece {
  const b = readFileSync(`${dir}/${i}.bin`);
  const nv = b.readInt32LE(0), nt = b.readInt32LE(4);
  const positions = new Float32Array(nv * 3);
  for (let k = 0; k < nv * 3; k++) positions[k] = b.readFloatLE(8 + k * 4);
  const indices = new Uint32Array(nt * 3);
  for (let k = 0; k < nt * 3; k++) indices[k] = b.readUInt32LE(8 + nv * 12 + k * 4);
  return { positions, indices };
}
function merge(pieces: Piece[]): Piece {
  const nv = pieces.reduce((a, p) => a + p.positions.length, 0), ni = pieces.reduce((a, p) => a + p.indices.length, 0);
  const positions = new Float32Array(nv), indices = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const p of pieces) {
    positions.set(p.positions, vo); for (let k = 0; k < p.indices.length; k++) indices[io + k] = p.indices[k]! + vo / 3;
    vo += p.positions.length; io += p.indices.length;
  }
  return { positions, indices };
}

/** Drop unreferenced vertices and degenerate triangles. */
function compact(m: Piece): Piece {
  const remap = new Int32Array(m.positions.length / 3).fill(-1);
  const pos: number[] = [], idx: number[] = [];
  for (let t = 0; t < m.indices.length; t += 3) {
    const a = m.indices[t]!, b = m.indices[t + 1]!, c = m.indices[t + 2]!;
    if (a === b || b === c || a === c) continue;
    for (const v of [a, b, c]) {
      if (remap[v]! < 0) { remap[v] = pos.length / 3; pos.push(m.positions[v * 3]!, m.positions[v * 3 + 1]!, m.positions[v * 3 + 2]!); }
      idx.push(remap[v]!);
    }
  }
  return { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
}

/** Weld coincident vertices (Blender exports split them per face group) so the simplifier can collapse. */
function weld(m: Piece): Piece {
  const key = new Map<string, number>();
  const map = new Uint32Array(m.positions.length / 3);
  const pos: number[] = [];
  for (let v = 0; v < map.length; v++) {
    const k = `${Math.round(m.positions[v * 3]! * 1e5)},${Math.round(m.positions[v * 3 + 1]! * 1e5)},${Math.round(m.positions[v * 3 + 2]! * 1e5)}`;
    let id = key.get(k);
    if (id === undefined) { id = pos.length / 3; key.set(k, id); pos.push(m.positions[v * 3]!, m.positions[v * 3 + 1]!, m.positions[v * 3 + 2]!); }
    map[v] = id;
  }
  const indices = new Uint32Array(m.indices.length);
  for (let k = 0; k < indices.length; k++) indices[k] = map[m.indices[k]!]!;
  return compact({ positions: new Float32Array(pos), indices });
}

function decimate(m: Piece, category: string): Piece {
  const w = weld(m);
  const nt = w.indices.length / 3;
  const [cap, frac] = BUDGET[category] ?? DEFAULT_BUDGET;
  const target = Math.max(Math.min(nt, 48), Math.min(cap, Math.round(nt * frac)));
  if (nt <= target) return w;
  const [idx] = MeshoptSimplifier.simplify(w.indices, w.positions, 3, target * 3, 0.06, ['Prune']);
  return compact({ positions: w.positions, indices: idx });
}

/** Quantise to 16 bits inside the mesh bounds and meshopt-compress both streams. */
function encode(m: Piece, min: number[], max: number[]) {
  const nv = m.positions.length / 3;
  const q = new Uint16Array(nv * 4);
  for (let v = 0; v < nv; v++) for (let a = 0; a < 3; a++) {
    const span = max[a]! - min[a]!;
    q[v * 4 + a] = span > 0 ? Math.round(((m.positions[v * 3 + a]! - min[a]!) / span) * 65535) : 0;
  }
  const vb = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(q.buffer), nv, 8);
  const ib = MeshoptEncoder.encodeIndexBuffer(new Uint8Array(m.indices.buffer, m.indices.byteOffset, m.indices.byteLength), m.indices.length, 4);
  return { vb, ib, nv, ni: m.indices.length };
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** English → Latin (Terminologia Anatomica 2), used as terms only; the file is never redistributed. */
function loadTa2(): Map<string, string> {
  const map = new Map<string, string>();
  const file = `${ROOT}/zanat/TA2.csv`;
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, 'utf8').split('\n').slice(1)) {
    const cols = line.replace(/^"|"$/g, '').split(';');
    if (cols.length >= 3 && cols[1] && cols[2]) map.set(cols[1].trim().toLowerCase(), cols[2].trim());
  }
  return map;
}
/** FMA ids from BodyParts3D's concept table, used only on exact concept-name matches. */
function loadFma(): Map<string, string> {
  const map = new Map<string, string>();
  const file = `${ROOT}/bp3d/isa_parts_list_e.txt`;
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, 'utf8').split('\n').slice(1)) {
    const c = line.split('\t').map((x) => x.trim().replace(/^"|"$/g, ''));
    if (c.length >= 3 && /^FMA\d+$/.test(c[0]!)) map.set(c[2]!.toLowerCase(), c[0]!.replace('FMA', 'FMA:'));
  }
  return map;
}

interface Entry {
  id: string; name: string; base: string; side: 'left' | 'right' | 'none'; cls: Classified;
  provenance: Provenance; sourceName: string; sourceLicence: typeof ZLIC | typeof HLIC;
  pieces: Piece[]; category?: string; overrides?: boolean; aliases?: string[]; latin?: string;
}

/** Stand-ins in the core pack that this pack replaces with real geometry, by structure id. */
/**
 * Some source meshes carry a side label that contradicts where the mesh actually sits (the
 * Allen brain atlas labels hemispheres from the viewer's side, and a few Z-Anatomy objects are
 * swapped). The body's left is +x, so a label that disagrees with clear geometry is corrected.
 */
function sideByGeometry(side: 'left' | 'right' | 'none', piece: RawMesh, byCentroid = false): 'left' | 'right' | 'none' {
  if (side === 'none') return side;
  const { min, max } = boundsOf(piece.positions);
  if (byCentroid) { const cx = (min[0] + max[0]) / 2; if (Math.abs(cx) > 0.003) return cx > 0 ? 'left' : 'right'; return side; }
  // Only correct a mesh lying wholly on the other side; midline-crossing ones keep their label.
  if (side === 'left' && max[0] < -0.012) return 'right';
  if (side === 'right' && min[0] > 0.012) return 'left';
  return side;
}

interface Upgrade { id: string; name: string; latin: string; fma: string; systems: SystemId[]; region: string; category: string; layer?: number; z?: string[]; hra?: RegExp; sex?: 'female'; provenance: Provenance; laterality: 'left' | 'right' | 'none' }
const UPGRADES: Upgrade[] = [
  { id: 'lung-r', name: 'Right lung', latin: 'Pulmo dexter', fma: 'FMA:7310', systems: ['respiratory'], region: 'thorax', category: 'lung lobe', z: ['Superior lobe of right lung', 'Middle lobe of right lung', 'Inferior lobe of right lung'], provenance: 'zanatomy', laterality: 'right' },
  { id: 'lung-l', name: 'Left lung', latin: 'Pulmo sinister', fma: 'FMA:7311', systems: ['respiratory'], region: 'thorax', category: 'lung lobe', z: ['Superior lobe of left lung', 'Inferior lobe of left lung'], provenance: 'zanatomy', laterality: 'left' },
  { id: 'thyroid-gland', name: 'Thyroid gland', latin: 'Glandula thyroidea', fma: 'FMA:9603', systems: ['endocrine'], region: 'neck', category: 'endocrine', z: ['Thyroid gland'], provenance: 'zanatomy', laterality: 'none' },
  { id: 'median-nerve-r', name: 'Right median nerve', latin: 'Nervus medianus', fma: 'FMA:14385', systems: ['nervous'], region: 'upper-limb', category: 'nerve', z: ['Median nerve.r'], provenance: 'zanatomy', laterality: 'right' },
  { id: 'median-nerve-l', name: 'Left median nerve', latin: 'Nervus medianus', fma: 'FMA:14385', systems: ['nervous'], region: 'upper-limb', category: 'nerve', z: ['Median nerve.l'], provenance: 'zanatomy', laterality: 'left' },
  { id: 'sciatic-nerve-r', name: 'Right sciatic nerve', latin: 'Nervus ischiadicus', fma: 'FMA:19034', systems: ['nervous'], region: 'lower-limb', category: 'nerve', z: ['Sciatic nerve.r'], provenance: 'zanatomy', laterality: 'right' },
  { id: 'sciatic-nerve-l', name: 'Left sciatic nerve', latin: 'Nervus ischiadicus', fma: 'FMA:19034', systems: ['nervous'], region: 'lower-limb', category: 'nerve', z: ['Sciatic nerve.l'], provenance: 'zanatomy', laterality: 'left' },
  { id: 'rectus-abdominis', name: 'Rectus abdominis', latin: 'Musculus rectus abdominis', fma: 'FMA:9628', systems: ['muscular'], region: 'abdomen', category: 'muscle', layer: 4, z: ['Rectus abdominis muscle.l', 'Rectus abdominis muscle.r'], provenance: 'zanatomy', laterality: 'none' },
  { id: 'thoracolumbar-fascia', name: 'Thoracolumbar fascia', latin: 'Fascia thoracolumbalis', fma: 'FMA:76832', systems: ['fascial', 'connective'], region: 'back', category: 'fascia', layer: 3, z: ['Anterior layer of thoracolumbar fascia.l', 'Anterior layer of thoracolumbar fascia.r', 'Middle layer of thoracolumbar fascia.l', 'Middle layer of thoracolumbar fascia.r', 'Posterior layer of thoracolumbar fascia.l', 'Posterior layer of thoracolumbar fascia.r'], provenance: 'zanatomy', laterality: 'none' },
  { id: 'spinal-cord', name: 'Spinal cord', latin: 'Medulla spinalis', fma: 'FMA:7647', systems: ['nervous'], region: 'back', category: 'spinal cord segment', hra: /spinal_cord|segment_of_cervical_spinal_cord/i, provenance: 'hra', laterality: 'none' },
  { id: 'patellar-ligament-r', name: 'Right patellar ligament', latin: 'Ligamentum patellae', fma: 'FMA:44581', systems: ['connective'], region: 'lower-limb', category: 'ligament', layer: 6, hra: /patellar_ligament_R$/, provenance: 'hra', laterality: 'right' },
  { id: 'patellar-ligament-l', name: 'Left patellar ligament', latin: 'Ligamentum patellae', fma: 'FMA:44581', systems: ['connective'], region: 'lower-limb', category: 'ligament', layer: 6, hra: /patellar_ligament_L$/, provenance: 'hra', laterality: 'left' },
  { id: 'mammary-gland-r', name: 'Right mammary gland', latin: 'Glandula mammaria', fma: 'FMA:57987', systems: ['integumentary', 'reproductive'], region: 'thorax', category: 'gland', hra: /mammary_lobes_R|lactiferous_.*_R|_fat_R|^VH_F_fat_R|suspensory_ligaments_R|areola_R|nipple_R|areolar_tubercles_R/i, sex: 'female', provenance: 'hra', laterality: 'right' },
  { id: 'mammary-gland-l', name: 'Left mammary gland', latin: 'Glandula mammaria', fma: 'FMA:57987', systems: ['integumentary', 'reproductive'], region: 'thorax', category: 'gland', hra: /mammary_lobes_L|lactiferous_.*_L|_fat_L|^VH_F_fat_L|suspensory_ligaments_L|areola_L|nipple_L|areolar_tubercles_L/i, sex: 'female', provenance: 'hra', laterality: 'left' },
];

/** Groups whose meshes hide core structures while shown, because they draw the same organ in more detail. */
const REPLACES: Record<string, string[]> = {
  skeleton: ['skull', 'vertebral-column', 'rib-cage', 'pelvis', 'humerus-l', 'humerus-r', 'radius-ulna-l', 'radius-ulna-r', 'femur-l', 'femur-r', 'tibia-fibula-l', 'tibia-fibula-r'],
  muscles: ['deltoid-l', 'deltoid-r', 'biceps-brachii-l', 'biceps-brachii-r', 'pectoralis-major-l', 'pectoralis-major-r', 'quadriceps-femoris-l', 'quadriceps-femoris-r', 'gastrocnemius-l', 'gastrocnemius-r'],
  arteries: ['aorta'],
  veins: ['inferior-vena-cava'],
  'organ-parts': ['liver', 'pancreas', 'small-intestine', 'large-intestine', 'heart', 'prostate', 'uterus'],
};

const EAR_SRC_OPENEAR = 'OpenEar library, specimen ALPHA (Sieber et al., Sci Data 2018, CC BY 4.0; Zenodo 1473724): temporal-bone scan, decimated and registered to this body';
const EAR_SRC_IEMAP = 'IE-Map inner-ear template (Ahmadi et al., Sci Rep 2021, CC BY 4.0; Zenodo 10625570, built on David et al. 2016 and Wimmer et al. 2019, both CC BY 4.0): template surface fitted to the OpenEar cochlea and registered to this body';
const EAR_PARTS: { key: string; name: string; latin: string; category: string; src: 'openear' | 'iemap'; aliases: string[] }[] = [
  { key: 'scala-tympani', name: 'Scala tympani', latin: 'Scala tympani', category: 'inner ear', src: 'openear', aliases: ['cochlea', 'cochlear scala tympani', 'inner ear', 'perilymph space'] },
  { key: 'scala-vestibuli', name: 'Scala vestibuli', latin: 'Scala vestibuli', category: 'inner ear', src: 'openear', aliases: ['cochlea', 'cochlear scala vestibuli', 'inner ear', 'perilymph space'] },
  { key: 'round-window', name: 'Round window', latin: 'Fenestra cochleae', category: 'inner ear', src: 'openear', aliases: ['fenestra cochleae', 'cochlear window', 'inner ear'] },
  { key: 'external-acoustic-meatus', name: 'External acoustic meatus', latin: 'Meatus acusticus externus', category: 'ear canal', src: 'openear', aliases: ['ear canal', 'external auditory canal', 'external auditory meatus', 'auditory canal'] },
  { key: 'cochlear-duct', name: 'Cochlear duct', latin: 'Ductus cochlearis', category: 'inner ear', src: 'iemap', aliases: ['cochlea', 'scala media', 'membranous cochlea', 'inner ear'] },
  { key: 'anterior-semicircular-duct', name: 'Anterior semicircular duct', latin: 'Ductus semicircularis anterior', category: 'inner ear', src: 'iemap', aliases: ['superior semicircular canal', 'semicircular canal', 'labyrinth', 'vestibular labyrinth', 'inner ear'] },
  { key: 'lateral-semicircular-duct', name: 'Lateral semicircular duct', latin: 'Ductus semicircularis lateralis', category: 'inner ear', src: 'iemap', aliases: ['horizontal semicircular canal', 'semicircular canal', 'labyrinth', 'vestibular labyrinth', 'inner ear'] },
  { key: 'posterior-semicircular-duct', name: 'Posterior semicircular duct', latin: 'Ductus semicircularis posterior', category: 'inner ear', src: 'iemap', aliases: ['semicircular canal', 'labyrinth', 'vestibular labyrinth', 'inner ear'] },
  { key: 'anterior-membranous-ampulla', name: 'Anterior membranous ampulla', latin: 'Ampulla membranacea anterior', category: 'inner ear', src: 'iemap', aliases: ['superior ampulla', 'ampulla', 'labyrinth', 'inner ear'] },
  { key: 'lateral-membranous-ampulla', name: 'Lateral membranous ampulla', latin: 'Ampulla membranacea lateralis', category: 'inner ear', src: 'iemap', aliases: ['horizontal ampulla', 'ampulla', 'labyrinth', 'inner ear'] },
  { key: 'posterior-membranous-ampulla', name: 'Posterior membranous ampulla', latin: 'Ampulla membranacea posterior', category: 'inner ear', src: 'iemap', aliases: ['ampulla', 'labyrinth', 'inner ear'] },
  { key: 'utricle', name: 'Utricle', latin: 'Utriculus', category: 'inner ear', src: 'iemap', aliases: ['utriculus', 'otolith organ', 'vestibule', 'labyrinth', 'inner ear'] },
  { key: 'saccule', name: 'Saccule', latin: 'Sacculus', category: 'inner ear', src: 'iemap', aliases: ['sacculus', 'otolith organ', 'vestibule', 'labyrinth', 'inner ear'] },
];

async function main() {
  await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
  const zIdx = JSON.parse(readFileSync(ZIDX, 'utf8')) as ZIndexEntry[];
  const ta2 = loadTa2(), fmaByName = loadFma();
  console.log(`terms: ${ta2.size} TA2 English->Latin, ${fmaByName.size} FMA concept names`);
  await rm(OUT, { recursive: true, force: true });
  const report: Record<string, unknown> = {};

  for (const body of ['male', 'female'] as BodyId[]) {
    const sex = body === 'male' ? 'm' : 'f';
    const zDir = `${ZREG}/${body}`;
    const hraDir = `${ROOT}/hra/objs-${sex}`;
    const hraIdx = JSON.parse(readFileSync(`${hraDir}/index.json`, 'utf8')) as { i: number; name: string; nt: number }[];
    const core = JSON.parse(readFileSync(path.resolve(`public/assets/hra-v1/${body}.manifest.json`), 'utf8')) as { structures: ManifestStructure[] };
    const coreIds = new Set(core.structures.map((s) => s.id));
    const skin = core.structures.find((s) => s.id === 'skin')!;
    const bodyDir = path.join(OUT, body);
    await mkdir(bodyDir, { recursive: true });

    const entries: Entry[] = [];
    const skipped = new Map<string, number>();
    const skip = (why: string) => skipped.set(why, (skipped.get(why) ?? 0) + 1);
    const usedZ = new Set<number>(), usedH = new Set<number>();
    const zByName = new Map<string, ZIndexEntry>();
    for (const o of zIdx) if (o.nt > 0) zByName.set(o.name.trim(), o);
    const fromZ = (source: string) => (source.includes('female') ? '' : '');

    // 1. Upgrades of core stand-ins.
    for (const u of UPGRADES) {
      if (u.sex === 'female' && body !== 'female') continue;
      const pieces: Piece[] = [];
      if (u.z) for (const n of u.z) { const o = zByName.get(n); if (o) { pieces.push(readBin(zDir, o.i)); usedZ.add(o.i); } }
      if (u.hra) for (const o of hraIdx) if (u.hra.test(o.name) && !usedH.has(o.i)) { pieces.push(readBin(hraDir, o.i)); usedH.add(o.i); }
      if (!pieces.length) { console.warn(`  ! upgrade ${u.id}: no source meshes for ${body}`); continue; }
      const z = u.provenance === 'zanatomy';
      entries.push({
        id: u.id, name: u.name, base: u.name, side: u.laterality, provenance: u.provenance, overrides: true,
        sourceName: z ? 'Z-Anatomy' : 'Human Reference Atlas 3D Reference Object Library', sourceLicence: z ? ZLIC : HLIC,
        cls: { category: u.category, systems: u.systems, group: 'core-upgrades', layer: u.layer, region: u.region }, pieces,
      });
    }

    // 2. Z-Anatomy.
    const seenIds = new Set<string>([...coreIds, ...entries.map((e) => e.id)]);
    const uniqueId = (raw: string, category: string) => {
      let id = raw || 'structure';
      if (seenIds.has(id)) id = `${slug(category)}-${id}`;
      for (let n = 2; seenIds.has(id); n++) id = `${raw}-${n}`;
      seenIds.add(id); return id;
    };
    for (const o of zIdx) {
      if (o.nt === 0 || usedZ.has(o.i)) continue;
      const cls = classifyZ(o, body);
      if (cls.skip) { skip(`Z: ${cls.skip}`); continue; }
      const { base, side: labelled } = baseName(o.name);
      const piece = readBin(zDir, o.i);
      const side = sideByGeometry(labelled, piece, /hair|lash|brow/i.test(base) || /ligament/i.test(base));
      const sideWord = side === 'none' ? '' : `${side} `;
      const name = titleCase(`${sideWord}${base.charAt(0).toLowerCase()}${base.slice(1)}`.trim());
      const id = uniqueId(`${slug(base)}${side === 'left' ? '-l' : side === 'right' ? '-r' : ''}`, cls.category);
      entries.push({ id, name, base, side, cls, provenance: 'zanatomy', sourceName: body === 'female' ? 'Z-Anatomy (male reference subject, fitted to this body)' : 'Z-Anatomy', sourceLicence: ZLIC, pieces: [piece] });
    }

    // 3. HRA united structures not already in the core pack or an upgrade.
    for (const o of hraIdx) {
      if (usedH.has(o.i) || o.nt === 0) continue;
      const cls = classifyHra(o.name, body);
      if (o.name.startsWith('Allen_')) {
        const { base, side: labelled } = humanizeHra(o.name);
        const side = sideByGeometry(labelled, readBin(hraDir, o.i), true);
        const id = uniqueId(`${slug(base)}${side === 'left' ? '-l' : side === 'right' ? '-r' : ''}`, 'brain');
        // The Allen atlas is a brain subject; one file in the united body per hemisphere side.
        entries.push({ id, name: titleCase(`${side === 'none' ? '' : side + ' '}${base.toLowerCase()}`.trim()), base, side, provenance: 'hra', sourceName: 'Human Reference Atlas (Allen Human Reference Atlas brain regions)', sourceLicence: HLIC,
          cls: { category: 'brain region', systems: ['nervous'], group: 'brain-regions', region: 'head' }, pieces: [readBin(hraDir, o.i)] });
        continue;
      }
      if (o.name.includes('subcutaneous_abdominal_adipose')) {
        const which = /LUQ/.test(o.name) ? 'left upper quadrant' : /RUQ/.test(o.name) ? 'right upper quadrant' : 'umbilical area';
        entries.push({ id: `subcutaneous-abdominal-fat-${slug(which)}`, name: `Subcutaneous abdominal fat, ${which}`, base: 'Subcutaneous abdominal fat', side: 'none', provenance: 'hra', sourceName: 'Human Reference Atlas 3D Reference Object Library', sourceLicence: HLIC,
          cls: { category: 'adipose', systems: ['integumentary'], group: 'skin-layers', layer: 2, region: 'abdomen' }, pieces: [readBin(hraDir, o.i)] });
        continue;
      }
      if (cls.skip) { skip(`HRA: ${cls.skip}`); continue; }
      if (HRA_VESSEL_ALLOW.test(o.name.replace(/^VH_[MF]_/, '')) && cls.group !== 'organ-parts') {
        // Allow-listed HRA vessels keep their full anatomical name ("Left anterior descending artery").
        const raw = o.name.replace(/^VH_[MF]_/, '');
        let words = raw;
        let vside: 'left' | 'right' | 'none' = 'none';
        const tail = raw.match(/_(L|R)$/);
        if (tail) { vside = tail[1] === 'L' ? 'left' : 'right'; words = raw.slice(0, tail.index); }
        else if (/^left_/.test(raw)) vside = 'left'; else if (/^right_/.test(raw)) vside = 'right';
        words = words.replace(/_+/g, ' ').replace(/opthalmic/g, 'ophthalmic').replace(/\s+[abc]$/, (m) => ` ${m.trim()}`);
        const nm = tail ? titleCase(`${vside} ${words.toLowerCase()}`) : titleCase(words.toLowerCase());
        const idv = uniqueId(tail ? `${slug(words)}-${vside === 'left' ? 'l' : 'r'}` : slug(words), cls.category);
        const piece = readBin(hraDir, o.i);
        entries.push({ id: idv, name: nm, base: words, side: vside, cls, provenance: 'hra', sourceName: 'Human Reference Atlas 3D Reference Object Library', sourceLicence: HLIC, pieces: [piece] });
        continue;
      }
      const { base, side: labelled } = humanizeHra(o.name);
      const side = sideByGeometry(labelled, readBin(hraDir, o.i), true);
      const id = uniqueId(`${slug(base)}${side === 'left' ? '-l' : side === 'right' ? '-r' : ''}`, cls.category);
      entries.push({ id, name: titleCase(`${side === 'none' ? '' : side + ' '}${base.toLowerCase()}`.trim()), base, side, cls, provenance: 'hra', sourceName: 'Human Reference Atlas 3D Reference Object Library', sourceLicence: HLIC, pieces: [readBin(hraDir, o.i)] });
    }

    // 3b. Inner ear and ear canal: CC BY 4.0 research scans registered onto the Z-Anatomy ossicles
    //     (scripts/assets/extract/ear/*.py documents the registration; outputs are read from EAR).
    for (const t of EAR_PARTS) for (const side of ['right', 'left'] as const) {
      const file = `${EAR}/${body}/${t.key}.${side === 'right' ? 'r' : 'l'}.bin`;
      if (!existsSync(file)) { skip('ear: registered mesh missing'); continue; }
      const b = readFileSync(file); const nv = b.readInt32LE(0), nt = b.readInt32LE(4);
      const positions = new Float32Array(nv * 3); for (let k = 0; k < nv * 3; k++) positions[k] = b.readFloatLE(8 + k * 4);
      const indices = new Uint32Array(nt * 3); for (let k = 0; k < nt * 3; k++) indices[k] = b.readUInt32LE(8 + nv * 12 + k * 4);
      const src = t.src === 'openear' ? EAR_SRC_OPENEAR : EAR_SRC_IEMAP;
      const mirrored = side === 'left' ? ' Left side is the right-ear mesh mirrored across the midline and re-registered to the left ossicles.' : '';
      entries.push({ id: `${t.key}-${side === 'left' ? 'l' : 'r'}`, name: titleCase(`${side} ${t.name.toLowerCase()}`), base: t.name, side, provenance: t.src, sourceName: src + mirrored, sourceLicence: HLIC,
        cls: { category: t.category, systems: ['nervous'], group: 'inner-ear', region: 'head' }, pieces: [{ positions, indices }], aliases: t.aliases, latin: t.latin });
    }

    // 4. Schematic skin shells: the HRA skin surface displaced inward along its normals.
    const skinObj = hraIdx.find((o) => /_skin$/.test(o.name))!;
    const skinMesh = decimateTo(weld(readBin(hraDir, skinObj.i)), 60000);
    for (const [key, name, depth, layer] of [['epidermis', 'Epidermis (schematic shell)', 0.0008, 1], ['papillary-dermis', 'Papillary dermis (schematic shell)', 0.002, 1], ['dermis', 'Reticular dermis (schematic shell)', 0.004, 1], ['membranous-subcutaneous', 'Membranous layer of subcutaneous tissue (schematic shell)', 0.009, 2], ['hypodermis', 'Hypodermis (schematic shell)', 0.014, 2]] as const) {
      entries.push({ id: `${key}-shell`, name, base: name, side: 'none', provenance: 'generated', sourceName: 'Generated: Human Reference Atlas skin surface offset inward by a fixed depth (schematic, not anatomy)', sourceLicence: HLIC,
        cls: { category: 'skin layer', systems: ['integumentary'], group: 'skin-layers', layer, region: 'whole-body' }, pieces: [offsetInward(skinMesh, depth)] });
    }

    // 5. Encode groups.
    const groups = new Map<string, { chunks: Uint8Array[]; size: number; structures: ManifestStructure[] }>();
    let seq = 0;
    for (const e of entries) {
      const merged = merge(e.pieces);
      const dec = decimate(merged, e.cls.category);
      if (dec.indices.length < 9) { skip('too small after cleanup'); continue; }
      const { min, max } = boundsOf(dec.positions);
      const centroid: [number, number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
      const enc = encode(dec, min, max);
      const g = groups.get(e.cls.group) ?? { chunks: [], size: 0, structures: [] };
      groups.set(e.cls.group, g);
      const fmaKey = e.side === 'none' ? e.base.toLowerCase() : `${e.side} ${e.base.toLowerCase()}`;
      const fma = UPGRADES.find((u) => u.id === e.id)?.fma ?? fmaByName.get(fmaKey) ?? fmaByName.get(e.base.toLowerCase());
      const latin = UPGRADES.find((u) => u.id === e.id)?.latin ?? e.latin ?? ta2.get(e.base.toLowerCase());
      const ref = { o: g.size, vb: enc.vb.byteLength, ib: enc.ib.byteLength, nv: enc.nv, ni: enc.ni };
      g.chunks.push(enc.vb, enc.ib); g.size += enc.vb.byteLength + enc.ib.byteLength;
      const aliases = [...new Set([e.base, e.side === 'none' ? '' : `${e.base} ${e.side}`, ...(e.aliases ?? [])].filter((a) => a && a.toLowerCase() !== e.name.toLowerCase()))];
      g.structures.push({
        id: e.id, name: e.name, ...(fma ? { fmaId: fma } : {}), ...(latin ? { latinName: latin } : {}), ...(aliases.length ? { aliases } : {}),
        systems: e.cls.systems, ...(e.cls.region ? { region: e.cls.region } : {}), laterality: e.side,
        centroid: centroid.map((v) => +v.toFixed(5)) as ManifestStructure['centroid'],
        bounds: [...min, ...max].map((v) => +v.toFixed(5)) as ManifestStructure['bounds'],
        provenance: e.provenance, group: e.cls.group, category: e.cls.category, ...(e.cls.layer !== undefined ? { layer: e.cls.layer } : {}),
        source: { name: e.sourceName, licence: e.sourceLicence }, packed: ref,
      });
      seq++;
    }

    const groupList: NonNullable<Parameters<typeof bodyManifest.parse>[0]['groups']> = [];
    const structures: ManifestStructure[] = [];
    let total = 0;
    for (const [id, g] of groups) {
      const blob = Buffer.concat(g.chunks);
      const file = `group-${id}.bin`;
      await writeFile(path.join(bodyDir, file), blob);
      total += blob.byteLength;
      const meta = GROUPS[id] ?? { title: 'Core upgrades', description: 'Real meshes replacing stand-ins in the core pack.' };
      groupList.push({
        id, title: id === 'core-upgrades' ? 'Real meshes for former stand-ins' : meta.title, description: meta.description,
        url: `/assets/${PACK}/${body}/${file}`, bytes: blob.byteLength, count: g.structures.length,
        ...(REPLACES[id] ? { replaces: REPLACES[id] } : {}), ...(id === 'core-upgrades' || id === 'skin-layers' ? { auto: true } : {}),
      });
      structures.push(...g.structures);
    }
    const manifest = {
      body, version: new Date().toISOString().slice(0, 10), pack: PACK, licence: ZLIC,
      attribution: 'Z-Anatomy, the libre 3D atlas of anatomy (CC BY-SA 4.0), derived from BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 Japan / CC BY 4.0). Organ parts, spinal cord, patellar ligament, mammary gland, eye, skin and brain regions: Human Reference Atlas 3D Reference Object Library, HuBMAP Consortium (CC BY 4.0), with brain regions from the Allen Human Reference Atlas. Inner ear and ear canal: OpenEar library of 3D models of the human temporal bone (Sieber, Erfurt, John, Ribeiro dos Santos, Schurzig, Sørensen, Lenarz; Sci Data 2018, doi:10.1038/sdata.2018.297; CC BY 4.0) and IE-Map, a human inner-ear atlas and template (Ahmadi, Raiser, Ruehl, Flanagin, zu Eulenburg; Sci Rep 2021, doi:10.1038/s41598-021-82716-0; CC BY 4.0; surfaces derived from David et al. 2016 and Wimmer et al. 2019, both CC BY 4.0); modified: decimated, registered onto this body, left ear mirrored from the right. Additional coronary, cardiac, hepatic, portal, bowel, pelvic and retinal vessels: Human Reference Atlas (CC BY 4.0). Derived meshes in this pack are released under CC BY-SA 4.0.',
      groups: groupList, structures,
    };
    bodyManifest.parse(manifest);
    await writeFile(path.join(OUT, `${body}.manifest.json`), JSON.stringify(manifest));
    const byGroup: Record<string, number> = {};
    for (const s of structures) byGroup[s.group!] = (byGroup[s.group!] ?? 0) + 1;
    const tris = structures.reduce((a, s) => a + s.packed!.ni / 3, 0);
    console.log(`${body}: ${structures.length} structures, ${Math.round(tris).toLocaleString()} triangles, ${(total / 1048576).toFixed(2)} MB`, byGroup);
    report[body] = { structures: structures.length, triangles: Math.round(tris), bytes: total, byGroup, groups: groupList.map((g) => ({ id: g.id, bytes: g.bytes, count: g.count })), skipped: Object.fromEntries(skipped) };
  }
  await writeFile(path.join(OUT, 'build-report.json'), JSON.stringify(report, null, 1));
}

/** Simplify to an absolute triangle count. */
function decimateTo(m: Piece, tris: number): Piece {
  if (m.indices.length / 3 <= tris) return m;
  const [idx] = MeshoptSimplifier.simplify(m.indices, m.positions, 3, tris * 3, 0.02, ['Prune']);
  return compact({ positions: m.positions, indices: idx });
}

/** Displace every vertex opposite its area-weighted normal, facing the mesh's interior. */
function offsetInward(m: Piece, depth: number): Piece {
  const n = new Float32Array(m.positions.length);
  const p = m.positions;
  for (let t = 0; t < m.indices.length; t += 3) {
    const a = m.indices[t]! * 3, b = m.indices[t + 1]! * 3, c = m.indices[t + 2]! * 3;
    const ux = p[b]! - p[a]!, uy = p[b + 1]! - p[a + 1]!, uz = p[b + 2]! - p[a + 2]!;
    const vx = p[c]! - p[a]!, vy = p[c + 1]! - p[a + 1]!, vz = p[c + 2]! - p[a + 2]!;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) { n[i] += nx; n[i + 1] += ny; n[i + 2] += nz; }
  }
  // Orientation: the outward normal at the topmost vertex points up. Flip if the winding is inverted.
  let top = 0; for (let v = 1; v < p.length / 3; v++) if (p[v * 3 + 1]! > p[top * 3 + 1]!) top = v;
  const sign = n[top * 3 + 1]! >= 0 ? 1 : -1;
  const out = new Float32Array(p.length);
  for (let v = 0; v < p.length; v += 3) {
    const len = Math.hypot(n[v]!, n[v + 1]!, n[v + 2]!) || 1;
    for (let a = 0; a < 3; a++) out[v + a] = p[v + a]! - (sign * n[v + a]! / len) * depth;
  }
  return { positions: out, indices: m.indices };
}

main().catch((e) => { console.error(e); process.exit(1); });
