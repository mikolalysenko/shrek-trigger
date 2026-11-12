import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {movement} from '../tests/medina-controller.mjs';
import {attackNativeEnemy} from '../tests/battle-controller.mjs';
import {mrWorldwideTechMap} from '../engine/mr-worldwide.js';
import {mrWorldwide,mrWorldwideStates as F,mrWorldwidePhases,mrWorldwideText as T,greeterText as G} from '../content/mr-worldwide.js';

// Diagnostic Mr. Worldwide acceptance in unmodified Snes9x and bsnes cores.
// The superboss is late-game optional content, so this is a fixture check,
// not fresh-campaign evidence. Each case starts from a documented boundary:
// the new-game strong kit, the story value, the cleared flag and the jump to
// Guy's kitchen. After it, cases use reads and controller input only (the
// greeter, the trip to Kodiak and back, menus and battle commands), except
// the labeled boss/party HP seeds that shorten victory, loss and phases.
const requested=process.argv[2]??'all';
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Usage: check-mr-worldwide.mjs [all|snes9x|bsnes] [--rom=path]');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu','../../../secret-of-goku/.local/tools/emu']){const file=path.resolve(dir,name);try{await access(file);return file;}catch{}}
 throw Error('Set '+env+' to an installed '+name);
}
const built=await build(),override=process.argv.find(a=>a.startsWith('--rom='))?.slice(6);
if(override)built.rom=new Uint8Array(await readFile(path.resolve(override)));
const sha256=createHash('sha256').update(built.rom).digest('hex'),root=path.resolve('.local/qa/mr-worldwide-'+sha256.slice(0,12));
await mkdir(root,{recursive:true});const rom=path.join(root,'candidate.sfc');await writeCandidate(rom,built.rom);
const host=await tool('RETRO_HOST','retro-host'),reports=[];
const {enemy,flag,song}=mrWorldwide,location=mrWorldwide.kitchen.location,walmart=mrWorldwide.walmart.location,FLAG=0x10000+flag,BOSS=0x5e2d+3*128,SPECS=187,FEAST=197;

for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,name);
 const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  const cases=[],seen=[];
  const inBattle=async()=>!!(await io.read(0x117)&1);
  const observe=async()=>{if(await io.read(0x126)){const id=await io.read(0x12a);if(seen.at(-1)!==id)seen.push(id);}};
  async function tap(button=256,gap=60){await io.tap(button,10);for(let n=0;n<gap;n+=15){await io.wait(15);await observe();}}
  async function close(){for(let n=0;n<80&&(await io.read(0x126)||!await io.read(0x11f));n++)await tap(256,80);}
  async function talk(until){await close();await io.hold(128,40);await io.wait(6);await tap(256,90);for(let n=0;n<30&&!await until();n++)await tap(256,60);}
  // Returning from Kodiak leaves the party at (7,12); return to the jump tile
  // (8,10), two tiles left of the greeter, through ordinary movement.
  const {route}=movement(io);
  async function approach(){await close();await route([[8,10]]);}
  const atChoice=(id=T.choice)=>async()=>await io.read(0x12a)===id&&await io.read(0x162)===2;
  const choose=async row=>{if(await io.read(0x163)!==row)await tap(row===2?16:32,12);await tap(256,60);};
  async function arrive(){for(let n=0;n<40&&await io.read(0x100,2)!==walmart;n++)await tap(256,60);assert.equal(await io.read(0x100,2),walmart,'Kodiak stockroom');}
  async function home(){for(let n=0;n<60&&!(await io.read(0x100,2)===location&&!await io.read(0x126)&&await io.read(0x11f));n++)await tap(256,70);assert.equal(await io.read(0x100,2),location,'back in Guy\'s kitchen');assert.equal(await io.read(0x29ae),mrWorldwide.kitchen.song,'the kitchen theme returns');}
  async function trip(){await talk(atChoice(G.choice));await choose(2);await arrive();for(let n=0;n<30&&!await atChoice()();n++)await tap(256,60);}
  async function quantity(id){const items=await io.bytes(0x2400,256),counts=await io.bytes(0x2500,256);let n=0;for(let i=0;i<256;i++)if(items[i]===id)n+=counts[i];return n;}
  async function poll(predicate,frames,step=10){for(let n=0;n<frames;n+=step){if(await predicate())return n;await io.wait(step);}assert.fail('native polled condition timed out');}
  async function jump(story){
   // FIXTURE BOUNDARY: story value, cleared flag, then a native E0 change of
   // location written over the new-game script's waiting return.
   await write(0x10000,[story]);await write(FLAG,[0]);
   await write(0x1238e,[0xe0,location&255,location>>8,8,10,0xb2]);
   await poll(async()=>await io.read(0x100,2)===location&&await io.read(0x11f)===1,3000);await io.wait(120);
  }
  async function run(label,check){
   seen.length=0;
   try{const value=await check();cases.push({label,core:name,...value,status:'passed'});console.log(name+' '+label+' passed '+JSON.stringify(value));}
   catch(error){
    await io.shot(label+'-FAIL');await request({op:'savestate',name:label+'-FAIL'});
    await writeFile(path.join(out,label+'-FAIL.json'),JSON.stringify({label,error:String(error?.stack??error),seen,location:await io.read(0x100,2),flag:await io.read(FLAG),battle:await io.read(0x117),line:await io.read(0x12a),box:await io.read(0x126)},null,2)+'\n');
    throw error;
   }
  }

  for(const[frames,input]of newGameSequence)await io.hold(input,frames);
  assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);
  // The same reversible strong kit as the finale matrix and the browser
  // superboss preset: level-60 stats, endgame weapons and the item set.
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
  await write(0x2980,[0,1,2,3,4,5,6,128,128]);
  await request({op:'savestate',name:'kit'});

  await run('story-gate',async()=>{
   await jump(mrWorldwide.storyGate-1);await talk(async()=>!!await io.read(0x126));await close();
   assert.ok(!seen.some(id=>id>=G.greet&&id<=G.after),'no greeter before the late-game gate');
   assert.equal(await io.read(FLAG),F.unmet);return{story:mrWorldwide.storyGate-1,strings:[...seen]};
  });

  await request({op:'loadstate',file:path.join(out,'kit.state')});
  await jump(0xd0);await request({op:'savestate',name:'room'});
  let battleStart;
  await run('greeter-trip-decline-accept',async()=>{
   await talk(atChoice(G.choice));
   assert.deepEqual(seen.slice(0,2),[G.greet,G.choice],'the greeter offers the trip');await io.shot('mr-worldwide-greeter');
   await choose(3);assert.ok(seen.includes(G.decline),'not today');await close();
   assert.equal(await io.read(FLAG),F.unmet);assert.equal(await io.read(0x100,2),location);
   seen.length=0;await trip();
   assert.ok(seen.includes(G.go));assert.deepEqual(seen.filter(id=>id<=T.loss),[T.intro,T.donkey,T.choice],'first meeting, with Donkey in the party');
   assert.equal(await io.read(FLAG),F.visitFirst);assert.equal(await io.read(0x29ae),song,'his theme plays in the stockroom');
   await io.shot('mr-worldwide-choice');
   await choose(3);assert.ok(seen.includes(T.decline),'leaving Kodiak');await home();
   assert.equal(await io.read(FLAG),F.met);assert.equal(await inBattle(),false);
   seen.length=0;await approach();await trip();
   assert.equal(await io.read(FLAG),F.visitRepeat);assert.ok(seen.includes(T.repeat)&&!seen.includes(T.intro),'repeat visit');
   await choose(2);
   for(let n=0;n<80&&!await inBattle();n++)await tap(256,60);
   assert.ok(await inBattle(),'native battle');assert.ok(seen.includes(T.accept));await io.wait(240);
   const formation=Array.from(await io.bytes(0xaf02,8)),maxHP=await io.read(BOSS+5,2),music=await io.read(0x29ae);
   assert.deepEqual(formation,[enemy,255,255,255,255,255,255,255],'Mr. Worldwide alone, in battle slot 3');
   assert.equal(maxHP,mrWorldwidePhases[0].hp);assert.equal(music,song,'Fireball · Boss Battle 2');
   await io.shot('mr-worldwide-battle');await request({op:'savestate',name:'battle'});battleStart=path.join(out,'battle.state');
   return{strings:[...seen],formation,maxHP,music};
  });

  await run('phases',async()=>{
   await request({op:'loadstate',file:battleStart});
   // Labeled seeds: 9,999-HP party and, per phase, boss HP 500 below its threshold.
   for(let slot=0;slot<3;slot++){await write(0x5e30+slot*128,[0x0f,0x27,0x0f,0x27]);await write(0x5e6b+slot*128,[255,255]);}
   const phases=[];
   for(const[phase,next]of mrWorldwidePhases.slice(1).entries()){
    const hp=next.hp-500;await write(BOSS+3,[hp&255,hp>>8]);
    // The phase number and the remaining stat writes land on different frames.
    await poll(async()=>await io.read(BOSS+0x37)===phase+1&&await io.read(BOSS+0x3c)===next.magicDefense&&await io.read(BOSS+0x3e)===next.defense,4000);
    const elements=Array.from(await io.bytes(BOSS+0x3f,4)),defense=await io.read(BOSS+0x3e),magicDefense=await io.read(BOSS+0x3c);
    assert.deepEqual(elements,next.elements,'element bytes');assert.equal(defense,next.defense);assert.equal(magicDefense,next.magicDefense);
    phases.push({phase:phase+2,key:next.key,elements,defense,magicDefense});
   }
   await io.shot('mr-worldwide-exile');return{phases};
  });

  await run('technique-rotation',async()=>{
   // Every private technique must dispatch, finish within a bounded time and
   // hand control back, through all four phases, before a clean victory.
   // Labeled seeds: 9,999-HP/255-defense party, re-seeded when any member drops
   // below 3,000 HP, and boss HP 500 below each phase threshold.
   await request({op:'loadstate',file:battleStart});
   const strong=async()=>{for(let slot=0;slot<3;slot++){await write(0x5e30+slot*128,[0x0f,0x27,0x0f,0x27]);await write(0x5e6b+slot*128,[255,255]);}};
   await strong();
   const ids=Object.values(mrWorldwideTechMap()).map(t=>t.id),counts=Object.fromEntries(ids.map(id=>[id,0])),durations=Object.fromEntries(ids.map(id=>[id,0])),perPhase=[];
   let current=null,started=0,frame=0,reseeds=0;const partyAttacks=[];
   async function step(frames=2){
    await io.wait(frames);frame+=frames;
    const [actor,type,id]=Array.from(await io.bytes(0xae91,3)),key=actor===3&&type===2&&ids.includes(id)?id:null;
    if(key!==current){if(current!==null)durations[current]=Math.max(durations[current],frame-started);if(key!==null){counts[key]++;started=frame;}current=key;}
    if(current!==null)assert.ok(frame-started<1800,`technique ${current} finishes`);
    assert.ok(await inBattle(),'the battle continues');
    for(let slot=0;slot<3;slot++)if(await io.read(0x5e30+slot*128,2)<3000){await strong();reseeds++;break;}
   }
   for(let phase=0;phase<4;phase++){
    if(phase){const hp=mrWorldwidePhases[phase].hp-500;await write(BOSS+3,[hp&255,hp>>8]);}
    const before={...counts},phaseStart=frame;
    // World Tour fires during the phase change itself, so sample while waiting for it.
    while(await io.read(BOSS+0x37)!==phase){assert.ok(frame-phaseStart<6000,'phase '+(phase+1)+' begins');await step();}
    // Up to 40,000 frames per phase, until ten techniques have resolved.
    while(frame-phaseStart<40000&&ids.reduce((n,id)=>n+counts[id]-before[id],0)<10)await step();
    perPhase.push(Object.fromEntries(ids.map(id=>[id,counts[id]-before[id]])));
    // The party still responds: an ordinary Attack through the native menu dispatches.
    const hp=await io.read(BOSS+3,2);await attackNativeEnemy(io,enemy,{targetSlot:3});
    let attacked=false;for(let n=0;n<1500&&!attacked;n+=2){const [actor,type]=Array.from(await io.bytes(0xae91,3));attacked=actor<3&&type===1;await step();}
    assert.ok(attacked,'party Attack dispatches in phase '+(phase+1));
    for(let n=0;n<900;n+=2){const [actor,type]=Array.from(await io.bytes(0xae91,3));if(!(actor<3&&type===1))break;await step();}
    partyAttacks.push({phase:phase+1,hpBefore:hp,hpAfterAttack:await io.read(BOSS+3,2)});
   }
   const missing=ids.filter(id=>!counts[id]);
   assert.deepEqual(missing,[],'every technique executes');
   await write(BOSS+3,[1,0]); // labeled seed: one hit from victory
   for(let n=0;n<600&&await inBattle();n++)await io.tap(256,8);
   assert.equal(await inBattle(),false,'victory ends the battle');
   await home();
   assert.equal(await io.read(0x11f),1,'field control returns in Guy\'s kitchen after the reward scene');
   return{counts,longestFrames:durations,perPhase,partyAttacks,reseeds,frames:frame};
  });

  await run('victory-reward',async()=>{
   await request({op:'loadstate',file:battleStart});seen.length=0;
   const specs=await quantity(SPECS),feasts=await quantity(FEAST);
   await write(BOSS+3,[1,0]); // labeled seed: one hit from victory
   for(let n=0;n<600&&await inBattle();n++)await io.tap(256,8);
   assert.equal(await inBattle(),false);
   await home();
   for(const id of[T.victory,T.reward,T.aftermath])assert.ok(seen.includes(id),'scene '+id);
   assert.equal(await quantity(SPECS),specs+1,'Spectacular Specs');
   assert.equal(await quantity(FEAST),feasts+4,'three Swamp Feasts plus the native battle drop');
   assert.equal(await io.read(FLAG),F.defeated);await io.shot('mr-worldwide-defeated');
   const after=seen.length;await approach();await talk(async()=>seen.includes(G.after));await close();
   assert.ok(seen.slice(after).includes(G.after),'the greeter says goodbye');
   assert.equal(await io.read(0x100,2),location,'no further trip');
   assert.equal(await quantity(SPECS),specs+1,'no second reward');
   return{strings:[...seen],specs:specs+1,feasts:feasts+4};
  });

  await run('loss-rematch',async()=>{
   await request({op:'loadstate',file:battleStart});seen.length=0;
   for(let slot=0;slot<3;slot++)await write(0x5e30+slot*128,[1,0]); // labeled seed: one HP each
   await poll(async()=>!await inBattle(),60000,30);
   await home();
   assert.ok(seen.includes(T.loss),'consolation scene');
   assert.equal(await io.read(FLAG),F.met);
   const party=Array.from(await io.bytes(0x2980,3)),hp=[];
   for(const id of party)hp.push(await io.read(0x2600+id*80+3,2));
   assert.ok(hp.every(n=>n>0),'the party is restored');
   await approach();await trip();assert.equal(await io.read(0x12a),T.choice,'rematch offered');
   return{strings:[...seen],hp};
  });
  return{cases};
 });
 reports.push({core:name,...result});await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');
}
const report={sha256,scope:'Diagnostic Mr. Worldwide fixture in independent cores: story gate, greeter trip and refusals, Kodiak meeting/acceptance, native formation and music, four barrier phases, every technique, victory reward/retirement, and no-game-over loss with rematch. Not fresh-campaign or balance evidence.',reports};
await writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sha256,report:path.join(root,'report.json'),cores:reports.map(r=>({core:r.core,cases:r.cases.length,frames:r.frames}))},null,2));
