"""Ankle/foot numbers per side and left/right symmetry: distal tibia / fibula vs the talar facets, malleolar span, depth of the distal tibia inside the skin,
and the share of lower-leg / foot vertices outside the skin (centroid below the knee). usage: python3 scripts/qa/anklefit.py [dump_dir]"""
import sys, os, re, numpy as np
if len(sys.argv)>1: os.environ['QA_DUMP']=sys.argv[1]
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','assets','extract'))
from render import Scene
from outside import Loaded
from scipy.spatial import cKDTree
def run(body,s,verbose=True):
    sc=Scene(body); S=Loaded(f'/workspace/qa/solid-{s}.pkl'); res={}
    V=lambda i: sc.mesh(sc.by[i])[0].astype(float) if i in sc.by and sc.by[i]['nt'] else None
    for side in 'lr':
        sg=1 if side=='l' else -1
        tib,fib,tal,cal=V(f'tibia-{side}'),V(f'fibula-{side}'),V(f'talus-{side}'),V(f'calcaneus-{side}')
        r={}
        # distal 25 mm of tibia / fibula, in lateral-mirrored coordinates (x*sg: positive = lateral... body-left x>0 so +x is lateral for left leg)
        td=tib[tib[:,1]<tib[:,1].min()+0.025]; fd=fib[fib[:,1]<fib[:,1].min()+0.025]
        # talus dome = top 12 mm of talus
        tt=tal[tal[:,1]>tal[:,1].max()-0.012]
        # facets: distal tibia articular surface vs talar dome: min and mean NN distance of dome points to tibia distal points
        dtree=cKDTree(td); dd=dtree.query(tt)[0]
        r['tibia_distal_to_talus_dome_mm']=(dd.min()*1000, dd.mean()*1000)
        # lateral talus facet vs fibula distal: talus lateral-most 12mm
        lat=tal[(tal[:,0]*sg)>(tal[:,0]*sg).max()-0.012]; r['fibula_distal_to_talus_lat_mm']=(cKDTree(fd).query(lat)[0].min()*1000,cKDTree(fd).query(lat)[0].mean()*1000)
        # centroid offset of distal tibia relative to talus (mm): x medial-lateral (positive lateral), y, z
        off=(td.mean(0)-tt.mean(0)); r['tibia_distal_minus_talusdome_xyz_mm(lat+,up+,ant+)']=(off[0]*sg*1000,off[1]*1000,off[2]*1000)
        offf=(fd.mean(0)-lat.mean(0)); r['fibula_distal_minus_talus_lat_xyz_mm']=(offf[0]*sg*1000,offf[1]*1000,offf[2]*1000)
        r['tal_cal_gap_mm']=cKDTree(cal).query(tal)[0].min()*1000
        r['tibia_distal_depth_mm(min,median)']=(S.query(td).min()*1000,np.median(S.query(td))*1000)
        r['talus_depth_min_mm']=S.query(tal).min()*1000
        # tibia-fibula distal intermalleolar gap
        r['tibia_fibula_distal_gap_mm']=cKDTree(fd).query(td)[0].min()*1000
        # intermalleolar width: distal tibia medial extremity to fibula lateral extremity
        r['malleolar_span_mm']=(abs((fd[:,0]*sg).max()-(td[:,0]*sg).min())*1000)
        res[side]=r
    # structure outside percentages: every entry whose centroid is in the lower leg/foot region for each side
    rows={}
    for side in 'lr':
        tib=V(f'tibia-{side}'); ytop=tib[:,1].max()-0.1*np.ptp(tib[:,1]); sg=1 if side=='l' else -1
        tot=out=0; n=0; bad=[]
        for e in sc.idx:
            if e['nt']==0 or e['id'] in('skin',) or e.get('category')=='skin layer' or re.search('hair|nail|dermis|hypodermis',e['id']): continue
            v,_=sc.mesh(e); c=v.mean(0)
            if c[1]<ytop and c[0]*sg>0.01 and e['group'] != 'schematic' and e.get('provenance')!='generated':
                q=S.query(v.astype(float)); fr=float((q<-0.004).mean()); tot+=len(v); out+=fr*len(v); n+=1
                if fr>=0.1: bad.append((fr,e['id'],round(float(q.min())*1000)))
        rows[side]=(n,100*out/max(tot,1),sorted(bad,reverse=True))
    if verbose:
        print('==',body)
        for side in 'lr':
            print(' ',side); [print('    %-48s %s'%(k,tuple(round(float(x),1) for x in np.atleast_1d(v)))) for k,v in res[side].items()]
            n,p,bad=rows[side]; print('    shank+foot structures (centroid below knee, %d): %.2f%% of vertices >4mm outside skin; >=10%%: %s'%(n,p,bad[:12]))
    if verbose:
        l,r=res['l'],res['r']; print('  left/right (mirrored) differences, mm: '+'; '.join(f'{k.split("(")[0]} {abs(np.atleast_1d(l[k])[0]-np.atleast_1d(r[k])[0]):.1f}' for k in ('tibia_distal_minus_talusdome_xyz_mm(lat+,up+,ant+)','malleolar_span_mm','tibia_distal_depth_mm(min,median)')))
    return res,rows
if __name__=='__main__':
    for b,s in (('male','m'),('female','f')): run(b,s)
