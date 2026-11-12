import assert from 'node:assert/strict';
import {attackNativeEnemy,chooseNativeTech,useNativeItem} from './battle-controller.mjs';

const battle=async io=>!!((await io.read(0x117))&1);
// Usable battle stock of an item: the native battle item records at 7E:1580
// (id, ..., flags, count), which track uses until the battle ends.
const stock=async(io,item)=>{const r=await io.bytes(0x1580,1280);for(let n=0;n<256;n++)if(r[n*5]===item&&r[n*5+3]&&!(r[n*5+2]&128))return r[n*5+3];return 0;};
const hp=async io=>{const out=[];for(let i=0;i<3;i++)out.push(await io.read(0x5e30+i*128,2));return out;};
async function ready(io){
 for(let n=0;n<500&&await battle(io)&&(await io.read(0x95d5))>2;n++)await io.wait(12);
 for(let n=0;n<120&&await battle(io)&&((await io.read(0x95db))||(await io.read(0x9609)));n++)await io.tap(1,12);
}
async function survive(io,threshold,actions,mpFloor=0){
 const health=await hp(io);assert.ok(health.some(Boolean),'The party survives the authored encounter');
 if(health.includes(0)){await useNativeItem(io,199,health.indexOf(0),{allowBattleEnd:true});actions.push({item:199});return true;}
 let lowMp=false;for(let i=0;i<3&&mpFloor;i++)if((await io.read(0x5e34+i*128,2))<mpFloor)lowMp=true;
 // When the healing supply runs out, keep fighting rather than fail the route.
 if((health.some(v=>v<threshold)||lowMp)&&await stock(io,197)){await useNativeItem(io,197,null,{allowBattleEnd:true});actions.push({item:197});return true;}
 return false;
}
async function enter(io,expected,{up=0,wait=500}={}){
 if(up)await io.hold(17,up);
 for(let n=0;n<120&&!await battle(io);n++)await io.tap(256,90);
 assert.ok(await battle(io),'Original battle command starts');await io.wait(wait);
 const formation=Array.from(await io.bytes(0xaf02,8));assert.deepEqual(formation.filter(i=>i!==255),expected,'Original formation');
 return formation;
}

export async function traverseRumpelEncounter(io,rom,key){
 const configs={
  'night-throne':{formation:[161],up:80,story:189},
  'golem-twins':{formation:[149,149],up:80,story:201},
  'blackbird-wing':{formation:[243]},
  'dragon-deck':{formation:[162]}
 },cfg=configs[key];assert.ok(cfg,'Known authored encounter');
 const formation=await enter(io,cfg.formation,cfg),actions=[];await io.shot(key+'-battle');
 let iterations=0;
 if(key==='blackbird-wing'){
  for(;iterations<300&&await battle(io);iterations++)await io.wait(30);
  actions.push({action:'Observe original countdown and retreat without attacks'});
 }else if(key==='golem-twins'){
  for(;iterations<150&&await battle(io);iterations++){
   await ready(io);if(!await battle(io))break;
   if(!await survive(io,650,actions,20)){
    let cast=false;
    for(let attempt=0;attempt<120&&await battle(io)&&!cast;attempt++){
     await ready(io);const actor=await io.read(0x95d5);if(actor>2){await io.wait(30);continue;}
     try{const tech=[8,14,20][actor];await chooseNativeTech(io,rom,actor,tech);actions.push({actor,tech});cast=true;}
     catch(e){if(!['Native tech window did not open','Battle command menu is not ready','Requested party member is not ready'].includes(e.message))throw e;await io.wait(30);}
    }
    assert.ok(cast||!await battle(io),'A native party command becomes available');
   }
   await io.wait(400);
  }
 }else for(;iterations<200&&await battle(io);iterations++)await io.tap(256,100);
 assert.equal(await battle(io),false,'Original battle ends');await io.wait(120);await io.shot(key+'-battle-return');
 const complete=async()=>cfg.story?(await io.read(0x10000))===cfg.story&&(await io.read(0x11f))===1&&!(await io.read(0x126)):key==='dragon-deck'?(await io.read(0x100d2))!==7&&(await io.read(0x100,2))!==377:(await io.read(0x100d2))===1&&(await io.read(0x100,2))===271;
 let continuation=0;
 for(;continuation<160&&!await complete();continuation++){
  let confirm=256;
  if(key==='dragon-deck')for(let i=0,n=await io.read(0x12000);i<n;i++){const pc=await io.read(0x1180+i*2,2);if(pc>=0xbc8&&pc<=0xbcc)confirm=2;}
  await io.tap(confirm,100);
 }
 assert.ok(await complete(),'Authored progression and return complete');await io.wait(120);await io.shot(key+'-return');
 const party=[];for(const id of await io.bytes(0x2980,3))party.push({id,hp:await io.read(0x2603+id*80,2)});
 assert.ok(party.some(p=>p.hp>0),'Original victory retains a surviving party');
 return {key,formation,iterations,actions,continuation,party,location:await io.read(0x100,2),story:await io.read(0x10000),d2:await io.read(0x100d2)};
}

export async function traverseGiantGodmother(io){
 const formation=await enter(io,[176,178,177]),actions=[];await io.shot('godmother-battle');
 for(const[enemy,targetSlot]of[[178,7],[177,9]]){
  await attackNativeEnemy(io,enemy,{targetSlot});actions.push({enemy,targetSlot});await io.wait(360);await io.shot('godmother-counter-'+enemy);
 }
 for(let n=0;n<100&&await battle(io)&&(await io.read(0x5e30+3*128,2));n++){
  await ready(io);if(!await battle(io))break;
  if(!await survive(io,700,actions)){await attackNativeEnemy(io,176,{targetSlot:3});actions.push({enemy:176});}
  await io.wait(90);
 }
 assert.equal(await io.read(0x5e30+3*128,2),0,'Original boss head defeated');
 for(let n=0;n<100&&await battle(io);n++)await io.wait(60);
 assert.equal(await battle(io),false,'Native victory handoff');await io.wait(120);await io.shot('godmother-victory');
 return {key:'godmother',formation,actions,partyHp:await hp(io),location:await io.read(0x100,2)};
}

export async function traverseCosmicInterior(io,rom,{revealPointer}={}){
 const formation=await enter(io,[205,204,203],{wait:100}),actions=[];await io.shot('cosmic-interior-battle');
 for(let n=0;n<160&&await battle(io);n++){
  await ready(io);if(!await battle(io))break;
  if(!await survive(io,800,actions)){
   const actor=await io.read(0x95d5);if(actor>=3){await io.wait(30);continue;}
   if(actor===2){const formation=await io.bytes(0xaf02,8),enemy=formation.find(id=>id!==255);await attackNativeEnemy(io,enemy);actions.push({actor,attack:enemy});await io.wait(120);continue;}
   const tech=[8,14,17][actor];
   try{await chooseNativeTech(io,rom,actor,tech);actions.push({actor,tech});await io.wait(120);}catch(e){if(!['Requested party member is not ready','Battle command menu is not ready','Native tech window did not open'].includes(e.message))throw e;await io.wait(30);}
  }
  await io.wait(24);
 }
 await io.wait(400);assert.equal(await battle(io),false,'Interior battle ends');
 assert.equal(await io.read(0x100,2),475);assert.deepEqual(Array.from(await io.bytes(0xaf02,8)),new Array(8).fill(255),'Formation clears natively');await io.shot('cosmic-interior-victory');
 const seen=new Set();let ticks=0,confirms=0;
 for(;ticks<12000&&!await battle(io);ticks+=6){
  if(await io.read(0x126)){await io.tap(256,0);confirms++;}
  await io.wait(6);
  if(revealPointer&&(await io.read(0x100,2))===475){
   const count=await io.read(0x12000),banks=await io.bytes(0x1200,count*2),offsets=await io.bytes(0x1280,count*2),frames=await io.bytes(0xf01,count*2);
   for(let object=0;object<count;object++)if(((banks[object*2]<<16)|offsets[object*2]|offsets[object*2+1]<<8)===revealPointer){const frame=frames[object*2];if(frame<8&&!seen.has(frame)){seen.add(frame);await io.shot('tyson-emergence-'+frame);}}
  }
 }
 assert.equal(await io.read(0x100,2),479);assert.ok(await battle(io));
 // D8 sets the battle flag before the native formation loader finishes.
 // Wait for its real actor IDs instead of treating that early flag as ready.
 for(let n=0;n<120&&(await io.read(0xaf02))!==206;n++)await io.wait(6);
 assert.deepEqual(Array.from(await io.bytes(0xaf02,8)),[206,255,255,255,237,255,239,255],'Original final formation');await io.wait(120);await io.shot('cosmic-final-formation');
 return {key:'cosmic-interior',formation,actions,revealTicks:ticks,dialogueConfirms:confirms,revealFrames:[...seen].sort(),location:479};
}
