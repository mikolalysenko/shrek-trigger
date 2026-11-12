import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot,assertSpriteGraphicsStorage,assertStockActors} from './helpers.mjs';
import {retainedBossNames} from '../content/retained-boss-names.js';
import {wildlifeFamilies,futureWildlife,customFutureWildlife,stockWildlifeFamilyKeys} from '../content/future-wildlife.js';
import {futureWildlifeSprite} from '../engine/future-wildlife-art.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,put24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
import {traverseFutureRoad} from './future-road-controller.mjs';
import {traverseWesternRuins,traverseEasternRuins} from './ruins-controller.mjs';
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('wildlife preserves native combat data, animation programs, shared palettes and decoded memory budgets',()=>{
  assert.deepEqual(new Set(b.audit.futureWildlife.stockRestored),stockWildlifeFamilyKeys);
  assert.deepEqual(new Set(wildlifeFamilies.map(f=>f.key)),stockWildlifeFamilyKeys);assert.equal(customFutureWildlife.length,0);
  // Krawlie and the Hexapod keep the Sir Sludge and Bog Baron names their dialogue uses.
  assertStockActors(b,futureWildlife,{retainedNames:new Map(retainedBossNames.map(a=>[a.enemy,a.short]))});
  assert.deepEqual(futureWildlife.filter(a=>retainedBossNames.some(r=>r.enemy===a.enemy)).map(a=>a.key),['sir-sludge','bog-baron']);
  for(const family of wildlifeFamilies.filter(f=>stockWildlifeFamilyKeys.has(f.key)))for(const group of family.groups){
    const gp=0x242000+family.gfx*3,ap=0x242300+group.asm*3,cells=group.size&1?8:4;
    assert.equal(u24(b.rom,gp),u24(b.base,gp),'stock wildlife graphics pointer '+family.gfx);assert.equal(u24(b.rom,ap),u24(b.base,ap),'stock wildlife assembly pointer '+group.asm);
    assert.deepEqual(decompress(b.rom,cartridgeOffset(u24(b.rom,gp),b.rom)).bytes,decompress(b.base,fileOffset(u24(b.base,gp))).bytes,'stock wildlife graphics '+family.gfx);
    const p=fileOffset(u24(b.base,ap));assert.deepEqual(b.rom.slice(p,p+group.frames*cells*10),b.base.slice(p,p+group.frames*cells*10),'stock wildlife assembly '+group.asm);
  }
  for(const a of futureWildlife.filter(a=>stockWildlifeFamilyKeys.has(wildlifeFamilies.find(f=>f.gfx===a.gfx)?.key))){
    const h=0x24f600+a.enemy*10;assert.deepEqual(b.rom.slice(h,h+10),b.base.slice(h,h+10),'stock enemy header '+a.enemy);
    for(const npc of a.npcs??[]){const p=0x24f000+(npc+7)*5;assert.deepEqual(b.rom.slice(p,p+5),b.base.slice(p,p+5),'stock NPC header '+npc);}
  }
  assert.equal(b.audit.futureWildlife.extraVramBytes,0);assert.equal(b.audit.futureWildlife.extraWramBytes,0);
  for(const a of b.audit.futureWildlife.actors){
    const h=0x24f600+a.enemy*10;assert.deepEqual(b.rom.slice(h,h+10),b.base.slice(h,h+10));
    for(const[table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride),'native stats and rewards');}
    const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
    const start=0x240000+u16(b.base,0x242600+a.animation*2),end=0x240000+u16(b.base,0x242602+a.animation*2);
    assert.deepEqual(b.rom.slice(start,end),b.base.slice(start,end));
    assertSpriteGraphicsStorage(b,a);
    assert.equal(a.cells,a.size&1?8:4);assert.equal(a.assemblyBytes,a.frames*a.cells*10);
  }
  const npc=0x24f000+171*5;assert.deepEqual(b.rom.slice(npc,npc+5),b.base.slice(npc,npc+5));assert.equal(b.rom[npc+3],44);
  for(const id of[70,72,73,74,75]){const p=0x240000+u16(b.base,0x242a00+id*2);assert.deepEqual(b.rom.slice(p,p+24),b.base.slice(p,p+24));}
  for(const id of[71,127]){const h=0x24f600+id*10;assert.deepEqual(b.rom.slice(h,h+10),b.base.slice(h,h+10));}
  assert.ok(!b.audit.resources.reclaimedSprites.some(p=>p.field===1&&p.id===50),'the final assembly pointer has no proven source extent and stays reserved');
  const rider=0x23f140;assert.deepEqual(b.rom.slice(rider,rider+24*80),b.base.slice(rider,rider+24*80));
});

test('the native scavenger steals one Onion first, otherwise 500 G, and safely leaves a poor inventory alone',async()=>{
  for(const[onions,gold,line]of[[3,1000,79],[1,1000,79],[0,1000,78],[0,500,78],[0,499,null],[0,0,null]]){
    const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[];let before,seeded=false,contact=false;
    h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});
    const d=createDevTools(s,h),original=s.cart.data.slice();
    h.on('event.dispatch',e=>{
      if(!seeded){seeded=true;const slot=s.ram.subarray(0x2400,0x2500).indexOf(189);assert.ok(slot>=0);s.ram[0x2400+slot]=onions?189:0;s.ram[0x2500+slot]=onions;put24(s.ram,0x2c53,gold);}
      if(e.location===212&&e.opcode===0xe8&&[0x455,0x464,0x46c].includes(e.scriptPC))contact=true;
    });
    h.on('dialogue.render',e=>{if(e.location===212)messages.push(e.stringId);});
    d.jump(areas.find(a=>a.futureScene==='future-scavengers'));runFrames(s,400);
    for(let i=0;i<700&&!contact;i++){
      const leader=u16(s.ram,0x197),dx=u16(s.ram,0x1812)/16-u16(s.ram,0x1800+leader)/16,dy=u16(s.ram,0x1892)/16-u16(s.ram,0x1880+leader)/16;
      runFrames(s,1,1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0));
    }
    assert.ok(contact,'the rat was touched using ordinary movement');runFrames(s,600);
    const slot=s.ram.subarray(0x2400,0x2500).indexOf(189);assert.equal(slot<0?0:s.ram[0x2500+slot],Math.max(0,onions-1));
    assert.equal(u24(s.ram,0x2c53),gold-(!onions&&gold>=500?500:0));
    assert.deepEqual(messages,line===null?[]:[line]);assert.equal(s.ram[0x10000],52);
    assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);
    if(onions===3)await screenshot(s,'.local/qa/rat-theft-cleared.png');
    d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();
  }
});

test('the wildlife builder rejects undeclared owners, recoloring a shared ramp and oversized decoded banks',()=>{
  const run=(base,families=wildlifeFamilies,draw=futureWildlifeSprite)=>patchActorFamilies(base,families,draw,()=>0x300000,()=>{},b.records,{streamedGraphics:new Set([82,89,92,93,98,104,105,110,112,154])});
  assert.doesNotThrow(()=>run(b.base));
  const bad=b.base.slice();bad[0x24f600]=105;assert.throws(()=>run(bad),/another owner/);
  const incomplete=structuredClone(wildlifeFamilies);incomplete[0].actors[0].npcs=[];assert.throws(()=>run(b.base,incomplete),/another owner/);
  const recolor=structuredClone(wildlifeFamilies);recolor[1].actors[0].colors[0]='000000';assert.throws(()=>run(b.base,recolor),/palette has another owner/);
  assert.throws(()=>run(b.base,wildlifeFamilies.filter(f=>f.key!=='beetles')),/palette has another owner/,'the pot palette cannot change without its beetle owner');
  const alias=b.base.slice();alias.set(alias.slice(0x242a00+84*2,0x242a02+84*2),0x242a00+200*2);assert.throws(()=>run(alias),/aliased/);
  for(const gfx of[82,89,92,93,98,105,112,154])assert.throws(()=>patchActorFamilies(b.base,wildlifeFamilies.filter(f=>f.gfx===gfx),futureWildlifeSprite,()=>0x300000,()=>{},b.records),/decoded graphics budget/,'growth requires an explicit native stream selection for '+gfx);
});

test('shared-family ownership follows the real earlier Guy Fieri relocation and rejects incomplete header writes',()=>{
  const h=0x24f600+224*10,without=b.records.filter(r=>r.offset!==h);
  const run=records=>patchActorFamilies(b.base,wildlifeFamilies,futureWildlifeSprite,()=>0x300000,()=>{},records,{streamedGraphics:new Set([82,89,92,93,98,104,105,110,112,154])});
  assert.throws(()=>run(without),/graphics have another owner/);
  const target=b.rom.slice(h,h+3);
  assert.throws(()=>run([...without,{offset:h,bytes:target.slice(0,1)}]),/assembly has another owner/);
  assert.throws(()=>run([...without,{offset:h,bytes:target.slice(0,2)}]),/palette has another owner/);
  assert.doesNotThrow(()=>run([...without,{offset:h,bytes:target}]));
  assert.deepEqual([...target],[252,232,7]);
  assert.ok(!b.audit.futureWildlife.actors.some(a=>a.enemy===224));
});

test('both ruins maps traverse ten native encounters, three magic casts and the real world exit continuously',async()=>{
  const s=await bedroom(b.rom),h=installHooks(s,specs),techs=[];let before;
  h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});
  h.on('battle.tech',e=>techs.push(e.techId));
  const d=createDevTools(s,h),original=s.cart.data.slice();d.jump(areas.find(a=>a.futureScene==='future-scavengers'));runFrames(s,400);
  const io={
    read:(p,size=1)=>size===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),
    hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),
    tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>screenshot(s,'.local/qa/'+key+'.png')
  };
  const west=await traverseWesternRuins(io),east=await traverseEasternRuins(io,b.rom);
  assert.equal(west.formations.length+east.formations.length,10);assert.deepEqual(techs,[5,5,5]);
  assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);
  d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();
});

test('the conveyor beetles patrol, respond to the controller interaction, fight and restore normal movement',async()=>{
  const s=await bedroom(b.rom),h=installHooks(s,specs);let before,battle=false,returned=false;
  h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();if(e.location===232&&e.opcode===0xd8)battle=true;if(battle&&e.location===232&&e.scriptPC===0x1a2)returned=true;});
  const d=createDevTools(s,h),original=s.cart.data.slice();d.jump(areas.find(a=>a.futureScene==='factory-conveyor'));runFrames(s,400);
  const x=u16(s.ram,0x1810);runFrames(s,60);assert.notEqual(u16(s.ram,0x1810),x,'the native patrol moves');
  runFrames(s,6,17);for(let i=0;i<12&&!battle;i++){runFrames(s,3,256);runFrames(s,90);}runFrames(s,500);
  assert.ok(battle);assert.deepEqual([...s.ram.slice(0xaf02,0xaf0a)],[140,140,140,140,255,255,255,255]);await screenshot(s,'.local/qa/conveyor-battle.png');
  for(let i=0;i<130&&!returned;i++){runFrames(s,3,256);runFrames(s,100);}assert.ok(returned);runFrames(s,120);
  assert.equal(u16(s.ram,256),232);assert.equal(s.ram[0x10210],0);assert.equal(s.ram[0x10000],60);
  const n=u16(s.ram,0x197),y=u16(s.ram,0x1880+n);runFrames(s,16,33);assert.ok(u16(s.ram,0x1880+n)>y);
  assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();
});

test('the ruined-road route fights four formations, casts native magic, obtains the recorder and wins the return race',async()=>{
  const s=await bedroom(b.rom),h=installHooks(s,specs),techs=[],messages=[];let before;
  h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});
  h.on('battle.tech',e=>techs.push(e.techId));h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
  const d=createDevTools(s,h),original=s.cart.data.slice();d.jump(areas.find(a=>a.futureScene==='future-road'));runFrames(s,400);
  const result=await traverseFutureRoad({
    read:(p,size=1)=>size===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),
    hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),
    tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>screenshot(s,'.local/qa/'+key+'.png')
  },b.rom);
  assert.equal(result.formations.length,4);assert.deepEqual(techs,[5]);assert.ok(messages.some(([l,n])=>l===224&&n===0));
  for(const[l,n]of[[225,19],[225,20],[225,109],[223,15],[223,21],[223,22]])assert.ok(messages.some(([loc,id])=>loc===l&&id===n),l+':'+n);
  assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);
  d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();
});
