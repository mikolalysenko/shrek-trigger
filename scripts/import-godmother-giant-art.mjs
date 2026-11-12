import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {nativeSpriteBank,nativeSpriteCells} from './native-sprite-view.mjs';

// Align complete generated source images to their reviewed native bounds.
// The small indexed shadow remains the original cartridge image.
export async function composeGodmotherGiantArt(actors,audit,specs,root){
 const keys=['godmother-giant-face','godmother-giant-hands'];
 if(!keys.some(k=>actors[k]))return;
 assert.ok(keys.every(k=>actors[k]),'Both giant Godmother groups are required');
 const dir='assets/imagegen/godmother-giant',json=async p=>JSON.parse(await readFile(root+'/'+p));
 const base=new Uint8Array(await readFile(root+'/.local/chrono-trigger-usa.sfc'));
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const bounds=(p,w)=>{let x0=w,y0=p.length/w,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%w);y0=Math.min(y0,Math.floor(i/w));x1=Math.max(x1,i%w);y1=Math.max(y1,Math.floor(i/w));}return[x0,y0,x1-x0+1,y1-y0+1];};
 for(const key of keys){
  const part=key.endsWith('face')?'face':'hands',map=await json(dir+'/'+part+'/native-frame-map.draft.json'),frozen=await json(dir+'/'+part+'/native-raster.json');
  assert.equal(specs.find(s=>s.key===key).nativeComposer,'godmother-giant');
  const actor=actors[key],{width,height}=actor,source=actor.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16)));
  const original=nativeSpriteBank(base,{gfx:map.gfx,asm:map.asm,size:map.size,palette:part==='face'?205:206,frames:map.frames.length});
  const frames=map.frames.map(role=>{
   const out=new Uint8Array(width*height),[ox,oy]=map.origin;
   if(role.source==='original-indexed-shadow'){
    for(const cell of nativeSpriteCells(original,role.frame))for(let i=0;i<256;i++)if(cell.pixels[i]){
     assert.equal(cell.pixels[i],1,'Only the original indexed shadow is reused');
     out[(cell.y+(i>>4)+oy)*width+cell.x+(i&15)+ox]=cell.pixels[i];
    }
   }else{
    const pixels=source[role.source.frame];assert.ok(pixels,'Authored source exists');
    const b=bounds(pixels,width),o=role.originalBounds,dx=Math.round(o[0]+o[2]/2-b[0]-b[2]/2),dy=o[1]+o[3]-b[1]-b[3];
    for(let i=0;i<pixels.length;i++)if(pixels[i]){
     const sx=i%width,sy=Math.floor(i/width),x=(role.source.flip?2*b[0]+b[2]-1-sx:sx)+dx+ox,y=sy+dy+oy;
     assert.ok(x>=0&&x<width&&y>=0&&y<height,'Source placement cannot clip');out[y*width+x]=pixels[i];
    }
   }
   assert.equal(sha(out),role.sourcePixelSha256,key+' accepted frame '+role.frame);return Array.from(out,v=>v.toString(16)).join('');
  });
  assert.deepEqual(frames,frozen.frames,key+' frozen native raster');
  const nativeComposition={map:dir+'/'+part+'/native-frame-map.draft.json',compiler:'scripts/import-godmother-giant-art.mjs',originalShadowFrames:part==='hands'?[3,13]:[]};
  actors[key]={...actor,frames,sequences:{native:{1:frames.map((_,i)=>i)}},nativeComposition};
  const report=audit.find(a=>a.key===key);Object.assign(report,{frames:frames.length,sequences:actors[key].sequences,nativeComposition});
  const columns=Math.floor(512/width),atlas=new PNG({width:columns*width,height:Math.ceil(frames.length/columns)*height});
  const colors=actor.palette.map(hex=>[0,2,4].map(n=>{const v=parseInt(hex.slice(n,n+2),16)>>3;return v<<3|v>>2;}));
  frames.forEach((hex,f)=>Array.from(hex,c=>parseInt(c,16)).forEach((k,i)=>{if(k)atlas.data.set([...colors[k-1],255],((Math.floor(f/columns)*height+Math.floor(i/width))*atlas.width+(f%columns)*width+i%width)*4);}));
  const out=root+'/'+specs.find(s=>s.key===key).directory;
  await writeFile(out+'/native-indexed.png',PNG.sync.write(atlas));await writeFile(out+'/import.json',JSON.stringify(report,null,2)+'\n');
 }
}
