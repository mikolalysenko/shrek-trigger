// Orthographic software renderer for the archived Shrek SuperSlam OBJ/MTL.
// Geometry and UVs come exclusively from the source archive. Local posing is
// kept separate from original data; there are no replacement body primitives.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PNG} from 'pngjs';
const root=new URL('./',import.meta.url),source=new URL('source/pinocchio/',root);
export const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);}};
export async function loadModel(){
 const positions=[],uvs=[],normals=[],faces=[],objects=[],materials={};let object,material;
 for(const line of (await readFile(new URL('pinocchio.mtl',source),'utf8')).split('\n')){const [kind,...v]=line.trim().split(/\s+/);if(kind==='newmtl'){material=v[0];materials[material]={name:material};}if(kind==='map_Kd')materials[material].file=v.join(' ');}
 for(const m of Object.values(materials))m.image=PNG.sync.read(await readFile(new URL(m.file,source)));
 for(const line of (await readFile(new URL('pinocchio.obj',source),'utf8')).split('\n')){
  const [kind,...v]=line.trim().split(/\s+/);
  if(kind==='v')positions.push(v.map(Number));if(kind==='vt')uvs.push(v.map(Number));if(kind==='vn')normals.push(v.map(Number));
  if(kind==='o'){object=v[0];objects.push(object);}if(kind==='usemtl')material=v[0];
  if(kind==='f'){const indices=v.map(s=>s.split('/').map(n=>Number(n)-1));for(let i=1;i<indices.length-1;i++)faces.push({object,material,indices:[indices[0],indices[i],indices[i+1]]});}
 }
 return{positions,uvs,normals,faces,objects,materials};
}
export function rotate(p,axis,radians){const [x,y,z]=p,c=Math.cos(radians),s=Math.sin(radians);return axis==='x'?[x,y*c-z*s,y*s+z*c]:axis==='y'?[x*c+z*s,y,-x*s+z*c]:[x*c-y*s,x*s+y*c,z];}
export function around(p,pivot,axis,a){return V.add(rotate(V.sub(p,pivot),axis,a),pivot);}
export function render(model,{width=256,height=256,yaw=0,elevation=12,scale=height/1.9,aspect=1,offset=[0,0],center=[0,.83,0],pose=null,light=true}={}){
 const image=new PNG({width,height}),zbuffer=new Float64Array(width*height).fill(-Infinity),yawRad=yaw*Math.PI/180,elevRad=elevation*Math.PI/180;
 const vertices=model.positions.map((p,i)=>pose?pose(p,i):p),camera=p=>rotate(rotate(V.sub(p,center),'y',yawRad),'x',elevRad),project=p=>{const q=camera(p);return[width/2+q[0]*scale*aspect+offset[0],height/2-q[1]*scale+offset[1],q[2]];};
 const lightDir=V.norm([-.5,.8,.8]);
 for(const face of model.faces){
  const world=face.indices.map(([v])=>vertices[v]),p=world.map(project),uv=face.indices.map(([,t])=>model.uvs[t]),mat=model.materials[face.material],texture=mat.image;
  const normal=V.norm(V.cross(V.sub(world[1],world[0]),V.sub(world[2],world[0]))),rotNormal=rotate(normal,'y',yawRad),brightness=light?.79+.21*Math.max(0,V.dot(rotNormal,lightDir)):1;
  const area=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);if(Math.abs(area)<1e-8)continue;
  const loX=Math.max(0,Math.floor(Math.min(...p.map(v=>v[0])))),hiX=Math.min(width-1,Math.ceil(Math.max(...p.map(v=>v[0])))),loY=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1])))),hiY=Math.min(height-1,Math.ceil(Math.max(...p.map(v=>v[1]))));
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){
   const xx=x+.5,yy=y+.5,w1=((xx-p[0][0])*(p[2][1]-p[0][1])-(yy-p[0][1])*(p[2][0]-p[0][0]))/area,w2=((p[1][0]-p[0][0])*(yy-p[0][1])-(p[1][1]-p[0][1])*(xx-p[0][0]))/area,w0=1-w1-w2;
   if(w0<-.000001||w1<-.000001||w2<-.000001)continue;
   const weights=[w0,w1,w2],z=weights.reduce((n,w,i)=>n+w*p[i][2],0),offset=y*width+x;if(z<zbuffer[offset])continue;
   const u=weights.reduce((n,w,i)=>n+w*uv[i][0],0),v=weights.reduce((n,w,i)=>n+w*uv[i][1],0),tx=Math.min(texture.width-1,Math.max(0,Math.floor((u-Math.floor(u))*texture.width))),ty=Math.min(texture.height-1,Math.max(0,Math.floor((1-(v-Math.floor(v)))*texture.height))),at=(ty*texture.width+tx)*4;
   if(texture.data[at+3]<128)continue;
   image.data.set([Math.round(texture.data[at]*brightness),Math.round(texture.data[at+1]*brightness),Math.round(texture.data[at+2]*brightness),texture.data[at+3]],offset*4);zbuffer[offset]=z;
  }
 }
 return image;
}
export async function savePng(name,image){await writeFile(new URL(name,root),PNG.sync.write(image));}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 const model=await loadModel();await mkdir(new URL('feasibility/',root),{recursive:true});const atlas=new PNG({width:1024,height:256});
 for(const [i,yaw]of[0,180,-90,90].entries()){const image=render(model,{yaw});await savePng(`feasibility/tpose-${i}.png`,image);for(let y=0;y<256;y++)image.data.copy(atlas.data,(y*1024+i*256)*4,y*256*4,(y+1)*256*4);}
 await savePng('feasibility/tpose-contact.png',atlas);console.log(JSON.stringify({vertices:model.positions.length,triangles:model.faces.length,objects:model.objects.length,materials:Object.keys(model.materials).length}));
}
