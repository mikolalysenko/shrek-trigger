// Sample imported source pixels into the original four cell coordinates,
// including the native overlapping spark cells. No source pixels are painted.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {u16,u24,put16,fileOffset,validateRom} from '../../../engine/rom.js';
import {tile4bpp,internSpriteTile,snesColor} from '../../../engine/sprites.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {readEnemyAI} from '../../../engine/enemy-ai.js';
const root=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex'),signed=v=>v>127?v-256:v;
export async function compileDisplayDraft(){
 const base=await validateRom(await readFile(new URL('../../../.local/chrono-trigger-usa.sfc',root))),asset=JSON.parse(await readFile(new URL('draft/preview-raster.json',root))),sourceFrames=asset.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16)));assert.equal(asset.width,32);assert.equal(asset.height,16);assert.equal(asset.palette.length,12);assert.equal(sourceFrames.length,7);assert.equal(new Set(sourceFrames.map(hash)).size,7);for(const pixels of sourceFrames){assert.equal(pixels.length,512);assert.ok(pixels.every(v=>v>=0&&v<=12));}sourceFrames.push(new Uint8Array(512));
 const modelProvenance=JSON.parse(await readFile(new URL('../magic-mirror-model/provenance.json',root)));assert.equal(hash(await readFile(new URL('../magic-mirror-model/'+modelProvenance.archive.file,root))),modelProvenance.archive.sha256);for(const f of modelProvenance.contents.files)assert.equal(hash(await readFile(new URL('../magic-mirror-model/'+f.file,root))),f.sha256);
 for(const s of asset.provenance)assert.equal(hash(await readFile(new URL('../../../'+s.file,root))),s.sha256);
 const npcOffset=0x24f000+134*5,enemyOffset=0x24f600+183*10;assert.deepEqual(Array.from(base.slice(npcOffset,npcOffset+5)),[168,161,144,115,0]);assert.deepEqual(Array.from(base.slice(enemyOffset,enemyOffset+10)),[168,161,144,143,0,0,232,12,12,0]);
 const headers=spriteHeaders(base),owns=h=>h.kind==='npc'&&h.id===127||h.kind==='enemy'&&h.id===183;for(const[field,value]of[[0,168],[1,161],[2,144]])assert.ok(headers.filter(h=>base[h.offset+field]===value).every(owns));
 const graphicsOffset=fileOffset(u24(base,0x242000+168*3)),assemblyOffset=fileOffset(u24(base,0x242300+161*3)),paletteOffset=0x240000+u16(base,0x242a00+144*2),old=decompress(base,graphicsOffset);for(let id=0;id<256;id++)if(id!==144)assert.notEqual(0x240000+u16(base,0x242a00+id*2),paletteOffset);
 const tiles=[new Uint8Array(32)],lookup=new Map([[Array(32).fill(0).join(','),0]]),assembly=base.slice(assemblyOffset,assemblyOffset+320),frames=[],frameAudit=[];
 for(let f=0;f<8;f++){
  const expected=new Uint8Array(96*96),source=sourceFrames[f];for(let y=0;y<16;y++)for(let x=0;x<32;x++)expected[(28+y)*96+40+x]=source[y*32+x];frames.push(expected);
  for(let cell=0;cell<4;cell++){
   const cx=signed(assembly[f*40+32+cell*2]),cy=signed(assembly[f*40+33+cell*2]),p=new Uint8Array(256);
   for(let y=0;y<16;y++)for(let x=0;x<16;x++){const xx=cx+48+x,yy=cy+64+y;if(xx>=0&&xx<96&&yy>=0&&yy<96)p[y*16+x]=expected[yy*96+xx];}
   for(let row=0;row<2;row++)for(let col=0;col<2;col++)put16(assembly,f*40+row*16+cell*4+col*2,internSpriteTile(tile4bpp(p,16,col*8,row*8),tiles,lookup));
  }
  frameAudit.push({frame:f,role:['boot spark','boot sweep','static A','static B','active A','active B','active C','blank'][f],sourcePixelSha256:hash(source),opaquePixels:expected.filter(Boolean).length,xy:Array.from({length:4},(_,i)=>[signed(assembly[f*40+32+i*2]),signed(assembly[f*40+33+i*2])])});
 }
 const graphics=Uint8Array.from(tiles.flatMap(t=>Array.from(t))),compressed=compress(graphics),palette=new Uint8Array(24);asset.palette.forEach((c,i)=>put16(palette,i*2,snesColor(c)));
 assert.ok(graphics.length<=old.bytes.length,`Display decoded budget ${graphics.length}/${old.bytes.length}`);
 for(let f=0;f<8;f++){
  assert.deepEqual(assembly.slice(f*40+32,f*40+40),base.slice(assemblyOffset+f*40+32,assemblyOffset+f*40+40));const reconstructed=new Uint8Array(96*96);
  for(let c=0;c<4;c++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const word=u16(assembly,f*40+(y>>3)*16+c*4+(x>>3)*2),tile=word&1023,tx=word&0x4000?7-(x&7):x&7;assert.ok(tile*32<graphics.length);assert.equal(word&0x8000,0);let v=0;for(let bit=0;bit<4;bit++)v|=(graphics[tile*32+(bit>>1)*16+(y&7)*2+(bit&1)]>>(7-tx)&1)<<bit;
   const xx=48+frameAudit[f].xy[c][0]+x,yy=64+frameAudit[f].xy[c][1]+y;if(v){assert.ok(xx>=0&&xx<96&&yy>=0&&yy<96);assert.ok(!reconstructed[yy*96+xx]||reconstructed[yy*96+xx]===v);reconstructed[yy*96+xx]=v;}
  }
  assert.deepEqual(reconstructed,frames[f],'Native display frame '+f);assert.equal(frames[f].some(Boolean),f!==7);
 }
 // The new compressed packet is larger than its old packet, so graphics
 // placement and its pointer update belong to the integrating allocator.
 // Never return an unsafe in-place graphics record over the following asset.
 return{base,asset,sourceFrames,frames,frameAudit,graphics,compressed,assembly,palette,requiresCompressedRelocation:compressed.length>old.length,original:{graphicsOffset,graphicsBytes:old.bytes.length,compressedBytes:old.length,assemblyOffset,assemblyBytes:320,paletteOffset},records:[{offset:assemblyOffset,bytes:assembly,label:'Draft Magic Mirror display frames'},{offset:paletteOffset,bytes:palette,label:'Draft Magic Mirror display palette'}]};
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){const c=await compileDisplayDraft();await writeFile(new URL('draft/graphics.4bpp',root),c.graphics);await writeFile(new URL('draft/graphics.ct-lz',root),c.compressed);await writeFile(new URL('draft/assembly.bin',root),c.assembly);await writeFile(new URL('draft/palette.bin',root),c.palette);
 const es=JSON.parse(await readFile(new URL('../../../.local/reference/events.json',root))),scenes=es.flatMap(e=>{const loads=e.commands.filter(([p,op,a])=>op===0x83&&a[0]===183||op===0x82&&a[0]===127);return loads.length?[{location:e.location,eventPointer:e.eventPointer,loads}]:[];}),ai=readEnemyAI(c.base,183),report={status:'Inactive source and native tile proof passed; see native-verification/manifest.json for emulator and scene scope',graphicsBytes:c.graphics.length,compressedBytes:c.compressed.length,assemblyBytes:c.assembly.length,tiles:c.graphics.length/32,original:c.original,graphicsSha256:hash(c.graphics),assemblySha256:hash(c.assembly),palette:c.asset.palette,frameAudit:c.frameAudit,headers:{enemy183:[168,161,144,143,0,0,232,12,12,0],npc127:[168,161,144,115,0]},animationPrograms:[115,143].map(id=>{const p=0x240000+u16(c.base,0x242600+id*2),q=0x240000+u16(c.base,0x242602+id*2);return{id,bytes:q-p,sha256:hash(c.base.slice(p,q))};}),ai:{id:183,offset:ai.start,bytes:ai.bytes,sha256:hash(c.base.slice(ai.start,ai.start+ai.bytes))},scenes,unchangedCellCoordinates:true,extraWramBytes:0,extraVramBytes:0,provenance:c.asset.provenance};await writeFile(new URL('draft/verification.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({graphicsBytes:c.graphics.length,compressedBytes:c.compressed.length,assemblyBytes:c.assembly.length,frames:8,blankFrames:1,original:c.original,sceneCount:scenes.length}));}
