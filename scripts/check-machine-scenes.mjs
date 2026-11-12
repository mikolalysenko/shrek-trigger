import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {u16,put16} from '../engine/rom.js';
import {seedTrialCheckpoint} from '../engine/trial-checkpoints.js';
import {seedFutureCheckpoint} from '../engine/future-checkpoints.js';
import {areas} from '../content/areas.js';
import {dulocTank} from '../content/duloc-tank.js';
import {nativeSpriteBank} from './native-sprite-view.mjs';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {checkIndependentRacing} from './independent-racing.mjs';
import {attackNativeEnemy} from '../tests/battle-controller.mjs';

// The same native events and controller drivers used by the game. Writes
// prepare reversible checkpoints; the final-battle branch fixtures also set
// a death boundary and keep the party alive, as documented in the report.
const requested=process.argv[2]??'all',section=process.argv.find(a=>a.startsWith('--section='))?.split('=')[1]??'all';
if(!['all','snes9x','bsnes'].includes(requested)||!['all','tank','rats','factory','finale','future'].includes(section))throw Error('Usage: check-machine-scenes.mjs [all|snes9x|bsnes] [--section=all|tank|rats|factory|finale|future] [--rom=path]');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){const file=path.resolve(dir,name);try{await access(file);return file;}catch{}}
 throw Error('Set '+env+' to an installed '+name);
}
const built=await build(),romArgument=process.argv.find(a=>a.startsWith('--rom='))?.slice(6);
if(romArgument)built.rom=new Uint8Array(await readFile(path.resolve(romArgument)));
const sha256=createHash('sha256').update(built.rom).digest('hex'),root=path.resolve('.local/qa/machine-scenes-'+sha256.slice(0,12)),host=await tool('RETRO_HOST','retro-host');
await mkdir(root,{recursive:true});const rom=path.join(root,'candidate.sfc');await writeCandidate(rom,built.rom);
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,name+'-'+section);
 const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  for(const[frames,input]of newGameSequence)await io.hold(input,frames);
  assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);
  async function seed(fn){
   const before=Uint8Array.from(await io.bytes(0,0x20000)),after=before.slice();fn(after);
   for(let p=0;p<after.length;){if(before[p]===after[p]){p++;continue;}const start=p;while(p<after.length&&before[p]!==after[p])p++;await write(start,after.slice(start,p));}
  }
  await seed(ram=>{
   ram.fill(8,0x2830,0x2837);ram.fill(255,0x2837,0x283e);ram.fill(224,0x283e,0x284d);ram.fill(128,0x284d,0x285c);
   for(const id of[189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178]){
    let slot=ram.subarray(0x2400,0x2500).indexOf(id);if(slot<0)slot=ram.subarray(0x2400,0x2500).indexOf(0);assert.ok(slot>=0);ram[0x2400+slot]=id;ram[0x2500+slot]=20;
   }
   for(let id=0;id<7;id++){const p=0x2600+id*80;for(const o of[3,5])put16(ram,p+o,999);for(const o of[7,9])put16(ram,p+o,99);ram[p+0x12]=60;ram.set([65,60,12,60,60,50,60],p+0xb);ram.set([65,60,12,60,60,50,60],p+0x36);ram.set([id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163],p+0x27);ram.set([200,220,231,3],p+0x3d);}
  });
  await request({op:'savestate',name:'kit'});
  const load=label=>request({op:'loadstate',file:path.join(out,label+'.state')});
  const until=async(addr,value,frames=15000,options={})=>{const r=await request({op:'until',mem:'wram',addr,size:1,value,frames,...options});assert.ok(r.met,'Native condition '+addr.toString(16)+'='+value+': '+JSON.stringify(r));return r;};
  const jump=async a=>{const id=a.id|((a.facing??1)<<9);await write(0x1238e,[0xe0,id&255,id>>8,a.x,a.y,0xb2]);await io.wait(400);assert.equal(await io.read(0x100,2),a.id);};
  const summary={sha256,core:name,section};
  if(section==='all'||section==='tank'){
   // A size3 body reserves its fixed tiles during original scene init.
   // Verify it there, rather than changing an already loaded small NPC into
   // a size3 actor after the location has assigned its reservations.
   await load('kit');await seed(ram=>seedTrialCheckpoint(ram,'prison-tank'));await jump(areas.find(a=>a.trialScene==='prison-tank'));
   const bank=nativeSpriteBank(built.rom,dulocTank[0]),expected=[];
   for(let i=0;i<96;i++){const word=u16(bank.assembly,i*2);for(let value of bank.graphics.slice((word&1023)*32,(word&1023)*32+32)){if(word&0x4000){value=(value>>1&85)|(value&85)<<1;value=(value>>2&51)|(value&51)<<2;value=value>>4|(value&15)<<4;}expected.push(value);}}
   const heapBytes=(await io.read(0x171,2))-0x8000;assert.ok(heapBytes>0&&heapBytes<=32768);
   const tile=await io.read(0xd1a,2);assert.equal(tile,64);await io.shot('tank-chassis');
   if(name==='snes9x')assert.deepEqual((await request({op:'read',mem:'vram',addr:tile*32,len:3072})).value,expected);
   await io.hold(64,20);await until(0x12a,39,15000,{buttons:'a',every:103,hold:3});await io.wait(180);await io.tap();await io.hold(64,200);
   await until(0xaf02,147,15000,{buttons:'a',every:103,hold:3});await io.wait(240);
   assert.equal(await io.read(0xaf08),173);assert.equal(await io.read(0xaf09),148);await io.shot('tank-battle');
   await until(0x1021a,1,20000,{buttons:'a',every:103,hold:3});assert.ok((await io.read(0x10199))&4);assert.equal(await io.read(0x10000),46);await io.shot('tank-collapse');
   summary.tank={frames:8,chassisUploadChecked:name==='snes9x',heapBytes,targets:[147,173,148],nativeCollapse:true};console.log(name+' tank passed');
  }
  async function future(key,fn){await load('kit');await seed(ram=>{seedFutureCheckpoint(ram,key);fn?.(ram);});await jump(areas.find(a=>a.futureScene===key));}
  if(section==='all'||section==='rats'){
   summary.theft=[];
   for(const[onions,gold,line]of[[3,1000,79],[1,1000,79],[0,1000,78],[0,500,78],[0,499,0],[0,0,0]]){
    await future('future-scavengers',ram=>{for(let i=0;i<256;i++)if(ram[0x2400+i]===189){ram[0x2400+i]=0;ram[0x2500+i]=0;}ram[0x2400]=onions?189:0;ram[0x2500]=onions;ram.set([gold&255,gold>>8,0],0x2c53);ram[0x12a]=0;});
    await io.hold(145,11);await io.hold(129,8);await io.hold(161,16);await io.wait(600);
    assert.equal(await io.read(0x2500),Math.max(0,onions-1));assert.equal(await io.read(0x2c53,3),gold-(!onions&&gold>=500?500:0));assert.equal(await io.read(0x12a),line);summary.theft.push({onions,gold,line});
   }
   await future('future-rat');await io.hold(33,18);await until(0x100ec,49,1500,{buttons:'a',every:24,hold:3});
   for(const[addr,cmp,value,buttons]of[[0x1882,'ge',133,'down b'],[0x1802,'le',73,'left b'],[0x1882,'ge',325,'down b'],[0x1802,'ge',407,'right b'],[0x1882,'ge',517,'down b'],[0x1802,'le',313,'left b'],[0x1882,'ge',693,'down b']])await until(addr,value*16,1600,{size:2,cmp,buttons,every:1,hold:1});
   for(let i=0;i<80;i++){await io.hold(321,2);await io.hold(65,2);}await until(0x100ec,97,3000,{buttons:'a',every:103,hold:3});await io.shot('rat-password');summary.password=97;console.log(name+' theft and password chase passed');
  }
  if(section==='all'||section==='factory'){
   await future('factory-lab');
   const heapBytes=(await io.read(0x171,2))-0x8000;assert.ok(heapBytes>0&&heapBytes<=32768);
   await io.shot('residue-factory-arrival');await io.hold(16,36);
   await until(0x117,1,20000,{buttons:'a',every:132,hold:12});await io.wait(180);
   // The original lab selects the acid/alkali mix through native RNG.
   const targets=(await io.bytes(0xaf02,8)).filter(id=>id!==255);assert.equal(targets.length,5);assert.ok(targets.every(id=>[105,106].includes(id)));await io.shot('residue-factory-battle');
   for(let i=0;i<170&&((await io.read(0x117)&1)||await io.read(0x11f)!==1);i++)await io.tap(256,120);
   assert.equal(await io.read(0x117)&1,0);assert.equal(await io.read(0x11f),1);assert.equal(await io.read(0x10058),101);assert.equal(await io.read(0x10000),60);assert.equal(await io.read(0x100,2),230);await io.shot('residue-factory-cleared');
   summary.factory={heapBytes,targets,terminal:101,story:60,nativeVictory:true,fixture:'Original factory checkpoint and strong loadout; controller input only after entry.'};console.log(name+' factory residue ambush passed');
  }
  if(section==='all'||section==='finale'){
   await load('kit');await write(0x2980,[0,1,2,3,4,5,6,128,128]);await write(0x29af,[254]);await jump({id:479,x:7,y:10});await until(0xaf02,206);await io.wait(180);await request({op:'savestate',name:'final-start'});
   await until(0x990a,24,5000);await io.wait(120);assert.equal(await io.read(0x990a),24);await io.shot('final-windup');await until(0xaeff,255,6000);assert.equal(await io.read(0x5e30,2),0);await io.wait(100);
   // An ordinary item-menu revival after the real uppercut.
   for(const slot of[1,2])await write(0x5e30+slot*128,[231,3]);
   for(const key of[32,32,256])await io.tap(key,10);await io.wait(30);for(let i=0;i<10;i++)await io.tap(32,10);await io.tap(256,10);await io.tap(256,10);
   await until(0xaeff,0,1500);assert.equal(await io.read(0x5e30,2),50);await io.shot('final-revived');
   const branches=[];
   for(const victim of[7,3,9]){
    await load('final-start');await io.wait(1000);await write(0x5e30+victim*128,[1,0]);await attackNativeEnemy({...io,tap:(key,gap=12)=>io.tap(key,gap)},await io.read(0xaeff+victim),{targetSlot:victim});
    let dead=false,exposed=false,rebuilt=false,win=false,coreDefeated=false;
    for(let n=0;n<5000;n++){
     await io.wait(1);const hp=await io.read(0x5e30+victim*128,2),id=await io.read(0xaeff+victim);
     if(victim===9&&!coreDefeated&&hp===0){coreDefeated=true;assert.ok(await io.read(0x5e30+3*128,2));}
     // bsnes exposes WRAM through serialized states. Repeatedly restoring
     // those states during the post-battle SPC upload can interrupt its
     // acknowledgement handshake. The death boundary ends all HP assists;
     // the native defeat animation and ending must then finish unaided.
     if(!coreDefeated&&!dead&&id!==255&&hp>1)await write(0x5e30+victim*128,[1,0]);
     for(let slot=0;!coreDefeated&&slot<3;slot++)if(await io.read(0xaeff+slot)!==255)await write(0x5e30+slot*128,[231,3]);
     if(!dead&&id===255)dead=true;
     if(dead&&victim!==9&&await io.read(0x62eb)===127)exposed=true;
     if(dead&&victim!==9&&id!==255&&hp>0){rebuilt=true;break;}
     if(await io.read(0x100,2)!==479){win=true;break;}
    }
    if(victim===9&&!win){
     await io.shot('final-core-wait');await request({op:'savestate',name:'final-core-wait'});
     const state={victim,dead,coreDefeated,win,location:await io.read(0x100,2),ids:await io.bytes(0xaeff,11),hp:[]};
     for(let slot=0;slot<11;slot++)state.hp.push(await io.read(0x5e30+slot*128,2));state.battle=await io.read(0x117);state.event=await io.read(0x0e6);state.phase=await io.read(0x5fe4);
     await writeFile(path.join(out,'final-core-wait.json'),JSON.stringify(state,null,2));
    }
    assert.ok(dead,'Native target death '+victim);if(victim===9){assert.ok(coreDefeated&&win,'Core defeat must reach the native ending');assert.equal(await io.read(0x100,2),82);}else assert.ok(exposed&&rebuilt,'Native exposure and rebuild '+victim);
    await io.shot('final-branch-'+victim);branches.push({victim,dead,exposed,rebuilt,win,coreDefeated});
   }
   summary.finale={windup:true,uppercut:true,itemRevival:true,branches,fixture:'One-HP targets and live-party HP assists during branch tests, ending at core death. No writes during final defeat or the ending transition; native menus, attacks, KO, exposure and rebuild are unmodified.'};console.log(name+' final battle branches passed');
  }
  return summary;
 });
 if(section==='all'||section==='future')result.future=await checkIndependentRacing({host,core,rom,out:path.join(out,'future'),built,name,checkpoint:path.join(out,'kit.state')});
 await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(name+' '+section+' scene checks passed: '+sha256);
}
