import path from 'node:path';
import assert from 'node:assert/strict';
import {withIndependentController} from './independent-controller.mjs';
import {bakeryCheckpoints,seedBakeryCheckpoint} from '../engine/bakery-checkpoints.js';
import {areas} from '../content/areas.js';
import {u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {recoverGateKey,defeatIronKilnback,defeatFurnaceMaw,defeatBuriedFurnace} from '../tests/bakery-controller.mjs';

export async function checkIndependentBakery(options){
 const{out,checkpoint,built,name}=options;if(!checkpoint||!built?.rom)throw Error('Bakery checks need the prepared native bedroom loadout and cartridge');
 return withIndependentController(options,async({request,write,controller:io})=>{
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);await request({op:'savestate',name:'bakery-bedroom'});
  let prefix='';const shot=io.shot;
  io.shot=async key=>{
   if(name==='snes9x'&&['furnace-maw-battle','buried-furnace-battle'].includes(key)){
    for(const[id,first]of key==='buried-furnace-battle'?[[190,768],[171,896]]:[[190,640]]){
     const graphics=decompress(built.rom,fileOffset(u24(built.rom,0x362220+id*3))).bytes;
     assert.deepEqual((await request({op:'read',mem:'vram',addr:0x2000+first*32,len:graphics.length})).value,[...graphics],'independent furnace background '+id);
    }
   }
   return shot(prefix+'-'+key);
  };
  async function fixture(key,party=[0,5,1],variant=''){
   prefix=key+'-'+party[2]+variant;await request({op:'loadstate',file:path.join(out,'bakery-bedroom.state')});
   const original=Uint8Array.from(await io.bytes(0,0x20000)),ram=original.slice();seedBakeryCheckpoint(ram,key);
   const c=bakeryCheckpoints[key],ids=c.first?[0,1,2,3,5]:c.late?[0,1,2,3,4,5,6]:[0,1,2,3,4,5];ram.fill(128,0x2980,0x2989);ram.set([...party,...ids.filter(id=>!party.includes(id))],0x2980);
   for(let p=0;p<ram.length;){if(ram[p]===original[p]){p++;continue;}const start=p++;while(p<ram.length&&ram[p]!==original[p])p++;await write(start,ram.slice(start,p));}
   const a=areas.find(a=>a.bakeryScene===key),map=a.id|((a.facing??1)<<9);await write(0x1238e,[0xe0,map&255,map>>8,a.x,a.y,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),a.id);
  }
  const keys=[];for(const[companion,explain]of[[1,true],[1,false],[2,true],[3,false]]){await fixture('bakery-kiln',[0,5,companion],explain?'-explain':'-refuse');keys.push({companion,...await recoverGateKey(io,built.rom,{explain})});}
  const iron=[];for(const greet of[true,false]){await fixture('bakery-iron-kiln',[0,5,1],greet?'-greet':'-pass');iron.push(await defeatIronKilnback(io,built.rom,{greet}));}
  const furnace=[];for(const companion of[1,2,3,4]){await fixture('bakery-furnace',[0,5,companion]);furnace.push({companion,...await defeatFurnaceMaw(io)});}
  await fixture('buried-furnace');const buried=await defeatBuriedFurnace(io,built.rom);
  return{keys,iron,furnace,buried};
 });
}
