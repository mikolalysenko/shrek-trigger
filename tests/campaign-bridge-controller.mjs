import assert from 'node:assert/strict';
import {runSegmentLeg} from './campaign-future-controller.mjs';
import {requestBridgeSupplies,collectBridgeSupplies,deliverBridgeSupplies,defendBridge} from './bridge-controller.mjs';
import {crossGuardiaForestNorth,crossGuardiaForestSouth} from './forest-controller.mjs';

// Fresh-save bridge leg: from the mountain cave's current (story 81) through
// the festival gate, the Last Inn's canyon pillar to 600 A.D. (story 84), the
// captain's ration request, the castle chef's Onion Bread, the delivery and
// the bridge defense against Horner and the Bone Warden (story 90).
export const bridgePathsFile='tests/data/bridge-route-paths.json';

const toFestival=[[45,49],[43,49],[43,38],[45,38],[45,36],[46,36],[46,35],[47,35],[47,33],[49,33],[49,30],[50,30],[50,29],[53,29],[53,28]];
const canyonToBridge=[[55,28],[55,31],[54,31],[54,37],[53,37],[51,37],[51,40],[48,40],[48,41],[40,41],[40,42],[39,42],[39,43],[38,43],[38,44],[37,44],[37,45],[35,45],[35,44],[32,44],[32,45],[31,45],[31,57]];

const bridgeToForest=[[31,55],[31,40],[32,40],[32,35],[35,35],[35,34]];
const forestToCastle=[[35,31],[35,29],[35,27],[35,25]];
const castleToForest=[[35,27],[35,31]];
const forestToBridge=[[32,35],[32,40],[31,40],[31,57]];

const doneTalking=async f=>!(await f.read(0x126))&&!!(await f.read(0x11f));
const finishTalk=async(f,limit=160)=>{for(let i=0;i<limit&&!await doneTalking(f);i++){if(await f.read(0x126))await f.tap(256,90);else await f.wait(30);}};

export const bridgeSegments=[
 // Four travelers spill every gate into the Last Inn; its canyon pillar
 // (the gate the party came home through) leads back to 600 A.D.
 {name:'festival-gate',async run(f){
  await f.walkWorld(toFestival);await f.enterWorldLocation(5);await f.wait(300);await f.settle(60);
  await f.rk.go([[400,604],[392,600],[360,600],[360,568],[328,568],[328,520],[200,520],[200,440],[328,440],[328,400],[392,400],[392,360],['up',150]],'festival entrance');
  await f.wait(400);await f.settle(60);assert.equal(await f.location(),439,'festival grounds');
  await f.travel('grounds-gate-square',{target:8,gx:376,gy:20});await f.wait(300);await f.settle(30);
  for(let i=0;i<8;i++)await f.hold(16,20);await f.tap(256,10);
  for(let i=0;i<40&&await f.location()===8;i++){await f.wait(60);if(await f.read(0x126))await f.tap(256,60);}
  await f.wait(300);await f.settle(60);assert.equal(await f.location(),464,'the gate spills into the Last Inn');
  await f.walkTo(196,122,{limit:600});await f.hold(16,2);await f.hold(256,6);await f.wait(150);
  assert.equal(await f.read(0x12a),153,'Old Kingdom Canyon pillar');await f.wait(60);await f.tap(256,200);
  for(let i=0;i<60&&await f.location()===464;i++)await f.wait(20);await f.wait(400);await f.settle(60);
  assert.equal(await f.location(),113);assert.equal(await f.story(),84,'back in 600 A.D.');
 }},
 {name:'bridge-request',async run(f){
  await f.travel('canyon-out',{target:112,gx:0,gy:120});await f.settle(30);
  await f.travel('canyon-down',{target:497,gx:304,gy:500});await f.wait(200);
  await f.walkWorld(canyonToBridge);await f.enterWorldLocation(135);await f.wait(300);await f.settle(60);
  await f.travel('bridge-captain',{target:-1,gx:58*16+8,gy:10*16+7,room:135});
  await requestBridgeSupplies(f.io);
 }},
 // North through Guardia Forest (the shared crossing) to the castle, where
 // the chef bakes Onion Bread for the knights.
 {name:'castle-chef',async run(f){
  await f.travel('bridge-north-exit',{target:497,gx:1008,gy:100});await f.wait(200);
  await f.walkWorld(bridgeToForest);await f.enterWorldLocation(119);await f.wait(400);await f.settle(30);
  await crossGuardiaForestNorth(f.io,()=>f.fight('forest'));
  await f.walkWorld(forestToCastle);await f.enterWorldLocation(120);await f.wait(500);await finishTalk(f);
  await f.travel('courtyard-kitchen',{target:123,gx:768,gy:550});await f.wait(300);await finishTalk(f);
  await f.travel('kitchen-chef',{target:-1,gx:10*16+8,gy:30*16+7,room:123});await f.hold(16,4);
  await collectBridgeSupplies(f.io);
 }},
 // Back south through the forest with the bread, then the delivery and the
 // defense against Horner and the Bone Warden.
 {name:'bridge-defense',async run(f){
  await f.walkWorld(castleToForest);await f.enterWorldLocation(119);await f.wait(500);
  await crossGuardiaForestSouth(f.io,()=>f.fight('forest'));await f.wait(300);
  await f.walkWorld(forestToBridge);await f.enterWorldLocation(135);await f.wait(300);await f.settle(60);
  await f.travel('bridge-captain-return',{target:-1,gx:58*16+8,gy:10*16+7,room:135});
  await deliverBridgeSupplies(f.io);
  // The original Zombor and its escorts: the party's spells, healing between.
  await f.fieldHeal({threshold:.95});
  for(const [slot,id] of[[0,0],[1,1],[2,2]])for(let i=0;i<4&&await f.read(0x2607+id*80,2)<24;i++)await f.rk.useItem(192,slot);
  await defendBridge(f.io,{fight:n=>f.fight(n,{techs:{0:3,1:11,2:19},threshold:.45})});
  assert.equal(await f.story(),90,'bridge defended');
 }}
];

export async function runBridgeLeg(io,evidence,rom,options={}){
 return runSegmentLeg(io,evidence,rom,bridgeSegments,{pathsFile:bridgePathsFile,...options});
}
