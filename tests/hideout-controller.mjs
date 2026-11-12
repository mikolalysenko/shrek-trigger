import assert from'node:assert/strict';
import{movement}from'./medina-controller.mjs';
import{defeatEnforcerRematch}from'./fortress-controller.mjs';
import{attackNativeEnemy}from'./battle-controller.mjs';

async function finish(io,predicate=async()=>await io.read(0x11f)&&!await io.read(0x126)){
 for(let i=0;i<120&&!await predicate();i++)await io.tap(256,180);
 assert.ok(await predicate(),'hideout scene did not release control');
}
async function quantity(io,id){const r=await io.bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(r[i]===id)n+=r[i+256];return n;}
async function health(io){const party=await io.bytes(0x2980,3),out=[];for(const id of party)out.push(await io.read(0x2603+id*80,2));return out;}
async function exitRoom(io,location,destination,points,direction){
 await movement(io).route(points);for(let i=0;i<180&&await io.read(0x100,2)===location;i++)await io.hold(direction|1,1);await io.wait(400);assert.equal(await io.read(0x100,2),destination);
}
async function pickup(io,x,y,id,{sparkle=false}={}){
 const before=await quantity(io,id);await movement(io).route([[x,y]]);await io.hold(16,sparkle?6:2);await io.tap(256,180);await finish(io);assert.equal(await quantity(io,id),before+1,'hideout reward '+id);
 await io.tap(256,180);await finish(io);assert.equal(await quantity(io,id),before+1,'hideout reward is one-time '+id);
}
async function startBattle(io,formation,key){
 for(let i=0;i<120&&!(await io.read(0x117)&1);i++)await io.tap(256,100);assert.equal(await io.read(0x117)&1,1);
 await io.wait(400);assert.deepEqual(Array.from(await io.bytes(0xaf02,8)),formation);await io.shot(key);
}
export async function traverseBladeTrap(io,{takeBait=false}={}){
 assert.equal(await io.read(0x100,2),179);const{route}=movement(io);
 await route([[2,37]]);await io.wait(120);await finish(io);const before=await health(io);
 await route(takeBait?[[2,35]]:[[11,37],[11,35]]);await io.wait(120);await finish(io);
 assert.equal(await io.read(0x101a1)&48,48);const after=await health(io);assert.deepEqual(after,before.map(hp=>takeBait?1:hp));
 await io.shot(takeBait?'hideout-blade-bait':'hideout-blade-avoided');return{takeBait,before,after};
}
export async function finishHornerCatScene(io){
 assert.equal(await io.read(0x100,2),181);assert.equal(await io.read(0x101a0)&128,128);assert.equal(await io.read(0x101a1)&128,0);
 for(let i=0;i<180&&!(await io.read(0x101a1)&128);i++){
  if(await io.read(0x11f))await io.hold(17,1);else await io.tap(256,100);
 }
 await io.wait(180);await finish(io);assert.equal(await io.read(0x101a1)&128,128);assert.equal(await io.read(0x101f4)&32,32);assert.equal(await io.read(0x117)&1,0);await io.shot('hideout-cat-victory');
 return{peacefulMedina:true};
}
export async function completeHornerHideout(io){
 assert.equal(await io.read(0x100,2),177);const{route}=movement(io),ids=[194,112,137,78,155,140,206],before={};for(const id of ids)before[id]=await quantity(io,id);
 await io.wait(120);await finish(io,async()=>await io.read(0x101a1)&1&&await io.read(0x11f)&&!await io.read(0x126));await io.shot('hideout-welcome');
 await exitRoom(io,177,183,[[7,5]],16);await defeatEnforcerRematch(io,'moth');
 await route([[23,16]]);await io.wait(120);await finish(io);assert.equal(await io.read(0x101a1)&2,2);await io.shot('hideout-machinery');
 await exitRoom(io,178,184,[[23,13]],16);await defeatEnforcerRematch(io,'knight');
 const trap=await traverseBladeTrap(io);await exitRoom(io,179,180,[[11,33]],16);
 await startBattle(io,[168,255,255,255,165,255,160,255],'hideout-trio-battle');const attacks=[];
 for(const enemy of[160,165]){
  const slot=Array.from(await io.bytes(0xaf02,8)).indexOf(enemy)+3;let count=0;
  for(;count<100&&(await io.read(0x117)&1)&&await io.read(0x5e30+slot*128,2);count++){await attackNativeEnemy(io,enemy);await io.wait(400);}
  assert.equal(await io.read(0x5e30+slot*128,2),0);attacks.push({enemy,count});
 }
 for(let i=0;i<150&&(await io.read(0x117)&1);i++)await io.tap(256,100);assert.equal(await io.read(0x117)&1,0);await finish(io);assert.equal(await io.read(0x101a1)&127,127);
 await route([[41,10]]);await pickup(io,44,10,155);await pickup(io,46,10,140);await route([[41,10]]);
 await exitRoom(io,180,181,[[41,5]],16);
 await completeHornerFinale(io);
 await exitRoom(io,181,180,[[23,46]],32);await exitRoom(io,180,179,[[41,22]],32);
 await route([[12,37],[12,42]]);assert.equal(await io.read(0x10216),0,'hidden entrance initially closed');for(let i=0;i<120&&!await io.read(0x10216);i++)await io.hold(33,1);await io.wait(120);await finish(io);assert.equal(await io.read(0x10216),1,'hidden entrance opens once');await io.shot('hideout-hidden-armory');
 await route([[12,45]]);for(const[x,id]of[[9,78],[8,137],[7,112]])await pickup(io,x,45,id);
 await route([[12,45]]);await pickup(io,13,45,206,{sparkle:true});assert.equal(await io.read(0x101a4)&64,64);
 await route([[12,45],[12,37],[2,37]]);await pickup(io,2,35,194);
 await exitRoom(io,179,184,[[2,46]],32);await exitRoom(io,184,178,[[39,46]],32);await exitRoom(io,178,183,[[23,24]],32);await exitRoom(io,183,177,[[39,46]],32);await exitRoom(io,177,497,[[7,20]],32);
 assert.equal(await io.read(0x101a1),255);assert.equal(await io.read(0x101f4)&32,32);const rewards=[];for(const id of ids){const delta=await quantity(io,id)-before[id];assert.equal(delta,1,'complete hideout reward '+id);rewards.push({id,quantity:delta});}await io.shot('hideout-world-return');
 return{trap,attacks,rewards,battles:[187,186,[168,165,160],[167,241]],destination:497};
}

export async function completeHornerFinale(io){
 assert.equal(await io.read(0x100,2),181);assert.equal(await io.read(0x101a0)&128,0);
 for(let i=0;i<180&&!(await io.read(0x117)&1);i++){if(await io.read(0x11f))await io.hold(17,1);else await io.tap(256,100);}
 await startBattle(io,[167,255,255,255,241,255,255,255],'hideout-floor-switch');await attackNativeEnemy(io,241);
 for(let i=0;i<180&&await io.read(0x100,2)===181;i++)await io.tap(256,100);await io.wait(400);assert.equal(await io.read(0x100,2),180);await finish(io);assert.equal(await io.read(0x101a0)&128,128);assert.equal(await io.read(0x1009c)&16,0);
 await exitRoom(io,180,181,[[41,5]],16);await finishHornerCatScene(io);
 return{switch:241,fallDestination:180,peacefulMedina:true};
}
