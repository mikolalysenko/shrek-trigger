import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {u16} from '../engine/rom.js';

const b=await build(),effects=b.audit.comboTechEffects.effects;
const parties=new Map();
for(const[ids,party]of[
 [[57,58,59],[0,1,2]],[[60,61,62],[0,2,1]],[[63,64,65],[0,3,1]],[[66,67,68],[0,4,1]],[[69,70,71],[0,5,1]],
 [[72,73,74],[1,2,0]],[[75,76,77],[1,3,0]],[[78,79,81],[1,4,0]],[[80,82,83],[1,5,0]],
 [[84,85,86],[2,3,0]],[[87,88,89],[2,5,0]],[[90,91,92,93],[3,4,0]],[[94,95],[3,5,0]],[[96,97,98],[4,5,0]],[[99,100,101],[2,4,0]],
 [[102],[0,1,2]],[[103],[0,1,3]],[[104],[0,1,4]],[[105],[0,1,5]],[[106],[0,2,3]],[[107],[0,2,4]],[[108],[0,2,5]],
 [[109],[0,3,4]],[[110],[0,3,5]],[[111],[0,4,5]],[[112],[1,2,6]],[[113],[0,2,6]],[[114],[0,3,5]],[[115],[0,1,5]],[[116],[0,4,6]]
])for(const id of ids)parties.set(id,party);
function hasVram(s,expected){const v=new Uint8Array(s.ppu.vram.buffer);for(let p=0;p+expected.length<=v.length;p+=32){let match=true;for(let i=0;i<16;i++)if(v[p+i]!==expected[i]){match=false;break;}if(match&&expected.every((x,i)=>v[p+i]===x))return true;}return false;}

test('all eighteen scoped custom combinations execute in native combat with their intended participants',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json'));
 for(const e of effects){
  const party=parties.get(e.tech);assert.ok(party,`participant fixture for ${e.name}`);const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  console.log('casting',e.tech,e.name);d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);
  if(e.tech===114||e.tech===115){
   for(let slot=0;slot<3;slot++)s.ram[0x2600+party[slot]*80+0x2a]=e.tech===114?176:177;
   runFrames(s,3,512);runFrames(s,120);runFrames(s,3,32);runFrames(s,180);
   s.ram[0x284d+e.tech-102]|=0x80;
  }
  d.startCombat({fixture:'clowns',unlockTechs:true});runFrames(s,400);
  if([57,75,77,80,92,96].includes(e.tech))for(let n=0;n<3000&&!d.diagnostics().combat.actors.some(a=>a.slot<3&&a.hp>0&&a.hp<a.maxHp);n++)s.runFrame();
  for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();assert.ok(s.ram[0x95d5]<=2,`ready for ${e.name}`);
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};let cast=false;
  h.on('battle.tech',x=>{if(x.techId===e.tech)cast=true;});await chooseNativeTech(io,b.rom,0,e.tech);
  const expected=b.rom.slice(e.tiles,e.tiles+e.bytes);let upload=false;
  for(let f=0;f<1500;f++){
   s.runFrame();if(hasVram(s,expected))upload=true;
   if([150,350].includes(f))await screenshot(s,`.local/qa/combo-${e.tech}-${f}.png`);
  }
  // The component and participant suites own MP/mechanics checks. This loop
  // isolates the private presentation; the base fixture does not uniformly
  // expose combo MP deduction through the slot-zero counter.
  assert.ok(cast,`${e.name} native combo action`);assert.ok(upload,`${e.name} exact native upload`);
  assert.equal(d.diagnostics().fatal,null);assert.equal(s.cpu.stopped,false);d.dispose();h.dispose();
 }
});
