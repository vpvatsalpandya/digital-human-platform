import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { AudienceMode } from '@/knowledge/schema';
import { SEED_RECORDS } from '@/knowledge/seed';
import { SOURCES } from '@/knowledge/sources';
import { Bm25Index, chunkRecord, RETRIEVAL_THRESHOLD, type Chunk } from './retrieval';
import { REFUSAL, systemPrompt, userPrompt, validateCitations } from './prompts';

export interface TutorAnswer {
  answer: string;
  refused: boolean;
  citations: { n: number; structureId: string; fieldKey: string; sources: string[] }[];
  mode: 'llm' | 'extracts-only';
}

const indexByMode = new Map<AudienceMode, Bm25Index>();
function indexFor(mode: AudienceMode): Bm25Index {
  let idx = indexByMode.get(mode);
  if (!idx) {
    // Production: only status === 'published'. Development seed is in_review, so we allow it
    // and label the UI accordingly.
    const chunks = SEED_RECORDS.flatMap((r) => chunkRecord(r, mode));
    idx = new Bm25Index(chunks);
    indexByMode.set(mode, idx);
  }
  return idx;
}

function citationsFor(chunks: Chunk[]) {
  return chunks.map((c, i) => {
    const rec = SEED_RECORDS.find((r) => r.structureId === c.structureId)!;
    const sources = rec.fields[c.fieldKey].citations.map((ct) => `${SOURCES[ct.sourceId]?.title ?? ct.sourceId} — ${ct.locator}`);
    return { n: i + 1, structureId: c.structureId, fieldKey: c.fieldKey, sources };
  });
}

/**
 * RAG-only tutor (ADR-009). Retrieval gates everything: below threshold → refusal with the
 * nearest records. With no API key the service returns the extracts themselves so the
 * product is still useful (and testable) without any model.
 */
export async function answer(question: string, mode: AudienceMode, structureId?: string): Promise<TutorAnswer> {
  const idx = indexFor(mode);
  const boosted = structureId ? `${question} ${structureId.replace(/-/g, ' ')}` : question;
  const hits = idx.search(boosted, 6);
  const strong = hits.filter((h) => h.score >= RETRIEVAL_THRESHOLD);
  if (!strong.length) {
    const nearest = [...new Set(hits.map((h) => h.chunk.structureName))].slice(0, 3);
    return { answer: `${REFUSAL}${nearest.length ? ` The reviewed records nearest to your question cover: ${nearest.join(', ')}.` : ''}`, refused: true, citations: [], mode: 'extracts-only' };
  }
  const chunks = strong.map((h) => h.chunk);
  const citations = citationsFor(chunks);

  if (!process.env.ANTHROPIC_API_KEY) {
    const text = chunks.map((c, i) => `${c.text} [${i + 1}]`).join('\n\n');
    return { answer: text, refused: false, citations, mode: 'extracts-only' };
  }

  const client = new Anthropic();
  const context = structureId ? `learner is viewing structure "${structureId}"` : undefined;
  try {
    const res = await client.messages.create({
      model: process.env.TUTOR_MODEL || 'claude-opus-5',
      max_tokens: 4000,
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: systemPrompt(mode), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt(question, chunks.map((c) => c.text), context) }],
    });
    if (res.stop_reason === 'refusal') return { answer: REFUSAL, refused: true, citations: [], mode: 'llm' };
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (text.startsWith(REFUSAL)) return { answer: text, refused: true, citations: [], mode: 'llm' };
    const v = validateCitations(text, chunks.length);
    if (!v.ok) {
      // Uncited output never reaches a learner (FR-T1). Fall back to the extracts.
      return { answer: chunks.map((c, i) => `${c.text} [${i + 1}]`).join('\n\n'), refused: false, citations, mode: 'extracts-only' };
    }
    return { answer: text, refused: false, citations: citations.filter((c) => v.used.includes(c.n)), mode: 'llm' };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.APIConnectionError) {
      return { answer: chunks.map((c, i) => `${c.text} [${i + 1}]`).join('\n\n'), refused: false, citations, mode: 'extracts-only' };
    }
    throw err;
  }
}
