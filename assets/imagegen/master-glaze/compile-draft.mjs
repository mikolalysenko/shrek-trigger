import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileActorFamily} from '../../../engine/actor-families.js';
import {compress,decompress} from '../../../engine/compression.js';
import {u16} from '../../../engine/rom.js';

const d=import.meta.dirname,root=path.resolve(d,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(fs.readFileSync(path.join(d,p)));
export function compileGlazeDraft(){
 const asset=json('draft/preview-raster.json'),spec=json('import-spec.draft.json'),family=json('source-family.json'),native=json('native-audit.json'),roles=json('native-roles.json');
 assert.deepEqual(asset.palette,family.actors[0].colors);assert.equal(asset.width,32);assert.equal(asset.height,32);assert.equal(asset.frames.length,17);
 for(const source of asset.provenance)assert.equal(sha(fs.readFileSync(path.join(root,source.file))),source.sha256);
 const frames=asset.sequences.native[1].map(entry=>{const f=typeof entry==='number'?entry:entry.frame,p=Uint8Array.from(asset.frames[f],c=>parseInt(c,16));return entry.flip?Uint8Array.from(p,(_,i)=>p[(i/32|0)*32+31-i%32]):p;});
 assert.equal(frames.length,20);for(const p of frames){assert.equal(p.length,1024);assert.ok(p.some(Boolean));assert.ok(p.every(v=>v<=12));}
 const compiled=compileActorFamily(family,(_,f)=>frames[f]),graphics=compiled.graphics,assembly=compiled.groups[0].assembly,compressed=compress(graphics);
 assert.equal(assembly.length,800);assert.ok(graphics.length<=32768);assert.deepEqual(decompress(compressed,0).bytes,graphics);
 for(let f=0;f<20;f++){
  const p=new Uint8Array(1024),[dx,dy]=family.groups[0].frameOffsets[f]??[0,0];
  for(let c=0;c<4;c++){
   const cx=c%2*16,cy=(c/2|0)*16;assert.equal(assembly[f*40+32+c*2],(cx-16+dx)&255);assert.equal(assembly[f*40+33+c*2],(cy-32+dy)&255);
   for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const word=u16(assembly,f*40+(y>>3)*16+c*4+(x>>3)*2),tx=word&0x4000?7-(x&7):x&7;assert.equal(word&0x8000,0);let value=0;
    for(let bit=0;bit<4;bit++)value|=(graphics[(word&1023)*32+(bit>>1)*16+(y&7)*2+(bit&1)]>>(7-tx)&1)<<bit;
    p[(cy+y)*32+cx+x]=value;
   }
  }
  assert.deepEqual(p,frames[f],'Exact four-cell reconstruction of frame '+f);
 }
 const report={status:'Inactive generated raster draft. Source and 4bpp reproduction complete; cartridge activation/native proof owned by root.',nativeFrames:20,sourcePoses:17,blankFrames:[],proceduralFrames:0,width:32,height:32,cells:4,palette:190,colors:asset.palette,paletteChanged:false,rawGraphicsBytes:graphics.length,compressedBytes:compressed.length,tiles:compiled.tiles,assemblyBytes:assembly.length,graphicsSha256:sha(graphics),compressedSha256:sha(compressed),assemblyAfterAuthoredOffsetsSha256:sha(assembly),frames:frames.map((p,f)=>({...roles.roles[f],opaquePixels:p.filter(Boolean).length,pixelSha256:sha(p)})),original:{graphicsBytes:native.source.rawGraphicsBytes,compressedBytes:native.source.compressedGraphicsBytes,assemblyBytes:native.source.assemblyBytes,animationSha256:native.source.animationSha256,aiSha256:native.source.ai.sha256},growth:{raw:graphics.length-native.source.rawGraphicsBytes,compressed:compressed.length-native.source.compressedGraphicsBytes,assembly:assembly.length-native.source.assemblyBytes},sceneOriginalUnionBounds:native.scenes.map(s=>({location:s.location,original:s.originalWholeLocationLoadUpperBound.bytes,candidate:s.originalWholeLocationLoadUpperBound.bytes+graphics.length-native.source.rawGraphicsBytes,limit:32768,note:s.originalWholeLocationLoadUpperBound.note})),provenance:asset.provenance};
 return{asset,spec,family,frames,graphics,compressed,assembly,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const c=compileGlazeDraft();for(const[name,data]of[['graphics.4bpp',c.graphics],['graphics.ct-lz',c.compressed],['assembly.bin',c.assembly]])fs.writeFileSync(path.join(d,'draft',name),data);
 fs.writeFileSync(path.join(d,'draft-audit.json'),JSON.stringify(c.report,null,2)+'\n');
 console.log(JSON.stringify({nativeFrames:20,sourcePoses:17,raw:c.graphics.length,compressed:c.compressed.length,assembly:c.assembly.length,growth:c.report.growth,roundTripFrames:20}));
}
