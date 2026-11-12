import assert from 'node:assert/strict';
import {movement} from './medina-controller.mjs';

export async function visitPyramid(io,{charged=true,gift='left',claimed=false}={}){
 const observed={...io,tap:async(keys=256,gap=100)=>{
  if(await io.read(0x12a)===228)await io.shot('pyramid-guardian');
  return io.tap(keys,gap);
 }};
 const{read,bytes,hold,tap,wait,shot}=observed,{route}=movement(observed);
 assert.equal(await read(0x100,2),42);
 const inventory=async()=>{const r=await bytes(0x2400,512);return[83,138].map(id=>{let quantity=0;for(let i=0;i<256;i++)if(r[i]===id)quantity+=r[i+256];return{id,quantity};});};
 const before=await inventory();
 await route([[8,19],[8,18]]);
 if(!charged){await wait(400);assert.equal(await read(0x1019c)&4,0);assert.deepEqual(await inventory(),before);await shot('pyramid-seal-locked');await route([[8,20]]);return{opened:false};}
 for(let i=0;i<60&&(!(await read(0x1019c)&4)||!await read(0x11f));i++)await tap(256,180);
 assert.equal(await read(0x1019c)&4,4);assert.equal(await read(0x11f),1);await wait(120);await shot('pyramid-opened');
 const x=gift==='left'?6:9,other=15-x,item=gift==='left'?138:83;
 await route([[7,14],[x,12]]);await hold(16,1);await tap(256,180);
 for(let i=0;i<30&&!await read(0x11f);i++)await tap(256,100);
 assert.equal(await read(0x101a0)&1,1);assert.equal(await read(0x11f),1);
 const after=await inventory();assert.deepEqual(after,before.map(c=>({...c,quantity:c.quantity+(!claimed&&c.id===item?1:0)})));
 // The source destroys both selectable objects after one gift. Walking to
 // the other position and pressing A must not award a second item.
 await route([[x,13],[other,13],[other,12]]);await hold(16,1);await tap(256,180);assert.deepEqual(await inventory(),after);
 await shot('pyramid-'+gift+'-gift');
 await route([[other,13],[7,14],[8,18],[8,22],[10,22],[10,24],[11,25],[12,26],[12,28],[10,29],[8,30],[8,31]]);
 for(let i=0;i<400&&await read(0x100,2)===42;i++)await hold(65,1);
 await wait(400);assert.equal(await read(0x100,2),496);assert.equal(await read(0x1019c)&4,4);assert.equal(await read(0x101a0)&1,1);
 await shot('pyramid-world-exit');return{opened:true,claimed,gift,item:claimed?null:item,inventory:after,destination:496};
}
