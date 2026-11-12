import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {put16} from '../engine/rom.js';
import {areas} from '../content/areas.js';
import {traverseWoodlandEncounter,demonstrateBriarRider} from '../tests/woodland-scene-controller.mjs';
import {seedFutureCheckpoint} from '../engine/future-checkpoints.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';

const requested=process.argv[2]??'all';
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){if(process.env[env])return path.resolve(process.env[env]);for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){const file=path.resolve(dir,name);try{await access(file);return file;}catch{}}throw Error('Missing '+name);}
const built=await build(),sha256=createHash('sha256').update(built.rom).digest('hex'),root=path.resolve('.local/qa/woodland-scenes-'+sha256.slice(0,12)),rom=path.join(root,'candidate.sfc');
await mkdir(root,{recursive:true});await writeCandidate(rom,built.rom);const host=await tool('RETRO_HOST','retro-host');
for(const coreName of requested==='all'?['snes9x','bsnes']:[requested]){
 const core=await tool(coreName==='snes9x'?'SNES9X_CORE':'BSNES_CORE',coreName+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,coreName);
 const report=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  for(const[frames,keys]of newGameSequence)await io.hold(keys,frames);
  assert.equal(await io.read(0x100,2),2);
  async function seed(fn){const before=Uint8Array.from(await io.bytes(0,0x20000)),after=before.slice();fn(after);for(let p=0;p<after.length;){if(after[p]===before[p]){p++;continue;}const start=p;while(p<after.length&&after[p]!==before[p])p++;await write(start,after.slice(start,p));}}
  await seed(ram=>{
   ram.fill(8,0x2830,0x2837);ram.fill(255,0x2837,0x283e);ram.fill(224,0x283e,0x284d);ram.fill(128,0x284d,0x285c);
   for(const id of[189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178]){let slot=ram.subarray(0x2400,0x2500).indexOf(id);if(slot<0)slot=ram.subarray(0x2400,0x2500).indexOf(0);assert.ok(slot>=0);ram[0x2400+slot]=id;ram[0x2500+slot]=20;}
   for(let id=0;id<7;id++){const p=0x2600+80*id;for(const o of[3,5])put16(ram,p+o,999);for(const o of[7,9])put16(ram,p+o,99);ram[p+0x12]=60;ram.set([65,60,12,60,60,50,60],p+0xb);ram.set([65,60,12,60,60,50,60],p+0x36);ram.set([id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163],p+0x27);ram.set([200,220,231,3],p+0x3d);}
   ram.set([0,1,2,3,4,5,6,128],0x2980);ram[0x29af]=254;
  });
  await request({op:'savestate',name:'kit'});const load=()=>request({op:'loadstate',file:path.join(out,'kit.state')});
  const jump=async(id,x,y,facing=1)=>{const map=id|facing<<9;await write(0x1238e,[0xe0,map&255,map>>8,x,y,0xb2]);await io.wait(500);assert.equal(await io.read(0x100,2),id);};
  const summary={sha256,core:coreName,fixture:'Diagnostic native location entry and level60 kit; ordinary controller input after entry. No fabricated formation, victory or actor coordinates.'};
  summary.encounters=[];
  for(const [key,loc,x,y]of[['forest-pots',19,36,44],['forest-beetles',19,39,22],['arris',215,23,10],['conveyor',232,0,0]]){
   await load();
   if(key==='conveyor'){await seed(ram=>seedFutureCheckpoint(ram,'factory-conveyor'));const a=areas.find(a=>a.futureScene==='factory-conveyor');await jump(a.id,a.x,a.y,a.facing??1);}
   else await jump(loc,x,y);
   summary.encounters.push(await traverseWoodlandEncounter(io,key));console.log(coreName+' '+key+' original battle and return passed');
  }
  await load();await jump(342,4,12);summary.rider=await demonstrateBriarRider(io);console.log(coreName+' original rider demonstration passed');
  return summary;
 });
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(coreName+' woodland scenes passed: '+sha256);
}
