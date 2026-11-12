import assert from 'node:assert/strict';
import {bakeryTraversal} from './bakery-den-controller.mjs';
import {walkWorld,enterWorldLocation} from './world-controller.mjs';
import {defeatIronKilnback,defeatFurnaceMaw} from './bakery-controller.mjs';

const lowerMountain=[
 [120,838],[136,822],[136,780],[150,766],[152,726],[152,616],[136,600],[136,568],
 [120,552],[120,492],[152,424],[152,230],[104,182],[104,96],[74,94],[56,112],
 [56,128],[40,144],[40,168],[56,184],[56,440],[72,456],[72,598],[106,632],
 [120,632],[136,648],[182,648],[200,630],[200,358],[216,342],[216,272],[226,262],[230,250]
];
const upperMountain=[
 [294,920],[328,886],[328,854],[360,822],[360,730],[346,716],[344,502],[376,470],
 [376,400],[358,382],[338,382],[328,392],[328,400],[312,416],[312,568],[328,584],
 [392,584],[440,632],[456,630],[456,312],[440,296],[440,246],[392,198],[392,58]
];
async function finish(io,predicate,limit=180){
 for(let n=0;n<limit&&!await predicate();n++)await io.tap(256,100);
 assert.ok(await predicate(),'second Bakery scene completes');
}
const playable=async io=>await io.read(0x11f)&&!await io.read(0x126);

export async function wakeAfterRitual(io){
 assert.equal(await io.read(0x100,2),271);assert.equal(await io.read(0x10000),138);
 await finish(io,async()=>await io.read(0x100,2)===275&&await io.read(0x10000)===141&&await playable(io));await io.wait(400);
 assert.equal(await io.read(0x10000),141);assert.equal(await io.read(0x29af),248);
 await io.shot('bakery-second-waking');return{destination:275,story:141};
}

export async function visitBurnedBakery(io){
 assert.equal(await io.read(0x100,2),275);assert.equal(await io.read(0x10000),141);
 const t=bakeryTraversal(io);await t.walk(128,290);await t.transition(33,499,100);
 // The ritual's native world script opens this route through the northern
 // woods. These inputs follow its live collision map, without changing it.
 await walkWorld(io,[[58,63],[58,60],[59,60],[59,54],[58,54],[58,52],[57,52],[57,51],[55,51],[55,46],[52,46],[52,40]]);
 await enterWorldLocation(io,292);await t.route([[128,440],[128,240]]);
 for(let n=0;n<150&&await io.read(0x11f);n++)await io.hold(17,1);
 await finish(io,async()=>await io.read(0x10000)===142&&await playable(io));
 assert.equal(await io.read(0x29af),248,'Mongo remains an NPC until the summit');await io.shot('bakery-burned-village');
 await t.walk(128,496);await t.transition(33,499,100);
 await walkWorld(io,[[55,41],[55,47],[57,47],[57,49],[65,49],[65,32]]);
 await enterWorldLocation(io,293);await io.shot('bakery-drake-nest-entry');return{destination:293,story:142};
}

export async function climbDrakeNest(io){
 assert.equal(await io.read(0x100,2),293);assert.equal(await io.read(0x10000),142);
 const t=bakeryTraversal(io);await t.route(lowerMountain);await t.transition(129,294,100);
 await t.route(upperMountain);await t.transition(17,295,100);
 assert.ok(t.encounters.length>=5,'mountain encounters are fought normally');await io.shot('bakery-drake-summit');
 return{destination:295,story:142,encounters:t.encounters};
}

export async function recruitSkyDrakes(io){
 assert.equal(await io.read(0x100,2),295);assert.equal(await io.read(0x10000),142);
 const t=bakeryTraversal(io);
 await t.route([[94,482],[210,366],[210,330],[190,310],[122,310],[120,242]]);
 for(let n=0;n<150&&await io.read(0x11f);n++)await io.hold(17,1);
 // The conversation adds Mongo through D3, then opens the native C8 party
 // menu. Wait for that handoff before B; an earlier press is lost in the fade.
 await finish(io,async()=>await io.read(0x29af)===252);
 await io.wait(600);assert.deepEqual(Array.from(await io.bytes(0x2980,3)),[0,5,1]);
 await io.shot('bakery-drake-party');await io.tap(1,300);
 for(let n=0;n<120&&await io.read(0x100,2)!==499;n++){
  if(await io.read(0x126))await io.tap(256,100);else await io.tap(1,100);
 }
 assert.equal(await io.read(0x100,2),499);await io.wait(600);assert.equal(await io.read(0x10000),147);
 assert.equal(await io.read(0x29e)&3,3,'all three characters board their drakes');
 await io.shot('bakery-drake-flight');return{destination:499,story:147,party:Array.from(await io.bytes(0x2980,3))};
}

export async function flyToFurnaceLair(io){
 assert.equal(await io.read(0x100,2),499);assert.equal(await io.read(0x10000),147);
 assert.equal(await io.read(0x28f),3,'native drake flight mode');
 // Flight advances two pixels per frame. Finish each axis and release input
 // before turning, so the native input delay cannot alternate directions.
 await io.wait(24);
 for(const[address,target,positive,negative]of[[0x283,848,128,64],[0x285,576,32,16]]){
  for(let n=0;n<3;n++){
   const delta=target-await io.read(address,2);if(Math.abs(delta)<=2)break;
   await io.hold(delta>0?positive:negative,Math.round(Math.abs(delta)/2));await io.wait(24);
  }
  assert.ok(Math.abs(target-await io.read(address,2))<=2,`drake flight waypoint ${target} at ${await io.read(address,2)}`);
 }
 await io.shot('bakery-lair-air');await io.tap(256,600);assert.equal(await io.read(0x28f),0);assert.equal(await io.read(0x29e)&3,0);
 await walkWorld(io,[[106,71]]);await enterWorldLocation(io,299);await io.shot('bakery-lair-entry');
 return{destination:299,story:147};
}

export async function rescueBakeryPrisoners(io){
 assert.equal(await io.read(0x100,2),299);assert.equal(await io.read(0x10000),147);
 const t=bakeryTraversal(io);await t.route([[864,792],[858,778],[888,750],[908,750],[920,742],[920,550]]);
 await io.hold(17,10);
 await t.transition(129,430,100);
 await t.route([[186,616],[216,646],[216,664],[232,680],[306,680],[314,688],[320,688],[328,700]]);
 await io.hold(16,7);await io.tap(256,100);await io.wait(800);
 assert.equal(await io.read(0x10063)&8,8,'the real wall switch frees the four prisoners');await io.shot('bakery-prisoners-free');
 await t.route([[330,696],[374,696],[382,688],[438,688],[446,680],[470,680],[502,648],[518,648],[520,642],[532,630],[532,578],[542,560],[544,544],[550,538]]);
 await t.transition(129,302,100);
 await t.route([[950,182],[946,186],[946,228],[904,270],[904,310],[888,326],[888,342],[852,344],[840,356],[800,356],[794,360],[792,344]]);
 await io.hold(16,10);await finish(io,async()=>await io.read(0x10000)===151&&await playable(io));
 assert.equal(await io.read(0x10063)&1,1,'Gingy is released through the native scene');await io.shot('bakery-gingy-rescued');
 return{destination:302,story:151,encounters:t.encounters};
}

export async function followGingy(io){
 assert.equal(await io.read(0x100,2),302);assert.equal(await io.read(0x10000),151);
 const t=bakeryTraversal(io);
 await t.route([[888,342],[904,310],[904,270],[946,228],[946,186],[950,182]]);
 await io.hold(17,12);await t.transition(65,430,100);
 await t.route([[542,560],[532,578],[532,630],[520,642],[518,648],[502,648],[470,680],[446,680],[438,688],[382,688],[374,696],[330,696],[306,680],[232,680],[216,664],[216,646],[186,616],[184,550]]);
 await t.transition(65,299,100);await finish(io,()=>playable(io));
 assert.equal(await io.read(0x10000),152);assert.equal(await io.read(0x1005c)&16,16,'Gingy opens the second entrance');
 await io.shot('bakery-gingy-opens-lair');return{destination:299,story:152};
}

export async function openIronPassage(io){
 assert.equal(await io.read(0x100,2),299);assert.equal(await io.read(0x10000),152);
 const t=bakeryTraversal(io,{healParty:true});
 await t.route([[920,742],[908,750],[888,750],[864,792],[816,792],[800,760]]);
 // The two entrance stairways steer the player diagonally. Hold Up to their
 // top landings before turning, rather than re-aiming into the stair walls.
 await io.hold(17,120);await t.transition(65,302,100);
 await t.route([[352,178],[352,198],[340,210],[326,210],[268,268],[234,282]]);await t.transition(33,298,100);
 await t.route([[186,160],[170,146]]);await t.transition(17,305,100);
 await t.route([[570,962],[570,920],[526,876],[526,872],[480,824],[458,824],[440,806],[440,800],[376,736],[376,688],[368,680],[330,680],[322,672],[266,672],[254,660],[248,648],[248,640],[264,622],[264,618]]);
 await t.transition(129,302,100);await t.walk(216,985);await t.transition(33,298,100);
 await t.route([[470,464],[474,450]]);await t.transition(17,303,150);
 // The left plate opens the mouth and summons its native guard formation.
 await t.walk(456,392);await io.hold(16,8);await io.tap(256,100);
 await t.walk(472,120);await io.hold(16,8);await io.tap(256,100);await io.wait(240);
 assert.equal(await io.read(0x100ed)&128,128,'the real wall switch opens Iron Kilnback\'s gate');await io.shot('bakery-iron-gate-open');
 await t.walk(472,420);await t.transition(33,298,100);await t.route([[312,464],[312,450]]);await t.transition(17,304,100);
 return{destination:304,story:152,encounters:t.encounters};
}

export async function completeFurnaceLair(io,rom){
 assert.equal(await io.read(0x100,2),304);assert.equal(await io.read(0x10000),152);
 const iron=await defeatIronKilnback(io,rom),t=bakeryTraversal(io,{healParty:true});
 await t.walk(520,985);await t.transition(33,298,100);
 await t.route([[208,910],[218,920],[550,920],[578,892],[606,880]]);await t.transition(17,303,100);
 await t.walk(168,424);await io.wait(600);
 await t.walk(184,322);await io.hold(16,2);await io.tap(256,100);await io.wait(400);
 await t.walk(184,120);await io.hold(16,8);await io.tap(256,100);await io.wait(240);
 assert.equal(await io.read(0x100ed)&192,192,'both native furnace gates are open');await io.shot('bakery-final-gate-open');
 await t.walk(184,448);await t.transition(33,298,100);await t.route([[578,892],[550,920],[384,920],[384,798]]);
 await t.transition(17,300,100);await t.route([[792,200],[770,200],[760,184],[760,160],[778,142],[792,110]]);await t.transition(17,301,100);
 const finale=await defeatFurnaceMaw(io);return{iron,encounters:t.encounters,finale};
}
