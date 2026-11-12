import path from'node:path';
import assert from'node:assert/strict';
import{withIndependentController}from'./independent-controller.mjs';
import{seedVillageCheckpoint}from'../engine/village-checkpoints.js';
import{put24}from'../engine/rom.js';
import{areas}from'../content/areas.js';
import{visitVillageInn,tradeVillagePortrait,hearRowan,commissionRowan}from'../tests/village-controller.mjs';

export async function checkIndependentVillages(options){
 const{out,checkpoint}=options;if(!checkpoint)throw Error('Village checks need the prepared native bedroom loadout');
 return withIndependentController(options,async({request,write,controller:io})=>{
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);await request({op:'savestate',name:'village-bedroom'});
  async function fixture(key,{gold=1000,portrait=true,claimed=false}={}){
   await request({op:'loadstate',file:path.join(out,'village-bedroom.state')});
   const original=Uint8Array.from(await io.bytes(0,0x20000)),ram=original.slice();seedVillageCheckpoint(ram,key);put24(ram,0x2c53,gold);
   if(key==='village-portrait'){if(!portrait)ram[0x100fe]&=~2;if(claimed)ram[0x100f6]|=2;}
   for(let p=0;p<ram.length;){if(ram[p]===original[p]){p++;continue;}const start=p++;while(p<ram.length&&ram[p]!==original[p])p++;await write(start,ram.slice(start,p));}
   const a=areas.find(a=>a.villageScene===key),map=a.id|((a.facing??1)<<9);await write(0x1238e,[0xe0,map&255,map>>8,a.x,a.y,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),a.id);
  }
  await fixture('village-commission');const commission=await commissionRowan(io);
  const inn=[];for(const gold of[1000,50,49]){await fixture('village-inn',{gold});inn.push(await visitVillageInn(io));}
  const portrait=[];for(const c of[{}, {portrait:false},{claimed:true}]){await fixture('village-portrait',c);portrait.push(await tradeVillagePortrait(io,c));}
  const rowan=[];for(const gold of[1000,29]){await fixture('village-rowan',{gold});rowan.push(await hearRowan(io));}
  return{commission,inn,portrait,rowan};
 });
}
