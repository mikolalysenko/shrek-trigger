import assert from'node:assert/strict';
import{movement}from'./medina-controller.mjs';
import{walkWorld,enterWorldLocation}from'./world-controller.mjs';
import{u16,u24}from'../engine/rom.js';
async function finish(io){for(let i=0;i<80&&(await io.read(0x126)||!await io.read(0x11f));i++)await io.tap(256,180);assert.equal(await io.read(0x126),0);assert.equal(await io.read(0x11f),1);}
async function resources(io){const out=[];for(const id of await io.bytes(0x2980,3)){const r=await io.bytes(0x2603+id*80,8);out.push({id,hp:u16(r,0),maxHp:u16(r,2),mp:u16(r,4),maxMp:u16(r,6)});}return out;}
async function quantity(io,id){const r=await io.bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(r[i]===id)n+=r[i+256];return n;}
const gold=async io=>u24(await io.bytes(0x2c53,3),0);
export async function visitVillageInn(io){
 assert.equal(await io.read(0x100,2),138);const beforeGold=await gold(io),before=await resources(io);
 const open=async()=>{await io.hold(128,12);await io.tap(256,180);assert.equal(await io.read(0x12a),76);await io.tap(256,180);assert.equal(await io.read(0x12a),77);};
 await open();await io.shot('village-inn-choice');await io.tap(32,12);await io.tap(256,180);assert.equal(await io.read(0x12a),80);await finish(io);
 assert.equal(await gold(io),beforeGold);assert.deepEqual(await resources(io),before);await open();await io.tap(256,180);
 const paid=beforeGold>=50;assert.equal(await io.read(0x12a),paid?78:79);await finish(io);
 assert.equal(await gold(io),beforeGold-(paid?50:0));const after=await resources(io);if(paid)for(const c of after){assert.equal(c.hp,c.maxHp);assert.equal(c.mp,c.maxMp);}else assert.deepEqual(after,before);
 await io.shot(paid?'village-inn-rested':'village-inn-insufficient');return{declined:true,price:50,paid,goldBefore:beforeGold,goldAfter:await gold(io)};
}
export async function tradeVillagePortrait(io,{portrait=true,claimed=false}={}){
 const{route}=movement(io);assert.equal(await io.read(0x100,2),136);const before=await quantity(io,206);
 await route([[40,24]]);await io.hold(16,20);await io.tap(256,180);
 if(claimed){assert.equal(await io.read(0x126),0);assert.equal(await quantity(io,206),before);return{claimed:true,item:null};}
 assert.equal(await io.read(0x12a),187);await finish(io);assert.equal(await io.read(0x10212),1);
 await route([[40,25],[38,25],[36,26]]);
 const open=async()=>{await io.hold(16,14);await io.tap(256,180);};await open();
 if(!portrait){await finish(io);assert.equal(await io.read(0x12a),52);assert.equal(await io.read(0x10214),0);assert.equal(await quantity(io,206),before);return{portrait:false,item:null};}
 const choice=async()=>{for(let i=0;i<12&&await io.read(0x12a)!==189;i++)await io.tap(256,180);assert.equal(await io.read(0x12a),189);};await choice();await io.shot('village-trade-choice');
 await io.tap(32,12);await io.tap(256,180);assert.equal(await io.read(0x12a),190);await finish(io);assert.equal(await io.read(0x10214),0);
 await open();await choice();await io.tap(256,180);await finish(io);assert.equal(await io.read(0x10214),1);assert.equal(await quantity(io,206),before);
 await route([[38,26],[40,26],[40,24]]);await io.hold(16,20);await io.tap(256,180);await finish(io);
 assert.equal(await io.read(0x12a),195);assert.equal(await io.read(0x100f6)&2,2);assert.equal(await quantity(io,206),before+1);assert.equal(await io.read(0x100fe)&2,2);await io.shot('village-trade-reward');
 await io.hold(16,1);await io.tap(256,180);assert.equal(await quantity(io,206),before+1);
 await route([[40,25],[38,25],[36,28],[35,29]]);for(let i=0;i<180&&await io.read(0x100,2)===136;i++)await io.hold(33,1);await io.wait(400);assert.equal(await io.read(0x100,2),497);
 return{portrait:true,declined:true,item:206,quantity:1,destination:497};
}
export async function hearRowan(io){
 assert.equal(await io.read(0x100,2),138);const before=await gold(io);
 // Approach by position, then hold the turn through the native input poll.
 // A one-frame left press can miss the native input poll, leaving
 // the leader facing the innkeeper across the counter instead of Rowan.
 await movement(io).route([[10,19]]);await io.hold(64,4);await io.tap(256,180);
 assert.equal(await io.read(0x12a),99);await io.tap(256,180);assert.equal(await io.read(0x12a),100);await io.shot('village-rowan-choice');
 await io.tap(32,12);await io.tap(256,180);assert.equal(await io.read(0x12a),105);await finish(io);assert.equal(await gold(io),before);assert.equal(await io.read(0x100f2)&3,1);
 await io.hold(64,4);await io.tap(256,180);assert.equal(await io.read(0x12a),99);await io.tap(256,180);assert.equal(await io.read(0x12a),100);await io.tap(256,180);await finish(io);
 const paid=before>=30;assert.equal(await io.read(0x12a),paid?104:102);assert.equal(await gold(io),before-(paid?30:0));assert.equal(await io.read(0x100f2)&3,paid?3:1);
 if(paid){await io.hold(64,4);await io.tap(256,180);assert.equal(await io.read(0x12a),104);await finish(io);assert.equal(await gold(io),before-30);}
 await io.shot('village-rowan-result');return{declined:true,price:30,paid,repeatedWithoutCharge:paid,goldBefore:before,goldAfter:await gold(io)};
}
export async function commissionRowan(io){
 assert.equal(await io.read(0x100,2),137);assert.equal(await io.read(0x100f2)&3,0);const before=await gold(io);await finish(io);assert.equal(await io.read(0x100f2)&3,1);assert.equal(await gold(io),before);
 const{route}=movement(io);await route([[14,61]]);for(let i=0;i<180&&await io.read(0x100,2)===137;i++)await io.hold(33,1);await io.wait(400);assert.equal(await io.read(0x100,2),497);
 await walkWorld(io,[[41,72],[41,69]]);await io.shot('village-world-inn');await enterWorldLocation(io,138);assert.equal(await io.read(0x100f2)&3,1);
 await route([[4,21],[10,21]]);const information=await hearRowan(io);await route([[10,21],[4,21],[4,28]]);for(let i=0;i<180&&await io.read(0x100,2)===138;i++)await io.hold(33,1);await io.wait(400);assert.equal(await io.read(0x100,2),497);
 return{commissioned:true,overworldWalk:true,information,destination:497};
}
