/**
 * CI guard: every asset pack must declare a commercially usable licence and attribution
 * text (A-05). Fails the build otherwise, so a NonCommercial pack cannot ship.
 */
import { readFileSync } from 'node:fs';
const ALLOWED = new Set(['MIT', 'Apache-2.0', 'BSD-3-Clause', 'CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0', 'CC-BY-SA-2.1-JP', 'CC-BY-SA-4.0', 'Slicer', 'NLM-Terms', 'proprietary-licensed']);
const idx = JSON.parse(readFileSync(new URL('../content/manifests/index.json', import.meta.url), 'utf8')) as { packs: { pack: string; licence: string; attribution: string }[] };
let bad = 0;
for (const p of idx.packs) {
  if (!ALLOWED.has(p.licence)) { console.error(`✗ ${p.pack}: licence ${p.licence} is not commercially usable`); bad++; }
  if (!p.attribution || p.attribution.length < 10) { console.error(`✗ ${p.pack}: missing attribution`); bad++; }
  if (/NC|ND/.test(p.licence)) { console.error(`✗ ${p.pack}: NonCommercial/NoDerivatives licences are excluded`); bad++; }
}
if (bad) process.exit(1);
console.log(`✓ ${idx.packs.length} packs validated`);
