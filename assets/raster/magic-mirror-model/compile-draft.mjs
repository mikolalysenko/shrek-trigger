import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {compileSpriteFrames,mergeSpriteBanks,spriteHeaders} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {u16,u24,put16,fileOffset,validateRom} from '../../../engine/rom.js';
import {snesColor} from '../../../engine/sprites.js';
import {readEnemyAI} from '../../../engine/enemy-ai.js';
const root=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
export async function compileMirrorDraft(){
 const base=await validateRom(await readFile(new URL('../../../.local/chrono-trigger-usa.sfc',root))),asset=JSON.parse(await readFile(new URL('draft/preview-raster.json',root))),provenance=JSON.parse(await readFile(new URL('provenance.json',root)));
 assert.equal(hash(await readFile(new URL(provenance.archive.file,root))),provenance.archive.sha256);for(const f of provenance.contents.files)assert.equal(hash(await readFile(new URL(f.file,root))),f.sha256);
 for(const f of asset.provenance)assert.equal(hash(await readFile(new URL('../../../'+f.file,root))),f.sha256);
 assert.equal(asset.width,48);assert.equal(asset.height,96);assert.equal(asset.palette.length,12);
 const pixels=Uint8Array.from(asset.frames[0],c=>parseInt(c,16)),blank=new Uint8Array(pixels.length),main=new Uint8Array(pixels.length),trim=new Uint8Array(pixels.length);assert.ok(pixels.every(v=>v<=12));
 for(let y=0;y<96;y++)for(let x=0;x<48;x++){const p=y*48+x;if(x>=8&&x<40)main[p]=pixels[p];else if(y>=16&&y<80)trim[p]=pixels[p];else assert.equal(pixels[p],0,'Native cell union covers every source pixel');}
 const actors=[
  {key:'magic-mirror-main',enemy:190,gfx:213,asm:206,palette:232,animation:173,size:2,width:48,height:96,frames:2,anchor:[0,48],header:[213,206,232,173,2,0,224,12,12,0],pixels:main,cellOrigins:Array.from({length:12},(_,i)=>[8+i%2*16,Math.floor(i/2)*16])},
  {key:'magic-mirror-trim',enemy:191,gfx:213,asm:207,palette:232,animation:173,size:33,width:48,height:96,frames:2,anchor:[0,48],header:[213,207,232,173,33,0,32,12,12,0],pixels:trim,cellOrigins:Array.from({length:8},(_,i)=>[i%2*32,16+Math.floor(i/2)*16])}
 ];
 const headers=spriteHeaders(base),owns=h=>h.kind==='enemy'&&[190,191].includes(h.id),paletteOffset=0x240000+u16(base,0x242a00+232*2),gfxOffset=fileOffset(u24(base,0x242000+213*3)),old=decompress(base,gfxOffset);
 for(const[field,values]of[[0,[213]],[1,[206,207]],[2,[232]]])assert.ok(headers.filter(h=>values.includes(base[h.offset+field])).every(owns),'Resource has unrelated owners');
 for(let id=0;id<256;id++)if(id!==232)assert.notEqual(0x240000+u16(base,0x242a00+id*2),paletteOffset,'Private palette pointer');
 const banks=actors.map(a=>{assert.deepEqual(Array.from(base.slice(0x24f600+a.enemy*10,0x24f600+a.enemy*10+10)),a.header);return compileSpriteFrames([a.pixels,blank],a);}),merged=mergeSpriteBanks(banks),packed=compress(merged.graphics),palette=new Uint8Array(24);asset.palette.forEach((c,i)=>put16(palette,i*2,snesColor(c)));
 assert.ok(merged.graphics.length<=old.bytes.length);assert.ok(packed.length<=old.length);const records=[{offset:gfxOffset,bytes:packed,label:'Draft Magic Mirror compressed graphics'},{offset:paletteOffset,bytes:palette,label:'Draft Magic Mirror isolated palette'}];
 for(const[aIndex,a]of actors.entries()){
  const assembly=merged.assemblies[aIndex],cells=a.cellOrigins.length,stride=cells*10,offset=fileOffset(u24(base,0x242300+a.asm*3)),end=Math.min(...Array.from({length:256},(_,id)=>fileOffset(u24(base,0x242300+id*3))).filter(p=>p>offset));assert.equal(assembly.length,end-offset);
  for(let c=0;c<cells;c++)assembly[cells*8+c*2+1]=(assembly[cells*8+c*2+1]+48)&255;
  // Keep the original empty frame's geometry as well as its transparent tiles.
  assembly.set(base.slice(offset+stride+cells*8,offset+stride*2),stride+cells*8);
  for(let frame=0;frame<2;frame++)for(let group=0;group<(a.size&2?3:1);group++)for(let row=0;row<2;row++)for(let cell=0;cell<(a.size&1?8:4);cell++)for(let col=0;col<2;col++){
   const c=group*(a.size&1?8:4)+cell,[x,y]=a.cellOrigins[c],word=u16(assembly,frame*stride+group*(a.size&1?8:4)*8+row*(a.size&1?8:4)*4+cell*4+col*2),tile=word&1023;assert.equal(word&0x8000,0);assert.ok(tile*32<merged.graphics.length);
   for(let py=0;py<8;py++)for(let px=0;px<8;px++){const tx=word&0x4000?7-px:px;let v=0;for(let bit=0;bit<4;bit++)v|=(merged.graphics[tile*32+(bit>>1)*16+py*2+(bit&1)]>>(7-tx)&1)<<bit;assert.equal(v,frame?0:a.pixels[(y+row*8+py)*48+x+col*8+px]);}
  }
  a.assemblyOffset=offset;a.assemblyBytes=assembly.length;records.push({offset,bytes:assembly,label:'Draft '+a.key+' assembly'});
 }
 for(let i=0;i<pixels.length;i++){assert.equal(main[i]&&trim[i],0);assert.equal(main[i]||trim[i],pixels[i]);}
 return{base,asset,pixels,actors,graphics:merged.graphics,compressed:packed,assemblies:merged.assemblies,palette,records,original:{graphicsOffset:gfxOffset,graphicsBytes:old.bytes.length,compressedBytes:old.length,paletteOffset}};
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 const c=await compileMirrorDraft();await writeFile(new URL('draft/graphics.4bpp',root),c.graphics);await writeFile(new URL('draft/graphics.ct-lz',root),c.compressed);await writeFile(new URL('draft/main-assembly.bin',root),c.assemblies[0]);await writeFile(new URL('draft/trim-assembly.bin',root),c.assemblies[1]);await writeFile(new URL('draft/palette.bin',root),c.palette);
 const colors=c.asset.palette.map(s=>[0,2,4].map(i=>{const n=parseInt(s.slice(i,i+2),16)>>3;return n<<3|n>>2;})),image=new PNG({width:48*4*3,height:96*4});
 for(const[k,p]of[c.pixels,c.actors[0].pixels,c.actors[1].pixels].entries())for(let y=0;y<96;y++)for(let x=0;x<48;x++)if(p[y*48+x])for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++)image.data.set([...colors[p[y*48+x]-1],255],((y*4+yy)*image.width+k*48*4+x*4+xx)*4);
 await writeFile(new URL('draft/compound-review-4x.png',root),PNG.sync.write(image));
 const actors=c.actors.map(({pixels,...a})=>{const ai=readEnemyAI(c.base,a.enemy);return{...a,opaquePixels:pixels.filter(Boolean).length,ai:{offset:ai.start,bytes:ai.bytes,sha256:hash(c.base.slice(ai.start,ai.start+ai.bytes))}};});
 const report={status:'Inactive source and compound tile proof passed; native emulator proof pending',dimensions:[48,96],opaqueColors:12,palette:c.asset.palette,nativeVisibleFrames:2,nativeBlankFrames:2,original:c.original,graphicsBytes:c.graphics.length,compressedBytes:c.compressed.length,tiles:c.graphics.length/32,assemblyBytes:c.assemblies.map(a=>a.length),graphicsSha256:hash(c.graphics),pixelsSha256:hash(c.pixels),actors,scene:{location:268,eventPointer:3891788,main:{loadOffset:3839,enemySlotByte:131,positionCommand:[141,2560,1776]},trim:{loadOffset:3872,enemySlotByte:137,positionCommand:[141,2560,1776]},display:{enemy:183,count:3,npcAlias:127,status:'Original resources retained; distinct art gap',gfx:168,asm:161,palette:144,animation:143,size:0,frames:8,graphicsBytes:960,compressedBytes:457}},memory:{extraWramBytes:0,extraVramBytes:0,extraNativeCells:0,extraFrameIds:0},provenance:c.asset.provenance};
 await writeFile(new URL('draft/verification.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({graphicsBytes:report.graphicsBytes,compressedBytes:report.compressedBytes,tiles:report.tiles,assemblyBytes:report.assemblyBytes,pixelsSha256:report.pixelsSha256}));
}
