"""Skull vs brain: percent of HRA brain vertices inside the cranial-vault convex hull, worst exceedance, and the vault/brain extents.
usage: python3 scripts/qa/headfit.py [dump_dir]   (dump from scripts/qa/dump.ts)"""
import sys, os, numpy as np
if len(sys.argv) > 1: os.environ['QA_DUMP'] = sys.argv[1]
sys.path.insert(0, os.path.dirname(__file__))
from render import Scene
from scipy.spatial import ConvexHull
VAULT = ['frontal-bone', 'occipital-bone', 'parietal-bone-l', 'parietal-bone-r', 'temporal-bone-l', 'temporal-bone-r', 'sphenoid-bone']
def run(body):
    sc = Scene(body)
    C = np.vstack([sc.mesh(sc.by[i])[0] for i in VAULT if i in sc.by]).astype(float)
    regions = [e for e in sc.idx if e.get('group') == 'brain-regions' and e['nt']]
    B = np.vstack([sc.mesh(e)[0] for e in regions]).astype(float)
    h = ConvexHull(C); d = (B @ h.equations[:, :3].T + h.equations[:, 3]).max(1)    # signed distance to hull, + = outside
    core = sc.by.get('brain'); core_in = None
    if core is not None and core['nt']:
        Bc = sc.mesh(core)[0].astype(float); dc = (Bc @ h.equations[:, :3].T + h.equations[:, 3]).max(1); core_in = float((dc < 0).mean())
    ext = lambda P: (P.max(0) - P.min(0)) * 1000
    print(f'{body}: brain-region vertices inside vault hull {100*(d<0).mean():.2f} %  (n={len(B)}, regions={len(regions)}), >2 mm outside: {100*(d>0.002).mean():.2f} %, worst exceed {max(0,d.max())*1000:.1f} mm; '
          + (f'core brain aggregate inside {100*core_in:.2f} %; ' if core_in is not None else '') + f'vault extent mm {ext(C).round(0).tolist()}, brain extent mm {ext(B).round(0).tolist()}, vault-minus-brain mm {(ext(C)-ext(B)).round(0).tolist()}')
if __name__ == '__main__':
    for b in ('male', 'female'): run(b)
