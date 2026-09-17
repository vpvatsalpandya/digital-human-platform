import type { ManifestStructure } from './types';

/**
 * Client-side structure search (FR-E3): prefix > word-prefix > fuzzy (bounded edit
 * distance). Built once per manifest; sub-millisecond per query for ~5k structures.
 */
export interface SearchHit { structure: ManifestStructure; score: number; matched: string }

interface IndexEntry { key: string; structure: ManifestStructure; kind: 'name' | 'alias' | 'latin' | 'fma' }

export class StructureSearch {
  private entries: IndexEntry[] = [];

  constructor(structures: ManifestStructure[]) {
    for (const s of structures) {
      this.entries.push({ key: norm(s.name), structure: s, kind: 'name' });
      if (s.latinName) this.entries.push({ key: norm(s.latinName), structure: s, kind: 'latin' });
      if (s.fmaId) this.entries.push({ key: norm(s.fmaId), structure: s, kind: 'fma' });
      for (const a of s.aliases ?? []) this.entries.push({ key: norm(a), structure: s, kind: 'alias' });
    }
  }

  query(q: string, limit = 12): SearchHit[] {
    const nq = norm(q);
    if (!nq) return [];
    const best = new Map<string, SearchHit>();
    for (const e of this.entries) {
      let score = 0;
      if (e.key === nq) score = 100;
      else if (e.key.startsWith(nq)) score = 80 - (e.key.length - nq.length) * 0.2;
      else if (e.key.split(' ').some((w) => w.startsWith(nq))) score = 60;
      else if (e.key.includes(nq)) score = 40;
      else if (nq.length >= 4 && boundedEditDistance(nq, e.key.slice(0, nq.length + 1), 2) <= 2) score = 25;
      if (score <= 0) continue;
      if (e.kind === 'alias') score -= 2;
      if (e.kind === 'latin') score -= 1;
      const prev = best.get(e.structure.id);
      if (!prev || prev.score < score) best.set(e.structure.id, { structure: e.structure, score, matched: e.key });
    }
    return [...best.values()].sort((a, b) => b.score - a.score || a.structure.name.localeCompare(b.structure.name)).slice(0, limit);
  }
}

export function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Levenshtein with early exit above `max`. */
export function boundedEditDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length] ?? max + 1;
}
