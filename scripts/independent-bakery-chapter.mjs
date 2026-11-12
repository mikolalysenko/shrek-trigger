import path from'node:path';
import{readFile}from'node:fs/promises';
import assert from'node:assert/strict';
import{withIndependentController}from'./independent-controller.mjs';
import{bakeryCheckpoints,seedBakeryCheckpoint}from'../engine/bakery-checkpoints.js';
import{areas}from'../content/areas.js';
import{arriveAtBakery,feastWithBakery,recruitMongo,walkToBakeryForest,reconcileWithGingy}from'../tests/bakery-chapter-controller.mjs';
import{walkToHunterDen,completeHunterDen}from'../tests/bakery-den-controller.mjs';

export async function checkIndependentBakeryChapter(options){
 const{out,checkpoint}=options;if(!checkpoint)throw Error('Bakery chapter checks need the prepared native bedroom loadout');
 const rom=options.built?.rom??new Uint8Array(await readFile(options.rom));
 return withIndependentController(options,async({request,write,controller:io})=>{
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);await request({op:'savestate',name:'chapter-bedroom'});
  let prefix='';const shot=io.shot;io.shot=key=>shot(prefix+'-'+key);
  async function fixture(key,party){
   const c=bakeryCheckpoints[key];prefix=key+(party?'-'+party[2]:'');await request({op:'loadstate',file:path.join(out,'chapter-bedroom.state')});
   const old=Uint8Array.from(await io.bytes(0,0x20000)),ram=old.slice();seedBakeryCheckpoint(ram,key);
   if(party){const available=c.early?[0,1,2,3]:[0,1,2,3,5];ram.fill(128,0x2980,0x2989);ram.set([...party,...available.filter(id=>!party.includes(id))],0x2980);}
   for(let p=0;p<ram.length;){if(ram[p]===old[p]){p++;continue;}const a=p++;while(p<ram.length&&ram[p]!==old[p])p++;await write(a,ram.slice(a,p));}
   const a=areas.find(a=>a.bakeryScene===key),map=a.id|((a.facing??1)<<9);await write(0x1238e,[0xe0,map&255,map>>8,a.x,a.y,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),a.id);
  }
  await fixture('bakery-arrival');const arrival=await arriveAtBakery(io),feast=await feastWithBakery(io),recruit=await recruitMongo(io);await walkToBakeryForest(io);const forest=await reconcileWithGingy(io);
  const forestRoute=await walkToHunterDen(io),hunterDen=await completeHunterDen(io,rom);
  await fixture('bakery-feast');const separateFeast=await feastWithBakery(io);
  await fixture('bakery-morning');const separateMorning=await recruitMongo(io);
  const companions=[];for(const companion of[1,2,3]){await fixture('bakery-forest',[0,5,companion]);companions.push({companion,...await reconcileWithGingy(io)});}
  return{continuous:{arrival,feast,recruit,forest,forestRoute,hunterDen},separateFeast,separateMorning,companions};
 });
}
