import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {attackNativeEnemy,chooseNativeTech,useNativeItem} from '../tests/battle-controller.mjs';

// Diagnostic mechanism acceptance only. Strong stats, one-HP enemies and the
// labeled immunity/HP boundaries are not normal-level completion or balance
// evidence. Native speed menus are controller-driven; the packed mode bit,
// party/loadout, HP and immunity setup writes end at each documented boundary.
// Subsequent checks use only reads and native controller input.
const requested=process.argv[2]??'all',section=process.argv.find(a=>a.startsWith('--section='))?.slice(10)??'all';
if(!['all','snes9x','bsnes'].includes(requested)||!['all','timing','mechanisms'].includes(section))throw Error('Usage: check-finale-matrix.mjs [all|snes9x|bsnes] [--section=all|timing|mechanisms] [--rom=path]');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu','../../../secret-of-goku/.local/tools/emu']){const file=path.resolve(dir,name);try{await access(file);return file;}catch{}}
 throw Error('Set '+env+' to an installed '+name);
}
const built=await build(),override=process.argv.find(a=>a.startsWith('--rom='))?.slice(6);
if(override)built.rom=new Uint8Array(await readFile(path.resolve(override)));
const sha256=createHash('sha256').update(built.rom).digest('hex'),root=path.resolve('.local/qa/finale-matrix-'+sha256.slice(0,12));
await mkdir(root,{recursive:true});const rom=path.join(root,'candidate.sfc');await writeCandidate(rom,built.rom);
const host=await tool('RETRO_HOST','retro-host'),reports=[],modes=[['wait',0],['active',1]],speeds=Array.from({length:8},(_,i)=>i+1),partyHP=9999;

for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,name+'-'+section);
 const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  for(const[frames,input]of newGameSequence)await io.hold(input,frames);
  assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);
  // Reversible native new-game/loadout fixture. This is the same inventory and
  // learned-tech kit used by existing independent boss mechanism checks.
  await write(0x29af,[254]);await write(0x2830,Array(7).fill(8));await write(0x2837,Array(7).fill(255));
  await write(0x283e,Array(15).fill(224));await write(0x284d,Array(15).fill(128));
  for(const id of[189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178]){
   const inventory=await io.bytes(0x2400,256);let slot=inventory.indexOf(id);if(slot<0)slot=inventory.indexOf(0);assert.ok(slot>=0);
   await write(0x2400+slot,[id]);await write(0x2500+slot,[20]);
  }
  for(let id=0;id<7;id++){
   const p=0x2600+id*80;await write(p+3,[231,3,231,3,99,0,99,0]);
   await write(p+0xb,[65,60,12,60,60,50,60]);await write(p+0x12,[60]);await write(p+0x36,[65,60,12,60,60,50,60]);
   await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);await write(p+0x3d,[200,220,231,3]);
  }
  await request({op:'savestate',name:'kit'});
  const load=()=>request({op:'loadstate',file:path.join(out,'kit.state')});
  const until=async(addr,value,frames=15000,options={})=>{const r=await request({op:'until',mem:'wram',addr,size:1,value,frames,...options});assert.ok(r.met,'native condition '+addr.toString(16)+'='+value+': '+JSON.stringify(r));return r;};
  const poll=async(predicate,frames=12000)=>{for(let i=0;i<frames;i++){if(await predicate())return i;await io.wait(1);}assert.fail('native polled condition timed out');};
  async function configureSpeed(speed){
   await io.tap(512,90);for(let i=0;i<3;i++)await io.tap(128,12);await io.tap(256,90);await io.tap(128,12);await io.tap(256,12);
   for(let i=0;i<Math.abs(speed-5);i++)await io.tap(speed>5?128:64,12);for(let i=0;i<3;i++)await io.tap(1,120);
   assert.equal(await io.read(0x2990)&7,speed-1);
  }
  async function enter({mode=1,speed=5,party=[0,1,2],strongParty=false,enemyHP={},enemyMaxHP={},clearEnemyImmunity=[]}={}){
   await load();await configureSpeed(speed);
   const packed=await io.read(0x2990);await write(0x2990,[(packed&0xef)|(mode<<4)]);
   await write(0x2980,[...party,...[0,1,2,3,4,5,6].filter(id=>!party.includes(id)),128,128]);await write(0x29af,[254]);
   await write(0x1238e,[0xe0,0xdf,1,7,10,0xb2]);await until(0xaf02,206);await io.wait(180);
   assert.deepEqual(Array.from(await io.bytes(0xaeff,11)),[...party,206,255,255,255,237,255,239,255]);
   if(strongParty)for(let slot=0;slot<3;slot++){
    await write(0x5e30+slot*128,[partyHP&255,partyHP>>8,partyHP&255,partyHP>>8]);await write(0x5e6b+slot*128,[255,255]);
   }
   for(const[slot,hp]of Object.entries(enemyHP))await write(0x5e30+Number(slot)*128,[hp&255,hp>>8]);
   for(const[slot,hp]of Object.entries(enemyMaxHP))await write(0x5e32+Number(slot)*128,[hp&255,hp>>8]);
   for(const slot of clearEnemyImmunity)await write(0x5e50+slot*128,[0,0]);
   assert.equal(await io.read(0x2990)&7,speed-1);assert.equal((await io.read(0x2990)>>4)&1,mode);
   // DOCUMENTED FIXTURE BOUNDARY. No writes below except the independently
   // labeled dead-target pre-impact one-HP seed.
   return{mode,speed,party,strongParty,enemyHP,enemyMaxHP,clearEnemyImmunity};
  }
  async function evidence(label,error){
   const state={label,error:String(error?.stack??error),location:await io.read(0x100,2),phase:await io.read(0x5fe4),packed:await io.read(0x2990),party:await io.bytes(0xaeff,11),hp:[],enemyStatus:await io.bytes(0x5e4b,11*128)};
   for(let slot=0;slot<11;slot++)state.hp.push(await io.read(0x5e30+slot*128,2));
   await io.shot(label+'-FAIL');await request({op:'savestate',name:label+'-FAIL'});await writeFile(path.join(out,label+'-FAIL.json'),JSON.stringify(state,null,2)+'\n');
  }
  const cases=[];
  async function run(label,fixture,check){
   try{const setup=await enter(fixture);const value=await check();const row={label,core:name,...setup,...value,status:'passed'};cases.push(row);console.log(name+' '+label+' passed '+JSON.stringify(value));return row;}
   catch(error){await evidence(label,error);throw error;}
  }
  async function chooseFart(slot){
   await poll(async()=>await io.read(0x95d5)<=2,5000);const mp=await io.read(0x5e34+slot*128,2);await chooseNativeTech(io,built.rom,slot,1);
   let dispatched=false;await poll(async()=>{dispatched||=await io.read(0xae91)===slot&&await io.read(0xae92)===2&&await io.read(0xae93)===1;return await io.read(0x5e34+slot*128,2)===mp-1;},4000);
   assert.ok(dispatched,'following native Fart dispatch');return{followingAction:'Fart',slot,mpBefore:mp,mpAfter:mp-1};
  }
  const timing={wait:[],active:[]};
  if(section==='all'||section==='timing')for(const[modeName,mode]of modes)for(const speed of speeds){
   await run(`timing-${modeName}-${speed}`,{mode,speed,strongParty:true},async()=>{
    const tell=await until(0x5fe4,1,5000),strike=await until(0x5fe4,4,5000),ko=await until(0xaeff,255,1000);
    assert.equal(await io.read(0x5e30,2),0);const recovery=await until(0x5fe4,5,3000),following=await until(0x5fe4,2,5000);
    const value={tellToStrike:strike.frame-tell.frame,tellToKO:ko.frame-tell.frame,koToRecovery:recovery.frame-ko.frame,recoveryToFollowing:following.frame-recovery.frame,frames:{tell:tell.frame,strike:strike.frame,ko:ko.frame,recovery:recovery.frame,following:following.frame}};
    for(const[key,n]of Object.entries(value))if(key!=='frames')assert.ok(n>0,key);assert.ok(value.tellToStrike>=120);timing[modeName].push({speed,...value});return value;
   });
  }
  if(section==='all'||section==='timing'){
   assert.deepEqual(timing.active.map(({frames,...row})=>row),timing.wait.map(({frames,...row})=>row),'closed-menu Active/Wait timing on this core');
   for(const rows of Object.values(timing))assert.ok(rows[7].tellToStrike>rows[0].tellToStrike,'native Fast/Slow timing distinction');
  }
  if(section==='all'||section==='mechanisms'){
   await run('targets-revival-following',{mode:0,speed:8,party:[0,4,1],strongParty:true},async()=>{
    await until(0x5fe4,1);await until(0x5fe4,5,5000);await until(0x5fe4,2,6000);await until(0x5fe4,5,5000);await until(0x5fe4,3,6000);
    assert.equal(await io.read(0xaeff),255);assert.equal(await io.read(0xaeff+1),255);assert.ok(await io.read(0x5f30,2)>0);
    await chooseNativeTech(io,built.rom,2,16,{target:0});await poll(async()=>await io.read(0xaeff)===0&&await io.read(0x5e30,2)>50,4000);
    await until(0x5fe4,4,6000);await until(0xaeff+2,255,1000);assert.equal(await io.read(0x5f30,2),0);assert.equal(await io.read(0xaeff),0,'revived earlier slot is not retargeted');
    await useNativeItem(io,199,2);assert.equal(await io.read(0xaeff+2),1);assert.equal(await io.read(0x5f30,2),50);await until(0x5fe4,5,4000);
    const following=await chooseFart(0);assert.ok(!(await io.bytes(0x2980,3)).includes(2),'Donkey absent for starter revival');
    return{targets:[0,1,2],changedTargetRetained:2,starterRevivalHP:50,following};
   });
   await run('dead-target-cancel',{mode:0,speed:8,party:[0,4,1],strongParty:true},async()=>{
    await until(0x5fe4,1);await until(0x5fe4,5,5000);await until(0x5fe4,2,6000);await until(0x5fe4,5,5000);await until(0x5fe4,3,6000);
    await chooseNativeTech(io,built.rom,2,16,{target:0});await poll(async()=>await io.read(0xaeff)===0&&await io.read(0x5e30,2)>50,4000);
    // DOCUMENTED PRE-IMPACT FIXTURE BOUNDARY: Fiona is already locked. This is
    // the sole post-enter HP setup write; all death/cancellation below is native.
    await write(0x5f30,[1,0]);let uppercut=false;
    await poll(async()=>{uppercut||=await io.read(0xb18b)===3&&await io.read(0xb18c)===built.audit.finaleAI.uppercut;return await io.read(0xaeff+2)===255;},6000);
    await poll(async()=>{uppercut||=await io.read(0xb18b)===3&&await io.read(0xb18c)===built.audit.finaleAI.uppercut;return await io.read(0x5fe4)===4;},4000);assert.equal(uppercut,false,'dead locked target never dispatches uppercut');assert.equal(await io.read(0xaeff),0);assert.ok(await io.read(0x5e30,2)>0);
    await until(0x5fe4,5,4000);return{deadTarget:2,canceled:true,retargeted:false,recovery:true};
   });
   await run('windup-disable-diagnostic',{mode:0,speed:8,party:[3,4,0],strongParty:true,clearEnemyImmunity:[3]},async()=>{
    await until(0x5fe4,1);await chooseNativeTech(io,built.rom,0,93);await poll(async()=>!!(await io.read(0x5e4b+3*128)&128),4000);
    assert.equal(await io.read(0x5fe4),1);for(let i=0;i<240;i++){await io.wait(1);assert.notEqual(await io.read(0x5fe4),4);assert.ok(await io.read(0x5e4b+3*128)&128);}
    const strike=await until(0x5fe4,4,10000);await until(0xaeff,255,1000);await until(0x5fe4,5,4000);
    return{fixture:'Tyson Stop immunity cleared before boundary; diagnostic only',stoppedForAtLeast:240,strikeFrame:strike.frame,recovery:true};
   });
   await run('windup-kill',{mode:0,speed:8,party:[0,1,2],enemyHP:{3:1},enemyMaxHP:{3:1}},async()=>{
    await until(0x5fe4,1);await chooseNativeTech(io,built.rom,2,17,{target:3});await until(0xaeff+3,255,3000);
    assert.notEqual(await io.read(0x5fe4),4);assert.ok(await io.read(0x5e30,2)>0);assert.ok(await io.read(0x117)&1);
    const before=await io.read(0x5e30+7*128,2);await attackNativeEnemy(io,237,{targetSlot:7});await poll(async()=>await io.read(0x5e30+7*128,2)<before,4000);
    return{tysonKilledDuringWindup:true,uppercutCanceled:true,followingWardDamage:true};
   });
   await run('donkey-absent-universal-hint-branch',{mode:0,speed:8,party:[3,4,0],strongParty:true,enemyHP:{7:1}},async()=>{
    assert.ok(!(await io.bytes(0x2980,3)).includes(2));await attackNativeEnemy(io,237,{targetSlot:7});await until(0xaeff+7,255,4000);await until(0x62eb,127,4000);
    await poll(async()=>await io.read(0xaeff+7)!==255&&await io.read(0x5e30+7*128,2)>0,8000);return{wardDeath:true,coreExposed:true,nativeRebuild:true,donkeyAbsent:true,messageEvidence:'in-process hooks in tests/finale-matrix.test.mjs'};
   });
   await run('exact-victory-tyson-standing',{mode:0,speed:8,party:[3,4,0],strongParty:true,enemyHP:{9:1}},async()=>{
    await attackNativeEnemy(io,239,{targetSlot:9});await until(0x5e30+9*128,0,4000,{size:2});const tysonHP=await io.read(0x5e30+3*128,2);assert.ok(tysonHP>0);
    await poll(async()=>await io.read(0x100,2)!==479,6000);assert.equal(await io.read(0x100,2),82);await io.shot('exact-victory-tyson-standing');return{coreDefeated:true,tysonHP,location:82};
   });
  }
  return{core:name,section,sha256,scope:'Diagnostic mechanism fixtures only; not normal-level campaign completion or balance evidence',timing,cases};
 });
 await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');reports.push(result);console.log(name+' '+section+' finale matrix passed '+sha256);
}
await writeFile(path.join(root,section+'-report.json'),JSON.stringify({sha256,scope:'Diagnostic mechanism fixtures only; not normal-level campaign completion or balance evidence',reports},null,2)+'\n');
