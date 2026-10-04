"""Signed depth field of the united skin, for the generated (schematic) stand-ins to be pulled inside the body.

usage: python3 scripts/qa/skin_field.py [out_dir=/workspace/work]      (needs the dump from scripts/qa/dump.ts)
Writes <out_dir>/skin-field-<body>.bin :
  float32 lo[3], float32 h, int32 n[3], then int8 depth in units of 0.5 mm (clamped to +-63 mm; positive = inside the skin), C-order [x][y][z].
scripts/assets/schematic/skinfield.ts reads it; build-schematic.ts skips the containment pass (with a warning) when the file is missing.
"""
import sys, os, struct, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'assets', 'extract')); sys.path.insert(0, os.path.dirname(__file__))
from solid import Solid
from render import Scene
out = sys.argv[1] if len(sys.argv) > 1 else '/workspace/work'
os.makedirs(out, exist_ok=True)
for body in ('male', 'female'):
    sc = Scene(body); v, t = sc.mesh(sc.by['skin'])
    S = Solid(v, t)
    q = np.clip(np.round(S.depth / 0.0005), -127, 127).astype(np.int8)
    with open(f'{out}/skin-field-{body}.bin', 'wb') as f:
        f.write(struct.pack('<4f3i', *S.lo, S.h, *[int(x) for x in S.n])); f.write(np.ascontiguousarray(q).tobytes())
    print(body, 'grid', tuple(S.n), 'h', S.h, f'{q.nbytes/1e6:.1f} MB')
