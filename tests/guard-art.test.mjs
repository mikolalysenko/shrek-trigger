import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,assertSpriteGraphicsStorage,needsSourceImages} from './helpers.mjs';
import {nativeGuardFamilies} from '../content/native-guards.js';
import {nativeGuardSprite} from '../engine/native-guard-art.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {spriteHeaders} from '../engine/native-sprites.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {u16,u24,fileOffset} from '../engine/rom.js';

const b=await build();
const banks=[
 {gfx:78,asm:33,frames:26,cells:4,dir:'native-guards/draft'}
];

test('Duloc guards reproduce the complete frozen native bank',{skip:needsSourceImages},async()=>{
 for(const a of banks){
  const root='assets/imagegen/'+a.dir+'/',graphics=new Uint8Array(await readFile(root+(a.graphics??'graphics.4bpp'))),assembly=new Uint8Array(await readFile(root+(a.assembly??'assembly.bin')));
  const address=u24(b.rom,0x242000+a.gfx*3),p=cartridgeOffset(address,b.rom),q=fileOffset(u24(b.rom,0x242300+a.asm*3));
  assert.deepEqual(decompress(b.rom,p).bytes,graphics,'All accepted source pixels '+a.gfx);
  assert.equal(assembly.length,a.frames*a.cells*10);assert.deepEqual(b.rom.slice(q,q+assembly.length),assembly,'Native anchors and complete poses '+a.gfx);
  assert.ok(address<0x800000,'the streamed guard packet uses owned extended storage');
  const stream=b.audit.resources.npcGraphicsStreaming.streams.find(s=>s.gfx===a.gfx);assert.ok(stream);
  assert.deepEqual(b.rom.slice(stream.address,stream.address+graphics.length),graphics);
 }
});

test('all shared guard owners keep their animation programs, battle rules and palettes',()=>{
 assert.equal(b.audit.guards.extraVramBytes,0);assert.equal(b.audit.guards.extraWramBytes,0);
 // The sewer trolls (82) and frogs (98) are stock again; their headers stay original.
 const actors=b.audit.guards.actors;assert.deepEqual(actors.map(a=>a.key),['duloc-civic-guard','spectral-sentry']);
 const owners=spriteHeaders(b.rom).filter(h=>[78,82,98].includes(b.rom[h.offset]));
 assert.deepEqual(owners.map(h=>[h.kind,h.id]),[['npc',75],...['enemy'].flatMap(kind=>[4,49,50,76,77,78,79,145,238].map(id=>[kind,id]))]);
 for(const h of owners)assert.deepEqual(b.rom.slice(h.offset,h.offset+5),b.base.slice(h.offset,h.offset+5),'Original native header '+h.id);
 for(const a of actors){
  assertSpriteGraphicsStorage(b,a);
  for(const [table,stride]of [[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride));}
  const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  const lo=0x240000+u16(b.base,0x242600+a.animation*2),hi=0x240000+u16(b.base,0x242602+a.animation*2);assert.deepEqual(b.rom.slice(lo,hi),b.base.slice(lo,hi));
 }
 for(const id of[14,15]){const p=0x240000+u16(b.base,0x242a00+id*2);assert.deepEqual(b.rom.slice(p,p+24),b.base.slice(p,p+24));}
 const guy=0x24f600+224*10;assert.deepEqual([...b.rom.slice(guy,guy+4)],[252,232,7,94],'Guy Fieri retains his private art and shared original scheduler');
});

test('guard source ownership and explicit decoded stream selection remain mandatory',()=>{
 const run=(base,families=nativeGuardFamilies,streamedGraphics=new Set([78]))=>patchActorFamilies(base,families,nativeGuardSprite,()=>0x300000,()=>{},b.records,{streamedGraphics});
 assert.doesNotThrow(()=>run(b.base));
 const incomplete=structuredClone(nativeGuardFamilies);incomplete[0].actors[0].npcs=[];assert.throws(()=>run(b.base,incomplete),/another owner/);
 const bad=b.base.slice();bad[0x24f600]=78;assert.throws(()=>run(bad),/another owner/);
 assert.throws(()=>run(b.base,nativeGuardFamilies,new Set()),/decoded graphics budget/);
});
