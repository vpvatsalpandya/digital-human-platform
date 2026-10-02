import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { mergeManifests } from '../src/engine/useBodyManifest';
import { SYSTEM_GROUPS, DEFAULT_GROUPS, groupsForNewSystems } from '../src/engine/system-groups';
import { SYSTEM_IDS, isRealAnatomy } from '../src/engine/types';
import type { BodyManifest, ManifestStructure } from '../src/engine/types';

/**
 * Systematic anatomy QA over the merged (core + detail + schematic) catalogue of each body:
 * sex-specific allow/deny lists, bone completeness (every finger and toe bone present), left/right
 * pairing and placement, duplicates, naming/labelling, and that every system chip maps to the packs
 * that hold its structures.
 */
const CORE = 'public/assets/hra-v1', V2 = 'public/assets/anatomy-v2';
const built = existsSync(`${V2}/male.manifest.json`) && existsSync(`${CORE}/male.manifest.json`);
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const merged = (b: 'male' | 'female'): BodyManifest => mergeManifests(read(`${CORE}/${b}.manifest.json`), read(`${V2}/${b}.manifest.json`));
const text = (s: ManifestStructure) => `${s.id} ${s.name} ${s.latinName ?? ''}`.toLowerCase();

// Terms that identify sex-specific anatomy, matched on id + name + Latin name.
const MALE_ONLY = /\b(penis|penile|testis|testes|testicular|epididym|scrot|prostat|seminal|vas-?deferens|ductus-deferens|spermatic|bulbourethral|cowper|glans-penis|corpus-(cavernosum|spongiosum)-(of-)?penis|foreskin|prepuce-of-penis|tunica-vaginalis|cremaster|ejaculatory)/;
const FEMALE_ONLY = /\b(uter(us|ine)|ovar(y|ies|ian)|fallopian|vagin|vulva|labi(um|a)-(majus|minus|majora|minora)|labium|clitor|vestibular-bulb|greater-vestibular|bartholin|cervix-of-uterus|endometri|myometri|broad-ligament|round-ligament-of-uterus|suspensory-ligament-of-ovary|mammary|breast|hymen|fimbri|infundibulum-of-uterine|ampulla-of-uterine|cardinal|uterosacral|mons-pubis|female)/;
// Words that look sex-specific to a regex but are anatomy both sexes have.
const BOTH_SEXES_OK = /(intercornual|urethral-sphincter|membranous-urethra|tendon sheath|round-ligament-of-liver|vestibul(e|ar)-(of|ligament|fold|nerve|artery|vein|aqueduct|window|membrane|ganglion|nuclei|nucleus)|vestibulo|infundibulum-of-(hypothalam|pituitar|right-ventricle|cerebr|frontal)|pituitary|cardinal-(vein|ligament-of-the-heart)|ovarian-vein-wrong)/;
const sexual = (re: RegExp, s: ManifestStructure) => re.test(s.id) && !BOTH_SEXES_OK.test(text(s));

describe.runIf(built)('sex-specific anatomy', () => {
  const male = merged('male'), female = merged('female');
  it('the female body has no male reproductive structure (any pack, any provenance)', () => {
    const bad = female.structures.filter((s) => sexual(MALE_ONLY, s) || /\b(penis|testis|prostate|scrotum|seminal)/i.test(`${s.name} ${s.latinName ?? ''}`)).map((s) => s.id);
    expect(bad).toEqual([]);
  });
  it('the male body has no female reproductive structure', () => {
    const bad = male.structures.filter((s) => (sexual(FEMALE_ONLY, s) && !/labi(i|al)-|labial-|-labii-/.test(s.id)) || /\b(uterus|uterine|ovary|fallopian|vagina|vulva|clitor|labium (minus|majus)|labia (minora|majora)|breast)/i.test(s.name)).map((s) => s.id);
    expect(bad).toEqual([]);
  });
  it('the urethra of each body is the correct kind', () => {
    const f = female.structures.filter((s) => /urethra/.test(s.id) && !/sphincter|orifice/.test(s.id));
    const m = male.structures.filter((s) => /urethra/.test(s.id) && !/sphincter|orifice/.test(s.id));
    expect(f.map((s) => s.id), 'female urethra').toContain('female-urethra');
    expect(f.map((s) => s.id)).not.toContain('urethra');
    for (const s of f) if (s.id === 'female-urethra') { expect(s.provenance).toBe('generated'); expect(s.name).toMatch(/\(schematic\)$/); }
    expect(m.map((s) => s.id)).toContain('urethra');
  });
  const FEMALE_REQUIRED = ['uterus', 'ovary-r', 'ovary-l', 'vagina', 'female-urethra', 'glans-of-clitoris', 'body-of-clitoris', 'labium-minus-l', 'labium-minus-r', 'labium-majus-l', 'labium-majus-r', 'vestibule-of-vagina'];
  it.each(FEMALE_REQUIRED)('the female body has %s', (id) => { expect(female.structures.map((s) => s.id)).toContain(id); });
  it('male reproductive organs are present only in the male body', () => {
    const ids = (m: BodyManifest) => new Set(m.structures.map((s) => s.id));
    for (const id of ['prostate', 'testis-r', 'testis-l']) { expect(ids(male).has(id), id).toBe(true); expect(ids(female).has(id), id).toBe(false); }
  });
  it('female external genitalia are generated, labelled schematic and not counted as real', () => {
    const ext = female.structures.filter((s) => /^(female-urethra|glans-of-clitoris|body-of-clitoris|crus-of-clitoris-[lr]|bulb-of-vestibule-[lr]|greater-vestibular-gland-[lr]|labium-(minus|majus)-[lr]|vestibule-of-vagina)$/.test(s.id));
    expect(ext.length).toBe(14);
    for (const s of ext) { expect(s.provenance, s.id).toBe('generated'); expect(isRealAnatomy(s.provenance), s.id).toBe(false); expect(s.name, s.id).toMatch(/\(schematic\)$/); expect(s.category, s.id).toMatch(/^schematic /); }
  });
  it('the reproductive chip is non-empty and sex-appropriate for both bodies', () => {
    for (const m of [male, female]) expect(m.structures.filter((s) => s.systems.includes('reproductive')).length).toBeGreaterThan(5);
  });
});

describe.runIf(built)('bone completeness (both bodies)', () => {
  const ORD = ['first', 'second', 'third', 'fourth', 'fifth'];
  it.each(['male', 'female'] as const)('%s has every named bone, including all finger and toe bones', (b) => {
    const ids = new Set(merged(b).structures.map((s) => s.id));
    const want: string[] = [];
    for (const side of ['l', 'r']) {
      for (const seg of ['proximal', 'middle', 'distal']) for (const [i, o] of ORD.entries()) for (const part of ['hand', 'foot']) {
        // the thumb and the great toe have no middle phalanx
        if (seg === 'middle' && i === 0) continue;
        want.push(`${seg}-phalanx-of-${o}-finger-of-${part}-${side}`);
      }
      for (const o of ORD) { want.push(`${o}-metacarpal-bone-${side}`, `${o}-metatarsal-bone-${side}`); }
      for (const c of ['scaphoid', 'lunate', 'triquetrum', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate']) want.push(`${c}-bone-${side}`);
      for (const t of ['calcaneus', 'talus', 'navicular-bone', 'cuboid-bone', 'medial-cuneiform-bone', 'intermediate-cuneiform-bone', 'lateral-cuneiform-bone']) want.push(`${t}-${side}`);
      want.push(`sesamoid-bones-of-foot-${side}`, `patella-${side}`, `clavicle-${side}`, `scapula-${side}`, `radius-${side}`, `ulna-${side}`, `tibia-${side}`, `fibula-${side}`, `bone-femur-${side}`, `bone-humerus-${side}`, `hip-bone-${side}`);
      for (const r of ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']) want.push(`${r}-rib-${side}`);
      want.push(`malleus-${side}`, `incus-${side}`, `stapes-${side}`);
    }
    for (const v of ['c3', 'c4', 'c5', 'c6', 'c7', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12', 'l1', 'l2', 'l3', 'l4', 'l5']) want.push(`vertebra-${v}`);
    want.push('atlas-c1', 'axis-c2', 'sacrum', 'coccyx', 'body-of-sternum', 'manubrium-of-sternum', 'xiphoid-process', 'hyoid-bone', 'mandible', 'frontal-bone', 'occipital-bone', 'sphenoid-bone', 'ethmoid-bone', 'vomer');
    expect(want.filter((id) => !ids.has(id))).toEqual([]);
    // 206-bone adult skeleton: every segment is a separate, real mesh
    const hand = want.filter((id) => /phalanx-of-.*hand|metacarpal|^(scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate)-bone/.test(id));
    expect(hand.length).toBe(2 * (14 + 5 + 8));
  });
  it('every bone mesh is real, in the skeleton group and has triangles', () => {
    for (const b of ['male', 'female'] as const) {
      const sk = merged(b).structures.filter((s) => s.group === 'skeleton' && /phalanx|metacarpal|metatarsal|carpal|tarsal|sesamoid|calcaneus|talus|cuneiform|cuboid|navicular|scaphoid|lunate|triquetrum|pisiform|trapez|capitate|hamate/.test(s.id));
      expect(sk.length, b).toBe(2 * (14 + 14 + 5 + 5 + 8 + 7 + 1));
      for (const s of sk) { expect(isRealAnatomy(s.provenance), s.id).toBe(true); expect((s.packed?.ni ?? 0) / 3, s.id).toBeGreaterThan(20); }
    }
  });
});

describe.runIf(built)('left / right placement and duplicates', () => {
  for (const b of ['male', 'female'] as const) {
    const m = merged(b);
    it(`${b}: every -l/-r structure sits on its own side of the midline (+x is the body's left)`, () => {
      const bad: string[] = [];
      for (const s of m.structures) {
        const side = s.id.endsWith('-l') ? 1 : s.id.endsWith('-r') ? -1 : 0;
        if (!side || !s.centroid) continue;
        // Midline-straddling or deliberately bilateral aggregates are exempt by width.
        const w = s.bounds ? s.bounds[3]! - s.bounds[0]! : 0;
        if (w > 0.05 || Math.abs(s.centroid[0]) < 0.013) continue; // wide paths (vagus plexus) and midline structures (±1.3 cm) are exempt
        if (Math.sign(s.centroid[0]) !== side) bad.push(`${s.id} x=${s.centroid[0].toFixed(3)}`);
      }
      expect(bad).toEqual([]);
    });
    it(`${b}: every -l has a -r partner and vice versa (except declared single organs)`, () => {
      const ids = new Set(m.structures.map((s) => s.id));
      const orphan = m.structures.filter((s) => /-[lr]$/.test(s.id) && !ids.has(s.id.replace(/-[lr]$/, (x) => (x === '-l' ? '-r' : '-l')))).map((s) => s.id);
      // Source gaps: the Allen brain model holds one hemisphere's regions and the kidney/heart sub-parts are
      // single units; any other lone side is a known gap in Z-Anatomy/HRA (documented in docs/gap-audit.md).
      const KNOWN = new Set(['iliocostalis-colli-muscle-r', 'intra-articular-ligament-of-head-of-rib-r', 'ulnopisiform-ligament-l', 'ligament-cricopharyngeal-ligament-r', 'descending-branch-of-lateral-circumflex-femoral-artery-l',
        'insular-branches-of-middle-cerebral-artery-m2-r', 'insular-branches-of-middle-cerebral-artery-m2-segment-l', 'right-testicular-artery-r', 'cochlear-nerve-l', 'common-plantar-digital-branches-of-medial-plantar-nerve-l']);
      const groupOf = new Map(m.structures.map((s) => [s.id, s.group]));
      const unexpected = orphan.filter((id) => !['brain-regions', 'organ-parts'].includes(groupOf.get(id) ?? '') && !KNOWN.has(id));
      expect(unexpected).toEqual([]);
    });
    it(`${b}: no duplicate ids and no two real structures share identical bounds (a duplicated mesh)`, () => {
      const seen = new Set<string>(); const dup: string[] = [];
      for (const s of m.structures) { if (seen.has(s.id)) dup.push(s.id); seen.add(s.id); }
      expect(dup).toEqual([]);
      const byHash = new Map<string, string>(); const same: string[] = [];
      for (const s of m.structures) {
        const h = s.bounds?.map((v) => v.toFixed(4)).join(','); if (!h || !isRealAnatomy(s.provenance)) continue;
        const prev = byHash.get(h); if (prev) same.push(`${prev}=${s.id}`); else byHash.set(h, s.id);
      }
      expect(same).toEqual([]);
    });
    it(`${b}: left and right paired structures are mirror images, not copies (centroids mirror about the midline)`, () => {
      const by = new Map(m.structures.map((s) => [s.id, s]));
      const bad: string[] = [];
      for (const s of m.structures) {
        if (!s.id.endsWith('-l') || !s.centroid || (s.bounds && s.bounds[3]! - s.bounds[0]! > 0.2)) continue;
        const r = by.get(s.id.replace(/-l$/, '-r')); if (!r?.centroid) continue;
        if (Math.abs(s.centroid[0] + r.centroid[0]) > 0.12) bad.push(s.id); // sides must be within 12 cm of symmetric about x=0
      }
      expect(bad).toEqual([]);
    });
  }
});

describe.runIf(built)('names and labelling', () => {
  for (const b of ['male', 'female'] as const) {
    const m = merged(b);
    it(`${b}: names are non-empty, unique per id and never contain raw export noise`, () => {
      for (const s of m.structures) {
        expect(s.name.trim().length, s.id).toBeGreaterThan(1);
        expect(s.name, s.id).not.toMatch(/^VH_|\.0\d\d$|\.(l|r|el|er|ol|or)$|_/);
        expect(s.name, s.id).not.toMatch(/\s{2,}/);
      }
    });
    it(`${b}: laterality in the name agrees with the id`, () => {
      const bad = m.structures.filter((s) => (/-l$/.test(s.id) && /\bright\b/i.test(s.name)) || (/-r$/.test(s.id) && /\bleft\b/i.test(s.name))).map((s) => s.id);
      expect(bad).toEqual([]);
    });
    it(`${b}: generated structures are labelled and every real one carries a real provenance`, () => {
      for (const s of m.structures) {
        if (s.provenance === 'generated') expect(s.name + (s.category ?? ''), s.id).toMatch(/schematic/i);
        else expect(['hra', 'bp3d', 'zanatomy', 'openear', 'iemap', 'procedural', undefined], s.id).toContain(s.provenance);
      }
    });
  }
});

describe('system chips load the packs that hold their structures', () => {
  it('maps every system to existing group ids', () => {
    const groups = new Set(['skeleton', 'muscles', 'arteries', 'veins', 'nerves', 'brain-regions', 'inner-ear', 'lymphatic', 'organ-parts', 'fascia-bursae', 'joints']);
    for (const s of SYSTEM_IDS) { expect(SYSTEM_GROUPS[s], s).toBeDefined(); for (const g of SYSTEM_GROUPS[s]) expect(groups.has(g), `${s}->${g}`).toBe(true); }
  });
  it('loads the skeleton by default (so the fingers and toes are visible from the first view)', () => { expect(DEFAULT_GROUPS).toContain('skeleton'); });
  it('adds only the packs of newly switched-on systems that exist', () => {
    expect(groupsForNewSystems(['skeletal'], ['skeletal', 'muscular'], ['skeleton', 'muscles'])).toEqual(['muscles']);
    expect(groupsForNewSystems(['skeletal'], ['skeletal'], ['skeleton', 'muscles'])).toEqual([]);
    expect(groupsForNewSystems([], ['reproductive', 'urinary'], ['organ-parts'])).toEqual(['organ-parts']);
    expect(groupsForNewSystems([], ['muscular'], [])).toEqual([]);
  });
  it.runIf(built)('every detail group is reachable from some chip (or loaded by default / auto)', () => {
    const reach = new Set([...DEFAULT_GROUPS, ...Object.values(SYSTEM_GROUPS).flat()]);
    for (const b of ['male', 'female']) for (const g of read(`${V2}/${b}.manifest.json`).groups) expect(g.auto || reach.has(g.id) || g.id === 'schematic', `${b}:${g.id}`).toBe(true);
  });
});
