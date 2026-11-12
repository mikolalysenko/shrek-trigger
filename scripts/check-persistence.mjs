import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {reachOpeningOverworld,saveNativeSlot,loadNativeSlot,openNativeSave} from '../tests/opening-controller.mjs';

const requested=process.argv[2]??'all';if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){const p=path.resolve(dir,name);try{await access(p);return p;}catch{}}
 throw Error('Set '+env+' to an installed '+name);
}
const built=await build(),sha256=createHash('sha256').update(built.rom).digest('hex'),root=path.resolve('.local/qa/persistence-'+sha256.slice(0,12)),rom=path.join(root,'shrek-trigger.sfc');
await mkdir(root,{recursive:true});await writeCandidate(rom,built.rom);
const host=await tool('RETRO_HOST','retro-host'),reports=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const payload=(sram,slot)=>sram.subarray(0x200+slot*0xa00,0x200+slot*0xa00+0x9e0);
async function projection(io){
 const ranges={story:[0x10000,0x200],inventory:[0x2400,0x200],characters:[0x2600,0x230],techniques:[0x2830,0x2c],dragon:[0x290,0x10],party:[0x2980,9],roster:[0x29af,1],identity:[0x2c23,0x33]};
 const out={location:await io.read(0x100,2)};for(const[name,[address,length]]of Object.entries(ranges))out[name]=Array.from(await io.bytes(address,length));return out;
}
function assertProjection(actual,expected,label){
 const ranges={story:0x10000,inventory:0x2400,characters:0x2600,techniques:0x2830,dragon:0x290,party:0x2980,roster:0x29af,identity:0x2c23},differences=[];
 assert.equal(actual.location,expected.location,label+' location');
 for(const[name,address]of Object.entries(ranges))for(let i=0;i<expected[name].length;i++)if(actual[name][i]!==expected[name][i])differences.push({name,address:address+i,before:expected[name][i],after:actual[name][i]});
 assert.deepEqual(differences,[],label+' persistent differences '+JSON.stringify(differences.slice(0,40)));
}
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const out=path.join(root,name),core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.dylib');
 const report=await withIndependentController({host,core,rom,out},async({request,controller:io})=>{
  await reachOpeningOverworld(io);const expected=await projection(io),slots=[],srams=[];
  for(let slot=0;slot<3;slot++){
   await saveNativeSlot(io,slot);const file=(await request({op:'dump',name:`slot-${slot+1}-saved`,mem:'sram',addr:0,len:8192,format:'bin'})).file,sram=await readFile(file);srams.push(sram);
   const changed=payload(sram,slot).filter((v,i)=>v!==payload(srams[0],slot)[i]).length;
   if(slot>0)assert.ok(payload(sram,slot).some((v,i)=>v!==payload(srams[slot-1],slot)[i]),`slot ${slot+1} was not written`);
   for(let other=0;other<slot;other++)assert.deepEqual(payload(sram,other),payload(srams[slot-1],other),`slot ${slot+1} changed earlier slot ${other+1}`);
   for(const powerCycle of[false,true]){
    console.log('checking slot',slot+1,powerCycle?'power-cycle':'reset');
    await request({op:powerCycle?'reload':'reset'});await loadNativeSlot(io,slot,{powerCycle});assertProjection(await projection(io),expected,`slot ${slot+1} ${powerCycle?'reload':'reset'}`);
   }
   slots.push({slot:slot+1,payloadSha256:hash(payload(sram,slot)),reset:true,powerCycle:true});
  }
  await openNativeSave(io);await io.tap(1,120);await io.tap(1,180);
  const afterCancel=await readFile((await request({op:'dump',name:'cancel',mem:'sram',addr:0,len:8192,format:'bin'})).file);
  assert.deepEqual(afterCancel,srams.at(-1),'native cancel changed SRAM');
  return{core:name,slots,projectionSha256:hash(JSON.stringify(expected)),cancelUnchanged:true,writesAfterFreshStart:0,savestatesUsed:0};
 });
 reports.push({...report,frames:report.frames??undefined});console.log(name+': all three native save/reset/reload slots passed');
}
const result={sha256,scope:'Fresh controller-only opening and native menu saves. Every slot survives console reset and power-cycle/title-load with story, party, inventory, equipment, techniques, Dragon and quest-flag WRAM projections identical. No savestates or post-start writes.',reports};
await writeFile(path.join(root,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({sha256,report:path.join(root,'report.json'),reports},null,2));
