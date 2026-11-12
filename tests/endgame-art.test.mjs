import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,assertSpriteGraphicsStorage,needsSourceImages} from './helpers.mjs';
import {endgameFamilies} from '../content/endgame-actors.js';
import {endgameSprite} from '../engine/endgame-art.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {patchCosmicInterior} from '../engine/cosmic-interior.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {finalePalette} from '../engine/finale.js';
import {snesColor} from '../engine/sprites.js';

const b=await build(),frozen=async name=>new Uint8Array(await readFile('assets/imagegen/'+name));
const decode=(rom,table,id=0)=>decompress(rom,cartridgeOffset(u24(rom,table+id*3),rom)).bytes;

test('late-game actors and oven packets reproduce the visually approved native source bytes',{skip:needsSourceImages},async()=>{
 for(const[gfx,asm,graphicsFile,assemblyFile]of[
  [143,137,'rumpelstiltskin-wishworks/compiled/gfx143.4bpp','rumpelstiltskin-wishworks/compiled/asm137.bin'],
  [216,209,'rumpelstiltskin-wishworks/compiled/gfx216.4bpp','rumpelstiltskin-wishworks/compiled/asm209.bin'],
  [161,153,'godmother-giant/face/graphics.4bpp','godmother-giant/face/assembly.bin'],
  [162,154,'godmother-giant/hands/graphics.4bpp','godmother-giant/hands/assembly.bin'],
  [208,201,'cosmic-muffin-interior/arms-draft/shared.4bpp','cosmic-muffin-interior/arms-draft/assembly201.bin'],
  [209,202,'cosmic-muffin-interior/arms-draft/shared.4bpp','cosmic-muffin-interior/arms-draft/assembly202.bin']
 ]){
  assert.deepEqual(decode(b.rom,0x242000,gfx),await frozen(graphicsFile),'approved graphics '+gfx);
  const assembly=await frozen(assemblyFile),p=cartridgeOffset(u24(b.rom,0x242300+asm*3),b.rom);assert.deepEqual(b.rom.slice(p,p+assembly.length),assembly,'approved assembly '+asm);
 }
 for(const id of[181,182])assert.deepEqual(decode(b.rom,0x362220,id),await frozen('cosmic-muffin-interior/body-draft/bg'+id+'.4bpp'));
 assert.deepEqual(decode(b.rom,0x362220,22),await frozen('cosmic-muffin-interior/pulse-draft/bg22.4bpp'));
 assert.deepEqual(decode(b.rom,0x362100,46),await frozen('cosmic-muffin-interior/body-draft/tileset46.bin'));
 assert.equal(u24(b.rom,0x242000+208*3),u24(b.rom,0x242000+209*3),'arms share one compressed packet');
 const reveal=b.audit.tysonReveal,revealAssembly=new Uint8Array(await readFile('assets/raster/tyson-reveal/draft/assembly.bin'));
 assert.deepEqual(decode(b.rom,0x242000,238),new Uint8Array(await readFile('assets/raster/tyson-reveal/draft/graphics.4bpp')));
 assert.deepEqual(b.rom.slice(reveal.assemblyOffset,reveal.assemblyOffset+reveal.assemblyBytes),revealAssembly);
 for(const a of [...b.audit.endgame.actors,...b.audit.cosmicMuffin.interior.actors,reveal])assertSpriteGraphicsStorage(b,a);
 assert.equal(b.audit.endgame.extraWramBytes,0);assert.equal(b.audit.cosmicMuffin.interior.extraVramBytes,0);
});

test('native combat, shared placeholders, pulse programs and unrelated scenery remain exact',()=>{
 for(const a of [...b.audit.endgame.actors,...b.audit.cosmicMuffin.interior.actors,b.audit.tysonReveal,{enemy:203,animation:177}]){
  const h=0x24f600+a.enemy*10;assert.deepEqual(b.rom.slice(h,h+10),b.base.slice(h,h+10),'header '+a.enemy);
  for(const[table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride),'stats and rewards '+a.enemy);}
  const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  for(const table of [0x242600,0x242800]){const start=0x240000+u16(b.base,table+a.animation*2),end=0x240000+u16(b.base,table+(a.animation+1)*2);assert.deepEqual(b.rom.slice(start,end),b.base.slice(start,end));}
 }
 for(const id of[177,178])assert.deepEqual(b.rom.slice(0xc6500+id*11,0xc650b+id*11),b.base.slice(0xc6500+id*11,0xc650b+id*11),'hands retain blank names');
 for(const id of[192,234,235]){const p=0x240000+u16(b.base,0x242a00+id*2);assert.deepEqual(b.rom.slice(p,p+24),b.base.slice(p,p+24),'original palette '+id);}
 const finaleColors=0x240000+u16(b.rom,0x242a00+233*2);assert.deepEqual(Array.from({length:12},(_,i)=>u16(b.rom,finaleColors+i*2)),finalePalette.map(snesColor),'accepted shared Tyson palette');
 assert.deepEqual(decode(b.rom,0x242000,167),decode(b.base,0x242000,167),'shared heart placeholder');
 const placeholder=fileOffset(u24(b.base,0x242300+159*3));assert.deepEqual(b.rom.slice(placeholder,placeholder+80),b.base.slice(placeholder,placeholder+80));
 assert.deepEqual(b.rom.slice(0x3df310,0x3df9c0),b.base.slice(0x3df310,0x3df9c0),'all original background animation program bytes');
 for(const id of[3,10,18,46,51])assert.deepEqual(b.rom.slice(0x3df290+id*2,0x3df292+id*2),b.base.slice(0x3df290+id*2,0x3df292+id*2),'shared pulse consumer pointer');
 const pulse=decode(b.rom,0x362220,22),old=decode(b.base,0x362220,22);
 assert.deepEqual(pulse.slice(0,116*32),old.slice(0,116*32));assert.deepEqual(pulse.slice(164*32),old.slice(164*32));
 for(const id of[174,183,184,185])assert.deepEqual(decode(b.rom,0x362220,id),decode(b.base,0x362220,id),'interior cave graphics '+id);
 assert.deepEqual(b.rom.slice(0x361e00+32*3,0x361e00+33*3),b.base.slice(0x361e00+32*3,0x361e00+33*3),'map/collision pointer');
 assert.deepEqual(b.rom.slice(0x3624c0+56*210,0x3624c0+56*210+180),b.base.slice(0x3624c0+56*210,0x3624c0+56*210+180),'six cave palette slots');
});

test('new native families reject unknown owners, palette aliases and missing stream selections',()=>{
 const stream=new Set([143,161,208,209,216]),run=base=>patchActorFamilies(base,endgameFamilies,endgameSprite,()=>0x300000,()=>{},b.records,{streamedGraphics:stream});
 assert.doesNotThrow(()=>run(b.base));
 const bad=b.base.slice();bad[0x24f600]=161;assert.throws(()=>run(bad),/another owner/);
 const alias=b.base.slice();alias.set(alias.slice(0x242a00+205*2,0x242a02+205*2),0x242a00+200*2);assert.throws(()=>run(alias),/aliased/);
 for(const gfx of[143,161,216])assert.throws(()=>patchActorFamilies(b.base,endgameFamilies.filter(f=>f.gfx===gfx),endgameSprite,()=>0x300000,()=>{},b.records),/decoded graphics budget/);
 const oven=(base,streamedGraphics=stream)=>patchCosmicInterior(base,()=>0x300000,()=>{},{streamedGraphics});
 assert.doesNotThrow(()=>oven(b.base));assert.throws(()=>oven(b.base,new Set([208])),/both arms/);
 const other=b.base.slice();other[0x24f600]=209;assert.throws(()=>oven(other),/another owner/);
 const palette=b.base.slice();palette[0x360003]=56;assert.throws(()=>oven(palette),/palette owner/);
});
