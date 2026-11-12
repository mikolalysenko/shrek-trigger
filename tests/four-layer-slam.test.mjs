import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {build,bedroom,screenshot} from './helpers.mjs';
import {fourLayerSlamScene,patchFourLayerSlam} from '../engine/four-layer-slam.js';
import {put16,u16,fileOffset} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';

const b=await build(),rom=b.rom,audit=b.audit.fourLayerSlam,sha256=createHash('sha256').update(rom).digest('hex');
const out='.local/qa/four-layer-'+sha256.slice(0,12);await mkdir(out,{recursive:true});

test('Four Layer Slam preserves four-hit calculations, 12 MP, targets, combos and shared resources',()=>{
 for(const[start,end]of[[0xc1acb,0xc247b],[0xc253b,0xc2580],[0x114100,0x115000],
  [0xe0000,0xe0100],[0xd692c+14,0xd692c+16],[0xd45a6+44*7,0xd45a6+45*7]])assertRevisedBytes(rom,b.base,start,end);
 assert.equal(b.base[0xc253b+7],12);assert.equal(audit.scriptBytes,239);assert.equal(audit.sourceScriptBytes,250);
 assert.equal(audit.extraRomBytes,0);assert.equal(audit.sharedClassifierGrowth,4);assert.equal(audit.extraWramBytes,0);assert.equal(audit.extraVramBytes,0);
 assert.equal(audit.hooks[0].bytes,101);assert.deepEqual(audit.hooks[0].techs,[4,7]);assert.equal(audit.hooks[0].address,b.audit.swampPiledriver.hooks[0].address);
 assert.deepEqual(rom.slice(0xe0e96+audit.scriptBytes,0xe0f90),b.base.slice(0xe0e96+audit.scriptBytes,0xe0f90));
 // Luminaire's separate Swamp Belch patch remains the only owner next door.
 assert.ok(!b.records.filter(r=>r.label.startsWith('Four Layer Slam')).some(r=>r.offset<0xe0f90&&r.offset+r.bytes.length>0xe0f90));
});

test('Four Layer Slam refuses changed source bytes, resource aliases and missing native selection',()=>{
 const header=b.base.slice();put16(header,0xd5ef0+4,0x0e96);assert.throws(()=>fourLayerSlamScene(header),/another header owner/);
 const channel=b.base.slice();put16(channel,0xe099c+4,0x0ea6);assert.throws(()=>fourLayerSlamScene(channel),/another channel owner/);
 const sub=b.base.slice();put16(sub,0xe0000+80*2,0x0ea6);assert.throws(()=>fourLayerSlamScene(sub),/shared subscript/);
 const alias=b.base.slice();alias[0xd45a6+44*7]=7;assert.throws(()=>fourLayerSlamScene(alias),/another tech owner/);
 const changed=b.base.slice();changed[0xe0f48]^=1;assert.throws(()=>fourLayerSlamScene(changed),/source scene/);
 const config=b.base.slice();config[0xd45a6+7*7]^=1;assert.throws(()=>patchFourLayerSlam(config,()=>{},audit.hooks[0]),/source resources/);
 assert.throws(()=>patchFourLayerSlam(b.base,()=>{}),/requires the native wrestling selector/);
 const sound=b.base.slice();put16(sound,0x7430b+0x6c*4,0);assert.throws(()=>patchFourLayerSlam(sound,()=>{},audit.hooks[0]),/resident sound/);
});

test('Four Layer Slam displays four hits, throws once, restores actors and accepts another tech in all party positions',async()=>{
 const reports=[];
 for(const[party,fixture,anchored,lethal=false]of[[[0,1,2],'clowns',false],[[1,0,2],'clowns',false],[[1,2,0],'clowns',false],[[0,1,2],'court-beast',false],[[0,1,2],'milenko',true],[[0,1,2],'clowns',false,true]]){
  const specs=JSON.parse(await readFile('content/hooks.json'));
  for(const[name,address]of[['four.frame',0xc14304],['four.sound',0xc161a4],['four.script',0xc14cc4],['four.select',0xc1461b],['four.damage',0xc15adb],['four.commit-zero',0xc1ed12],['four.commit-positive',0xc1ed1a]])specs.push({name,address,expected:[...rom.slice(fileOffset(address),fileOffset(address)+4)]});
  const s=await bedroom(rom),h=installHooks(s,specs),d=createDevTools(s,h),slot=party.indexOf(0);
  try{
   d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);if(!lethal){s.ram[0x2629]=1;s.ram[0x260b]=20;s.ram[0x2636]=20;}d.startCombat({fixture,unlockTechs:true});runFrames(s,400);
   for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();
   const hp=Array.from({length:8},(_,i)=>u16(s.ram,0x5e30+(i+3)*128)),mp=u16(s.ram,0x5e34+slot*128),frames=new Set(),sounds=[],hits=[],displays=[],counters=new Set();
   const position=i=>[s.ram[0x1d0c+i],s.ram[0x1d23+i]],height=i=>(s.ram[0xa4af+i]<<24)>>24;
   let before=null,cast=false,selection=null,finished=null,target=null,elapsed=-1,shrekLift=0,enemyLift=0,followup=false,peak=0,applied=null;
   const active=()=>s.ram[0xae91]===slot&&s.ram[0xae92]===2&&s.ram[0xae93]===7;
   h.on('battle.tech',e=>{if(e.actor===slot&&e.techId===7){cast=true;elapsed=0;}if(e.actor===slot&&e.techId===2)followup=true;});
   h.on('battle.result',e=>{if(e.actor===slot&&e.techId===7){hits.push(e);target=e.target;}});
   h.on('four.select',()=>{if(active()){selection=!!u16(s.ram,0xa0b3);before=Array.from({length:11},(_,i)=>position(i));}});
   h.on('four.frame',()=>{if(active()&&s.ram[0x9679]===slot)frames.add(s.cpu.br[0]&255);});
   h.on('four.sound',()=>{if(active())sounds.push({elapsed,id:s.ram[0x1e01]});});
   for(const name of['four.commit-zero','four.commit-positive'])h.on(name,()=>{if(active()&&finished&&s.cpu.br[1]===target*128&&applied===null&&u16(s.ram,0x5e30+target*128)!==hp[target-3])applied={elapsed,target,hp:u16(s.ram,0x5e30+target*128)};});
   h.on('four.damage',()=>{if(active()&&!s.ram[0xa3d1])displays.push({elapsed,command:s.ram[0x9895]});});
   h.on('four.script',()=>{if(!active())return;const p=((u16(s.ram,0xe6)+s.cpu.br[2])&65535)|((s.ram[0xe8]&63)<<16);
    if(s.ram[0xa010]===0&&p>=0xe0e96&&p<0xe0f90&&rom[p]===1)finished={elapsed,hp:Array.from({length:8},(_,i)=>u16(s.ram,0x5e30+(i+3)*128)),positions:Array.from({length:11},(_,i)=>position(i)),heights:[...s.ram.slice(0xa4af,0xa4ba)],locks:[...s.ram.slice(0xa5d8,0xa5e3)],counter:s.ram[0x5d9d]};
   });
   const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
   await chooseNativeTech(io,rom,slot,7);const left=new Float32Array(534),right=new Float32Array(534);
   for(let f=0;f<650;f++){
    s.runFrame();s.setSamples(left,right,534);for(const channel of[left,right])for(const value of channel){assert.ok(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));}
    if(active()&&before&&!finished){
     shrekLift=Math.max(shrekLift,-height(slot));enemyLift=Math.max(enemyLift,-height(target));counters.add(s.ram[0x5d9d]);
     if(anchored){assert.deepEqual(position(target),before[target]);assert.equal(height(target),0);}
     if(s.ram[0x5d9d]<7)assert.equal(height(target),0,'only the finisher lifts the target');
    }
    if([80,140,212,296,312,324,336].includes(elapsed))await screenshot(s,out+'/'+fixture+'-slot-'+slot+'-'+elapsed+'.png');if(elapsed>=0)elapsed++;
   }
   const report={party,fixture,anchored,lethal,diagnosticLoadout:lethal?"strong kit":"starter weapon, power20",selection,frames:[...frames],sounds,hits,displays,counters:[...counters],shrekLift,enemyLift,hp,before,finished,applied,peak};
   await writeFile(out+'/'+fixture+'-slot-'+slot+(lethal?'-lethal':'')+'-cast.json',JSON.stringify(report,null,2));
   assert.ok(cast&&finished);assert.equal(selection,anchored);assert.ok(frames.has(217)&&frames.has(195));assert.deepEqual(sounds.map(s=>s.id),[0x6c,0x6c,0x6c,0x6b,0x6c]);
   assert.deepEqual(displays.map(d=>d.command),[0x50,0x51,0x52,0x53]);assert.equal(shrekLift,24);assert.equal(enemyLift,anchored?0:40);assert.ok(peak>0&&peak<1);
   assert.deepEqual(finished.positions[slot],before[slot]);assert.deepEqual(finished.positions[target],before[target]);assert.equal(finished.heights[slot],0);assert.equal(finished.heights[target],0);assert.equal(finished.locks[slot],0);assert.equal(finished.locks[target],0);assert.equal(finished.counter,11);
   assert.equal(hits.length,5);assert.ok(hits.slice(0,4).every(h=>h.value>0&&h.target===target));assert.equal(hits[4].value,hits.slice(0,4).reduce((n,h)=>n+h.value,0));
   assert.ok(applied,'native HP result commits after the animation');assert.equal(hp[target-3]-applied.hp,Math.min(hp[target-3],hits[4].value));
   assert.equal(u16(s.ram,0x5e34+slot*128),mp-3,'source 12 MP with diagnostic Gold Stud');
   if(lethal){assert.equal(applied.hp,0);assert.equal(d.diagnostics().fatal,null);reports.push(report);continue;}
   for(let n=0;n<180&&s.ram[0x95d5]!==slot;n++){if(s.ram[0x95d5]<3)await io.tap(64,12);await io.wait(24);}assert.equal(s.ram[0x95d5],slot);
   await chooseNativeTech(io,rom,slot,2);runFrames(s,700);assert.ok(followup);assert.equal(u16(s.ram,0x5e34+slot*128),mp-4);assert.equal(d.diagnostics().fatal,null);report.followup=followup;reports.push(report);
  }finally{d.undo();assert.deepEqual(s.cart.data,rom);d.dispose();h.dispose();}
 }
 await writeFile(out+'/native-casts.json',JSON.stringify({sha256,audit,reports},null,2));
});
