import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,access,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {chooseNativeTech} from '../tests/battle-controller.mjs';
import {seedTrialCheckpoint} from '../engine/trial-checkpoints.js';

const requested=process.argv[2]??'all',override=process.argv.find(a=>a.startsWith('--rom='))?.slice(6),section=process.argv.find(a=>a.startsWith('--section='))?.slice(10)??'all';
if(!['all','snes9x','bsnes'].includes(requested)||!['all','tank','clowns'].includes(section))throw Error('Choose all, snes9x or bsnes; optional --section=tank|clowns');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){const p=path.resolve(dir,name);try{await access(p);return p;}catch{}}
 throw Error('Set '+env+' to an installed '+name);
}
const b=await build(),bytes=override?new Uint8Array(await readFile(override)):b.rom;
const sha256=createHash('sha256').update(bytes).digest('hex'),root=path.resolve('.local/qa/piledriver-'+sha256.slice(0,12));
await mkdir(root,{recursive:true});const rom=path.join(root,'candidate.sfc');await writeCandidate(rom,bytes);
const host=await tool('RETRO_HOST','retro-host'),reports=[];
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const out=path.join(root,name+(section==='all'?'':'-'+section)),core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.dylib');
 const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  for(const[frames,buttons]of newGameSequence)await io.hold(buttons,frames);
  assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);
  await write(0x29af,[254]);await write(0x10000,[0x5f]);await write(0x100f3,[0]);
  await write(0x2830,Array(7).fill(8));await write(0x2837,Array(7).fill(255));await write(0x283e,Array(15).fill(224));await write(0x284d,Array(15).fill(128));
  for(let id=0;id<7;id++){
   const p=0x2600+id*80,stats=[65,60,12,60,60,50,60];
   await write(p+3,[231,3,231,3,99,0,99,0]);await write(p+0xb,stats);await write(p+0x12,[60]);await write(p+0x36,stats);
   await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);await write(p+0x3d,[200,220,231,3]);
  }
  await request({op:'savestate',name:'kit'});const casts=[];
  const until=async(addr,value,frames=15000)=>{const r=await request({op:'until',mem:'wram',addr,value,frames,buttons:'a',every:93,hold:3});assert.ok(r.met,'native condition '+addr.toString(16)+'='+value);};
  async function cast(party,label,anchored){
   const slot=party.indexOf(0);if(await io.read(0x9609))await io.tap(1,12);
   for(let n=0;n<100&&await io.read(0x95d5)>2;n++)await io.wait(20);
   const mp=await io.read(0x5e34+slot*128,2),hp=[];for(let i=3;i<11;i++)hp.push(await io.read(0x5e30+i*128,2));
   await request({op:'audio',reset:true});await chooseNativeTech(io,bytes,slot,4);
   let seen=false,shrekLift=0,enemyLift=0,target=null,initialTarget=null,restored=null,rotationShot=false,impactShot=false;const frames=new Set(),sounds=new Set(),counters=new Set();
   for(let f=0;f<650;f++){
    await io.wait(1);const action=await io.bytes(0xae91,3);
    if(action[0]===slot&&action[1]===2&&action[2]===4){
     seen=true;target??=await io.read(0xaecc);const heights=await io.bytes(0xa4af,11),height=i=>(heights[i]<<24)>>24;
     const position=[await io.read(0x1d0c+target),await io.read(0x1d23+target)];initialTarget??=position;
     shrekLift=Math.max(shrekLift,-height(slot));enemyLift=Math.max(enemyLift,-height(target));const pose=await io.read(0x9907+slot),sound=await io.read(0x1e01);frames.add(pose);sounds.add(sound);
     if(!rotationShot&&height(slot)===-32&&pose===195){await io.shot(label+'-rotation');rotationShot={actor:[await io.read(0x1d0c+slot),await io.read(0x1d23+slot)],target:position,heights:[height(slot),height(target)]};}
     if(!impactShot&&sound===0x6c){await io.shot(label+'-impact');impactShot=true;}
     const counter=await io.read(0x5d9d);counters.add(counter);
     if(counter===(anchored?2:6)&&height(slot)===0&&height(target)===0&&!await io.read(0xa5d8+slot)&&!await io.read(0xa5d8+target))restored={position,counter};
     if(f===80||f===120)await io.shot(label+'-'+f);
    }
   }
   const damage=[];for(let i=3;i<11;i++){const after=await io.read(0x5e30+i*128,2);if(after<hp[i-3])damage.push({target:i,value:hp[i-3]-after});}
   const audio=await request({op:'audio'}),report={party,label,anchored,seen,shrekLift,enemyLift,target,initialTarget,restored,rotationShot,impactShot,frames:[...frames],sounds:[...sounds],counters:[...counters],damage,audio};
   await writeFile(path.join(out,label+'.json'),JSON.stringify(report,null,2));
   assert.ok(seen&&restored,'native animation and cleanup');assert.equal(shrekLift,32);assert.equal(enemyLift,anchored?0:48);
   assert.ok([194,195,196,197].every(f=>frames.has(f)),'four native Shrek rotation poses');assert.ok(sounds.has(0x6b)&&sounds.has(0x6c));
   assert.ok(rotationShot&&impactShot,'captures at native rotation and impact phases');
   if(anchored)assert.ok(Math.abs(rotationShot.actor[0]-rotationShot.target[0])+Math.abs(rotationShot.actor[1]-rotationShot.target[1])>=16,'anchored strike stays in front of large bodies');
   assert.deepEqual(restored.position,initialTarget,'target restored');assert.equal(damage.length,1);assert.equal(damage[0].target,target);assert.equal(await io.read(0x5e34+slot*128,2),mp-1);assert.equal(audio.clipped,0);assert.ok(audio.nonzero>0);
   for(let n=0;n<180&&await io.read(0x95d5)!==slot;n++){if(await io.read(0x95d5)<3)await io.tap(64,12);await io.wait(24);}
   assert.equal(await io.read(0x95d5),slot);await chooseNativeTech(io,bytes,slot,2);await io.wait(700);assert.equal(await io.read(0x5e34+slot*128,2),mp-2);report.followingEyeLasers=true;casts.push(report);
  }
  for(const party of section==='tank'?[]:[[0,1,2],[1,0,2],[1,2,0]]){
   await request({op:'loadstate',file:path.join(out,'kit.state')});await write(0x2980,[...party,3,4,5,6,128,128]);
   // All writes end at the checkpoint. Enter and play the authored encounter.
   await write(0x1238e,[0xe0,151,0,8,13,0xb2]);await io.wait(420);await io.hold(16,75);await io.wait(90);
   await until(0xaf08,151);await io.wait(400);await cast(party,'clowns-slot-'+party.indexOf(0),false);
   if(party[0]===0){await until(0xaf05,153);await io.wait(300);await cast(party,'milenko',true);}
  }
  if(section!=='clowns'){
  await request({op:'loadstate',file:path.join(out,'kit.state')});
  const before=Uint8Array.from(await io.bytes(0,0x20000)),after=before.slice();seedTrialCheckpoint(after,'prison-tank');
  for(let p=0;p<after.length;){if(before[p]===after[p]){p++;continue;}const start=p;while(p<after.length&&before[p]!==after[p])p++;await write(start,after.slice(start,p));}
  await write(0x1238e,[0xe0,28,4,25,9,0xb2]);await io.wait(400);await io.hold(64,20);await until(0x12a,39);await io.wait(180);await io.tap();await io.hold(64,200);await until(0xaf02,147);await io.wait(240);
  assert.equal(await io.read(0xaf08),173);assert.equal(await io.read(0xaf09),148);await cast([0,1,2],'tank-body',true);
  }
  return{sha256,casts,setup:'Strong checkpoint loadout; ordinary native encounters and controller input only after entry.'};
 });
 await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2));reports.push({core:name,...result});console.log(name,sha256,result.frames,'frames: Piledriver lift, anchored boss and multipart battle checks passed');
}
await writeFile(path.join(root,section==='all'?'report.json':section+'-report.json'),JSON.stringify({sha256,reports},null,2));
