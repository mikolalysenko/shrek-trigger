"""Offline cell-cover feasibility only; does not draw/change any source pixels."""
import json, pathlib, numpy as np
from scipy.optimize import milp, Bounds, LinearConstraint
from scipy.sparse import csc_matrix
folder=pathlib.Path(__file__).resolve().parent
asset=json.loads((folder/'draft/preview-raster.json').read_text())
pixels=np.array([int(c,16) for c in asset['frames'][6]]).reshape(96,64)
points=np.argwhere(pixels!=0)
rows=[];cols=[];origins=[]
for y in range(81):
 for x in range(49):
  hit=np.where((points[:,0]>=y)&(points[:,0]<y+16)&(points[:,1]>=x)&(points[:,1]<x+16))[0]
  if len(hit):
   i=len(origins);origins.append([x,y]);rows.extend(hit.tolist());cols.extend([i]*len(hit))
a=csc_matrix((np.ones(len(rows)),(rows,cols)),shape=(len(points),len(origins)))
result=milp(np.ones(len(origins)),integrality=np.ones(len(origins)),bounds=Bounds(0,1),constraints=LinearConstraint(a,1,np.inf),options={'time_limit':30,'mip_rel_gap':0})
selected=[] if result.x is None else [origins[i] for i,v in enumerate(result.x) if v>.5]
report={'status':int(result.status),'message':result.message,'cells':len(selected),'origins':selected,'objective':result.fun,'lowerBound':getattr(result,'mip_dual_bound',None)}
(folder/'cell-cover-feasibility.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
