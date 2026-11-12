import assert from 'node:assert/strict';
import {runSegmentLeg} from './campaign-future-controller.mjs';
import {visitMedinaHouse,shopInMedina,movement} from './medina-controller.mjs';

// Fresh-save return leg: Steve's Last Inn at the End of Time (story 69 to
// 77, Guy Fieri's magic lesson) and the pillar to Medina Village (story 78).
// Controller input and reads only; room travel replays recorded paths.
export const returnPathsFile='tests/data/return-route-paths.json';

// The Last Inn's gate platform and lamp square are joined by a diagonal
// stair the discovery search does not model; these points follow it.
const stairsDown=[[276,191],[316,230],[356,262],[376,272],[412,272],[412,331],[452,371],[492,371]];
const stairsUp=[...stairsDown].reverse().slice(1).concat([[216,191]]);
const toMarket=[[116,48],[116,50],[118,50],[118,51]];
const toCave=[[116,48],[116,53],[114,53],[114,54],[113,54],[113,55],[112,55],[112,56],[103,56],[103,57],[102,57],[102,58],[101,58],[101,59],[97,59],[97,58],[95,58],[95,59],[91,59],[91,58],[86,58],[86,57],[85,57],[85,56]];

const doneTalking=async f=>!(await f.read(0x126))&&!!(await f.read(0x11f));
// Advance dialogue only while a box is open, so a stray A press does not
// reach the party-swap creature beside Steve.
// Steve's welcome opens the native party-swap menu ("Who'll you replace?");
// B keeps the current party and lets the scene continue.
const finishTalk=async(f,limit=160)=>{let idle=0;for(let i=0;i<limit&&!await doneTalking(f);i++){if(await f.read(0x126)){idle=0;await f.tap(256,90);}else if(++idle>8){await f.tap(1,100);idle=0;}else await f.wait(30);}};
const walkPath=async(f,points)=>{for(const[x,y]of points)assert.ok(await f.walkTo(x,y,{limit:600}),`walk ${x},${y}`);};
const talkToSteve=async f=>{
 // Steve answers only from the step just below the lamp post.
 // The lamp post's base blocks a straight drop, so come around its right.
 const at=async()=>{const p=await f.rk.position();return Math.abs(p.x-472)<2&&p.y>=374&&p.y<=377;};
 // Approach from the right so the two followers trail behind, not between
 // Shrek and Steve.
 await f.walkTo(492,371,{limit:300});await f.walkTo(484,376,{limit:200});await f.walkTo(472,376,{limit:200});
 for(let i=0;i<60&&!await at();i++){const p=await f.rk.position();await f.hold((p.x<471?128:p.x>473?64:0)|(p.y<374?32:p.y>377?16:0),1);}
 // Facing up takes a step, so the talk starts from the lower half of it.
 await f.hold(16,3);await f.tap(256,120);await finishTalk(f);
};

export const returnSegments=[
 {name:'inn-arrival',async run(f){
  for(let i=0;i<300;i++){const x=(await f.rk.position()).x;if(await f.read(0x11f)&&!(await f.read(0x126))&&x<4000&&i>5)break;await f.tap(256,100);}
  assert.equal(await f.location(),464);assert.equal(await f.story(),72,'arrived at the Last Inn');
 }},
 {name:'steve-welcome',async run(f){
  await walkPath(f,stairsDown);await talkToSteve(f);
  assert.equal(await f.story(),73,'Steve welcomes the party');
 }},
 // Heading back toward the pillars, Steve calls the party back: Guy Fieri
 // has something to teach them. Talking to him then unlocks Guy's door.
 {name:'steve-reminder',async run(f){
  await walkPath(f,stairsUp);await f.walkTo(243,109,{limit:600});
  for(let i=0;i<60&&await f.story()===73;i++){if(await f.read(0x126))await f.tap(256,90);else await f.wait(30);}
  await finishTalk(f);assert.equal(await f.story(),74,'Steve calls the party back');
  await f.walkTo(216,191,{limit:600});await walkPath(f,stairsDown);await talkToSteve(f);
  assert.equal(await f.story(),75,'Guy Fieri\'s door unlocked');
 }},
 // Guy's lesson: three clockwise laps along the walls from the door (left
 // corner, top, right, bottom), then talk to him; decline the practice round.
 {name:'guy-lesson',async run(f){
  await f.walkTo(492,371,{limit:300});await f.travel('lamp-door',{target:-1,gx:504,gy:274,room:464});
  for(let i=0;i<20&&await f.location()===464;i++)await f.hold(16,6);await f.wait(300);
  assert.equal(await f.location(),465,'Guy Fieri\'s kitchen');
  const slide=async b=>{let last=null;for(let i=0;i<80;i++){await f.hold(b,4);const p=JSON.stringify(await f.rk.position());if(p===last)break;last=p;}};
  const talkToGuy=async()=>{await f.travel('guy-front',{target:-1,gx:128,gy:182,room:465});for(let k=0;k<8&&!(await f.read(0x126));k++){await f.hold(16,4);await f.tap(256,100);}};
  // First talk: the welcome and the instructions (story 76).
  await talkToGuy();await finishTalk(f);assert.equal(await f.story(),76,'Guy explains the lesson');
  await f.walkTo(96,227);await f.wait(4);
  for(let lap=0;lap<3;lap++){
   for(let t=0;t<4&&(await f.rk.position()).y>222;t++)await f.hold(16,4);
   for(const b of[64,16,128,32])await slide(b);await f.walkTo(96,227);
  }
  await talkToGuy();
  let declined=false;
  for(let i=0;i<400&&!(await f.story()>=77&&await doneTalking(f)&&i>10);i++){
   if(!declined&&await f.read(0x12a)===152&&await f.read(0x126)){await f.wait(120);await f.hold(32,3);await f.wait(10);await f.tap(256,90);declined=true;continue;}
   if(await f.read(0x126))await f.tap(256,90);else await f.wait(30);
  }
  assert.equal(await f.story(),77,'the party learns magic');
 }},
 {name:'medina-pillar',async run(f){
  await f.walkTo(96,226);for(let i=0;i<20&&await f.location()===465;i++)await f.hold(32|64,6);await f.wait(300);await finishTalk(f);
  assert.equal(await f.location(),464);
  // Steve's farewell after the lesson (line 126); otherwise he calls the
  // party back again on the way to the pillars.
  await f.travel('door-lamp',{target:-1,gx:492,gy:371,room:464});await talkToSteve(f);
  await walkPath(f,[[472,376],[484,376],[492,371]]);await walkPath(f,stairsUp);await finishTalk(f);
  await f.walkTo(228,141,{limit:600});await finishTalk(f);await f.walkTo(228,141,{limit:200});await f.hold(16,2);await f.hold(256,6);await f.wait(180);
  assert.equal(await f.read(0x12a),150,'Medina Village pillar');await f.tap(256,200);
  for(let i=0;i<60&&await f.location()===464;i++)await f.wait(20);await f.wait(400);
  assert.equal(await f.location(),36,'Medina Village');
 }},
 {name:'medina-house',async run(f){
  const r=await visitMedinaHouse(f.io);assert.equal(r.story,78);
  // The market's hostile prices still buy a few Onions for the keeper.
  await f.walkWorld([[116,51],[118,51]]);await f.enterWorldLocation(39);await f.wait(300);
  await f.walkTo(616,700,{limit:300});const bought=await shopInMedina(f.io,{count:6});
  assert.ok(bought.quantity>=3,'Onions for the cave');
  for(let i=0;i<20&&await f.location()===39;i++){if(await f.read(0x126)||!await f.read(0x11f)){await f.tap(256,60);continue;}await f.hold(32,10);}
  await f.wait(300);assert.equal(await f.location(),496,'back outside Medina');
  await f.walkWorld([[118,51],[116,51],[116,48]]);
 }},
 // The mountain cave's guardian (the original Heckran, stats unchanged)
 // answers physical blows; the route leads with the party's new magic.
 {name:'cave-keeper',async run(f){
  // Cave encounters resist plain blows; meet them with the party's spells.
  const magic={fightWith:n=>f.fight(n,{techs:{0:3,1:11,2:19},threshold:.4})};
  await f.walkWorld(toCave);await f.enterWorldLocation(48);await f.wait(300);await f.settle(30);await f.fieldHeal();
  await f.travel('cave-inner',{target:49,gx:96,gy:470},magic);await f.settle(30);await f.fieldHeal();
  // The keeper's end of 47 is reached the long way: 49's lower doorway into
  // a small chamber of 47, down to the foot of its ladder and up it, west
  // along the lower hall to the west doorway, through a pocket of 49, and
  // back into 47 beside the keeper.
  const through=async(room,dirs)=>{for(const d of dirs)for(let i=0;i<20&&await f.location()===room;i++){if(await f.read(0x117)&1){await magic.fightWith('cave');continue;}await f.hold(d|1,6);}await f.wait(300);await f.settle(30);await f.fieldHeal();};
  await f.fieldHeal();await f.travel('cave-lower-door',{target:-1,gx:272,gy:950,room:49},magic);await through(49,[32]);
  assert.equal(await f.location(),47,'lower chamber');
  for(const[x,y]of[[823,830],[815,851],[814,863]])await f.walkTo(x,y,{limit:300});assert.ok(await f.walkTo(728,900,{limit:600}),'ladder foot');for(let i=0;i<10&&(await f.rk.position()).y>795;i++)await f.hold(16,20);
  await f.travel('ladder-west-door',{target:-1,gx:272,gy:528,room:47},magic);await through(47,[64,96,80,16]);
  assert.equal(await f.location(),49,'cave pocket');
  await f.travel('pocket-keeper-door',{target:-1,gx:400,gy:584,room:49},magic);await through(49,[16,32,128,64]);
  assert.equal(await f.location(),47,'keeper hall');
  await f.fieldHeal({threshold:.95});
  for(const [slot,id] of[[0,0],[1,1],[2,2]])for(let i=0;i<4&&await f.read(0x2607+id*80,2)<24;i++)await f.rk.useItem(192,slot);
  // The last step can wake the keeper; fight it with magic, not blows.
  // Its AI sets bit 7 of stat byte 0x1A while it taunts ("Go ahead, try and
  // attack!") and answers any blow then with a counter on the whole party.
  // A blow queued just before the stance still draws the counter (about two
  // thirds of each member's HP), so the party only attacks while all stand
  // above 75%; Fiona only heals, Shrek's Lightning and Donkey's Fire attack.
  const taunting=async()=>!!(await f.read(0x5fb0+0x1a)&0x80);
  const keeperFight=n=>f.fight(n,{techs:{0:3,2:19},threshold:.7,holdWhile:taunting,safeAbove:.75,healerRefill:192,melee:false,groupHeal:{tech:57,members:[0,1]}});
  await f.travel('keeper-approach',{target:-1,gx:824,gy:519,room:47},{fightWith:keeperFight});
  for(let i=0;i<1200&&!(await f.read(0x117)&1)&&await f.story()===78;i++){if(!await f.read(0x11f))await f.tap(256,100);else await f.hold(17,1);}
  if(await f.read(0x117)&1)await keeperFight('cave keeper');
  for(let i=0;i<180&&(await f.story()!==81||!await f.read(0x11f));i++)await f.tap(256,100);
  assert.equal(await f.story(),81,'cave keeper defeated');await f.wait(120);
  // Ride the underground current out (accept at the native prompt).
  const{route}=movement(f.io);
  await route([[51,27],[50,27],[50,23],[51,22],[52,21],[52.75,19.75],[54,19],[54,17]]);
  for(let i=0;i<200&&await f.read(0x12a)!==234;i++)await f.hold(17,1);
  await f.wait(180);await f.tap(256,120);
  for(let i=0;i<50&&await f.location()===47;i++)await f.tap(256,100);await f.wait(600);
  assert.equal(await f.location(),496,'out on the current');
 }}
];

export async function runReturnLeg(io,evidence,rom,options={}){
 return runSegmentLeg(io,evidence,rom,returnSegments,{pathsFile:returnPathsFile,...options});
}
