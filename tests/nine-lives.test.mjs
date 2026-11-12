import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {put16,u16} from '../engine/rom.js';

const b=await build(),cure=b.base.slice(0xc214b+(39-1)*12,0xc214b+39*12),life=b.base.slice(0xc214b+(16-1)*12,0xc214b+16*12);
function start(s,pc){const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=pc>>16;c.br[4]=pc&65535;c.br[5]=0;c.br[3]=0x7ff;}
function until(s,pc){let n=0;while((s.cpu.r[1]<<16|s.cpu.br[4])!==pc&&n++<100000)s.cpu.cycle();assert.ok(n<100000,'native helper returned');}

test('Nine Lives copies Life II only for a fallen target and preserves the CPU',async()=>{
 const s=await createCore(b.rom);
 for(const hp of[0,1,999])for(const target of[0,1,2]){
  start(s,0xc1d5fd);s.ram.set(cure,0xaee6);put16(s.ram,0xb2c3,39*11);put16(s.ram,0xb2c7,0);s.ram[0xa62d]=target;put16(s.ram,0x5e30+target*128,hp);until(s,0xc1d601);
  assert.deepEqual(s.ram.slice(0xaee6,0xaef2),hp?cure:life);assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);
 }
});

test('Nine Lives revives a fallen ally and then heals a living ally through native actions',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json')),s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
 d.jump({id:1,x:8,y:8,party:[4,1,2],endgame:true});runFrames(s,300);put16(s.ram,0x2603+80,0);d.startCombat({fixture:'clowns',unlockTechs:true});runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
 for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();assert.ok(s.ram[0x95d5]<=2,'Puss revival turn');const mp=u16(s.ram,0x5e34);let revival=false;
 h.on('battle.tech',e=>{if((e.techId===39||e.techId===16)&&e.actor===0)revival=true;});await chooseNativeTech(io,b.rom,0,39,{target:1});runFrames(s,900);
 assert.ok(revival);assert.ok(u16(s.ram,0x5eb0)>0,'fallen ally restored');assert.equal(s.ram[0x5eca]&128,0,'native KO flag cleared');assert.equal(u16(s.ram,0x5e34),mp-2,'Cure II cost with diagnostic Gold Stud');
 await screenshot(s,'.local/qa/nine-lives-revival.png');
 for(let n=0;n<4000&&!d.diagnostics().combat.actors.some(a=>a.slot<3&&a.hp>0&&a.hp<a.maxHp);n++)s.runFrame();
 const injured=d.diagnostics().combat.actors.find(a=>a.slot<3&&a.hp>0&&a.hp<a.maxHp);assert.ok(injured,'native enemy injured an ally');
 for(let n=0;n<300&&s.ram[0x95d5]!==0;n++){if(s.ram[0x95d5]<3)await io.tap(64,12);await io.wait(24);}assert.equal(s.ram[0x95d5],0);
 const before=u16(s.ram,0x5e34),beforeHp=u16(s.ram,0x5e30+injured.slot*128);await chooseNativeTech(io,b.rom,0,39,{target:injured.slot});runFrames(s,900);
 assert.ok(u16(s.ram,0x5e30+injured.slot*128)>beforeHp,'living ally healed');assert.equal(u16(s.ram,0x5e34),before-2);assert.equal(d.diagnostics().fatal,null);d.dispose();h.dispose();
});
