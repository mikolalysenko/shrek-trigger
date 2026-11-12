import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from './helpers.mjs';
import {u16,u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {decompress} from '../engine/compression.js';
import {fairTownkeeperEvent,fairTownkeepers} from '../engine/fair-townkeepers.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {nativeSpriteBank} from '../scripts/native-sprite-view.mjs';
import {oamCells,locate,pixelProof} from './native-field-pixels.mjs';
import {townsfolkCheckpoints} from '../engine/townsfolk-checkpoints.js';

const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex'),out='.local/qa/fair-palettes-'+sha256.slice(0,12);
const packet=rom=>decompress(rom,cartridgeOffset(u24(rom,0x3cf9f0+27*3),rom)).bytes;
await mkdir(out,{recursive:true});
test('fair uses the existing compatible merchant variant in all three original event objects',()=>{
 const source=packet(b.base),patched=fairTownkeeperEvent(source,5),diff=[];
 for(let p=0;p<source.length;p++)if(source[p]!==patched[p])diff.push(p);
 assert.deepEqual(diff,fairTownkeepers.operands);const actual=packet(b.rom);
 for(const p of diff){assert.equal(patched[p],89);assert.equal(actual[p],89);const broken=source.slice();broken[p]=49;assert.throws(()=>fairTownkeeperEvent(broken,5),/signature/);}
 for(const object of fairTownkeepers.objects){const broken=source.slice();broken[1+object*32]^=1;assert.throws(()=>fairTownkeeperEvent(broken,5),/signature/);}
 assert.equal(fairTownkeeperEvent(source,6),source);
 const header=id=>[...b.rom.slice(0x24f023+id*5,0x24f028+id*5)];assert.deepEqual(header(22),[11,7,9,7,0]);assert.deepEqual(header(89),[11,7,133,7,0]);
});

for(const key of['keeper-fair','keeper-fair-west','keeper-fair-south'])test('fair merchant and racers retain intended native colors with a full party: '+key,async()=>{
 const s=await bedroom(b.rom),failed=[],loads=[],points=[{name:'palette.alloc.failed',address:0xc072b2,expected:[0x18,0x60]}];
 const h=installHooks(s,[...JSON.parse(await readFile('content/hooks.json')),...points]),d=createDevTools(s,h);
 h.on('palette.alloc.failed',e=>{if(e.location===5)failed.push(e);});h.on('event.init',e=>{if(e.location===5&&e.opcode===0x82)loads.push({object:e.object,npc:s.ram[0x12002+e.scriptPC]});});
 try{
  const cfg=townsfolkCheckpoints[key];d.jump({id:5,x:cfg.x,y:cfg.y,facing:0,townsfolkScene:key});runFrames(s,cfg.entryFrames);if(key==='keeper-fair')runFrames(s,60,64);runFrames(s,180);
  assert.equal(d.diagnostics().fatal,null);assert.equal(u16(s.ram,0x100),5);assert.equal(s.ppu.brightness,15);assert.deepEqual(failed,[]);
  for(const object of fairTownkeepers.objects)assert.ok(loads.some(a=>a.object===object&&a.npc===89),'Original merchant object '+object+' loads compatible variant');
  const actors=[];
  for(let object=0;object<s.ram[0x12000];object++){
   const p=object*2,frame=s.ram[0xf01+p];if(!(s.ram[0xf00+p]&128)||s.ram[0x1a81+p]===0||s.ram[0x1a81+p]>=128||frame===255)continue;
   const pointer=u16(s.ram,0x1400+p),row=s.ram[0xf81+p]>>1&7,words=Array.from({length:12},(_,i)=>u16(b.rom,0x240000+pointer+i*2));
   assert.deepEqual([...s.ppu.cgram.slice(129+row*16,141+row*16)],words,'Fair visible actor '+object+' colors');actors.push({object,frame,palettePointer:pointer,row});
  }
  const object=cfg.object??16,frame=s.ram[0xf01+object*2],bank=nativeSpriteBank(b.rom,{gfx:11,asm:7,palette:133,size:0,frames:19}),words=Array.from({length:12},(_,i)=>u16(b.rom,0x240000+u16(b.rom,0x242a00+133*2)+i*2));
  const tile=u16(s.ram,0xd00+object*2),match=locate(bank,frame,oamCells(s,words).filter(c=>[tile,tile+2,tile+4,tile+6].includes(c.tile)));assert.ok(match,'This fair merchant’s own VRAM tiles are actually on screen');const pixels=pixelProof(s,[match],words);assert.ok(pixels.exact>100);
  assert.deepEqual(s.cart.data,b.rom);await screenshot(s,out+'/'+key+'.png');await writeFile(out+'/'+key+'.json',JSON.stringify({sha256,key,loads,failed,actors,merchant:{object,frame,row:match.cells[0].palette,visibleExact:pixels.exact,occludedOrDifferent:pixels.mismatches}},null,2)+'\n');
 }finally{d.dispose();h.dispose();}
});
