import test from 'node:test';
import assert from 'node:assert/strict';
import {build,assertStockActors} from './helpers.mjs';
import {bridgeFamilies,bridgeActors,customBridgeFamilies,stockBridgeFamilyKeys} from '../content/bridge-actors.js';
import {retainedBossNames} from '../content/retained-boss-names.js';
import {bridgeActorSprite} from '../engine/bridge-art.js';
import {compileActorFamily,patchActorFamilies} from '../engine/actor-families.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {u16} from '../engine/rom.js';

const b=await build();

test('Zombor and the bridge skeletons restore stock art while the Bone Warden keeps its names',()=>{
 assert.deepEqual(new Set(b.audit.bridgeActors.stockRestored),stockBridgeFamilyKeys);
 assert.deepEqual(new Set(bridgeFamilies.map(f=>f.key)),stockBridgeFamilyKeys);
 assert.equal(customBridgeFamilies.length,0);assert.deepEqual(b.audit.bridgeActors.actors,[]);
 assertStockActors(b,bridgeActors,{retainedNames:new Map(retainedBossNames.map(a=>[a.enemy,a.short]))});
 assert.deepEqual(bridgeActors.filter(a=>retainedBossNames.some(r=>r.enemy===a.enemy)).map(a=>a.enemy),[179,181,180,182]);
 for(const a of bridgeActors){
  for(const[table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride));}
  const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  const start=0x240000+u16(b.base,0x242600+a.animation*2),end=0x240000+u16(b.base,0x242602+a.animation*2);
  assert.deepEqual(b.rom.slice(start,end),b.base.slice(start,end));
 }
});

test('the retired bridge sources still respect native ownership, palette and cell guards',()=>{
 const run=(base,families=bridgeFamilies)=>patchActorFamilies(base,families,bridgeActorSprite,()=>0x300000,()=>{},b.records,{streamedGraphics:new Set([170,171])});
 assert.doesNotThrow(()=>run(b.base));
 const incomplete=structuredClone(bridgeFamilies);incomplete[0].actors.pop();assert.throws(()=>run(b.base,incomplete),/another owner/);
 const shared=b.base.slice();shared[0x24f600+2]=203;assert.throws(()=>run(shared),/palette has another owner/);
 const alias=b.base.slice();alias.set(alias.slice(0x242a00+203*2,0x242a02+203*2),0x242a00+200*2);assert.throws(()=>run(alias),/aliased/);
 const cave=bridgeFamilies.find(f=>f.key==='bone-warden');
 assert.throws(()=>compileActorFamily(cave,(art,f)=>{const p=bridgeActorSprite(art,f);p[0]=1;return p;}),/outside native sprite cells/);
});
