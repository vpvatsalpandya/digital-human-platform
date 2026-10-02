import numpy as np, glob, itertools, sys, json
from reg import *
from reg2 import rots
def pick(spec):
    d={}
    for p in glob.glob(f'{spec}/07_3D_Models/*.ply'):
        n=p.split('/')[-1].lower()
        m={'malleus':'malleus','incus':'incus','stapes':'stapes','scala_tymp':'st','scala tymp':'st','external':'eac','carotis':'car','sinus':'sinus','scala_vest':'sv','scala vest':'sv'}
        for k,v in m.items():
            if k in n: d[v]=ply(p)[0]
    return d
PRI={'st':(-1,-0.25,0.45),'eac':(1,0,-0.2),'car':(-0.6,-0.3,0.6),'sinus':(-0.1,-0.3,-1)}
def unit(a): a=np.array(a,float); return a/np.linalg.norm(a)
def score(T,d,s,Bc):
    oss=np.vstack([apply(T,d[k]) for k in ['malleus','incus','stapes']]).mean(0); pen=0; det={}
    for k,p in PRI.items():
        if k not in d: continue
        v=apply(T,d[k]).mean(0)-oss; pr=unit((p[0]*s,p[1],p[2])); c=unit(v)@pr; pen+=1-c; det[k]=round(float(c),2)
    return pen,det
def run(spec,body,side,allow_mirror=False):
    d=pick(spec); s=1 if side=='l' else -1
    ks=['malleus','incus','stapes']
    B=np.vstack([zload(body,zi[f'{k.capitalize()}.{side}'])[0] for k in ks]); Bc=B.mean(0)
    A=np.vstack([d[k] for k in ks]); Ac=A.mean(0)
    sc=np.cbrt(np.prod(B.max(0)-B.min(0))/np.prod(A.max(0)-A.min(0)))
    tree=cKDTree(B); out=[]
    for M in rots():
        mirrored=np.linalg.det(M)<0
        if mirrored and not allow_mirror: continue
        Tc=(sc,M,Bc-sc*M@Ac)
        for _ in range(25):
            Xc=apply(Tc,A); dd,j=tree.query(Xc); keep=dd<np.percentile(dd,85)
            s2,R2,_t=umeyama(A[keep],B[j[keep]],scale=False)
            ma,mb=A[keep].mean(0),B[j[keep]].mean(0); Tc=(sc,R2,mb-sc*R2@ma)
        Xc=apply(Tc,A); dd,_=tree.query(Xc); d2,_=cKDTree(Xc).query(B)
        rms=np.sqrt((dd**2).mean()+(d2**2).mean())*1000
        pen,det=score(Tc,d,s,Bc)
        out.append((pen+rms*0.3,rms,pen,det,mirrored,Tc))
    out.sort(key=lambda x:x[0]); return out[0]
if __name__=='__main__':
    for spec in sorted(glob.glob('/workspace/sources/openear/*/')):
        n=spec.rstrip('/').split('/')[-1]
        row=[]
        for body in ['male']:
            for side in ['l','r']:
                o=run(spec[:-1],body,side)
                row.append((side,round(o[0],2),round(o[1],2),round(o[2],2),o[3]))
        print(n,row)
