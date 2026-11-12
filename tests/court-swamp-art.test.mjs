import test from 'node:test';
import assert from 'node:assert/strict';
import {build,assertStockActors} from './helpers.mjs';
import {courtPalaceFamilies,courtPalaceActors,customCourtPalaceFamilies,stockCourtPalaceFamilyKeys} from '../content/court-palace.js';
import {swampImpFamilies} from '../content/swamp-imps.js';
import {courtPalaceSprite} from '../engine/court-palace-art.js';
import {compileSwampImpFamily} from '../engine/swamp-imp-art.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {spriteHeaders} from '../engine/native-sprites.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {readEnemyAI} from '../engine/enemy-ai.js';

const b=await build();

test('the court officer and Mage restore exact stock art, headers and names',()=>{
 assert.deepEqual(new Set(b.audit.courtPalace.stockRestored),stockCourtPalaceFamilyKeys);
 assert.equal(customCourtPalaceFamilies.length,0);assert.deepEqual(b.audit.courtPalace.actors,[]);
 assertStockActors(b,courtPalaceActors);
});

test('ordinary swamp imps, rollers and riders restore every stock bank and owner',()=>{
 assert.deepEqual(b.audit.swampImps,{actors:[],stockRestored:['swamp-imps'],extraVramBytes:0,extraWramBytes:0});
 const gp=0x242000+86*3;assert.equal(u24(b.rom,gp),u24(b.base,gp));assert.deepEqual(decompress(b.rom,cartridgeOffset(u24(b.rom,gp),b.rom)).bytes,decompress(b.base,fileOffset(u24(b.base,gp))).bytes);
 for(const [asm,frames,cells]of[[43,28,4],[63,26,4],[65,29,8]]){const ap=0x242300+asm*3;assert.equal(u24(b.rom,ap),u24(b.base,ap));const p=fileOffset(u24(b.base,ap));assert.deepEqual(b.rom.slice(p,p+frames*cells*10),b.base.slice(p,p+frames*cells*10));}
 const owners=spriteHeaders(b.base).filter(h=>b.base[h.offset]===86);assert.deepEqual(owners.map(h=>[h.kind,h.id]),[['npc',78],...[12,13,14,15,16,17,18,19,242].map(id=>['enemy',id])]);
 for(const h of owners)assert.deepEqual(b.rom.slice(h.offset,h.offset+(h.kind==='enemy'?10:5)),b.base.slice(h.offset,h.offset+(h.kind==='enemy'?10:5)));
});

test('all shared owners retain full headers, native timing, statistics and AI',()=>{
 const owners=spriteHeaders(b.rom).filter(h=>[90,158].includes(b.rom[h.offset]));
 assert.deepEqual(owners.map(h=>[h.kind,h.id]),[['npc',16],['enemy',59]]);
 for(const h of owners)assert.deepEqual(b.rom.slice(h.offset,h.offset+(h.kind==='enemy'?10:5)),b.base.slice(h.offset,h.offset+(h.kind==='enemy'?10:5)));
 for(const [table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+59*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride));}
 const ai=readEnemyAI(b.base,59);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
 for(const a of courtPalaceActors)for(const table of[0x242600,0x242800]){const lo=0x240000+u16(b.base,table+a.animation*2),hi=0x240000+u16(b.base,table+(a.animation+1)*2);assert.deepEqual(b.rom.slice(lo,hi),b.base.slice(lo,hi));}
 for(const [kind,id]of[['npc',152],['npc',226],['npc',230],['npc',164],['enemy',27]]){const h=spriteHeaders(b.base).find(h=>h.kind===kind&&h.id===id);assert.deepEqual(b.rom.slice(h.offset,h.offset+5),b.base.slice(h.offset,h.offset+5),'Unrelated shared owner '+kind+id);}
});

test('independent cell compilation cannot bypass native ownership, stream limits or assembly guards',()=>{
 const run=(base=b.base,options={},families=swampImpFamilies)=>patchActorFamilies(base,families,()=>{},()=>0x300000,()=>{},b.records,{streamedGraphics:new Set([86]),compileFamily:compileSwampImpFamily,...options});
 assert.doesNotThrow(()=>run());
 const incomplete=structuredClone(swampImpFamilies);incomplete[0].actors[0].npcs=[];assert.throws(()=>run(b.base,{},incomplete),/another owner/);
 const recolor=structuredClone(swampImpFamilies);recolor[0].actors[0].colors[0]='000000';assert.throws(()=>run(b.base,{},recolor),/palette has another owner/);
 assert.throws(()=>run(b.base,{streamedGraphics:new Set()}),/decoded graphics budget/);
 const compiler=mutate=>family=>{const c=compileSwampImpFamily(family);mutate(c);return c;};
 assert.throws(()=>run(b.base,{compileFamily:compiler(c=>c.tiles+=.5)}),/native bank contract/);
 assert.throws(()=>run(b.base,{compileFamily:compiler(c=>c.groups[0].asm=99)}),/native assembly contract/);
 assert.throws(()=>run(b.base,{compileFamily:compiler(c=>c.groups[0].assembly[1]|=128)}),/invalid native tile/);
 for(const gfx of[90,158])assert.throws(()=>patchActorFamilies(b.base,courtPalaceFamilies.filter(f=>f.gfx===gfx),courtPalaceSprite,()=>0x300000,()=>{},b.records),/decoded graphics budget/);
});
