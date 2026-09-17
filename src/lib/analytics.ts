'use client';
import { create } from 'zustand';

/** Learning events (FR-An1). Batched to /api/v1/events; in development kept in memory. */
export interface LearningEvent { type: string; payload: Record<string, unknown>; at: number }
interface AnalyticsState { queue: LearningEvent[]; track: (type: string, payload?: Record<string, unknown>) => void; flush: () => Promise<void> }

export const useAnalytics = create<AnalyticsState>((set, get) => ({
  queue: [],
  track: (type, payload = {}) => set((s) => ({ queue: [...s.queue, { type, payload, at: Date.now() }].slice(-500) })),
  flush: async () => {
    const q = get().queue;
    if (!q.length) return;
    try {
      await fetch('/api/v1/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: q }), keepalive: true });
      set({ queue: [] });
    } catch { /* keep queue for retry */ }
  },
}));

/** Aggregate a queue into per-system time and mastery-ish summaries for the dashboard. */
export function summariseEvents(events: LearningEvent[]) {
  const timeBySystem: Record<string, number> = {};
  let quizCorrect = 0, quizTotal = 0;
  const structuresViewed = new Set<string>();
  for (const e of events) {
    if (e.type === 'structure.view') {
      structuresViewed.add(String(e.payload.structureId));
      const sys = String(e.payload.system ?? 'unknown');
      timeBySystem[sys] = (timeBySystem[sys] ?? 0) + Number(e.payload.seconds ?? 0);
    }
    if (e.type === 'item.answer') { quizTotal += 1; if (e.payload.correct) quizCorrect += 1; }
  }
  return { timeBySystem, quizCorrect, quizTotal, structuresViewed: structuresViewed.size };
}
