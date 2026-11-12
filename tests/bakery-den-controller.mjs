import assert from 'node:assert/strict';
import {u16} from '../engine/rom.js';
import {walkWorld,enterWorldLocation} from './world-controller.mjs';
import {quantity} from './bakery-chapter-controller.mjs';
import {recoverGateKey} from './bakery-controller.mjs';
import {attackNativeEnemy,useNativeItem} from './battle-controller.mjs';

// Verified native collision waypoints. This driver observes RAM and sends
// controller input; it never changes positions, enemies, HP or story flags.
const forestPath=[
 [184,136],[192,112],[216,112],[216,104],[344,104],[344,72],[392,72],[392,152],
 [408,152],[408,128],[428,112],[456,112],[456,184],[448,200],[440,216],[440,344],
 [464,344],[464,328],[512,328],[512,312],[552,312],[568,296],[568,270],[592,248],
 [600,256],[616,264],[632,264],[656,272],[696,272],[712,272],[712,140],[728,140],
 [728,124],[744,124],[744,92],[760,92],[760,76],[808,76],[808,60],[824,60],
 [824,44],[904,44],[904,56],[920,56],[920,216],[936,216],[936,280],[920,304],
 [920,456],[920,464],[888,504],[872,680],[872,696],[888,696],[888,712],[952,712],
 [952,696],[968,696],[968,632],[952,632],[952,560],
 [952,564],[958,528],[984,502],[984,448],[934,398],[778,398],[696,480],[696,528],
 [760,592],[760,646],[744,662],[744,688],[720,712],[624,712],[568,656],[542,656],
 [518,680],[502,680],[470,712],[344,712],[280,648],[280,624],[264,608],[202,606],
 [186,622],[152,624],[152,710],[122,742]
];

// A connected campaign can supply its own battle tactics (useDenFight).
let fightHook=null;export function useDenFight(fn){fightHook=fn;}
export function bakeryTraversal(io,{healParty=false}={}){
 const encounters=[];
 async function fight(){
  assert.ok(await io.read(0x117)&1);await io.wait(400);
  const encounter={location:await io.read(0x100,2),formation:Array.from(await io.bytes(0xaf02,8)),heals:0,revives:0};encounters.push(encounter);
  if(fightHook){await fightHook();assert.equal(await io.read(0x117)&1,0,"Bakery encounter completes");await io.wait(180);return;}
  for(let n=0;n<180&&(await io.read(0x117)&1);n++){
   if(!healParty){await io.tap(256,100);continue;}
   const hp=[];for(let slot=0;slot<3;slot++)hp.push(await io.read(0x5e30+slot*128,2));
   assert.ok(hp.some(Boolean),'the party must survive the connected route');
   const living=[];for(let slot=0;slot<8;slot++)if(encounter.formation[slot]!==255&&await io.read(0x5e30+(slot+3)*128,2))living.push({enemy:encounter.formation[slot],slot:slot+3});
   if(!living.length){await io.tap(256,100);continue;}
   if(hp.includes(0)){
    if(await useNativeItem(io,199,hp.indexOf(0),{allowBattleEnd:true}))encounter.revives++;
   }else if(hp.some(h=>h<650)){
    if(await useNativeItem(io,197,null,{allowBattleEnd:true}))encounter.heals++;
   }else await attackNativeEnemy(io,living[0].enemy,{targetSlot:living[0].slot});
   await io.wait(400);
  }
  assert.equal(await io.read(0x117)&1,0,'Bakery encounter completes');await io.wait(180);
 }
 async function walk(x,y,{stopOnBattle=false}={}){
  const location=await io.read(0x100,2);let last=null,still=0,detours=0;
  for(let n=0;n<1200;n++){
   assert.equal(await io.read(0x100,2),location,'unexpected transition during Bakery waypoint');
   if(await io.read(0x117)&1){if(stopOnBattle)return false;await fight();continue;}
   if(!await io.read(0x11f)){await io.tap(256,100);continue;}
   const r=await io.bytes(0x100,0x1900),leader=u16(r,0x97),px=u16(r,0x1700+leader),py=u16(r,0x1780+leader),dx=x-px/16,dy=y-py/16;
   if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return true;
   // A live hunter can stand still across the straight line. A player would
   // engage it or step around it; do the same, alternating sides.
   still=last&&last[0]===px&&last[1]===py?still+1:0;last=[px,py];
   if(still>=90){
    still=0;detours++;await io.tap(256,100);if(await io.read(0x117)&1)continue;
    const across=Math.abs(dy)>=Math.abs(dx)?(detours%2?128:64):(detours%2?32:16);await io.hold(1|across,24);continue;
   }
   await io.hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
  }
  await io.shot('bakery-den-waypoint-stuck');
  const r=await io.bytes(0x100,0x1900),leader=u16(r,0x97),px=u16(r,0x1700+leader)/16,py=u16(r,0x1780+leader)/16;
  assert.fail(`Bakery waypoint ${location}:${x},${y}; leader ${leader} at ${px},${py}; control ${await io.read(0x11f)}; battle ${await io.read(0x117)}`);
 }
 async function route(points){for(const[x,y]of points)await walk(x,y);}
 async function transition(keys,destination,limit=240){
  const source=await io.read(0x100,2);
  for(let n=0;n<limit&&await io.read(0x100,2)===source;n++){
   if(await io.read(0x117)&1)await fight();else if(!await io.read(0x11f))await io.tap(256,100);else await io.hold(keys,1);
  }
  await io.wait(400);assert.equal(await io.read(0x100,2),destination,'Bakery native doorway');
  if(await io.read(0x117)&1)await fight();
 }
 async function hole(facing,destination){
  const source=await io.read(0x100,2);await io.hold(facing,8);await io.tap(256,100);
  for(let n=0;n<24&&await io.read(0x100,2)===source;n++){
   if(await io.read(0x117)&1){await fight();return false;}
   await io.wait(30);
  }
  if(await io.read(0x100,2)===source)return false;
  assert.equal(await io.read(0x100,2),destination,'native floor opening destination');await io.wait(500);return true;
 }
 return{walk,route,fight,transition,hole,encounters};
}

export async function walkToHunterDen(io){
 assert.equal(await io.read(0x100,2),282);assert.equal(await io.read(0x10000),123);
 const t=bakeryTraversal(io);await t.route(forestPath);await t.transition(33,499,100);
 await io.shot('bakery-forest-south-exit');
 // The party occupies two adjacent overworld chips. The west approach
 // clears both; the visually open eastern edge is too narrow.
 await walkWorld(io,[[67,95],[67,97],[65,97],[65,104],[68,104]]);
 await io.shot('bakery-hunter-den-world');await enterWorldLocation(io,283);
 assert.equal(await quantity(io,215),0);assert.equal(await quantity(io,220),1);await io.shot('bakery-hunter-den-entry');
 return{destination:283,story:123,encounters:t.encounters};
}

export async function completeHunterDen(io,rom){
 assert.equal(await io.read(0x100,2),283);assert.equal(await io.read(0x10000),123);assert.equal(await quantity(io,215),0);
 const t=bakeryTraversal(io);
 await t.route([[120,152],[120,192],[208,192]]);await io.hold(17,8);await t.transition(129,284);
 for(const[x,y]of[[378,232],[392,246],[394,264],[422,264]]){
  if(!await t.walk(x,y,{stopOnBattle:true})){await t.fight();break;}
 }
 for(let n=0;n<5&&await io.read(0x100,2)===284;n++){
  await t.route([[394,264],[394,310],[568,310],[568,208],[560,208]]);await t.hole(64,285);
 }
 assert.equal(await io.read(0x100,2),285);await io.shot('bakery-hunter-den-first-drop');
 for(let n=0;n<5&&await io.read(0x100,2)===285;n++){
  const leader=await io.read(0x197,2),east=await io.read(0x1800+leader,2)>408*16;
  if(!await t.walk(east?440:384,672,{stopOnBattle:true})){await t.fight();continue;}
  await t.hole(east?64:128,286);
 }
 assert.equal(await io.read(0x100,2),286);
 await t.route([[128,160],[80,176]]);assert.ok(await t.hole(64,287));
 await t.route([[380,698],[410,728],[440,728]]);await t.transition(129,288);
 await t.route([[108,718],[136,690],[136,376]]);await t.transition(17,289);
 await t.walk(864,376);
 for(let n=0;n<200&&await io.read(0x11f);n++)await io.hold(17,1);
 assert.equal(await io.read(0x11f),0,'native Glaze approach starts the scene');
 const reward=await recoverGateKey(io,rom);assert.equal(await quantity(io,220),1);
 return{encounters:t.encounters,reward};
}
