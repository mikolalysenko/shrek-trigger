// Orthographic renderer of the archived Shrek Xbox Magic Mirror mesh. Actual
// OBJ geometry, normals, UVs and texture pixels are preserved; no new geometry.
import {readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
const root=new URL('./',import.meta.url),source=new URL('source/Magic%20Mirror/',root);
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),norm=a=>mul(a,1/(Math.hypot(...a)||1));
export async function loadModel(){
 const positions=[],normals=[],uvs=[],faces=[],materials={};let material,object;
 for(const line of (await readFile(new URL('MagicMirror.mtl',source),'utf8')).split('\n')){const[k,...v]=line.trim().split(/\s+/);if(k==='newmtl')materials[material=v.join(' ')]={};if(k==='map_Kd')materials[material].texture=PNG.sync.read(await readFile(new URL(v.join(' '),source)));}
 for(const line of (await readFile(new URL('MagicMirror.obj',source),'utf8')).split('\n')){const[k,...v]=line.trim().split(/\s+/);if(k==='o')object=v.join(' ');if(k==='v')positions.push(v.map(Number));if(k==='vn')normals.push(v.map(Number));if(k==='vt')uvs.push(v.map(Number));if(k==='usemtl')material=v.join(' ');if(k==='f'){const ids=v.map(s=>s.split('/').map(n=>Number(n)-1));for(let i=1;i<ids.length-1;i++)faces.push({object,material,ids:[ids[0],ids[i],ids[i+1]]});}}
 return{positions,normals,uvs,faces,materials};
}
export function render(model,{width=384,height=768,scale=288,center=[0,.02335,0],ambient=.32,diffuse=.68,exposure=1.35}={}){
 const image=new PNG({width,height}),depth=new Float64Array(width*height).fill(-Infinity),light=norm([-.45,.8,1]),half=norm(add(light,[0,0,1]));
 for(const face of model.faces){
  const p=face.ids.map(([i])=>{const q=sub(model.positions[i],center);return[width/2+q[0]*scale,height/2-q[1]*scale,q[2]];}),uv=face.ids.map(([,i])=>model.uvs[i]),n=face.ids.map(([, ,i])=>model.normals[i]),texture=model.materials[face.material].texture;
  const area=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);if(Math.abs(area)<1e-8)continue;
  const x0=Math.max(0,Math.floor(Math.min(...p.map(q=>q[0])))),x1=Math.min(width-1,Math.ceil(Math.max(...p.map(q=>q[0])))),y0=Math.max(0,Math.floor(Math.min(...p.map(q=>q[1])))),y1=Math.min(height-1,Math.ceil(Math.max(...p.map(q=>q[1]))));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const xx=x+.5,yy=y+.5,b=((xx-p[0][0])*(p[2][1]-p[0][1])-(yy-p[0][1])*(p[2][0]-p[0][0]))/area,c=((p[1][0]-p[0][0])*(yy-p[0][1])-(p[1][1]-p[0][1])*(xx-p[0][0]))/area,a=1-b-c,w=[a,b,c];if(w.some(v=>v<-.00001))continue;
   const z=w.reduce((s,v,i)=>s+v*p[i][2],0),at=y*width+x;if(z<depth[at])continue;
   const u=w.reduce((s,v,i)=>s+v*uv[i][0],0),v=w.reduce((s,v,i)=>s+v*uv[i][1],0),tx=Math.min(texture.width-1,Math.max(0,Math.floor(u*texture.width))),ty=Math.min(texture.height-1,Math.max(0,Math.floor((1-v)*texture.height))),t=(ty*texture.width+tx)*4;
   if(texture.data[t+3]<128)continue;
   const normal=norm([0,1,2].map(axis=>w.reduce((s,v,i)=>s+v*n[i][axis],0))),lighting=ambient+diffuse*Math.max(0,dot(normal,light)),specular=face.material==='Head'?Math.pow(Math.max(0,dot(normal,half)),18)*.28:0;
   for(let k=0;k<3;k++)image.data[at*4+k]=Math.min(255,Math.round(texture.data[t+k]*lighting*exposure+255*specular));image.data[at*4+3]=texture.data[t+3];depth[at]=z;
  }
 }
 return image;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){const model=await loadModel(),image=render(model);await writeFile(new URL('source-front.png',root),PNG.sync.write(image));console.log(JSON.stringify({vertices:model.positions.length,triangles:model.faces.length,normals:model.normals.length,materials:Object.keys(model.materials)}));}
