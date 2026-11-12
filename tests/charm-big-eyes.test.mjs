import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {u16} from '../engine/rom.js';
import {sprite} from '../engine/sprites.js';

const b=await build();

test('Puss has one dedicated big-eyes actor frame and no extra runtime memory',()=>{
 assert.equal(b.audit.characters[4].frameCount,245);
 assert.equal(b.audit.characters[4].map[206].pose,'big-eyes');
 const eyes=sprite(4,0,'big-eyes',1);assert.equal(eyes.length,1024);assert.ok(eyes.includes(9)&&eyes.includes(8),'green irises and white sclera');
 assert.equal(b.audit.bigEyesCharm.actorFrame,206);assert.equal(b.audit.bigEyesCharm.extraVramBytes,0);assert.equal(b.audit.bigEyesCharm.extraWramBytes,0);
});

test('Puss casts his dedicated big-eyes frame from every party slot with native MP and steal dispatch',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json'));
 for(const party of[[4,0,1],[0,4,1],[0,1,4]]){
  const slot=party.indexOf(4),s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture:'clowns',unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();assert.ok(s.ram[0x95d5]<=2,'a party member is ready');
  const before=u16(s.ram,0x5e34+slot*128),io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  let cast=false,eyes=false;
  h.on('battle.tech',e=>{if(e.techId===36&&e.actor===slot)cast=true;});
  await chooseNativeTech(io,b.rom,slot,36);
  for(let f=0;f<600;f++){
   s.runFrame();if([206,226].includes(s.ram[0x9907+slot]))eyes=true;
   if(slot===0&&[45,90,150].includes(f))await screenshot(s,`.local/qa/charm-big-eyes-${f}.png`);
  }
  assert.ok(cast,'native Charm action');assert.ok(eyes,'dedicated big-eyes actor frame is displayed');
  assert.equal(u16(s.ram,0x5e34+slot*128),before-1,'native Charm cost with the test-kit Gold Stud');assert.equal(d.diagnostics().fatal,null);assert.equal(s.cpu.stopped,false);
  d.dispose();h.dispose();
 }
});
