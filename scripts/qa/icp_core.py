import sys, json, struct, numpy as np
sys.path.insert(0,'/workspace/digital-human-platform/scripts/qa')
from render import Scene
from scipy.spatial import cKDTree
def load(d,i):
    b=open(f'{d}/{i}.bin','rb').read(); nv,nt=struct.unpack('<ii',b[:8]); return np.frombuffer(b,dtype=np.float32,count=nv*3,offset=8).reshape(-1,3).astype(float)
def pool(s):
    d=f'/workspace/sources/hra/objs-{s}'; idx=json.load(open(d+'/index.json'))
    P=[];L=[]
    for o in idx:
        v=load(d,o['i']); v=v[::max(1,len(v)//4000)]; P.append(v); L+= [o['name']]*len(v)
    return np.vstack(P),np.array(L)
if __name__=='__main__':
    for s,b in (('m','male'),('f','female')):
        P,L=pool(s); T=cKDTree(P); sc=Scene(b); print(b,len(P))
        for e in sc.idx:
            if e['group']!='core' or e['provenance'] not in ('hra',): continue
            v,_=sc.mesh(e); v=v[::max(1,len(v)//3000)].astype(float)
            d0,_=T.query(v); t=np.zeros(3)
            for it in range(30):
                d,i=T.query(v+t); t=t+(P[i]-(v+t)).mean(0)*0.7
            d1,_=T.query(v+t)
            print('  %-18s resid before %.4f after %.4f | shift %s'%(e['id'],np.median(d0),np.median(d1),(t*1000).round(1)))
