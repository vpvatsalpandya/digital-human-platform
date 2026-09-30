import numpy as np, glob, itertools, sys
from reg import *
def rots():
    out=[]
    for p in itertools.permutations(range(3)):
        for s in itertools.product([1,-1],repeat=3):
            M=np.zeros((3,3))
            for i in range(3): M[i,p[i]]=s[i]
            out.append(M)
    return out   # includes reflections (48)
def load_spec(spec):
    d={}
    for p in glob.glob(f'{spec}/07_3D_Models/*.ply'):
        n=p.split('/')[-1].lower()
        for k in ['malleus','incus','stapes','scala_vestibuli','scala vestibuli','scala_tymp','scala tymp','external','tympanic','facial','carotis','chorda','cochleo','cochlear_vest','vestibulo','sinus']:
            if k in n: d[k.split('_')[0].split(' ')[0]+('_'+k.split('_')[1] if k in('scala_vestibuli','scala vestibuli','scala_tymp','scala tymp') else '')]=ply(p)[0]
    return d
def best(spec,body,side):
    d=load_spec(spec)
    ks=['malleus','incus','stapes']
    tz={k:zload(body,zi[f'{k.capitalize()}.{side}'])[0] for k in ks}
    B=np.vstack([tz[k] for k in ks]); Bc=B.mean(0)
    A=np.vstack([d[k] for k in ks]); Ac=A.mean(0)
    sc=np.cbrt(np.prod(B.max(0)-B.min(0))/np.prod(A.max(0)-A.min(0)))
    res=[]
    for M in rots():
        for mirror_ok in [np.linalg.det(M)>0]:
            if not mirror_ok: continue
            X=(A-Ac)@M.T*sc+Bc
            T=(sc,M,Bc-sc*M@Ac)
            T2,r=icp(A,B,T,it=30,scale=False) if False else (T,0)
            # rigid+scale-fixed ICP
            tree=cKDTree(B); Tc=T
            for _ in range(30):
                Xc=apply(Tc,A); dd,j=tree.query(Xc); keep=dd<np.percentile(dd,85)
                s2,R2,t2=umeyama(A[keep],B[j[keep]],scale=False)
                Tc=(sc,R2,t2 - 0 )
                # recompute t with fixed scale
                ma,mb=A[keep].mean(0),B[j[keep]].mean(0); Tc=(sc,R2,mb-sc*R2@ma)
            Xc=apply(Tc,A); dd,_=tree.query(Xc)
            # reverse chamfer too
            t2=cKDTree(Xc); d2,_=t2.query(B)
            res.append((np.sqrt((dd**2).mean()+(d2**2).mean()),Tc,M))
    res.sort(key=lambda x:x[0])
    return res,d,sc
if __name__=='__main__':
    spec,body,side=sys.argv[1:4]
    res,d,sc=best(spec,body,side)
    for r,T,M in res[:4]:
        # anatomical checks: cochlea centroid relative to ossicle chain
        oss=np.vstack([apply(T,d[k]) for k in ['malleus','incus','stapes']]).mean(0)
        coch=apply(T,d['scala_tymp']).mean(0) if 'scala_tymp' in d else None
        eac=apply(T,d['external']).mean(0)
        print('rms %.2f mm'%(r*1000),'scale %.5f'%sc, 'coch-oss (mm) ',np.round((coch-oss)*1000,1),'eac-oss',np.round((eac-oss)*1000,1))
