"""Lower-leg fit numbers: depth of tibia/fibula/shank muscles inside the skin, and joint gaps (knee: femur-tibia, ankle: tibia-talus) per side.
usage: python3 scripts/qa/legfit.py [dump_dir]"""
import sys, os, numpy as np
if len(sys.argv) > 1: os.environ['QA_DUMP'] = sys.argv[1]
sys.path.insert(0, os.path.dirname(__file__))
from render import Scene
from outside import Loaded
from scipy.spatial import cKDTree
def run(body, s):
    sc = Scene(body); S = Loaded(f'/workspace/qa/solid-{s}.pkl')
    V = lambda i: sc.mesh(sc.by[i])[0].astype(float) if i in sc.by else None
    for side in 'lr':
        out = []
        for nm in ('tibia', 'fibula'):
            v = V(f'{nm}-{side}')
            if v is None: continue
            d = S.query(v); out.append(f'{nm} depth inside skin: shallowest 5% {np.percentile(d,5)*1000:5.1f} mm, median {np.median(d)*1000:5.1f} mm')
        fem, tib, tal = V(f'femur-{side}'), V(f'tibia-{side}'), V(f'talus-{side}')
        if fem is not None and tib is not None:
            kn = cKDTree(tib).query(fem)[0].min() * 1000; out.append(f'knee gap {kn:4.1f} mm')
        if tib is not None and tal is not None:
            an = cKDTree(tal).query(tib)[0].min() * 1000; out.append(f'ankle gap {an:4.1f} mm')
        if tib is not None:
            # lower leg length vs femur (ratio ~0.80-0.85 in adults)
            out.append(f'tibia length {np.ptp(tib[:,1])*1000:4.0f} mm' + (f' femur {np.ptp(fem[:,1])*1000:4.0f} mm' if fem is not None else ''))
        # centring: horizontal offset between the shank bones' centroid and the centroid of that leg's skin cross-section, in 5 slices from knee to ankle
        if tib is not None:
            fib = V(f'fibula-{side}'); B = np.vstack([tib] + ([fib] if fib is not None else []))
            y0, y1 = tib[:, 1].min() + 0.03, tib[:, 1].max() - 0.04; offs = []
            xs = (np.arange(S.inside.shape[0]) * S.h + S.lo[0]); ys = (np.arange(S.inside.shape[1]) * S.h + S.lo[1]); zs = (np.arange(S.inside.shape[2]) * S.h + S.lo[2])
            sg = 1 if side == 'l' else -1
            for y in np.linspace(y0, y1, 5):
                j = int(round((y - S.lo[1]) / S.h)); sl = S.inside[:, j, :] & (sg * xs[:, None] > 0.02)
                if not sl.any(): continue
                ii, kk = np.nonzero(sl); c = np.array([xs[ii].mean(), zs[kk].mean()])
                m = np.abs(B[:, 1] - y) < 0.01
                if m.any(): offs.append(np.linalg.norm(B[m][:, [0, 2]].mean(0) - c) * 1000)
            out.append('bone-vs-leg-section centroid offset mm ' + ' '.join(f'{o:.0f}' for o in offs))
        print(f'{body:6s} {side}: ' + '; '.join(out))
if __name__ == '__main__':
    for b, s in (('male', 'm'), ('female', 'f')): run(b, s)
