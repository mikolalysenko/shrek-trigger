import assert from 'node:assert/strict';
import {runSegmentLeg} from './campaign-future-controller.mjs';
import {buyFromShop} from './shop-controller.mjs';
import {movement} from './medina-controller.mjs';

// Fresh-save mountain leg: from the defended bridge (story 90) east to the
// mountain, the ogre ambush at its foot (story 93), the west ladder onto the
// south face, the climb through the east faces to the summit cave and the
// clown challenge. Controller input and reads only.
export const mountainPathsFile='tests/data/mountain-route-paths.json';

const bridgeToDorino=[[31,72],[31,75],[35,75],[35,73],[35,72]];
const dorinoToMountain=[[35,72],[46,72],[46,73],[50,73],[50,74],[53,74],[53,73],[53,72]];

// Healing on the climb: Fiona's Sing-Along while her MP lasts (the broths
// are kept for the clown challenge), then Mid Tonics and Onions.
async function healUp(f,threshold){
 await f.fieldHeal({threshold,broth:false});
 const members=(await f.party()).filter(id=>id<8);
 for(let s=0;s<members.length;s++)for(let n=0;n<6;n++){
  const id=members[s],hp=await f.read(0x2603+id*80,2),max=await f.read(0x2605+id*80,2);
  if(!hp||hp>=max*threshold)break;const inv=await f.inventory(),item=max-hp>=120&&inv[190]?190:inv[189]?189:0;
  if(!item||!await f.rk.useItem(item,s))break;
 }
}
// Enemy 116 shrugs off blows; Donkey's Fire and Shrek's Lightning are aimed at it.
const climbFight={threshold:.45,healItem:190,targeted:{116:{2:19,0:3,1:11}}};
const climb=f=>{f.setFightDefaults(climbFight);return {fightWith:async n=>{await f.fight(n);await f.settle(20);await healUp(f,.7);}};};

export const mountainSegments=[
 // Dorino's general store, south of the bridge: Onions, Mid Tonics and
 // Revives for the climb (it sells no OnionBroth).
 {name:'dorino-store',async run(f){
  await f.walkWorld(bridgeToDorino);await f.enterWorldLocation(139);await f.wait(400);await f.settle(30);
  const{walk}=movement(f.io);await walk(896,430);try{await walk(896,410);}catch{}
  const bought=await buyFromShop(f.io,[[189,20],[190,35],[199,4]]);
  assert.ok(bought[189]>=10&&bought[190]>=20,'climbing supplies '+JSON.stringify(bought));
  for(let i=0;i<20&&await f.location()===139;i++)await f.hold(32,20);
  await f.wait(300);assert.equal(await f.location(),497,'back on the overworld');
  await healUp(f,.95);
 }},
 // The entrance (145): the river north only reaches the waterfall pool, so
 // the route turns west, where an ogre chasing a villager ambushes the
 // party, then climbs the west ladder to the south face (142).
 {name:'mountain-ambush',async run(f){
  await f.walkWorld(dorinoToMountain);await f.enterWorldLocation(145);await f.wait(400);await f.settle(60);
  assert.equal(await f.location(),145,'mountain entrance');
  for(const [x,y] of [[312,300],[200,200],[130,180],[152,85]])await f.rk.go([[x,y]],'mountain entrance');
  await f.walkTo(240,40,{done:async()=>await f.story()===93,limit:900});
  await f.settle(60);assert.equal(await f.story(),93,'ogre ambush at the mountain foot');
  await f.walkTo(240,40,{limit:600});await f.hold(32,8);
  for(let i=0;i<80&&(await f.rk.position()).x>192;i++)await f.hold(64,2);
  for(let i=0;i<8&&await f.location()===145;i++)await f.hold(16,20);
  await f.wait(300);await f.settle(30);assert.equal(await f.location(),142,'west ladder to the south face');
 }},
 // The south face (142) and the lower east face (146) lead to the upper
 // east face (143); the encounters on the way are fought with healing after.
 {name:'mountain-climb',async run(f){
  await healUp(f,.95);
  await f.travel('south-face-ledge',{target:-1,gx:87,gy:401,room:142},climb(f));await healUp(f,.95);
  await f.travel('south-face-climb',{target:146,gx:496,gy:24},climb(f));await f.wait(200);await f.settle(30);await healUp(f,.9);
  await f.travel('lower-east-face',{target:143,gx:8,gy:64},climb(f));await f.wait(200);await f.settle(30);await healUp(f,.9);
  assert.equal(await f.location(),143,'upper east face');
 }},
 // Over the top: 143 → 147 → 150 → 144 (the vista) → 148 (the summit) →
 // 149, down its plateau to the bottom-right ledge, which drops into the
 // west end of 143 beside the cave mouth (151).
 {name:'mountain-summit',async run(f){
  // The summit's back-to-back battles need spells: Donkey gets three broths.
  for(let i=0;i<3&&await f.read(0x2607+2*80,2)<30;i++)await f.rk.useItem(192,2);
  await f.travel('upper-east-face',{target:144,gx:960,gy:320},climb(f));await f.wait(200);await f.settle(30);await healUp(f,.8);
  await f.travel('mountain-vista',{target:148,gx:0,gy:0},climb(f));await f.wait(200);await f.settle(30);await healUp(f,.8);
  await f.travel('summit-path',{target:149,gx:0,gy:0},climb(f));await f.wait(200);await f.settle(30);
  assert.ok(await f.walkTo(968,224,{limit:900}),'149 plateau');await healUp(f,.8);
  await f.travel('waterfall-ledge',{target:143,gx:1008,gy:460},climb(f));await f.wait(200);await f.settle(30);
  await f.travel('cave-approach',{target:151,gx:256,gy:48},climb(f));await f.wait(200);await f.settle(30);
  assert.equal(await f.location(),151,'cave of the Carnival Hatchet');
 }},
 // The clown challenge: the duo, then the Great Milenko. Everyone starts
 // with full MP (OnionBroth); Shrek's Eye Lasers scatter Milenko's stored
 // tornado energy, as the Dorino tip says, and nobody attacks while an ally
 // is below half HP. Then the hatchet head and the wind ride down.
 {name:'clown-challenge',async run(f){
  await healUp(f,.95);
  for(const s of [0,1,2])for(let i=0;i<6&&await f.read(0x2607+s*80,2)<await f.read(0x2609+s*80,2)-4;i++){const before=await f.read(0x2607+s*80,2);await f.rk.useItem(192,s);if(await f.read(0x2607+s*80,2)<=before)break;}
  const clowns=n=>f.fight(n,{techs:{0:2,1:11,2:19},threshold:.45,safeAbove:.5,healItem:190});
  const seen=new Set();
  for(let i=0;i<900&&!(seen.has(153)&&!(await f.read(0x117)&1)&&await f.read(0x12a)===38&&!await f.read(0x126)&&await f.read(0x11f));i++){
   if(await f.read(0x117)&1){await f.wait(200);for(const id of await f.bytes(0xaf02,8))seen.add(id);await clowns('clown challenge');continue;}
   if(await f.read(0x126)||!await f.read(0x11f)){await f.tap(256,60);continue;}
   const p=await f.rk.position(),dx=136-p.x,dy=140-p.y;
   if(Math.abs(dx)<3&&Math.abs(dy)<3){await f.hold(16,4);await f.tap(256,60);continue;}
   await f.hold((Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),4);
  }
  assert.ok(seen.has(151)||seen.has(152),'the clown duo');assert.ok(seen.has(153),'the Great Milenko');
  for(let i=0;i<300&&await f.story()!==96;i++){if(await f.read(0x126)||!await f.read(0x11f)){await f.tap(256,60);continue;}const p=await f.rk.position(),dx=136-p.x,dy=127-p.y;await f.hold((Math.abs(dx)>3?(dx>0?128:64):0)|(Math.abs(dy)>3?(dy>0?32:16):0)||16,4);}
  assert.equal(await f.story(),96,'Broken Hatchet Head');assert.equal((await f.inventory())[80],1,'one Broken Hatchet Head');
  for(let i=0;i<60&&await f.location()===151;i++){if(await f.read(0x126)||!await f.read(0x11f))await f.tap(256,60);else await f.wait(30);}
  await f.wait(300);await f.settle(30);assert.equal(await f.location(),497,'the wind ride to the foot of the mountain');
 }}
];

export async function runMountainLeg(io,evidence,rom,options={}){
 return runSegmentLeg(io,evidence,rom,mountainSegments,{pathsFile:mountainPathsFile,...options});
}
