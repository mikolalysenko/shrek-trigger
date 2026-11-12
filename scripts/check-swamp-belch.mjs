import path from 'node:path';
import assert from 'node:assert/strict';
import {writeFile,access,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {chooseNativeTech} from '../tests/battle-controller.mjs';
import {swampBelchGraphics} from '../engine/swamp-belch-art.js';

const requested=process.argv[2]??'all';
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){const p=path.resolve(dir,name);try{await access(p);return p;}catch{}}
 throw Error('Set '+env+' to an installed '+name);
}
const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex'),root=path.resolve('.local/qa/swamp-belch-'+sha256.slice(0,12));
await mkdir(root,{recursive:true});const rom=path.join(root,'shrek-trigger.sfc');await writeCandidate(rom,b.rom);
const host=await tool('RETRO_HOST','retro-host'),graphics=swampBelchGraphics(),reports=[];
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const out=path.join(root,name),core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.dylib');
 const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  for(const[frames,buttons]of newGameSequence)await io.hold(buttons,frames);
  assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);
  await request({op:'savestate',name:'bedroom'});const casts=[];
  for(const party of[[0,1,2],[1,0,2],[1,2,0]]){
   await request({op:'loadstate',file:path.join(out,'bedroom.state')});const slot=party.indexOf(0);
   await write(0x2980,[...party,3,4,5,6,128,128]);await write(0x29af,[254]);await write(0x10000,[0x5f]);await write(0x100f3,[0]);
   await write(0x2830,Array(7).fill(8));await write(0x2837,Array(7).fill(255));await write(0x283e,Array(15).fill(224));await write(0x284d,Array(15).fill(128));
   for(let id=0;id<7;id++){
    // Native stat order: power, stamina, speed, magic, hit, evade, magic defense.
    // Low Shrek magic leaves the first clown phase alive for the next-tech check.
    const p=0x2600+id*80,stats=[65,60,12,id===0?3:60,60,50,60];
    await write(p+3,[231,3,231,3,99,0,99,0]);await write(p+0xb,stats);await write(p+0x12,[id===0?10:60]);await write(p+0x36,stats);
    await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);await write(p+0x3d,[200,220,231,3]);
   }
   // Setup ends here. The original two-clown encounter, controller-selected
   // tech, both damage targets, gas animation and following turn run in ROM.
   await write(0x1238e,[0xe0,151,0,8,13,0xb2]);await io.wait(420);await io.hold(16,75);await io.wait(90);
   await request({op:'until',mem:'wram',addr:0xaf08,value:151,frames:15000,buttons:'a',every:93,hold:3});await io.wait(400);
   assert.equal(await io.read(0x95db),0);if(await io.read(0x9609))await io.tap(1,12);
   for(let n=0;n<100&&await io.read(0x95d5)>2;n++)await io.wait(20);
   const mp=await io.read(0x5e34+slot*128,2),hp=[];for(let n=3;n<11;n++)hp.push(await io.read(0x5e30+n*128,2));
   await chooseNativeTech(io,b.rom,slot,8);
   let cast=false,cloud=false,tiles=false,palette=false,restored=false,frame=-1;
   for(let f=0;f<1800;f++){
    await io.wait(1);
    if(await io.read(0xae91)===slot&&await io.read(0xae92)===2&&await io.read(0xae93)===8){
     cast=true;frame++;
     if(frame===240){
      assert.equal(await io.read(0xbe92),0x44);assert.equal(await io.read(0xbe99),9);cloud=true;
      await io.shot('swamp-belch-slot-'+slot);
      for(let i=0;i<3;i++)assert.equal(await io.read(0x2032+i*2,2),graphics.palette[i]);palette=true;
      if(name==='snes9x'){assert.deepEqual((await request({op:'read',mem:'vram',addr:0xa000,len:4096})).value,Array.from(graphics.graphics));tiles=true;}
     }
    }
    if(cloud&&await io.read(0xcca2,2)===0&&await io.read(0xcfff)===0){restored=true;await io.wait(180);break;}
   }
   assert.ok(cast&&cloud&&palette&&restored,'native generated gas presentation and cleanup');assert.equal(await io.read(0x5e34+slot*128,2),mp-5);
   const damage=[];for(let n=3;n<11;n++){const after=await io.read(0x5e30+n*128,2);if(after<hp[n-3])damage.push({target:n,value:hp[n-3]-after});}
   // Cleanup was observed at the boundary above. Another enemy can already
   // own the shared renderer during this post-cast wait.
   assert.equal(damage.length,2,'both original enemy targets receive native damage');assert.equal(await io.read(0x117)&1,1);
   await request({op:'savestate',name:'after-belch-slot-'+slot});
   assert.ok((await io.bytes(0xaf02,8)).some(v=>v!==255),'clown phase must remain active for the following-tech check');
   // A subsequent ordinary tech must reuse the renderer after gas cleanup.
   for(let n=0;n<180&&await io.read(0x95d5)!==slot;n++){if(await io.read(0x95d5)<3)await io.tap(64,12);await io.wait(24);}
   if(await io.read(0x95d5)!==slot){
    const state={slot,menu:await io.bytes(0x95d5,64),action:await io.bytes(0xae90,16),signals:await io.bytes(0x5d80,48),hp:[],enemies:await io.bytes(0xaf02,8),bg:await io.bytes(0xca32,32)};
    for(let n=0;n<11;n++)state.hp.push(await io.read(0x5e30+n*128,2));
    await io.shot('after-belch-not-ready-slot-'+slot);await writeFile(path.join(out,'not-ready.json'),JSON.stringify(state,null,2));
   }
   assert.equal(await io.read(0x95d5),slot,'caster becomes ready for another ordinary turn');
   const beforeFollowup=[];for(let n=3;n<11;n++)beforeFollowup.push(await io.read(0x5e30+n*128,2));
   await chooseNativeTech(io,b.rom,slot,2);let nextCast=false,nextFlames=false,nextFrame=-1;
   for(let f=0;f<1000;f++){
    await io.wait(1);
    if(await io.read(0xae91)===slot&&await io.read(0xae92)===2&&await io.read(0xae93)===2){
     nextCast=true;nextFrame++;const effect=await io.read(0xa2c5),bindings=await io.bytes(0xa419,8);
     nextFlames ||= effect>=5&&effect<=8&&bindings.some(v=>(v&7)===5);
     if(nextFrame===68)await io.shot('following-eye-lasers-slot-'+slot);
    }
    if(nextCast&&nextFlames&&f>=600)break;
   }
   let nextDamage=false;for(let n=3;n<11;n++)nextDamage ||= await io.read(0x5e30+n*128,2)<beforeFollowup[n-3];
   assert.ok(nextCast&&nextFlames&&nextDamage,'following Eye Lasers dispatch, target flames and damage');
   assert.equal(await io.read(0x5e34+slot*128,2),mp-6);assert.equal(await io.read(0x117)&1,1);
   casts.push({party,slot,cast,cloud,tiles,palette,damage,sourceMp:5,subsequentEyeLasers:{cast:nextCast,flames:nextFlames,damage:nextDamage},cleanup:true});
  }
  return{sha256,casts};
 });
 await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2));reports.push({core:name,...result});console.log(name,sha256,result.frames,'frames: native Swamp Belch and following Eye Lasers passed in every party position');
}
await writeFile(path.join(root,'report.json'),JSON.stringify({sha256,reports},null,2));
