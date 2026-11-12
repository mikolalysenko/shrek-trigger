import path from 'node:path';
import assert from 'node:assert/strict';
import {withIndependentController} from './independent-controller.mjs';
import {seedMedinaCheckpoint} from '../engine/medina-checkpoints.js';
import {visitPyramid} from '../tests/pyramid-controller.mjs';

export async function checkIndependentPyramid(options){
 const{out,checkpoint}=options;if(!checkpoint)throw Error('Pyramid checks need the prepared native bedroom loadout');
 return withIndependentController(options,async({request,write,controller:io})=>{
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);await request({op:'savestate',name:'pyramid-bedroom'});
  async function fixture({companion=1,charged=true,claimed=false}={}){
   await request({op:'loadstate',file:path.join(out,'pyramid-bedroom.state')});
   const original=Uint8Array.from(await io.bytes(0,0x20000)),ram=original.slice();seedMedinaCheckpoint(ram,'medina-pyramid');
   const party=[0,companion,companion===1?2:1];ram.fill(128,0x2980,0x2989);ram.set([...party,...[0,1,2,3,4,5,6].filter(id=>!party.includes(id))],0x2980);
   if(!charged)ram[0x10000]=170;if(claimed){ram[0x1019c]|=4;ram[0x101a0]|=1;}
   for(let p=0;p<ram.length;){if(ram[p]===original[p]){p++;continue;}const start=p++;while(p<ram.length&&ram[p]!==original[p])p++;await write(start,ram.slice(start,p));}
   await write(0x1238e,[0xe0,42,0,8,20,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),42);
  }
  const companions=[];for(const companion of[1,2,3,4,5,6]){await fixture({companion});companions.push({companion,...await visitPyramid(io,{gift:companion%2?'left':'right'})});}
  await fixture({charged:false});const locked=await visitPyramid(io,{charged:false});
  await fixture({claimed:true});const claimed=await visitPyramid(io,{claimed:true});return{companions,locked,claimed};
 });
}
