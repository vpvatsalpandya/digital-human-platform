"""Containment and clearance of the gap-fill stand-ins (schematic/gaps.ts): breast, male urethra parts and glands, body cavities.

  python3 scripts/qa/gapcheck.py            (reads /workspace/qa/dump from scripts/qa/dump.ts and the skin solids /workspace/qa/solid-{m,f}.pkl)

For every new id: vertices, % of vertices more than 4 mm outside the united skin (must stay below 20 %, in practice 0) and the real structures whose
vertices come within 1 mm of the shape (a proxy for "clear of its neighbours"; membranes and cavities necessarily wrap or touch their neighbours, so they
are listed, not failed). Muscle, fascia, skin layers and other generated shapes are ignored.
"""
import sys, pickle, collections, numpy as np
sys.path.insert(0, '/workspace/digital-human-platform/scripts/assets/extract'); sys.path.insert(0, '/workspace/digital-human-platform/scripts/qa')
from render import Scene
from outside import Loaded
from scipy.spatial import cKDTree

NEW = {
    'both': ['pericardial-cavity', 'transverse-pericardial-sinus', 'oblique-pericardial-sinus', 'omental-bursa', 'retropubic-space', 'tympanic-cavity-l', 'tympanic-cavity-r'],
    'female': ['breast-envelope-l', 'breast-envelope-r', 'suspensory-ligaments-of-breast-l', 'suspensory-ligaments-of-breast-r', 'lactiferous-ducts-l', 'lactiferous-ducts-r',
               'axillary-tail-of-breast-l', 'axillary-tail-of-breast-r', 'rectouterine-pouch', 'vesicouterine-pouch'],
    'male': ['bulbar-part-of-male-urethra', 'penile-part-of-male-urethra', 'bulbourethral-gland-l', 'bulbourethral-gland-r', 'duct-of-bulbourethral-gland-l', 'duct-of-bulbourethral-gland-r', 'rectovesical-pouch'],
}
IGN_CAT = ('muscle', 'fascia', 'skin layer', 'hair', 'nail', 'tendon sheath', 'bursa', 'brain region', 'lymph node')

def main():
    for body, s in (('male', 'm'), ('female', 'f')):
        sc = Scene(body); S = Loaded(f'/workspace/qa/solid-{s}.pkl')
        real = [e for e in sc.idx if e['nt'] and e.get('provenance') not in ('generated', 'procedural') and e.get('category') not in IGN_CAT and e['id'] not in ('skin', 'rib-cage')]
        pts, who = [], []
        for e in real:
            v, _ = sc.mesh(e); pts.append(v); who.extend([e['id']] * len(v))
        tree = cKDTree(np.concatenate(pts)); who = np.array(who)
        print(f'== {body}')
        worst = 0
        for i in NEW['both'] + NEW[body]:
            e = sc.by.get(i)
            if not e: print(f'  MISSING {i}'); continue
            v, _ = sc.mesh(e); q = S.query(v.astype(float)); out = float((q < -0.004).mean()); worst = max(worst, out)
            d, k = tree.query(v, distance_upper_bound=0.001)
            hit = collections.Counter(who[k[np.isfinite(d)]])
            ext = (v.max(0) - v.min(0)) * 1000
            print('  %-36s nv %5d  size %3.0fx%3.0fx%3.0f mm  outside-skin %4.1f%%  within 1 mm of real: %4.1f%%  %s' % (i, len(v), ext[0], ext[1], ext[2], out * 100, 100 * np.isfinite(d).mean(), dict(hit.most_common(3))))
        print(f'  worst outside-skin share: {worst * 100:.1f} %')
main()
