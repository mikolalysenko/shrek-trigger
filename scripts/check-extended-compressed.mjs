import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,access,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compress} from '../engine/compression.js';
import {expandHirom} from '../engine/expanded-rom.js';
import {put16} from '../engine/rom.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';

// Diagnostic cartridges execute the original C3:0557 decompressor after a
// real reset. No emulator hook, WRAM injection or custom decompressor is used.
const requested=process.argv[2]??'all';
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){
  const p=path.resolve(dir,name);try{await access(p);return p;}catch{}
 }
 throw Error('Set '+env+' to an installed '+name);
}
const base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));
// This exceeds the new court beast's decoded length and exercises both LZ
// token widths while fitting the original destination and every source bank.
const sample=Uint8Array.from({length:19008},(_,i)=>(i*i+(i>>6)*37)&255);
const root=path.resolve('.local/qa/extended-compressed-cores');await mkdir(root,{recursive:true});
const host=await tool('RETRO_HOST','retro-host'),reports=[];
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
 const core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.dylib');
 for(const mode of[11,12])for(const bank of[0x40,0x46,0x7d]){
  const packed=compress(sample,{mode}),address=bank*65536+(bank===0x40?0:0x8000-packed.length),first=base.slice();
  // Native mode, 16-bit stack/direct page, bank00 data. Initialise guards,
  // source/destination long pointers, call the untouched routine, then mark
  // completion and idle with interrupts disabled.
  first.set([
   0x78,0x18,0xfb,0xc2,0x30,0xa9,0xff,1,0x1b,0xa9,0,0,0x5b,
   0xe2,0x20,0xa9,0xa5,0x8f,0xff,0x3f,0x7f,
   0x8f,(0x4000+sample.length)&255,(0x4000+sample.length)>>8,0x7f,
   0xc2,0x20,0xa9,address&255,address>>8&255,0x8d,0,3,
   0xa9,0,0x40,0x8d,3,3,0xe2,0x20,0xa9,bank,0x8d,2,3,
   0xa9,0x7f,0x8d,5,3,0x22,0x57,5,0xc3,
   0xe2,0x20,0xa9,0xa5,0x8d,0xfe,3,0x80,0xfe
  ],0x8000);put16(first,0xfffc,0x8000);
  const romBytes=expandHirom(first,[{offset:address,bytes:packed,label:'native compressed fixture'}]);
  const key=name+'-lz'+mode+'-'+bank.toString(16),rom=path.join(root,key+'.sfc'),out=path.join(root,key);
  await writeCandidate(rom,romBytes);
  const report=await withIndependentController({host,core,rom,out},async({controller:io})=>{
   await io.wait(90);assert.equal(await io.read(0x3fe),0xa5,'original routine returned');
   assert.deepEqual(await io.bytes(0x14000,sample.length),Array.from(sample),'complete native output');
   assert.equal(await io.read(0x13fff),0xa5);assert.equal(await io.read(0x14000+sample.length),0xa5);
   return{core:name,mode,address,compressedBytes:packed.length,decodedBytes:sample.length,
    sha256:createHash('sha256').update(romBytes).digest('hex'),outputSha256:createHash('sha256').update(sample).digest('hex'),guards:true};
  });reports.push(report);console.log(key+': exact native decompression and guards');
 }
}
await writeFile(path.join(root,'report.json'),JSON.stringify({originalRoutine:'C3:0557',reports},null,2)+'\n');
