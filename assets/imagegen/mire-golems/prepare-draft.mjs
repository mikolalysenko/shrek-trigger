import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {futureWildlife} from '../../../content/future-wildlife.js';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {put16} from '../../../engine/rom.js';
import {snesColor} from '../../../engine/sprites.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {packMachineCells as packCells} from './pack-cells.mjs';
const dir='assets/imagegen/mire-golems',folder=dir+'/golem',hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(p));
export const nativeMap=[0,1,2,3,4,5,6,7,{frame:8,flip:true},{frame:6,flip:true},{frame:7,flip:true},8,12,24,25,26,27,{frame:28,flip:true},39,28,40,33,34,15,16,{frame:15,flip:true},{frame:16,flip:true},35,18,36,37,21];
function bounds(p){let x0=64,y0=64,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%64);x1=Math.max(x1,i%64);y0=Math.min(y0,i>>6);y1=Math.max(y1,i>>6);}return[x0,y0,x1-x0+1,y1-y0+1];}
export function composeNative(raster,roles,shadow){
 return nativeMap.map((map,frame)=>{
  const n=typeof map==='number'?map:map.frame,raw=Uint8Array.from(raster.frames[n],c=>parseInt(c,16)),body=map.flip?Uint8Array.from(raw,(_,i)=>raw[(i>>6)*64+63-i%64]):raw,b=bounds(body),r=roles.frames[frame],original=r.bodyBounds??r.bounds,bodyX=Math.round(original[0]+original[2]/2-b[2]/2),bodyY=original[1]+original[3]-b[3],hasShadow=frame>=12&&frame<=20,sh=hasShadow?shadow.frames[frame-12]:null;
  const minimum=[Math.min(bodyX,sh?.bounds[0]??bodyX),Math.min(bodyY,sh?.bounds[1]??bodyY)],maximum=[Math.max(bodyX+b[2],sh?sh.bounds[0]+sh.bounds[2]:0),Math.max(bodyY+b[3],sh?sh.bounds[1]+sh.bounds[3]:-99)],translation=[Math.max(-minimum[0],Math.min(32,64-maximum[0])),64-maximum[1]],pixels=new Uint8Array(4096);
  assert.ok(minimum[0]+translation[0]>=0&&maximum[0]+translation[0]<=64&&minimum[1]+translation[1]>=0,'Composite exceeds staging canvas at '+frame);
  for(let y=0;y<b[3];y++)for(let x=0;x<b[2];x++){const k=body[(b[1]+y)*64+b[0]+x];if(k)pixels[(bodyY+y+translation[1])*64+bodyX+x+translation[0]]=k;}
  if(sh)for(let y=0;y<4;y++)for(let x=0;x<14;x++){const k=sh.pixels[y*14+x],i=(sh.bounds[1]+y+translation[1])*64+sh.bounds[0]+x+translation[0];if(k){assert.equal(pixels[i],0,'Source body must not overlap native shadow');pixels[i]=k;}}
  return{pixels,source:map,sourceBounds:b,bodyBounds:[bodyX,bodyY,b[2],b[3]],shadowBounds:sh?.bounds??null,nativeBounds:[...minimum,maximum[0]-minimum[0],maximum[1]-minimum[1]],translation,frameOffset:[32-translation[0],64-translation[1]],originalBodyBounds:original};
 });
}
export async function compileDraft(){
 const actors=futureWildlife.filter(a=>a.art==='mire-golem'),resource=await json(folder+'/native-resource-audit.json'),roles=await json(folder+'/native-role-audit.json'),shadow=await json(folder+'/source-native-shadow.json');
 const spec={key:'mire-golems',directory:folder,sourceType:'image-generation',width:64,height:64,palette:actors[0].colors,sheets:[
  {file:dir+'/source-movement-v2.png',columns:4,rows:3,nativeHeight:58,scaleCells:[0,2,3,5,6,8],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:63}},
  {file:dir+'/source-actions-v1.png',columns:4,rows:3,nativeHeight:58,scaleCells:[10,11],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:63}},
  {file:dir+'/source-tumble-v1.png',columns:3,rows:3,nativeHeight:58,scaleCells:[7,8],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:63}},
  {file:dir+'/source-front-actions-v1.png',columns:3,rows:2,nativeHeight:58,scaleCells:[5],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:63}},
  {file:dir+'/source-curl-v1.png',columns:3,rows:1,nativeHeight:58,scaleCells:[2],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:63}}
 ],sequences:{native:{1:nativeMap}},notes:{status:'Inactive source import; composeNative additionally positions generated body and original raster shadow',bodyReferenceHeight:58,source:'Actual generated body pixels; original CT 14×4 ground-shadow raster reused unchanged in native slots12–20.',geometry:'Use prepared native-raster.json or the explicit composition map, then exact authored cell origins and offsets. The raw imported body sequence alone is incomplete.',directionCorrections:'Movement source8 and tumble source4 face right in the output and are mirrored for the native left role. Right counterparts use their unmirrored generated source.',sourceSubstitutions:'Dedicated compact front-action and curl sources replace wider first-pass poses; all retained slots remain real source art.',activation:false}};
 const run=async()=>{await writeFile(folder+'/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',folder+'/import-spec.draft.json'],{stdio:'pipe'});return await json(folder+'/preview-raster.json');};
 await run();const report=await json(folder+'/preview-import.json');
 // Normalize independently generated airborne source poses to original body
 // height at the same 58/64 standing scale. This is uniform nearest sampling.
 for(const [sheet,cell,native]of[[1,0,12],[2,0,13],[2,1,14],[2,2,15],[2,3,16],[2,4,17],[4,0,18],[4,1,20]]){
  const s=report.sources[sheet],target=Math.round(roles.frames[native].bodyBounds[3]*58/64),scale=target/(s.frames[cell].bounds[3]*s.scale);spec.sheets[sheet].overrides??={};spec.sheets[sheet].overrides[cell]={scale};
 }
 // The independent turn-sheet output enlarged these standing bodies by
 // 1–3 native pixels. Normalize uniformly to the same 58px model height.
 for(const cell of[0,2,3]){const s=report.sources[3];spec.sheets[3].overrides??={};spec.sheets[3].overrides[cell]={scale:58/(s.frames[cell].bounds[3]*s.scale)};}
 const raster=await run(),composite=composeNative(raster,roles,shadow);await writeFile(folder+'/composition-audit.json',JSON.stringify(composite.map(({pixels,...a},frame)=>({frame,...a})),null,2)+'\n');
 const packing=packCells(composite.map(c=>c.pixels),{diagnosticLimit:8}),compiled=compileSpriteFrames(composite.map(c=>c.pixels),{width:64,height:64,size:1,frameCellOrigins:packing.map(p=>p.origins)});
 for(let f=0;f<32;f++)for(let c=0;c<8;c++)for(let axis=0;axis<2;axis++)compiled.assembly[f*80+64+c*2+axis]+=composite[f].frameOffset[axis];
 for(let f=0;f<32;f++)for(const c of nativeSpriteCells({...compiled,cells:8,frames:32},f)){const[ox,oy]=packing[f].origins[c.cell];assert.equal(c.x,ox-32+composite[f].frameOffset[0]);assert.equal(c.y,oy-64+composite[f].frameOffset[1]);for(let y=0;y<16;y++)for(let x=0;x<16;x++)assert.equal(c.pixels[y*16+x],composite[f].pixels[(oy+y)*64+ox+x]);}
 const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);assert.equal(compiled.assembly.length,2560);for(const[file,b]of[['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed],['assembly.bin',compiled.assembly]])await writeFile(folder+'/'+file,b);
 for(const a of actors){const b=new Uint8Array(24);a.colors.forEach((c,i)=>put16(b,i*2,snesColor(c)));assert.equal(hash(b),resource.actors.find(o=>o.palette===a.palette).preservedPaletteSha256);await writeFile(folder+'/palette-'+a.palette+'.bin',b);}
 const frames=roles.frames.map((r,f)=>({...r,...Object.fromEntries(Object.entries(composite[f]).filter(([k])=>k!=='pixels')),cellOrigins:packing[f].origins,occupiedCells:packing[f].occupied,stripAxis:packing[f].stripAxis,pixelSha256:hash(composite[f].pixels)})),map={status:'Inactive source composition and exact eight-cell geometry',size:1,cells:8,width:64,height:64,nativeFrames:32,anchor:[0,0],frameOffsets:composite.map(c=>c.frameOffset),nativeMap,frames};await writeFile(folder+'/native-frame-map.draft.json',JSON.stringify(map,null,2)+'\n');
 await writeFile(folder+'/native-raster.json',JSON.stringify({key:'mire-golems',sourceType:'image-generation',width:64,height:64,palette:raster.palette,frames:composite.map(c=>Array.from(c.pixels,k=>k.toString(16)).join('')),sequences:{native:{1:Array.from({length:32},(_,i)=>i)}},provenance:raster.provenance,originalRasterComponents:[{file:folder+'/source-native-shadow.json',sha256:hash(await readFile(folder+'/source-native-shadow.json')),sourceType:'original-ROM-raster',description:'Unchanged original 14×4 indexed ground shadow in native slots12–20, at original native coordinates'}]},null,2)+'\n');
 const audit={status:'Inactive exact compile passed',graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes:compiled.assembly.length,tiles:compiled.tiles,graphicsSha256:hash(compiled.graphics),compressedSha256:hash(packed),assemblySha256:hash(compiled.assembly),original:{...resource.originalGraphics,rawDelta:compiled.graphics.length-resource.originalGraphics.decodedBytes,compressedPlusAssemblyDelta:packed.length-resource.originalGraphics.compressedBytes},current:{...resource.currentBaseline,rawDelta:compiled.graphics.length-resource.currentBaseline.graphics.decodedBytes,compressedPlusAssemblyDelta:packed.length-resource.currentBaseline.graphics.compressedBytes},underOriginalDecodedBudget:compiled.graphics.length<=resource.originalGraphics.decodedBytes,sourcePixelsNotDrawnOrClipped:true,sourceNativeShadowRetained:true,activation:false};await writeFile(folder+'/draft-audit.json',JSON.stringify(audit,null,2)+'\n');return audit;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)console.log(JSON.stringify(await compileDraft()));
