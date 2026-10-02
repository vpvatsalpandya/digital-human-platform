import numpy as np
from reg import *
from reg2 import rots
from final_lib import readvtk, plyfull, IE
def ext(v): return np.round(v.max(0)-v.min(0),1)
ist=readvtk(f'{IE}/seg_coch_inner_scala_tympani.vtk')[0]; isv=readvtk(f'{IE}/seg_coch_inner_scala_vestibuli.vtk')[0]
ast=plyfull('Scala_Tympani')[0]; asv=plyfull('Scala_Vestibuli')[0]
print('IE ST',ext(ist),len(ist),'ALPHA ST',ext(ast)); print('IE SV',ext(isv),'ALPHA SV',ext(asv))
# fit cochlea-only: IE ST -> ALPHA ST, scale in [0.85,1.15]
A=ist;B=ast;tree=cKDTree(B);res=[]
for M in rots():
    if np.linalg.det(M)<0: continue
    T=(1.0,M,B.mean(0)-M@A.mean(0))
    for _ in range(60):
        X=apply(T,A); d,j=tree.query(X); keep=d<np.percentile(d,90)
        s,R,t=umeyama(A[keep],B[j[keep]],scale=True); s=min(1.15,max(0.85,s))
        ma,mb=A[keep].mean(0),B[j[keep]].mean(0); T=(s,R,mb-s*R@ma)
    X=apply(T,A); d,_=tree.query(X); d2,_=cKDTree(X).query(B); res.append((np.sqrt((d**2).mean()+(d2**2).mean()),T))
res.sort(key=lambda x:x[0]); print([ (round(r,2),round(t[0],3)) for r,t in res[:4]])
T=res[0][1]
import pickle; pickle.dump(T,open('T_ie.pkl','wb'))
for n in ['ls_Hsapiens_utricle','mesh_david_sacculus','ls_Hsapiens_Sa','ls_Hsapiens_Sl','ls_Hsapiens_Sp','mesh_david_cochlea']:
    v=apply(T,readvtk(f'{IE}/{n}.vtk')[0]); d,_=cKDTree(asv).query(v); print(n,'dist to ALPHA SV: min %.2f mean %.2f mm'%(d.min(),d.mean()), 'centre',np.round(v.mean(0),1),'ALPHA SV centre',np.round(asv.mean(0),1))
