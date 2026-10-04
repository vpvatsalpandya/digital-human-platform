"""Rendered checks for the hand and lower-leg fit: bones/soft tissue in colour, skin as a ghost, front + back/side views per limb.
usage: python3 scripts/qa/limbshots.py <out_dir> [dump_dir]"""
import sys, os, re, numpy as np
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
if len(sys.argv) > 2: os.environ['QA_DUMP'] = sys.argv[2]
sys.path.insert(0, os.path.dirname(__file__))
from render import Scene, sheet
HAND = re.compile(r'(phalanx-of-\w+-finger-of-hand|metacarpal|scaphoid|lunate|triquetrum|pisiform|trapez|capitate|hamate)')
LEG = re.compile(r'^(tibia|fibula)')
for body in ('male', 'female'):
    sc = Scene(body); skin = lambda e: e['id'] == 'skin'
    for side in 'lr':
        for name, rx, pad in (('hand', HAND, 0.07), ('lowerleg', LEG, 0.05)):
            sel = lambda e, rx=rx, side=side: e['group'] == 'skeleton' and rx.search(e['id']) and (e['id'].endswith('-' + side) or e['id'].endswith('-l-r'))
            ents = [e for e in sc.idx if sel(e) and e['nt']]
            if not ents: continue
            lo = np.min([e['bounds'][:3] for e in ents], 0) - pad; hi = np.max([e['bounds'][3:] for e in ents], 0) + pad
            ims = []
            for view in ('front', 'left'):
                if view == 'front': box = (-hi[0], -lo[0], lo[1], hi[1])
                else: box = (lo[2], hi[2], lo[1], hi[1])
                px = 600 if name == 'hand' else 420
                # zoom: keep aspect by limiting to a square-ish box
                im, n = sc.render(sel, ghost=skin, view=view, box=box, px=px, label=f'{body} {side} {name} {view}')
                ims.append(im)
                # image-space check that does not depend on how the picture looks: share of bone pixels outside the skin silhouette
                bi, bd = sc.layer(ents, view, box, px, 1); si, sd = sc.layer([e for e in sc.idx if skin(e)], view, box, px, 1)
                from scipy import ndimage
                bm = bd > -1e8; sm = ndimage.binary_closing(sd > -1e8, iterations=3)
                print(f'{body:6s} {side} {name:8s} {view:5s} bone pixels outside the skin silhouette: {100*(bm & ~sm).sum()/max(1,bm.sum()):5.2f} %  (bone px {bm.sum()})')
            sheet(ims, 2, f'{out}/{body}_{side}_{name}.png')
print('done')
