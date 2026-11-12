import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from './helpers.mjs';
import {u16,u24,put24} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {paradePaletteEvent,paradePalettes,paradeEventSource} from '../engine/parade-palettes.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {nativeSpriteBank} from '../scripts/native-sprite-view.mjs';
import {oamCells,locate,pixelProof} from './native-field-pixels.mjs';

const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex'),out='.local/qa/parade-palettes-'+sha256.slice(0,12);
const packet=rom=>decompress(rom,cartridgeOffset(u24(rom,0x3cf9f0+84*3),rom)).bytes;
await mkdir(out,{recursive:true});
test('parade correction changes only two native row operands and guards their owners',()=>{
 const source=packet(b.base),patched=paradePaletteEvent(source,80),diff=[];
 for(let p=0;p<source.length;p++)if(source[p]!==patched[p])diff.push(p);
 assert.deepEqual(diff,[3103,3193]);assert.equal(patched.length,source.length);assert.deepEqual([...patched.slice(3190,3194)],[0x82,215,0x33,0]);
 const actual=packet(b.rom);for(const c of paradePalettes.changes)assert.equal(actual[c.offset],c.to);
 for(const pos of[0,1715,1717,3100,3101,3103,3190,3191,3193]){const broken=source.slice();broken[pos]^=1;assert.throws(()=>paradePaletteEvent(broken,80),/signature/);}
 assert.equal(paradePaletteEvent(source,79),source);
 const colors=id=>{const p=0x240000+u16(b.rom,0x242a00+id*2);return b.rom.slice(p,p+24);};assert.deepEqual(colors(0),colors(138));assert.notDeepEqual(colors(133),colors(139));
 const alias=b.base.slice();put24(alias,0x3cf9f0+85*3,u24(alias,0x3cf9f0+84*3));assert.throws(()=>paradeEventSource(alias),/shared/);
 const moved=b.base.slice();moved[0x360008+80*14]^=1;assert.throws(()=>paradeEventSource(moved),/ownership/);
});

// NPC 220 is the Blind Mouse, who stands where the stock tradesman (NPC 39) drank.
for(const[key,visible]of[['parade-center',[0,220]],['resident-parade',[79]],['parade-east',[0]],['parade-granny-hidden',[0,220]]])test('parade displays original crowd colors with replacement actors: '+key,async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),loads=[];
 h.on('event.init',e=>{if(e.location===80&&e.opcode===0x82)loads.push({object:e.object,npc:s.ram[0x12002+e.scriptPC]});});
 try{
  const {townsfolkCheckpoints}=await import('../engine/townsfolk-checkpoints.js'),c=townsfolkCheckpoints[key];
  d.jump({id:80,x:c.x,y:c.y,facing:c.facing,townsfolkScene:key});runFrames(s,c.entryFrames);assert.equal(d.diagnostics().fatal,null);assert.equal(s.ppu.brightness,15);
  const objects=[];
  for(const a of loads){
   const p=0x24f023+a.npc*5,[gfx,asm,palette,,size]=b.rom.slice(p,p+5),row=s.ram[0xf81+a.object*2]>>1&7,offset=0x240000+u16(b.rom,0x242a00+palette*2),words=Array.from({length:12},(_,i)=>u16(b.rom,offset+i*2));
   assert.deepEqual([...s.ppu.cgram.slice(129+row*16,141+row*16)],words,'NPC '+a.npc+' native CGRAM matches its source palette');
   const frame=s.ram[0xf01+a.object*2];let proof;
   if(frame!==255){const bank=nativeSpriteBank(b.rom,{gfx,asm,palette,size,frames:frame+1}),match=locate(bank,frame,oamCells(s,words));if(match)proof=pixelProof(s,[match],words);}
   objects.push({...a,gfx,row,palette,frame,visibleExact:proof?.exact??0,occludedOrDifferent:proof?.mismatches??0});
  }
  for(const npc of visible)assert.ok(objects.some(a=>a.npc===npc&&a.visibleExact>100),'NPC '+npc+' is visible in its own intended colors');
  assert.deepEqual(s.cart.data,b.rom);await screenshot(s,out+'/'+key+'.png');await writeFile(out+'/'+key+'.json',JSON.stringify({sha256,key,objects,scope:'Actual native row allocation, CGRAM, OAM, VRAM and visible framebuffer pixels at the recorded post-parade checkpoint.'},null,2)+'\n');
 }finally{d.dispose();h.dispose();}
});
