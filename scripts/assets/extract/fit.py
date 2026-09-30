import json,re,sys,numpy as np
Z=json.load(open('/workspace/sources/zanat/index.json'))
zn={}
for o in Z:
    if o['nt']>0: zn.setdefault(o['name'].strip(),o)
def zb(names):
    os_=[zn[n] for n in names if n in zn]
    if len(os_)!=len(names): return None
    mn=np.min([o['min'] for o in os_],0); mx=np.max([o['max'] for o in os_],0); return mn,mx
def hb(idx,names):
    os_=[idx[n] for n in names if n in idx]
    if len(os_)!=len(names): return None
    mn=np.min([o['min'] for o in os_],0); mx=np.max([o['max'] for o in os_],0); return mn,mx
def pairs(sex):
    P='VH_M_' if sex=='m' else 'VH_F_'
    idx={o['name'][len(P):] if o['name'].startswith(P) else o['name']:o for o in json.load(open(f'/workspace/sources/hra/objs-{sex}/index.json'))}
    out=[]
    zc=['Atlas (C1)','Axis (C2)']+[f'Vertebra C{i}' for i in range(3,8)]
    for i in range(7): out.append((f'C{i+1}',[zc[i]],[f'cervical_vertebra_{i+1}']))
    for i in range(12): out.append((f'T{i+1}',[f'Vertebra T{i+1}'],[f'thoracic_vertebra_{i+1}']))
    for i in range(5): out.append((f'L{i+1}',[f'Vertebra L{i+1}'],[f'lumbar_vertebra_{i+1}']))
    out+= [('sacrum',['Sacrum'],['sacrum']),('coccyx',['Coccyx'],['coccyx']),('hyoid',['Hyoid bone'],['hyoid']),
      ('thyroidcart',['Thyroid cartilage'],['thyroid_cartilage']),('cricoid',['Cricoid cartilage'],['cricoid_cartilage'])]
    for s,S in (('l','L'),('r','R')):
        out+=[(f'patella{S}',[f'Patella.{s}'],[f'patella_{S}']),(f'femur{S}',[f'Femur.{s}'],[f'femur_{S}']),(f'tibia{S}',[f'Tibia.{s}'],[f'tibia_{S}']),(f'fibula{S}',[f'Fibula.{s}'],[f'fibula_{S}']),
        (f'hip{S}',[f'Hip bone.{s}'],[f'ilium_compact_bone_{S}',f'ischium_compact_bone_{S}',f'pubis_compact_bone_{S}']),
        (f'tonsil{S}',[f'Palatine tonsil.{s}'],[f'palatine_tonsil_{S}']),(f'parotid{S}',[f'Parotid gland.{s}'],[f'parotid_gland_{S}']),(f'submand{S}',[f'Submandibular gland.{s}'],[f'submandibular_gland_{S}'])]
    out+=[('spleen',['Spleen'],['diaphragmatic_surface_of_spleen','colic_surface_of_spleen','gastric_surface_of_spleen','renal_surface_of_spleen']) ,('gallbladder',['Gallbladder'],['gallbladder']),('trachea',['Trachea'],['trachea'])]
    return idx,out
def fit(sex,excl=()):
    idx,prs=pairs(sex)
    X=[[],[],[]];Y=[[],[],[]];lab=[]
    for name,zs,hs in prs:
        if name in excl: continue
        a=zb(zs); b=hb(idx,hs)
        if a is None or b is None: continue
        zmn,zmx=a; hmn,hmx=b
        # Z (x left, y back, z up)-> body (x, y=zz, z=-zy); min/max of -zy swap
        zmn2=np.array([zmn[0],zmn[2],-zmx[1]])*1.0; zmx2=np.array([zmx[0],zmx[2],-zmn[1]])
        for ax in range(3):
            for zv,hv in ((zmn2[ax],hmn[ax]),(zmx2[ax],hmx[ax])):
                X[ax].append(zv);Y[ax].append(hv)
        lab.append(name)
    return X,Y,lab,prs
if __name__=='__main__':
    res={}
    for sex in 'mf':
        X,Y,lab,_=fit(sex)
        p=[]
        for ax in range(3):
            x=np.array(X[ax]);y=np.array(Y[ax]); w=np.ones(len(x))
            for it in range(6):
                A=np.vstack([x,np.ones_like(x)]).T
                sol=np.linalg.lstsq(A*w[:,None],y*w,rcond=None)[0]
                r=y-A@sol; s=np.median(np.abs(r))*1.5+1e-3; w=(np.abs(r)<3*s).astype(float)
            p.append(sol.tolist()); print(sex,'axis',ax,'scale %.4f t %.4f'%tuple(sol),'rms mm',np.sqrt(np.mean((r[w>0])**2))*1000, 'n',len(x), 'inliers',int(w.sum()))
        res[sex]=p
        # per structure residuals
        X,Y,lab,_=fit(sex)
        for k,name in enumerate(lab):
            e=[]
            for ax in range(3):
                for j in (2*k,2*k+1):
                    e.append((Y[ax][j]-(p[ax][0]*X[ax][j]+p[ax][1]))*1000)
            if max(abs(v) for v in e)>25: print('  ',sex,name,[round(v) for v in e])
    json.dump(res,open('fit.json','w'))
