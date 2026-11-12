import assert from 'node:assert/strict';
import {u16} from '../engine/rom.js';
import {chooseNativeTech} from './battle-controller.mjs';

// Traverse the western Lab 16 map through all five encounter groups. The
// adapter exposes only reads and controller input after checkpoint setup.
export async function traverseWesternRuins({read,bytes,hold,tap,wait,shot}){
  const formations=[];let firstAmbushDwellFrames=0;assert.equal(await read(0x100,2),212);
  async function fight(){
    await wait(400);const formation=Array.from(await bytes(0xaf02,8));formations.push(formation);
    if(formations.length===1)assert.notEqual(await read(0x1a93),1,'battle work memory replaces the hidden rat drawing state');
    await shot('ruins-battle-'+formations.length);
    for(let i=0;i<120&&(await read(0x117)&1);i++)await tap(256,100);
    assert.equal(await read(0x117)&1,0);await wait(120);
    if(formations.length===1){
      assert.equal(await read(0x1a93),1,'native field return restores the rat patrol');
      // A surviving enemy can knock the party back into the lower corridor.
      // Rejoin the verified approach around the rock; a diagonal shortcut
      // from the returned battle formation can point straight into the wall.
      for(const[x,y]of[[232,791],[232,775],[168,775],[168,759],[120,759],[120,743],[104,743]])await walk(x,y);
    }
  }
  async function walk(x,y){
    for(let i=0;i<1400;i++){
      const ram=await bytes(0x100,0x1900);if(ram[0x17]&1){await fight();continue;}
      const n=u16(ram,0x97),dx=x-u16(ram,0x1700+n)/16,dy=y-u16(ram,0x1780+n)/16;
      if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return;
      await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
    }
    await shot('ruins-stuck');assert.fail('Western ruins waypoint '+x+','+y+' is unreachable');
  }
  const route=[
    [14,51],[14,49],[14,48],[10,48],[10,47],[7,47],[7,46],[6,46],[6,36],[9,36],[9,35],
    [9,36],[18,36],[18,37],[19,37],[19,38],[24,38],[24,39],[24,38],[27,38],[27,19],
    [25,19],[25,17],[16,17],[16,24],[7,24],[7,20],[6,20],[6,19],[5,19],[5,5],[8,5],[7,6]
  ];
  for(const[x,y]of route){
    await walk(x*16+8,y*16+7);
    // The original ambush waits on rat/sound work. Remain inside its trigger
    // zone until that event finishes instead of racing through the waypoint.
    if(x===14&&y===49&&formations.length===0){
      for(let i=0;i<48&&!(await read(0x117)&1);i++){await wait(10);firstAmbushDwellFrames+=10;}
      assert.ok(await read(0x117)&1,'first ambush starts in its original trigger zone');await fight();
    }
    if(x===24&&y===39)await wait(48);
  }
  await hold(16,8);await tap(256);if(await read(0x117)&1)await fight();
  assert.deepEqual(formations.map(a=>a.filter(id=>id!==255)),[
    [34,34,39],[91,91,91,39],[34,34,39],[34,34,39,39],[91,91,91,91,91]
  ]);
  for(const[x,y]of[[30,6],[30,7]])await walk(x*16+8,y*16+7);
  for(let i=0;i<300&&await read(0x100,2)===212;i++)await hold(129,1);
  await wait(400);assert.equal(await read(0x100,2),213);assert.equal(await read(0x10000),52);
  await shot('ruins-east-arrival');return {formations,destination:213,story:52,firstAmbushDwellFrames};
}

// Continue from the western map's real exit. Three wisp groups require
// magic; the two golems use ordinary attacks. No checkpoint intervenes.
export async function traverseEasternRuins(io,rom){
  const {read,bytes,hold,tap,wait,shot}=io,formations=[],spells=[];
  assert.equal(await read(0x100,2),213);
  async function fight(){
    await wait(400);const formation=Array.from(await bytes(0xaf02,8));formations.push(formation);
    await shot('east-ruins-battle-'+formations.length);
    if(formation.includes(102)){
      const before=await read(0x5e34,2),selection=await chooseNativeTech(io,rom,0,5);
      await wait(1400);
      // These encounters automatically return to the field. Battle work
      // memory is then reused, so inspect the persistent character's MP.
      const after=await read((await read(0x117)&1)?0x5e34:0x2607,2);
      assert.ok(after<before,'native magic consumes MP');spells.push({selection,before,after});
    }
    for(let i=0;i<120&&(await read(0x117)&1);i++)await tap(256,100);
    assert.equal(await read(0x117)&1,0);await wait(120);
  }
  async function walk(x,y){
    for(let i=0;i<1400;i++){
      const ram=await bytes(0x100,0x1900);if(ram[0x17]&1){await fight();continue;}
      const n=u16(ram,0x97),dx=x-u16(ram,0x1700+n)/16,dy=y-u16(ram,0x1780+n)/16;
      if(Math.abs(dx)<=3&&Math.abs(dy)<=3)return;
      await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
    }
    await shot('east-ruins-stuck');assert.fail('Eastern ruins waypoint '+x+','+y+' is unreachable');
  }
  const groups=[
    [[33,38],[33,36],[38,36]],
    [[37,36],[41,36],[41,40],[42,40],[42,45],[43,45],[43,49]],
    [[43,49],[46,49]],
    [[46,49],[46,50],[40,50],[40,52],[42,52],[42,54],[44,54],[44,55],[45,55],[45,57]],
    [[45,58],[45,57],[52,57]],
    [[52,57],[52,46],[56,46],[56,38],[57,38],[57,37],[60,37]]
  ];
  for(const group of groups){
    for(const[x,y]of group)await walk(x*16+8,y*16+7);
    await wait(60);if(await read(0x117)&1)await fight();
  }
  assert.deepEqual(formations.map(a=>a.filter(id=>id!==255)),[
    [102,102,102],[163],[102,102,102],[102,102,102],[163]
  ]);
  assert.equal(spells.length,3);
  for(const[x,y]of[[60,37],[60,34],[59,34]])await walk(x*16+8,y*16+7);
  for(let i=0;i<300&&await read(0x100,2)===213;i++)await hold(17,1);
  await wait(600);assert.equal(await read(0x100,2),498);assert.equal(await read(0x10000),52);
  await shot('ruins-world-exit');return {formations,spells,destination:498,story:52};
}
