/**
 * Knowledge Engine schema (Phase E). One record per structure; every non-empty field must
 * carry at least one citation before it can be approved or published. This is the single
 * source of truth for the shape stored in RecordVersion.fields (JSONB).
 */
import { z } from 'zod';

export const AUDIENCE_MODES = [
  'school', 'neet', 'nursing', 'pharmacy', 'physiotherapy', 'allied', 'mbbs', 'dental',
  'postgraduate', 'faculty',
] as const;
export type AudienceMode = (typeof AUDIENCE_MODES)[number];
export const audienceMode = z.enum(AUDIENCE_MODES);

export const structureCategory = z.enum([
  'organ', 'bone', 'muscle', 'nerve', 'artery', 'vein', 'lymphatic', 'gland', 'ligament',
  'joint', 'fascia', 'skin', 'region', 'landmark', 'other',
]);
export type StructureCategory = z.infer<typeof structureCategory>;

export const citation = z.object({
  sourceId: z.string().min(1),
  /** chapter / section / page / figure / URL fragment */
  locator: z.string().min(1),
  /** Short quote — only permitted for permissively licensed sources (CC BY etc.). */
  quote: z.string().max(300).optional(),
  note: z.string().max(500).optional(),
});
export type Citation = z.infer<typeof citation>;

export const source = z.object({
  id: z.string(),
  type: z.enum(['textbook', 'oer', 'dataset', 'journal', 'guideline', 'other']),
  title: z.string(),
  authors: z.string().optional(),
  year: z.number().int().optional(),
  edition: z.string().optional(),
  publisher: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().url().optional(),
  /** SPDX-like identifier or 'proprietary-cited-only' */
  licence: z.string(),
  attributionText: z.string().optional(),
});
export type Source = z.infer<typeof source>;

/** A field value with provenance. `modes` overrides `value` for a given audience. */
function field<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    value: valueSchema,
    citations: z.array(citation).default([]),
    modes: z.record(audienceMode, valueSchema).optional(),
    aiAssisted: z.boolean().optional(),
  });
}

const structureRef = z.object({ structureId: z.string().optional(), text: z.string().min(1), note: z.string().optional() });
const innervationEntry = z.object({ nerveRef: structureRef, fibreType: z.string().optional(), rootValue: z.string().optional() });
const clinicalEntry = z.object({ title: z.string(), text: z.string(), competencyCodes: z.array(z.string()).default([]) });
const diseaseEntry = z.object({ name: z.string(), text: z.string(), pathologyPairId: z.string().optional() });
const radiologyEntry = z.object({ modality: z.enum(['xray', 'ct', 'mri', 'ultrasound']), text: z.string(), imagingCaseId: z.string().optional(), sliceIndex: z.number().int().optional() });
const pearlEntry = z.object({ text: z.string(), examType: z.enum(['spotter', 'viva', 'osce', 'written']) });

export const relations = z.object({
  anterior: z.array(structureRef).default([]),
  posterior: z.array(structureRef).default([]),
  superior: z.array(structureRef).default([]),
  inferior: z.array(structureRef).default([]),
  medial: z.array(structureRef).default([]),
  lateral: z.array(structureRef).default([]),
  contents: z.array(structureRef).default([]),
  boundaries: z.array(structureRef).default([]),
});

/** The 20 required fields. Empty is acceptable; wrong is not. */
export const recordFields = z.object({
  name: field(z.string()),
  alternativeNames: field(z.array(z.string())),
  latinName: field(z.string()),
  category: field(structureCategory),
  description: field(z.string()),
  function: field(z.string()),
  relations: field(relations),
  bloodSupply: field(z.array(structureRef)),
  venousDrainage: field(z.array(structureRef)),
  lymphaticDrainage: field(z.array(structureRef)),
  innervation: field(z.array(innervationEntry)),
  histology: field(z.object({ text: z.string(), slideIds: z.array(z.string()).default([]) })),
  embryology: field(z.object({ text: z.string(), stageIds: z.array(z.string()).default([]), germLayer: z.string().optional() })),
  physiology: field(z.object({ text: z.string(), simulationIds: z.array(z.string()).default([]) })),
  clinicalSignificance: field(z.array(clinicalEntry)),
  surgicalRelevance: field(z.array(clinicalEntry)),
  commonDiseases: field(z.array(diseaseEntry)),
  radiologicalCorrelation: field(z.array(radiologyEntry)),
  examinationPearls: field(z.array(pearlEntry)),
  references: field(z.array(citation)),
});
export type RecordFields = z.infer<typeof recordFields>;
export type RecordFieldKey = keyof RecordFields;
export const RECORD_FIELD_KEYS = Object.keys(recordFields.shape) as RecordFieldKey[];

export const recordStatus = z.enum(['draft', 'in_review', 'changes_requested', 'approved', 'published', 'deprecated']);
export type RecordStatus = z.infer<typeof recordStatus>;

export const knowledgeRecord = z.object({
  structureId: z.string(),
  version: z.number().int().positive(),
  status: recordStatus,
  fields: recordFields,
  authorId: z.string(),
  reviewerIds: z.array(z.string()).default([]),
  changeSummary: z.string().optional(),
});
export type KnowledgeRecord = z.infer<typeof knowledgeRecord>;

/** Is a field value "non-empty" for the purposes of the citation rule? */
export function isFieldNonEmpty(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(isFieldNonEmpty);
  }
  return true;
}

export type PublishabilityIssue = { field: RecordFieldKey; reason: 'missing_citation' | 'mode_without_citation' };

/** Fields with content but no citation cannot be approved/published (Phase E §2). */
export function publishabilityIssues(fields: RecordFields): PublishabilityIssue[] {
  const issues: PublishabilityIssue[] = [];
  for (const key of RECORD_FIELD_KEYS) {
    const f = fields[key];
    if (key === 'references') continue; // references are themselves citations
    if (isFieldNonEmpty(f.value) && f.citations.length === 0) {
      issues.push({ field: key, reason: 'missing_citation' });
    }
    if (f.modes && Object.values(f.modes).some(isFieldNonEmpty) && f.citations.length === 0) {
      issues.push({ field: key, reason: 'mode_without_citation' });
    }
  }
  return issues;
}

export const publishableRecord = knowledgeRecord.superRefine((rec, ctx) => {
  if (rec.status === 'approved' || rec.status === 'published') {
    for (const issue of publishabilityIssues(rec.fields)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fields', issue.field], message: issue.reason });
    }
  }
});

/** Fields hidden from an audience regardless of content (Phase E §3). */
export const fieldVisibilityByMode: Record<AudienceMode, RecordFieldKey[]> = {
  school: ['surgicalRelevance', 'radiologicalCorrelation', 'lymphaticDrainage', 'examinationPearls', 'latinName'],
  neet: ['surgicalRelevance', 'radiologicalCorrelation', 'examinationPearls'],
  nursing: ['surgicalRelevance'],
  pharmacy: ['surgicalRelevance'],
  physiotherapy: [],
  allied: [],
  mbbs: [],
  dental: [],
  postgraduate: [],
  faculty: [],
};

/** Resolve a field for an audience: mode override → base value; hidden → null. */
export function resolveField<K extends RecordFieldKey>(fields: RecordFields, key: K, mode: AudienceMode): RecordFields[K]['value'] | null {
  if (fieldVisibilityByMode[mode].includes(key)) return null;
  const f = fields[key];
  const override = f.modes?.[mode];
  return (override ?? f.value) as RecordFields[K]['value'];
}

export const legalStatusTransitions: Record<RecordStatus, RecordStatus[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'changes_requested'],
  changes_requested: ['in_review'],
  approved: ['published', 'changes_requested'],
  published: ['deprecated', 'changes_requested'],
  deprecated: [],
};

export function canTransition(from: RecordStatus, to: RecordStatus): boolean {
  return legalStatusTransitions[from].includes(to);
}
