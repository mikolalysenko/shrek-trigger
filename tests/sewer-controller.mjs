import assert from 'node:assert/strict';
import {u16} from '../engine/rom.js';

// The first frog argument and imp encounter precede the lower sound traps.
export async function traverseSewerEntrance({read,bytes,hold,tap,wait,shot}){
 const formations=[];assert.equal(await read(0x100,2),236);
 async function walk(x,y){
  for(let i=0;i<1200;i++){
   if(await read(0x117)&1){
    await wait(400);formations.push(Array.from(await bytes(0xaf02,8)));
    await shot('sewer-entrance-battle');
    for(let n=0;n<130&&(await read(0x117)&1);n++)await tap(256,100);
    assert.equal(await read(0x117)&1,0);await wait(120);continue;
   }
   if(!await read(0x11f)){await tap(256,90);continue;}
   const r=await bytes(0x100,0x1900),n=u16(r,0x97),dx=x-u16(r,0x1700+n)/16,dy=y-u16(r,0x1780+n)/16;
   if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return;
   await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
  }
  await shot('sewer-entrance-stuck');assert.fail('Sewer entrance waypoint '+x+','+y);
 }
 for(const[x,y]of[[14,6],[14,11],[9,11],[6,11],[3,11],[3,24],[3,26],[3,27]])await walk(x*16+8,y*16+7);
 assert.deepEqual(formations.map(a=>a.filter(id=>id!==255)),[[99,99]]);
 assert.equal(await read(0x100ed)&7,7);assert.equal(await read(0x10070)&32,32);
 for(let i=0;i<300&&await read(0x100,2)===236;i++)await hold(33,1);
 await wait(400);assert.equal(await read(0x100,2),237);assert.equal(await read(0x10000),52);
 await shot('sewer-north-to-lower');return{formations,flags:await read(0x100ed),destination:237,story:52};
}

// The original diary appears only after rescuing the prisoner. Test both
// states without changing that quest flag after entering the map.
export async function traverseSewerDiary({read,bytes,hold,tap,shot}){
 assert.equal(await read(0x100,2),237);const rescued=!!(await read(0x1019b)&64);
 assert.equal(await read(0x1ab5),rescued?1:0);
 async function walk(x,y){
  for(let i=0;i<1200;i++){
   const r=await bytes(0x100,0x1900),n=u16(r,0x97),dx=x-u16(r,0x1700+n)/16,dy=y-u16(r,0x1780+n)/16;
   if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return;
   await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
  }
  await shot('sewer-diary-stuck');assert.fail('Sewer diary waypoint '+x+','+y);
 }
 for(const[x,y]of[[13,7],[10,7],[10,10],[4,10],[4,7]])await walk(x*16+8,y*16+7);
 await walk(64,114);await hold(16,1);await tap(256,180);
 if(rescued){assert.equal(await read(0x12a),100);assert.equal(await read(0x11f),0);}
 else{assert.notEqual(await read(0x12a),100);assert.equal(await read(0x11f),1);}
 await shot(rescued?'sewer-diary-visible':'sewer-diary-absent');
 for(let i=0;i<20&&!await read(0x11f);i++)await tap(256,90);
 assert.equal(await read(0x11f),1);assert.equal(!!(await read(0x1019b)&64),rescued);
 for(const[x,y]of[[4,10],[10,10],[10,7],[13,7]])await walk(x*16+8,y*16+7);
 return{visible:rescued,line:rescued?100:null};
}

// After entry, use only observed state and ordinary controller input. The
// upper edge of the barrel corridor allows passage without interaction.
export async function traverseSewer(io,noisy=false){
 const{read,bytes,hold,tap,wait,shot}=io,formations=[];assert.equal(await read(0x100,2),237);
 const flagAddresses=[0x10210,0x10212,0x10214,0x10216];
 async function fight(){
  await wait(400);const formation=Array.from(await bytes(0xaf02,8));formations.push(formation);
  await shot('sewer-noise-battle-'+formations.length);
  for(let i=0;i<130&&(await read(0x117)&1);i++)await tap(256,100);
  assert.equal(await read(0x117)&1,0);await wait(120);
 }
 async function walk(x,y){
  for(let i=0;i<1200;i++){
   if(await read(0x117)&1){await fight();continue;}
   const r=await bytes(0x100,0x1900),n=u16(r,0x97),dx=x-u16(r,0x1700+n)/16,dy=y-u16(r,0x1780+n)/16;
   if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return;
   await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
  }
  await shot('sewer-stuck');throw Error('sewer waypoint '+x+','+y);
 }
 async function route(points){for(const[x,y]of points){await walk(x*16+8,y*16+7);}}
 async function noise(dir,flag){
  await hold(dir,1);await tap(256,900);
  assert.ok(await read(0x117)&1,'noise starts a native encounter');
  await fight();assert.equal(await read(flag),1);
 }
 await route([[13,7],[21,7],[21,5]]);if(noisy)await noise(128,0x10210);
 await route([[21,2],[28,2],[28,15],[25,15]]);
 if(noisy){await hold(65,6);await noise(64,0x10212);}
 await route([[25,14.5],[21,14.5],[18,14.5],[18,15],[18,20],[9,20],[9,17],[6,17]]);
 if(noisy)await noise(32,0x10214);
 await route([[4,17],[4,27],[16,27]]);
 if(noisy){await route([[16,28]]);await noise(32,0x10216);await route([[16,27]]);}
 await route([[28,27],[28,25],[28,22]]);
 assert.deepEqual(formations.map(a=>a.filter(id=>id!==255)),noisy?[[99,99,99],[99,99,99,99],[99,99,134],[99,99,99]]:[]);
 const flags=[];for(const p of flagAddresses)flags.push(await read(p));
 assert.deepEqual(flags,Array(4).fill(noisy?1:0));
 for(let i=0;i<300&&await read(0x100,2)===237;i++)await hold(17,1);
 await wait(400);assert.equal(await read(0x100,2),236);assert.equal(await read(0x10000),52);
 await shot(noisy?'sewer-noise-exit':'sewer-quiet-exit');
 return {noisy,formations,flags,destination:236,story:52};
}

// Continue from the southeast ladder. Hidden paths run behind the foreground
// wall; the narrow eastern catwalk needs a half-tile horizontal waypoint.
export async function traverseUpperSewer({read,bytes,hold,tap,wait,shot}){
 const formations=[];assert.equal(await read(0x100,2),236);
 async function fight(){
  await wait(400);formations.push(Array.from(await bytes(0xaf02,8)));
  await shot('sewer-upper-battle-'+formations.length);
  for(let i=0;i<140&&(await read(0x117)&1);i++)await tap(256,100);
  assert.equal(await read(0x117)&1,0);await wait(120);
 }
 async function walk(x,y){
  for(let i=0;i<1400;i++){
   if(await read(0x117)&1){await fight();continue;}
   // E3 disables exploration during native conversations and choreography.
   if(!await read(0x11f)){await tap(256,90);continue;}
   const r=await bytes(0x100,0x1900),n=u16(r,0x97),dx=x-u16(r,0x1700+n)/16,dy=y-u16(r,0x1780+n)/16;
   if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return;
   await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
  }
  await shot('sewer-upper-stuck');assert.fail('Upper sewer waypoint '+x+','+y);
 }
 async function route(points){for(const[x,y]of points)await walk(x*16+8,y*16+7);}
 await route([[14,40],[14,38],[12,38],[12,27],[21,27],[21,23]]);
 await hold(16,2);await tap(256,600);
 assert.equal(await read(0x10216),1);assert.equal(await read(0x11f),1);
 await shot('sewer-hidden-door');
 await route([[21,27],[12,27],[12,20],[19,20],[19,17],[26,17],[26,23]]);
 for(let i=0;i<100&&(!((await read(0x100ed))&8)||!await read(0x11f));i++)await tap(256,90);
 assert.equal(await read(0x100ed)&8,8);assert.equal(await read(0x11f),1);
 const frogSceneLastLine=await read(0x12a);assert.equal(frogSceneLastLine,47);await wait(120);
 await shot('sewer-frog-scene-complete');
 await route([[26,26],[29,26],[33,26],[33,7],[38,7]]);
 for(let i=0;i<150&&!formations.some(a=>a.includes(4));i++){
  if(await read(0x117)&1)await fight();else await tap(256,90);
 }
 assert.ok(formations.some(a=>a.includes(4)));assert.equal(await read(0x100ed)&16,16);
 await route([[44,7],[44,18],[38.5,18],[38.5,24],[41,24],[41,26],[44,29],[44,38],[44,44]]);
 assert.deepEqual(formations.map(a=>a.filter(id=>id!==255)),[[42,42],[4],[99,99,42,42]]);
 await route([[27.5,44],[27.5,38],[27,38],[27,35]]);
 const quantity=async()=>{const r=await bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(r[i]===15)n+=r[i+256];return n;};
 const before=await quantity();assert.equal(await read(0x10011)&64,0);
 await hold(16,2);await tap(256,300);
 assert.equal(await read(0x10011)&64,64);assert.equal(await quantity(),before+1);
 assert.equal(await read(0x12a),0);await shot('sewer-sword-chest');await tap(256,120);
 await route([[27,38],[24,38],[24,36]]);
 await hold(16,2);await tap(256,600);assert.equal(await read(0x100ec)&2,2);
 await route([[24,38],[18,38],[24,38],[24,36]]);await shot('sewer-bridge-crossed');
 const bridgeStates=[2];
 for(const expected of[0,2]){
  await hold(16,2);await tap(256,600);assert.equal(await read(0x100ec)&2,expected);bridgeStates.push(expected);
 }
 await route([[24,38],[27.5,38],[27.5,44],[35,44],[35,38],[35,33]]);
 for(let i=0;i<300&&await read(0x100,2)===236;i++)await hold(17,1);
 await wait(600);assert.equal(await read(0x100,2),498);assert.equal(await read(0x10000),52);
 await shot('sewer-world-exit');return {formations,frogSceneLastLine,flags:await read(0x100ed),treasure:{id:15,quantity:1},bridgeStates,destination:498,story:52};
}
