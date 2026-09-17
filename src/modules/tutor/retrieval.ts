/**
 * Retrieval over published/seeded knowledge records (ADR-009). Production uses Postgres
 * FTS ∪ pgvector with reciprocal rank fusion; this in-memory BM25 implements the same
 * contract for development and tests, so the tutor never answers from anything but chunks.
 */
import type { KnowledgeRecord, RecordFieldKey, AudienceMode } from '@/knowledge/schema';
import { RECORD_FIELD_KEYS, resolveField } from '@/knowledge/schema';

export interface Chunk { id: string; structureId: string; structureName: string; fieldKey: RecordFieldKey; text: string; citationIds: string[] }

const FIELD_LABEL: Record<RecordFieldKey, string> = {
  name: 'Name', alternativeNames: 'Alternative names', latinName: 'Latin name', category: 'Category', description: 'Description',
  function: 'Function', relations: 'Relations', bloodSupply: 'Blood supply', venousDrainage: 'Venous drainage',
  lymphaticDrainage: 'Lymphatic drainage', innervation: 'Innervation', histology: 'Histology', embryology: 'Embryology',
  physiology: 'Physiology', clinicalSignificance: 'Clinical significance', surgicalRelevance: 'Surgical relevance',
  commonDiseases: 'Common diseases', radiologicalCorrelation: 'Radiological correlation', examinationPearls: 'Examination pearls', references: 'References',
};

export function flattenValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(flattenValue).filter(Boolean).join('; ');
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([k]) => !['structureId', 'slideIds', 'stageIds', 'simulationIds', 'competencyCodes', 'pathologyPairId', 'imagingCaseId', 'sliceIndex'].includes(k))
      .map(([k, val]) => { const t = flattenValue(val); return t ? (k === 'text' || k === 'value' || k === 'name' || k === 'title' ? t : `${k}: ${t}`) : ''; })
      .filter(Boolean).join('; ');
  }
  return '';
}

/** Chunk a record per field for the given audience mode (hidden fields are not chunked). */
export function chunkRecord(rec: KnowledgeRecord, mode: AudienceMode): Chunk[] {
  const name = rec.fields.name.value;
  const out: Chunk[] = [];
  for (const key of RECORD_FIELD_KEYS) {
    if (key === 'references' || key === 'name' || key === 'category') continue;
    const value = resolveField(rec.fields, key, mode);
    const text = flattenValue(value);
    if (!text) continue;
    const citationIds = rec.fields[key].citations.map((c, i) => `${rec.structureId}:${key}:${i}`);
    out.push({ id: `${rec.structureId}:${key}`, structureId: rec.structureId, structureName: name, fieldKey: key, text: `${name} — ${FIELD_LABEL[key]}: ${text}`, citationIds });
  }
  return out;
}

const tokenize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t.length > 1);
const STOP = new Set(['the', 'of', 'and', 'in', 'to', 'is', 'what', 'which', 'does', 'do', 'a', 'an', 'are', 'it', 'its', 'for', 'on', 'by', 'with', 'from', 'that', 'this', 'how', 'why', 'me', 'tell', 'about', 'explain']);

export class Bm25Index {
  private docs: { chunk: Chunk; tf: Map<string, number>; len: number }[] = [];
  private df = new Map<string, number>();
  private avgLen = 0;
  constructor(chunks: Chunk[], private k1 = 1.4, private b = 0.75) {
    // Bilateral structures share a record; index each distinct text once so a paired
    // structure does not crowd out other results.
    const seen = new Set<string>();
    for (const c of chunks) {
      if (seen.has(c.text)) continue;
      seen.add(c.text);
      const toks = tokenize(c.text).filter((t) => !STOP.has(t));
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      this.docs.push({ chunk: c, tf, len: toks.length });
    }
    this.avgLen = this.docs.reduce((a, d) => a + d.len, 0) / Math.max(1, this.docs.length);
  }
  search(query: string, limit = 6): { chunk: Chunk; score: number }[] {
    const q = tokenize(query).filter((t) => !STOP.has(t));
    const N = this.docs.length;
    const scored = this.docs.map((d) => {
      let s = 0;
      for (const t of q) {
        const tf = d.tf.get(t) ?? 0;
        if (!tf) continue;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        s += idf * ((tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + (this.b * d.len) / this.avgLen)));
      }
      return { chunk: d.chunk, score: s };
    });
    return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

/** Minimum relevance to answer at all (FR-T2). Calibrated on tests/evals/tutor. */
export const RETRIEVAL_THRESHOLD = 1.0;
