import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16} from '../engine/rom.js';
import {areas} from '../content/areas.js';
import {guardCheckpoints} from '../engine/guard-checkpoints.js';
import {traverseGuardScene} from './guard-scene-controller.mjs';

const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex'),root='.local/qa/guard-js-'+sha256.slice(0,12),specs=JSON.parse(await readFile('content/hooks.json'));
const streams=Object.fromEntries(b.audit.resources.npcGraphicsStreaming.streams.map(s=>[s.gfx,s.address]));
await mkdir(root,{recursive:true});
for(const key of['prison-rescue','prison-breakout','sewer',...Object.keys(guardCheckpoints)])test('integrated native guard scene and return: '+key,async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs);let before;
 h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});
 const d=createDevTools(s,h),entry=key.startsWith('prison-')?areas.find(a=>a.trialScene==='prison-cell'):key==='sewer'?areas.find(a=>a.futureScene==='future-sewer-entrance'):areas.find(a=>a.guardScene===key);
 assert.ok(entry);const advance=(n,k=0)=>{runFrames(s,n,k);assert.equal(d.diagnostics().fatal,null);};
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>advance(n),hold:(k,n)=>advance(n,k),tap:(k=256,gap=100)=>{advance(3,k);advance(gap);},shot:name=>screenshot(s,root+'/'+name+'.png')};
 try{
  if(entry.guardScene){assert.throws(()=>d.jump({...entry,party:[0,1,2]}),/own location and party/);assert.throws(()=>d.jump({...entry,id:6}),/own location and party/);}
  d.jump(entry);advance(500);assert.equal(u16(s.ram,0x100),entry.id);
  const result=await traverseGuardScene(io,b.rom,key,{streams});
  assert.deepEqual(s.cart.data,b.rom);await writeFile(root+'/'+key+'.json',JSON.stringify({sha256,...result},null,2)+'\n');
  d.undo();assert.deepEqual(s.ram,before,'Exact WRAM restored after the diagnostic route');
 }finally{d.dispose();h.dispose();}
});
