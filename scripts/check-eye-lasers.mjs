import path from 'node:path';
import assert from 'node:assert/strict';
import {writeFile,access,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {chooseNativeTech} from '../tests/battle-controller.mjs';
import {eyeLaserGraphics} from '../engine/eye-lasers-art.js';

const requested=process.argv[2]??'all';
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of ['.local/tools/emu','../secret-of-goku/.local/tools/emu']){
  const p=path.resolve(dir,name);try{await access(p);return p;}catch{}
 }
 throw Error('Set '+env+' to an installed '+name);
}
const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex'),root=path.resolve('.local/qa/eye-lasers-'+sha256.slice(0,12));
await mkdir(root,{recursive:true});const rom=path.join(root,'shrek-trigger.sfc');await writeCandidate(rom,b.rom);
const host=await tool('RETRO_HOST','retro-host'),graphics=eyeLaserGraphics();
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const out=path.join(root,name),core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.dylib');
 const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  for(const[frames,buttons]of newGameSequence)await io.hold(buttons,frames);
  assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);
  await request({op:'savestate',name:'bedroom'});const casts=[];
  for(const party of[[0,1,2],[1,0,2],[1,2,0]]){
   await request({op:'loadstate',file:path.join(out,'bedroom.state')});const slot=party.indexOf(0);
   await write(0x2980,[...party,3,4,5,6,128,128]);await write(0x29af,[254]);
   await write(0x10000,[0x5f]);await write(0x100f3,[0]);
   await write(0x2830,Array(7).fill(8));await write(0x2837,Array(7).fill(255));await write(0x283e,Array(15).fill(224));await write(0x284d,Array(15).fill(128));
   for(let id=0;id<7;id++){
    const p=0x2600+id*80;
    await write(p+3,[231,3,231,3,99,0,99,0]);await write(p+0xb,[65,60,12,60,60,50,60]);await write(p+0x12,[60]);
    await write(p+0x36,[65,60,12,60,60,50,60]);await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);await write(p+0x3d,[200,220,231,3]);
   }
   // Setup ends at the ordinary native transition. The authored clown
   // encounter, menus, animation, target selection and damage run in ROM.
   await write(0x1238e,[0xe0,151,0,8,13,0xb2]);await io.wait(420);await io.hold(16,75);await io.wait(90);
   await request({op:'until',mem:'wram',addr:0xaf08,value:151,frames:15000,buttons:'a',every:93,hold:3});await io.wait(400);
   assert.equal(await io.read(0x95db),0);if(await io.read(0x9609))await io.tap(1,12);
   for(let n=0;n<100&&await io.read(0x95d5)>2;n++)await io.wait(20);
   const mp=await io.read(0x5e34+slot*128,2),hp=[];
   for(let n=3;n<11;n++)hp.push(await io.read(0x5e30+n*128,2));
   await chooseNativeTech({...io,tap:(key,gap=12)=>io.tap(key,gap)},b.rom,slot,2);
   let cast=false,flames=false,tiles=false,frame=-1;
   for(let f=0;f<500;f++){
    await io.wait(1);
    if(await io.read(0xae91)===slot&&await io.read(0xae92)===2&&await io.read(0xae93)===2){
     cast=true;frame++;
     const effect=await io.read(0xa2c5),bindings=await io.bytes(0xa419,8);
     flames ||= effect>=5&&effect<=8&&bindings.some(v=>(v&7)===5);
     if(frame===68){
      await io.shot('eye-lasers-slot-'+slot);
      if(name==='snes9x'){
       const vram=(await request({op:'read',mem:'vram',addr:0x1800,len:4096})).value;
       assert.deepEqual(vram,Array.from(graphics.tiles),'exact paired-beam and flame tiles');tiles=true;
      }
     }
    }
   }
   assert.ok(cast,'real native Eye Lasers dispatch');assert.ok(flames,'native target flame flashes');
   assert.equal(await io.read(0x5e34+slot*128,2),mp-1,'source cost with Gold Stud');
   const damage=[];for(let n=3;n<11;n++){const after=await io.read(0x5e30+n*128,2);if(after<hp[n-3])damage.push({target:n,value:hp[n-3]-after});}
   assert.ok(damage.length>0,'native damage reaches an enemy');
   assert.equal(await io.read(0x117)&1,1,'battle remains playable');
   casts.push({party,slot,cast,flames,tiles,damage});
  }
  return{sha256,casts};
 });
 await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2));
 console.log(name,sha256,result.frames,'frames: native Eye Lasers casts in every party position passed');
}
