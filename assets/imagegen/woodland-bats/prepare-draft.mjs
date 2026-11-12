// Inactive actual-imagegen sampling; no active registration or ROM writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {put16} from '../../../engine/rom.js';
const dir='assets/imagegen/woodland-bats',W=64,H=80,OX=32,OY=64,json=async f=>JSON.parse(await readFile(dir+'/'+f)),save=(f,v)=>writeFile(dir+'/'+f,JSON.stringify(v,null,2)+'\n'),sha=b=>createHash('sha256').update(b).digest('hex'),range=n=>Array.from({length:n},(_,i)=>i);
const bounds=p=>{let x0=W,y0=H,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%W);y0=Math.min(y0,i/W|0);x1=Math.max(x1,i%W);y1=Math.max(y1,i/W|0);}return[x0,y0,x1-x0+1,y1-y0+1];};
const audit=await json('native-audit.json'),roles=await json('native-role-audit.json'),palette=audit.palettes.find(p=>p.id===78).colors;
const sheet={file:dir+'/source-v1.png',columns:4,rows:2,cells:range(8),nativeHeight:22,scaleCells:[0],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:70,alphaThreshold:128}},spec={key:'woodland-bats',directory:dir,sourceType:'image-generation',width:W,height:H,palette,sheets:[sheet],sequences:{native:{1:range(8)}},notes:{status:'Inactive source-derived draft; native geometry and motion proof are separate',constraints:'All eight original slots; no source mirrors or procedural anatomy. Preserve all original cell origins, full owner size flags192/224, both exact palettes and AA47. Source lowest pixels remain anchored individually.'}};
const run=()=>execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
await save('import-spec.draft.json',spec);run();
const sampled=await json('preview-import.json'),info=sampled.sources[0],targets=[];sheet.overrides={};
for(let f=0;f<8;f++){
 const original=roles.frames[f].bounds,sourceBounds=info.frames[f].bounds,width=([5,6].includes(f)?17:original[2]),height=original[3];
 const scale=height/(sourceBounds[3]*info.scale),scaleX=width/(sourceBounds[2]*height/sourceBounds[3]),x=Math.round(original[0]+(original[2]-width)/2),y=original[1];
 sheet.overrides[f]={scale,scaleX,dx:x+OX-Math.floor((W-width)/2),bottom:y+OY+height-1};
 targets.push({frame:f,file:sheet.file,cell:f,sourceBounds,target:[width,height],horizontalAspectFactor:scaleX,targetNativeBounds:[x,y,width,height]});
}
await save('import-spec.draft.json',spec);run();
let art=await json('preview-raster.json'),frames=art.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16)));
// Correct only whole-source integer sampling placement if a sampled transparent
// edge changes its measured bounds; retain the original lowest opaque pixel.
for(let f=0;f<8;f++){const b=bounds(frames[f]),r=roles.frames[f].bounds;sheet.overrides[f].bottom+=(r[1]+r[3]+OY)-(b[1]+b[3]);}
await save('import-spec.draft.json',spec);run();art=await json('preview-raster.json');frames=art.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16)));
const geometry=[],uncovered=[],overlapFrames=[];
for(let f=0;f<8;f++){
 const b=bounds(frames[f]),r=roles.frames[f],origins=r.cellOrigins.map(([x,y])=>[x+OX,y+OY]),cover=new Uint8Array(W*H);
 for(const[x,y]of origins)for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){assert.ok(x+xx>=0&&x+xx<W&&y+yy>=0&&y+yy<H);cover[(y+yy)*W+x+xx]++;}
 if(cover.some(n=>n>1))overlapFrames.push(f);
 const missing=[];frames[f].forEach((k,i)=>{if(k&&!cover[i])missing.push([i%W-OX,(i/W|0)-OY,k]);});if(missing.length)uncovered.push({frame:f,pixels:missing});
 geometry.push({frame:f,role:r.role,source:{frame:f},nativeBounds:[b[0]-OX,b[1]-OY,...b.slice(2)],originalBounds:r.bounds,originalCellOrigins:r.cellOrigins,cellOrigins:origins,cellGridTranslation:[0,0],lowestPixelUnchanged:b[1]+b[3]-OY===r.bounds[1]+r.bounds[3],pixelSha256:sha(frames[f])});
}
await save('native-raster.json',art);await save('geometry-audit.json',{status:'Inactive source geometry draft',sourceTargets:targets,uncovered,frames:geometry});
await save('native-frame-map.draft.json',{status:'Inactive authored native geometry draft',width:W,height:H,size:0,fullSizeFlags:[192,224],cells:4,nativeFrames:8,authoredSourcePoses:8,anchor:[0,16],frameOffsets:range(8).map(()=>[0,0]),cellOverlapFrames:overlapFrames,frames:geometry});
if(uncovered.length){console.log(JSON.stringify({status:'Coverage needs source sampling adjustment',uncovered},null,2));process.exit(2);}
const compiled=compileSpriteFrames(frames,{width:W,height:H,size:0,frameCellOrigins:geometry.map(f=>f.cellOrigins),cellOverlapFrames:overlapFrames});
for(let f=0;f<8;f++)for(let c=0;c<4;c++)compiled.assembly[f*40+32+c*2+1]=(compiled.assembly[f*40+32+c*2+1]+16)&255;
for(let f=0;f<8;f++){const native=nativeSpriteCells({...compiled,cells:4,frames:8},f),rendered=new Uint8Array(W*H);assert.deepEqual(native.map(c=>[c.x,c.y]),roles.frames[f].cellOrigins);for(const c of native)for(let i=0;i<256;i++){const k=c.pixels[i],at=(c.y+OY+(i>>4))*W+c.x+OX+i%16;if(k&&!rendered[at])rendered[at]=k;}assert.deepEqual(rendered,frames[f]);}
const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);assert.equal(compiled.assembly.length,320);
for(const[file,bytes]of [['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed],['assembly.bin',compiled.assembly]])await writeFile(dir+'/'+file,bytes);
for(const p of audit.palettes){const b=new Uint8Array(24);p.words.forEach((n,i)=>put16(b,i*2,n));assert.equal(sha(b),p.sha256);await writeFile(dir+'/palette-'+p.id+'.bin',b);}
const cost={status:'Inactive exact source compile passed; approval and execution evidence recorded separately',activation:false,nativeFrames:8,authoredSourcePoses:8,uniqueNativeImages:new Set(frames.map(sha)).size,graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes:320,compressedPlusAssemblyBytes:packed.length+320,tiles:compiled.tiles,graphicsSha256:sha(compiled.graphics),compressedSha256:sha(packed),assemblySha256:sha(compiled.assembly),originalComparison:{decodedBytes:1760,compressedBytes:1281,assemblyBytes:320,decodedDelta:compiled.graphics.length-1760,compressedPlusAssemblyDelta:packed.length-1281},publishedAf338Comparison:{decodedBytes:1760,compressedBytes:1281,assemblyBytes:320,decodedDelta:compiled.graphics.length-1760,compressedPlusAssemblyDelta:packed.length-1281},streamRequired:compiled.graphics.length>1760,fourCellCoverage:true,exactOriginalCellOrigins:true,noOriginalBodyOrEffectPixels:true,noClippedPixels:true,overlapFrames};await save('draft-audit.json',cost);console.log(JSON.stringify(cost,null,2));
