import sys, json, itertools, numpy as np
sys.path.insert(0,'/workspace/digital-human-platform/scripts/qa')
from render import Scene
from icp_core import pool
from scipy.spatial import cKDTree
out={}
for s,b in (('m','male'),('f','female')):
    P,L=pool(s); T=cKDTree(P); sc=Scene(b); out[b]={}
    grid=np.arange(-0.08,0.0801,0.02)
    for e in sc.idx:
        if e['group']!='core' or e['provenance']!='hra' or e['id'] in ('skin','femur-r','femur-l','tibia-fibula-r','tibia-fibula-l','liver','kidney-r','kidney-l','urinary-bladder','uterus','ovary-r','ovary-l','prostate','small-intestine','pancreas'): continue
        v,_=sc.mesh(e); v=v[::max(1,len(v)//2500)].astype(float); vs=v[::5]
        best=None
        for t0 in itertools.product(grid,grid,grid):
            t=np.array(t0); 
            for it in range(8):
                d,i=T.query(vs+t); t=t+(P[i]-(vs+t)).mean(0)
            d,i=T.query(vs+t); r=np.median(d)
            if best is None or r<best[0]: best=(r,t.copy())
        r,t=best
        for it in range(25):
            d,i=T.query(v+t); t=t+(P[i]-(v+t)).mean(0)
        d,i=T.query(v+t); names=L[i]; 
        from collections import Counter
        c=Counter(names).most_common(3)
        print(b,'%-18s resid %.4f shift mm %s  e.g. %s'%(e['id'],np.median(d),(t*1000).round(1),c[:2]),flush=True)
        out[b][e['id']]={'shift':t.tolist(),'resid':float(np.median(d))}
json.dump(out,open('/workspace/qa/icp_multi.json','w'))
