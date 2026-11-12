import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

// Sampled bodies and original indexed shadows are placed by integer native
// coordinates. Body pixels cover the shadow just as in the frozen source;
// no anatomy is drawn and no source pixel is discarded by the composition.
export async function composeFrogGuardArt(actors,audit,specs,root){
 const key='frog-guards',actor=actors[key];if(!actor)return;
 const spec=specs.find(s=>s.key===key);assert.equal(spec.nativeComposer,'frog-guards');
 const dir='assets/imagegen/frog-guards',json=async p=>JSON.parse(await readFile(root+'/'+dir+'/'+p));
 const map=await json('native-frame-map.draft.json'),shadow=await json('source-native-shadows.json'),frozen=await json('native-raster.json');
 const {width,height}=actor;assert.equal(width,64);assert.equal(height,64);
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const source=actor.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16)));
 const bounds=p=>{let x0=width,y0=height,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%width);y0=Math.min(y0,Math.floor(i/width));x1=Math.max(x1,i%width);y1=Math.max(y1,Math.floor(i/width));}return[x0,y0,x1-x0+1,y1-y0+1];};
 const frames=map.frames.map((role,frame)=>{
  assert.equal(role.frame,frame);const {source:entry,translation:[tx,ty],originalBodyBounds:o}=role,raw=source[entry.frame];assert.ok(raw,'Authored source exists');
  const body=entry.flip?Uint8Array.from(raw,(_,i)=>raw[Math.floor(i/width)*width+width-1-i%width]):raw,b=bounds(body);
  assert.deepEqual(b,role.sourceBounds,'Source bounds remain frozen');
  const bx=Math.round(o[0]+o[2]/2-b[2]/2),by=o[1]+o[3]-b[3],out=new Uint8Array(width*height),sh=shadow.frames[frame];
  assert.deepEqual([bx,by,b[2],b[3]],role.bodyBounds);assert.deepEqual(sh.bounds,role.shadowBounds);
  assert.deepEqual(role.frameOffset,[0,height-ty]);
  const place=(x,y,k)=>{assert.ok(x>=0&&x<width&&y>=0&&y<height,'Native composition cannot clip');out[y*width+x]=k;};
  for(let y=0;y<sh.bounds[3];y++)for(let x=0;x<sh.bounds[2];x++)if(sh.pixels[y*sh.bounds[2]+x])place(sh.bounds[0]+x+tx,sh.bounds[1]+y+ty,1);
  let occluded=0;
  for(let y=0;y<b[3];y++)for(let x=0;x<b[2];x++){
   const k=body[(b[1]+y)*width+b[0]+x];if(!k)continue;
   const xx=bx+x+tx,yy=by+y+ty;if(out[yy*width+xx])occluded++;place(xx,yy,k);
  }
  assert.equal(occluded,role.shadowOccluded);assert.equal(sha(out),role.pixelSha256,'Accepted frog frame '+frame);
  return Array.from(out,k=>k.toString(16)).join('');
 });
 assert.deepEqual(frames,frozen.frames,'Complete frozen native frog raster');
 const nativeComposition={compiler:'scripts/import-frog-guard-art.mjs',map:dir+'/native-frame-map.draft.json',shadows:dir+'/source-native-shadows.json',shadowOrder:'Original indexed masks beneath generated bodies; exact per-frame occlusion retained.'};
 actors[key]={...actor,frames,sequences:{native:{1:frames.map((_,i)=>i)}},nativeComposition};
 const report=audit.find(a=>a.key===key);Object.assign(report,{frames:frames.length,sequences:actors[key].sequences,nativeComposition});
 const columns=8,atlas=new PNG({width:columns*width,height:Math.ceil(frames.length/columns)*height});
 const colors=actor.palette.map(hex=>[0,2,4].map(n=>{const v=parseInt(hex.slice(n,n+2),16)>>3;return v<<3|v>>2;}));
 frames.forEach((hex,f)=>Array.from(hex,c=>parseInt(c,16)).forEach((k,i)=>{if(k)atlas.data.set([...colors[k-1],255],((Math.floor(f/columns)*height+Math.floor(i/width))*atlas.width+f%columns*width+i%width)*4);}));
 await writeFile(root+'/'+spec.directory+'/native-indexed.png',PNG.sync.write(atlas));await writeFile(root+'/'+spec.directory+'/import.json',JSON.stringify(report,null,2)+'\n');
}
