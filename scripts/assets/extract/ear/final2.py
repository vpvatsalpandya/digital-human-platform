"""Register OpenEar ALPHA (right temporal bone, CC BY 4.0) and IE-Map labyrinth (CC BY 4.0) into each body.
Outputs /workspace/work/ear-registered/{male,female}/<key>.bin  (int32 nv, int32 nt, f32 xyz, u32 idx) + report.json"""
import numpy as np, glob, os, json, struct, sys
from reg import *
from reg3 import pick
SPEC='/workspace/sources/openear/ALPHA'; IE='/workspace/sources/iemap'
OUT='/workspace/work/ear-registered'
def readvtk(p):
    b=open(p,'rb').read(); i=b.index(b'POINTS'); j=b.index(b'\n',i); n=int(b[i:j].split()[1])
    pts=np.frombuffer(b[j+1:j+1+n*12],dtype='>f4').reshape(-1,3).astype(float)
    k=b.index(b'POLYGONS',j); l=b.index(b'\n',k); npoly,size=map(int,b[k:l].split()[1:3])
    arr=np.frombuffer(b[l+1:l+1+size*4],dtype='>i4'); tri=arr.reshape(-1,4)[:,1:].astype(np.int64)
    return pts,tri
def plyfull(name):
    return ply(f'{SPEC}/07_3D_Models/{name}.ply')
def save(path,v,t):
    with open(path,'wb') as f:
        f.write(struct.pack('<ii',len(v),len(t))); f.write(v.astype('<f4').tobytes()); f.write(t.astype('<u4').tobytes())
import pickle
T_ie=pickle.load(open('/workspace/work/ear/T_ie.pkl','rb'))
best=(1.0,T_ie)
d=pick(SPEC)
from reg3 import run
report={'ie_to_alpha_rms_mm':round(best[0],3),'ie_scale':round(T_ie[0],4)}
parts={}
def add(key,v,t): parts[key]=(v,t)
for n,k in [('Scala_Tympani','scala-tympani'),('Scala_Vestibuli','scala-vestibuli'),('External_Auditory_Canal','external-acoustic-meatus'),('Round_Window','round-window')]:
    add(k,*plyfull(n))
ie_files={'anterior-semicircular-duct':'ls_Hsapiens_Sa','lateral-semicircular-duct':'ls_Hsapiens_Sl','posterior-semicircular-duct':'ls_Hsapiens_Sp','anterior-membranous-ampulla':'ls_Hsapiens_Aa','lateral-membranous-ampulla':'ls_Hsapiens_Al','posterior-membranous-ampulla':'ls_Hsapiens_Ap','utricle':'ls_Hsapiens_utricle','saccule':'mesh_david_sacculus','cochlear-duct':'mesh_david_cochlea'}
for k,f in ie_files.items():
    v,t=readvtk(f'{IE}/{f}.vtk'); add(k,apply(T_ie,v),t)
os.makedirs(OUT,exist_ok=True)
for body in ['male','female']:
    os.makedirs(f'{OUT}/{body}',exist_ok=True)
    ks=['malleus','incus','stapes']
    Br=np.vstack([zload(body,zi[f'{k.capitalize()}.r'])[0] for k in ks]); Bl=np.vstack([zload(body,zi[f'{k.capitalize()}.l'])[0] for k in ks])
    o=run(SPEC,body,'r'); Tr=o[5]; report[f'{body}_right_ossicle_rms_mm']=round(o[1],3)
    xm=(Br[:,0].mean()+Bl[:,0].mean())/2
    # left: mirror right result across x=xm, then rigid ICP to left ossicles
    mir=lambda X: np.c_[2*xm-X[:,0],X[:,1],X[:,2]]
    Aoss=np.vstack([d[k] for k in ks]); Xl=mir(apply(Tr,Aoss)); tree=cKDTree(Bl); R=np.eye(3); t=np.zeros(3)
    for _ in range(30):
        Y=Xl@R.T+t; dd,j=tree.query(Y); keep=dd<np.percentile(dd,85)
        s,R2,t2=umeyama(Xl[keep],Bl[j[keep]],scale=False); R,t=R2,t2
    Y=Xl@R.T+t; dd,_=tree.query(Y); report[f'{body}_left_ossicle_rms_mm']=round(float(np.sqrt((dd**2).mean()+(cKDTree(Y).query(Bl)[0]**2).mean()))*1000,3)
    for k,(v,tri) in parts.items():
        vr=apply(Tr,v); save(f'{OUT}/{body}/{k}.r.bin',vr,tri)
        vl=mir(vr)@R.T+t; save(f'{OUT}/{body}/{k}.l.bin',vl,tri[:,[0,2,1]])
    print(body,{k:float(v) for k,v in report.items()})
json.dump({k:float(v) for k,v in report.items()},open(f'{OUT}/report.json','w'),indent=1)
