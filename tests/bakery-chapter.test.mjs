import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{build,bedroom,screenshot}from'./helpers.mjs';
import{installHooks}from'../engine/hooks.js';
import{createDevTools}from'../engine/devtools.js';
import{bakeryCheckpoints,seedBakeryCheckpoint}from'../engine/bakery-checkpoints.js';
import{areas}from'../content/areas.js';
import{runFrames}from'../engine/automation.js';
import{u16}from'../engine/rom.js';
import{arriveAtBakery,feastWithBakery,recruitMongo,walkToBakeryForest,reconcileWithGingy}from'./bakery-chapter-controller.mjs';
import{walkToHunterDen,completeHunterDen}from'./bakery-den-controller.mjs';
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
async function fixture(key,party){
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[],battles=[];let before,seeded=false;
 h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();if(e.opcode===0xd8&&battles.at(-1)!==e.scriptPC)battles.push(e.scriptPC);});
 h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));const d=createDevTools(s,h),rom=s.cart.data.slice();
 if(party)h.on('event.dispatch',()=>{if(seeded)return;seeded=true;const available=bakeryCheckpoints[key].early?[0,1,2,3]:[0,1,2,3,5];s.ram.fill(128,0x2980,0x2989);s.ram.set([...party,...available.filter(id=>!party.includes(id))],0x2980);});
 const a=areas.find(a=>a.bakeryScene===key);assert.throws(()=>d.jump({...a,id:134}),/own location/);assert.throws(()=>d.jump({...a,party:[0,1,2]}),/own location/);d.jump(a);runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(k,n)=>runFrames(s,n,k),wait:n=>runFrames(s,n),tap:(k=256,n=100)=>{runFrames(s,3,k);runFrames(s,n);},shot:k=>screenshot(s,'.local/qa/'+k+'.png')};
 return{s,io,messages,battles,close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,rom);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}
const saw=(f,loc,ids)=>{for(const id of ids)assert.ok(f.messages.some(([l,n])=>l===loc&&n===id),`${loc}:${id}`);};
test('early Bakery shortcuts seed the real key and recruitment stages, preserve other quest bits, and undo exactly',async()=>{
 for(const[key,c]of Object.entries(bakeryCheckpoints).filter(([,c])=>c.chapter)){
  const r=new Uint8Array(0x20000);r.set([215,220,189],0x2400);r.set([7,9,12],0x2500);r[0x10057]=255;r[0x10156]=255;r[0x101aa]=2;r[0x1005b]=1;r[0x100ee]=173;r[0x10160]=90;
  seedBakeryCheckpoint(r,key);assert.equal(r[0x10000],c.story);assert.deepEqual([...r.slice(0x2980,0x2983)],c.party);assert.equal(r[0x29af],c.early?240:244);
  for(const[id,n]of[[215,c.gateKey],[220,c.dreamstone],[189,12]]){let count=0;for(let slot=0;slot<256;slot++)if(r[0x2400+slot]===id)count+=r[0x2500+slot];assert.equal(count,n);}
  assert.equal(r[0x10057],251);assert.equal(r[0x10156],254);assert.equal(r[0x101aa],0);assert.equal(r[0x1005b],0);assert.equal(r[0x100ee],173);assert.equal(r[0x10160],90);
  const f=await fixture(key);f.close();
 }
});
test('one controller route earns the Bakery welcome, Dreamstone, theft, Mongo recruitment and the recovered Gate Key',async()=>{
 const f=await fixture('bakery-arrival');const arrival=await arriveAtBakery(f.io);await feastWithBakery(f.io);await recruitMongo(f.io);await walkToBakeryForest(f.io);await reconcileWithGingy(f.io);
 const forest=await walkToHunterDen(f.io),den=await completeHunterDen(f.io,b.rom);
 assert.deepEqual(f.battles.slice(0,6),[0x859,0x611,0x54c,0x744,0x860,0x7f8]);assert.equal(arrival.encounters.length,6);
 assert.equal(forest.encounters.length,2);assert.ok(den.encounters.length>=6);assert.equal(f.battles.at(-1),0x1ff);
 assert.equal(den.reward.destination,275);assert.equal(den.reward.story,124);assert.equal(den.reward.quantity,1);assert.ok(den.reward.combat.spells>0);
 saw(f,273,[1,0,4,3,5,6,8,10,13,15,17,18,19,20,21,22,23,30,31,33,35,36,37,39,40,41]);saw(f,274,[42]);
 saw(f,275,[138,121,122,123,124,126,127,128,129]);saw(f,280,[60,61,62,63,64,69,72,73,81,82,83,84,85,86,87,88,89,90,92,93,94,95,99,100,101,102]);
 saw(f,279,[107,106,110,112,114,115,117,120]);saw(f,282,[0,1,2,3,4,5,8,9,10,11,12,13,14,15,16,17,18,19,20,21,24]);
 saw(f,289,[142,143,144,145,146,148,149,150,151,152,153,157,158,159]);f.close();
});
test('feast and morning shortcuts enter the same live contest and recruitment sequence',async()=>{
 const feast=await fixture('bakery-feast');await feastWithBakery(feast.io);feast.close();
 const morning=await fixture('bakery-morning');await recruitMongo(morning.io);morning.close();
});
test('all three early companions retain their reactions to Gingy and leave the stolen key with the hunters',async()=>{
 for(const companion of[1,2,3]){const f=await fixture('bakery-forest',[0,5,companion]);const r=await reconcileWithGingy(f.io);assert.deepEqual(r,{destination:282,story:123,gateKey:0,dreamstone:1});saw(f,282,[companion+4,companion+20,24]);f.close();}
});
