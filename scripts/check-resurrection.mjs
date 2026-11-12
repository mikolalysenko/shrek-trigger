import path from 'node:path';
import assert from 'node:assert/strict';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {seedResurrectionCheckpoint} from '../engine/resurrection-checkpoints.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {challengeSteve} from '../tests/resurrection-controller.mjs';

const requested=process.argv[2]??'all';
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
  if(process.env[env])return path.resolve(process.env[env]);
  for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){
    const p=path.resolve(dir,name);try{await access(p);return p;}catch{}
  }
  throw Error('Set '+env+' to an installed '+name);
}
const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex');
const root=path.resolve('.local/qa/resurrection-'+sha256.slice(0,12)),rom=path.join(root,'shrek-trigger.sfc');
await mkdir(root,{recursive:true});await writeCandidate(rom,b.rom);
const host=await tool('RETRO_HOST','retro-host');
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
  const out=path.join(root,name),core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.dylib');
  const result=await withIndependentController({host,core,rom,out},async({write,controller:io})=>{
    for(const[frames,buttons]of newGameSequence)await io.hold(buttons,frames);
    assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);
    const before=Uint8Array.from(await io.bytes(0,0x20000)),ram=before.slice();
    seedResurrectionCheckpoint(ram,'resurrection-eggs');
    for(let p=0;p<ram.length;){
      if(ram[p]===before[p]){p++;continue;}const start=p++;
      while(p<ram.length&&ram[p]!==before[p])p++;await write(start,ram.slice(start,p));
    }
    // All writes stop at this normal native field transition.
    await write(0x1238e,[0xe0,0xd0,1,29,23,0xb2]);await io.wait(400);
    return{sha256,...await challengeSteve(io)};
  });
  await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2));
  console.log(name,sha256,result.frames,'frames: refusal, 24 native eggs, Second Chance and repeat protection passed');
}
