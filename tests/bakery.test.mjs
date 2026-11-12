import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {bakeryCheckpoints,seedBakeryCheckpoint} from '../engine/bakery-checkpoints.js';
import {areas} from '../content/areas.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {recoverGateKey,defeatIronKilnback,defeatFurnaceMaw,defeatBuriedFurnace} from './bakery-controller.mjs';
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('Bakery shortcuts preserve other quest bits, distinguish recruitment stages, and undo the exact starting machine',async()=>{
 for(const[key,c]of Object.entries(bakeryCheckpoints)){
  if(c.chapter||c.returnVisit)continue;
  const ram=new Uint8Array(0x20000);for(const p of[0x100ee,0x100ec,0x101d2,0x100d2,0x101ee])ram[p]=255;
  ram.set([215,189],0x2400);ram.set([1,12],0x2500);seedBakeryCheckpoint(ram,key);
  assert.equal(ram[0x10000],c.story);assert.deepEqual([...ram.slice(0x2980,0x2983)],[0,5,1]);assert.equal(ram[0x29af],c.first?244:c.late?254:252);assert.equal(ram[0x2769],c.first?59:c.late?66:61);
  assert.equal(ram[0x100ee],key==='bakery-iron-kiln'?254:255);assert.equal(ram[0x100ec],key==='bakery-furnace'?127:255);assert.equal(ram[0x101d2],c.late?191:255);assert.equal(ram[0x100d2],255);assert.equal(ram[0x101ee],255);
  assert.equal(ram[0x2400],c.first?0:215);assert.equal(ram[0x2500],c.first?0:1);assert.deepEqual([...ram.slice(0x2401,0x2402)],[189]);assert.equal(ram[0x2501],12);
  assert.equal(ram[0x2628],c.fireArmor?110:0);
 }
 const ram=new Uint8Array(0x20000),old=ram.slice();assert.throws(()=>seedBakeryCheckpoint(ram,'bad'),/Unknown Bakery/);assert.deepEqual(ram,old);
 for(const[key,c]of Object.entries(bakeryCheckpoints))if(!c.chapter&&!c.returnVisit){const f=await fixture(key);f.close();}
});
function checkBody(s,key){
 const buried=key==='buried-furnace-battle',vram=new Uint8Array(s.ppu.vram.buffer),pal=buried?79:76;
 for(const[id,first]of buried?[[190,768],[171,896]]:[[190,640]]){
  const graphics=decompress(b.rom,fileOffset(u24(b.rom,0x362220+id*3))).bytes;
  assert.deepEqual(vram.slice(0x2000+first*32,0x2000+first*32+graphics.length),graphics,'native furnace background '+id);
 }
 for(const bank of buried?[6,7]:[5,6,7])for(let color=1;color<=15;color++)assert.equal(s.ppu.cgram[bank*16+color],u16(b.rom,0x3624c0+pal*210+(bank-1)*30+(color-1)*2),'native furnace palette');
}
async function fixture(key,party=[0,5,1]){
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[],battles=[],techs=[];let before,seeded=false;
 h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();if(e.opcode===0xd8&&battles.at(-1)!==e.scriptPC)battles.push(e.scriptPC);});
 h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));h.on('battle.tech',e=>techs.push(e.techId));
 const d=createDevTools(s,h),original=s.cart.data.slice();
 h.on('event.dispatch',()=>{if(seeded)return;seeded=true;const c=bakeryCheckpoints[key],ids=c.first?[0,1,2,3,5]:c.late?[0,1,2,3,4,5,6]:[0,1,2,3,4,5];s.ram.fill(128,0x2980,0x2989);s.ram.set([...party,...ids.filter(id=>!party.includes(id))],0x2980);});
 const a=areas.find(a=>a.bakeryScene===key);assert.throws(()=>d.jump({...a,id:134}),/own location/);assert.throws(()=>d.jump({...a,party}),/own location/);assert.throws(()=>d.jump({...a,fortressScene:'fortress-knight'}),/own location/);
 d.jump(a);runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>{if(['furnace-maw-battle','buried-furnace-battle'].includes(key))checkBody(s,key);return screenshot(s,'.local/qa/'+key+'.png');}};
 return{s,h,d,io,messages,battles,techs,close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}
const saw=(f,loc,ids)=>{for(const id of ids)assert.ok(f.messages.some(([l,n])=>l===loc&&n===id),`${loc}:${id}`);};
test('Glaze accepts either answer, Kilnback responds to native lightning, and every early companion returns the stolen key',async()=>{
 for(const[companion,explain]of[[1,true],[1,false],[2,true],[3,false]]){
  const f=await fixture('bakery-kiln',[0,5,companion]),r=await recoverGateKey(f.io,b.rom,{explain});
  assert.deepEqual(f.battles,[0x1ff]);assert.equal(f.techs.filter(t=>t===3).length,r.combat.spells);assert.ok(r.combat.spells>0);
  saw(f,289,[142,143,144,145,explain?146:147,148,149,150,151,152,158,159,...(companion===1?[153,157]:companion===2?[154,155]:[156])]);f.close();
 }
});
test('Iron Kilnback retains both greetings, its lightning response and the real northern exit',async()=>{
 for(const greet of[true,false]){
  const f=await fixture('bakery-iron-kiln'),r=await defeatIronKilnback(f.io,b.rom,{greet});assert.deepEqual(f.battles,[0x233]);saw(f,304,greet?[93,94]:[95]);assert.equal(f.techs.filter(t=>t===3).length,r.combat.spells);f.close();
 }
});
test('all four Bakery companion branches survive Glaze, the furnace fight, the escape and the aftermath on the real overworld',async()=>{
 for(const companion of[1,2,3,4]){
  const f=await fixture('bakery-furnace',[0,5,companion]);await defeatFurnaceMaw(f.io);assert.deepEqual(f.battles,[0x689]);
  saw(f,301,[65,69,66,70,71,72,73,74,...(companion<=3?[74+companion]:[]),...Array.from({length:15},(_,i)=>78+i)]);
  saw(f,261,[{1:103,2:101,3:102,4:104}[companion],105,106,{1:109,2:107,3:108,4:110}[companion]]);f.close();
 }
});
test('the buried furnace uses its own native palette, defeat flag and unmodified battle mechanics',async()=>{
 const f=await fixture('buried-furnace');const r=await defeatBuriedFurnace(f.io,b.rom);assert.deepEqual(f.battles,[0x29e]);assert.ok(r.combat.heals>0);assert.equal(f.techs.filter(t=>t===7).length,r.combat.finishers);f.close();
});
