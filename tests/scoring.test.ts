import { describe, expect, it } from 'vitest';
import { scoreTypedAnswer, scoreMultiSelect, scoreHotspot, itemAnalysis, scoreChecklist } from '@/modules/assessment/scoring';
import { updateMastery, nextInterval } from '@/modules/assessment/mastery';

describe('typed answer scoring', () => {
  const key = { accepted: ['Left kidney', 'ren'], requireLaterality: true, tolerateTypos: true };
  it.each([
    ['left kidney', true, 1], ['Left Kidney ', true, 1], ['lt kidney', true, 1], ['left kidny', true, 1],
    ['right kidney', false, 0.5], ['kidney', false, 0.5], ['left liver', false, 0], ['', false, 0],
  ])('%s → correct=%s score=%s', (resp, correct, score) => {
    const r = scoreTypedAnswer(resp, key);
    expect(r.correct).toBe(correct); expect(r.score).toBe(score);
  });
  it('accepts synonyms and Latin without laterality when not required', () => {
    expect(scoreTypedAnswer('cor', { accepted: ['Heart', 'cor'] }).correct).toBe(true);
  });
  it('does not accept typos in short words', () => {
    expect(scoreTypedAnswer('corr', { accepted: ['cor'], tolerateTypos: true }).correct).toBe(false);
  });
});

describe('other scorers', () => {
  it('multi-select penalises wrong picks', () => {
    expect(scoreMultiSelect(['a', 'b'], ['a', 'b']).score).toBe(1);
    expect(scoreMultiSelect(['a', 'c'], ['a', 'b']).score).toBe(0);
    expect(scoreMultiSelect(['a'], ['a', 'b']).score).toBe(0.5);
  });
  it('hotspot point-in-polygon', () => {
    const sq: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(scoreHotspot([0.5, 0.5], sq).correct).toBe(true);
    expect(scoreHotspot([1.5, 0.5], sq).correct).toBe(false);
  });
  it('checklist weights', () => { expect(scoreChecklist(['a'], [{ id: 'a', weight: 2 }, { id: 'b', weight: 1 }])).toMatchObject({ score: 2, max: 3 }); });
  it('item analysis discriminates', () => {
    const rows = [...Array(20)].map((_, i) => ({ itemScore: i < 10 ? 1 : 0, totalScore: i < 10 ? 18 : 9 }));
    const a = itemAnalysis(rows); expect(a.p).toBe(0.5); expect(a.discrimination).toBeGreaterThan(0.9);
  });
});

describe('mastery (BKT)', () => {
  it('rises on correct and falls on incorrect', () => {
    const up = updateMastery(0.3, true), down = updateMastery(0.3, false);
    expect(up).toBeGreaterThan(0.3); expect(down).toBeLessThan(0.3);
  });
  it('spacing grows with mastery and streak', () => { expect(nextInterval(0.9, 3)).toBeGreaterThan(nextInterval(0.6, 0)); expect(nextInterval(0.2, 5)).toBe(1); });
});
