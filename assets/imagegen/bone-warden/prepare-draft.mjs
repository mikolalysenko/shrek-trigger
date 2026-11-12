import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {compileActorFamily} from '../../../engine/actor-families.js';
import {compress,decompress} from '../../../engine/compression.js';
import {u16} from '../../../engine/rom.js';
import {packWardenCells} from './pack-cells.mjs';

const d=import.meta.dirname,root=path.resolve(d,'../../..'),dir='assets/imagegen/bone-warden';
const read=p=>JSON.parse(fs.readFileSync(path.join(d,p))),write=(p,v)=>fs.writeFileSync(path.join(d,p),JSON.stringify(v,null,2)+'\n'),sha=b=>createHash('sha256').update(b).digest('hex');
const sourceFamilies=read('source-families.json'),audit=read('native-audit.json');
const mirror=frame=>({frame,flip:true});
const maps={
 'warden':[0,2,4,1,3,5,mirror(1),mirror(3),mirror(5),6,7,8,9,mirror(8),mirror(9),10,14,12,13,mirror(12),mirror(13)],
 'warden-legs':[0,9,2,10,11,5,mirror(5),12,7,8],
};
const methods=process.argv.includes('--area')?'area':'nearest';
const decode=h=>Uint8Array.from(h,c=>parseInt(c,16));
const apply=(p,n)=>n.flip?Uint8Array.from(p,(_,i)=>p[Math.floor(i/64)*64+63-i%64]):p;
const bounds=p=>{const pts=Array.from(p,(v,i)=>v?[i%64,Math.floor(i/64)]:null).filter(Boolean);return[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0]))+1,Math.max(...pts.map(p=>p[1]))+1];};
const rgb=hex=>[0,2,4].map(n=>{let v=parseInt(hex.slice(n,n+2),16)>>3;return v<<3|v>>2;});
function render(frames,palette,scale=1,cols=7){const out=new PNG({width:cols*64*scale,height:Math.ceil(frames.length/cols)*64*scale});for(let i=0;i<out.data.length;i+=4)out.data.set([37,43,47,255],i);frames.forEach((p,f)=>p.forEach((v,i)=>{if(v)for(let y=0;y<scale;y++)for(let x=0;x<scale;x++)out.data.set([...rgb(palette[v-1]),255],(((f/cols|0)*64*scale+(i/64|0)*scale+y)*out.width+(f%cols)*64*scale+(i%64)*scale+x)*4);}));return PNG.sync.write(out);}
export function nativeFrames(asset){return asset.sequences.native[1].map(n=>apply(decode(asset.frames[typeof n==='number'?n:n.frame]),typeof n==='number'?{}:n));}

const results=[];
for(const original of sourceFamilies){
 const family=structuredClone(original),group=family.groups[0],upper=group.art==='warden',output=(upper?'upper-draft':'legs-draft')+(methods==='area'?'-area':''),palette=family.actors[0].colors;
 const sheet=(file,columns,rows,nativeHeight,scaleCells,sample)=>({file:dir+'/'+file,columns,rows,nativeHeight,scaleCells,componentAlpha:128,componentSelection:'union',sample:{method:methods,bottom:63,alphaThreshold:128,...sample}});
 const spec={key:group.art,sourceType:'image-generation',directory:dir+'/'+output,width:64,height:64,palette,
  sheets:upper?[sheet('source-upper-movement-v1.png',2,3,47,[0,2,4],{}),sheet('source-upper-actions-v1.png',4,2,47,[4,5],{}),{...sheet('source-upper-actions-v2.png',4,2,47,[4,5],{}),cells:[5]}]:[sheet('source-legs-v1.png',3,3,47,[0,1,2,3],{scaleX:.85}),{...sheet('source-legs-v2.png',3,3,47,[0,2],{scaleX:.85}),cells:[1,3,4,6]}],
  sequences:{native:{1:maps[group.art]}},notes:{status:'Inactive complete source candidate; all native source frames, geometry and exact tile reproduction complete; root approved area-sampled art. Native scene proof and freeze are recorded separately.',nativeFrames:group.frames,sourcePixelsOnly:true,wholeSourceMirrors:maps[group.art].map((n,i)=>typeof n==='object'?i:null).filter(n=>n!==null),originalProgramsUnchanged:true}};
 fs.mkdirSync(path.join(d,output),{recursive:true});write(output+'/import-spec.draft.json',spec);
 execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/'+output+'/import-spec.draft.json'],{cwd:root,stdio:'pipe'});
 const asset=read(output+'/preview-raster.json'),frames=nativeFrames(asset),originalRows=audit.families.find(a=>a.family.key===family.key).frames,bb=frames.map(bounds);
 fs.writeFileSync(path.join(d,output,'native-1x.png'),render(frames,palette));fs.writeFileSync(path.join(d,output,'native-4x.png'),render(frames,palette,4));
 fs.writeFileSync(path.join(d,output,'echo-native-4x.png'),render(frames,family.actors[1].colors,4));
 const packing=upper?packWardenCells(frames,{diagnosticLimit:8}):frames.map(()=>({origins:Array.from({length:12},(_,i)=>[i%4*16,16+Math.floor(i/4)*16]),occupied:12,phase:0,stripAxis:'y'}));
 // Preserve the original per-slot uppermost pixel and horizontal silhouette
 // center. This retains signed action displacement without resizing anatomy.
 group.width=64;group.height=64;delete group.cellOrigins;group.frameCellOrigins=packing.map(p=>p.origins);group.cellOverlapFrames=packing.map((p,f)=>p.overlaps?f:null).filter(f=>f!==null);group.anchor=[0,0];group.frameOffsets={};
 for(let f=0;f<frames.length;f++){const a=originalRows[f].bounds,b=bb[f],dx=Math.round((a[0]+a[2])/2-((b[0]+b[2])/2-32)),dy=a[1]-(b[1]-64);group.frameOffsets[f]=[dx,dy];}
 const coverage=packing.map((row,f)=>{const counts=new Uint8Array(4096);for(const[x,y]of row.origins)for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++)counts[(y+yy)*64+x+xx]++;return{frame:f,overlappingCanvasPixels:counts.filter(v=>v>1).length,overlappingOpaquePixels:counts.filter((v,i)=>v>1&&frames[f][i]).length,maxCoverage:Math.max(...counts)};});
 const c=compileActorFamily(family,(_,f)=>frames[f]),graphics=c.graphics,assembly=c.groups[0].assembly,packed=compress(graphics),cells=upper?8:12;
 assert.ok(graphics.length<=32768);assert.deepEqual(decompress(packed,0).bytes,graphics);
 for(let f=0;f<frames.length;f++){const reproduced=new Uint8Array(4096);for(let cell=0;cell<cells;cell++){const [cx,cy]=packing[f].origins[cell],pos=f*cells*10+cells*8+cell*2;assert.equal(assembly[pos],(cx-32+group.frameOffsets[f][0])&255);assert.equal(assembly[pos+1],(cy-64+group.frameOffsets[f][1])&255);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const w=u16(assembly,f*cells*10+(cell>>(cells===12?2:3))*(cells===12?32:64)+(y>>3)*(cells===12?16:32)+(cell%(cells===12?4:8))*4+(x>>3)*2),tx=w&16384?7-(x&7):x&7;let v=0;for(let bit=0;bit<4;bit++)v|=(graphics[(w&1023)*32+(bit>>1)*16+(y&7)*2+(bit&1)]>>(7-tx)&1)<<bit;assert.equal(v,frames[f][(cy+y)*64+cx+x],'Every cell preserves its sampled source, including overlaps');reproduced[(cy+y)*64+cx+x]=v;}}assert.deepEqual(reproduced,frames[f]);}
 for(const [name,b]of [['graphics.4bpp',graphics],['graphics.ct-lz',packed],['assembly.bin',assembly]])fs.writeFileSync(path.join(d,output,name),b);
 write(output+'/family.json',family);
 const report={key:family.key,sourceType:'image-generation',nativeFrames:frames.length,uniqueFrames:new Set(frames.map(sha)).size,rawBytes:graphics.length,compressedBytes:packed.length,assemblyBytes:assembly.length,tiles:c.tiles,graphicsSha256:sha(graphics),compressedSha256:sha(packed),assemblyAfterOffsetsSha256:sha(assembly),cells,allowedOverlapFrames:group.cellOverlapFrames,overlapCoverage:coverage,frames:frames.map((p,f)=>({frame:f,source:maps[group.art][f],sourcePixelSha256:sha(p),sampledBounds:bb[f],originalBounds:originalRows[f].bounds,frameOffset:group.frameOffsets[f],nativeBounds:[bb[f][0]-32+group.frameOffsets[f][0],bb[f][1]-64+group.frameOffsets[f][1],bb[f][2]-32+group.frameOffsets[f][0],bb[f][3]-64+group.frameOffsets[f][1]],cellOrigins:packing[f].origins,occupiedCells:packing[f].occupied})),extraNativeCells:0,originalProgramsUnchanged:true,activation:false};
 write(output+'/draft-audit.json',report);results.push(report);
}
console.log(JSON.stringify(results.map(({key,nativeFrames,rawBytes,compressedBytes,assemblyBytes})=>({key,nativeFrames,rawBytes,compressedBytes,assemblyBytes})),null,2));
