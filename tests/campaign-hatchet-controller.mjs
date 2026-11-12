import assert from 'node:assert/strict';
import {runSegmentLeg} from './campaign-future-controller.mjs';
import {arriveAtBakery,feastWithBakery,recruitMongo,walkToBakeryForest,reconcileWithGingy,useBakeryFight} from './bakery-chapter-controller.mjs';
import {walkToHunterDen,completeHunterDen,useDenFight} from './bakery-den-controller.mjs';
import {useBakeryBossFight} from './bakery-controller.mjs';

// Fresh-save hatchet leg: from the wind ride off the mountain (story 96) to
// Pip's confession in Worcestershire (the Hero Badge, story 102), Puss's hut in the
// Cursed Woods (the haft, story 105), back over the bridge to the canyon gate
// and the Last Inn, the Muffin Man's workshop near Medina (story 108), and the
// Wildcrumb Mountain pillar to the prehistoric arrival (location 273), then
// the Bakery chapter through the hunters' den and the recovered Gate Key
// (story 124), back to the Muffin Man and the repaired Carnival Hatchet
// (story 129), and back to Puss, who joins with it (story 132).
// Controller input and reads only.
export const hatchetPathsFile='tests/data/hatchet-route-paths.json';

const landingToPip=[[49,79],[53,79],[53,81],[56,81],[56,87],[54,87],[54,88],[53,88],[53,89],[50,89],[50,92],[49,92],[49,93],[48,93],[48,99],[46,99],[46,103],[48,103],[48,104],[49,104],[49,109],[50,109],[50,111]];
const pipToWoods=[[51,103],[47,103],[47,102],[46,102],[46,94],[41,94],[41,99],[40,99],[40,100],[36,100],[36,99],[35,99],[35,98],[34,98],[34,97],[33,97],[33,95],[31,95],[31,94]];
const woodsToBridge=[[31,97],[32,97],[32,100],[40,100],[40,99],[41,99],[41,87],[42,87],[42,86],[43,86],[43,76],[37,76],[37,75],[35,75],[35,72],[31,72],[31,64]];
const bridgeToCanyon=[[31,45],[32,45],[32,44],[35,44],[35,45],[37,45],[37,44],[38,44],[38,43],[39,43],[39,42],[40,42],[40,41],[48,41],[48,40],[51,40],[51,37],[53,37],[54,37],[54,31],[55,31],[55,28],[55,27],[55,26]];
const medinaToWorkshop=[[116,53],[114,53],[114,54],[113,54],[113,55],[112,55],[112,56],[111,56],[111,57],[110,57],[110,58],[109,58],[109,59],[102,59],[102,60],[101,60],[101,61],[96,61],[96,62],[95,62],[95,63],[94,63],[94,64],[89,64]];

const doneTalking=async f=>!(await f.read(0x126))&&!!(await f.read(0x11f));
const finishTalk=async(f,limit=300)=>{for(let i=0;i<limit&&!await doneTalking(f);i++){if(await f.read(0x117)&1){await f.fight('scene');continue;}if(await f.read(0x126))await f.tap(256,80);else await f.wait(30);}};
// Face a direction and press A, then read the conversation through.
const talk=async(f,x,y,dir)=>{await f.walkTo(x,y,{limit:500});await f.hold(dir,4);await f.hold(256,6);await f.wait(60);await finishTalk(f);};
// Walk out of a building or room by holding a direction until the room changes.
const leave=async(f,room,dir,at=null)=>{for(let i=0;i<40&&await f.location()===room;i++){if(await f.read(0x126)||!await f.read(0x11f)){await f.tap(256,60);continue;}if(at)await f.walkTo(at[0],at[1],{limit:60});await f.hold(dir,10);}await f.wait(300);};
// A Last Inn pillar: stand on its tile, press A and accept.
const pillar=async(f,x,y,line)=>{
 // Steve sometimes speaks first; finish his line and press again.
 for(let attempt=0;attempt<4;attempt++){
  await f.walkTo(x,y,{limit:800});await finishTalk(f);await f.walkTo(x,y,{limit:200});await f.hold(16,2);await f.hold(256,6);await f.wait(180);
  if(await f.read(0x12a)===line&&await f.read(0x126))break;await finishTalk(f);
 }
 assert.equal(await f.read(0x12a),line,'Last Inn pillar line '+line);await f.tap(256,200);
 for(let i=0;i<60&&await f.location()===464;i++)await f.wait(20);await f.wait(400);
};
const travelFights={threshold:.45,healItem:190};

export const hatchetSegments=[
 // Pip, the boy who claimed the Hero Badge, confesses at home in Worcestershire.
 {name:'pip-badge',async run(f){
  f.setFightDefaults(travelFights);
  await f.walkWorld(landingToPip);await f.enterWorldLocation(152);await f.wait(400);await finishTalk(f);
  await talk(f,632,712,16);
  assert.equal(await f.story(),102,'Pip confesses');assert.equal((await f.inventory())[179],1,'the Hero Badge');
  await leave(f,152,32,[672,740]);assert.equal(await f.location(),497,'out of Pip\'s house');
 }},
 // Puss's hut in the Cursed Woods: his greeting at the bed, the badge talk,
 // then the chest by the bed, where he hands over the hatchet's haft.
 {name:'puss-haft',async run(f){
  await f.walkWorld(pipToWoods);await f.enterWorldLocation(140);await f.wait(400);await f.settle(60);
  await f.travel('woods-hut',{target:141,gx:256,gy:0});await f.wait(300);await finishTalk(f);
  await f.walkTo(144,90,{limit:200});await f.walkTo(144,168,{limit:300});
  await talk(f,100,160,64);
  for(const [x,y] of [[100,150],[70,150]])await f.walkTo(x,y,{limit:300});await talk(f,70,126,64);
  await f.walkTo(40,140,{limit:300});await talk(f,40,127,16);
  assert.equal(await f.story(),105,'Puss gives up the haft');assert.equal((await f.inventory())[81],1,'the hatchet haft');
  await f.travel('hut-ladder',{target:140,gx:144,gy:40});await f.wait(300);await f.settle(30);
  await f.travel('woods-exit',{target:497,gx:136,gy:780});await f.wait(300);await f.settle(30);
 }},
 // North over the bridge and up the Old Kingdom Canyon to its gate.
 {name:'canyon-gate',async run(f){
  await f.walkWorld(woodsToBridge);await f.enterWorldLocation(135);await f.wait(300);await f.settle(60);
  for(const [x,y] of [[504,128],[624,128],[744,120],[864,176],[882,176]])await f.walkTo(x,y,{limit:600});
  for(let i=0;i<10;i++)await f.hold(16,4);for(let i=0;i<10;i++)await f.hold(128,4);
  for(let i=0;i<40&&await f.location()===135;i++){if(await f.read(0x117)&1){await f.fight('bridge');continue;}if(await f.read(0x126)||!await f.read(0x11f)){await f.tap(256,60);continue;}await f.hold(128,8);}
  await f.wait(300);await f.settle(30);assert.equal(await f.location(),497,'north of the bridge');
  await f.walkWorld(bridgeToCanyon);await f.enterWorldLocation(112);await f.wait(300);await f.settle(30);
  await f.travel('canyon-up',{target:113,gx:456,gy:239});await f.wait(300);await f.settle(30);
  await f.travel('canyon-gate',{target:464,gx:136,gy:100});await f.wait(400);await f.settle(60);
  assert.equal(await f.location(),464,'the canyon gate leads to the Last Inn');
 }},
 // Medina's pillar, the walk to the Muffin Man's workshop and his story of
 // the Carnival Hatchet (story 108), then back to the house gate.
 {name:'muffin-man',async run(f){
  await pillar(f,228,141,150);await finishTalk(f);assert.equal(await f.location(),36,'Medina house');
  await f.travel('medina-house-out',{target:496,gx:176,gy:200});await f.wait(300);await f.settle(30);
  await f.walkWorld(medinaToWorkshop);await f.enterWorldLocation(40);await f.wait(400);await finishTalk(f);
  await talk(f,648,405,16);assert.equal(await f.story(),108,'the Muffin Man needs Dreamstone');
  await leave(f,40,32,[576,470]);assert.equal(await f.location(),496,'out of the workshop');
  await f.walkWorld([[89,65],[89,64],...[...medinaToWorkshop].reverse().slice(1),[116,52],[116,48],[116,47],[115,47]]);
  await f.enterWorldLocation(36);await f.wait(400);await f.settle(30);
  await f.travel('medina-house-gate',{target:464,gx:112,gy:140});await f.wait(400);await f.settle(60);
  assert.equal(await f.location(),464,'back in the Last Inn');
 }},
 // The Wildcrumb Mountain pillar (tile 12,12) to 65,000,000 B.C.
 {name:'wildcrumb-pillar',async run(f){
  await f.fieldHeal({threshold:.95,broth:false});
  await pillar(f,200,200,151);
  for(let i=0;i<200&&await f.location()!==273;i++){if(await f.read(0x117)&1){await f.fight('arrival');continue;}if(await f.read(0x126))await f.tap(256,80);else await f.hold(16,4);}
  assert.equal(await f.location(),273,'Wildcrumb Mountain');assert.equal(await f.story(),108);assert.equal((await f.inventory())[215],1,'the Gate Key');
 }},
 // The Bakery chapter's own controllers carry the arrival, feast, theft,
 // Mongo and Gingy scenes; the route supplies its battle tactics.
 {name:'bakery-feast',async run(f){
  bakeryTactics(f);await arriveAtBakery(f.io);await feastWithBakery(f.io);
  assert.equal(await f.story(),117,'the morning after the feast');
 }},
 {name:'bakery-mongo',async run(f){
  bakeryTactics(f);await recruitMongo(f.io);await walkToBakeryForest(f.io);await reconcileWithGingy(f.io);
  assert.equal(await f.story(),123,'Gingy reconciled');
 }},
 // Blows clear the den; Shrek keeps his MP for the kiln guardian, whose
 // shell gives way to Lightning.
 {name:'hunter-den',async run(f){
  bakeryTactics(f);
  for(const [slot,n] of [[0,3],[2,2]])for(let i=0;i<n;i++)await f.rk.useItem(192,slot);
  await walkToHunterDen(f.io);
  // Fiona arrives at the guardian with MP for the healing.
  for(let i=0;i<3&&await f.read(0x2607+80,2)<30;i++)await f.rk.useItem(192,2);
  const den=await completeHunterDen(f.io,f.rom);
  assert.equal(den.reward.story,124,'the Gate Key recovered');assert.equal(await f.story(),124);
 }},
 // Farewell at Mongo's hut (story 125), back up the mountain path to the
 // Wildcrumb gate and the Last Inn (story 126).
 {name:'dreamstone-gate',async run(f){
  f.setFightDefaults(travelFights);
  await f.travel('bakery-exit',{target:499,gx:128,gy:400});await f.wait(300);await finishTalk(f);
  assert.equal(await f.story(),125,'the Bakery says goodbye');
  await f.walkWorld([[60,65],[65,65],[65,73],[62,73],[62,77],[61,77],[61,78],[60,78],[60,90],[49,90],[49,88]]);
  await f.enterWorldLocation(274);await f.wait(300);await f.settle(30);
  await f.travel('mountain-path-up',{target:273,gx:152,gy:0});await f.wait(300);await f.settle(30);
  await f.travel('wildcrumb-ledge',{target:272,gx:88,gy:0});await f.wait(300);await f.settle(30);
  await f.travel('wildcrumb-gate',{target:464,gx:155,gy:90});await f.wait(400);await f.settle(60);
  assert.equal(await f.location(),464,'the Wildcrumb gate leads to the Last Inn');assert.equal(await f.story(),126);
 }},
 // The Muffin Man takes head, haft and Dreamstone down to his forge; two
 // rounds of talk with him and Donkey finish the Carnival Hatchet (story 129).
 {name:'hatchet-repair',async run(f){
  f.setFightDefaults(travelFights);
  await pillar(f,228,141,150);await finishTalk(f);assert.equal(await f.location(),36,'Medina house');
  await f.travel('medina-house-out',{target:496,gx:176,gy:200});await f.wait(300);await f.settle(30);
  await f.walkWorld(medinaToWorkshop);await f.enterWorldLocation(40);await f.wait(400);await finishTalk(f);
  await talk(f,648,405,16);
  await f.travel('workshop-stairs',{target:41,gx:700,gy:470});await f.wait(300);await finishTalk(f);
  for(let round=0;round<3&&await f.story()!==129;round++){await chase(f,9);await chase(f,3);await f.wait(300);await finishTalk(f);}
  assert.equal(await f.story(),129,'the Carnival Hatchet is whole');assert.deepEqual(await f.party(),[0,1,2]);
 }},
 // Back to 600 A.D.: the house gate, the canyon pillar, down the canyon and
 // south over the bridge to the Cursed Woods.
 {name:'return-to-puss',async run(f){
  f.setFightDefaults(travelFights);
  await f.travel('workshop-exit',{target:496,gx:576,gy:480});await f.wait(300);await finishTalk(f);
  await f.walkWorld([[89,65],[89,64],...[...medinaToWorkshop].reverse().slice(1),[116,52],[116,48],[116,47],[115,47]]);
  await f.enterWorldLocation(36);await f.wait(400);await f.settle(30);
  await f.travel('medina-house-gate',{target:464,gx:112,gy:140});await f.wait(400);await f.settle(60);
  await pillar(f,196,122,153);await f.settle(60);assert.equal(await f.location(),113,'Old Kingdom Canyon');
  await f.travel('canyon-out',{target:112,gx:0,gy:120});await f.settle(30);
  await f.travel('canyon-down',{target:497,gx:304,gy:500});await f.wait(200);
  await f.walkWorld([...bridgeToCanyon].reverse().slice(2).concat([[31,57]]));await f.enterWorldLocation(135);await f.wait(300);await f.settle(60);
  for(const [x,y] of [[960,140],[922,136],[922,111],[882,176],[864,176],[744,120],[624,128],[504,128],[408,159],[152,159]])await f.walkTo(x,y,{limit:600});
  for(let i=0;i<40&&await f.location()===135;i++){if(await f.read(0x117)&1){await f.fight('bridge');continue;}if(await f.read(0x126)||!await f.read(0x11f)){await f.tap(256,60);continue;}await f.hold(64,8);}
  await f.wait(300);await f.settle(30);assert.equal(await f.location(),497,'south of the bridge');
 }},
 // Puss sees the hatchet whole; his memories of Sir Bram play out and he
 // joins the party (story 132).
 {name:'puss-joins',async run(f){
  await f.walkWorld([...woodsToBridge].reverse().slice(1).concat([[31,94]]));
  await f.enterWorldLocation(140);await f.wait(400);await f.settle(60);
  await f.travel('woods-hut',{target:141,gx:256,gy:0});await f.wait(300);await finishTalk(f);
  await f.walkTo(144,90,{limit:200});await f.walkTo(144,168,{limit:300});
  await f.walkTo(110,150,{limit:300});await f.walkTo(110,143,{limit:300});await f.hold(64,4);await f.hold(256,6);await f.wait(60);
  for(let i=0;i<600&&await f.story()!==132;i++){if(await f.read(0x117)&1){await f.fight('flashback');continue;}if(await f.read(0x126)||!await f.read(0x11f))await f.tap(256,80);else await f.wait(30);}
  // The native party menu opens as Puss joins; B keeps the new lineup.
  for(let i=0;i<60&&!await doneTalking(f);i++){if(await f.read(0x126))await f.tap(256,80);else await f.tap(1,100);}
  assert.equal(await f.story(),132,'Puss joins');assert.ok((await f.party()).includes(4),'Puss in the party');
 }}
];
// Walk up to a moving actor (object index) and talk to it.
async function chase(f,idx){
 for(let i=0;i<250;i++){
  if(await f.read(0x126)||!await f.read(0x11f)){await finishTalk(f);return true;}
  const ox=await f.read(0x1800+idx*2,2)/16,oy=await f.read(0x1880+idx*2,2)/16;if(ox>4000)return false;
  const p=await f.rk.position(),dx=ox-p.x,dy=oy-p.y;
  if(Math.abs(dx)<22&&Math.abs(dy)<22){await f.hold(Math.abs(dx)>Math.abs(dy)?(dx>0?128:64):(dy>0?32:16),3);await f.hold(256,4);await f.wait(60);continue;}
  await f.hold((Math.abs(dx)>4?(dx>0?128:64):0)|(Math.abs(dy)>4?(dy>0?32:16):0),4);
 }
 return false;
}
function bakeryTactics(f){
 const blows=async()=>{await f.fight('bakery',{threshold:.45,healItem:190});};
 useBakeryFight(blows);useDenFight(blows);
 // The kiln guardian answers Lightning with a discharge on the whole party
 // (most of each member's HP), so nobody strikes while anyone is below 85%:
 // Aura Whirl when Shrek and Fiona are ready, her Sing-Along (broth when
 // dry), Mid Tonics from the others.
 useBakeryBossFight(async enemy=>{await f.fight('kiln guardian',{first:[enemy],threshold:.6,healItem:190,techs:{0:3},safeAbove:.85,groupHeal:{tech:57,members:[0,1]},healerRefill:192});});
}

export async function runHatchetLeg(io,evidence,rom,options={}){
 return runSegmentLeg(io,evidence,rom,hatchetSegments,{pathsFile:hatchetPathsFile,...options});
}
