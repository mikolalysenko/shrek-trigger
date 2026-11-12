// Private proof adapter copied from tests/ruins-controller.mjs; only an original-zone dwell is added.
import assert from 'node:assert/strict';
import {u16} from '../../../engine/rom.js';

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
  for(const[x,y]of route){await walk(x*16+8,y*16+7);
    // Pin the first native ambush zone long enough for the original event
    // loop to finish its rat/sound work. No event, flag or position writes.
    if(x===14&&y===49&&formations.length===0){for(let i=0;i<48&&!(await read(0x117)&1);i++){await wait(10);firstAmbushDwellFrames+=10;}assert.ok(await read(0x117)&1,'native first ambush trigger in its original zone');await fight();}
    if(x===24&&y===39)await wait(48);}
  await hold(16,8);await tap(256);if(await read(0x117)&1)await fight();
  assert.deepEqual(formations.map(a=>a.filter(id=>id!==255)),[
    [34,34,39],[91,91,91,39],[34,34,39],[34,34,39,39],[91,91,91,91,91]
  ]);
  for(const[x,y]of[[30,6],[30,7]])await walk(x*16+8,y*16+7);
  for(let i=0;i<300&&await read(0x100,2)===212;i++)await hold(129,1);
  await wait(400);assert.equal(await read(0x100,2),213);assert.equal(await read(0x10000),52);
  await shot('ruins-east-arrival');return {formations,destination:213,story:52,firstAmbushDwellFrames};
}

