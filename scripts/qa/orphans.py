"""Left/right orphans: structures whose id ends -l / -r although the other side is missing from the merged (core + detail) manifests.
Reports each one with the reason it is accepted (the source really has one side only), or flags it as unexplained.
usage: python3 scripts/qa/orphans.py [--strict]     (--strict: exit 1 when an unexplained orphan exists)"""
import json, re, sys, os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
# id -> why the other side does not exist in the open sources (verified against /workspace/sources listings, 2026-10-03)
ACCEPTED = {
    r'^(intermediate|middle-lobar)-bronchus-r$': 'right lung only: the left lung has two lobes, so there is no left intermediate or middle lobar bronchus',
    r'^(major-calyx-[a-z]|minor-calyx-[a-z]|renal-(pyramid|papilla)-[a-z])-[lr]$': 'HRA kidneys have different numbers of calyces/pyramids (e.g. female left 11 pyramids, right 10); the extra item has no partner by anatomy',
    r'^ligament-cricopharyngeal-ligament-[lr]$': 'only one side is modelled in the source',
}
def main():
    bad = 0
    for body in ('male', 'female'):
        ids = {}
        for pk in ('hra-v1', 'anatomy-v2'):
            for s in json.load(open(f'{ROOT}/public/assets/{pk}/{body}.manifest.json'))['structures']: ids[s['id']] = s
        orphans = [i for i in ids if re.search(r'-[lr]$', i) and (i[:-1] + ('r' if i.endswith('l') else 'l')) not in ids]
        print(f'{body}: {len(orphans)} orphan -l/-r ids')
        for i in sorted(orphans):
            why = next((w for rx, w in ACCEPTED.items() if re.search(rx, i)), None)
            if not why: bad += 1
            print(f'  {i:75s} {"accepted: " + why if why else "UNEXPLAINED"}')
    print('unexplained:', bad)
    if '--strict' in sys.argv and bad: sys.exit(1)
if __name__ == '__main__': main()
