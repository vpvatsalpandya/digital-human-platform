"""
Rebase the core pack's reference-atlas / BodyParts3D aggregates onto the same body frame as the
detail packs (the Human Reference Atlas "united" frame).

The core pack (hra-v1) was baked from standalone atlas files and BodyParts3D meshes placed by a
stature-scaled linear fit. Those sit in a different frame to the united model that the detail
packs, the skin shells and every registered Z-Anatomy structure use (male: ~2 cm shifted; female:
~5-8 cm shifted and ~10% resized), so in the viewer the core skull, ribs, heart and brain no
longer line up with the skin or the detail layers. This script rebuilds each affected core id in
the united frame:

  * skin, heart, aorta, IVC, trachea, spleen, thymus, pelvis, brain, large intestine: merged from
    the united reference-atlas meshes (scripts/qa/core_sel.py selectors);
  * skull, vertebral column, rib cage, humerus, radius+ulna, deltoid, biceps, pectoralis major,
    quadriceps, gastrocnemius: merged from the registered Z-Anatomy detail meshes (dumped by
    scripts/qa/dump.ts) so the aggregate and its parts coincide exactly;
  * stomach, adrenal glands, testes: the registered Z-Anatomy mesh;
  * jugular notch / umbilicus landmarks: positions measured on the united skin and manubrium.

Output (consumed by scripts/assets/rebuild-core.ts): <out>/<body>/<id>.bin  (nv,nt int32, float32 xyz, uint32 idx)
and <out>/<body>/landmarks.json.

  python3 core_rebase.py <registered-dir> <dump-dir> <out-dir>
"""
import json, os, re, struct, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'qa'))
from core_sel import select

HRA = '/workspace/sources/hra'
REG, DUMP, OUT = sys.argv[1:4]

def load_bin(path):
    b = open(path, 'rb').read(); nv, nt = struct.unpack('<ii', b[:8])
    v = np.frombuffer(b, np.float32, nv * 3, 8).reshape(-1, 3).astype(np.float64)
    t = np.frombuffer(b, np.uint32, nt * 3, 8 + nv * 12).reshape(-1, 3)
    return v, t

def merge(parts):
    V, T, o = [], [], 0
    for v, t in parts:
        V.append(v); T.append(t.astype(np.int64) + o); o += len(v)
    return np.vstack(V), np.vstack(T).astype(np.uint32)

def write(body, sid, v, t):
    d = f'{OUT}/{body}'; os.makedirs(d, exist_ok=True)
    with open(f'{d}/{sid}.bin', 'wb') as f:
        f.write(struct.pack('<ii', len(v), len(t))); f.write(v.astype(np.float32).tobytes()); f.write(t.astype(np.uint32).tobytes())
    print(f'  {body} {sid}: {len(v)} v {len(t)} t')

SIDES = {'r': 'right', 'l': 'left'}
SKULL = re.compile(r'^(frontal-bone|occipital-bone|sphenoid-bone|ethmoid-bone|vomer|mandible|(parietal|temporal|zygomatic|nasal|lacrimal|palatine)-bone-[lr]|maxilla-[lr]|inferior-nasal-concha-bone-[lr]|(upper|lower)-.*(incisor|canine|premolar|molar|molar-tooth)-[lr])$')
SPINE = re.compile(r'^(atlas-c1|axis-c2|vertebra-[ctl]\d+)$')
RIBS = re.compile(r'^((first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)-rib-[lr]|costal-cartilage-of-.*-rib-[lr]|body-of-sternum|manubrium-of-sternum|xiphoid-process)$')

def main():
    for sx, body in (('m', 'male'), ('f', 'female')):
        print(body)
        # --- united reference-atlas meshes
        ud = f'{HRA}/objs-{sx}'; uidx = json.load(open(f'{ud}/index.json')); unames = [o['name'] for o in uidx]
        byname = {o['name']: o for o in uidx}
        def united(sid):
            ns = select(unames, sid)
            if not ns: raise SystemExit(f'no united meshes for {sid}')
            return merge([load_bin(f'{ud}/{byname[n]["i"]}.bin') for n in ns])
        for sid in ('skin', 'heart', 'aorta', 'inferior-vena-cava', 'trachea', 'spleen', 'thymus', 'pelvis', 'brain', 'large-intestine'):
            write(body, sid, *united(sid))
        # --- detail meshes from the dump
        di = json.load(open(f'{DUMP}/{body}/index.json')); by = {e['id']: e for e in di}
        buf = np.memmap(f'{DUMP}/{body}/meshes.bin', dtype=np.uint8, mode='r')
        def dm(e):
            o, nv, nt = e['off'], e['nv'], e['nt']
            return (np.frombuffer(buf, np.float32, nv * 3, o).reshape(-1, 3).astype(np.float64), np.frombuffer(buf, np.uint32, nt * 3, o + nv * 12).reshape(-1, 3))
        def pick(pat, group):
            es = [e for e in di if e['group'] == group and re.search(pat, e['id']) and e['nt'] > 0]
            if not es: raise SystemExit(f'no detail meshes for {pat}')
            return merge([dm(e) for e in es])
        write(body, 'skull', *pick(SKULL, 'skeleton'))
        write(body, 'vertebral-column', *pick(SPINE, 'skeleton'))
        write(body, 'rib-cage', *pick(RIBS, 'skeleton'))
        for s in 'rl':
            write(body, f'humerus-{s}', *pick(f'^bone-humerus-{s}$', 'skeleton'))
            write(body, f'radius-ulna-{s}', *pick(f'^(radius|ulna)-{s}$', 'skeleton'))
            write(body, f'deltoid-{s}', *pick(f'deltoid-muscle-{s}$', 'muscles'))
            write(body, f'biceps-brachii-{s}', *pick(f'head-of-biceps-brachii-{s}$', 'muscles'))
            write(body, f'pectoralis-major-{s}', *pick(f'pectoralis-major-muscle-{s}$', 'muscles'))
            write(body, f'quadriceps-femoris-{s}', *pick(f'^(rectus-femoris|vastus-[a-z]+)-muscle-{s}$', 'muscles'))
            write(body, f'gastrocnemius-{s}', *pick(f'head-of-gastrocnemius-{s}$', 'muscles'))
        # --- registered Z meshes by name
        zi = json.load(open(f'{REG}/{body}/index.json')); zby = {e['name']: e for e in zi}
        def z(name): return load_bin(f'{REG}/{body}/{zby[name]["i"]}.bin')
        write(body, 'stomach', *z('Stomach'))
        for s in 'rl':
            write(body, f'adrenal-gland-{s}', *z(f'Suprarenal gland.{s}'))
            if body == 'male': write(body, f'testis-{s}', *z(f'Testis.{s}'))
        # --- landmarks, measured on the united skin / manubrium
        skin = load_bin(f'{OUT}/{body}/skin.bin')[0]
        man = [e for e in di if e['id'] == 'manubrium-of-sternum'][0]; mv = dm(man)[0]
        top = mv[np.abs(mv[:, 0]) < 0.012]; jy = top[:, 1].max() - 0.004
        def front(x, y, r=0.008):
            m = (np.hypot(skin[:, 0] - x, skin[:, 1] - y) < r); return skin[m, 2].max() - 0.004
        # the notch is a dip between the clavicular heads: the marker (a ball about 12 mm in radius) sits wholly behind the skin of the notch floor
        col = skin[(np.abs(skin[:, 0]) < 0.004) & (np.abs(skin[:, 1] - jy) < 0.006)]
        jug = [0.0, jy, (col[:, 2].max() if len(col) else front(0.0, jy) + 0.004) - 0.0145]
        umb = [o for o in uidx if o['name'].endswith('adipose_tissue_umbilicus_area')][0]
        ux = (umb['min'][0] + umb['max'][0]) / 2; uy = (umb['min'][1] + umb['max'][1]) / 2
        lm = {'jugular-notch': jug, 'umbilicus': [ux, uy, front(ux, uy)]}
        json.dump(lm, open(f'{OUT}/{body}/landmarks.json', 'w')); print('  landmarks', lm)

main()
