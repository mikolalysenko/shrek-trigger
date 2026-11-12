import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {chooseNativeTech,attackNativeEnemy} from '../tests/battle-controller.mjs';
import {saveNativeSlot,reachOpeningOverworld} from '../tests/opening-controller.mjs';
import {movement} from '../tests/medina-controller.mjs';

// Diagnostic technique acceptance, not normal-level balance evidence. Loadouts,
// party order and progression boundaries are written only in native fields.
// Once E0 enters an encounter, that case uses reads and controller input only.
// Console reset/reload and the native save menu replace savestates throughout.
const requested=process.argv[2]??'all';
const section=process.argv.find(a=>a.startsWith('--section='))?.slice(10)??'all';
const techFilter=process.argv.find(a=>a.startsWith('--tech='))?.slice(7),startFilter=Number(process.argv.find(a=>a.startsWith('--start='))?.slice(8)??1);
const ownerArgument=process.argv.find(a=>a.startsWith('--owner=')),ownerFilter=ownerArgument?Number(ownerArgument.slice(8)):null,comboArgument=process.argv.find(a=>a.startsWith('--combo=')),comboFilter=comboArgument?Number(comboArgument.slice(8)):null,localArgument=process.argv.find(a=>a.startsWith('--local=')),localFilter=localArgument?Number(localArgument.slice(8)):null,singlesOnly=process.argv.includes('--singles-only'),captureFrames=process.argv.includes('--capture');
const override=process.argv.find(a=>a.startsWith('--rom='))?.slice(6);
if(!['all','snes9x','bsnes'].includes(requested)||!['all','persistence','execution','progression','mechanisms'].includes(section))throw Error('Usage: check-technique-matrix.mjs [all|snes9x|bsnes] [--section=all|persistence|execution|progression|mechanisms] [--tech=id] [--start=id] [--owner=id] [--combo=id] [--local=1..8] [--singles-only] [--capture] [--rom=path]');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu','../../../secret-of-goku/.local/tools/emu']){const file=path.resolve(dir,name);try{await access(file);return file;}catch{}}
 throw Error('Set '+env+' to an installed '+name);
}
const built=await build(),bytes=override?new Uint8Array(await readFile(path.resolve(override))):built.rom;
const techs=JSON.parse(await readFile('content/techs.json','utf8'));
const sha256=createHash('sha256').update(bytes).digest('hex'),root=path.resolve('.local/qa/technique-matrix-'+sha256.slice(0,12));
await mkdir(root,{recursive:true});const rom=path.join(root,'candidate.sfc');await writeCandidate(rom,bytes);
const host=await tool('RETRO_HOST','retro-host'),reports=[];
const custom=new Set([1,2,4,7,8,24,25,28,30,33,34,36,37,39,40,42,43,44,46,47,48,63,64,66,69,71,81,90,93,94,95,98,105,108,109,110,111,114,115]);
const extraPositionCoverage=new Set([45,80,92,113,116]);
const buttons=new Map([[112,174],[113,175],[114,176],[115,177],[116,178]]);
const ordinaryForButton=new Map([[114,110],[115,105]]);
const parties=new Map();
for(const[ids,party]of[
 [[57,58,59],[0,1]],[[60,61,62],[0,2]],[[63,64,65],[0,3]],[[66,67,68],[0,4]],[[69,70,71],[0,5]],
 [[72,73,74],[1,2]],[[75,76,77],[1,3]],[[78,79,81],[1,4]],[[80,82,83],[1,5]],
 [[84,85,86],[2,3]],[[87,88,89],[2,5]],[[90,91,93],[3,4]],[[92,94,95],[3,5]],[[96,97,98],[4,5]],[[99,100,101],[2,4]],
 [[102],[0,1,2]],[[103],[0,1,3]],[[104],[0,1,4]],[[105],[0,1,5]],[[106],[0,2,3]],[[107],[0,2,4]],[[108],[0,2,5]],
 [[109],[0,3,4]],[[110],[0,3,5]],[[111],[0,4,5]],[[112],[1,2,6]],[[113],[0,2,6]],[[114],[0,3,5]],[[115],[0,1,5]],[[116],[0,4,6]]
])for(const id of ids)parties.set(id,party);
const comboGroups=new Map();
for(const[id,party]of parties){const key=party.join(',');if(!comboGroups.has(key))comboGroups.set(key,[]);comboGroups.get(key).push(id);}
const learnedGroup=new Map(),learnedBit=new Map();
[...comboGroups.values()].forEach((ids,group)=>ids.sort((a,z)=>a-z).forEach((id,i)=>{if(id<=101){learnedGroup.set(id,group);learnedBit.set(id,0x80>>i);}}));
// Native triple learned bytes are indexed by tech ID-102, not by party
// uniqueness. Do not confuse another ordinary triple's learned group here.
for(const id of[...Array.from({length:15},(_,i)=>102+i)]){learnedGroup.set(id,id-102);learnedBit.set(id,0x80);}
const executionCases=[];
for(let id=1;id<=116;id++){
 if(techFilter&&id!==Number(techFilter)||id<startFilter)continue;
 const participants=id<=56?[Math.floor((id-1)/8)]:parties.get(id),base=[...participants];
 if(id>56||custom.has(id)||extraPositionCoverage.has(id)||[6,16].includes(id))while(base.length<3){const filler=[0,1,2,3,4,5,6].find(v=>!base.includes(v));base.push(filler);}
 const rotations=!captureFrames&&(custom.has(id)||extraPositionCoverage.has(id))?[0,1,2]:[0];
 for(const rotation of rotations){
  const party=base.map((_,i)=>base[(i+rotation)%3]),slot=(3-rotation)%3;
  executionCases.push({id,party,slot,rotation});
 }
}
const partial=Boolean(techFilter)||ownerFilter!==null||comboFilter!==null||localFilter!==null||singlesOnly||startFilter!==1||section!=='all';

for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const out=path.join(root,name+(section==='all'?'':'-'+section)+(techFilter?'-tech-'+techFilter:'')+(startFilter!==1?'-start-'+startFilter:'')+(ownerFilter!==null?'-owner-'+ownerFilter:'')+(comboFilter!==null?'-combo-'+comboFilter:'')+(localFilter!==null?'-local-'+localFilter:'')+(singlesOnly?'-singles-only':''));
 const core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.'+(process.platform==='darwin'?'dylib':'so'));
 const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  const poll=async(predicate,frames=10000,label='native condition')=>{for(let i=0;i<frames;i++){if(await predicate())return i;await io.wait(1);}assert.fail(label+' timed out');};
  const projection=async()=>({location:await io.read(0x100,2),party:Array.from(await io.bytes(0x2980,9)),techniques:Array.from(await io.bytes(0x2830,0x2c)),characters:Array.from(await io.bytes(0x2600,0x230)),inventory:Array.from(await io.bytes(0x2400,0x200))});
  async function kit(){
   await write(0x29af,[254]);await write(0x10000,[0x5f]);await write(0x100f3,[0]);await write(0x101e0,[0x7f]);
   await write(0x2830,Array(7).fill(8));await write(0x2837,Array(7).fill(255));await write(0x283e,Array(15).fill(224));await write(0x284d,Array(15).fill(128));
   for(const id of[174,175,176,177,178,189,190,191,192,193,194,195,196,197,198,199,200]){
    const inventory=await io.bytes(0x2400,256);let slot=inventory.indexOf(id);if(slot<0)slot=inventory.indexOf(0);assert.ok(slot>=0,'inventory fixture slot');
    await write(0x2400+slot,[id]);await write(0x2500+slot,[20]);
   }
   for(let id=0;id<7;id++){
    const p=0x2600+id*80,stats=[1,99,12,1,90,50,99];
    await write(p+3,[231,3,231,3,99,0,99,0]);await write(p+0xb,stats);await write(p+0x12,[60]);await write(p+0x16,[0,0]);await write(p+0x36,stats);
    await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);await write(p+0x3d,[1,220,231,3]);
   }
  }
  let expected=null,persistence=null;
  async function loadNative({powerCycle=false}={}){
   await io.wait(400);await io.tap(8,1000);await io.tap(16,90);await io.tap(16,90);await io.tap(256,1500);
   assert.equal(await io.read(0x100,2),496,'native slot loads to the opening overworld');assert.equal(await io.read(0x11f),1,'native field input ready');
   const actual=await projection();
   assert.deepEqual(actual.techniques.slice(0,39),expected.techniques.slice(0,39),'native save restores every ordinary technique byte');
   assert.deepEqual(actual.techniques.slice(39),Array(5).fill(0),'native load rebuilds transient Button-gated availability without an equipped Button');
   for(let id=0;id<7;id++){
    assert.deepEqual(actual.characters.slice(id*80+0x12,id*80+0x1a),expected.characters.slice(id*80+0x12,id*80+0x1a),`native save restores level/TP ${id}`);
    assert.deepEqual(actual.characters.slice(id*80+0x27,id*80+0x2b),expected.characters.slice(id*80+0x27,id*80+0x2b),`native save restores equipment ${id}`);
   }
   assert.deepEqual(actual.inventory,expected.inventory,'native save restores Buttons and items');
   return{powerCycle,ordinaryTechniqueBytes:39,buttonAvailabilityRebuilt:true,levelTpAndEquipment:true,inventory:true};
  }
  if(section==='all'||section==='persistence'){
   await reachOpeningOverworld(io);await kit();expected=await projection();await saveNativeSlot(io,0);
   await request({op:'reload'});const powerCycle=await loadNative({powerCycle:true});
   await request({op:'reset'});const reset=await loadNative();
   const sram=await request({op:'dump',name:'technique-kit',mem:'sram',addr:0,len:8192,format:'bin'});assert.ok(sram.file);
   persistence={slot:1,powerCycle,reset,sramDump:path.basename(sram.file)};
  }
  async function fresh(progression=false){
   // A fresh game starts from the zeroed battery RAM the emulator launched with.
   // The persistence section saves a slot, and a retained save would make the
   // title screen continue it instead of starting a new game.
   await request({op:'fill',mem:'sram',value:0});await request({op:'reload'});for(const[frames,input]of newGameSequence)await io.hold(input,frames);
   assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);if(!progression)await kit();
  }
  async function enter(party,{fallen=null,button=null,counts=null,doubleBytes=null,tripleBytes=null,tp=null,remaining=null,initiator=null,offense=1,progression=false,frail=null,frailHP=1,finale=false,mode=0}={}){
   // DOCUMENTED FIXTURE BOUNDARY. Every write in this function precedes E0.
   assert.equal(await io.read(0x117)&1,0,'fixture starts outside battle');
   if(button!==null){const inventory=await io.bytes(0x2400,256);let slot=inventory.indexOf(button);if(slot<0)slot=inventory.indexOf(0);assert.ok(slot>=0,'Button fixture inventory');await write(0x2400+slot,[button]);await write(0x2500+slot,[1]);}
   const active=[...party];while(active.length<3)active.push(128);
   await write(0x2980,[...active,...[0,1,2,3,4,5,6].filter(id=>!party.includes(id)),128,128]);await write(0x29af,[254]);
   const packed=await io.read(0x2990);await write(0x2990,[(packed&0xef)|(mode<<4)]);
   const learnedCounts=counts??Array(7).fill(8);
   await write(0x2830,learnedCounts);await write(0x2837,learnedCounts.map(n=>n>=8?255:n<=0?0:(255<<(8-n))&255));await write(0x283e,doubleBytes??Array(15).fill(224));await write(0x284d,tripleBytes??Array(15).fill(128));
   for(const id of party){
    const p=0x2600+id*80,points=Array.isArray(tp)?tp[id]:tp,speed=initiator===null?60:party.indexOf(id)===initiator?99:60,next=Array.isArray(remaining)?remaining[id]:remaining;
    await write(p+0x2a,[button??163]);await write(p+0x16,points?[points&255,points>>8]:[0,0]);if(next!==undefined)await write(p+0x2d,[next&255,next>>8]);await write(p+0xd,[speed]);await write(p+0x38,[speed]);
    const stats=[offense,99,speed,offense,90,50,99];await write(p+0xb,stats);await write(p+0x36,stats);await write(p+0x3d,[offense,220,231,3]);if(progression)await write(p+0x12,[1]);
    await write(p+3,fallen===id?[0,0]:frail===id?[frailHP&255,frailHP>>8]:[231,3]);
   }
   if(finale){
    await write(0x1238e,[0xe0,0xdf,1,7,10,0xb2]);const r=await request({op:'until',mem:'wram',addr:0xaf02,value:206,frames:15000});assert.ok(r.met,'authored Tyson formation');await io.wait(180);
   }else if(progression){
    await write(0x10000,[0x5f]);await write(0x101e0,[0x7f]);await write(0x1238e,[0xe0,113,0,136,128,0xb2]);await io.wait(800);
    try{await movement(io).walk(136,96);}catch(error){if(!(await io.read(0x117)&1))throw error;}
    for(let n=0;n<500&&!(await io.read(0x117)&1);n++)await io.hold(65,1);assert.ok(await io.read(0x117)&1,'ordinary bridge encounter starts');await io.wait(350);
   }else{
    await write(0x1238e,[0xe0,151,0,8,13,0xb2]);await io.wait(420);await io.hold(16,75);await io.wait(90);
    let started=false;for(let n=0;n<5000;n++){
     if(await io.read(0xaf08)===151){started=true;break;}
     if(await io.read(0x126))await io.tap(256,30);else await io.wait(3);
    }
    assert.ok(started,'authored carnival formation initializes');await io.wait(300);
   }
   assert.deepEqual(Array.from(await io.bytes(0xaeff,3)),active.map(id=>id===fallen||id===128?255:id),'native battle party positions');
   if(finale)assert.equal(await io.read(0xaf02),206,'authored Tyson enemy formation');
   else if(!progression)assert.deepEqual(Array.from(await io.bytes(0xaf02,8)).filter(v=>v!==255),[151,152],'authored enemy formation');
   else assert.ok(Array.from(await io.bytes(0xaf02,8)).some(v=>v!==255),'ordinary reward-bearing enemy formation');
   // READ-ONLY / CONTROLLER BOUNDARY: no write calls below in this case.
   return{party,enemies:progression?'ordinary canyon':'authored carnival',fallen,button,fixture:progression?'ordinary TP-reward encounter':'authored carnival encounter'};
  }
  async function list(slot){
   for(let n=0;n<100&&await io.read(0x95d5)>2;n++)await io.wait(12);
   for(let i=0;i<6&&await io.read(0x95d5)!==slot;i++)await io.tap(64,12);
   assert.equal(await io.read(0x95d5),slot,'native list party slot');assert.equal(await io.read(0x95db),0);assert.equal(await io.read(0x9609),0);
   for(let i=0;i<3&&await io.read(0x95dc+slot)!==1;i++)await io.tap(await io.read(0x95dc+slot)<1?32:16);
   await io.tap(256);assert.equal(await io.read(0x95db),1);const value=Array.from(await io.bytes(0x94d0+bytes[0xcf38c+slot],20));await io.tap(1,30);return value;
  }
  async function observe(slot,id,{following=false,party=null}={}){
   const routed=id===24?[23,24]:id===39?[15,16,39]:[id],participantSlots=id>=57&&party?[...party.map((_,i)=>i),255]:id===45?[slot,255]:[slot];let seen=false,clean=false,transition=false,ended=0,seenAt=-1,mpFloor=null;const actions=new Set(),actors=new Set();
   const match=action=>routed.includes(action[2])&&(id===39?action[0]<3:participantSlots.includes(action[0]));
   for(let f=0;f<3000;f++){
    const action=await io.bytes(0xae91,3);if(action[1]===2)actions.add(action.join(','));
    if(action[1]===2&&match(action)){if(!seen)seenAt=f;seen=true;actors.add(action[0]);}
    // --capture: an animation strip for review, one shot every 8 frames.
    if(captureFrames&&seen&&!following&&(f-seenAt)%8===0&&f-seenAt<=320)await io.shot(`tech-${String(id).padStart(3,'0')}-slot-${slot}-${String(f-seenAt).padStart(3,'0')}`);
    if(seen){const current=[];for(let i=0;i<3;i++)current.push(await io.read(0x5e34+i*128,2));mpFloor??=current;for(let i=0;i<3;i++)mpFloor[i]=Math.min(mpFloor[i],current[i]);}
    if(seen&&f-seenAt>=120&&await io.read(0x95db)===1)await io.tap(1,12);
    if(seen&&f-seenAt>=120&&await io.read(0x95d5)<=2&&await io.read(0x95db)===0&&!await io.read(0x9609)){clean=true;break;}
    if(seen&&!(action[1]===2&&match(action))){ended++;if(ended>=90){clean=true;break;}}else ended=0;
    if(seen&&!(await io.read(0x117)&1)){transition=true;clean=true;break;}
    await io.wait(1);
   }
   assert.ok(seen,`${following?'following ':''}native technique ${id} dispatches from slot ${slot}; actions=${[...actions].join('|')}; queued=${Array.from(await io.bytes(0x93f4+slot*7,7))}`);assert.ok(clean,`${following?'following ':''}technique ${id} cleans its renderer/action; menu=${await io.read(0x95d5)},${await io.read(0x95db)},${await io.read(0x9609)}; battle=${await io.read(0x117)}; action=${Array.from(await io.bytes(0xae91,3))}`);
   return{seen,clean,transition,actionActors:[...actors],mpFloor};
  }
  async function secondEncounter(participants){
   if(!participants.includes(0))await write(0x2980,[0,1,2]);
   for(const[x,y]of[[136,128],[120,128],[96,128],[64,128],[32,128]])await movement(io).walk(x,y);
   for(let n=0;n<200&&await io.read(0x100,2)===113;n++)await io.hold(65,1);await io.wait(500);assert.equal(await io.read(0x100,2),112);
   for(const[x,y]of[[456,216],[456,192],[456,160],[456,128],[456,96],[408,96],[408,80],[392,80],[376,80]]){
    try{await movement(io).walk(x,y);}catch(error){if(!(await io.read(0x117)&1))throw error;break;}
   }
   assert.equal(await io.read(0x117)&1,0,'party-order fixture remains before the second battle');
   const current=Array.from(await io.bytes(0x2980,3)),ordered=[...participants,...current.filter(id=>!participants.includes(id)&&id!==128)];while(ordered.length<3)ordered.push(128);await write(0x2980,ordered);
   for(let n=0;n<500&&!(await io.read(0x117)&1);n++)await io.hold(65,1);assert.ok(await io.read(0x117)&1,'second ordinary bridge encounter');await io.wait(350);
   return{ordered,fieldParty:Array.from(await io.bytes(0x2980,3)),battleParty:Array.from(await io.bytes(0xaeff,3)),joined:await io.read(0x29af)};
  }
  async function select(slot,id,options={}){
   for(let attempt=0;attempt<16;attempt++)try{return await chooseNativeTech(io,bytes,slot,id,{...options,attempt:options.attempt??1});}catch(error){
    if(!(await io.read(0x117)&1)||!/Native tech window did not open|Requested party member is not ready|Battle command menu is not ready|Could not select native Tech command/.test(String(error)))throw error;
    await io.wait(120);
   }
   assert.fail('native technique selection survives repeated enemy interruptions');
  }
  async function victory(expectedLocation=113){
   let formation=Array(8).fill(255);
   for(let n=0;n<120&&(await io.read(0x117)&1);n++){
    formation=Array.from(await io.bytes(0xaf02,8));let target=-1;
    for(let i=0;i<8;i++)if(formation[i]!==255&&await io.read(0x5e30+(i+3)*128,2)>0){target=i+3;break;}
    if(target<0){await io.wait(60);continue;}
    await attackNativeEnemy(io,formation[target-3],{targetSlot:target});await io.wait(30);
   }
   await poll(async()=>!(await io.read(0x117)&1),10000,'native victory and scene transition');
   for(let n=0;n<40&&(await io.read(0x100,2)!==expectedLocation||await io.read(0x126));n++)await io.tap(256,60);
   assert.equal(await io.read(0x100,2),expectedLocation,'battle returns through the native field scene');
   const fieldParty=Array.from(await io.bytes(0x2980,3));let living=false;for(const id of fieldParty)if(id<7&&await io.read(0x2603+id*80,2)>0)living=true;assert.ok(living,'rewarded victory retains a living field party member');
   for(let i=0;i<8;i++)if(formation[i]!==255)assert.equal(await io.read(0x5e30+(i+3)*128,2),0,`enemy ${i+3} is defeated for progression`);
   await io.wait(300);
  }
  const executions=[];
  async function executeOne({id,party,slot,rotation}){
   const fallen=[6,16,39].includes(id)?party[(slot+1)%3]:null,button=buttons.get(id)??null;
   const setup=await enter(party,{fallen,button,initiator:slot,finale:id>=31});
   if(id===114||id===115||id===105||id===110){
    const options=await list(slot),ordinary=ordinaryForButton.get(id)??(id===105?115:114);
    assert.ok(options.includes(id),`native menu contains ${id}`);assert.ok(!options.includes(ordinary),`one-triple menu excludes ${ordinary} when ${id} is selected`);
   }
   const mpBefore=[];for(let i=0;i<3;i++)mpBefore.push(await io.read(0x5e34+i*128,2));
   await select(slot,id,{target:fallen===null?undefined:(slot+1)%3});const observed=await observe(slot,id,{party});
   const mpAfter=[];for(let i=0;i<3;i++)mpAfter.push(await io.read(0x5e34+i*128,2));
   const mpEvidence=observed.mpFloor??mpAfter;
   // Some May Die (56) costs Farquaad nothing: 0 MP by design.
   if(id===56)assert.deepEqual([...mpEvidence],[...mpBefore],'Some May Die spends no MP');
   else assert.ok(mpEvidence.some((v,i)=>v<mpBefore[i]),`technique ${id} spends its native MP (${mpBefore} -> ${mpEvidence}; field ${mpAfter})`);
   let following=null;
   if(!captureFrames&&(custom.has(id)||extraPositionCoverage.has(id))){
    await fresh();await enter(party,{initiator:slot});
    let nextSlot=await io.read(0x95d5);for(let n=0;n<100&&nextSlot>2;n++){await io.wait(12);nextSlot=await io.read(0x95d5);}
    assert.ok(nextSlot<=2,'following native actor becomes ready');const next=party[nextSlot]*8+1;
    await select(nextSlot,next);following={id:next,slot:nextSlot,newEncounter:true,...await observe(nextSlot,next,{following:true,party})};
   }
   return{id,name:techs[id-1].name,party,slot,rotation,custom:custom.has(id),modifiedPositionCoverage:extraPositionCoverage.has(id),button,fallen,setup,...observed,mpBefore,mpAfter,mpEvidence,following,writesAfterBoundary:0};
  }
  if(section==='all'||section==='execution')for(const testCase of executionCases){
   await fresh();
   const row=await executeOne(testCase);executions.push(row);console.log(`${name} execution ${row.id} slot ${row.slot} passed`);
  }
  const progression=[];
  async function learnCase(kind,id,participants,options,check){
   const party=participants.includes(0)||participants.length>=3?[...participants]:[0,...participants];if(!options.solo)while(party.length<3)party.push([0,1,2,3,4,5,6].find(v=>!party.includes(v)));
   const trace=[];
   const probe=async stage=>{const row={stage,location:await io.read(0x100,2),fieldParty:Array.from(await io.bytes(0x2980,3)),battleParty:Array.from(await io.bytes(0xaeff,3)),joined:await io.read(0x29af),counts:Array.from(await io.bytes(0x2830,7)),masks:Array.from(await io.bytes(0x2837,7)),tp:[]};for(let owner=0;owner<7;owner++)row.tp.push(await io.read(0x2616+owner*80,2));row.actorIds=[await io.read(0x5e2d),await io.read(0x5ead),await io.read(0x5f2d)];row.actorFlags=[await io.read(0x5e2f),await io.read(0x5eaf),await io.read(0x5f2f)];row.doubleBytes=Array.from(await io.bytes(0x283e,15));row.tripleBytes=Array.from(await io.bytes(0x284d,15));row.actorTp=[await io.read(0x5e5a,2),await io.read(0x5eda,2),await io.read(0x5f5a,2)];row.nextTp=[];for(let owner=0;owner<7;owner++)row.nextTp.push(await io.read(0x2616+owner*80+0x17,2));trace.push(row);if(ownerFilter!==null||comboFilter!==null)console.log(name+' '+kind+' '+id+' '+JSON.stringify(row));return row;};
   await fresh(true);
   const setup=await enter(party,{offense:99,progression:true,...options});await probe('first-battle-start');await victory(113);await probe('after-first-victory');let second=null,value;
   if(kind==='single'){second=await secondEncounter(participants);await probe('second-battle-start');await victory(112);await probe('after-second-victory');}
   try{value=await check();}catch(error){console.error(JSON.stringify({kind,id,second,trace},null,2));throw error;}
   const row={kind,id,party,setup,second,trace,...value,status:'passed',writesAfterBoundary:0};progression.push(row);console.log(`${name} progression ${kind} ${id} passed`);
  }
  if(section==='all'||section==='progression'){
   // The native learner consumes the remaining-TP word at character+$2D;
   // character+$16 is the cumulative total checked by this report. Seed both
   // coherently so the two native rewards (3+2) reach the target threshold.
   for(let owner=0;owner<7&&!comboFilter;owner++){
    if(ownerFilter!==null&&owner!==ownerFilter)continue;
    const party=[owner],thresholds=Array.from({length:8},(_,i)=>built.base[0xc26fa+owner*16+i*2]|built.base[0xc26fa+owner*16+i*2+1]<<8);
    for(let local=1;local<=8;local++){
     if(localFilter!==null&&local!==localFilter)continue;
     const counts=Array(7).fill(8),tp=Array(7).fill(0),remaining=Array(7).fill(0),before=Math.max(0,thresholds[local-1]-5),after=before+5;counts[owner]=local-1;tp[owner]=before;remaining[owner]=thresholds[local-1]-before;
     // The native learner spends TP on one technique at a time: the 5 TP from
     // two encounters cover the seeded remainder, then only following zero-cost
     // (or still-affordable) entries. A later zero entry behind an unaffordable
     // one is not reachable (Shrek's third threshold is 0 behind 90).
     let budget=5,need=remaining[owner],expected=local-1;
     while(expected<8&&need<=budget){budget-=need;expected++;need=thresholds[expected]??Infinity;}
     await learnCase('single',owner*8+local,party,{counts,tp,remaining,doubleBytes:Array(15).fill(0),tripleBytes:Array(15).fill(0)},async()=>{const learned=(await io.bytes(0x2830,7))[owner],points=await io.read(0x2616+owner*80,2);assert.equal(points,after,'two native encounters award exactly 5 TP');assert.equal(learned,expected,`owner ${owner} crosses single ${local} threshold`);return{learned,expected,threshold:thresholds[local-1],tpBefore:before,tpAfter:points,remainingBefore:remaining[owner],victories:2};});
    }
   }
   // Seed earlier entries in each pair only to isolate the requested next
   // unlock. Required singles themselves are learned counts, not battle writes.
   for(let id=57;id<=116&&!singlesOnly;id++){
    if(comboFilter!==null&&id!==comboFilter)continue;
    const group=learnedGroup.get(id),bit=learnedBit.get(id),counts=Array(7).fill(8),tp=Array(7).fill(0),doubleBytes=Array(15).fill(0),tripleBytes=Array(15).fill(0);
    if(id<=101)for(let other=57;other<id;other++)if(learnedGroup.get(other)===group)doubleBytes[group]|=learnedBit.get(other);
    await learnCase(id<=111?'combination':'Button-triple',id,parties.get(id),{counts,tp,doubleBytes,tripleBytes,button:buttons.get(id)},async()=>{
     const actual=(await io.bytes(id<=101?0x283e:0x284d,15))[group];assert.ok(actual&bit,`native progression learns ${id}`);return{group,bit,learnedByte:actual};
    });
   }
   // Missing required singles must prevent moved doubles and every gated
   // triple from learning, even with the correct Button equipped.
   const negative=[];
   for(const[id,requirements]of[[80,[7,5]],[81,[2,4]],[92,[2,5]],[93,[4,4]]])negative.push({id,requirements});
   for(const r of built.audit.techniqueRevision.rockTriples)negative.push({id:r.id,requirements:r.requirements.map(t=>(t-1)%8+1)});
   negative.push({id:112,requirements:[6,6,8]});
   for(const {id,requirements} of singlesOnly?[]:negative){
    if(comboFilter!==null&&id!==comboFilter)continue;
    const counts=Array(7).fill(8),tp=Array(7).fill(0),doubleBytes=Array(15).fill(0),tripleBytes=Array(15).fill(0),group=learnedGroup.get(id),bit=learnedBit.get(id),party=parties.get(id);
    const local=id===80?15:id===81?10:id===92?26:id===93?28:id===112?14:built.audit.techniqueRevision.rockTriples.find(r=>r.id===id).requirements[0];
    const owner=Math.floor((local-1)/8),needed=(local-1)%8+1,remaining=Array(7).fill(0),threshold=built.base[0xc26fa+owner*16+(needed-1)*2]|built.base[0xc26fa+owner*16+(needed-1)*2+1]<<8;counts[owner]=Math.max(0,needed-1);tp[owner]=0;remaining[owner]=Math.max(6,threshold);
    if(id<=101)for(let other=57;other<id;other++)if(learnedGroup.get(other)===group)doubleBytes[group]|=learnedBit.get(other);
    await learnCase('missing-prerequisite',id,party,{counts,tp,remaining,doubleBytes,tripleBytes,button:buttons.get(id)},async()=>{const actual=(await io.bytes(id<=101?0x283e:0x284d,15))[group],actualCount=(await io.bytes(0x2830,7))[owner];assert.equal(actualCount,needed-1,`required single ${local} remains missing`);assert.equal(actual&bit,0,`tech ${id} does not learn without ${local}`);return{group,bit,learnedByte:actual,missingSingle:local,requiredCount:needed,actualCount,remainingThreshold:threshold,remainingBefore:remaining[owner]};});
   }
  }
  const mechanisms=[];
  if(section==='all'||section==='mechanisms'){
   async function openTech(slot){
    for(let i=0;i<6&&await io.read(0x95d5)!==slot;i++)await io.tap(64,12);assert.equal(await io.read(0x95d5),slot);
    for(let i=0;i<3&&await io.read(0x95dc+slot)!==1;i++)await io.tap(await io.read(0x95dc+slot)<1?32:16);await io.tap(256);assert.equal(await io.read(0x95db),1);
   }
   async function death(slot){for(let n=0;n<5000;n++){if(await io.read(0x5e30+slot*128,2)===0)return true;await io.wait(1);}assert.fail('native party death timed out');}
   await fresh();let party=[0,1,2];await enter(party,{initiator:0,mode:1});await openTech(0);let enemyAction=false,menuClosed=false;
   for(let n=0;n<5000;n++){
    if(await io.read(0xae91)>=3&&await io.read(0xae92)===2)enemyAction=true;
    if(enemyAction&&await io.read(0x95db)===0){menuClosed=true;break;}
    if(enemyAction&&await io.read(0x95db)===1)break;
    await io.wait(1);
   }
   assert.ok(enemyAction,'enemy action interrupts an open native Tech menu');if(await io.read(0x95db)===1)await io.tap(1,30);
   await select(0,1);const interruptedAction=await observe(0,1,{party});mechanisms.push({kind:'enemy-interrupted-menu',enemyAction,menuClosed,...interruptedAction});
   await fresh();party=[0,1,2];await enter(party,{initiator:0,frail:0,finale:true});await select(0,1);const beforeDeath=await observe(0,1,{party});await death(0);
   let nextSlot=-1;for(let n=0;n<600;n++){const actor=await io.read(0x95d5);if(actor>0&&actor<=2&&await io.read(0x95db)===0){nextSlot=actor;break;}await io.wait(12);}
   assert.ok(nextSlot>0,'living actor follows caster death');const next=nextSlot===1?11:17;await select(nextSlot,next);const afterDeath=await observe(nextSlot,next,{party});
   mechanisms.push({kind:'caster-death',caster:0,hp:await io.read(0x5e30,2),beforeDeath,followingSlot:nextSlot,followingTech:next,...afterDeath});
   await fresh();party=[0,4,1];await enter(party,{initiator:2,finale:true});
   for(const phase of[1,5,2,5,3])await poll(async()=>await io.read(0x5fe4)===phase,10000,'native Tyson target-death phase '+phase);
   assert.equal(await io.read(0xaeff),255,'target dies before the revival command');await select(2,16,{target:0});
   await poll(async()=>await io.read(0xaeff)===0&&await io.read(0x5e30,2)>50,5000,'native Life II revives the dead target');const revivedHP=await io.read(0x5e30,2);
   await select(0,1);const revivalFollowup=await observe(0,1,{party});mechanisms.push({kind:'target-death-and-revival',target:0,revivedHP,followup:revivalFollowup});
  }
  if(!techFilter&&startFilter===1&&(section==='all'||section==='execution'))assert.equal(new Set(executions.map(e=>e.id)).size,116,'every catalogue technique executes');
  if(!techFilter&&startFilter===1&&(section==='all'||section==='execution'))for(const id of custom)assert.equal(executions.filter(e=>e.id===id).length,3,`custom ${id} covers every party position`);
  return{core:name,section,partial,sha256,scope:'Disclosed strong diagnostic fixtures and authored native encounters; not normal-level balance or physical-hardware evidence',savestatesUsed:0,battleWrites:0,persistence,executions,progression,mechanisms};
 });
 await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');reports.push(result);
 console.log(`${name} ${section} technique matrix ${partial?'partial ':''}passed: ${result.executions.length} executions, ${result.progression.length} progression cases, ${result.mechanisms.length} mechanism cases`);
}
await writeFile(path.join(root,(section==='all'?'report':section+'-report')+(techFilter?'-tech-'+techFilter:'')+(startFilter!==1?'-start-'+startFilter:'')+(ownerFilter!==null?'-owner-'+ownerFilter:'')+(comboFilter!==null?'-combo-'+comboFilter:'')+(localFilter!==null?'-local-'+localFilter:'')+(singlesOnly?'-singles-only':'')+'.json'),JSON.stringify({sha256,partial,scope:'Diagnostic fixtures only; not normal-level balance evidence',reports},null,2)+'\n');
