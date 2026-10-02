"""
Limb-segment fitting for the Z-Anatomy registration (arms, hands, feet).

Z-Anatomy and the Human Reference Atlas skin are different subjects in different poses. The HRA
skin holds the arms abducted about 25-30 degrees with the hands open; Z-Anatomy holds them
forward of the thighs. The HRA has no arm bones, so the skin is the only ground truth: each
arm is posed as a three-segment chain (upper arm about the humeral head, forearm about the
elbow, hand about the wrist), and the rotations are found by maximising how deep the bones sit
inside the skin (centred in the limb), starting from several shoulder poses. The same
chain machinery poses each foot about the ankle. Every other structure of the limb (muscles,
vessels, nerves, ligaments, sheaths) then follows the bones by linear blend skinning with
weights from the distance to the posed chain segments.
"""
import os, pickle
import numpy as np
from scipy import ndimage, optimize

def rot(v):
    v = np.asarray(v, float); a = np.linalg.norm(v)
    if a < 1e-12: return np.eye(3)
    k = v / a; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + np.sin(a) * K + (1 - np.cos(a)) * K @ K

def sample(P, n):
    return P if len(P) <= n else P[np.linspace(0, len(P) - 1, n).astype(int)]

class SkinField:
    """Signed depth (m, positive inside) of the united skin, trilinearly interpolated."""
    def __init__(self, solid): self.s = solid
    def depth(self, P):
        c = ((P - self.s.lo) / self.s.h).T
        return ndimage.map_coordinates(self.s.depth, c, order=1, mode='nearest')

def end_centres(P, axis_hint):
    """Centres of the two end bands (4% of length) along the principal axis, ordered along axis_hint."""
    c = P.mean(0); u, s, vt = np.linalg.svd(P - c, full_matrices=False); ax = vt[0]
    if ax @ axis_hint < 0: ax = -ax
    t = (P - c) @ ax; L = t.max() - t.min()
    a = P[t <= t.min() + 0.04 * L].mean(0); b = P[t >= t.max() - 0.04 * L].mean(0)
    return a, b, L

def chain_fit(field, segs, joints, caps, starts, lam=0.02, verbose=False, free=None, post=None, extra=None, hand_scale=1.0):
    """
    segs: list of (N,3) point sets per segment index 0..2 (upper arm / forearm / hand),
    joints: S, E, W (3,) positions. Returns params (9,) = rotvecs R1, R2, R3.
    """
    S, E, W = joints
    def pose(p, k, X):
        R1, R2, R3 = rot(p[0:3]), rot(p[3:6]), rot(p[6:9])
        if k == 0: return S + (X - S) @ R1.T
        if k == 1: return S + (((E - S)) + (X - E) @ R2.T) @ R1.T
        return S + ((E - S) + ((W - E) + (hand_scale * (X - W)) @ R3.T) @ R2.T) @ R1.T
    def cost(p):
        c = 0.0
        for k, X in enumerate(segs):
            if len(X) == 0: continue
            Y = pose(p, k, X)
            d = field.depth(post(Y) if post else Y)
            c += np.mean(np.maximum(0, caps[k] - d) ** 2) * (1e4)
        if extra is not None: c += extra(p, lambda q, k, X: pose(q, k, X))
        return c + lam * (np.sum(p[3:6] ** 2) + np.sum(p[6:9] ** 2))
    best = None
    free = np.arange(9) if free is None else np.asarray(free)
    def cost_free(q, p0):
        p = p0.copy(); p[free] = q; return cost(p)
    for p0 in starts:
        rr = optimize.minimize(cost_free, p0[free], args=(p0,), method='Powell', options={'xtol': 1e-3, 'ftol': 1e-6, 'maxiter': 4000})
        x = p0.copy(); x[free] = rr.x; rr.x = x; r = rr
        if verbose: print('   start', np.round(p0[:3], 2), '->', round(r.fun, 4))
        if best is None or r.fun < best.fun: best = r
    return best.x, pose, best.fun

def arm_field(solid, y_merge=0.41):
    """
    Depth field of the arm compartments only. Below the armpit the HRA arms are separate
    blobs in each horizontal slice (A-pose); a blob that does not contain the body midline is
    an arm. Above `y_merge` arm and torso are one surface, so everything is allowed there.
    The torso and legs are masked out below, so a hand cannot be 'inside the skin' by sitting
    in the thigh.
    """
    h = solid.h; M = solid.inside.copy()
    iy_merge = int(round((y_merge - solid.lo[1]) / h)); ix0 = int(round((0 - solid.lo[0]) / h))
    for iy in range(iy_merge):
        lab, n = ndimage.label(solid.inside[:, iy, :])
        if n == 0: continue
        keep = np.zeros(n + 1, bool); keep[1:] = True
        centre_labels = set(np.unique(lab[ix0 - 1:ix0 + 2, :])) - {0}
        for k in centre_labels: keep[k] = False
        M[:, iy, :] = keep[lab]
    # above the armpit the arm and chest are one surface: allow only the lateral part, so the
    # chain cannot escape into the chest by swinging up.
    xs = solid.lo[0] + np.arange(M.shape[0]) * h
    M[np.abs(xs) < 0.12, iy_merge:, :] = False
    class F: pass
    f = F(); f.lo, f.h, f.n = solid.lo, h, solid.n
    f.depth = ndimage.distance_transform_edt(M, sampling=h) - ndimage.distance_transform_edt(~M, sampling=h)
    f.inside = M
    return f


# ───────────────────────────── arms ─────────────────────────────
from scipy.spatial import cKDTree

def smoothstep(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)

# Z-Anatomy bones of the shoulder girdle and trunk never follow the arm.
TRUNK_BONES = ('Scapula', 'Clavicle', 'Sternum', 'Manubrium', 'rib', 'Rib', 'Costal', 'Vertebra', 'Atlas', 'Axis', 'Sacrum', 'Coccyx',
               'Skull', 'Mandible', 'Hyoid', 'Hip bone', 'Os coxae', 'Ilium', 'Ischium', 'Pubis', 'Thoracic cage')

def is_trunk_bone(name):
    return any(k in name for k in TRUNK_BONES) and not name.startswith('Humer')

class ChainRig:
    """Three-segment limb chain posed by rotations about its joints, applied to soft tissue by LBS."""
    def __init__(self, S, E, W, params, bone_pts, blend=(0.06, 0.05, 0.04, 0.03), reach=(0.04, 0.085), seg_scale=1.0):
        self.S, self.E, self.W = S, E, W; self.seg_scale = seg_scale
        self.R1, self.R2, self.R3 = rot(params[0:3]), rot(params[3:6]), rot(params[6:9])
        self.tree = cKDTree(bone_pts); self.reach = reach; self.blend = blend
        uSE = (E - S) / np.linalg.norm(E - S); uEW = (W - E) / np.linalg.norm(W - E)
        self.uS = uSE; self.uE = (uSE + uEW) / np.linalg.norm(uSE + uEW)
        h = W - E; self.uW = h / np.linalg.norm(h)
    def pose(self, X, k):
        S, E, W = self.S, self.E, self.W
        if k == 0: return S + (X - S) @ self.R1.T
        if k == 1: return S + ((E - S) + (X - E) @ self.R2.T) @ self.R1.T
        return S + ((E - S) + ((W - E) + (self.seg_scale * (X - W)) @ self.R3.T) @ self.R2.T) @ self.R1.T
    def weights(self, p):
        d, _ = self.tree.query(p)
        wd = 1 - smoothstep((d - self.reach[0]) / (self.reach[1] - self.reach[0]))
        b = self.blend
        wtop = smoothstep(((p - self.S) @ self.uS + b[0]) / (b[0] + b[1]))
        b1 = smoothstep(((p - self.E) @ self.uE + b[2]) / (2 * b[2]))
        b2 = smoothstep(((p - self.W) @ self.uW + b[3]) / (2 * b[3]))
        return wtop * wd, b1, b2
    def apply(self, p, pw=None):
        w, b1, b2 = self.weights(p if pw is None else pw)
        if not (w > 1e-4).any(): return p
        m = w > 1e-4; X = p[m]
        q = (1 - b1[m, None]) * self.pose(X, 0) + b1[m, None] * ((1 - b2[m, None]) * self.pose(X, 1) + b2[m, None] * self.pose(X, 2))
        out = p.copy(); out[m] = X + w[m, None] * (q - X)
        return out

HAND_SCALES = (1.0, 0.96, 0.92, 0.88, 0.84)
HAND_SCALE_PENALTY = 2.0

def fit_arm_side(field, bones, side_sign, init=None, verbose=False):
    """bones: dict with 'humerus','forearm','hand' (N,3) after stages 1-3. Returns (S,E,W,params,cost)."""
    H, FA, HA = bones['humerus'], bones['forearm'], bones['hand']
    down = np.array([0, -1, 0.])
    h0, h1, _ = end_centres(H, down)
    # forearm = radius+ulna cloud: proximal/distal centres along its own axis
    f0, f1, _ = end_centres(FA, down)
    S = h0; E = (h1 + f0) / 2; W = f1
    segs = [sample(H, 700), sample(FA, 900), sample(HA, 1000)]
    caps = [0.025, 0.014, 0.005]
    starts = [np.array([fl, 0, -side_sign * ab, 0, 0, 0, 0, 0, 0]) for ab in (0.2, 0.45, 0.7) for fl in (-0.4, 0.0, 0.4)]
    if init is not None: starts.insert(0, init)
    def hang(p, pose):
        # anatomical sanity: the arm hangs (elbow below the shoulder, wrist below the elbow)
        E2 = pose(p, 1, E[None])[0]; W2 = pose(p, 2, W[None])[0]
        return 1e3 * (max(0.0, E2[1] - (S[1] - 0.15)) ** 2 + max(0.0, W2[1] - (E2[1] - 0.10)) ** 2)
    p, pose, f = chain_fit(field, segs, (S, E, W), caps, starts, verbose=verbose, extra=hang)
    # Hand size: the Z-Anatomy subject's hand is larger than the HRA female's (and the HRA skin fingers are thin), so the hand
    # (carpals, metacarpals, phalanges) is scaled about the wrist by the factor in [hand_min, 1] that fits the skin best,
    # re-fitting the wrist rotation for each candidate. A small penalty keeps the factor at 1 when the skin does not ask for less.
    best = (f + 0.0, 1.0, p, f)
    for k in HAND_SCALES[1:]:
        pk, _, fk = chain_fit(field, segs, (S, E, W), caps, [p], free=np.arange(6, 9), extra=hang, hand_scale=k)
        score = fk + HAND_SCALE_PENALTY * (1 - k)
        if score < best[0]: best = (score, k, pk, fk)
    _, k, p, f = best
    return S, E, W, p, f, k

def mirror_params(p):
    """Rotation vector of the mirror image (x -> -x) of a rotation."""
    q = p.copy().reshape(3, 3); q[:, 1] *= -1; q[:, 2] *= -1; return q.ravel()


def fit_foot_side(field, bones, side_sign, verbose=False):
    """Pose the foot about the ankle and the toes about the metatarsophalangeal line (knee fixed)."""
    T, FT, TO = bones['tibia'], bones['foot'], bones['toes']
    down = np.array([0, -1, 0.])
    t0, t1, _ = end_centres(T, down)
    K = t0; A = t1
    # metatarsophalangeal line: centre of the toe bones' proximal ends = toes cloud, near end
    ax = FT.mean(0) - A; ax /= np.linalg.norm(ax)
    proj = (TO - A) @ ax
    W = TO[proj <= np.percentile(proj, 12)].mean(0)
    segs = [sample(T, 200), sample(FT, 900), sample(TO, 700)]
    caps = [0.012, 0.007, 0.004]
    starts = [np.zeros(9)]
    p, pose, f = chain_fit(field, segs, (K, A, W), caps, starts, lam=0.15, verbose=verbose, free=np.arange(3, 9))
    return K, A, W, p, f

def leg_field(solid, side_sign):
    """Skin depth field restricted to one body half, so a foot cannot be 'inside' by crossing the midline."""
    h = solid.h; M = solid.inside.copy()
    xs = solid.lo[0] + np.arange(M.shape[0]) * h
    M[(xs * side_sign) < 0.0, :, :] = False
    class F: pass
    f = F(); f.lo, f.h, f.n = solid.lo, h, solid.n
    f.depth = ndimage.distance_transform_edt(M, sampling=h) - ndimage.distance_transform_edt(~M, sampling=h)
    return f


FINGER_STARTS = 6
FINGER_SPACING_W = 1e5
FINGER_SPACING_MIN = 0.013     # fingertip centres at least 13 mm apart across the hand
FINGER_SPACING_MAX = 0.024     # and at most 24 mm
FINGERS = ['first', 'second', 'third', 'fourth', 'fifth']

def fit_fingers(field, arm_rig, get, side):
    """
    Pose each finger (metacarpophalangeal, proximal and distal interphalangeal joints) so its
    phalanges sit in the skin's finger, in the hand frame of `arm_rig`. `get(name)` returns a
    registered bone (stages 1-3). Returns {finger: ChainRig} in source coordinates.
    """
    rigs = {}
    post = lambda Y: arm_rig.pose(Y, 2)
    try:
        # lateral axis of the hand (pinky -> index side) in the arm frame, to keep the fingers in anatomical order
        ul = post(get(f'Second metacarpal bone.{side}').mean(0)[None])[0] - post(get(f'Fifth metacarpal bone.{side}').mean(0)[None])[0]
        ul = ul / np.linalg.norm(ul)
    except KeyError:
        ul = None
    prev_tip = None
    for f in ['first', 'second', 'third', 'fourth', 'fifth']:
        try:
            P = get(f'Proximal phalanx of {f} finger of hand.{side}'); D = get(f'Distal phalanx of {f} finger of hand.{side}')
            Mc = get(f'{f.capitalize()} metacarpal bone.{side}')
        except KeyError:
            continue
        try: M = get(f'Middle phalanx of {f} finger of hand.{side}')
        except KeyError: M = None
        ax = D.mean(0) - Mc.mean(0); ax /= np.linalg.norm(ax)
        def band(X, near_prox, frac=0.08):
            t = (X - Mc.mean(0)) @ ax; L = t.max() - t.min()
            m = t <= t.min() + frac * L if near_prox else t >= t.max() - frac * L
            return X[m].mean(0)
        MCP = band(P, True)
        if M is not None:
            PIP = (band(P, False) + band(M, True)) / 2; DIP = (band(M, False) + band(D, True)) / 2
            segs = [sample(P, 250), sample(M, 250), sample(D, 250)]
        else:
            PIP = (band(P, False) + band(D, True)) / 2; DIP = band(D, False)
            segs = [sample(P, 250), sample(D, 250), np.zeros((0, 3))]
        caps = [0.004, 0.0035, 0.003]
        Dc = D.mean(0)[None]; lim = 0.6 if f == 'first' else 0.3
        def extra(p, pose, Dc=Dc, lim=lim, prev=prev_tip):
            # the metacarpophalangeal joint swings a finger by at most ~17 degrees (thumb 35), and fingers keep their order
            c = 500.0 * max(0.0, np.linalg.norm(p[0:3]) - lim) ** 2
            if ul is not None and f != 'first' and prev is not None:
                tip = post(pose(p, 2, Dc))[0]
                gap = (prev - tip) @ ul; c += FINGER_SPACING_W * (max(0.0, FINGER_SPACING_MIN - gap) ** 2 + max(0.0, gap - FINGER_SPACING_MAX) ** 2)   # each finger at least 1.2 cm further from the thumb than the last
            return c
        rng = np.random.RandomState(7)
        starts = [np.zeros(9)] + [np.r_[rng.randn(3) * 0.12, np.zeros(6)] for _ in range(FINGER_STARTS)]
        p, pose, c = chain_fit(field, segs, (MCP, PIP, DIP), caps, starts, lam=0.05, post=post, extra=extra)
        if f != 'first' and ul is not None: prev_tip = post(pose(p, 2, Dc))[0]
        pts = np.vstack([P, D] + ([M] if M is not None else []))
        rigs[f] = ChainRig(MCP, PIP, DIP, p, pts, blend=(0.012, 0.012, 0.008, 0.006), reach=(0.012, 0.03))
        print(f'    finger {f} {side} cost {c:.3f} mcp rot {np.degrees(np.linalg.norm(p[0:3])):.0f} deg', flush=True)
    return rigs


# ───────────────────────── stage 4: containment in the skin ─────────────────────────
def contain(p, solid, margin=0.002, max_disp=0.012, iters=5):
    """
    Pull vertices that lie outside the united skin back inside, along the gradient of the skin's signed depth field,
    until they are `margin` deep (never more than `max_disp` from where stages 1-3 put them). Soft tissue, vessels,
    nerves, ligaments and bones all belong inside the skin; a vertex a few millimetres out is registration error,
    not anatomy. Vertices that would need more than `max_disp` stay where they are, so a structure that is badly
    misplaced is still visible to the QA numbers instead of being hidden by a large distortion.
    Returns (new points, number of vertices moved, mean move of moved vertices in m).
    """
    q = p.copy(); h = solid.h
    f = SkinField(solid)
    eps = h
    for _ in range(iters):
        d = f.depth(q)
        bad = d < margin - 1e-4
        if not bad.any(): break
        Q = q[bad]
        g = np.stack([(f.depth(Q + e) - f.depth(Q - e)) for e in np.eye(3) * eps], 1)
        gn = np.linalg.norm(g, axis=1, keepdims=True)
        ok = gn[:, 0] > 1e-6
        step = np.zeros_like(Q); step[ok] = g[ok] / gn[ok] * (margin - d[bad][ok])[:, None]
        cand = q.copy(); cand[bad] = Q + step
        cap = np.linalg.norm(cand - p, axis=1) <= max_disp
        q = np.where(cap[:, None], cand, q)
    moved = np.linalg.norm(q - p, axis=1)
    m = moved > 1e-6
    return q, int(m.sum()), float(moved[m].mean()) if m.any() else 0.0


def refit(p, solid, thr=0.15, tol=0.004, cap=0.030, reg=2e3):
    """
    Per-structure rigid refit. A structure that is still `thr` or more outside the skin (by more than `tol`) after stages 1-3 is shifted as a
    whole by the translation (|t| <= `cap`, regularised) that brings most of it inside, so its shape is kept; the per-vertex `contain`
    pass then only has the last few millimetres to take up. Structures that need more than `cap` stay visible to the QA numbers.
    Returns (new points, translation in m, outside fraction before, after).
    """
    from scipy import optimize
    f = SkinField(solid)
    d0 = f.depth(p); fr0 = float((d0 < -tol).mean())
    if fr0 < thr: return p, np.zeros(3), fr0, fr0
    X = sample(p, 3000)
    def cost(t): return 1e6 * np.mean(np.maximum(0.0, 0.006 - f.depth(X + t)) ** 2) + reg * float(t @ t)
    best = min((optimize.minimize(cost, t0, method='Powell', bounds=[(-cap, cap)] * 3, options={'xtol': 1e-4, 'ftol': 1e-8}) for t0 in (np.zeros(3), -np.sign(p.mean(0) * [1, 0, 0]) * 0.01)), key=lambda r: r.fun)
    t = best.x
    fr1 = float((f.depth(p + t) < -tol).mean())
    if fr1 >= fr0: return p, np.zeros(3), fr0, fr0
    return p + t, t, fr0, fr1
