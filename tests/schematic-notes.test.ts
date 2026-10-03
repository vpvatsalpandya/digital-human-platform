import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { schematicNote } from '../src/modules/atlas/schematic-notes';
import { isRealAnatomy } from '../src/engine/types';

const V2 = 'public/assets/anatomy-v2';
const built = existsSync(`${V2}/male.manifest.json`);
const read = (b: string) => JSON.parse(readFileSync(`${V2}/${b}.manifest.json`, 'utf8')).structures as { id: string; name: string; provenance: string; category?: string; systems: string[]; laterality?: string }[];

describe('schematic structure-card notes', () => {
  it('only generated schematic structures get a note', () => {
    expect(schematicNote({ id: 'metopic-suture', provenance: 'generated', category: 'schematic suture' })).toMatch(/usually closed/);
    expect(schematicNote({ id: 'metopic-suture', provenance: 'zanatomy', category: 'bone' })).toBeNull();
    expect(schematicNote({ id: 'femur', provenance: 'generated', category: 'skin layer' })).toBeNull();
  });
  it.runIf(built)('every gap-fill placeholder has a note and is flagged generated, never real', () => {
    for (const b of ['male', 'female']) {
      const m = read(b);
      for (const id of ['metopic-suture', 'umbilical-artery-l', 'medial-umbilical-ligament-r', 'ligamentum-arteriosum', 'pleural-cavity-l', 'fibrous-pericardium', 'mesentery', 'nipple-l', 'areola-r', 'pituitary-infundibulum', 'hair-follicle-inset', 'sweat-gland-inset', 'sebaceous-gland-inset', 'arrector-pili-inset', 'dermal-nerve-ending-inset', 'dermal-capillary-loop-inset']) {
        const s = m.find((x) => x.id === id);
        expect(s, `${b} ${id}`).toBeDefined();
        expect(s!.provenance).toBe('generated');
        expect(isRealAnatomy(s!.provenance as never)).toBe(false);
        expect(s!.name).toMatch(/\(schematic\)$/);
        expect(schematicNote(s as never), id).toBeTruthy();
      }
      for (const s of m.filter((x) => x.category === 'schematic inset')) expect(s.name, s.id).toMatch(/representative inset/);
    }
  });
  it.runIf(built)('male-only urethra parts are on the male body only, female-only items on the female', () => {
    const male = read('male').map((s) => s.id), female = read('female').map((s) => s.id);
    for (const id of ['membranous-part-of-male-urethra', 'navicular-fossa-of-male-urethra']) { expect(male).toContain(id); expect(female).not.toContain(id); }
    expect(male).not.toContain('female-urethra');
    expect(female).toContain('female-urethra');
    expect(male.filter((i) => /clitor|vestibule-of-vagina|bulb-of-vestibule|greater-vestibular|labium|vagina/.test(i))).toEqual([]);
  });
});
