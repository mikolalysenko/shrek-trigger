import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {bridgeFamilies} from '../../../content/bridge-actors.js';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {u16,put16} from '../../../engine/rom.js';
import {packBoneGuardCells} from './pack-cells.mjs';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
const dir='assets/imagegen/bone-guards',hash=b=>createHash('sha256').update(b).digest('hex');
export const nativeMap=[0,1,2,3,4,5,{frame:0,flip:true},{frame:1,flip:true},{frame:2,flip:true},{frame:3,flip:true},{frame:4,flip:true},{frame:5,flip:true},6,7,7,8,9,10,11,12,13,{frame:12,flip:true},{frame:13,flip:true},14];
export function nativePixels(raster){return nativeMap.map(n=>{const id=typeof n==='number'?n:n.frame,p=Uint8Array.from(raster.frames[id],c=>parseInt(c,16));if(!n.flip)return p;return Uint8Array.from(p,(_,i)=>p[Math.floor(i/64)*64+63-i%64]);});}
export async function compileDraft(){
  const original=JSON.parse(await readFile(dir+'/native-resource-audit.json')),roles=JSON.parse(await readFile(dir+'/native-role-audit.json')),family=bridgeFamilies.find(f=>f.key==='bone-guards'),palette=family.actors.find(a=>a.palette===91).colors;
  const spec={key:'bone-guards',sourceType:'image-generation',directory:dir,width:64,height:64,palette,sheets:[
    {file:dir+'/source-movement-v1.png',columns:3,rows:3,nativeHeight:30,scaleCells:[0,1,2,3,4,5],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:59}},
    {file:dir+'/source-actions-v1.png',columns:3,rows:2,nativeHeight:30,scaleCells:[3],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:59},overrides:{0:{scale:.9},4:{scale:.96}}}
  ],sequences:{native:{1:nativeMap}},notes:{status:'Inactive source draft',native:'24 native slots; four cells each; original animation85 and duration list unchanged. All four palettes91–94 unchanged. Palette92 is shared with unrelated enemy47.',duplicate:'Native13 and14 are pixel-identical in the source ROM and intentionally reuse one authored pose.',mirrors:'6–11,21 and22 are explicitly mirrored complete source poses; no false independent-source claim.'}};
  await writeFile(dir+'/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');
  execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
  const raster=JSON.parse(await readFile(dir+'/preview-raster.json')),frames=nativePixels(raster),packing=packBoneGuardCells(frames),compiled=compileSpriteFrames(frames,{width:64,height:64,size:0,frameCellOrigins:packing.map(p=>p.origins)});
  const bounds=frames.map(p=>{let x0=64,y0=64,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%64);x1=Math.max(x1,i%64);y0=Math.min(y0,i>>6);y1=Math.max(y1,i>>6);}return[x0,y0,x1-x0+1,y1-y0+1];});
  const offsets=bounds.map((b,f)=>{const o=original.frames[f].originalBounds;return[Math.round(o[0]+o[2]/2-(b[0]+b[2]/2-32)),original.frames[f].nativeBottomPixel-(b[1]+b[3]-1-64)];});
  for(let f=0;f<24;f++)for(let c=0;c<4;c++)for(let axis=0;axis<2;axis++)compiled.assembly[f*40+32+c*2+axis]+=offsets[f][axis];
  for(let f=0;f<24;f++)for(const c of nativeSpriteCells({...compiled,cells:4,frames:24},f)){
    const [ox,oy]=packing[f].origins[c.cell];assert.equal(c.x,ox-32+offsets[f][0]);assert.equal(c.y,oy-64+offsets[f][1]);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++)assert.equal(c.pixels[y*16+x],frames[f][(oy+y)*64+ox+x],'Exact native tile reproduction');
  }
  const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);assert.equal(compiled.assembly.length,960);
  for(const [file,bytes]of [['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed],['assembly.bin',compiled.assembly]])await writeFile(dir+'/'+file,bytes);
  const base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));
  for(const a of original.actors)await writeFile(dir+'/palette-'+a.palette+'.bin',base.slice(a.paletteOffset,a.paletteOffset+24));
  const map={status:'Inactive source and authored native four-cell geometry proposal',nativeFrames:24,authoredSourceFrames:15,wholeSourceMirrors:8,intentionalOriginalDuplicate:[13,14],width:64,height:64,size:0,cells:4,groupAnchor:[0,0],frameOffsets:offsets,frames:roles.frames.map((r,f)=>({...r,source:nativeMap[f],sampledBounds:bounds[f],proposedNativeBounds:[bounds[f][0]-32+offsets[f][0],bounds[f][1]-64+offsets[f][1],...bounds[f].slice(2)],cellOrigins:packing[f].origins,occupiedCells:packing[f].occupied,stripAxis:packing[f].stripAxis,sourcePixelSha256:hash(frames[f])})),integration:'Keep all24 native slot IDs, original frame and duration lists, headers, AI and palettes. Canvas64 is only source staging; each frame emits exactly four native16x16 cells. Proposed geometry retains each original lowest opaque pixel and horizontal silhouette center within half a pixel.'};
  await writeFile(dir+'/native-frame-map.draft.json',JSON.stringify(map,null,2)+'\n');
  const audit={status:'Inactive compile passed',graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes:compiled.assembly.length,tiles:compiled.tiles,graphicsSha256:hash(compiled.graphics),compressedSha256:hash(packed),assemblySha256:hash(compiled.assembly),uniqueNativeFrames:new Set(frames.map(hash)).size,original:{...original.originalGraphics,rawDelta:compiled.graphics.length-original.originalGraphics.decodedBytes,compressedAndAssemblyDelta:packed.length-original.originalGraphics.compressedBytes},current:{...original.currentBaseline,rawDelta:compiled.graphics.length-original.currentBaseline.graphics.decodedBytes,compressedAndAssemblyDelta:packed.length-original.currentBaseline.graphics.compressedBytes},underOriginalDecodedBudget:compiled.graphics.length<=original.originalGraphics.decodedBytes,sourcePixelsNotDrawnOrClipped:true,activation:false};
  await writeFile(dir+'/draft-audit.json',JSON.stringify(audit,null,2)+'\n');return audit;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)console.log(JSON.stringify(await compileDraft()));
