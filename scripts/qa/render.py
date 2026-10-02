"""
Offline orthographic renderer for QA: reads /workspace/qa/dump/<body>/{index.json,meshes.bin} (scripts/qa/dump.ts),
point-splats area-sampled triangles with a z-buffer and flat shading.

  from render import Scene; sc = Scene('male'); sc.render(sel, ghost=..., view='front', box=(x0,x1,y0,y1), px=1000, out=path)
`sel` / `ghost` are predicates on an index entry; colour comes from `colour(entry)`.
Coordinates: metres, y up, +x = body left, +z = front.
"""
import json, numpy as np, os
from PIL import Image, ImageDraw
D = os.environ.get('QA_DUMP', '/workspace/qa/dump')

PAL = {'skeletal': (235, 228, 205), 'muscular': (200, 70, 60), 'cardiovascular': (220, 40, 40), 'nervous': (240, 210, 70), 'respiratory': (110, 170, 230), 'digestive': (190, 130, 80),
       'urinary': (230, 170, 60), 'reproductive': (230, 110, 190), 'lymphatic': (120, 200, 120), 'endocrine': (170, 120, 220), 'integumentary': (200, 160, 140), 'connective': (150, 200, 200),
       'fascial': (170, 190, 150), 'surface': (160, 160, 160), 'sensory': (90, 200, 200), 'immune': (120, 200, 120)}
def colour(e):
    if e.get('provenance') == 'generated': return (181, 140, 255)
    return PAL.get(e['systems'][0], (180, 180, 180))

class Scene:
    def __init__(self, body):
        self.body = body
        self.idx = json.load(open(f'{D}/{body}/index.json'))
        self.buf = np.memmap(f'{D}/{body}/meshes.bin', dtype=np.uint8, mode='r')
        self.by = {e['id']: e for e in self.idx}
    def mesh(self, e):
        o = e['off']; nv, nt = e['nv'], e['nt']
        v = np.frombuffer(self.buf, dtype=np.float32, count=nv * 3, offset=o).reshape(-1, 3)
        t = np.frombuffer(self.buf, dtype=np.uint32, count=nt * 3, offset=o + nv * 12).reshape(-1, 3)
        return v, t
    def samples(self, ents, density):
        P, N, C = [], [], []
        for e in ents:
            if e['nt'] == 0: continue
            v, t = self.mesh(e)
            a, b, c = v[t[:, 0]], v[t[:, 1]], v[t[:, 2]]
            cr = np.cross(b - a, c - a); area = np.linalg.norm(cr, axis=1) / 2
            n = cr / np.maximum(np.linalg.norm(cr, axis=1, keepdims=True), 1e-12)
            k = np.minimum(np.ceil(area * density).astype(int), 400); k = np.maximum(k, 1)
            rep = np.repeat(np.arange(len(t)), k)
            r1, r2 = np.random.rand(len(rep)), np.random.rand(len(rep)); f = r1 + r2 > 1; r1[f], r2[f] = 1 - r1[f], 1 - r2[f]
            p = a[rep] + (b - a)[rep] * r1[:, None] + (c - a)[rep] * r2[:, None]
            P.append(p); N.append(n[rep]); C.append(np.tile(np.array(colour(e), np.float32), (len(rep), 1)))
        if not P: return np.zeros((0, 3)), np.zeros((0, 3)), np.zeros((0, 3))
        return np.vstack(P), np.vstack(N), np.vstack(C)
    def layer(self, ents, view, box, px, aspect):
        x0, x1, y0, y1 = box
        W = px; H = int(round(px * (y1 - y0) / (x1 - x0)))
        dens = (px / (x1 - x0)) ** 2 * 2.5
        P, N, C = self.samples(ents, dens)
        # view transform: u = screen x (right), v = screen y (up), d = depth towards viewer (bigger = closer)
        if view == 'front': u, d, nd = -P[:, 0], P[:, 2], N[:, 2]
        elif view == 'back': u, d, nd = P[:, 0], -P[:, 2], -N[:, 2]
        elif view == 'left': u, d, nd = P[:, 2], P[:, 0], N[:, 0]      # body-left side seen from the left: front to the right
        elif view == 'right': u, d, nd = -P[:, 2], -P[:, 0], -N[:, 0]
        else: raise ValueError(view)
        vv = P[:, 1]
        # for 'left' view, the box's x range refers to z
        px_ = ((u - x0) / (x1 - x0) * (W - 1)).round().astype(int); py_ = ((y1 - vv) / (y1 - y0) * (H - 1)).round().astype(int)
        m = (px_ >= 0) & (px_ < W) & (py_ >= 0) & (py_ < H)
        px_, py_, d, nd, C = px_[m], py_[m], d[m], nd[m], C[m]
        shade = 0.45 + 0.55 * np.abs(nd)
        order = np.argsort(d)  # far first so nearest wins on assignment
        img = np.zeros((H, W, 3), np.float32); dep = np.full((H, W), -1e9, np.float32)
        for dx in (0, 1):
            for dy in (0, 1):
                xx = np.minimum(px_[order] + dx, W - 1); yy = np.minimum(py_[order] + dy, H - 1)
                img[yy, xx] = C[order] * shade[order, None]
                dep[yy, xx] = d[order]
        return img, dep
    def render(self, sel, ghost=None, view='front', box=(-0.6, 0.6, -0.95, 0.95), px=900, out=None, label=None, bg=(18, 20, 26)):
        ents = [e for e in self.idx if sel(e)]
        img, dep = self.layer(ents, view, box, px, 1)
        if ghost:
            gi, gd = self.layer([e for e in self.idx if ghost(e) and not sel(e)], view, box, px, 1)
            has = gd > -1e8
            front = has & (gd > dep + 0.0)
            behind = has & ~front & (dep > -1e8)
            blank = has & (dep <= -1e8)
            img = np.where(front[..., None], 0.55 * img + 0.45 * gi, img)
            img = np.where(blank[..., None], 0.35 * gi + 0.65 * np.array(bg, np.float32), img)
        out_img = np.where((dep <= -1e8)[..., None] & ~(((ghost is not None) and True) & False), img, img)
        mask = (img.sum(2) == 0)
        img[mask] = bg
        im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
        if label:
            ImageDraw.Draw(im).text((8, 6), label, fill=(255, 255, 255))
        if out: im.save(out)
        return im, len(ents)

def sheet(images, cols, out):
    w, h = images[0].size; rows = (len(images) + cols - 1) // cols
    S = Image.new('RGB', (w * cols, h * rows), (0, 0, 0))
    for i, im in enumerate(images): S.paste(im, ((i % cols) * w, (i // cols) * h))
    S.save(out)
