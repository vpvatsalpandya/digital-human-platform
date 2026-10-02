import sys, pickle, json, numpy as np
sys.path.insert(0,'/workspace/digital-human-platform/scripts/assets/extract')
sys.path.insert(0,'/workspace/digital-human-platform/scripts/qa')
from render import Scene
from solid import Solid
from scipy import ndimage
class Loaded(Solid):
    def __init__(self, path):
        lo,n,h,pk,shape=pickle.load(open(path,'rb'))
        self.lo,self.n,self.h=lo,n,h; self.inside=np.unpackbits(pk)[:np.prod(shape)].reshape(shape).astype(bool)
        self.depth=ndimage.distance_transform_edt(self.inside,sampling=h)-ndimage.distance_transform_edt(~self.inside,sampling=h)
def report(body, solid, tol=-0.004, minfrac=0.2, skip=lambda e:False):
    sc=Scene(body); rows=[]
    for e in sc.idx:
        if e['nt']==0 or skip(e): continue
        v,_=sc.mesh(e); q=solid.query(v.astype(float)); fr=(q<tol).mean()
        if fr>=minfrac: rows.append((fr,e['id'],e['group'],e['provenance'],round(float(q.min()),3)))
    rows.sort(reverse=True); return rows
if __name__=='__main__':
    import collections
    for body,s in (('male','m'),('female','f')):
        S=Loaded(f'/workspace/qa/solid-{s}.pkl')
        rows=report(body,S,skip=lambda e:e['id'] in('skin',) or e.get('category') in ('skin layer',) or 'hair' in e['id'] or 'nail' in e['id'])
        print(body,len(rows),'structures >=20% outside united skin')
        c=collections.Counter((r[2]) for r in rows); print(' by group',dict(c))
        for r in rows[:40]: print('  %.2f %-50s %-12s %-10s mindepth %.3f'%r)
