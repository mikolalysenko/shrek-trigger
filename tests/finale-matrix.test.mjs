import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16,put16} from '../engine/rom.js';
import {attackNativeEnemy,chooseNativeTech,useNativeItem} from './battle-controller.mjs';

// Diagnostic mechanism fixtures, not campaign-completion or balance evidence.
// Native speed-menu input, the documented packed mode-bit write, developer
// scene setup and any explicit HP boundaries all finish before fixture() returns. Cases then use only RAM reads and ordinary
// controller input; the dead-target case has one additional, explicitly
// documented HP setup boundary at the third tell, before the dead-target
// cancellation interval begins.
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
console.log('finale matrix ROM SHA-256',createHash('sha256').update(built.rom).digest('hex'));
const modes=[['wait',0],['active',1]],speeds=Array.from({length:8},(_,i)=>i+1);
const partyHP=9999;

function controller(s){return{read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};}
function configureNativeOptions(s,mode,speed){
 const tap=(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);};
 tap(512,90);for(let i=0;i<3;i++)tap(128);tap(256,90);
 // Top-right Battle Speed: A enters the native value editor. Values 1..8 are
 // stored 0..7; the fresh native value is five (stored four).
 tap(128);tap(256);for(let i=0;i<Math.abs(speed-5);i++)tap(speed>5?128:64);for(let i=0;i<3;i++)tap(1,120);
 // The native packed mode bit is part of the documented fixture setup. This
 // avoids the original menu's non-committing second-visit edge at speed one.
 s.ram[0x2990]=(s.ram[0x2990]&0xef)|(mode<<4);
 assert.equal(s.ram[0x2990]&7,speed-1);assert.equal((s.ram[0x2990]>>4)&1,mode);
}
async function fixture({mode=1,speed=5,party=[0,1,2],strongParty=false,enemyHP=null,enemyMaxHP=null,clearEnemyImmunity=[]}={}){
 const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[],strikes=[],results=[],techs=[];
 h.on('battle.message',e=>messages.push({...e,frame:s.frames}));
 h.on('battle.enemy-tech',e=>{if(e.operand===built.audit.finaleAI.uppercut)strikes.push({...e,frame:s.frames});});
 h.on('battle.result',e=>results.push({...e,frame:s.frames}));h.on('battle.tech',e=>techs.push({...e,frame:s.frames}));
 configureNativeOptions(s,mode,speed);
 dev.jump({id:479,x:7,y:10,party,endgame:true});
 // Diagnostic learned-tech loadout after the developer jump's own setup and
 // before native battle initialization; setup ends before the fixture boundary.
 s.ram.fill(8,0x2830,0x2837);s.ram.fill(255,0x2837,0x283e);
 let found=false;for(let i=0;i<1500;i++){s.runFrame();if(s.ram[0xaf02]===206){found=true;break;}}
 assert.ok(found,'native Tyson formation loads');runFrames(s,180);dev.dispose();
 if(strongParty)for(let slot=0;slot<3;slot++){put16(s.ram,0x5e30+slot*128,partyHP);put16(s.ram,0x5e32+slot*128,partyHP);s.ram[0x5e6b+slot*128]=255;s.ram[0x5e6c+slot*128]=255;}
 if(enemyHP)for(const [slot,hp] of Object.entries(enemyHP))put16(s.ram,0x5e30+Number(slot)*128,hp);
 if(enemyMaxHP)for(const [slot,hp] of Object.entries(enemyMaxHP))put16(s.ram,0x5e32+Number(slot)*128,hp);
 for(const slot of clearEnemyImmunity){s.ram[0x5e50+slot*128]=0;s.ram[0x5e51+slot*128]=0;}
 assert.equal(s.ram[0x2990]&7,speed-1);assert.equal((s.ram[0x2990]>>4)&1,mode);
 // DOCUMENTED FIXTURE BOUNDARY. No writes occur after this point, except the
 // separately labeled pre-impact setup boundary in the dead-target case.
 return{s,h,io:controller(s),messages,strikes,results,techs,start:s.frames};
}
function closeFixture(f){assert.equal(f.s.cpu.stopped,false);f.h.dispose();}
async function until(f,predicate,limit=12000){for(let i=0;i<limit;i++){if(predicate())return sFrame(f);f.s.runFrame();}assert.fail('native condition timed out: '+JSON.stringify(diagnostics(f)));}
function sFrame(f){return f.s.frames;}
function diagnostics(f){return{frame:sFrame(f),location:u16(f.s.ram,0x100),phase:f.s.ram[0x5fe4],party:[...f.s.ram.slice(0xaeff,0xaf02)],hp:[0,1,2].map(i=>u16(f.s.ram,0x5e30+i*128)),enemyHP:[3,7,9].map(i=>u16(f.s.ram,0x5e30+i*128)),messages:f.messages.map(e=>[e.frame,e.messageId]),strikes:f.strikes.map(e=>e.frame),techs:f.techs.map(e=>[e.frame,e.actor,e.techId]),results:f.results.map(e=>[e.frame,e.actor,e.target,e.techId,e.value])};}
async function waitMessage(f,id,limit=12000){await until(f,()=>f.messages.some(e=>e.messageId===id),limit);return f.messages.find(e=>e.messageId===id);}
async function chooseFart(f,slot){
 const before=MP(f.s,slot);await until(f,()=>f.s.ram[0x95d5]<=2,5000);await chooseNativeTech(f.io,built.rom,slot,1);await until(f,()=>f.results.some(e=>e.techId===1&&e.actor===slot),4000);
 assert.ok(f.results.some(e=>e.techId===1&&e.actor===slot),'following native Fart resolves');assert.equal(MP(f.s,slot),before-1,'native Fart uses its established one-MP source cost');
}
function MP(s,slot){return u16(s.ram,0x5e34+slot*128);}

test('finale timing matrix: Active/Wait, all eight native battle speeds, KO, recovery and following tell',async()=>{
 const observed={wait:[],active:[]};
 for(const [name,mode] of modes)for(const speed of speeds){
  const f=await fixture({mode,speed,strongParty:true}),{s}=f;
  const tell=await waitMessage(f,247);await until(f,()=>f.strikes.length===1,5000);
  const strike=f.strikes[0];await until(f,()=>s.ram[0xaeff]===255,1000);const ko=s.frames;
  assert.equal(u16(s.ram,0x5e30),0);assert.equal(s.ram[0x5fe4],4);assert.ok(strike.frame-tell.frame>=120);
  const recovery=await waitMessage(f,251,3000),following=await waitMessage(f,248,5000);
  assert.ok(tell.frame<strike.frame&&strike.frame<=ko&&ko<recovery.frame&&recovery.frame<following.frame,JSON.stringify(diagnostics(f)));
  assert.equal(f.strikes.length,1,'one uppercut before the following tell');
  observed[name].push({speed,tellToStrike:strike.frame-tell.frame,tellToKO:ko-tell.frame,koToRecovery:recovery.frame-ko,recoveryToFollowing:following.frame-recovery.frame});
  closeFixture(f);
 }
 console.log('finale timing matrix',JSON.stringify(observed));
 for(const [name,rows] of Object.entries(observed)){
  for(const row of rows)for(const [key,value] of Object.entries(row))if(key!=='speed')assert.ok(value>0,name+' speed '+row.speed+' '+key);
  // The original ATB/animation scheduler is quantized: speeds three and six
  // shorten tell-to-strike but lengthen KO-to-recovery. Do not invent a
  // monotonicity requirement; require the actual slow/fast distinction.
  assert.ok(rows[7].tellToStrike>rows[0].tellToStrike,'native battle speed changes windup timing');
 }
 assert.deepEqual(observed.active,observed.wait,'with no menu open, Active and Wait share native timing');
});

test('all three locked target positions survive native cycles; early revival does not retarget and a following action works',async()=>{
 const f=await fixture({mode:0,speed:8,party:[0,4,1],strongParty:true}),{s,io}=f;
 await waitMessage(f,247);await waitMessage(f,251);await waitMessage(f,248);await waitMessage(f,249,16000);
 assert.equal(f.strikes.length,2,'slots zero and one were uppercut victims before slot two');
 assert.equal(s.ram[0xaeff],255);assert.equal(s.ram[0xaeff+1],255);assert.ok(u16(s.ram,0x5f30)>0,JSON.stringify(diagnostics(f)));
 // Only the third target is alive. Fiona's native Life II revives an earlier
 // slot during its windup. Tyson must retain slot two, not choose slot zero.
 await chooseNativeTech(io,built.rom,2,16,{target:0});await until(f,()=>s.ram[0xaeff]===0&&u16(s.ram,0x5e30)>50,4000);
 await until(f,()=>f.strikes.length===3,6000);
 await until(f,()=>s.ram[0xaeff+2]===255,1000);assert.equal(s.ram[0x5fe4],4);assert.equal(u16(s.ram,0x5f30),0,'locked target, not revived slot zero, is knocked out');
 assert.equal(s.ram[0xaeff],0,'revived earlier slot survives the locked strike');
 await useNativeItem(io,199,2);assert.equal(s.ram[0xaeff+2],1);assert.equal(u16(s.ram,0x5f30),50);
 await waitMessage(f,251);await chooseFart(f,0);
 assert.equal(f.results.filter(e=>e.techId===built.audit.finaleAI.uppercut).length,3);
 assert.ok(!s.ram.subarray(0x2980,0x2983).includes(2),'Donkey is absent for starter item revival');
 closeFixture(f);
});

test('a locked target killed by native enemies cancels without retargeting and recovers',async()=>{
 const f=await fixture({mode:0,speed:8,party:[0,4,1],strongParty:true}),{s}=f;
 await waitMessage(f,247);await waitMessage(f,248);await waitMessage(f,249,16000);
 assert.equal(f.strikes.length,2);
 await chooseNativeTech(f.io,built.rom,2,16,{target:0});
 await until(f,()=>s.ram[0xaeff]===0&&u16(s.ram,0x5e30)>50,4000);
 // DOCUMENTED PRE-IMPACT FIXTURE BOUNDARY. The first two KOs/recoveries and
 // Shrek's revival were native. Seed the already locked Fiona at one HP now;
 // subsequent enemy damage, cancellation, targeting and recovery are read-only.
 put16(s.ram,0x5f30,1);
 await until(f,()=>s.ram[0xaeff+2]===255,6000);
 const canceled=await waitMessage(f,246,4000);assert.ok(canceled);
 assert.equal(f.strikes.length,2,'dead locked target never dispatches the third uppercut');
 assert.ok(u16(s.ram,0x5e30)>0,'revived Shrek is not retargeted');assert.equal(s.ram[0xaeff],0);
 await until(f,()=>f.messages.filter(e=>e.messageId===251).length===3,4000);closeFixture(f);
});

test('diagnostic susceptible Tyson is disabled during windup and the native uppercut resumes afterward',async()=>{
 // Tyson is normally Stop/Sleep immune. Clearing 5E50/5E51 here deliberately
 // isolates the windup-disable mechanism; it is not ordinary-battle evidence.
 const f=await fixture({mode:0,speed:8,party:[3,4,0],strongParty:true,clearEnemyImmunity:[3]}),{s}=f;
 await waitMessage(f,247);await chooseNativeTech(f.io,built.rom,0,93);
 await until(f,()=>!!(s.ram[0x5e4b+3*128]&128),4000);
 assert.equal(f.strikes.length,0,'Stop lands before uppercut dispatch');assert.equal(s.ram[0x5fe4],1);
 const stoppedAt=s.frames;for(let i=0;i<240;i++){s.runFrame();assert.equal(f.strikes.length,0,'disabled Tyson cannot release the uppercut');}
 assert.ok(s.ram[0x5e4b+3*128]&128,'native Stop remains in force during the hold');
 await until(f,()=>f.strikes.length===1,10000);assert.ok(s.frames-stoppedAt>240,'uppercut is delayed, not dispatched while disabled');
 await until(f,()=>s.ram[0xaeff]===255,1000);await waitMessage(f,251,4000);closeFixture(f);
});

test('native Flame Toss kills Tyson during windup without a queued strike and the battle accepts a following attack',async()=>{
 const f=await fixture({mode:0,speed:8,party:[0,1,2],enemyHP:{3:1},enemyMaxHP:{3:1}}),{s,io}=f;
 await waitMessage(f,247);await chooseNativeTech(io,built.rom,2,17,{target:3});
 await until(f,()=>s.ram[0xaeff+3]===255,3000);assert.equal(u16(s.ram,0x5e30+3*128),0);
 assert.equal(f.strikes.length,0,'dead Tyson cannot release the windup strike');assert.notEqual(s.ram[0x5fe4],4);
 assert.ok(s.ram[0x117]&1,'ward and core keep the battle active');assert.ok(u16(s.ram,0x5e30)>0,'locked party target survives');
 const wardBefore=u16(s.ram,0x5e30+7*128);await attackNativeEnemy(io,237,{targetSlot:7});await until(f,()=>u16(s.ram,0x5e30+7*128)<wardBefore,4000);
 closeFixture(f);
});

test('Donkey-absent native ward rebuild emits the universal revival hint without post-boundary HP assists',async()=>{
 const f=await fixture({mode:0,speed:8,party:[3,4,0],strongParty:true,enemyHP:{7:1}}),{s,io}=f;
 assert.ok(!s.ram.subarray(0x2980,0x2983).includes(2));await attackNativeEnemy(io,237,{targetSlot:7});
 await until(f,()=>s.ram[0xaeff+7]===255,4000);await until(f,()=>s.ram[0x62eb]===127,4000);
 await until(f,()=>s.ram[0xaeff+7]!==255&&u16(s.ram,0x5e30+7*128)>0,8000);
 await until(f,()=>f.messages.some(e=>e.messageId===195),2000);
 assert.ok(f.messages.some(e=>e.messageId===195),'unconditional native rebuild hint');closeFixture(f);
});

test('exact native victory leaves Tyson standing with no post-boundary HP or flag writes',async()=>{
 const f=await fixture({mode:0,speed:8,party:[3,4,0],strongParty:true,enemyHP:{9:1}}),{s,io}=f;
 await attackNativeEnemy(io,239,{targetSlot:9});await until(f,()=>u16(s.ram,0x5e30+9*128)===0,4000);
 assert.ok(u16(s.ram,0x5e30+3*128)>0,'Tyson still has HP when the true core dies');
 await until(f,()=>u16(s.ram,0x100)!==479,6000);assert.equal(u16(s.ram,0x100),82);closeFixture(f);
});
