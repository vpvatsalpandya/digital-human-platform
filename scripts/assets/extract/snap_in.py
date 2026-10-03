"""
Stage 5 of the registration (run after register.py, before assets:build:v2): soft tissue that stages 1-4 left badly outside the skin.

Stage 4 (`limbs.contain`) never moves a vertex more than 12 mm, so a structure that is misplaced by more (here the male right ankle: the
foot is fitted to the skin but the distal tibia is not, so the bursa over its medial malleolus sits 39 mm out) is left outside. This pass
looks at every soft-tissue structure that still has 15 % or more of its vertices more than 4 mm outside the united skin and moves it the rest
of the way in, capped at 45 mm:
  - compact structures (bursae, fat bodies, sheaths, glands, organs): one rigid translation along the skin gradient (shape kept);
  - long structures (veins, arteries, nerves, ligaments, tendons, muscles): vertex pull-in as in stage 4 with the larger cap, then the
    displacement is smoothed over the mesh so the structure bends instead of kinking.
Bones, joints, nails, hair, skin layers, the ear, eyes and teeth are exempt exactly as in stage 4. Idempotent. Writes <registered>/<body>/<i>.bin
in place and a log of what moved to <registered>/<body>/snap_in.json.

usage: python3 snap_in.py [/workspace/work/registered]
"""
import sys, os, json, struct, pickle, re, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import limbs as LB
REFIT_EXEMPT = re.compile(r'(\bbone\b|\bphalanx\b|\bpatella\b|^vertebra|\bsacrum\b|\bcoccyx\b|^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) rib|\bsternum\b|\bmanubrium\b|\bclavicle\b|\bscapula\b|^(humerus|radius|ulna|femur|tibia|fibula|skull|mandible|maxilla|hyoid bone)\b|^intervertebral|\bcartilage\b|^(malleus|incus|stapes)\b|\bregion\b|^(medial|lateral) malleolus|symphysis|\bdisc\b)', re.I)
CONTAIN_EXEMPT = re.compile(r'(nail|hair|lash|brow|onyx|skin|cutis|epiderm|dermis|auricle|ear |ear$|pinna|lobule|eyeball|cornea|lens|tooth|teeth|molar|incisor|canine|premolar)', re.I)
LONG = re.compile(r'(vein|artery|arteries|nerve|ligament|tendon|muscle|duct|trunk|plexus|ganglion|fascia|aponeurosis|retinaculum|nodes?)\b', re.I)
# only real soft-tissue structures (the source also holds reference planes, movements, regions and group labels, which the build skips)
SOFT = re.compile(r'(bursa|vein|artery|nerve|ligament|tendon|muscle|sheath|gland|fascia|retinaculum|aponeurosis)', re.I)
THR, TOL, CAP, MARGIN = 0.15, 0.004, 0.045, 0.003

def load_bin(path):
    b = open(path, 'rb').read(); nv, nt = struct.unpack('<ii', b[:8])
    v = np.frombuffer(b, np.float32, nv * 3, 8).reshape(-1, 3).astype(np.float64)
    t = np.frombuffer(b, np.uint32, nt * 3, 8 + nv * 12).reshape(-1, 3)
    return v, t

def grad(f, Q, eps):
    g = np.stack([(f.depth(Q + e) - f.depth(Q - e)) for e in np.eye(3) * eps], 1)
    n = np.linalg.norm(g, axis=1, keepdims=True); return g / np.maximum(n, 1e-9)

def rigid(p, solid):
    f = LB.SkinField(solid); q = p.copy()
    for _ in range(12):
        d = f.depth(q)
        if (d < -TOL).mean() < 0.02: break
        bad = d < MARGIN
        step = (grad(f, q[bad], solid.h) * (MARGIN - d[bad])[:, None]).mean(0)
        if np.linalg.norm(q.mean(0) + step - p.mean(0)) > CAP: break
        q = q + step
    return q

def soft(p, t, solid, margin=MARGIN, cap=CAP):
    q, nm, _ = LB.contain(p, solid, margin=margin, max_disp=cap, iters=12)
    disp = q - p; fixed = np.linalg.norm(disp, axis=1) > 1e-6
    nb = [[] for _ in range(len(p))]
    for a, b, c in t: nb[a] += [b, c]; nb[b] += [a, c]; nb[c] += [a, b]
    for _ in range(8):
        new = disp.copy()
        for i in np.nonzero(~fixed)[0]:
            if nb[i]: new[i] = disp[nb[i]].mean(0) * 0.9
        disp = new
    return p + disp

def main(root):
    for body, sex in (('male', 'm'), ('female', 'f')):
        S = pickle.load(open(f'/workspace/work/skin-solid-{sex}.pkl', 'rb')); idx = json.load(open(f'{root}/{body}/index.json')); log = {}; changed = False
        for o in idx:
            n = o['name'].strip()
            nailfold = bool(re.search(r'perionyx', n, re.I))   # the nail fold sits ON the skin, but the 4 mm skin voxels are coarser than a toe: bring it to the surface only
            if nailfold: pass
            elif not SOFT.search(n) or CONTAIN_EXEMPT.search(n) or REFIT_EXEMPT.search(n) or o['nt'] == 0 or n.endswith('.g'): continue
            if o['nt'] == 0: continue
            v, t = load_bin(f'{root}/{body}/{o["i"]}.bin')
            fr = float((S.query(v) < -TOL).mean())
            if fr < THR: continue
            q = soft(v, t, S, 0.0005, 0.015) if nailfold else soft(v, t, S) if LONG.search(n) else rigid(v, S)
            fr2 = float((S.query(q) < -TOL).mean()); mv = np.linalg.norm(q - v, axis=1)
            log[n] = {'mode': 'soft' if (nailfold or LONG.search(n)) else 'rigid', 'outside_before': round(fr, 3), 'outside_after': round(fr2, 3), 'max_move_mm': round(float(mv.max()) * 1000, 1), 'mean_move_mm': round(float(mv.mean()) * 1000, 1)}
            pf = q.astype(np.float32)
            with open(f'{root}/{body}/{o["i"]}.bin', 'wb') as f:
                f.write(struct.pack('<ii', len(pf), len(t))); f.write(pf.tobytes()); f.write(t.astype(np.uint32).tobytes())
            o['min'] = pf.min(0).tolist(); o['max'] = pf.max(0).tolist(); changed = True
        if changed: json.dump(idx, open(f'{root}/{body}/index.json', 'w'))
        json.dump(log, open(f'{root}/{body}/snap_in.json', 'w'), indent=1)
        print(body, 'snapped', len(log)); [print('  ', k, v) for k, v in log.items()]

if __name__ == '__main__': main(sys.argv[1] if len(sys.argv) > 1 else '/workspace/work/registered')
