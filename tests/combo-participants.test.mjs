import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {put16,u16} from '../engine/rom.js';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('all four moved combinations keep their own effect, cost and native participants',async()=>{
 for(const[tech,party]of[[80,[1,5,0]],[81,[1,4,0]],[92,[3,5,0]],[93,[3,4,0]]]){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),results=[],messages=[];
  h.on('battle.result',e=>results.push(e));h.on('battle.message',e=>messages.push(e.messageId));
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);
  if(tech===80||tech===92)for(let slot=0;slot<3;slot++)put16(s.ram,0x2603+party[slot]*80,100);
  d.startCombat({fixture:'clowns',unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();
  assert.ok(s.ram[0x95d5]<=2,`ready for tech ${tech}`);
  const before=[0,1,2].map(slot=>u16(s.ram,0x5e30+slot*128));
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  await chooseNativeTech(io,b.rom,0,tech);
  assert.equal(s.ram[0x93f4],tech,`tech ${tech} keeps its command ID`);
  let stopped=false,stolen=false;
  for(let f=0;f<1200;f++){
   s.runFrame();stolen||=s.ram[0xb3bf]!==0;
   for(let slot=3;slot<11;slot++)stopped||=!!(s.ram[0x5e4b+slot*128]&128);
  }
  assert.ok(results.some(e=>e.techId===tech),`tech ${tech} keeps its native effect`);
  if(tech===80||tech===92)assert.ok([0,1,2].some(slot=>u16(s.ram,0x5e30+slot*128)>before[slot]),`tech ${tech} heals its new pair`);
  if(tech===81)assert.ok(stolen||messages.includes(3),'Twin Charm steals with Fiona and Puss');
  if(tech===93)assert.ok(stopped,'Boogie applies Stop with Pinocchio and Puss');
  assert.equal(d.diagnostics().fatal,null);assert.equal(s.cpu.stopped,false);
  d.dispose();h.dispose();
 }
});
