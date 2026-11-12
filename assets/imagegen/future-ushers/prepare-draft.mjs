import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {futureMachines} from '../../../content/future-machines.js';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {put16} from '../../../engine/rom.js';
import {snesColor} from '../../../engine/sprites.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {packUsherCells} from './pack-cells.mjs';
const dir='assets/imagegen/future-ushers',hash=b=>createHash('sha256').update(b).digest('hex');
export const nativeMap=[0,1,2,3,4,5,6,7,8,{frame:6,flip:true},{frame:7,flip:true},{frame:8,flip:true},9,10,22,12,13,15,16,17,18,19,20,{frame:19,flip:true},{frame:20,flip:true}];
export function nativePixels(raster){return nativeMap.map(n=>{const f=typeof n==='number'?n:n.frame,p=Uint8Array.from(raster.frames[f],c=>parseInt(c,16));return n.flip?Uint8Array.from(p,(_,i)=>p[(i>>6)*64+63-i%64]):p;});}
export async function compileDraft(){
  const resource=JSON.parse(await readFile(dir+'/native-resource-audit.json')),roles=JSON.parse(await readFile(dir+'/native-role-audit.json')),actors=futureMachines.filter(a=>a.art==='usher'),palette=actors.find(a=>a.palette===52).colors;
  const spec={key:'future-ushers',sourceType:'image-generation',directory:dir,width:64,height:64,palette,sheets:[
    {file:dir+'/source-movement-v1.png',columns:3,rows:3,nativeHeight:30,scaleCells:[0,1,2,3,4,5,6,7,8],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:59}},
    {file:dir+'/source-reactions-v1.png',columns:3,rows:2,nativeHeight:30,scaleCells:[5],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:59}},
    {file:dir+'/source-gestures-v1.png',columns:3,rows:2,nativeHeight:30,scaleCells:[2,3],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:59}},
    {file:dir+'/source-flash-v1.png',columns:2,rows:1,nativeHeight:30,scaleCells:[0],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:59}}
  ],sequences:{native:{1:nativeMap}},notes:{status:'Inactive source draft',native:'25 original slots, gfx97/asm56, four native cells. Keep enemy137/138/139 and NPC170 headers, both original animation41/159 programs and current palettes51/52/53.',unusedSourceFrames:[11,14,21],sourceMirrors:'Only right gait9–11 and right gesture23–24 are whole-source mirrors of their original left counterparts.',palette:'Indexed against current Brass52; existing steel51 and iron53 reinterpret identical native indices.'}};
  await writeFile(dir+'/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
  const raster=JSON.parse(await readFile(dir+'/preview-raster.json')),frames=nativePixels(raster),packing=packUsherCells(frames),compiled=compileSpriteFrames(frames,{width:64,height:64,size:0,frameCellOrigins:packing.map(p=>p.origins)});
  const bounds=frames.map(p=>{let x0=64,y0=64,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%64);x1=Math.max(x1,i%64);y0=Math.min(y0,i>>6);y1=Math.max(y1,i>>6);}return[x0,y0,x1-x0+1,y1-y0+1];});
  const offsets=bounds.map((b,f)=>{const o=resource.frames[f].originalBounds;return[Math.round(o[0]+o[2]/2-(b[0]+b[2]/2-32)),resource.frames[f].nativeBottomPixel-(b[1]+b[3]-1-64)];});
  for(let f=0;f<25;f++)for(let c=0;c<4;c++)for(let axis=0;axis<2;axis++)compiled.assembly[f*40+32+c*2+axis]+=offsets[f][axis];
  for(let f=0;f<25;f++)for(const c of nativeSpriteCells({...compiled,cells:4,frames:25},f)){const[ox,oy]=packing[f].origins[c.cell];assert.equal(c.x,ox-32+offsets[f][0]);assert.equal(c.y,oy-64+offsets[f][1]);for(let y=0;y<16;y++)for(let x=0;x<16;x++)assert.equal(c.pixels[y*16+x],frames[f][(oy+y)*64+ox+x]);}
  const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);assert.equal(compiled.assembly.length,1000);
  for(const[file,bytes]of[['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed],['assembly.bin',compiled.assembly]])await writeFile(dir+'/'+file,bytes);
  for(const a of actors){const b=new Uint8Array(24);a.colors.forEach((c,i)=>put16(b,i*2,snesColor(c)));assert.equal(hash(b),resource.actors.find(o=>o.palette===a.palette).preservedPaletteSha256);await writeFile(dir+'/palette-'+a.palette+'.bin',b);}
  const map={status:'Inactive complete source/native geometry proposal',nativeFrames:25,authoredSourcePoses:20,wholeSourceMirrors:5,unusedSourceFrames:[11,14,21],width:64,height:64,size:0,cells:4,groupAnchor:[0,0],frameOffsets:offsets,frames:roles.frames.map((r,f)=>({...r,source:nativeMap[f],sampledBounds:bounds[f],proposedNativeBounds:[bounds[f][0]-32+offsets[f][0],bounds[f][1]-64+offsets[f][1],...bounds[f].slice(2)],cellOrigins:packing[f].origins,occupiedCells:packing[f].occupied,stripAxis:packing[f].stripAxis,sourcePixelSha256:hash(frames[f])})),integration:'Keep native IDs, both animation programs/timing, original headers and current three palette packets. Preserve NPC170 animation41 separately from Brass enemy138 animation159. Four native cells only; staging canvas is not a native reservation change. Original lowest opaque pixel and horizontal center retained within half a pixel.'};
  await writeFile(dir+'/native-frame-map.draft.json',JSON.stringify(map,null,2)+'\n');
  const audit={status:'Inactive exact compile passed',graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes:1000,tiles:compiled.tiles,graphicsSha256:hash(compiled.graphics),compressedSha256:hash(packed),assemblySha256:hash(compiled.assembly),uniqueNativeFrames:new Set(frames.map(hash)).size,original:{...resource.originalGraphics,rawDelta:compiled.graphics.length-resource.originalGraphics.decodedBytes,compressedPlusAssemblyDelta:packed.length-resource.originalGraphics.compressedBytes},current:{...resource.currentBaseline,rawDelta:compiled.graphics.length-resource.currentBaseline.graphics.decodedBytes,compressedPlusAssemblyDelta:packed.length-resource.currentBaseline.graphics.compressedBytes},underOriginalDecodedBudget:compiled.graphics.length<=resource.originalGraphics.decodedBytes,sourcePixelsNotDrawnOrClipped:true,activation:false};await writeFile(dir+'/draft-audit.json',JSON.stringify(audit,null,2)+'\n');return audit;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)console.log(JSON.stringify(await compileDraft()));
