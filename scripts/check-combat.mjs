import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,access,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {chooseNativeTech} from '../tests/battle-controller.mjs';
import {fartGraphics} from '../engine/swamp-spin-art.js';

const requested=process.argv[2]??'all';if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const p of['.local/tools/emu/','../secret-of-goku/.local/tools/emu/'])try{await access(p+name);return path.resolve(p+name);}catch{}
 throw Error('Set '+env+' to an installed '+name);
}
const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex'),rom=path.resolve('.local/qa/combat-music-tested.sfc');await mkdir('.local/qa',{recursive:true});await writeCandidate(rom,b.rom);
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const out=path.resolve('.local/qa/combat-music-'+name),host=await tool('RETRO_HOST','retro-host'),core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.dylib');
 const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  for(const[frames,buttons]of newGameSequence)await io.hold(buttons,frames);
  assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);await request({op:'savestate',name:'bedroom'});
  await write(0x1238e,[0xe0,1,0,8,8,0xb2]);await io.wait(400);assert.equal(await io.read(0x29ae),82);
  await request({op:'audio',reset:true});await io.wait(12000);const music=await request({op:'audio'});
  assert.equal(await io.read(0x29ae),82);assert.ok(music.nonzero>0);assert.equal(music.clipped,0);await io.shot('swamp-all-star');
  const casts=[];let bossMusic;
  for(const party of[[0,1,2],[1,0,2],[1,2,0]]){
   const slot=party.indexOf(0);await request({op:'loadstate',file:path.join(out,'bedroom.state')});
   await write(0x2980,[...party,3,4,5,6,128,128]);await write(0x29af,[254]);await write(0x10000,[0x5f]);await write(0x100f3,[0]);
   await write(0x2830,Array(7).fill(8));await write(0x2837,Array(7).fill(255));await write(0x283e,Array(15).fill(224));await write(0x284d,Array(15).fill(128));
   for(let id=0;id<7;id++){
    const p=0x2600+id*80;await write(p+3,[231,3,231,3,99,0,99,0]);await write(p+0xb,[65,60,12,60,60,50,60]);await write(p+0x12,[60]);
    await write(p+0x36,[65,60,12,60,60,50,60]);await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);await write(p+0x3d,[200,220,231,3]);
   }
   // Only diagnostic setup writes above and this native transition. The
   // authored guardian scene, battle, command menu and cast run unmodified.
   await write(0x1238e,[0xe0,151,0,8,13,0xb2]);await io.wait(420);await io.hold(16,75);await io.wait(90);
   await request({op:'until',mem:'wram',addr:0xaf08,value:151,frames:15000,buttons:'a',every:93,hold:3});await io.wait(400);
   if(slot===0){
    await request({op:'savestate',name:'guardian-music-start'});await request({op:'audio',reset:true});
    await io.wait(2400);bossMusic=await request({op:'audio'});assert.equal(await io.read(0x29ae),81);
    assert.ok(bossMusic.nonzero>0);assert.equal(bossMusic.clipped,0);await io.shot('guardian-music-loop');
    await request({op:'loadstate',file:path.join(out,'guardian-music-start.state')});
   }
   assert.equal(await io.read(0x29ae),81);assert.equal(await io.read(0x95db),0);if(await io.read(0x9609))await io.tap(1,12);
   for(let n=0;n<100&&await io.read(0x95d5)>2;n++)await io.wait(20);
   const mp=await io.read(0x5e34+slot*128,2);await request({op:'savestate',name:'fart-slot-'+slot+'-ready'});
   await chooseNativeTech({...io,tap:(key,gap=12)=>io.tap(key,gap)},b.rom,slot,1);await request({op:'audio',reset:true});
   const frames=[];let gas=false;
   for(let f=0;f<360;f++){
    await io.wait(1);frames.push(await io.read(0x9907+slot));
    if(f===108){await io.shot('fart-slot-'+slot);if(name==='snes9x'){const r=await request({op:'read',mem:'vram',addr:0x1800,len:2048});gas=r.value.every((v,i)=>v===fartGraphics().tiles[i]);}}
   }
   const cadence=[129,131,128,128,130,129,131,131,128,130,129,129,131,128,130,130];
   assert.ok(frames.some((_,i)=>i+32<=frames.length&&Array.from({length:32},(_,j)=>frames[i+j]===cadence[j%16]).every(Boolean)),name+' triple rotation in slot '+slot);
   if(name==='snes9x')assert.ok(gas,'native effect VRAM matches original gas artwork');
   assert.equal(await io.read(0x5e34+slot*128,2),mp-1);const audio=await request({op:'audio'});assert.equal(audio.clipped,0);assert.ok(audio.nonzero>0);
   casts.push({party,slot,gasVramChecked:gas,audio});
  }
  return{sha256,music,bossMusic,casts};
 });
 await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2));console.log(name,sha256,result.frames,'frames: full swamp and boss music loops and three native Fart casts passed');
}
