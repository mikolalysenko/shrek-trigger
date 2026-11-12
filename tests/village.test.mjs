import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{build,bedroom,screenshot}from'./helpers.mjs';
import{villageCheckpoints,seedVillageCheckpoint}from'../engine/village-checkpoints.js';
import{u16,u24,put16,put24}from'../engine/rom.js';
import{installHooks}from'../engine/hooks.js';
import{createDevTools}from'../engine/devtools.js';
import{runFrames}from'../engine/automation.js';
import{areas}from'../content/areas.js';
import{visitVillageInn,tradeVillagePortrait,hearRowan,commissionRowan}from'./village-controller.mjs';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
test('village fixtures preserve unrelated flags, prepare native prerequisites and reject unknown scenes before mutation',()=>{
 for(const key of Object.keys(villageCheckpoints)){
  const ram=new Uint8Array(0x20000);ram[0x100f2]=255;ram[0x100fe]=253;ram[0x100f6]=255;ram[0x100f3]=77;
  for(const id of[0,1,2]){put16(ram,0x2605+id*80,999);put16(ram,0x2609+id*80,99);}
  seedVillageCheckpoint(ram,key);assert.equal(ram[0x10000],90);assert.deepEqual([...ram.slice(0x2980,0x2989)],[0,1,2,3,128,128,128,128,128]);assert.equal(ram[0x29af],240);assert.equal(u24(ram,0x2c53),1000);
  assert.equal(ram[0x100f2],key==='village-commission'?252:key==='village-rowan'?253:255);assert.equal(ram[0x100fe],key==='village-portrait'?255:253);assert.equal(ram[0x100f6],key==='village-portrait'?253:255);assert.equal(ram[0x100f3],77);
  if(key==='village-inn')for(const id of[0,1,2]){assert.equal(u16(ram,0x2603+id*80),500);assert.equal(u16(ram,0x2607+id*80),1);assert.equal(u16(ram,0x2605+id*80),999);assert.equal(u16(ram,0x2609+id*80),99);}
 }
 const ram=new Uint8Array(0x20000),before=ram.slice();assert.throws(()=>seedVillageCheckpoint(ram,'bad'),/Unknown village/);assert.deepEqual(ram,before);
});
async function fixture(key,{gold=1000,portrait=true,claimed=false}={}){
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[];let before,seeded=false;
 h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
 const d=createDevTools(s,h),original=s.cart.data.slice();h.on('event.dispatch',()=>{if(seeded)return;seeded=true;put24(s.ram,0x2c53,gold);if(key==='village-portrait'){if(!portrait)s.ram[0x100fe]&=~2;if(claimed)s.ram[0x100f6]|=2;}});
 const a=areas.find(a=>a.villageScene===key);assert.throws(()=>d.jump({...a,id:134}),/own location/);assert.throws(()=>d.jump({...a,party:[0,1,2]}),/own location/);assert.throws(()=>d.jump({...a,bridgeScene:'bridge-battle'}),/own location/);
 d.jump(a);runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>screenshot(s,'.local/qa/'+key+'.png')};
 return{s,h,d,io,messages,close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}
function saw(f,location,ids){for(const id of ids)assert.ok(f.messages.some(([loc,n])=>loc===location&&n===id),location+':'+id);}
test('the headman commissions Rowan, the party walks across the world to buy his information and leaves through the native inn exit',async()=>{
 const f=await fixture('village-commission');await commissionRowan(f.io);saw(f,137,[69,70,71,72]);saw(f,138,[99,100,101,103,104,105,106]);f.close();
});
test('village lodging preserves refusal, charges exactly 50 G, heals the party and handles exact or insufficient funds',async()=>{
 for(const gold of[1000,50,49]){const f=await fixture('village-inn',{gold});await visitVillageInn(f.io);saw(f,138,[76,77,80,gold>=50?78:79]);f.close();}
});
test('the portrait trade requires the locked chest, supports refusal and awards its native onion only once',async()=>{
 for(const c of[{}, {portrait:false},{claimed:true}]){const f=await fixture('village-portrait',c);await tradeVillagePortrait(f.io,c);
  if(!c.claimed)saw(f,136,c.portrait===false?[187,52]:[187,52,188,189,190,191,192,195]);else assert.ok(!f.messages.some(([loc,id])=>loc===136&&id===195));f.close();
 }
});
test('Rowan charges 30 G once, retains his free shell hint on refusal and handles insufficient funds',async()=>{
 for(const gold of[1000,29]){const f=await fixture('village-rowan',{gold});await hearRowan(f.io);saw(f,138,gold>=30?[99,100,101,103,104,105,106]:[99,100,102,105,106]);f.close();}
});
