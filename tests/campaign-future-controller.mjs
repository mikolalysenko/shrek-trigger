import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {routeKit} from './route-kit.mjs';
import {walkWorld,enterWorldLocation} from './world-controller.mjs';
import {raceController} from './race-controller.mjs';

// Fresh-save future chapter, story 51 (arrival) to story 69 (the four friends
// at Steve's). Controller input and reads only. Travel inside rooms replays
// paths recorded by the discovery search (tests/data/future-route-paths.json);
// the accepted run never searches, loads or saves states.
//
// Discovery mode (`find`) is a development aid: when a named path is missing
// it calls find(spec) — a savestate search outside this file — and records the
// result. Acceptance runs pass no `find` and fail on a missing path.
export const futurePathsFile='tests/data/future-route-paths.json';

export async function runFutureLeg(io,evidence,rom,options={}){
 return runSegmentLeg(io,evidence,rom,futureSegments,{pathsFile:futurePathsFile,...options});
}

// Shared runner for segment-based legs: named travel with recorded paths,
// scripted-fight tactics, field healing and step helpers.
export async function runSegmentLeg(io,evidence,rom,segments,{pathsFile,find=null,paths=null,from=null,to=null,after=null}={}){
 const rk=routeKit(io,evidence,rom),{read,bytes,hold,tap,wait}=io;
 const recorded=paths??JSON.parse(await readFile(pathsFile,'utf8').catch(()=>'{}'));
 const location=()=>read(0x100,2),story=()=>read(0x10000),party=async()=>Array.from(await bytes(0x2980,3));
 const stage=async(name,extra={})=>{const row={name,location:await location(),story:await story(),party:await party(),...extra};evidence.stages.push(row);console.log(JSON.stringify(row));return row;};
 const busy=async()=>await read(0x126)||!await read(0x11f);
 const inventory=async()=>{const ids=await bytes(0x2400,256),n=await bytes(0x2500,256),o={};for(let i=0;i<256;i++)if(ids[i])o[ids[i]]=(o[ids[i]]??0)+n[i];return o;};
 const level=async id=>read(0x2600+id*80+0x12);

 // Scripted fights: target order from the formation once it has loaded, the
 // small enemies before the large ones, Fiona's Sing-Along for healing.
 // Leg-wide fight defaults (setFightDefaults) also reach battles that start
 // inside settle(), walkTo() or a replay's recovery.
 let fightDefaults={};const setFightDefaults=o=>{fightDefaults=o||{};};
 // Legs that set fight defaults also use them for battles met while
 // replaying a path; older legs keep the plain battle helper there.
 const travelFight=()=>Object.keys(fightDefaults).length?(name=>fight(name)):null;
 const fight=async(name,options={})=>{
  const{first=[],last=[],techs={},revivers={},threshold=.3,holdWhile=null,safeAbove=0,healItem=189,targeted={},healerRefill=0,melee=true,groupHeal=null}={...fightDefaults,...options};
  for(let g=0;g<8&&(await read(0x117)&1);g++){
   let ids=[];for(let w=0;w<30&&ids.length===0;w++){await wait(60);ids=[...new Set(Array.from(await bytes(0xaf02,8)).filter(x=>x!==255))];}
   for(let w=0;w<10;w++){await wait(30);const now=[...new Set(Array.from(await bytes(0xaf02,8)).filter(x=>x!==255))];if(now.length===ids.length)break;ids=now;}
   const rank=id=>first.includes(id)?-1:last.includes(id)?1:0;ids.sort((a,b)=>rank(a)-rank(b));
   const healer=(await party()).includes(1)?[1,9]:null;
   await rk.tacticalBattle(name,ids,threshold,{healer,techs,revivers,holdWhile,safeAbove,healItem,targeted,healerRefill,melee,groupHeal});await wait(200);
  }
 };
 const settle=async(limit=200)=>{for(let i=0;i<limit;i++){if(await read(0x117)&1){await fight('scene');continue;}if(i>3&&!await busy()){await wait(60);if(!await busy())return;}if(await read(0x126))await tap(256,60);else await wait(30);}};

 // Named travel: replay a recorded path, or discover and record it.
 async function travel(key,spec,{fr=16,fightWith=null}={}){
  let steps=recorded[key];
  if(!steps){
   assert.ok(find,'no recorded future path '+key);
   steps=await find({fr,...spec});recorded[key]=steps;
   await writeFile(pathsFile,JSON.stringify(recorded,null,1)+'\n');
   return;
  }
  // Replay step by step. A step recorded as changing rooms that drifts short
  // of the connector walks back to the previous waypoint and holds the
  // step's direction until the room changes; the path then continues.
  const dirOf=d=>({U:16,D:32,L:64,R:128,UL:80,UR:144,DL:96,DR:160,UUU:16,DDD:32,LLL:64,RRR:128,UA:16,DA:32,LA:64,RA:128})[d];
  let prev=null;
  for(const step of steps){
   try{await rk.replay([step],key,{fr,fight:fightWith??travelFight(),settleWait:0});}
   catch(e){
    if(!/replay room/.test(e.message)||!prev)throw e;
    for(let attempt=0;attempt<3&&await location()!==step[3];attempt++){
     await walkTo(prev[1],prev[2],{limit:600});
     for(let i=0;i<150&&await location()!==step[3];i++){if(await read(0x117)&1){await (fightWith??travelFight()??rk.battle)(key);continue;}await hold(dirOf(step[0])|1,2);}
     await wait(200);
    }
    assert.equal(await location(),step[3],key+': recovered room');
    if(step[1]!==undefined)await walkTo(step[1],step[2],{limit:600});
   }
   if(step[1]!==undefined)prev=step;
  }
  await wait(200);
  // A replay that drifted short of an exit walks back onto the path's last
  // waypoint and repeats its final move until the connector fires.
  if(spec.target>=0&&await location()!==spec.target){
   const here=await location(),last=[...steps].reverse().find(st=>st[1]!==undefined&&(st[3]===undefined||st[3]===here));
   const dir={U:16,D:32,L:64,R:128,UL:80,UR:144,DL:96,DR:160,UUU:16,DDD:32,LLL:64,RRR:128}[steps.at(-1)[0]]??{UA:16,DA:32,LA:64,RA:128}[steps.at(-1)[0]];
   for(let attempt=0;attempt<3&&await location()!==spec.target;attempt++){
    if(last)await walkTo(last[1],last[2],{limit:600});
    for(let i=0;i<150&&await location()!==spec.target;i++){if(await read(0x117)&1){await (fightWith??travelFight()??rk.battle)(key);continue;}await hold(dir|1,2);}
    if(steps.at(-1)[0].endsWith('A')&&steps.at(-1)[0].length===2){await hold(256,4);await wait(300);}
    await wait(200);
   }
  }
  if(spec.target>=0)assert.equal(await location(),spec.target,key+': arrived');
  // Position goals are the spots the next action needs; paths end within a
  // few pixels of them, so finish the last step on foot.
  else await walkTo(spec.gx,spec.gy,{limit:300});
 }
 // Step-and-hold helpers for scenes the search does not model.
 const walkTo=async(x,y,{done=async()=>false,limit=1500}={})=>{for(let i=0;i<limit&&!await done();i++){if(await read(0x117)&1){await fight('walk');continue;}if(!await read(0x11f)){await wait(4);continue;}const p=await rk.position(),dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<2&&Math.abs(dy)<2)return true;await hold((Math.abs(dx)>1?(dx>0?128:64):0)|(Math.abs(dy)>1?(dy>0?32:16):0),2);}return await done();};
 const tapUntil=async(cond,{limit=200,gap=100,button=256}={})=>{for(let i=0;i<limit&&!await cond();i++){if(await read(0x117)&1){await fight('scene');continue;}await tap(button,gap);}return await cond();};
 // The native code readers count only presses held for about 12 frames.
 const press=async(button,frames=12,gap=120)=>{await hold(button,frames);await wait(gap);};


 // Field healing with Fiona's first technique (Sing-Along) through the native
 // menu: X, the third icon (TEC), Fiona, the technique, the ally. OnionBroth
 // (192) restores her MP when it runs out, unless broth is false.
 const fieldHeal=async({threshold=.85,broth=true}={})=>{
  const members=(await party()).filter(id=>id<8),hs=members.indexOf(1);if(hs<0)return 0;
  const hp=async s=>[await read(0x2603+members[s]*80,2),await read(0x2605+members[s]*80,2)],mp=()=>read(0x2607+80,2);let casts=0;
  for(let guard=0;guard<40;guard++){
   let worst=-1,ratio=threshold;for(let s=0;s<members.length;s++){const [h,m]=await hp(s);if(h>0&&m&&h/m<ratio){ratio=h/m;worst=s;}}
   if(worst<0)break;
   if(await mp()<1){if(!broth)break;const before=await mp();await rk.useItem(192,hs);if(await mp()<=before)break;continue;}
   const before=(await hp(worst))[0];
   await tap(512,180);await tap(128,40);await tap(128,40);await tap(256,150);
   for(let i=0;i<hs;i++)await tap(32,40);await tap(256,150);await tap(256,150);
   for(let i=0;i<worst;i++)await tap(32,40);await tap(256,240);for(let i=0;i<6;i++)await tap(1,60);
   casts++;if((await hp(worst))[0]<=before)break;
  }
  return casts;
 };
 // Standing in the crane room's red shutter lets the crane carry the party
 // through its two scripted fights to the room's lower west side.
 const craneRide=async()=>{
  for(let i=0;i<8&&!(await read(0x117)&1)&&await location()===231&&await read(0x11f);i++)await hold(16,20);
  for(let i=0;i<90;i++){if(await read(0x117)&1){await fight('crane',{last:[138]});continue;}const p=await rk.position();if(await location()===231&&await read(0x11f)&&p.y>400&&p.x<120&&i>5)return;if(await read(0x126))await tap(256,40);else await wait(60);}
  assert.fail('crane ride did not end at the lower west landing');
 };
 // The beetle conveyor (232) joins the lower west landing to the corridor.
 const conveyor=async()=>{
  await travel('landing-conveyor',{target:232,gx:48,gy:500});await wait(200);
  await walkTo(206,695);await walkTo(200,599);await walkTo(216,599);
  for(let i=0;i<20&&await location()===232;i++){if(await read(0x117)&1){await fight('beetles');continue;}await hold(16,6);}
  await wait(200);assert.equal(await location(),231,'conveyor ladder back to the crane room');
 };
 const api={rom,setFightDefaults,fieldHeal,craneRide,conveyor,rk,io,read,bytes,hold,tap,wait,location,story,party,stage,settle,fight,travel,walkTo,tapUntil,press,inventory,level,walkWorld:p=>walkWorld(io,p),enterWorldLocation:id=>enterWorldLocation(io,id),raceController};
 const start=from?segments.findIndex(s=>s.name===from):0;assert.ok(start>=0,'unknown segment '+from);
 for(const segment of segments.slice(start)){
  await segment.run(api);await stage(segment.name);if(after)await after(segment.name);if(segment.name===to)break;
 }
 return api;
}

// World routes between the domes (world tiles, 16 pixels).
const toLab16=[[28,55],[31,55],[31,51],[33,51],[33,46]];
const toTrann=[[33,48],[33,55],[32,55],[32,56],[31,56],[31,57],[27,57],[27,66],[28,66],[28,71],[24,71],[24,68]];
const fromTrann=[[24,71],[28,71],[28,66],[27,66],[27,57],[31,57],[31,56],[32,56],[32,55],[33,55],[33,47]];
const toArris=[[43,38],[49,38],[49,45],[51,45],[51,47],[56,47],[56,44]];
const toRivet=[[56,45],[56,46],[56,47],[56,48],[56,49],[56,50],[57,50],[57,51],[58,51],[58,52],[59,52],[59,53],[59,54],[60,54],[61,54],[62,54],[62,53],[63,53],[63,52],[63,51],[63,50],[63,49],[63,48],[63,47],[63,46],[63,45],[63,44],[63,43],[63,42],[63,41],[63,40],[63,39],[63,38],[63,37],[63,36],[63,35],[63,34]];
const toProto=[[81,31],[81,32],[81,33],[81,34],[81,35],[82,35],[82,36],[83,36],[83,37],[84,37],[85,37],[85,36],[86,36],[87,36],[88,36],[89,36],[89,37],[90,37],[91,37],[91,36],[92,36],[93,36],[94,36],[95,36],[95,37],[96,37],[96,38],[97,38],[98,38],[99,38],[99,37],[100,37],[101,37],[102,37],[103,37],[103,38],[103,39],[103,40],[104,40],[105,40],[105,39],[106,39],[107,39],[108,39],[109,39],[110,39],[111,39],[111,40],[111,41],[111,42],[111,43],[111,44],[111,45],[111,46],[111,47],[112,47],[113,47],[114,47],[115,47],[116,47],[117,47],[118,47],[118,48],[118,49],[118,50],[119,50],[119,51],[119,52],[118,52],[118,53],[117,53],[116,53],[115,53],[114,53],[114,52],[114,51],[114,50]];
const toFactory=[[114,51],[114,52],[114,53],[115,53],[116,53],[117,53],[118,53],[118,52],[119,52],[119,51],[119,50],[119,49],[119,48],[119,47],[119,46],[119,45],[119,44],[118,44],[117,44],[116,44],[116,43],[116,42],[116,41],[116,40],[116,39],[116,38],[116,37],[116,36],[115,36]];

// Segments in play order. Each ends with an assertion on native state.
export const futureSegments=[
 {name:'leave-arrival',async run(f){
  await f.settle();await f.rk.go([[120,190],['down',80]],'arrival dome');await f.wait(400);
  assert.equal(await f.location(),498,'future overworld');
 }},
 // Lab 16's respawning scavengers are the only experience before the supply
 // keeper; Trann Dome's rest machine restores the party between laps. The
 // keeper keeps its original stats, so the route arrives at level 11.
 {name:'lab16-training',async run(f){
  const rest=async()=>{
   await f.walkWorld(toTrann);await f.enterWorldLocation(210);await f.wait(400);await f.settle(30);
   await f.travel('trann-rest',{target:-1,gx:88,gy:671,room:210});
   await f.hold(16,3);await f.tap(256,150);await f.tapUntil(async()=>!(await f.read(0x126))&&!!(await f.read(0x11f)),{limit:30,gap:90});
   await f.travel('trann-out',{target:498,gx:410,gy:752});await f.wait(300);await f.walkWorld(fromTrann);
  };
  await f.walkWorld(toLab16);
  for(let lap=0;lap<30;lap++){
   const levels=[await f.level(0),await f.level(2),await f.level(1)];console.log('lab16 lap',lap,'levels',levels.join(','));
   if(Math.min(...levels)>=11)break;
   await f.walkWorld([[33,46]]);await f.enterWorldLocation(212);await f.wait(400);await f.settle(60);
   await f.travel('lab16-up',{target:213,gx:504,gy:88});await f.settle(60);
   await f.travel('lab16-back',{target:212,gx:520,gy:600});await f.settle(60);
   await f.travel('lab16-down',{target:498,gx:56,gy:1000});await f.settle(60);
   await rest();
  }
  for(const id of[0,1,2])assert.ok(await f.level(id)>=11,'level 11 before the supply keeper');
 }},
 {name:'supply-keeper',async run(f){
  await f.walkWorld([[33,46]]);await f.enterWorldLocation(212);await f.wait(400);await f.settle(60);
  await f.travel('lab16-up',{target:213,gx:504,gy:88});await f.settle(60);await f.rk.healAll();
  await f.travel('lab16-east',{target:498,gx:920,gy:540});await f.wait(200);
  await f.walkWorld(toArris);await f.enterWorldLocation(214);await f.wait(400);await f.settle(60);await f.rk.healAll();
  await f.travel('arris-keeper',{target:219,gx:120,gy:440,room:221},{fr:24});await f.settle(60);
  await f.rk.go([[136,420],[136,360],[136,343]],'keeper hall');await f.hold(16,24);
  await f.tapUntil(async()=>!!(await f.read(0x117)&1),{limit:200});
  // The original Guardian: its two bits first, by slot, then the body.
  await f.fight('supply keeper',{first:[207],last:[212]});await f.settle(100);
  assert.equal(await f.story(),53,'supply keeper defeated');
 }},
 {name:'food-store',async run(f){
  await f.tapUntil(async()=>!(await f.read(0x126))&&!!(await f.read(0x11f)),{limit:90});
  await f.hold(16,240);await f.wait(200);
  await f.tapUntil(async()=>!!(await f.read(0x100a4)&1),{limit:200});
  // The keeper's helper keeps talking after the seed; the rest of that talk
  // sets the chase flag (bit 16) the rat scene needs.
  await f.tapUntil(async()=>!!(await f.read(0x100ec)&16),{limit:12});await f.wait(120);await f.settle(60);
  assert.equal(await f.read(0x100ec)&16,16,'rat chase announced');
  assert.ok((await f.inventory())[212],'seed from the food store');
 }},
 // The rat dashes along the catwalks; the route follows its fixed course with
 // B held and catches it with A at the end, which teaches the password.
 {name:'rat-chase',async run(f){
  await f.travel('keeper-rat',{target:221,gx:112,gy:470,room:219});await f.wait(300);await f.settle(30);
  await f.hold(32|1,18);await f.tapUntil(async()=>await f.read(0x100ec)===49,{limit:65,gap:24});
  // Follow the catwalk corners with B held, pressing A whenever the rat
  // (actor 12 or 13) is within reach, as tests/future-puzzles does.
  const caught=async()=>await f.read(0x100ec)!==49;
  for(const[x,y]of[[19,8],[4,8],[4,20],[25,20],[25,32],[19,32],[19,43],[4,43]]){
   const tx=x*16+8,ty=y*16+7;
   for(let i=0;i<1200&&!await caught();i++){
    const p=await f.rk.position(),dx=tx-p.x,dy=ty-p.y;if(Math.abs(dx)<2&&Math.abs(dy)<2)break;
    let keys=1|(Math.abs(dx)>1?(dx>0?128:64):0)|(Math.abs(dy)>1?(dy>0?32:16):0);
    if(i%4<2)for(const id of[12,13]){const rx=await f.read(0x1800+id*2,2)/16,ry=await f.read(0x1880+id*2,2)/16;if(Math.abs(rx-p.x)+Math.abs(ry-p.y)<26)keys|=256;}
    await f.hold(keys,1);
   }
   if(await caught())break;
  }
  await f.tapUntil(async()=>await f.read(0x100ec)===97,{limit:30,gap:120});
  assert.equal(await f.read(0x100ec),97,'rat caught, password learned');
 }},
 // Both passage switches take the password: up, then L+R, then L+R+A.
 {name:'passage-switches',async run(f){
  await f.tapUntil(async()=>!(await f.read(0x126))&&!!(await f.read(0x11f)),{limit:40,gap:60});await f.settle(30);
  await f.travel('rat-passage',{target:216,gx:64,gy:760,room:221});await f.wait(300);await f.settle(30);
  await f.travel('passage-left',{target:-1,gx:616,gy:584,room:216});
  const enter=async()=>{await f.hold(16,10);await f.hold(1024|2048,8);await f.tap(1024|2048|256,400);await f.tapUntil(async()=>!(await f.read(0x126))&&!!(await f.read(0x11f)),{limit:20,gap:80});};
  // Recorded paths end within a few pixels; each switch needs its own tile.
  await f.walkTo(616,591);
  await enter();assert.equal(await f.read(0x100a4)&32,32,'left switch');
  await f.walkTo(616,604);await f.walkTo(664,604);await f.hold(16,24);
  await enter();assert.equal(await f.read(0x100a4)&64,64,'right switch');
 }},
 {name:'archive',async run(f){
  await f.travel('passage-215',{target:215,gx:728,gy:584});await f.wait(200);await f.settle(30);
  await f.travel('passage-217',{target:217,gx:408,gy:40});await f.wait(200);await f.settle(30);
  await f.travel('passage-218',{target:218,gx:280,gy:56});await f.wait(200);await f.settle(30);
  await f.travel('archive-screen',{target:-1,gx:904,gy:700,room:218});await f.hold(16,24);
  await f.tapUntil(async()=>await f.story()===54,{limit:400,gap:40});
  assert.equal(await f.story(),54,'archive recordings watched');await f.wait(300);await f.settle(60);
 }},
 {name:'seeds',async run(f){
  for(const [key,target,gx,gy] of [['archive-217',217,888,744],['archive-215',215,56,760],['archive-216',216,376,744],['archive-214',214,712,648]]){
   if(await f.location()===target)continue;await f.travel(key,{target,gx,gy});await f.wait(200);
  }
  if(!(await f.read(0x126)))await f.hold(16,8);
  await f.tapUntil(async()=>await f.story()===55,{limit:300,gap:40});await f.wait(200);
  assert.ok((await f.inventory())[213],'race key from the shelter');
 }},
 {name:'rivet-race',async run(f){
  await f.travel('shelter-out',{target:498,gx:792,gy:504});await f.wait(200);
  await f.walkWorld(toRivet.slice(1));await f.enterWorldLocation(223);await f.wait(200);await f.settle(30);
  await f.travel('rivet-meet',{target:-1,gx:696,gy:103,room:223});await f.hold(16,4);await f.tap(256,120);
  for(let i=0;i<400&&!(await f.read(0x10154)&1);i++){await f.hold(256,3);await f.wait(33);}
  assert.equal(await f.read(0x10154)&1,1,'Rivet introduced');await f.wait(120);
  await f.travel('rivet-cart',{target:-1,gx:696,gy:119,room:223});
  await f.hold(16,12);await f.tap(256,1000);assert.equal(await f.location(),271,'native race');
  await f.tap(1,180);const drive=f.raceController(),ram=new Uint8Array(0x400);
  for(let i=0;i<6000&&await f.location()===271;i++){ram.set(await f.bytes(0,0x400));await f.hold(await f.read(0x380)?0:drive(ram),1);}
  assert.equal(await f.read(0x380),1,'race won');
  await f.tapUntil(async()=>!(await f.read(0x126))&&!!(await f.read(0x11f))&&await f.location()===225,{limit:60,gap:100});
 }},
 // Pinocchio's first repair. Start keeps his name on the naming screen; at
 // the companion choice the route takes Fiona, whose healing the factory's
 // two-member brothers fight needs (Donkey has none).
 {name:'pinocchio-recruit',async run(f){
  await f.travel('race-out',{target:498,gx:856,gy:216});await f.wait(200);
  await f.walkWorld(toProto.slice(1));await f.enterWorldLocation(226);await f.wait(200);await f.settle(30);
  await f.travel('proto-repair',{target:-1,gx:904,gy:391,room:226});await f.hold(16,24);
  let named=false,chose=false;
  for(let k=0;k<900&&await f.story()!==60;k++){
   if(!named&&await f.read(0x12a)===58&&!(await f.read(0x126))&&!(await f.read(0x11f))){await f.wait(600);await f.tap(8,360);named=true;continue;}
   if(named&&!chose&&await f.read(0x12a)===77&&await f.read(0x126)){await f.wait(150);await f.hold(32,3);await f.wait(3);chose=true;}
   await f.tap(256,60);
  }
  await f.wait(400);assert.equal(await f.story(),60);assert.deepEqual(await f.party(),[0,3,1],'Shrek, Pinocchio and Fiona');
 }},
 {name:'factory-entrance',async run(f){
  await f.travel('proto-out',{target:498,gx:984,gy:760,max:3000});await f.wait(200);
  await f.walkWorld(toFactory.slice(1));await f.enterWorldLocation(228);await f.wait(200);await f.settle(30);
  await f.travel('security-tag',{target:-1,gx:152,gy:343,room:228});await f.hold(16,36);
  await f.tapUntil(async()=>!!(await f.read(0x10058)&4),{limit:40,gap:120});await f.settle(60);
  assert.equal(await f.read(0x10058)&4,4,'Pinocchio opens security');
  // Right grate, up the east corridor, then A at the upper east door.
  await f.travel('entrance-grate',{target:-1,gx:250,gy:300,room:228});
  for(let i=0;i<4;i++){await f.hold(16,12);await f.tap(256,60);}
  for(const b of[128,128,16,16]){await f.hold(b,16);await f.tap(256,60);}
  for(let i=0;i<5;i++)await f.hold(16,20);
  await f.hold(64,8);await f.hold(16,8);await f.hold(256,4);await f.wait(500);
  assert.equal(await f.location(),231,'crane room');
 }},
 {name:'crane-codes',async run(f){
  await f.travel('crane-shutter',{target:-1,gx:568,gy:495,room:231});await f.craneRide();
  await f.conveyor();
  await f.travel('corridor-233',{target:233,gx:328,gy:96,adoors:true,avoid:[232,437,228]});await f.wait(200);await f.settle(30);
  await f.travel('in233-southwest',{target:-1,gx:344,gy:715,room:233});
  // A second crane may catch the party at the southwest door; after its
  // fights the route lines up inside the doorway and runs straight down,
  // retrying if the crane catches it again.
  const loose=async()=>{for(let i=0;i<80&&(await f.read(0x117)&1||!await f.read(0x11f)||await f.read(0x126));i++){if(await f.read(0x117)&1)await f.fight('crane',{last:[138]});else if(await f.read(0x126))await f.tap(256,60);else await f.wait(30);}};
  for(let attempt=0;attempt<8&&await f.location()===233;attempt++){
   await loose();await f.walkTo(340,700);
   for(let i=0;i<30&&(await f.rk.position()).x>344;i++)await f.hold(64,1);
   for(let i=0;i<8&&await f.location()===233&&!(await f.read(0x117)&1)&&await f.read(0x11f);i++)await f.hold(32|1,8);
   await f.wait(200);
  }
  assert.equal(await f.location(),231,'crane console balcony');
  const enter=async keys=>{
   for(let i=0;i<40&&!(await f.read(0x126));i++){await f.hold(32,4);await f.wait(20);}
   for(let i=0;i<6&&await f.read(0x126);i++)await f.tap(256,90);await f.wait(60);
   for(const k of keys)await f.tap(k,120);
   for(let i=0;i<5000&&(await f.read(0x110)||!await f.read(0x11f)||await f.read(0x126));i+=30){if(await f.read(0x126))await f.tap(256,30);else await f.wait(30);}
  };
  // Step back off the console between codes; holding up after the second
  // would walk through the balcony door into room 233.
  await enter([512,256]);await f.hold(16,24);await enter([1,1]);
  assert.equal(await f.read(0x10058),100,'both barrels moved');
 }},
 // The two-member brothers fight later needs levels the original reaches with
 // Tonics; this route has spent its Onions, so it trains on the repeatable
 // crane fights, healing in the field between rides.
 {name:'crane-training',async run(f){
  // The balcony's only way out is room 233: up through its door, across to
  // 233's east door, and down into the crane room's upper middle.
  for(let i=0;i<20&&await f.location()===231;i++)await f.hold(16,6);await f.wait(200);
  assert.equal(await f.location(),233,'balcony door');
  await f.travel('233-east-door',{target:-1,gx:448,gy:712,room:233});
  // 233's crane also guards this door: run straight through, and after a
  // catch and its fights, walk back and try again.
  for(let attempt=0;attempt<8&&await f.location()===233;attempt++){
   for(let i=0;i<80&&(await f.read(0x117)&1||!await f.read(0x11f)||await f.read(0x126));i++){if(await f.read(0x117)&1)await f.fight('crane',{last:[138]});else if(await f.read(0x126))await f.tap(256,60);else await f.wait(30);}
   await f.walkTo(448,712);
   for(let i=0;i<10&&await f.location()===233&&!(await f.read(0x117)&1)&&await f.read(0x11f);i++)await f.hold(32|1,8);
   await f.wait(200);
  }
  assert.equal(await f.location(),231,'upper crane room');
  await f.travel('upper-corridor',{target:-1,gx:210,gy:377,room:231,avoid:[233]});
  await f.travel('corridor-west-shutter',{target:-1,gx:568,gy:495});await f.craneRide();
  for(let ride=0;ride<16;ride++){
   await f.fieldHeal();
   const levels=[await f.level(0),await f.level(3),await f.level(1)];console.log('crane ride',ride,'levels',levels.join(','));
   if(Math.min(levels[0],levels[2])>=15)break;
   await f.conveyor();await f.travel('corridor-shutter',{target:-1,gx:568,gy:495});await f.craneRide();
  }
  assert.ok(await f.level(0)>=15&&await f.level(1)>=15,'Shrek and Fiona at level 15');
 }},
 {name:'lab-hatch',async run(f){
  await f.conveyor();
  await f.travel('conveyor-alcove',{target:-1,gx:744,gy:135});
  await f.hold(16,6);await f.hold(256,4);await f.wait(500);assert.equal(await f.location(),228);
  await f.travel('entrance-west',{target:229,gx:72,gy:88,adoors:true,avoid:[498,231]});await f.wait(200);await f.settle(30);
  // The console's guards (Acid and Alkaline) wake when the party steps by
  // the east bay; after them the console opens the lab hatch.
  await f.travel('aux-east',{target:-1,gx:548,gy:150,room:229});
  for(let i=0;i<12&&!(await f.read(0x117)&1);i++){await f.hold(64,2);await f.hold(32,10);}
  await f.fight('console guards');await f.tapUntil(async()=>!(await f.read(0x126))&&!!(await f.read(0x11f)),{limit:20,gap:80});
  await f.travel('aux-console',{target:-1,gx:456,gy:106,room:229});
  for(let i=0;i<10&&!(await f.read(0x1005c)&32);i++){await f.hold(16,4);await f.tap(256,90);for(let k=0;k<10&&await f.read(0x126);k++)await f.tap(256,60);}
  assert.equal(await f.read(0x1005c)&32,32,'lab hatch open');
  await f.travel('aux-hatch',{target:230,gx:552,gy:168});await f.wait(200);await f.settle(30);
  await f.travel('lab-terminal',{target:-1,gx:360,gy:759,room:230});await f.hold(16,36);
  let fought=false;for(let i=0;i<170;i++){if(await f.read(0x117)&1){fought=true;await f.fight('lab ambush');continue;}if(fought&&await f.read(0x11f)&&!(await f.read(0x126)))break;await f.tap(256,120);}
  assert.equal(await f.read(0x10058)&1,1,'lab lasers off');
 }},
 {name:'zabie-lock',async run(f){
  await f.travel('lab-storage',{target:235,gx:168,gy:872});await f.wait(200);await f.settle(30);
  await f.travel('lock-console',{target:-1,gx:712,gy:343,room:235});
  await f.hold(16,12);await f.tap(256,10);for(let i=0;i<40&&!(await f.read(0x126));i++)await f.wait(15);await f.wait(60);
  await f.press(256);for(const k of[512,256,1,2])await f.press(k);
  for(let i=0;i<5000&&(await f.read(0x110)||!await f.read(0x11f)||await f.read(0x126));i+=30){if(await f.read(0x126))await f.tap(256,30);else await f.wait(30);}
  assert.equal(await f.read(0x101d0),1,'X A B Y opens the lock');
 }},
 {name:'generator-escape',async run(f){
  await f.travel('generator',{target:-1,gx:824,gy:167,room:235});
  await f.hold(16,12);for(let i=0;i<30&&await f.story()!==63;i++)await f.press(256);
  assert.equal(await f.story(),63,'emergency started');await f.wait(240);
  await f.walkTo(824,439);await f.tapUntil(async()=>!!(await f.read(0x101d0)&2)&&!!(await f.read(0x11f)),{limit:40,gap:120,button:256});
  await f.walkTo(824,767);await f.walkTo(696,775);await f.walkTo(696,647,{done:async()=>await f.location()!==235});await f.wait(400);
  assert.equal(await f.location(),230,'escape ladder');
 }},
 {name:'workshop-brothers',async run(f){
  await f.fieldHeal({threshold:.95});
  for(const [slot,id] of[[0,0],[2,1]])for(let i=0;i<4&&await f.read(0x2607+id*80,2)<20;i++)await f.rk.useItem(192,slot);
  await f.travel('brothers',{target:-1,gx:136,gy:615,room:230});await f.hold(16,12);
  for(let i=0;i<300&&await f.location()!==498;i++){if(await f.read(0x117)&1){await f.fight('workshop brothers',{techs:{0:1}});continue;}await f.tap(256,100);}
  assert.equal(await f.story(),66,'six brothers defeated');
 }},
 {name:'second-repair',async run(f){
  for(let i=0;i<400;i++){if(await f.location()===464&&await f.story()>=69&&i>20)break;await f.tap(256,100);}
  await f.wait(300);assert.equal(await f.location(),464);assert.ok(await f.story()>=69,'second repair');
 }}
];
