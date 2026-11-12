import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileActorFamily} from '../../../engine/actor-families.js';
import {compress,decompress} from '../../../engine/compression.js';
import {u16} from '../../../engine/rom.js';
import {packHeadCells} from './pack-cells.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(fs.readFileSync(path.join(d,p)));
export function compileFurnaceDraft(){
 const asset=json('draft/preview-raster.json'),spec=json('import-spec.draft.json'),family=json('source-family.json'),native=json('native-audit.json'),roles=json('native-roles.json');
 assert.deepEqual(asset.palette,family.actors[0].colors);assert.equal(asset.width,64);assert.equal(asset.height,96);assert.equal(asset.frames.length,6);
 for(const source of asset.provenance)assert.equal(sha(fs.readFileSync(path.join(root,source.file))),source.sha256);
 const frames=asset.sequences.native[1].map(entry=>{const f=typeof entry==='number'?entry:entry.frame,p=Uint8Array.from(asset.frames[f],c=>parseInt(c,16));return entry.flip?Uint8Array.from(p,(_,i)=>p[(i/64|0)*64+63-i%64]):p;});
 const packing=packHeadCells(frames);family.groups[0]={...family.groups[0],width:64,height:96,anchor:[0,32],frameOffsets:{},frameCellOrigins:packing.map(p=>p.origins)};
 const compiled=compileActorFamily(family,(_,f)=>frames[f]),graphics=compiled.graphics,assembly=compiled.groups[0].assembly,compressed=compress(graphics);
 assert.equal(assembly.length,960);assert.ok(graphics.length<=32768);assert.deepEqual(decompress(compressed,0).bytes,graphics);
 const frameReports=[];for(let f=0;f<8;f++){
  const pixels=new Uint8Array(64*96),xy=[];for(let cell=0;cell<12;cell++){
   const[cx,cy]=packing[f].origins[cell];assert.equal(assembly[f*120+96+cell*2],(cx-32)&255);assert.equal(assembly[f*120+97+cell*2],(cy-64)&255);xy.push([cx-32,cy-64]);
   for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const word=u16(assembly,f*120+Math.floor(cell/4)*32+(y>>3)*16+(cell%4)*4+(x>>3)*2),tx=word&0x4000?7-(x&7):x&7;assert.equal(word&0x8000,0);let value=0;for(let bit=0;bit<4;bit++)value|=(graphics[(word&1023)*32+(bit>>1)*16+(y&7)*2+(bit&1)]>>(7-tx)&1)<<bit;pixels[(cy+y)*64+cx+x]=value;
   }
  }
  assert.deepEqual(pixels,frames[f],'Exact twelve-cell reconstruction frame'+f);const pts=Array.from(pixels,(v,i)=>v?[i%64-32,(i/64|0)-64]:null).filter(Boolean);
  frameReports.push({...roles.roles[f],opaquePixels:pts.length,bounds:[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0]))+1,Math.max(...pts.map(p=>p[1]))+1],cellXY:xy,occupiedCells:packing[f].occupied,pixelSha256:sha(pixels)});
 }
 const report={status:'Inactive generated Furnace Maw heads; source/12-cell/4bpp reconstruction complete, native verification separate.',nativeFrames:8,sourcePoses:6,proceduralFrames:0,blankFrames:[],width:64,height:96,sizeByte:6,cells:12,owners:[188,189],palettes:[229,230],paletteChanged:false,rawGraphicsBytes:graphics.length,compressedBytes:compressed.length,tiles:compiled.tiles,assemblyBytes:assembly.length,graphicsSha256:sha(graphics),compressedSha256:sha(compressed),assemblyAfterAuthoredCoordinatesSha256:sha(assembly),frames:frameReports,original:{raw:native.source.rawGraphicsBytes,compressed:native.source.compressedGraphicsBytes,assembly:native.source.assemblyBytes,animationSha256:native.source.animationSha256},growth:{raw:graphics.length-native.source.rawGraphicsBytes,compressed:compressed.length-native.source.compressedGraphicsBytes,assembly:0},geometry:'Larger transparent64×96 staging has origin[-32,-64] relative to the original actor. Actual sampled head extents retain the original vertical poses; twelve movable nonoverlapping16×16 cells remain. Old procedural offsets are not applied twice.',extraVramBytes:0,extraWramBytes:0,provenance:asset.provenance};
 return{asset,spec,family,frames,packing,graphics,compressed,assembly,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){const c=compileFurnaceDraft();for(const[name,data]of[['graphics.4bpp',c.graphics],['graphics.ct-lz',c.compressed],['assembly.bin',c.assembly]])fs.writeFileSync(path.join(d,'draft',name),data);fs.writeFileSync(path.join(d,'draft/family.json'),JSON.stringify(c.family,null,2)+'\n');fs.writeFileSync(path.join(d,'draft-audit.json'),JSON.stringify(c.report,null,2)+'\n');console.log(JSON.stringify({nativeFrames:8,sourcePoses:6,raw:c.graphics.length,compressed:c.compressed.length,assembly:c.assembly.length,growth:c.report.growth}));}
