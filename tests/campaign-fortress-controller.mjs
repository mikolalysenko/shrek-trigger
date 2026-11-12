import assert from 'node:assert/strict';
import {runSegmentLeg} from './campaign-future-controller.mjs';

// Fresh-save fortress leg: from Puss joining (story 132) to the mountain he
// opens with the Carnival Hatchet (story 135), through the cave behind it to
// Farquaad's fortress (story 136) and into its entrance hall. Controller
// input and reads only.
export const fortressPathsFile='tests/data/fortress-route-paths.json';

const woodsToMountain=[[33,95],[33,97],[34,97],[34,98],[35,98],[35,99],[36,99],[36,100],[40,100],[40,99],[41,99],[41,87],[42,87],[42,86],[43,86],[43,84],[45,84],[45,85],[55,85],[55,84],[63,84],[63,85],[64,85],[64,86],[67,86],[67,84]];
const caveToFortress=[[89,68],[86,68],[86,67],[85,67],[85,66],[83,66],[83,61],[84,61],[84,59]];
const travelFights={threshold:.45,healItem:190};

const doneTalking=async f=>!(await f.read(0x126))&&!!(await f.read(0x11f));
// Read a scene through until the party has control again for a moment.
async function playScene(f,limit=2000){
 let calm=0;
 for(let i=0;i<limit;i++){
  if(await f.read(0x117)&1){await f.fight('scene');calm=0;continue;}
  if(await f.read(0x126)){await f.tap(256,80);calm=0;continue;}
  if(!await f.read(0x11f)){await f.wait(30);calm=0;continue;}
  if(++calm>5)return;await f.wait(30);
 }
}

export const fortressSegments=[
 // Out of the Cursed Woods and east to the mountain wall, where Puss
 // raises the Carnival Hatchet and opens the way (story 135).
 {name:'hatchet-mountain',async run(f){
  f.setFightDefaults(travelFights);
  await f.travel('hut-ladder',{target:140,gx:144,gy:40});await f.wait(300);await f.settle(30);
  await f.travel('woods-exit',{target:497,gx:136,gy:780});await f.wait(300);await f.settle(30);
  await f.walkWorld(woodsToMountain);await f.enterWorldLocation(163);await f.wait(400);
  for(let i=0;i<20&&!(await f.location()===164&&await doneTalking(f));i++)await playScene(f);
  assert.equal(await f.story(),135,'the mountain opens');assert.equal(await f.location(),164,'the cave behind it');
 }},
 // Through the cave, over the hill to the fortress gate (story 136) and in.
 {name:'fortress-gate',async run(f){
  f.setFightDefaults(travelFights);
  await f.travel('magic-cave',{target:497,gx:672,gy:112});await f.wait(300);await f.settle(30);
  await f.walkWorld(caveToFortress);await f.enterWorldLocation(165);await f.wait(400);await playScene(f);
  for(let i=0;i<120&&await f.story()!==136;i++){if(await f.read(0x117)&1){await f.fight('gate');continue;}if(await f.read(0x126)||!await f.read(0x11f)){await f.tap(256,80);continue;}const p=await f.rk.position();await f.hold(p.x<120?144:p.x>124?80:16,8);}
  assert.equal(await f.story(),136,'Farquaad\'s fortress');
  await f.walkTo(112,478,{limit:300});for(let i=0;i<20&&await f.location()===165;i++)await f.hold(16,8);
  await f.wait(300);await playScene(f);assert.equal(await f.location(),166,'the entrance hall');
 }}
];

export async function runFortressLeg(io,evidence,rom,options={}){
 return runSegmentLeg(io,evidence,rom,fortressSegments,{pathsFile:fortressPathsFile,...options});
}
