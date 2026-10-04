"""Numeric limb-fit report: percent of vertices inside the united skin (tolerance 4 mm) for hand, finger and lower-leg structures.
usage: python3 scripts/qa/limbfit.py [male|female|both] [dump_dir]"""
import sys, re, numpy as np
sys.path.insert(0,'/workspace/digital-human-platform/scripts/qa')
from outside import Loaded
from render import Scene
TOL=-0.004
def groups(e):
    i=e['id']
    if re.search(r'phalanx-of-\w+-finger-of-hand',i): return 'finger bones (hand)'
    if re.search(r'(metacarpal|scaphoid|lunate|triquetrum|pisiform|trapez|capitate|hamate)',i) and e['group']=='skeleton': return 'metacarpals+carpals'
    if re.search(r'-of-hand|digits-of-hand|palmar|digital|interphalangeal|metacarpophalangeal',i) and e['group']!='skeleton': return 'hand soft tissue'
    if re.search(r'^(tibia|fibula)-',i) or i in('tibia-l','tibia-r','fibula-l','fibula-r'): return 'tibia+fibula'
    if re.search(r'(gastrocnemius|soleus|tibialis|fibularis|peroneus|extensor-digitorum-longus|flexor-(digitorum|hallucis)-longus|plantaris|popliteus|extensor-hallucis-longus)',i) and e['group']=='muscles': return 'lower-leg muscles'
    if re.search(r'(talus|calcaneus|navicular|cuboid|cuneiform|metatarsal|phalanx-of-\w+-finger-of-foot)',i) and e['group']=='skeleton': return 'foot bones'
    return None
def run(body, s):
    S=Loaded(f'/workspace/qa/solid-{s}.pkl'); sc=Scene(body); acc={}; per={}
    for e in sc.idx:
        if e['nt']==0: continue
        g=groups(e)
        if not g: continue
        v,_=sc.mesh(e); q=S.query(v.astype(float)); fr=float((q<TOL).mean())
        acc.setdefault(g,[]).append((fr,len(v),e['id'])); per[e['id']]=fr
    print(f'== {body}')
    for g,l in acc.items():
        n=sum(x[1] for x in l); out=sum(x[0]*x[1] for x in l)
        bad=sum(1 for x in l if x[0]>=0.2)
        print(f'  {g:24s} n={len(l):3d}  vertices outside skin {100*out/n:5.1f}%   structures >=20% outside: {bad}   worst: '+', '.join(f'{x[2]} {x[0]:.2f}' for x in sorted(l,reverse=True)[:3]))
    # finger spacing: distal phalanx centroids per side
    for side in 'lr':
        c=[]
        for f in ('first','second','third','fourth','fifth'):
            e=sc.by.get(f'distal-phalanx-of-{f}-finger-of-hand-{side}')
            if e: c.append(sc.mesh(e)[0].mean(0))
        if len(c)==5:
            c=np.array(c); d=np.linalg.norm(np.diff(c,axis=0),axis=1)*1000
            print(f'  hand {side}: distal-phalanx spacing mm (1-2,2-3,3-4,4-5): '+' '.join(f'{x:.0f}' for x in d)+f'  min {d.min():.0f}')
if __name__=='__main__':
    w=sys.argv[1] if len(sys.argv)>1 else 'both'
    if len(sys.argv)>2:
        import os; os.environ['QA_DUMP']=sys.argv[2]
    for b,s in (('male','m'),('female','f')):
        if w in (b,'both'): run(b,s)
