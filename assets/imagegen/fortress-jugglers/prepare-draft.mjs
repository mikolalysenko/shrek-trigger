// Inactive generated-source sampling; no registry or canonical ROM writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {put16} from '../../../engine/rom.js';
import {composeJugglerArt} from './compose-native.js';
const dir='assets/imagegen/fortress-jugglers',W=64,H=80,OX=32,OY=64,range=n=>Array.from({length:n},(_,i)=>i),nativeMap=[0,1,2,1,3,4,5,6,7];
const json=async f=>JSON.parse(await readFile(dir+'/'+f)),save=(f,v)=>writeFile(dir+'/'+f,JSON.stringify(v,null,2)+'\n'),sha=b=>createHash('sha256').update(b).digest('hex');
const bounds=p=>{let x0=W,y0=H,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%W);y0=Math.min(y0,i/W|0);x1=Math.max(x1,i%W);y1=Math.max(y1,i/W|0);}return[x0,y0,x1-x0+1,y1-y0+1];};
const audit=await json('native-audit.json'),roles=await json('native-role-audit.json'),effects=await json('original-effects.draft.json'),palette=audit.palettes[0].colors;
const targets=range(8).map(source=>{const native=nativeMap.indexOf(source);return{source,native,bounds:native===4?roles.frames[4].connectedComponents[0].bounds:native===6?roles.frames[7].bounds:roles.frames[native].bounds};});
const sheet={file:dir+'/source-v1.png',columns:4,rows:2,cells:range(8),nativeHeight:31,scaleCells:[0],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:70,alphaThreshold:128}};
const spec={key:'fortress-jugglers',directory:dir,sourceType:'image-generation',width:W,height:H,palette,sheets:[sheet],sequences:{source:{1:range(8)}},notes:{status:'Inactive sampled source; compose-native.js maps eight generated bodies to nine native slots and overlays recorded original effect pixels',preserve:'Both exact owner headers/full flags, palette40, AA82, AI/stats/events/names and original four-cell coordinates/order. Only native1/3 share a proven source. No procedural anatomy.'}};
const run=()=>execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
await save('import-spec.draft.json',spec);run();const initial=await json('preview-import.json'),info=initial.sources[0];sheet.overrides={};
const sourceTargets=targets.map(t=>{const s=info.frames[t.source].bounds,[x,y,w,h]=t.bounds;sheet.overrides[t.source]={scale:h/(s[3]*info.scale),scaleX:w/(s[2]*h/s[3])};return{...t,file:sheet.file,sourceBounds:s,target:[w,h],horizontalAspectFactor:sheet.overrides[t.source].scaleX};});
await save('import-spec.draft.json',spec);run();const sampled=await json('preview-raster.json'),sampledPixels=sampled.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16)));
const map=nativeMap.map((source,frame)=>{const from=bounds(sampledPixels[source]),target=targets[source].bounds;return{frame,source,sourceBounds:from,bodyBounds:[target[0]+OX,target[1]+target[3]-from[3]+OY,from[2],from[3]]};});
const composed=composeJugglerArt(sampled,map,effects),frames=composed.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16))),geometry=[],uncovered=[],overlapFrames=[],effectOcclusion=[];
for(let f=0;f<9;f++){
  const role=roles.frames[f],origins=role.cellOrigins.map(([x,y])=>[x+OX,y+OY]),cover=new Uint8Array(W*H);
  for(const[x,y]of origins)for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){assert.ok(x+xx>=0&&x+xx<W&&y+yy>=0&&y+yy<H);cover[(y+yy)*W+x+xx]++;}
  if(cover.some(n=>n>1))overlapFrames.push(f);
  const missing=[];frames[f].forEach((k,i)=>{if(k&&!cover[i])missing.push([i%W-OX,(i/W|0)-OY,k]);});if(missing.length)uncovered.push({frame:f,pixels:missing});
  const b=bounds(frames[f]),entry=map[f],body=entry.bodyBounds,overlay=effects.frames.find(e=>e.frame===f),raw=sampledPixels[entry.source],coveredBody=[];
  if(overlay)for(const[x,y,k]of overlay.points){const sx=x+OX-body[0]+entry.sourceBounds[0],sy=y+OY-body[1]+entry.sourceBounds[1],at=sy*W+sx;if(sx>=0&&sx<W&&sy>=0&&sy<H&&raw[at])coveredBody.push({x,y,bodyIndex:raw[at],effectIndex:k});}
  if(coveredBody.length)effectOcclusion.push({frame:f,pixels:coveredBody.length,points:coveredBody});
  geometry.push({frame:f,role:role.role,source:entry.source,sourceBounds:entry.sourceBounds,bodyBounds:[body[0]-OX,body[1]-OY,...body.slice(2)],nativeBounds:[b[0]-OX,b[1]-OY,...b.slice(2)],originalBounds:role.bounds,originalCellOrigins:role.cellOrigins,cellOrigins:origins,cellGridTranslation:[0,0],lowestPixelUnchanged:b[1]+b[3]-OY===role.bounds[1]+role.bounds[3],originalEffectPixels:overlay?.points.length??0,pixelSha256:sha(frames[f])});
}
await save('native-composition.json',map);await save('native-raster.json',composed);await save('geometry-audit.json',{status:'Inactive generated-source and retained-effect coverage',sourceTargets,uncovered,effectOcclusion,frames:geometry});
if(uncovered.length){console.log(JSON.stringify({uncovered},null,2));process.exit(2);}
assert.deepEqual(frames[1],frames[3],'Exact native duplicate1/3');
assert.ok(geometry.every(f=>f.lowestPixelUnchanged),'Original lowest-pixel anchors');
assert.ok(effectOcclusion.every(f=>f.frame===6),'Only radial flash may cover the generated body');
const compiled=compileSpriteFrames(frames,{width:W,height:H,size:0,frameCellOrigins:geometry.map(f=>f.cellOrigins),cellOverlapFrames:overlapFrames});
for(let f=0;f<9;f++)for(let c=0;c<4;c++)compiled.assembly[f*40+32+c*2+1]=(compiled.assembly[f*40+32+c*2+1]+16)&255;
for(let f=0;f<9;f++){const cells=nativeSpriteCells({...compiled,cells:4,frames:9},f),r=new Uint8Array(W*H);assert.deepEqual(cells.map(c=>[c.x,c.y]),roles.frames[f].cellOrigins);for(const c of cells)for(let i=0;i<256;i++){const k=c.pixels[i],at=(c.y+OY+(i>>4))*W+c.x+OX+i%16;if(k&&!r[at])r[at]=k;}assert.deepEqual(r,frames[f]);}
const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);assert.equal(compiled.assembly.length,360);
for(const[file,bytes]of[['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed],['assembly.bin',compiled.assembly]])await writeFile(dir+'/'+file,bytes);
const p=new Uint8Array(24);audit.palettes[0].words.forEach((n,i)=>put16(p,i*2,n));assert.equal(sha(p),audit.palettes[0].sha256);await writeFile(dir+'/palette-40.bin',p);
await save('native-frame-map.draft.json',{status:'Inactive authored native geometry; approval and native execution separate',width:W,height:H,size:0,fullSizeFlags:[224,192],cells:4,nativeFrames:9,authoredSourcePoses:8,nativeMap,origin:[OX,OY],anchor:[0,16],frameOffsets:range(9).map(()=>[0,0]),cellOverlapFrames:overlapFrames,frames:geometry});
const comparison={decodedBytes:2432,compressedBytes:2324,assemblyBytes:360,decodedDelta:compiled.graphics.length-2432,compressedPlusAssemblyDelta:packed.length-2324};
const cost={status:'Inactive exact source/effect compile passed; approval and execution evidence recorded separately',activation:false,nativeFrames:9,authoredSourcePoses:8,uniqueNativeImages:new Set(frames.map(sha)).size,graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes:360,compressedPlusAssemblyBytes:packed.length+360,tiles:compiled.tiles,graphicsSha256:sha(compiled.graphics),compressedSha256:sha(packed),assemblySha256:sha(compiled.assembly),originalComparison:comparison,published417914Comparison:comparison,streamRequired:compiled.graphics.length>2432,fourCellCoverage:true,exactOriginalCellOrigins:true,noClippedPixels:true,originalEffectPixels:363,effectOccludedBodyPixels:effectOcclusion.reduce((n,f)=>n+f.pixels,0),overlapFrames};await save('draft-audit.json',cost);console.log(JSON.stringify(cost,null,2));
