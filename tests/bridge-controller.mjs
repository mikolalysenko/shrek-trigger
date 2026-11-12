import assert from'node:assert/strict';
import{movement}from'./medina-controller.mjs';

async function quantity(io,id){const b=await io.bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(b[i]===id)n+=b[256+i];return n;}
async function close(io){for(let i=0;i<60&&(await io.read(0x126)||!await io.read(0x11f));i++)await io.tap(256,100);assert.equal(await io.read(0x126),0);assert.equal(await io.read(0x11f),1);}
export async function requestBridgeSupplies(io){
 assert.equal(await io.read(0x100,2),135);assert.equal(await io.read(0x10000),84);
 await io.hold(16,10);await io.tap(256,180);assert.equal(await io.read(0x12a),56);
 assert.equal(await io.read(0x100a9)&4,4);await io.shot('bridge-request');await close(io);
 assert.equal(await io.read(0x10000),84);return{requested:true,story:84};
}
export async function deliverBridgeSupplies(io){
 const{route}=movement(io),story=await io.read(0x10000);assert.equal(await io.read(0x100,2),135);assert.ok(story>=84&&story<=86);assert.equal(await quantity(io,219),1);
 await route([[58,12],[56,12],[56,11]]);await io.hold(16,10);await io.tap(256,180);
 assert.equal(await io.read(0x12a),63);await io.tap(256,180);await io.shot('bridge-food-choice');
 await io.tap(32,12);await io.tap(256,180);assert.equal(await io.read(0x12a),62);await close(io);
 assert.equal(await quantity(io,219),1);assert.equal(await io.read(0x10000),story);
 await io.hold(16,1);await io.tap(256,180);assert.equal(await io.read(0x12a),63);
 await io.tap(256,180);await io.tap(256,180);
 for(let i=0;i<80&&(await io.read(0x10000)!==87||!await io.read(0x11f));i++)await io.tap(256,180);
 assert.equal(await io.read(0x10000),87);assert.equal(await io.read(0x11f),1);assert.equal(await quantity(io,219),0);
 await io.shot('bridge-supplied');return{declined:true,consumed:219,story:87};
}
export async function collectBridgeSupplies(io){
 const{read,hold,tap,wait,shot}=io,{route}=movement(io);assert.equal(await read(0x100,2),123);assert.equal(await quantity(io,219),0);
 const orangeFaygo=await quantity(io,205);
 // The chef (object 10) patrols behind a moving server. Added opening
 // dialogue changes that patrol's phase; approach the live chef instead of
 // repeatedly talking to whichever actor happens to cross one fixed tile.
 for(let i=0;i<240&&(!(await read(0x100a9)&8)||await read(0x126)||!await read(0x11f));i++){
  if(await read(0x126)||!await read(0x11f)){await tap(256,180);continue;}
  const leader=await read(0x197,2),dx=(await read(0x1814,2)-await read(0x1800+leader,2))/16,dy=(await read(0x1894,2)-await read(0x1880+leader,2))/16;
  if(Math.abs(dx)<10&&dy>=-27&&dy<=-10){await hold(16,1);await tap(256,180);}
  else await hold(1|(Math.abs(dx)>8?(dx>0?128:64):0)|(dy<-24?16:dy>-16?32:0),4);
 }
 assert.equal(await read(0x100a9)&8,8);assert.equal(await read(0x126),0);assert.equal(await read(0x11f),1);await shot('bridge-chef-kitchen');
 // Go above the server at the kitchen opening and around the dining table.
 await route([[7,29],[7,28],[3,28],[3,15],[4,15],[4,11],[6,11],[6,7]]);
 for(let i=0;i<80&&await read(0x100,2)===123;i++)await hold(129,1);
 await wait(400);assert.equal(await read(0x100,2),120);
 await route([[49,39],[49,53],[42,53]]);
 for(let i=0;i<80&&(!(await read(0x100a9)&16)||!await read(0x11f));i++)await tap(256,180);
 assert.equal(await read(0x100a9)&16,16);assert.equal(await quantity(io,219),1);assert.equal(await quantity(io,205),orangeFaygo+1);await shot('bridge-chef-gift');
 await route([[40,53],[35,53],[31,53]]);for(let i=0;i<180&&await read(0x100,2)===120;i++)await hold(33,1);
 await wait(400);assert.equal(await read(0x100,2),497);assert.equal(await quantity(io,219),1);assert.equal(await read(0x10000),84);
 await shot('bridge-chef-world-exit');return{food:219,foodCount:1,extraGift:205,story:84,destination:497};
}
export async function defendBridge(io,{fight=null}={}){
 const{read,bytes,hold,tap,wait,shot}=io,{route}=movement(io);assert.equal(await read(0x100,2),135);assert.equal(await read(0x10000),87);
 await hold(16,10);await tap(256,180);assert.equal(await read(0x12a),75);
 await tap(256,180);await tap(32,12);await tap(256,180);await close(io);
 assert.equal(await read(0x1019a)&7,0);assert.equal(await read(0x10000),87);
 const giftBefore=await quantity(io,128);await hold(16,1);await tap(256,180);assert.equal(await read(0x12a),75);
 await tap(256,180);await tap(256,180);await close(io);
 assert.equal(await read(0x1019a)&1,1);assert.equal(await quantity(io,128),giftBefore+1);await shot('bridge-captain-gift');
 await route([[57,11],[57,8],[55,8],[54.5,8.5],[54,9],[50,9]]);
 const formations=[];
 for(let encounter=0;encounter<3;encounter++){
  // The fallen soldiers leave a diagonal gap between the two skirmishes.
  if(encounter===1)await route([[30,9],[26.25,9.125],[26,8.5],[25,8]]);
  for(let i=0;i<1600&&!(await read(0x117)&1);i++){if(!await read(0x11f))await tap(256,100);else await hold(65,1);}
  assert.ok(await read(0x117)&1,'native bridge encounter '+encounter);await wait(400);
  const formation=Array.from(await bytes(0xaf02,8));
  assert.deepEqual(formation,[[45,45,255,255,166,255,255,255],[45,45,45,255,166,255,255,255],[179,255,255,255,255,255,180,255]][encounter]);
  formations.push(formation);await shot('bridge-battle-'+encounter);
  if(fight)await fight('bridge battle '+encounter);else for(let i=0;i<180&&(await read(0x117)&1);i++)await tap(256,100);
  assert.equal(await read(0x117)&1,0);await close(io);
  assert.equal(await read(0x1019a)&7,[3,7,7][encounter]);assert.equal(await read(0x10000),encounter===2?90:87);
  await hold(32,8);
 }
 for(let i=0;i<400&&await read(0x100,2)===135;i++)await hold(65,1);
 await wait(400);assert.equal(await read(0x100,2),497);assert.equal(await read(0x10000),90);
 await shot('bridge-world-exit');return{declined:true,gift:128,formations,story:90,destination:497};
}
