"""Find structures that are (nearly) coincident with another structure: z-fighting / duplicated meshes.
Samples surface points per structure and reports pairs where >= minfrac of one's points lie within `tol` of the other's."""
import sys, json, numpy as np, collections
from scipy.spatial import cKDTree
from render import Scene
def run(body, tol=0.0008, minfrac=0.5, per=250):
    sc = Scene(body); rng = np.random.default_rng(0)
    P, L = [], []; ents = [e for e in sc.idx if e['nt'] > 0 and e.get('category') != 'skin layer' and e['id'] != 'skin']
    for k, e in enumerate(ents):
        v, t = sc.mesh(e); v = v.astype(float)
        a, b, c = v[t[:, 0]], v[t[:, 1]], v[t[:, 2]]; ar = np.linalg.norm(np.cross(b - a, c - a), axis=1)
        if ar.sum() == 0: continue
        i = rng.choice(len(t), per, p=ar / ar.sum()); r1, r2 = rng.random(per), rng.random(per); f = r1 + r2 > 1; r1[f], r2[f] = 1 - r1[f], 1 - r2[f]
        P.append(a[i] + (b - a)[i] * r1[:, None] + (c - a)[i] * r2[:, None]); L += [k] * per
    P = np.vstack(P); L = np.array(L); T = cKDTree(P)
    d, ix = T.query(P, k=6, distance_upper_bound=tol)
    cnt = collections.defaultdict(int)
    for j in range(P.shape[0]):
        seen = set()
        for dd, ii in zip(d[j], ix[j]):
            if not np.isfinite(dd): continue
            o = L[ii]
            if o != L[j] and o not in seen: seen.add(o); cnt[(L[j], o)] += 1
    out = []
    for (a, b), n in cnt.items():
        fr = n / per
        if fr >= minfrac: out.append((fr, ents[a]['id'], ents[a]['group'], ents[b]['id'], ents[b]['group']))
    out.sort(reverse=True); return out
if __name__ == '__main__':
    for body in ('male', 'female'):
        rows = run(body); print(body, len(rows))
        for r in rows[:50]: print('  %.2f %-45s [%s]  ~  %-45s [%s]' % r)
