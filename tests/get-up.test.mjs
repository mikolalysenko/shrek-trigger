import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom} from './helpers.mjs';
import {put16,u16} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {snapshot} from '../engine/save.js';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {techniqueTables as table} from '../engine/technique-revision.js';

const b=await build(),rom=b.rom,sha256=createHash('sha256').update(rom).digest('hex'),out='.local/qa/life-'+sha256.slice(0,12);
await mkdir(out,{recursive:true});

test("Get Up replaces only Life's caster presentation, keeping revival, targets and 10 MP",()=>{
 const a=b.audit.getUp;assert.equal(a.tech,6);assert.equal(a.extraWramBytes??0,0);assert.equal(a.extraVramBytes??0,0);
 assert.ok(a.scriptBytes<=a.sourceScriptBytes,'fits the original scene');
 // Mechanics: native target, control, property and MP records are untouched.
 for(const[start,size]of[[table.target(6),2],[table.control(6),11]])assert.deepEqual(rom.slice(start,start+size),b.base.slice(start,start+size));
 // Shrek is life: the effect record is Life II's, a full revival.
 assert.deepEqual(rom.slice(table.property(6),table.property(6)+12),b.base.slice(table.property(16),table.property(16)+12));
 assert.equal(rom[table.MP+6],b.base[table.MP+6]);assert.equal(b.base[table.MP+6],10);
});

test('native Life revives either ally from all party positions, then accepts Eye Lasers',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json')),reports=[];
 for(const party of[[0,1,2],[1,0,2],[1,2,0]])for(const fallen of[1,2]){
  const s=await bedroom(rom),h=installHooks(s,specs),d=createDevTools(s,h),slot=party.indexOf(0),target=party.indexOf(fallen);
  try{
   d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);
   put16(s.ram,0x2603+fallen*80,0);d.startCombat({fixture:'clowns',unlockTechs:true});runFrames(s,400);
   const hpBefore=[0,1,2].map(i=>u16(s.ram,0x5e30+i*128)),mp=u16(s.ram,0x5e34+slot*128),hits=[];
   assert.equal(hpBefore[target],0);assert.equal(s.ram[0x5e4a+target*128]&128,128);
   let cast=false,effect=false,cleanup=false,nextCast=false,flames=false;
   h.on('battle.tech',e=>{if(e.actor===slot&&e.techId===6)cast=true;if(e.actor===slot&&e.techId===2)nextCast=true;});
   h.on('battle.result',e=>{if(e.actor===slot&&e.techId===6)hits.push(e);});
   const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
   await chooseNativeTech(io,rom,slot,6);
   for(let f=0;f<900;f++){
    s.runFrame();
    if(s.ram[0xae91]===slot&&s.ram[0xae92]===2&&s.ram[0xae93]===6&&u16(s.ram,0xcca2)>0)effect=true;
    if(effect&&u16(s.ram,0xcca2)===0&&s.ram[0xcfff]===0)cleanup=true;
   }
   assert.ok(cast&&effect&&cleanup,'stock Life presentation and renderer cleanup');
   assert.equal(hits.length,1);assert.equal(hits[0].target,target);assert.ok(hits[0].value>=0x8000,'native healing result');
   const restoredHp=u16(s.ram,0x5e30+target*128);assert.ok(restoredHp>0);assert.equal(s.ram[0x5e4a+target*128]&128,0,'native KO flag cleared');
   assert.equal(u16(s.ram,0x5e34+slot*128),mp-3,'source 10 MP cost discounted by the diagnostic Gold Stud');
   for(let n=0;n<180&&s.ram[0x95d5]!==slot;n++){if(s.ram[0x95d5]<3)await io.tap(64,12);await io.wait(24);}
   assert.equal(s.ram[0x95d5],slot);await chooseNativeTech(io,rom,slot,2);
   for(let f=0;f<700;f++){s.runFrame();if(nextCast&&s.ram[0xae91]===slot&&s.ram[0xae93]===2)flames||=s.ram[0xa2c5]>=5&&s.ram[0xa2c5]<=8&&Array.from(s.ram.slice(0xa419,0xa421)).some(v=>(v&7)===5);}
   assert.ok(nextCast&&flames);assert.equal(u16(s.ram,0x5e34+slot*128),mp-4);assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,rom);
   reports.push({party,slot,fallen,target,hpBefore,restoredHp,hits,effect,cleanup,nextCast,flames});
  }finally{d.undo();d.dispose();h.dispose();}
 }
 await writeFile(out+'/native-casts.json',JSON.stringify({sha256,reports},null,2)+'\n');
});

test('revival sandbox starts Fiona down, retries the original KO and restores the game exactly',async()=>{
 const s=await bedroom(rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json')));
 const digest=()=>createHash('sha256').update(JSON.stringify(snapshot(s))).digest('hex');let before=null;
 h.on('event.dispatch',()=>{if(before===null)before=digest();});const d=createDevTools(s,h);
 try{
  assert.throws(()=>d.startCombat({loadout:'unknown'}),/Invalid combat loadout/);
  d.startCombat({fixture:'clowns',loadout:'revival',unlockTechs:true});runFrames(s,400);
  assert.equal(d.diagnostics().combat.loadout,'revival');assert.equal(u16(s.ram,0x5eb0),0);assert.equal(s.ram[0x5eca]&128,128);
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  await chooseNativeTech(io,rom,0,6);runFrames(s,900);assert.ok(u16(s.ram,0x5eb0)>0);assert.equal(s.ram[0x5eca]&128,0);
  d.restartCombat();runFrames(s,400);assert.equal(u16(s.ram,0x5eb0),0);assert.equal(s.ram[0x5eca]&128,128);assert.equal(d.diagnostics().combat.attempt,2);
  d.undo();assert.equal(digest(),before);assert.equal(d.diagnostics().combat,null);
 }finally{d.dispose();h.dispose();}
});
