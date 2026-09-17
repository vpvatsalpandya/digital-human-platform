/** Generates THIRD_PARTY_NOTICES.md from node_modules package metadata. */
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = join(process.cwd(), 'node_modules');
const rows: string[] = [];
function scan(dir: string, prefix = '') {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (name.startsWith('@') && !prefix) { scan(p, name + '/'); continue; }
    const pkg = join(p, 'package.json');
    if (!existsSync(pkg)) continue;
    try { const j = JSON.parse(readFileSync(pkg, 'utf8')); rows.push(`| ${prefix}${name} | ${j.version ?? ''} | ${typeof j.license === 'string' ? j.license : j.license?.type ?? 'UNKNOWN'} |`); } catch { /* ignore */ }
  }
}
scan(root);
writeFileSync('THIRD_PARTY_NOTICES.md', `# Third-party notices\n\n| Package | Version | Licence |\n|---|---|---|\n${rows.sort().join('\n')}\n`);
console.log(`wrote ${rows.length} entries`);
