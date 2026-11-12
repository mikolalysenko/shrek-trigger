import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {faygoItems,faygoActors} from '../content/faygo.js';
import {faygoPickups} from '../content/faygo-pickups.js';
import {faygoBottle} from '../engine/faygo-art.js';
import {encode,encodeDialogue,encodeName} from '../engine/text.js';
import {put16,u16,u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {snesColor} from '../engine/sprites.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {rasterArt,rasterArtInfo} from '../engine/raster-art.js';
const b=await build();

test('all three native stat items are colored Faygo with their original gains, caps and inventory behavior',()=>{
 assert.deepEqual(faygoItems.map(i=>[i.id,i.color,i.stat]),[[205,'orange','Beef'],[206,'blue','Mojo'],[207,'red','Zoom']]);
 for(const item of faygoItems){
  const p=0xc0b5e+item.id*11;assert.equal(b.rom[p],b.base[p]);assert.deepEqual(b.rom.slice(p+1,p+11),encodeName(item.short,{length:10}));
  const desc=0xc0000+u16(b.rom,0xc2eb1+item.id*2),text=encodeDialogue(item.description+'{null}',b.base);assert.deepEqual(b.rom.slice(desc,desc+text.length),text);
  for(const[start,size]of[[0xc05cc,4],[0xc0abc,3]]){const at=start+(item.id-188)*size;assert.deepEqual(b.rom.slice(at,at+size),b.base.slice(at,at+size));}
 }
 assert.deepEqual(b.rom.slice(0x2b2a7,0x2b347),b.base.slice(0x2b2a7,0x2b347),'stat gain, cap and consumption code');
 assert.equal(b.audit.faygo.graphicsBytes,160);assert.equal(b.audit.faygo.assemblyBytes,200);assert.equal(b.audit.faygo.extraVramBytes,0);assert.equal(b.audit.faygo.extraWramBytes,0);
 assert.deepEqual(b.audit.faygo.rasterCoverage,{rasterFrames:15,proceduralFrames:0,blankFrames:0,sources:rasterArtInfo('faygo-orange').provenance});
 for(const a of faygoActors){const info=rasterArtInfo(a.key);assert.equal(info.sourceType,'image-generation');assert.deepEqual(info.palette,a.colors);assert.equal(info.sequences.native[1].length,5);for(let f=0;f<5;f++)assert.deepEqual(rasterArt(a.key,{pose:'native',facing:1,phase:f}),faygoBottle(a.color));}
 const original=0x24f000+119*5;assert.deepEqual(b.rom.slice(original,original+5),b.base.slice(original,original+5),'generic sparkle header');
});

test('the cartridge selects all 36 bottle pickups by location and object, preserving field CPU state and other sparkles',async()=>{
 const s=await createCore(b.rom),cases=[...faygoPickups.map(([l,o,i])=>[l,o,112,236+i-205]),...faygoPickups.map(([l,o])=>[l,o,111,111]),[4,12,112,112],[8,26,112,112],[148,13,112,112],[173,12,112,112],[438,25,112,112],[511,63,112,112]];
 for(const[loc,obj,npc,expected]of cases){
  const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.c=true;c.cyclesLeft=0;c.r[0]=0;c.r[1]=0xc0;c.br[4]=0x4595;c.br[5]=0x100;c.br[3]=0x7ff;c.br[0]=0x2000;c.br[1]=obj*2;c.br[2]=0x3789;
  put16(s.ram,0x100,loc);put16(s.ram,0x16d,obj*2);s.ram[0x1101+obj*2]=npc;s.write(0x4202,npc);
  let n=0;while(c.br[4]!==0x459a||c.r[1]!==0xc0){c.cycle();assert.ok(n++<20000,'selector returned');}
  assert.equal(s.ram[0x1101+obj*2],expected,loc+':'+obj);assert.equal(s.read(0x4216)|s.read(0x4217)<<8,expected*5);
  assert.equal(c.br[0],0x2005);assert.equal(c.br[1],obj*2);assert.equal(c.br[2],0x3789);assert.equal(c.br[3],0x7ff);assert.equal(c.br[5],0x100);assert.equal(c.r[0],0);assert.equal(c.c,true);assert.equal(c.m,true);assert.equal(c.x,false);
 }
});

test('orange, blue and red bottles upload their exact native pixels and private colors in all five frame slots',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json')),s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),original=s.cart.data.slice();
 for(const a of faygoActors){
  d.previewActor(a.key);runFrames(s,300);
  const gfx=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+a.gfx*3),b.rom)).bytes,asm=cartridgeOffset(u24(b.rom,0x242300+a.asm*3),b.rom);
  for(let f=0;f<5;f++){
   d.previewFrame(f);runFrames(s,20);assert.equal(s.ram[0xf1f],f);assert.equal(u16(s.ram,0x141e),u16(b.rom,0x242a00+a.palette*2));
   const expected=[];for(let i=0;i<16;i++){const t=u16(b.rom,asm+f*40+i*2);for(let v of gfx.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}expected.push(v);}}
   const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer);assert.deepEqual(Uint8Array.from([0,512].flatMap(o=>[...v.slice(base+o,base+o+256)])),Uint8Array.from(expected));
   const colors=a.colors.map(snesColor);assert.ok(Array.from({length:5},(_,i)=>129+i*16).some(p=>colors.every((c,k)=>s.ppu.cgram[p+k]===c)));
  }
  assert.ok(faygoBottle().every(v=>v<=12));await screenshot(s,`.local/qa/${a.key}-native.png`);assert.equal(d.diagnostics().fatal,null);d.undo();
 }
 assert.deepEqual(s.cart.data,original);d.dispose();h.dispose();
});
