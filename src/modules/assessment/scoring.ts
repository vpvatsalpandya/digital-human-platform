/**
 * Deterministic scoring (ADR-013). Pure functions; table-driven tests in tests/scoring.
 */
import { norm, boundedEditDistance } from '@/engine/search';

export interface TypedAnswerKey {
  /** canonical accepted answers; synonyms included */
  accepted: string[];
  /** whether laterality must match ("left"/"right") */
  requireLaterality?: boolean;
  /** allow small typos (edit distance ≤ 1 for ≥ 6 chars, ≤ 2 for ≥ 10) */
  tolerateTypos?: boolean;
}

export interface ScoreResult { correct: boolean; score: number; max: number; matched?: string; reason?: string }

const LATERAL = /\b(left|right|lt|rt|l|r)\b/;

export function scoreTypedAnswer(response: string, key: TypedAnswerKey, max = 1): ScoreResult {
  const r = norm(response);
  if (!r) return { correct: false, score: 0, max, reason: 'empty' };
  const respLat = lateralityOf(r);
  for (const a of key.accepted) {
    const na = norm(a);
    const keyLat = lateralityOf(na);
    const rCore = stripLaterality(r), aCore = stripLaterality(na);
    let matches = rCore === aCore;
    if (!matches && key.tolerateTypos) {
      const tol = aCore.length >= 10 ? 2 : aCore.length >= 6 ? 1 : 0;
      matches = tol > 0 && boundedEditDistance(rCore, aCore, tol) <= tol;
    }
    if (!matches) continue;
    if (key.requireLaterality && keyLat && respLat !== keyLat) {
      return { correct: false, score: max * 0.5, max, matched: a, reason: 'wrong_or_missing_laterality' };
    }
    return { correct: true, score: max, max, matched: a };
  }
  return { correct: false, score: 0, max, reason: 'no_match' };
}

function lateralityOf(s: string): 'left' | 'right' | null {
  const m = s.match(LATERAL);
  if (!m) return null;
  return m[1]?.startsWith('l') ? 'left' : 'right';
}
function stripLaterality(s: string) { return s.replace(LATERAL, '').replace(/\s+/g, ' ').trim(); }

export function scoreMcq(response: string | null, correctOptionId: string, max = 1): ScoreResult {
  const correct = response === correctOptionId;
  return { correct, score: correct ? max : 0, max };
}

/** Multi-select: +1/k per correct, −1/k per incorrect, floor 0 (discourages guessing). */
export function scoreMultiSelect(response: string[], correctIds: string[], max = 1): ScoreResult {
  const k = correctIds.length || 1;
  const set = new Set(correctIds);
  let s = 0;
  for (const r of response) s += set.has(r) ? 1 / k : -1 / k;
  const score = Math.max(0, Math.min(1, s)) * max;
  return { correct: score === max, score, max };
}

/** Hotspot: point-in-polygon on normalised coordinates. */
export function scoreHotspot(point: [number, number], polygon: [number, number][], max = 1): ScoreResult {
  const inside = pointInPolygon(point, polygon);
  return { correct: inside, score: inside ? max : 0, max };
}

export function pointInPolygon([x, y]: [number, number], poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Checklist (practical/OSPE/OSCE): weighted items, examiner-ticked. */
export function scoreChecklist(ticked: string[], items: { id: string; weight: number }[]): ScoreResult {
  const max = items.reduce((a, i) => a + i.weight, 0);
  const t = new Set(ticked);
  const score = items.filter((i) => t.has(i.id)).reduce((a, i) => a + i.weight, 0);
  return { correct: score === max, score, max };
}

/** Classical item analysis: difficulty (p) and point-biserial discrimination. */
export function itemAnalysis(rows: { itemScore: number; totalScore: number }[]): { p: number; discrimination: number; n: number } {
  const n = rows.length;
  if (n === 0) return { p: 0, discrimination: 0, n };
  const p = rows.reduce((a, r) => a + r.itemScore, 0) / n;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const item = rows.map((r) => r.itemScore), total = rows.map((r) => r.totalScore);
  const mi = mean(item), mt = mean(total);
  const cov = rows.reduce((a, r) => a + (r.itemScore - mi) * (r.totalScore - mt), 0) / n;
  const sd = (xs: number[], m: number) => Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / n);
  const d = sd(item, mi) * sd(total, mt);
  return { p, discrimination: d === 0 ? 0 : cov / d, n };
}
