"""
Register Z-Anatomy into each Human Reference Atlas body space.

Z-Anatomy and the HRA come from different subjects, so one similarity transform cannot line
them up: the vertebral levels differ by up to 2 cm and the HRA legs are set apart where
Z-Anatomy's are together. Registration therefore runs in three stages, all driven by named
structures present in both sources (vertebrae C1-L5, sacrum, hip bones, hyoid, laryngeal
cartilages, femur, tibia, fibula, patella):

  1. a global uniform scale + translation (least squares over landmark centres),
  2. a smooth displacement that follows the spine: dx, dy, dz as a function of height,
     interpolated between the vertebral centres so the Z-Anatomy column lands on the HRA one,
  3. per leg, a similarity transform (hip, knee, ankle, patella landmarks) blended in over the
     groin, so the Z-Anatomy leg takes the HRA leg's position.

Input : /workspace/sources/zanat/{index.json,objs/*.bin}, /workspace/sources/hra/objs-{m,f}
Output: <out>/{male,female}/{i}.bin (same raw format) + index.json + report.json
"""
import json, struct, sys, os
import numpy as np

SRC = '/workspace/sources'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/workspace/work/registered'

Z = json.load(open(f'{SRC}/zanat/index.json'))
zi = {}
for o in Z:
    if o['nt'] > 0: zi.setdefault(o['name'].strip(), o)

def load(d, i):
    b = open(f'{d}/{i}.bin', 'rb').read(); nv, nt = struct.unpack('<ii', b[:8])
    v = np.frombuffer(b, dtype=np.float32, count=nv * 3, offset=8).reshape(-1, 3).astype(np.float64)
    t = np.frombuffer(b, dtype=np.uint32, count=nt * 3, offset=8 + nv * 12).reshape(-1, 3)
    return v, t

def zmesh(name):
    v, _ = load(f'{SRC}/zanat/objs', zi[name]['i'])
    return np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1)  # Z-up -> Y-up, facing +Z (x, z, -y)

def hmeshes(sex, names):
    P = 'VH_M_' if sex == 'm' else 'VH_F_'
    idx = {o['name']: o for o in json.load(open(f'{SRC}/hra/objs-{sex}/index.json'))}
    vs = [load(f'{SRC}/hra/objs-{sex}', idx[P + n]['i'])[0] for n in names]
    return np.vstack(vs)

def centre(v): return (v.min(0) + v.max(0)) / 2

def umeyama(A, B):
    """Similarity (s, R, t) with B ~ s R A + t."""
    ma, mb = A.mean(0), B.mean(0)
    A0, B0 = A - ma, B - mb
    U, S, Vt = np.linalg.svd(B0.T @ A0 / len(A))
    D = np.eye(3)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0: D[2, 2] = -1
    R = U @ D @ Vt
    s = np.trace(np.diag(S) @ D) / A0.var(0).sum()
    return s, R, mb - s * R @ ma

def landmarks(sex):
    names = []  # (label, Z name, HRA names)
    zc = ['Atlas (C1)', 'Axis (C2)'] + [f'Vertebra C{i}' for i in range(3, 8)]
    for i in range(7): names.append((f'C{i+1}', zc[i], [f'cervical_vertebra_{i+1}']))
    for i in range(12): names.append((f'T{i+1}', f'Vertebra T{i+1}', [f'thoracic_vertebra_{i+1}']))
    for i in range(5): names.append((f'L{i+1}', f'Vertebra L{i+1}', [f'lumbar_vertebra_{i+1}']))
    names += [('sacrum', 'Sacrum', ['sacrum']), ('hyoid', 'Hyoid bone', ['hyoid'])]
    return names

def register(sex):
    lm = landmarks(sex)
    zc, hc, lab = [], [], []
    for label, zn, hn in lm:
        if zn not in zi: continue
        try: h = hmeshes(sex, hn)
        except KeyError: continue
        zc.append(centre(zmesh(zn))); hc.append(centre(h)); lab.append(label)
    zc, hc = np.array(zc), np.array(hc)
    # 1. global uniform scale (from vertical spread of the column) + translation
    s = np.polyfit(zc[:, 1], hc[:, 1], 1)[0]
    t = (hc - s * zc).mean(0)
    base = s * zc + t
    # 2. spine-following displacement, smoothed over three neighbouring levels
    order = np.argsort(base[:, 1])
    lv = base[order, 1]; d = (hc - base)[order]
    ds = d.copy()
    for k in range(len(d)):
        lo, hi = max(0, k - 1), min(len(d), k + 2)
        ds[k] = d[lo:hi].mean(0)
    def warp(p):
        q = s * p + t
        for a in range(3): q[:, a] += np.interp(q[:, 1], lv, ds[:, a])
        return q
    rms = np.sqrt(((warp(zc) - hc) ** 2).mean(0)) * 1000
    report = {'scale': s, 'translate': t.tolist(), 'landmarks': len(lab), 'spine_rms_mm_xyz': rms.tolist(), 'legs': {}}
    # 3. legs
    legs = {}
    for side, S, zs in (('left', 'L', 'l'), ('right', 'R', 'r')):
        def lm4(get_f, get_t, get_p):
            f, ti, p = get_f(), get_t(), get_p()
            def band(v, top, frac=0.04):
                h = v[:, 1].max() - v[:, 1].min()
                m = v[:, 1] >= v[:, 1].max() - frac * h if top else v[:, 1] <= v[:, 1].min() + frac * h
                return v[m].mean(0)
            return np.array([band(f, True), band(f, False), band(ti, False, 0.03), p.mean(0)])
        zl = lm4(lambda: warp(zmesh(f'Femur.{zs}')), lambda: warp(zmesh(f'Tibia.{zs}')), lambda: warp(zmesh(f'Patella.{zs}')))
        hl = lm4(lambda: hmeshes(sex, [f'femur_{S}']), lambda: hmeshes(sex, [f'tibia_{S}']), lambda: hmeshes(sex, [f'patella_{S}']))
        ls, R, lt = umeyama(zl, hl)
        res = np.sqrt(((ls * (zl @ R.T) + lt - hl) ** 2).sum(1)) * 1000
        legs[side] = (ls, R, lt, hl[0][1])
        report['legs'][side] = {'scale': ls, 'landmark_residual_mm': res.tolist()}
    return warp, legs, report

def in_region(o, side):
    key = 'Left' if side == 'left' else 'Right'
    return any(p.endswith(f'Main divisions/{key} lower limb') or p.endswith(f'Main divisions/{key} foot') for p in o['paths'])

def main():
    os.makedirs(OUT, exist_ok=True)
    for sex, name in (('m', 'male'), ('f', 'female')):
        warp, legs, report = register(sex)
        d = f'{OUT}/{name}'; os.makedirs(d, exist_ok=True)
        idx = []
        for o in Z:
            if o['nt'] == 0: continue
            v, t = load(f'{SRC}/zanat/objs', o['i'])
            p = warp(np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1))
            for side in ('left', 'right'):
                if in_region(o, side):
                    ls, R, lt, hipy = legs[side]
                    # apply leg transform in warped space, blended by height from the groin down
                    q = ls * (p @ R.T) + lt
                    w = np.clip((hipy + 0.02 - p[:, 1]) / 0.14, 0, 1)[:, None]
                    p = (1 - w) * p + w * q
            pf = p.astype(np.float32)
            with open(f'{d}/{o["i"]}.bin', 'wb') as f:
                f.write(struct.pack('<ii', len(pf), len(t))); f.write(pf.tobytes()); f.write(t.astype(np.uint32).tobytes())
            idx.append({'i': o['i'], 'name': o['name'], 'nv': len(pf), 'nt': len(t), 'min': pf.min(0).tolist(), 'max': pf.max(0).tolist()})
        json.dump(idx, open(f'{d}/index.json', 'w'))
        json.dump(report, open(f'{d}/report.json', 'w'), indent=1)
        print(name, json.dumps(report)[:400])

if __name__ == '__main__': main()
