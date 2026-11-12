import path from'node:path';
import assert from'node:assert/strict';
import{withIndependentController}from'./independent-controller.mjs';
import{seedFortressCheckpoint}from'../engine/fortress-checkpoints.js';
import{areas}from'../content/areas.js';
import{completeHornerHideout,completeHornerFinale,traverseBladeTrap,finishHornerCatScene}from'../tests/hideout-controller.mjs';

export async function checkIndependentHideout(options){
 const{out,checkpoint}=options;if(!checkpoint)throw Error('Hideout checks need the prepared native bedroom loadout');
 return withIndependentController(options,async({request,write,controller:io})=>{
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);await request({op:'savestate',name:'hideout-bedroom'});
  async function fixture(key,party=[0,4,1]){
   await request({op:'loadstate',file:path.join(out,'hideout-bedroom.state')});
   const original=Uint8Array.from(await io.bytes(0,0x20000)),ram=original.slice();seedFortressCheckpoint(ram,key);
   ram.fill(128,0x2980,0x2989);ram.set([...party,...[0,1,2,3,4,5,6].filter(id=>!party.includes(id))],0x2980);
   for(let p=0;p<ram.length;){if(ram[p]===original[p]){p++;continue;}const start=p++;while(p<ram.length&&ram[p]!==original[p])p++;await write(start,ram.slice(start,p));}
   const a=areas.find(a=>a.fortressScene===key),map=a.id|((a.facing??1)<<9);await write(0x1238e,[0xe0,map&255,map>>8,a.x,a.y,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),a.id);
  }
  const routes=[];for(const farquaad of[false,true]){await fixture('hideout-route',[0,4,farquaad?6:1]);routes.push({farquaad,...await completeHornerHideout(io)});}
  const traps=[];for(const takeBait of[true,false]){await fixture('hideout-trap');traps.push(await traverseBladeTrap(io,{takeBait}));}
  await fixture('hideout-finale',[0,4,6]);const finale=await completeHornerFinale(io);
  const cats=[];for(const companion of[1,2,3,4,5,6]){await fixture('hideout-cat',companion===4?[0,1,4]:[0,4,companion]);cats.push({companion,...await finishHornerCatScene(io)});}
  return{routes,traps,finale,cats};
 });
}
