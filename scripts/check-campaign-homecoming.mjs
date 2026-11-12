import path from 'node:path';
import {access,mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {runCampaignMedieval} from '../tests/campaign-medieval-controller.mjs';
import {runCathedralLeg} from '../tests/campaign-cathedral-controller.mjs';
import {runHomecomingLeg} from '../tests/campaign-homecoming-controller.mjs';

const requested=process.argv[2]??'all';
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../../../secret-of-goku/.local/tools/emu']){
  const file=path.resolve(dir,name);try{await access(file);return file;}catch{}
 }
 throw Error('Set '+env+' to an installed '+name);
}
const built=process.env.CAMPAIGN_ROM?{rom:await readFile(path.resolve(process.env.CAMPAIGN_ROM))}:await build(),sha256=createHash('sha256').update(built.rom).digest('hex');
const root=path.resolve('.local/qa/campaign-homecoming-'+sha256.slice(0,12)),rom=path.join(root,'candidate.sfc');
await mkdir(root,{recursive:true});await writeCandidate(rom,built.rom);
const host=await tool('RETRO_HOST','retro-host'),reports=[];
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,name);
 const report=await withIndependentController({host,core,rom,out},async({controller:io})=>{
  const evidence={core:name,status:'running',stages:[],freshSave:true,inputOnly:true,
   noWriteScope:{wramWrites:0,romWrites:0,cpuWrites:0,savestates:0,diagnosticJumps:0,statInventoryOrFlagWrites:0}};
  try{
   evidence.medieval={stages:[]};await runCampaignMedieval(io,evidence.medieval,built.rom);
   evidence.cathedral={stages:[]};await runCathedralLeg(io,evidence.cathedral,built.rom);
   await runHomecomingLeg(io,evidence,built.rom);evidence.status='passed';evidence.complete=false;
  }catch(error){
   evidence.status='blocked';evidence.error=error.message;evidence.errorStack=error.stack;evidence.complete=false;
   evidence.final={location:await io.read(0x100,2),story:await io.read(0x10000),line:await io.read(0x12a),box:await io.read(0x126),playable:await io.read(0x11f),eventFlags:await io.read(0x100ff),party:Array.from(await io.bytes(0x2980,3)),position:await(async()=>{const n=await io.read(0x197,2);return{x:await io.read(0x1800+n,2)/16,y:await io.read(0x1880+n,2)/16};})()};
   await io.shot('campaign-homecoming-blocker');
  }
  return evidence;
 });
 reports.push(report);await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(name+': '+report.status+(report.error?' — '+report.error:''));
}
const result={sha256,scope:'Fresh-save continuation through the medieval and cathedral routes, then home through the forest, canyon and gate (story 39), a Duloc market restock, the arrest, trial and cell, Donkey’s rescue (story 46) and the prison climb, the Duloc Tank at normal level, the castle escape with Fiona (story 48) and the forest gate to the future (location 208, story 51). Later chapters are not claimed.',reports};
await writeFile(path.join(root,'report.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({sha256,report:path.join(root,'report.json'),cores:reports.map(r=>({core:r.core,status:r.status,final:r.final??r.stages.at(-1),frames:r.frames}))},null,2));
if(reports.some(r=>r.status!=='passed'))process.exitCode=1;
