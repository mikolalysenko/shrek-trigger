import assert from 'node:assert/strict';
import {u16,u24} from '../engine/rom.js';
import {chooseNativeTech} from './battle-controller.mjs';

// Shared by the JavaScript and independent-core acceptance runners. This
// interface exposes observation and ordinary controller input only.
export function movement({read,bytes,hold,tap,shot}){
 async function walk(x,y){
  const location=await read(0x100,2);let previous=null,still=0;
  for(let i=0;i<1200;i++){
   assert.equal(await read(0x100,2),location,'unexpected transition during waypoint');
   assert.equal(await read(0x117)&1,0,'unexpected encounter during waypoint');
   if(!await read(0x11f)){await tap(256,100);previous=null;still=0;continue;}
   const r=await bytes(0x100,0x1900),n=u16(r,0x97),px=u16(r,0x1700+n),py=u16(r,0x1780+n),dx=x-px/16,dy=y-py/16;
   if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return;
   const position=px+py*65536;still=position===previous?still+1:0;previous=position;
   // Some ambient text (Mongo snoring, for example) repeats while walking
   // is allowed. Close a box only when it actually blocks movement; field
   // dialogue can also block walking while leaving the input flag set.
   if(still>=8&&await read(0x126)){await tap(256,100);previous=null;still=0;continue;}
   await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
  }
  await shot('medina-waypoint-stuck');assert.fail('Medina waypoint '+x+','+y);
 }
 return{walk,route:async points=>{for(const[x,y]of points)await walk(x*16+8,y*16+7);}};
}
async function resources(io){
 const party=await io.bytes(0x2980,3),out=[];
 for(const id of party){const r=await io.bytes(0x2600+id*80+3,8);out.push({id,hp:u16(r,0),maxHp:u16(r,2),mp:u16(r,4),maxMp:u16(r,6)});}
 return out;
}
async function fight({read,bytes,tap,wait,shot},key){
 for(let i=0;i<30&&!(await read(0x117)&1);i++)await tap(256,100);
 assert.ok(await read(0x117)&1);await wait(400);
 const formation=Array.from(await bytes(0xaf02,8));await shot(key);
 for(let i=0;i<140&&(await read(0x117)&1);i++)await tap(256,100);
 assert.equal(await read(0x117)&1,0);
 for(let i=0;i<60&&(await read(0x126)||!await read(0x11f));i++)await tap(256,100);
 assert.equal(await read(0x126),0);assert.equal(await read(0x11f),1);await wait(120);return formation;
}

export async function visitMedinaHouse(io){
 const{read,hold,tap,wait,shot}=io,{route}=movement(io);
 assert.equal(await read(0x100,2),36);
 for(let i=0;i<100&&(await read(0x1005b)||!await read(0x11f));i++)await tap(256,100);
 assert.equal(await read(0x1005b),0);assert.equal(await read(0x10199)&128,128);await wait(120);
 await shot('medina-cupboard-arrival');await route([[9,9],[10,10]]);await wait(120);
 for(let i=0;i<60&&(!(await read(0x101a2)&1)||!await read(0x11f));i++)await tap(256,100);
 assert.equal(await read(0x101a2)&1,1);assert.equal(await read(0x11f),1);
 await route([[9,9],[8,9],[7,9]]);await hold(32,1);await tap(256,180);
 assert.equal(await read(0x12a),169);const before=await resources(io);await shot('medina-meal-choice');
 await tap(32,12);await tap(256,180);
 assert.equal(await read(0x101a2)&2,0);assert.deepEqual(await resources(io),before);
 await hold(32,1);await tap(256,180);assert.equal(await read(0x12a),169);await tap(256,180);
 for(let i=0;i<30&&!(await read(0x101a2)&2);i++)await tap(256,100);
 assert.equal(await read(0x101a2)&2,2);await tap(256,120);
 const after=await resources(io);for(const c of after){assert.equal(c.hp,c.maxHp);assert.equal(c.mp,c.maxMp);}
 await shot('medina-meal-restored');
 await route([[9,9],[10,10],[12,11]]);
 for(let i=0;i<200&&await read(0x100,2)===36;i++)await hold(33,1);
 await wait(400);assert.equal(await read(0x100,2),496);assert.equal(await read(0x10000),78);
 return{before,after,declined:true,accepted:true,destination:496,story:78};
}

export async function visitMedinaInn(io,{peaceful=false,confrontation=true}={}){
 const{read,bytes,hold,tap,wait,shot}=io,{route}=movement(io);assert.equal(await read(0x100,2),35);
 const gold=async()=>u24(await bytes(0x2c53,3),0),open=async()=>{await hold(16,2);await tap(256,180);};
 let formation=null;await open();
 if(!peaceful&&confrontation){
  assert.equal(await read(0x12a),181);await tap(256,120);
  assert.equal(await read(0x117)&1,0);assert.equal(await read(0x101a2)&4,0);
  await open();assert.equal(await read(0x12a),181);await tap(32,12);await tap(256,100);
  formation=await fight(io,'medina-inn-battle');assert.deepEqual(formation.filter(id=>id!==255),[75,72,72]);
  assert.equal(await read(0x101a2)&4,4);await route([[50,9]]);await open();
 }
 const price=peaceful?10:200,line=peaceful?179:183;assert.equal(await read(0x12a),line);
 const beforeGold=await gold(),before=await resources(io);await shot('medina-inn-price');
 await tap(32,12);await tap(256,180);assert.equal(await gold(),beforeGold);assert.deepEqual(await resources(io),before);
 await open();assert.equal(await read(0x12a),line);await tap(256,180);
 const paid=beforeGold>=price;
 if(paid){
  await wait(1800);assert.equal(await gold(),beforeGold-price);
  for(const c of await resources(io)){assert.equal(c.hp,c.maxHp);assert.equal(c.mp,c.maxMp);}
 }else{
  assert.equal(await read(0x12a),180);assert.equal(await gold(),beforeGold);assert.deepEqual(await resources(io),before);await tap(256,120);
 }
 assert.equal(await read(0x11f),1);await shot(paid?'medina-inn-rested':'medina-inn-insufficient');
 return{peaceful,formation,price,paid,goldBefore:beforeGold,goldAfter:await gold()};
}

export async function shopInMedina(io,{count=1,item=189}={}){
 const{read,bytes,hold,tap,wait,shot}=io,{walk}=movement(io),peaceful=!!(await read(0x101a1)&128);
 assert.equal(await read(0x100,2),39);let formation=null;
 await hold(16,4);await tap(256,180);
 if(!peaceful){
  assert.equal(await read(0x12a),187);await tap(256,120);
  assert.equal(await read(0x117)&1,0);assert.equal(await read(0x101a2)&16,0);
  await hold(16,2);await tap(256,180);assert.equal(await read(0x12a),187);
  await tap(32,12);await tap(256,100);formation=await fight(io,'medina-market-battle');
  assert.deepEqual(formation.filter(id=>id!==255),[75,124]);assert.equal(await read(0x101a2)&16,16);
  await tap(256,100);await wait(180);await walk(616,695);await hold(16,2);await tap(256,180);
 }
 assert.equal(await read(0x12a),peaceful?210:190);await tap(256,180);await wait(600);
 assert.equal(await read(0xd13),47);assert.deepEqual(Array.from(await bytes(0x1000,13)),[2,3,9,102,103,131,189,190,191,198,199,200,192]);
 const multiplier=await read(0x101cd,2),price=await read(0x6e00+item*2,2);
 if(peaceful)assert.equal(multiplier,191);else assert.ok(multiplier>=1280&&multiplier%256===0);
 // C2:DB9F rounds a nonzero fractional result upward. Onion's source price
 // is 10 G; the native price table is also the value displayed by the menu.
 if(item===189)assert.equal(price,Math.ceil(10*multiplier/256));
 const row=[2,3,9,102,103,131,189,190,191,198,199,200,192].indexOf(item);assert.ok(row>=0,'Medina sells item '+item);
 await tap(256,180);for(let i=0;i<row;i++)await tap(32,40);await shot('medina-onion-selected');
 const quantity=async()=>{const r=await bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(r[i]===item)n+=r[i+256];return n;};
 const before=await quantity(),goldBefore=u24(await bytes(0x2c53,3),0);
 await tap(256,120);for(let i=1;i<count;i++)await tap(128,20);await tap(256,180);
 // The native quantity selector stops at what the party can afford.
 const bought=await quantity()-before;assert.ok(bought>=1&&bought<=count,'bought '+bought);assert.equal(u24(await bytes(0x2c53,3),0),goldBefore-price*bought);
 await shot('medina-onion-purchased');for(let i=0;i<3;i++)await tap(1,180);
 if(!peaceful){assert.equal(await read(0x12a),191);await tap(256,180);}
 assert.equal(await read(0x101cd,2),256);assert.equal(await read(0x11f),1);assert.equal(await read(0x100,2),39);
 return{peaceful,formation,multiplier,price,item,quantity:bought};
}

export async function defeatCaveKeeper(io,rom){
 const{read,bytes,hold,tap,wait,shot}=io,{route}=movement(io);assert.equal(await read(0x100,2),47);
 for(let i=0;i<1200&&!(await read(0x117)&1);i++){
  if(!await read(0x11f))await tap(256,100);else await hold(17,1);
 }
 assert.ok(await read(0x117)&1);await wait(400);
 const formation=Array.from(await bytes(0xaf02,8));assert.deepEqual(formation.filter(id=>id!==255),[169]);await shot('cave-keeper-battle');
 const spells=[],menu={...io,tap:(keys,gap=8)=>tap(keys,gap)};
 for(let i=0;i<8&&(await read(0x117)&1)&&await read(0x5fb0,2)>0;i++){
  const before=await read(0x5e34,2);await chooseNativeTech(menu,rom,0,5);await wait(1600);
  const after=await read((await read(0x117)&1)?0x5e34:0x2607,2);assert.equal(before-after,2);spells.push({techId:5,before,after});
 }
 for(let i=0;i<180&&(await read(0x10000)!==81||!await read(0x11f));i++)await tap(256,100);
 assert.equal(await read(0x10000),81);assert.equal(await read(0x101a3)&2,2);assert.equal(await read(0x11f),1);await wait(120);
 await shot('cave-keeper-defeated');
 // The diagonal bend below the stairs has partial-tile collision. This
 // quarter-tile point follows its real walkable edge.
 await route([[51,27],[50,27],[50,23],[51,22],[52,21],[52.75,19.75],[54,19],[54,17]]);
 for(let i=0;i<200&&await read(0x12a)!==234;i++)await hold(17,1);
 await wait(180);assert.equal(await read(0x12a),234);await shot('cave-current-choice');
 await tap(32,12);await tap(256,120);assert.equal(await read(0x100,2),47);assert.equal(await read(0x101f0)&1,0);
 await hold(16,2);await wait(180);await tap(256,100);
 for(let i=0;i<50&&await read(0x100,2)===47;i++)await tap(256,100);
 await wait(600);assert.equal(await read(0x100,2),496);assert.equal(await read(0x10000),81);assert.equal(await read(0x101f0)&1,1);
 await shot('cave-current-exit');return{formation,spells,declined:true,destination:496,story:81};
}
