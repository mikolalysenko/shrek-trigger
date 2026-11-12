import path from 'node:path';
import assert from 'node:assert/strict';
import {withIndependentController} from './independent-controller.mjs';
import {seedMedinaCheckpoint} from '../engine/medina-checkpoints.js';
import {put16,put24} from '../engine/rom.js';
import {areas} from '../content/areas.js';
import {visitMedinaHouse,visitMedinaInn,shopInMedina,defeatCaveKeeper} from '../tests/medina-controller.mjs';

export async function checkIndependentMedina(options){
 const{out,checkpoint,built}=options;if(!checkpoint)throw Error('Medina checks need the prepared native bedroom loadout');
 return withIndependentController(options,async({request,write,controller:io})=>{
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);
  await request({op:'savestate',name:'medina-bedroom'});
  async function fixture(key,{party=[0,1,2],gold,paidInn=false}={}){
   await request({op:'loadstate',file:path.join(out,'medina-bedroom.state')});
   const original=Uint8Array.from(await io.bytes(0,0x20000)),ram=original.slice();seedMedinaCheckpoint(ram,key);
   ram.fill(128,0x2980,0x2989);ram.set(party,0x2980);ram[0x2983]=[0,1,2,3].find(id=>!party.includes(id));ram[0x29af]=240;
   if(gold!==undefined)put24(ram,0x2c53,gold);if(paidInn)ram[0x101a2]|=4;
   if(key==='medina-arrival'||key.endsWith('-inn'))for(const id of party){put16(ram,0x2603+id*80,500);put16(ram,0x2607+id*80,1);}
   // Apply only actual fixture differences, before the native transition.
   // All following route commands receive io, which cannot write memory.
   for(let p=0;p<ram.length;){if(ram[p]===original[p]){p++;continue;}const start=p++;while(p<ram.length&&ram[p]!==original[p])p++;await write(start,ram.slice(start,p));}
   const a=areas.find(a=>a.medinaScene===key),map=a.id|((a.facing??1)<<9);
   await write(0x1238e,[0xe0,map&255,map>>8,a.x,a.y,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),a.id);
  }
  const summary={houses:[],inns:[],markets:[],caves:[]};
  for(const party of[[0,1,2],[0,3,2],[0,1,3]]){await fixture('medina-arrival',{party});summary.houses.push(await visitMedinaHouse(io));}
  for(const c of[{peaceful:false,gold:5000},{peaceful:true,gold:5000},{peaceful:false,gold:199,paidInn:true},{peaceful:true,gold:9}]){
   await fixture(c.peaceful?'medina-peaceful-inn':'medina-inn',c);summary.inns.push(await visitMedinaInn(io,{peaceful:c.peaceful,confrontation:!c.paidInn}));
  }
  for(const peaceful of[false,true]){await fixture(peaceful?'medina-peaceful-market':'medina-market');summary.markets.push(await shopInMedina(io));}
  for(const party of[[0,1,2],[0,1,3]]){await fixture('medina-cave',{party});summary.caves.push(await defeatCaveKeeper(io,built.rom));}
  return summary;
 });
}
