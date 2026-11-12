import path from'node:path';
import assert from'node:assert/strict';
import{withIndependentController}from'./independent-controller.mjs';
import{seedBridgeCheckpoint}from'../engine/bridge-checkpoints.js';
import{areas}from'../content/areas.js';
import{requestBridgeSupplies,collectBridgeSupplies,deliverBridgeSupplies,defendBridge}from'../tests/bridge-controller.mjs';

export async function checkIndependentBridge(options){
 const{out,checkpoint}=options;if(!checkpoint)throw Error('Bridge checks need the prepared native bedroom loadout');
 return withIndependentController(options,async({request,write,controller:io})=>{
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);await request({op:'savestate',name:'bridge-bedroom'});
  async function fixture(key,party=[0,1,2]){
   await request({op:'loadstate',file:path.join(out,'bridge-bedroom.state')});
   const original=Uint8Array.from(await io.bytes(0,0x20000)),ram=original.slice();seedBridgeCheckpoint(ram,key);
   ram.fill(128,0x2980,0x2989);ram.set([...party,...[0,1,2,3].filter(id=>!party.includes(id))],0x2980);
   for(let p=0;p<ram.length;){if(ram[p]===original[p]){p++;continue;}const start=p++;while(p<ram.length&&ram[p]!==original[p])p++;await write(start,ram.slice(start,p));}
   const a=areas.find(a=>a.bridgeScene===key),map=a.id|((a.facing??1)<<9);await write(0x1238e,[0xe0,map&255,map>>8,a.x,a.y,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),a.id);
  }
  await fixture('bridge-request');const requested=await requestBridgeSupplies(io);
  await fixture('bridge-chef');const chef=await collectBridgeSupplies(io);
  await fixture('bridge-supplies');const delivery=await deliverBridgeSupplies(io),afterDelivery=await defendBridge(io);
  const parties=[];for(const party of[[0,2,1],[0,3,2]]){await fixture('bridge-battle',party);parties.push({party,...await defendBridge(io)});}
  return{requested,chef,delivery,afterDelivery,parties};
 });
}
