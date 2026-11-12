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

const b=await build(),effects=b.audit.physicalTechEffects.effects;
function start(s,tech,chunk){const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=0xcd;c.br[4]=0x1368;c.br[5]=0;c.br[3]=0x7ff;s.ram[0xae91]=0;s.ram[0xae92]=2;s.ram[0xae93]=tech;s.ram[0x9ee3]=tech;c.br[1]=chunk;put16(s.ram,0x67,32);}
function until(s,pc){let n=0;while((s.cpu.r[1]<<16|s.cpu.br[4])!==pc&&n++<100000)s.cpu.cycle();assert.ok(n<100000);}
function hasVram(s,expected){const v=new Uint8Array(s.ppu.vram.buffer);for(let p=0;p+expected.length<=v.length;p+=32){let match=true;for(let i=0;i<16;i++)if(v[p+i]!==expected[i]){match=false;break;}if(match&&expected.every((x,i)=>v[p+i]===x))return true;}return false;}

test('every physical prop decodes through its isolated native graphics record',async()=>{
 const s=await createCore(b.rom),source=await createCore(b.base);
 for(const e of effects){
  // The decode buffer holds one chunk; chunk n of a multi-chunk effect reads n KB in.
  const chunk=e.chunkFirst,expected=b.rom.slice(e.tiles,e.tiles+1024);
  for(const tech of[e.tech,3]){
   for(const c of[s,source]){start(c,tech,chunk);let n=0;while((c.cpu.r[1]<<16|c.cpu.br[4])!==0xcd13c9&&n++<100000)c.cpu.cycle();assert.ok(n<100000);}
   assert.deepEqual(s.ram.slice(0x2d00,0x3100),tech===e.tech?expected:source.ram.slice(0x2d00,0x3100),`tech ${e.tech}`);
  }
 }
});

test('every physical, restoration and generated prop appears in real native combat',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json'));
 assert.equal(b.rom[0xc253b+24],20,'Call My Wife retains Flare base MP cost');
 for(const e of effects){
  const actor=Math.floor((e.tech-1)/8),party=[actor,...[0,1,2].filter(x=>x!==actor)].slice(0,3),slot=0,s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  console.log('casting',e.tech,e.name);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);// Crumb Cyclone only reaches enemies beside Mongo. The clowns stand out of
  // its range, as in their own encounter, so it needs the close-range pack.
  d.startCombat({fixture:e.tech===46?'swamp-pack':'clowns',unlockTechs:true});runFrames(s,400);
  if([33,39].includes(e.tech))for(let n=0;n<3000&&!d.diagnostics().combat.actors.some(a=>a.slot<3&&a.hp>0&&a.hp<a.maxHp);n++)s.runFrame();
  for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();assert.ok(s.ram[0x95d5]<=2,`ready for ${e.name}`);
  const before=u16(s.ram,0x5e34),io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};let cast=false;
  h.on('battle.tech',x=>{if((e.tech===39?[15,16,39]:[e.tech]).includes(x.techId)&&x.actor===slot)cast=true;});const target=[33,39].includes(e.tech)?d.diagnostics().combat.actors.find(a=>a.slot<3&&a.hp>0&&a.hp<a.maxHp)?.slot:undefined;await chooseNativeTech(io,b.rom,slot,e.tech,{target});
  const expected=b.rom.slice(e.tiles,e.tiles+1024);let upload=false;
  // The clowns' paired attack can run first; wait for the effect rather than
  // assuming it starts within a fixed window, then let it finish.
  let seen=-1;
  for(let f=0;f<3600&&(seen<0||f<seen+600||f<900);f++){
   s.runFrame();if(hasVram(s,expected)){upload=true;if(seen<0)seen=f;}
   if(f===100)await screenshot(s,`.local/qa/tech-${e.tech}.png`);
  }
  assert.ok(cast,`${e.name} native action`);assert.ok(upload,`${e.name} exact native upload`);
  const spent=before-u16(s.ram,0x5e34);
  // The endgame kit equips native Gold Studs: quarter cost plus one.
  if(e.tech===24)assert.equal(spent,6,'Call My Wife preserves native discounted Flare MP cost');else assert.ok(spent>0,`${e.name} spends native MP`);
  assert.equal(d.diagnostics().fatal,null);assert.equal(s.cpu.stopped,false);d.dispose();h.dispose();
 }
});
