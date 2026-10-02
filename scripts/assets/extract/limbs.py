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

def chain_fit(field, segs, joints, caps, starts, lam=0.02, verbose=False, free=None):
    """
    segs: list of (N,3) point sets per segment index 0..2 (upper arm / forearm / hand),
    joints: S, E, W (3,) positions. Returns params (9,) = rotvecs R1, R2, R3.
    """
    S, E, W = joints
    def pose(p, k, X):
        R1, R2, R3 = rot(p[0:3]), rot(p[3:6]), rot(p[6:9])
        if k == 0: return S + (X - S) @ R1.T
        if k == 1: return S + (((E - S)) + (X - E) @ R2.T) @ R1.T
        return S + ((E - S) + ((W - E) + (X - W) @ R3.T) @ R2.T) @ R1.T
    def cost(p):
        c = 0.0
        for k, X in enumerate(segs):
            d = field.depth(pose(p, k, X))
            c += np.mean(np.maximum(0, caps[k] - d) ** 2) * (1e4)
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
    def __init__(self, S, E, W, params, bone_pts, blend=(0.06, 0.05, 0.04, 0.03), reach=(0.04, 0.085)):
        self.S, self.E, self.W = S, E, W
        self.R1, self.R2, self.R3 = rot(params[0:3]), rot(params[3:6]), rot(params[6:9])
        self.tree = cKDTree(bone_pts); self.reach = reach; self.blend = blend
        uSE = (E - S) / np.linalg.norm(E - S); uEW = (W - E) / np.linalg.norm(W - E)
        self.uS = uSE; self.uE = (uSE + uEW) / np.linalg.norm(uSE + uEW)
        h = W - E; self.uW = h / np.linalg.norm(h)
    def pose(self, X, k):
        S, E, W = self.S, self.E, self.W
        if k == 0: return S + (X - S) @ self.R1.T
        if k == 1: return S + ((E - S) + (X - E) @ self.R2.T) @ self.R1.T
        return S + ((E - S) + ((W - E) + (X - W) @ self.R3.T) @ self.R2.T) @ self.R1.T
    def weights(self, p):
        d, _ = self.tree.query(p)
        wd = 1 - smoothstep((d - self.reach[0]) / (self.reach[1] - self.reach[0]))
        b = self.blend
        wtop = smoothstep(((p - self.S) @ self.uS + b[0]) / (b[0] + b[1]))
        b1 = smoothstep(((p - self.E) @ self.uE + b[2]) / (2 * b[2]))
        b2 = smoothstep(((p - self.W) @ self.uW + b[3]) / (2 * b[3]))
        return wtop * wd, b1, b2
    def apply(self, p):
        w, b1, b2 = self.weights(p)
        if not (w > 1e-4).any(): return p
        m = w > 1e-4; X = p[m]
        q = (1 - b1[m, None]) * self.pose(X, 0) + b1[m, None] * ((1 - b2[m, None]) * self.pose(X, 1) + b2[m, None] * self.pose(X, 2))
        out = p.copy(); out[m] = X + w[m, None] * (q - X)
        return out

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
    p, pose, f = chain_fit(field, segs, (S, E, W), caps, starts, verbose=verbose)
    return S, E, W, p, f

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
