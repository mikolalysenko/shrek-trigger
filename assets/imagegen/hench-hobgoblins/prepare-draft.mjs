// Inactive generated-source sampling/geometry proposal. No active registry writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {put16} from '../../../engine/rom.js';

const dir='assets/imagegen/hench-hobgoblins',W=96,H=64,OX=48,OY=48;
const json=async name=>JSON.parse(await readFile(dir+'/'+name));
const save=(name,value)=>writeFile(dir+'/'+name,JSON.stringify(value,null,2)+'\n');
const sha=b=>createHash('sha256').update(b).digest('hex');
const range=n=>Array.from({length:n},(_,i)=>i);
export const nativeMap=[0,1,25,2,3,4,5,6,26,{frame:5,flip:true},{frame:6,flip:true},{frame:26,flip:true},28,7,8,9,10,11,12,13,14,15,{frame:13,flip:true},{frame:14,flip:true},27,16,17,18,19,20,21,22,23,24,{frame:22,flip:true},{frame:23,flip:true},{frame:24,flip:true}];
const sheet=(file,columns,rows,cells)=>({file:dir+'/'+file,columns,rows,cells,nativeHeight:28,scaleCells:[0],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:59,alphaThreshold:128}});
const bounds=p=>{let x0=W,y0=H,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%W);y0=Math.min(y0,i/W|0);x1=Math.max(x1,i%W);y1=Math.max(y1,i/W|0);}return[x0,y0,x1-x0+1,y1-y0+1];};
export async function prepareDraft(){
 const audit=await json('native-audit.json'),roles=await json('native-role-audit.json'),palette=audit.palettes.find(p=>p.id===24).colors;
 const sheets=[sheet('source-gait-v1.png',3,3,[0,1,3,4,5,6,7]),sheet('source-actions-v1.png',3,3,range(9)),sheet('source-tumbles-v1.png',3,3,range(9)),sheet('source-contact-recoil-v2.png',2,2,[0,1,3]),sheet('source-recoil-v3.png',1,1,[0])];
 const spec={key:'hench-hobgoblins',sourceType:'image-generation',directory:dir,width:W,height:H,palette,sheets,sequences:{native:{1:nativeMap}},notes:{status:'Inactive source-derived candidate; review and native execution evidence are recorded separately',preservation:'Both exact palettes, AA30, owner headers, AI and original four-cell geometry; only eight audited source mirrors are reused.',sourceOmissions:{'source-gait-v1.png':[2,8],'source-contact-recoil-v2.png':[2]},sampling:'Whole-source nearest sampling with documented per-pose dimensions; no procedural anatomy. Idle widths 1/4/7 normalized for model consistency; action 13 moved two pixels left, 16 one pixel left, 17 one pixel right relative to centered normalized sources. Actions 14/17 sampled two pixels shorter to preserve original detached dots; original lowest body pixel and every native cell origin remain unchanged.'}};
 const runImport=()=>execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
 await save('import-spec.draft.json',spec);runImport();
 const initial=await json('preview-import.json');let source=0;const sourceTargets=[];
 for(let s=0;s<sheets.length;s++){
  const sheet=sheets[s],info=initial.sources[s];sheet.overrides={};
  for(const cell of sheet.cells){
   const native=nativeMap.findIndex(n=>typeof n==='number'&&n===source),original=roles.frames[native].connectedComponents[0].bounds,sourceBounds=info.frames[cell].bounds;
   const widths={1:26,4:26,7:19,16:19,17:26,19:21},heights={14:29,17:28};
   const targetWidth=widths[native]??original[2],targetHeight=heights[native]??original[3];
   sheet.overrides[cell]={scale:targetHeight/(sourceBounds[3]*info.scale),scaleX:targetWidth/(sourceBounds[2]*targetHeight/sourceBounds[3])};
   sourceTargets.push({source,native,file:sheet.file,cell,sourceBounds,target:[targetWidth,targetHeight],horizontalAspectFactor:sheet.overrides[cell].scaleX});source++;
  }
 }
 assert.equal(source,29);await save('import-spec.draft.json',spec);runImport();
 const sampled=await json('preview-raster.json'),raw=sampled.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16))),frames=[],geometry=[],overlays=[],uncovered=[],effectConflicts=[];
 for(let f=0;f<37;f++){
  const entry=typeof nativeMap[f]==='number'?{frame:nativeMap[f]}:nativeMap[f],rawFrame=raw[entry.frame],p=entry.flip?Uint8Array.from(rawFrame,(_,i)=>rawFrame[(i/W|0)*W+W-1-i%W]):rawFrame,from=bounds(p),original=roles.frames[f],body=original.connectedComponents[0].bounds;
  assert.ok(from[2]>0&&from[3]>0,'Every source pose must be nonblank');
  const primary=nativeMap.findIndex(n=>n===entry.frame),primaryBody=roles.frames[primary].connectedComponents[0].bounds,shiftX=({13:-2,16:-1,17:1})[primary]??0,primaryX=Math.round(primaryBody[0]+(primaryBody[2]-from[2])/2)+shiftX;
  const targetX=entry.flip?-1-(primaryX+from[2]-1):primaryX,targetY=body[1]+body[3]-from[3];
  const dx=targetX+OX-from[0],dy=targetY+OY-from[1],out=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(p[y*W+x]){const xx=x+dx,yy=y+dy;assert.ok(xx>=0&&xx<W&&yy>=0&&yy<H);out[yy*W+xx]=p[y*W+x];}
  const effects=original.connectedComponents.slice(1).flatMap(c=>{assert.equal(c.pixels,1);return c.points;});
  for(const[x,y,k]of effects){const i=(y+OY)*W+x+OX;if(out[i])effectConflicts.push({frame:f,x,y,bodyIndex:out[i],effectIndex:k});else out[i]=k;}
  if(effects.length)overlays.push({frame:f,points:effects});
  const origins=original.cellOrigins.map(([x,y])=>[x+OX,y+OY]),coverage=new Uint8Array(W*H);
  for(const[x,y]of origins)for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++)coverage[(y+yy)*W+x+xx]++;
  const missing=[];out.forEach((k,i)=>{if(k&&!coverage[i])missing.push([i%W-OX,(i/W|0)-OY,k]);});
  if(missing.length)uncovered.push({frame:f,role:original.role,pixels:missing});
  const b=bounds(out);frames.push(out);geometry.push({frame:f,role:original.role,source:entry,sourceBounds:from,bodyBounds:[targetX,targetY,from[2],from[3]],nativeBounds:[b[0]-OX,b[1]-OY,...b.slice(2)],originalBounds:original.bounds,originalBodyBounds:body,originalCellOrigins:original.cellOrigins,cellOrigins:origins,cellGridTranslation:[0,0],effects:effects.length,pixelSha256:sha(out)});
 }
 const raster={...sampled,sequences:{native:{1:range(37)}},frames:frames.map(p=>Array.from(p,k=>k.toString(16)).join(''))};
 await save('native-raster.json',raster);await save('geometry-audit.json',{status:'Exact generated raster coverage and original cell origins; native execution evidence is separate',sourceTargets,uncovered,effectConflicts,frames:geometry});
 if(uncovered.length||effectConflicts.length){console.log(JSON.stringify({uncovered:uncovered.map(f=>({frame:f.frame,pixels:f.pixels.length,first:f.pixels.slice(0,5)})),effectConflicts},null,2));return{uncovered:uncovered.length,effectConflicts:effectConflicts.length};}
 const overlapFrames=[1,4,13,14,15,25,26,27,28,29,30],compiled=compileSpriteFrames(frames,{width:W,height:H,size:0,frameCellOrigins:geometry.map(f=>f.cellOrigins),cellOverlapFrames:overlapFrames});
 // compiler anchors to [width/2,height]; restore the original y by +16.
 for(let f=0;f<37;f++)for(let c=0;c<4;c++)compiled.assembly[f*40+32+c*2+1]=(compiled.assembly[f*40+32+c*2+1]+16)&255;
 for(let f=0;f<37;f++){
  const rendered=new Uint8Array(W*H),cells=nativeSpriteCells({...compiled,cells:4,frames:37},f);
  assert.deepEqual(cells.map(c=>[c.x,c.y]),roles.frames[f].cellOrigins);
  for(const c of cells)for(let i=0;i<256;i++){const k=c.pixels[i],j=(c.y+OY+(i>>4))*W+c.x+OX+i%16;if(k&&!rendered[j])rendered[j]=k;}
  assert.deepEqual(rendered,frames[f],'Exact original four-cell geometry must reproduce every sampled pixel');
 }
 for(const r of roles.exactSourceRelations)for(let y=0;y<H;y++)for(let x=0;x<W;x++)assert.equal(frames[r.frames[0]][y*W+x],frames[r.frames[1]][y*W+W-1-x],'Eight exact native mirror contracts');
 const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);assert.equal(compiled.assembly.length,1480);
 for(const[file,b]of[['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed],['assembly.bin',compiled.assembly]])await writeFile(dir+'/'+file,b);
 for(const p of audit.palettes){const bytes=new Uint8Array(24);p.words.forEach((n,i)=>put16(bytes,i*2,n));assert.equal(sha(bytes),p.sha256);await writeFile(dir+'/palette-'+p.id+'.bin',bytes);}
 await save('original-effects.json',{source:audit.original,width:W,height:H,scope:'Only six isolated original one-pixel index-4 motion flecks; no original body pixels',frames:overlays.map(o=>{const p=new Uint8Array(W*H);for(const[x,y,k]of o.points)p[(y+OY)*W+x+OX]=k;return{frame:o.frame,bounds:[0,0,W,H],pixels:[...p],nativePoints:o.points};})});
 await save('native-composition.json',geometry.map(g=>({frame:g.frame,source:g.source,sourceBounds:g.sourceBounds,bodyBounds:[g.bodyBounds[0]+OX,g.bodyBounds[1]+OY,...g.bodyBounds.slice(2)],translation:[0,0],shadowBounds:g.effects?[0,0,W,H]:null})));
 spec.nativeComposition={map:dir+'/native-composition.json',overlay:dir+'/original-effects.json'};spec.sequences={native:{1:range(37)}};await save('import-spec.draft.json',spec);runImport();const composed=await json('preview-raster.json');assert.deepEqual(composed.frames,raster.frames);await save('native-raster.json',composed);
 await save('native-frame-map.draft.json',{status:'Inactive authored native geometry; approval and execution evidence are separate',width:W,height:H,size:0,cells:4,nativeFrames:37,authoredSourcePoses:29,nativeMap,anchor:[0,16],frameOffsets:range(37).map(()=>[0,0]),cellOverlapFrames:overlapFrames,frames:geometry});
 const cost={status:'Inactive exact source compile passed; execution evidence is recorded separately',activation:false,nativeFrames:37,authoredSourcePoses:29,uniqueNativeImages:new Set(frames.map(sha)).size,graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes:compiled.assembly.length,compressedPlusAssemblyBytes:packed.length+1480,tiles:compiled.tiles,graphicsSha256:sha(compiled.graphics),compressedSha256:sha(packed),assemblySha256:sha(compiled.assembly),originalComparison:{decodedBytes:8928,compressedBytes:7491,assemblyBytes:1480,decodedDelta:compiled.graphics.length-8928,compressedPlusAssemblyDelta:packed.length-7491},publishedAf338Comparison:{decodedBytes:8928,compressedBytes:7491,assemblyBytes:1480,decodedDelta:compiled.graphics.length-8928,compressedPlusAssemblyDelta:packed.length-7491},streamRequired:compiled.graphics.length>8928,fourCellCoverage:true,exactOriginalCellOrigins:true,exactNativeMirrorPairs:roles.exactSourceRelations.map(r=>r.frames),originalEffects:6,noClippedPixels:true};await save('draft-audit.json',cost);return cost;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)console.log(JSON.stringify(await prepareDraft(),null,2));
