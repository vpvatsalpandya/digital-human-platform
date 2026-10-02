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
