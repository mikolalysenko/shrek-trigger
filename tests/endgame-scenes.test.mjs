import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from './helpers.mjs';
import {u16} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
import {endgameCheckpoints} from '../engine/endgame-checkpoints.js';
import {traverseRumpelEncounter,traverseGiantGodmother,traverseCosmicInterior} from './endgame-scene-controller.mjs';

const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex'),root='.local/qa/endgame-js-'+sha256.slice(0,12),specs=JSON.parse(await readFile('content/hooks.json'));
await mkdir(root,{recursive:true});
for(const key of Object.keys(endgameCheckpoints))test('native endgame checkpoint and authored continuation: '+key,async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs);let before;
 h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});
 const d=createDevTools(s,h);
 const entry=areas.find(a=>a.endgameScene===key);assert.ok(entry);
 d.jump(entry);runFrames(s,500);assert.equal(u16(s.ram,0x100),entry.id);
 const advance=(n,k=0)=>{runFrames(s,n,k);assert.equal(d.diagnostics().fatal,null);};
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>advance(n),hold:(k,n)=>advance(n,k),tap:(k=256,gap=12)=>{advance(3,k);advance(gap);},shot:name=>screenshot(s,root+'/'+name+'.png')};
 const pointer=b.audit.resources.npcGraphicsStreaming.streams.find(s=>s.gfx===238).address;
 try{
  const result=key==='godmother'?await traverseGiantGodmother(io):key==='cosmic-interior'?await traverseCosmicInterior(io,b.rom,{revealPointer:pointer}):await traverseRumpelEncounter(io,b.rom,key);
  assert.deepEqual(s.cart.data,b.rom);await writeFile(root+'/'+key+'.json',JSON.stringify({sha256,...result},null,2)+'\n');
  d.undo();assert.deepEqual(s.ram,before,'Shortcut returns to exact saved WRAM');
 }finally{d.dispose();h.dispose();}
});
