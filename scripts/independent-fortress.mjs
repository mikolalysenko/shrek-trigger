import path from'node:path';
import assert from'node:assert/strict';
import{withIndependentController}from'./independent-controller.mjs';
import{seedFortressCheckpoint}from'../engine/fortress-checkpoints.js';
import{areas}from'../content/areas.js';
import{defeatBriarKnight,defeatMothWitch,defeatEnforcerRematch,interruptFarquaadRitual}from'../tests/fortress-controller.mjs';

export async function checkIndependentFortress(options){
 const{out,checkpoint}=options;if(!checkpoint)throw Error('Fortress checks need the prepared native bedroom loadout');
 return withIndependentController(options,async({request,write,controller:io})=>{
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);await request({op:'savestate',name:'fortress-bedroom'});
  async function fixture(key,party=[0,4,1]){
   await request({op:'loadstate',file:path.join(out,'fortress-bedroom.state')});
   const original=Uint8Array.from(await io.bytes(0,0x20000)),ram=original.slice();seedFortressCheckpoint(ram,key);
   const ids=key.startsWith('hideout')?[0,1,2,3,4,5,6]:[0,1,2,3,4];ram.fill(128,0x2980,0x2989);ram.set([...party,...ids.filter(id=>!party.includes(id))],0x2980);
   for(let p=0;p<ram.length;){if(ram[p]===original[p]){p++;continue;}const start=p++;while(p<ram.length&&ram[p]!==original[p])p++;await write(start,ram.slice(start,p));}
   const a=areas.find(a=>a.fortressScene===key),map=a.id|((a.facing??1)<<9);await write(0x1238e,[0xe0,map&255,map>>8,a.x,a.y,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),a.id);
  }
  await fixture('fortress-knight');const knight=await defeatBriarKnight(io);
  const moth=[];for(const companion of[1,2,3]){await fixture('fortress-moth',[0,4,companion]);moth.push({companion,...await defeatMothWitch(io)});}
  const rematches=[];for(const kind of['moth','knight'])for(const farquaad of[false,true]){await fixture('hideout-'+kind,[0,4,farquaad?6:1]);rematches.push({kind,farquaad,...await defeatEnforcerRematch(io,kind)});}
  const ritual=[];for(const companion of[1,2,3]){await fixture('fortress-ritual',[0,4,companion]);ritual.push({companion,...await interruptFarquaadRitual(io)});}
  return{knight,moth,rematches,ritual};
 });
}
