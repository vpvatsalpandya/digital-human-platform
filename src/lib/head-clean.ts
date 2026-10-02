/**
 * Netlify rewrites the HTML of every page it serves on *.netlify.app and inserts a promotional comment into <head>,
 * right after the charset <meta>, together with a bare newline. The comment is harmless (React's hydration skips comments)
 * but the newline is a stray whitespace text node: React 19 hydrates <head> as a singleton, finds a text node where it expects
 * the next element and throws minified error #418 on every page, on Netlify only. We cannot stop the host injecting it, so this
 * inline script runs while <head> is still being parsed (before any chunk loads, so before hydration) and removes whitespace-only
 * text nodes that sit directly in <head>. It is a no-op everywhere else (no such nodes exist).
 */
export function stripHeadWhitespace(head: { firstChild: unknown }): number {
  type N = { nodeType: number; nodeValue: string | null; nextSibling: N | null; parentNode: { removeChild(n: N): unknown } | null };
  let removed = 0;
  for (let n = head.firstChild as N | null; n;) {
    const next: N | null = n.nextSibling;
    if (n.nodeType === 3 && !(n.nodeValue ?? '').trim()) { n.parentNode?.removeChild(n); removed++; }
    n = next;
  }
  return removed;
}

/** Same logic as a self-contained string for an inline <script> in <head>. */
export const HEAD_CLEAN_SCRIPT =
  '(function(){var h=document.head;if(!h)return;for(var n=h.firstChild;n;){var x=n.nextSibling;if(n.nodeType===3&&!(n.nodeValue||"").trim())h.removeChild(n);n=x}})()';
