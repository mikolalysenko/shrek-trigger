import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom} from './helpers.mjs';
import {u16} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {techniqueTables as table} from '../engine/technique-revision.js';

const b=await build(),rom=b.rom,sha256=createHash('sha256').update(rom).digest('hex'),out='.local/qa/lightning-'+sha256.slice(0,12);
await mkdir(out,{recursive:true});

test("Ogre Roar replaces only Lightning's presentation, keeping damage, MP and one target",()=>{
 const a=b.audit.ogreRoar;assert.equal(a.tech,3);assert.equal(a.extraWramBytes??0,0);assert.equal(a.extraVramBytes??0,0);
 assert.ok(a.scriptBytes<=a.sourceScriptBytes,'fits the original scene');
 // Mechanics: native target, control, property and MP records are untouched.
 for(const[start,size]of[[table.target(3),2],[table.control(3),11],[table.property(3),12]])assert.deepEqual(rom.slice(start,start+size),b.base.slice(start,start+size));
 assert.equal(rom[table.MP+3],b.base[table.MP+3]);assert.equal(b.base[table.MP+3],2);
});

test('native Lightning hits one enemy from every party slot, cleans up and accepts Eye Lasers',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json')),reports=[];
 for(const[party,fixture]of[[[0,1,2],'clowns'],[[1,0,2],'clowns'],[[1,2,0],'clowns'],[[0,1,2],'milenko']]){
  const s=await bedroom(rom),h=installHooks(s,specs),d=createDevTools(s,h),slot=party.indexOf(0);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture,unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();
  const hp=Array.from({length:8},(_,i)=>u16(s.ram,0x5e30+(i+3)*128)),mp=u16(s.ram,0x5e34+slot*128),hits=[];
  let cast=false,effect=false,restored=false,followup=false,flames=false;
  h.on('battle.tech',e=>{if(e.actor===slot&&e.techId===3)cast=true;if(e.actor===slot&&e.techId===2)followup=true;});
  h.on('battle.result',e=>{if(e.actor===slot&&e.techId===3)hits.push(e);});
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  await chooseNativeTech(io,rom,slot,3);
  for(let f=0;f<700;f++){
   s.runFrame();
   if(s.ram[0xae91]===slot&&s.ram[0xae92]===2&&s.ram[0xae93]===3&&u16(s.ram,0xcca2)>0)effect=true;
   if(effect&&u16(s.ram,0xcca2)===0&&s.ram[0xcfff]===0)restored=true;
  }
  assert.ok(cast&&effect&&restored,'stock Lightning presentation and renderer cleanup');
  assert.equal(hits.length,1);assert.ok(hits[0].target>=3&&hits[0].value>0);
  const damaged=hp.map((n,i)=>({slot:i+3,value:n-u16(s.ram,0x5e30+(i+3)*128)})).filter(n=>n.value>0);
  assert.equal(damaged.length,1);assert.equal(damaged[0].slot,hits[0].target);assert.equal(damaged[0].value,hits[0].value);
  assert.equal(u16(s.ram,0x5e34+slot*128),mp-1);
  for(let n=0;n<180&&s.ram[0x95d5]!==slot;n++){if(s.ram[0x95d5]<3)await io.tap(64,12);await io.wait(24);}
  assert.equal(s.ram[0x95d5],slot);await chooseNativeTech(io,rom,slot,2);
  for(let f=0;f<700;f++){s.runFrame();if(followup&&s.ram[0xae91]===slot&&s.ram[0xae93]===2)flames||=s.ram[0xa2c5]>=5&&s.ram[0xa2c5]<=8&&Array.from(s.ram.slice(0xa419,0xa421)).some(v=>(v&7)===5);}
  assert.ok(followup&&flames);assert.equal(u16(s.ram,0x5e34+slot*128),mp-2);assert.equal(d.diagnostics().fatal,null);
  reports.push({party,fixture,cast,effect,restored,hits,damaged,followup,flames});d.undo();assert.deepEqual(s.cart.data,rom);d.dispose();h.dispose();
 }
 await writeFile(out+'/native-casts.json',JSON.stringify({sha256,reports},null,2));
});
