import numpy as np
from PIL import Image
def splat(layers, view='front', box=(-0.7,0.7,-0.95,0.95), px=500, bg=(18,20,26)):
    """layers: list of (points Nx3, rgb). nearest wins"""
    x0,x1,y0,y1=box; W=px; H=int(round(px*(y1-y0)/(x1-x0)))
    img=np.zeros((H,W,3),np.float32); dep=np.full((H,W),-1e9,np.float32)
    for P,c in layers:
        if view=='front': u,d=-P[:,0],P[:,2]
        elif view=='back': u,d=P[:,0],-P[:,2]
        elif view=='left': u,d=P[:,2],P[:,0]
        else: u,d=-P[:,2],-P[:,0]
        X=((u-x0)/(x1-x0)*(W-1)).round().astype(int); Y=((y1-P[:,1])/(y1-y0)*(H-1)).round().astype(int)
        m=(X>=0)&(X<W-1)&(Y>=0)&(Y<H-1); X,Y,d=X[m],Y[m],d[m]
        o=np.argsort(d)
        for dx in (0,1):
            for dy in (0,1):
                xx,yy=X[o]+dx,Y[o]+dy; upd=d[o]>dep[yy,xx]
                img[yy[upd],xx[upd]]=c; dep[yy[upd],xx[upd]]=d[o][upd]
    img[img.sum(2)==0]=bg
    return Image.fromarray(img.astype(np.uint8))
