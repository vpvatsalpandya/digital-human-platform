import numpy as np, struct, re, json, sys, glob, itertools
from scipy.spatial import cKDTree
def ply(p):
    b=open(p,'rb').read(); h=b.index(b'end_header\n')+11
    hd=b[:h].decode(); nv=int(re.search(r'element vertex (\d+)',hd).group(1)); nf=int(re.search(r'element face (\d+)',hd).group(1))
    v=np.frombuffer(b[h:h+nv*12],dtype='<f4').reshape(-1,3).astype(float)
    off=h+nv*12; raw=b[off:off+nf*13]
    t=np.frombuffer(raw,dtype=np.uint8).reshape(nf,13)[:,1:].copy().view('<i4').reshape(nf,3)
    return v,t
def zload(body,i):
    b=open(f'/workspace/work/registered/{body}/{i}.bin','rb').read(); nv,nt=struct.unpack('<ii',b[:8])
    v=np.frombuffer(b,dtype=np.float32,count=nv*3,offset=8).reshape(-1,3).astype(float)
    t=np.frombuffer(b,dtype=np.uint32,count=nt*3,offset=8+nv*12).reshape(-1,3); return v,t
Z=json.load(open('/workspace/sources/zanat/index.json'))
zi={o['name'].strip():o['i'] for o in Z if o['nt']>0}
def umeyama(A,B,refl=False,scale=True):
    ma,mb=A.mean(0),B.mean(0); A0,B0=A-ma,B-mb
    U,S,Vt=np.linalg.svd(B0.T@A0/len(A)); D=np.eye(3)
    if not refl and np.linalg.det(U)*np.linalg.det(Vt)<0: D[2,2]=-1
    R=U@D@Vt; s=np.trace(np.diag(S)@D)/A0.var(0).sum() if scale else 1.0
    return s,R,mb-s*R@ma
def apply(T,X): s,R,t=T; return s*X@R.T+t
def icp(A,B,T,it=40,scale=True):
    tree=cKDTree(B)
    for _ in range(it):
        X=apply(T,A); d,j=tree.query(X)
        keep=d<np.percentile(d,90)
        T=umeyama(A[keep],B[j[keep]],scale=scale)
    X=apply(T,A); d,_=tree.query(X); return T,np.sqrt((d**2).mean())
def fit(spec,body,side):
    # spec ossicle meshes -> Z ossicles of given side
    names={'Malleus':'Malleus','Incus':'Incus','Stapes':'Stapes'}
    sp={}
    for k in names:
        f=[p for p in glob.glob(f'{spec}/07_3D_Models/*.ply') if k.lower() in p.lower()][0]
        sp[k]=ply(f)[0]
    tz={k:zload(body,zi[f'{k}.{side}'])[0] for k in names}
    return sp,tz
if __name__=='__main__':
    spec=sys.argv[1]
    for body in ['male','female']:
        for side in ['l','r']:
            sp,tz=fit(spec,body,side)
            best=None
            for mirror in [False,True]:
                m=np.array([-1,1,1.]) if mirror else np.ones(3)
                A3=np.array([sp[k].mean(0)*m for k in sp]); B3=np.array([tz[k].mean(0) for k in sp])
                T=umeyama(A3,B3)
                # sanity scale
                A=np.vstack([sp[k]*m for k in sp]); B=np.vstack([tz[k] for k in sp])
                # try many initial rotations: 3-point fit plus axis perms
                T2,r=icp(A,B,T)
                # also pure 3-pt residual
                res3=np.sqrt(((apply(T,A3)-B3)**2).sum(1).mean())
                print(spec,body,side,'mirror',mirror,'scale %.3f'%T2[0],'rms_icp %.3f mm'%(r*1000),'res3 %.2f mm'%(res3*1000))
