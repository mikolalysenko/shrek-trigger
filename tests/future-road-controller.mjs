import assert from 'node:assert/strict';
import {u16} from '../engine/rom.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {raceController} from './race-controller.mjs';

// One controller route shared by SnesJs and the independent cores. The
// diagnostic prepares the chapter once; this driver has no write interface.
export async function traverseFutureRoad(io,rom){
  const {read,bytes,hold,tap,wait,shot}=io,formations=[],spell={};
  assert.equal(await read(0x100,2),224);
  assert.equal((await bytes(0x2400,256)).includes(221),false);
  assert.equal(await read(0x10010)&1,0);
  async function fight(){
    await wait(400);
    const formation=Array.from(await bytes(0xaf02,8));formations.push(formation);
    await shot('road-battle-'+formations.length);
    if(formation.includes(102)){
      spell.before=await read(0x5e34,2);
      spell.selection=await chooseNativeTech(io,rom,0,5);
      await wait(1400);spell.after=await read(0x5e34,2);
      assert.ok(spell.after<spell.before,'native magic consumes MP');
    }
    for(let i=0;i<120&&(await read(0x117)&1);i++)await tap(256,100);
    assert.equal(await read(0x117)&1,0,'battle returns to its native field caller');
    await wait(120);
  }
  async function walk(x,y){
    for(let i=0;i<1400;i++){
      const ram=await bytes(0x100,0x1900);
      if(ram[0x17]&1){await fight();continue;}
      const leader=u16(ram,0x97),dx=x-u16(ram,0x1700+leader)/16,dy=y-u16(ram,0x1780+leader)/16;
      if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return;
      await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
    }
    await shot('road-stuck');assert.fail('Ruined-road waypoint '+x+','+y+' is unreachable');
  }
  for(const[x,y]of[[6,8],[8,8],[17,8],[24,8],[27,11],[30,11],[35,12]])await walk(x*16+8,y*16+7);
  await hold(16,8);await tap(256);
  const items=await bytes(0x2400,512),slot=items.indexOf(221,0);
  assert.ok(slot>=0&&slot<256);assert.equal(items[slot+256],1);assert.equal(await read(0x10010)&1,1);
  await shot('road-recorder');await tap(256);
  // The chest is in a dead-end alcove. Return around the northern ridge;
  // no collision bypass, coordinate edit or post-battle jump is used.
  for(const[x,y]of[[27,12],[27,5],[37,5],[38,8],[40,10],[45,10],[49,8],[55,7],[62,7]])await walk(x*16+8,y*16+7);
  await hold(129,36);await wait(400);
  assert.equal(await read(0x100,2),225);
  assert.deepEqual(formations.map(a=>a.filter(id=>id!==255)),[[163,163,163],[163,163],[102,102,102,102,102],[163,163,163]]);
  assert.equal(await read(0x10000),55);await shot('road-east');
  for(const[x,y]of[[52,7],[54,5],[56,5]])await walk(x*16+8,y*16+7);
  await hold(32,4);await tap(256);
  for(let i=0;i<20&&await read(0x12a)!==109;i++)await tap(256);
  assert.equal(await read(0x12a),109);await wait(120);await shot('road-mode-choice');
  await tap(32);await tap(256);await wait(180);
  assert.equal(await read(0x10136)&129,129,'the earned recorder enables the chosen no-boost mode');
  // Walk past the keeper, then approach the cart's boarding point from below.
  for(const[x,y]of[[54,5],[54,7],[52,7],[52,11],[56,11]])await walk(x*16+8,y*16+7);
  await hold(16,4);await tap(256);await wait(1000);
  assert.equal(await read(0x100,2),271);assert.equal(await read(0x384),9);assert.equal(await read(0x9a,2),0);
  await shot('road-reverse-start');const steer=raceController();
  for(let i=0;i<6000;i++){
    const ram=await bytes(0,0x384);if(u16(ram,0x100)!==271)break;
    await hold(ram[0x380]?0:steer(ram),1);
  }
  assert.equal(await read(0x100,2),223);assert.equal(await read(0x380),1);
  const score=await read(0x382,2);assert.ok(score>0);
  for(let i=0;i<60&&(await read(0x10130,2)!==score||await read(0x12a)!==22);i++)await tap(256);
  assert.equal(await read(0x10130,2),score);assert.equal(await read(0x12a),22);
  await tap(256);await wait(120);await shot('road-reverse-finish');assert.equal(await read(0x10000),55);
  return {formations,spell,recorder:221,quantity:1,chestFlag:await read(0x10010)&1,destination:225,reverseRace:{mode:9,won:true,score,destination:223,recorded:true}};
}
