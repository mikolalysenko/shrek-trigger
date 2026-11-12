import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {put16} from '../engine/rom.js';
import {seedCourtSwampCheckpoint} from '../engine/court-swamp-checkpoints.js';
import {seedTrialCheckpoint} from '../engine/trial-checkpoints.js';
import {courtSwampRoutes as checkpoints,traverseCourtSwampScene} from '../tests/court-swamp-controller.mjs';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';

const requested=process.argv[2]??'all',section=process.argv.find(s=>s.startsWith('--section='))?.slice(10)??'all';
if(!['all','snes9x','bsnes'].includes(requested)||section!=='all'&&!checkpoints[section])throw Error('Choose core all/snes9x/bsnes and --section=all or a court/swamp checkpoint');
async function tool(env,name){if(process.env[env])return path.resolve(process.env[env]);for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){const file=path.resolve(dir,name);try{await access(file);return file;}catch{}}throw Error('Missing '+name);}
const built=await build(),sha256=createHash('sha256').update(built.rom).digest('hex'),root=path.resolve('.local/qa/court-swamp-scenes-'+sha256.slice(0,12)),rom=path.join(root,'candidate.sfc');
await mkdir(root,{recursive:true});await writeCandidate(rom,built.rom);const host=await tool('RETRO_HOST','retro-host');
const streams=Object.fromEntries(built.audit.resources.npcGraphicsStreaming.streams.map(s=>[s.gfx,s.address]));
for(const coreName of requested==='all'?['snes9x','bsnes']:[requested]){
 const core=await tool(coreName==='snes9x'?'SNES9X_CORE':'BSNES_CORE',coreName+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,coreName+(section==='all'?'':'-'+section));
 const report=await withIndependentController({host,core,rom,out},async({request,write,controller:rawIo})=>{
  const io={...rawIo,tap:(key=256,gap=100)=>rawIo.tap(key,gap)};
  for(const[frames,keys]of newGameSequence)await io.hold(keys,frames);
  assert.equal(await io.read(0x100,2),2);
  async function seed(fn){const before=Uint8Array.from(await io.bytes(0,0x20000)),after=before.slice();fn(after);for(let p=0;p<after.length;){if(after[p]===before[p]){p++;continue;}const start=p;while(p<after.length&&after[p]!==before[p])p++;await write(start,after.slice(start,p));}}
  await seed(ram=>{
   ram.fill(8,0x2830,0x2837);ram.fill(255,0x2837,0x283e);ram.fill(224,0x283e,0x284d);ram.fill(128,0x284d,0x285c);
   for(const id of[189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178]){let slot=ram.subarray(0x2400,0x2500).indexOf(id);if(slot<0)slot=ram.subarray(0x2400,0x2500).indexOf(0);assert.ok(slot>=0);ram[0x2400+slot]=id;ram[0x2500+slot]=20;}
   for(let id=0;id<7;id++){const p=0x2600+80*id;for(const o of[3,5])put16(ram,p+o,999);for(const o of[7,9])put16(ram,p+o,99);ram[p+0x12]=60;ram.set([65,60,12,60,60,50,60],p+0xb);ram.set([65,60,12,60,60,50,60],p+0x36);ram.set([id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163],p+0x27);ram.set([200,220,231,3],p+0x3d);}
   ram.set([0,1,2,3,4,5,6,128],0x2980);ram[0x29af]=254;
  });
  await request({op:'savestate',name:'kit'});const scenes=[];
  for(const key of section==='all'?Object.keys(checkpoints):[section]){
   if(process.argv.includes('--resume')){
    let prior;try{prior=JSON.parse(await readFile(path.join(out,key+'.json')));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(prior){assert.equal(prior.sha256,sha256);assert.equal(prior.core,coreName);assert.equal(prior.key,key);scenes.push(prior);console.log(coreName+' '+key+' retains completed proof for this exact ROM');continue;}
   }
   await request({op:'loadstate',file:path.join(out,'kit.state')});
   const cfg=checkpoints[key];await seed(ram=>cfg.trialScene?seedTrialCheckpoint(ram,cfg.trialScene):seedCourtSwampCheckpoint(ram,key));const map=cfg.location|(cfg.facing??1)<<9;
   await write(0x1238e,[0xe0,map&255,map>>8,cfg.x,cfg.y,0xb2]);await io.wait(cfg.entryFrames);assert.equal(await io.read(0x100,2),cfg.location);
   let result;try{result=await traverseCourtSwampScene(io,built.rom,key,{streams});}catch(error){await io.shot(key+'-failure');await writeFile(path.join(out,key+'-failure.json'),JSON.stringify({sha256,core:coreName,key,error:String(error),location:await io.read(0x100,2),control:await io.read(0x11f),story:await io.read(0x10000),battle:await io.read(0x117),partyObject:await io.read(0x197,2),state:Array.from(await io.bytes(0x1800,0x100)),local:Array.from(await io.bytes(0x10200,128)),objectPCs:Array.from(await io.bytes(0x1180,128)),formation:Array.from(await io.bytes(0xaf02,8))},null,2)+'\n');throw error;}
   scenes.push(result);await writeFile(path.join(out,key+'.json'),JSON.stringify({sha256,core:coreName,...result},null,2)+'\n');console.log(coreName+' '+key+' native scene and continuation passed');
  }
  return {sha256,core:coreName,section,scenes,setup:'Shared reversible checkpoint, level60 diagnostic kit; ordinary controller input only after original location entry.'};
 });
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(coreName+' court/swamp scenes passed: '+sha256);
}
