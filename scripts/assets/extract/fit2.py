import json,numpy as np
from fit import zb,hb,pairs
def corners(mn,mx):
    return np.array([[x,y,z] for x in (mn[0],mx[0]) for y in (mn[1],mx[1]) for z in (mn[2],mx[2])])
def lm(sex,torso_only=True):
    idx,prs=pairs(sex); rows=[]
    for name,zs,hs in prs:
        if not (name[0] in 'CTL' and name[1:].isdigit() or name in('sacrum','coccyx','hyoid','thyroidcart','cricoid') or name.startswith('hip')): continue
        a=zb(zs);b=hb(idx,hs)
        if a is None or b is None: continue
        zmn,zmx=a; hmn,hmx=b
        zmn2=np.array([zmn[0],zmn[2],-zmx[1]]); zmx2=np.array([zmx[0],zmx[2],-zmn[1]])
        rows.append((name,zmn2,zmx2,np.array(hmn),np.array(hmx)))
    return rows
for sex in 'mf':
    rows=lm(sex)
    A=[];B=[]
    for n,a1,a2,b1,b2 in rows:
        A+= [ (a1+a2)/2 ]; B+=[(b1+b2)/2]     # centres
        A+= [a2-a1];B+=[b2-b1]   # sizes (not used for translation)
    cA=np.array([ (r[1]+r[2])/2 for r in rows]); cB=np.array([(r[3]+r[4])/2 for r in rows])
    zA=np.array([ r[2]-r[1] for r in rows]); zB=np.array([r[4]-r[3] for r in rows])
    # uniform scale from centre spread (vertical) + sizes
    s_h=np.polyfit(cA[:,1],cB[:,1],1); 
    print(sex,'vertical fit scale %.3f off %.3f'%tuple(s_h),'resid mm',np.std(cB[:,1]-np.polyval(s_h,cA[:,1]))*1000)
    print('  size ratio (hra/z) mean per axis',(zB/zA).mean(0).round(3),'median',np.median(zB/zA,0).round(3))
    # uniform scale + translation from centres
    for lab,sc in (('uniform',None),):
        s=s_h[0]
        t=(cB-s*cA).mean(0)
        r=cB-(s*cA+t); print('  uniform s %.3f t'%s,t.round(4),'rms mm',np.sqrt((r**2).mean(0))*1000)
    for ax in (0,2):
        p=np.polyfit(cA[:,ax],cB[:,ax],1); print('  axis',ax,'free fit',p.round(3), 'spread',np.ptp(cA[:,ax]).round(3))
