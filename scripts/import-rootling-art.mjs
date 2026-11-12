import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

// Compose approved sampled images with recorded integer offsets. The mounted
// actor reuses the same Rootling pixels, a generated guard and original shadows.
// Every result must reproduce the frozen, visually reviewed native frame hash.
export async function composeRootlingArt(actors,audit,specs,root){
 const keys=['rootling','snap-briar','briar-rider'];
 if(!keys.some(k=>actors[k]))return;
 assert.ok(keys.every(k=>actors[k]),'Rootling composition requires all three source groups');
 const folder='assets/imagegen/rootlings-briars',json=async p=>JSON.parse(await readFile(root+'/'+p));
 const maps=Object.fromEntries(await Promise.all(keys.map(async k=>[k,await json(folder+'/'+k+'/native-frame-map.draft.json')])));
 const source=Object.fromEntries(keys.map(k=>[k,actors[k].frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16)))]));
 const shadows=await json(folder+'/briar-rider/original-shadows.json'),world={};
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const bounds=points=>{assert.ok(points.length);const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return[x,y,Math.max(...xs)-x+1,Math.max(...ys)-y+1];};
 function anchored(key,selection,target){
  const {frame,flip}=typeof selection==='number'?{frame:selection}:selection,pixels=source[key][frame];assert.ok(pixels,'Recorded composition source exists');
  const points=[];for(let i=0;i<pixels.length;i++)if(pixels[i])points.push([flip?63-i%64:i%64,Math.floor(i/64),pixels[i]]);
  const b=bounds(points),dx=Math.round(target[0]+target[2]/2-b[0]-b[2]/2),dy=target[1]+target[3]-b[1]-b[3];
  return points.map(([x,y,k])=>[x+dx,y+dy,k]);
 }
 for(const key of['rootling','snap-briar'])world[key]=maps[key].frames.map(f=>anchored(key,f.source,f.originalBounds));
 world['briar-rider']=maps['briar-rider'].frames.map(f=>{
  if(f.rootlingFrame!==undefined){
   const mount=world.rootling[f.rootlingFrame].map(([x,y,k])=>[x+f.mountShift[0],y+f.mountShift[1],k]);
   const guard=anchored('briar-rider',{frame:f.guardSource,flip:f.guardFlip},f.guardBounds),pixels=new Map();
   assert.deepEqual([...f.order].sort(),['guard','mount']);
   for(const layer of f.order)for(const p of layer==='mount'?mount:guard)pixels.set(p[0]+','+p[1],p);
   return [...pixels.values()];
  }
  const body=anchored('briar-rider',f.source,f.bodyBounds),shadow=shadows.frames.find(s=>s.frame===f.frame);
  assert.equal(!!shadow,!!f.shadowBounds);
  if(shadow){
   assert.deepEqual(shadow.bounds,f.shadowBounds);const occupied=new Set(body.map(p=>p[0]+','+p[1])),[x,y,w,h]=shadow.bounds;
   assert.equal(shadow.pixels.length,w*h);assert.equal(sha(Uint8Array.from(shadow.pixels)),shadow.pixelSha256);
   for(let i=0;i<shadow.pixels.length;i++)if(shadow.pixels[i]){const xx=x+i%w,yy=y+Math.floor(i/w);assert.ok(!occupied.has(xx+','+yy),'Original shadow does not overlap the generated body');body.push([xx,yy,shadow.pixels[i]]);}
  }
  return body;
 });
 for(const key of keys){
  const map=maps[key],spec=specs.find(s=>s.key===key);assert.equal(spec.nativeComposer,'rootlings-briars');
  const frames=world[key].map((points,f)=>{
   const role=map.frames[f];assert.equal(role.frame,f);assert.deepEqual(bounds(points),role.nativeBounds);
   const pixels=new Uint8Array(4096),[dx,dy]=role.canvasTranslation;
   for(const[x,y,k]of points){const xx=x+dx,yy=y+dy;assert.ok(Number.isInteger(xx)&&Number.isInteger(yy)&&xx>=0&&xx<64&&yy>=0&&yy<64,'Native composition fits the canvas');assert.ok(k>0&&k<=12);pixels[yy*64+xx]=k;}
   assert.equal(sha(pixels),role.sourcePixelSha256,key+' accepted frame '+f);return pixels;
  });
  const frozen=await json(folder+'/'+key+'/native-raster.json'),hex=frames.map(p=>Array.from(p,v=>v.toString(16)).join(''));
  assert.deepEqual(hex,frozen.frames,key+' frozen native raster');
  const nativeComposition={map:folder+'/'+key+'/native-frame-map.draft.json',compiler:'scripts/import-rootling-art.mjs'};
  const originalRasterComponents=key==='briar-rider'?[{file:folder+'/briar-rider/original-shadows.json',sha256:sha(await readFile(root+'/'+folder+'/briar-rider/original-shadows.json')),sourceType:'original-ROM-raster'}]:[];
  const provenance=key==='briar-rider'?[...actors[key].provenance,...actors.rootling.provenance]:actors[key].provenance;
  actors[key]={...actors[key],frames:hex,sequences:{native:{1:frames.map((_,i)=>i)}},provenance,nativeComposition,...(originalRasterComponents.length?{originalRasterComponents}:{})};
  const report=audit.find(a=>a.key===key);Object.assign(report,{frames:frames.length,sequences:actors[key].sequences,nativeComposition,originalRasterComponents});
  const atlas=new PNG({width:512,height:Math.ceil(frames.length/8)*64});
  const palette=actors[key].palette.map(c=>[0,2,4].map(n=>{const v=parseInt(c.slice(n,n+2),16)>>3;return v<<3|v>>2;}));
  frames.forEach((frame,f)=>frame.forEach((k,i)=>{if(k)atlas.data.set([...palette[k-1],255],((Math.floor(f/8)*64+Math.floor(i/64))*512+(f%8)*64+i%64)*4);}));
  await writeFile(root+'/'+spec.directory+'/native-indexed.png',PNG.sync.write(atlas));
  await writeFile(root+'/'+spec.directory+'/import.json',JSON.stringify(report,null,2)+'\n');
 }
}
