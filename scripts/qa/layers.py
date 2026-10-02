"""Cross-layer alignment checks on the decoded merged body: containment (brain in skull, heart/lungs in the rib cage…)
and joint contact (femoral head to acetabulum, humeral head to glenoid, teeth to jaw)."""
import numpy as np, sys
from scipy.spatial import Delaunay, cKDTree
from render import Scene
def verts(sc, pred):
    V = [sc.mesh(e)[0].astype(float) for e in sc.idx if pred(e) and e['nt'] > 0]
    return np.vstack(V) if V else np.zeros((0, 3))
def frac_inside(P, hullpts):
    return float((Delaunay(hullpts).find_simplex(P) >= 0).mean())
def run(body):
    sc = Scene(body); ids = lambda *n: (lambda e: e['id'] in n)
    sk = lambda e: e['group'] == 'skeleton'
    skull = verts(sc, lambda e: sk(e) and e['id'] in ('frontal-bone', 'occipital-bone', 'sphenoid-bone', 'ethmoid-bone', 'parietal-bone-l', 'parietal-bone-r', 'temporal-bone-l', 'temporal-bone-r', 'mandible', 'maxilla-l', 'maxilla-r', 'zygomatic-bone-l', 'zygomatic-bone-r'))
    ribs = verts(sc, lambda e: sk(e) and ('-rib-' in e['id'] or e['id'] in ('body-of-sternum', 'manubrium-of-sternum') or e['id'].startswith('vertebra-t')))
    res = {}
    res['brain in skull'] = frac_inside(verts(sc, ids('brain')), skull)
    res['heart in rib cage'] = frac_inside(verts(sc, ids('heart')), ribs)
    for s in 'lr':
        res[f'lung-{s} in rib cage'] = frac_inside(verts(sc, ids(f'lung-{s}')), ribs)
    res['trachea y-range inside neck/chest hull'] = frac_inside(verts(sc, ids('trachea')), np.vstack([ribs, skull]))
    # joint contact: distance from the femoral head (top 1.5 cm of the femur) to the hip bone, humeral head to scapula
    for s in 'lr':
        fem = verts(sc, ids(f'bone-femur-{s}')); head = fem[fem[:, 1] > fem[:, 1].max() - 0.015]
        hip = verts(sc, ids(f'hip-bone-{s}')); res[f'femoral head-{s} to acetabulum (mm, median)'] = 1000 * float(np.median(cKDTree(hip).query(head)[0]))
        hum = verts(sc, ids(f'bone-humerus-{s}')); hh = hum[hum[:, 1] > hum[:, 1].max() - 0.02]
        sca = verts(sc, ids(f'scapula-{s}')); res[f'humeral head-{s} to scapula (mm, median)'] = 1000 * float(np.median(cKDTree(sca).query(hh)[0]))
        # patella in front of the femur, between femur and tibia in y
        pat = verts(sc, ids(f'patella-{s}')).mean(0); tib = verts(sc, ids(f'tibia-{s}')); res[f'patella-{s} gap to tibia top (mm)'] = 1000 * float(pat[1] - tib[:, 1].max())
        # teeth in jaw: upper teeth centroid between maxilla and mandible
        eye = verts(sc, ids(f'eye-{s}', f'eyeball-{s}'))
        if len(eye): res[f'eye-{s} centre in skull hull'] = frac_inside(eye.mean(0)[None], skull)
    # skin contains everything real in the thorax: kidneys, liver, stomach inside the skin solid is covered by outside.py
    kid = {s: verts(sc, ids(f'kidney-{s}')) for s in 'lr'}
    sp = verts(sc, lambda e: sk(e) and e['id'].startswith('vertebra-l'))
    for s in 'lr': res[f'kidney-{s} lateral offset from lumbar spine (cm)'] = 100 * float(abs(kid[s].mean(0)[0] - sp.mean(0)[0]))
    return res
if __name__ == '__main__':
    for b in ('male', 'female'):
        print(b)
        for k, v in run(b).items(): print('  %-48s %.3f' % (k, v))
