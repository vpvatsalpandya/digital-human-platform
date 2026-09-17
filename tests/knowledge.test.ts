import { describe, expect, it } from 'vitest';
import { SEED_RECORDS } from '@/knowledge/seed';
import { SOURCES } from '@/knowledge/sources';
import { knowledgeRecord, publishabilityIssues, publishableRecord, resolveField, canTransition, RECORD_FIELD_KEYS } from '@/knowledge/schema';

describe('knowledge schema', () => {
  it('every seed record validates and has all 20 fields', () => {
    for (const r of SEED_RECORDS) {
      expect(() => knowledgeRecord.parse(r)).not.toThrow();
      expect(Object.keys(r.fields).sort()).toEqual([...RECORD_FIELD_KEYS].sort());
    }
  });
  it('every non-empty field in the seed is cited by a registered source', () => {
    for (const r of SEED_RECORDS) {
      expect(publishabilityIssues(r.fields)).toEqual([]);
      for (const k of RECORD_FIELD_KEYS) for (const c of r.fields[k].citations) expect(SOURCES[c.sourceId], `${r.structureId}.${k} cites unknown source ${c.sourceId}`).toBeDefined();
    }
  });
  it('quotes only appear on permissively licensed sources', () => {
    for (const r of SEED_RECORDS) for (const k of RECORD_FIELD_KEYS) for (const c of r.fields[k].citations) {
      if (c.quote) expect(SOURCES[c.sourceId]!.licence.startsWith('CC-BY')).toBe(true);
    }
  });
  it('refuses to approve a record with an uncited non-empty field', () => {
    const r = structuredClone(SEED_RECORDS[0]!);
    r.fields.function.citations = [];
    expect(publishabilityIssues(r.fields)).toEqual([{ field: 'function', reason: 'missing_citation' }]);
    expect(publishableRecord.safeParse({ ...r, status: 'approved' }).success).toBe(false);
    expect(publishableRecord.safeParse({ ...r, status: 'draft' }).success).toBe(true);
  });
  it('hides surgical relevance in school mode and applies mode overrides', () => {
    const heart = SEED_RECORDS[0]!.fields;
    expect(resolveField(heart, 'surgicalRelevance', 'school')).toBeNull();
    expect(resolveField(heart, 'description', 'school')).toContain('fist');
    expect(resolveField(heart, 'description', 'mbbs')).toContain('mediastinum');
  });
  it('enforces the review state machine', () => {
    expect(canTransition('draft', 'published')).toBe(false);
    expect(canTransition('in_review', 'approved')).toBe(true);
    expect(canTransition('approved', 'published')).toBe(true);
    expect(canTransition('deprecated', 'draft')).toBe(false);
  });
});
