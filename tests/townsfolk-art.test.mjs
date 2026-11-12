import test from 'node:test';
import assert from 'node:assert/strict';
import {build,assertStockActors} from './helpers.mjs';
import {storyBattleNames} from '../content/retained-boss-names.js';
import {townsfolkFamilies,customTownsfolkFamilies,stockTownsfolkFamilyKeys,townsfolk} from '../content/townsfolk.js';
import {storybookFamilies,customStorybookFamilies,stockStorybookFamilyKeys,storybookActors} from '../content/storybook-actors.js';
import {townsfolkSprite,patchTownsfolk} from '../engine/townsfolk.js';
import {patchStorybookActors} from '../engine/storybook-actors.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {spriteHeaders} from '../engine/native-sprites.js';
import {u16,u24} from '../engine/rom.js';
import {readEnemyAI} from '../engine/enemy-ai.js';

// The crowded ending scenes keep raw streams of these four stock banks.
const b=await build(),streamed=new Set([11,12,35,36]);

test('every townsfolk family, including the Kilwala and Hench, restores exact stock art, headers and names',()=>{
 assert.deepEqual(new Set(b.audit.townsfolk.stockRestored),stockTownsfolkFamilyKeys);
 assert.deepEqual(new Set(townsfolkFamilies.map(f=>f.key)),stockTownsfolkFamilyKeys);
 assert.equal(customTownsfolkFamilies.length,0);assert.deepEqual(b.audit.townsfolk.actors,[]);
 assertStockActors(b,townsfolk,{streamed});
 for(const id of[3,5,75]){
  for(const [table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+id*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride));}
  const ai=readEnemyAI(b.base,id);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  const animation=b.base[0x24f600+id*10+3];
  for(const table of[0x242600,0x242800]){const lo=0x240000+u16(b.base,table+animation*2),hi=0x240000+u16(b.base,table+(animation+1)*2);assert.deepEqual(b.rom.slice(lo,hi),b.base.slice(lo,hi));}
 }
 // Guy Fieri's relocated tier still shares the Kilwala's animation program.
 const guy=0x24f600+225*10;assert.deepEqual([...b.rom.slice(guy,guy+5)],[252,233,10,28,0]);
});

test('household residents, townswomen, bats and jugglers restore exact stock art, headers and names',()=>{
 assert.deepEqual(new Set(b.audit.storybook.stockRestored),stockStorybookFamilyKeys);
 assert.deepEqual(new Set(storybookFamilies.map(f=>f.key)),stockStorybookFamilyKeys);
 assert.equal(customStorybookFamilies.length,0);assert.deepEqual(b.audit.storybook.actors,[]);
 assertStockActors(b,storybookActors,{streamed,retainedNames:new Map(storyBattleNames.map(a=>[a.enemy,a.short]))});
});

test('shared stock assembly7 owners and the retired private assembly slots stay untouched',()=>{
 const base=spriteHeaders(b.base).filter(h=>b.base[h.offset+1]===7);assert.equal(base.length,26);
 // Only the accepted Bakery elder (NPC33) leaves assembly7, for private slot246.
 for(const h of base)assert.equal(b.rom[h.offset+1],h.kind==='npc'&&h.id===33?246:7,'original assembly7 owner '+h.kind+h.id);
 for(const id of[247,248])assert.equal(u24(b.rom,0x242300+id*3),u24(b.base,0x242300+id*3),'retired private assembly '+id+' remains unused');
 assert.ok(!b.records.some(r=>/private assembly selection/.test(r.label)&&/Townkeeper|Household/.test(r.label)));
 assert.ok(!b.audit.resources.reclaimedSprites.some(p=>p.field===1&&p.id===7),'Shared original assembly is not reclaimable');
});

test('the townsfolk and storybook patches emit nothing, while their retired sources still fail native guards',()=>{
 const writes=[],add=(offset,bytes,label)=>writes.push(label),allocate=()=>{throw Error('no allocation expected');};
 assert.deepEqual(patchTownsfolk(b.base,allocate,add,b.records,{}).actors,[]);
 assert.deepEqual(patchStorybookActors(b.base,allocate,add,b.records,{}).actors,[]);
 assert.deepEqual(writes,[]);
 for(const gfx of[81,83])assert.throws(()=>patchActorFamilies(b.base,townsfolkFamilies.filter(f=>f.gfx===gfx),townsfolkSprite,()=>0x300000,()=>{},b.records),/decoded graphics budget/);
});
