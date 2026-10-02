"""Evaluate the curated checklist (gap-checklist.py) against the shipped manifests."""
import json, re, importlib.util, os
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gap_checklist', f'{HERE}/gap-checklist.py'); ck = importlib.util.module_from_spec(spec); spec.loader.exec_module(ck)
REAL = ('hra', 'bp3d', 'zanatomy', 'openear', 'iemap')

def merged(root, body):
    core = json.load(open(f'{root}/public/assets/hra-v1/{body}.manifest.json'))['structures']
    det = json.load(open(f'{root}/public/assets/anatomy-v2/{body}.manifest.json'))['structures']
    up = {s['id'] for s in det if s.get('group') == 'core-upgrades'}
    return [s for s in core if s['id'] not in up] + det

def matches(spec_s, sid):
    """`a|b` alternatives; trailing `*` = prefix; leading `~` = substring; otherwise the id, or the id + a side / part suffix."""
    for alt in spec_s.split('|'):
        alt = alt.strip()
        if alt.endswith('*'):
            if sid.startswith(alt[:-1]): return True
        elif alt.startswith('~'):
            if alt[1:] in sid: return True
        elif sid == alt or sid.startswith(alt + '-'):
            return True
    return False

def evaluate(root, body):
    st = merged(root, body)
    out = {}
    for system, items in ck.CHECK.items():
        rows = []
        for label, spec_s in items:
            if ck.SEX.get(label) and ck.SEX[label] != body:
                rows.append((label, spec_s, 'n/a', 0, 0)); continue
            hit = [s for s in st if matches(spec_s, s['id'])]
            real = [s for s in hit if s.get('provenance') in REAL]
            sch = [s for s in hit if s.get('provenance') in ('generated', 'procedural') and (str(s.get('category', '')).startswith('schematic') or s.get('category') == 'skin layer')]
            status = 'real' if real else 'schematic' if sch else 'missing'
            rows.append((label, spec_s, status, len(real), len(sch)))
        out[system] = rows
    return out

if __name__ == '__main__':
    import sys
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    for body in ('male', 'female'):
        ev = evaluate(root, body)
        print(body)
        for k, rows in ev.items():
            c = {s: sum(1 for r in rows if r[2] == s) for s in ('real', 'schematic', 'missing', 'n/a')}
            print(' ', k, c, [r[0] for r in rows if r[2] == 'missing'])
