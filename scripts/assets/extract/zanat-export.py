import bpy, json, numpy as np, struct
bpy.ops.wm.open_mainfile(filepath='/workspace/sources/zanat/Z-Anatomy/Startup.blend')
dg=bpy.context.evaluated_depsgraph_get()
parent={}
def rec(c,path):
    for o in c.objects: parent.setdefault(o.name,[]).append(path+[c.name])
    for ch in c.children: rec(ch,path+[c.name])
rec(bpy.context.scene.collection,[])
index=[]
k=0
for o in bpy.data.objects:
    if o.type not in ('MESH','CURVE'): continue
    try:
        eo=o.evaluated_get(dg); me=eo.to_mesh()
    except Exception: continue
    if len(me.vertices)==0 or len(me.polygons)==0:
        eo.to_mesh_clear(); continue
    me.calc_loop_triangles()
    nv=len(me.vertices); nt=len(me.loop_triangles)
    v=np.empty(nv*3,dtype=np.float32); me.vertices.foreach_get('co',v); v=v.reshape(-1,3)
    M=np.array(eo.matrix_world,dtype=np.float64)
    vw=(v.astype(np.float64)@M[:3,:3].T+M[:3,3]).astype(np.float32)
    t=np.empty(nt*3,dtype=np.uint32); me.loop_triangles.foreach_get('vertices',t)
    with open(f'objs/{k}.bin','wb') as f:
        f.write(struct.pack('<ii',nv,nt)); f.write(vw.tobytes()); f.write(t.tobytes())
    index.append(dict(i=k,name=o.name,type=o.type,paths=['/'.join(p) for p in parent.get(o.name,[])],nv=nv,nt=nt,
        min=vw.min(0).tolist(),max=vw.max(0).tolist()))
    k+=1
    eo.to_mesh_clear()
json.dump(index,open('index.json','w'))
print('exported',k)
