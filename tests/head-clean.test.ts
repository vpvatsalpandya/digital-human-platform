import { describe, it, expect } from 'vitest';
import { stripHeadWhitespace, HEAD_CLEAN_SCRIPT } from '@/lib/head-clean';

// minimal DOM: <head> = meta, "\n", <!-- comment -->, meta, "  ", <title>
function fakeHead() {
  const mk = (nodeType: number, nodeValue: string | null) => ({ nodeType, nodeValue, nextSibling: null as unknown, parentNode: null as unknown });
  const kids = [mk(1, null), mk(3, '\n'), mk(8, ' This site is hosted on Netlify '), mk(1, null), mk(3, '  '), mk(1, null), mk(3, 'real text')];
  const head: { firstChild: unknown; removeChild(n: unknown): void; kids: typeof kids } = {
    firstChild: kids[0], kids,
    removeChild(n) { const i = head.kids.indexOf(n as never); if (i < 0) return; const prev = head.kids[i - 1]; head.kids.splice(i, 1); if (prev) prev.nextSibling = head.kids[i] ?? null; else head.firstChild = head.kids[i] ?? null; },
  };
  kids.forEach((k, i) => { k.nextSibling = kids[i + 1] ?? null; k.parentNode = head; });
  return head;
}

describe('Netlify head injection (hydration #418)', () => {
  it('removes whitespace-only text nodes from <head> and keeps elements, comments and real text', () => {
    const h = fakeHead();
    expect(stripHeadWhitespace(h)).toBe(2);
    expect(h.kids.map((k) => k.nodeType)).toEqual([1, 8, 1, 1, 3]);
  });
  it('the inline script does the same thing', () => {
    const h = fakeHead();
    new Function('document', HEAD_CLEAN_SCRIPT)({ head: h });
    expect(h.kids.map((k) => k.nodeType)).toEqual([1, 8, 1, 1, 3]);
  });
});
