import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {swampCreatures} from '../content/swamp-creatures.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('ordinary swamp creatures restore their stock bank and preserve native combat behavior',()=>{
 assert.deepEqual(b.audit.swampCreatures,{actors:[],stockRestored:['swamp-dozers'],extraVramBytes:0,extraWramBytes:0});
 const gp=0x242000+99*3,ap=0x242300+58*3;assert.equal(u24(b.rom,gp),u24(b.base,gp));assert.equal(u24(b.rom,ap),u24(b.base,ap));
 assert.deepEqual(decompress(b.rom,cartridgeOffset(u24(b.rom,gp),b.rom)).bytes,decompress(b.base,fileOffset(u24(b.base,gp))).bytes);
 const assembly=fileOffset(u24(b.base,ap));assert.deepEqual(b.rom.slice(assembly,assembly+24*40),b.base.slice(assembly,assembly+24*40));
 for(const a of swampCreatures){
  const h=0x24f600+a.enemy*10;assert.deepEqual(b.rom.slice(h,h+10),b.base.slice(h,h+10));
  for(const[table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride));}
  const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  const start=0x240000+u16(b.base,0x242600+a.animation*2),end=0x240000+u16(b.base,0x242602+a.animation*2);assert.deepEqual(b.rom.slice(start,end),b.base.slice(start,end));
 }
 const h=0x24f600+229*10;assert.deepEqual([...b.rom.slice(h,h+3)],[252,237,250],'Guy Fieri retains his independent master-tier resources');
});

test('all 48 stock swamp-creature poses upload through the native four-cell loader',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),original=s.cart.data.slice();
 for(const a of swampCreatures){
  d.previewActor(a.key);runFrames(s,300);assert.equal(u16(s.ram,0x141e),u16(b.rom,0x242a00+a.palette*2));
  const gfx=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+a.gfx*3),b.rom)).bytes,asm=cartridgeOffset(u24(b.rom,0x242300+a.asm*3),b.rom);
  for(let f=0;f<a.frames;f++){
   d.previewFrame(f);runFrames(s,32);assert.equal(s.ram[0xf1f],f);
   const expected=[];for(let i=0;i<16;i++){const t=u16(b.rom,asm+f*40+i*2);for(let v of gfx.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}expected.push(v);}}
   const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer);assert.deepEqual(Uint8Array.from([0,512].flatMap(o=>[...v.slice(base+o,base+o+256)])),Uint8Array.from(expected),a.key+':'+f);
  }
  d.previewFrame(3);runFrames(s,32);await screenshot(s,`.local/qa/${a.key}-native.png`);
 }
 assert.deepEqual(s.cart.data,original);d.undo();assert.equal(u16(s.ram,256),2);d.dispose();h.dispose();
});
