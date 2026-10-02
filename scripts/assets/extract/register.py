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
import json, struct, sys, os, pickle
import numpy as np
pass
import limbs as LB

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

def apply_legs(p, legs):
    """Stage 3: per-leg similarity blended in over the groin."""
    orig = p.copy()
    for side in ('left', 'right'):
        ls, R, lt, hipy = legs[side]
        q = ls * (orig @ R.T) + lt
        wy = np.clip((hipy + 0.02 - orig[:, 1]) / 0.14, 0, 1)
        wx = np.clip((np.abs(orig[:, 0]) - 0.01) / 0.04, 0, 1) * ((orig[:, 0] > 0) if side == 'left' else (orig[:, 0] < 0))
        w = (wy * wx)[:, None]
        p = p + w * (q - orig)
    return p

CARPALS = ['Scaphoid bone', 'Lunate bone', 'Triquetrum bone', 'Pisiform bone', 'Trapezium bone', 'Trapezoid bone', 'Capitate bone', 'Hamate bone']
ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth']

def skin_solid(sex):
    """Voxel depth field of the united HRA skin (the arm and foot ground truth), cached."""
    from solid import Solid
    cache = f'/workspace/work/skin-solid-{sex}.pkl'
    if os.path.exists(cache): return pickle.load(open(cache, 'rb'))
    d = f'{SRC}/hra/objs-{sex}'
    idx = {o['name']: o for o in json.load(open(f'{d}/index.json'))}
    v, t = load(d, idx[('VH_M_skin' if sex == 'm' else 'VH_F_skin')]['i'])
    S = Solid(v, t, h=0.004); pickle.dump(S, open(cache, 'wb'), protocol=4); return S

def limb_rigs(sex, warp, legs, report, verbose=True):
    """Fit both arms and both feet to the skin; returns {'arm': {side: rig}, 'foot': {side: rig}}."""
    P = lambda n: apply_legs(warp(zmesh(n)), legs)
    solid = skin_solid(sex); armF = LB.SkinField(LB.arm_field(solid))
    rigs = {'arm': {}, 'foot': {}}; report['limbs'] = {}
    side_names = {'l': 1, 'r': -1}
    fits = {}
    for s_, sg in side_names.items():
        names = [n for n in zi if n.endswith('.' + s_)]
        bones = {
            'humerus': P(f'Humerus.{s_}'),
            'forearm': np.vstack([P(f'Radius.{s_}'), P(f'Ulna.{s_}')]),
            'hand': np.vstack([P(f'{c}.{s_}') for c in CARPALS] + [P(f'{o} metacarpal bone.{s_}') for o in ORD]
                              + [P(n) for n in names if 'phalanx' in n and 'of hand' in n]),
        }
        fits[s_] = (bones, None)
    # right arm first from a clean start, left from the mirrored right as one more candidate
    best = {}
    for s_ in ('l', 'r'):
        S, E, W, p, f = LB.fit_arm_side(armF, fits[s_][0], side_names[s_])
        best[s_] = (S, E, W, p, f)
    for s_, o in (('l', 'r'), ('r', 'l')):
        S, E, W, _, _ = best[s_]
        S2, E2, W2, p2, f2 = LB.fit_arm_side(armF, fits[s_][0], side_names[s_], init=LB.mirror_params(best[o][3]))
        if f2 < best[s_][4]: best[s_] = (S2, E2, W2, p2, f2)
    for s_ in ('l', 'r'):
        S, E, W, p, f = best[s_]; b = fits[s_][0]
        pts = np.vstack([b['humerus'], b['forearm'], b['hand']])
        rigs['arm'][s_] = LB.ChainRig(S, E, W, p, pts)
        rigs['arm'][s_].trunk_skip = True
        report['limbs']['arm_' + s_] = {'cost': float(f), 'rot_deg': np.degrees(np.linalg.norm(p.reshape(3, 3), axis=1)).round(1).tolist(), 'S': S.tolist(), 'E': E.tolist(), 'W': W.tolist(), 'params': p.tolist()}
        if verbose: print('  arm', s_, 'cost %.3f' % f, 'rot deg', report['limbs']['arm_' + s_]['rot_deg'])
    for s_, sg in side_names.items():
        names = [n for n in zi if n.endswith('.' + s_)]
        fb = {
            'tibia': np.vstack([P(f'Tibia.{s_}'), P(f'Fibula.{s_}')]),
            'foot': np.vstack([P(f'{n}.{s_}') for n in ('Talus', 'Calcaneus', 'Navicular bone', 'Cuboid bone', 'Medial cuneiform bone', 'Intermediate cuneiform bone', 'Lateral cuneiform bone')]
                              + [P(f'{o} metatarsal bone.{s_}') for o in ORD] + [P(n) for n in names if n.startswith('Sesamoid bones of foot')]),
            'toes': np.vstack([P(n) for n in names if 'phalanx' in n and 'of foot' in n]),
        }
        K, A, W, p, f = LB.fit_foot_side(LB.SkinField(LB.leg_field(solid, sg)), fb, sg)
        pts = np.vstack([fb['foot'], fb['toes'], fb['tibia'][fb['tibia'][:, 1] < A[1] + 0.09]])
        rigs['foot'][s_] = LB.ChainRig(K, A, W, p, pts, blend=(0.06, 0.05, 0.04, 0.03), reach=(0.03, 0.07))
        report['limbs']['foot_' + s_] = {'cost': float(f), 'rot_deg': np.degrees(np.linalg.norm(p.reshape(3, 3), axis=1)).round(1).tolist(), 'K': K.tolist(), 'A': A.tolist(), 'W': W.tolist(), 'params': p.tolist()}
        if verbose: print('  foot', s_, 'cost %.3f' % f, 'rot deg', report['limbs']['foot_' + s_]['rot_deg'])
    return rigs

def apply_limbs(p, name, rigs):
    for s_ in ('l', 'r'):
        if not (LB.is_trunk_bone(name) and not name.startswith('Humer')):
            p = rigs['arm'][s_].apply(p)
        p = rigs['foot'][s_].apply(p)
    return p

def in_region(o, side):
    key = 'Left' if side == 'left' else 'Right'
    return any(p.endswith(f'Main divisions/{key} lower limb') or p.endswith(f'Main divisions/{key} foot') for p in o['paths'])

def main():
    os.makedirs(OUT, exist_ok=True)
    for sex, name in (('m', 'male'), ('f', 'female')):
        warp, legs, report = register(sex)
        rigs = limb_rigs(sex, warp, legs, report)
        d = f'{OUT}/{name}'; os.makedirs(d, exist_ok=True)
        idx = []
        for o in Z:
            if o['nt'] == 0: continue
            v, t = load(f'{SRC}/zanat/objs', o['i'])
            p = warp(np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1))
            # Legs are picked geometrically, not by collection path: the source tags only some
            # right-foot bones with their region, which left them behind when the leg moved.
            p = apply_legs(p, legs)
            p = apply_limbs(p, o['name'].strip(), rigs)
            pf = p.astype(np.float32)
            with open(f'{d}/{o["i"]}.bin', 'wb') as f:
                f.write(struct.pack('<ii', len(pf), len(t))); f.write(pf.tobytes()); f.write(t.astype(np.uint32).tobytes())
            idx.append({'i': o['i'], 'name': o['name'], 'nv': len(pf), 'nt': len(t), 'min': pf.min(0).tolist(), 'max': pf.max(0).tolist()})
        json.dump(idx, open(f'{d}/index.json', 'w'))
        json.dump(report, open(f'{d}/report.json', 'w'), indent=1)
        print(name, json.dumps(report)[:400])

if __name__ == '__main__': main()
