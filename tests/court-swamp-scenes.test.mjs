import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16} from '../engine/rom.js';
import {areas} from '../content/areas.js';
import {courtSwampRoutes,traverseCourtSwampScene} from './court-swamp-controller.mjs';

const built=await build(),sha256=createHash('sha256').update(built.rom).digest('hex'),root='.local/qa/court-swamp-js-'+sha256.slice(0,12),specs=JSON.parse(await readFile('content/hooks.json'));
const streams=Object.fromEntries(built.audit.resources.npcGraphicsStreaming.streams.map(s=>[s.gfx,s.address]));
await mkdir(root,{recursive:true});
for(const[key,cfg]of Object.entries(courtSwampRoutes))test('native court/swamp scene and continuation: '+key,async()=>{
 const s=await bedroom(built.rom),h=installHooks(s,specs);let before;
 h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});
 const d=createDevTools(s,h),entry=areas.find(a=>cfg.trialScene?a.trialScene===cfg.trialScene:a.courtSwampScene===key);assert.ok(entry);
 const advance=(frames,keys=0)=>{runFrames(s,frames,keys);assert.equal(d.diagnostics().fatal,null);};
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>advance(n),hold:(k,n)=>advance(n,k),tap:(k=256,gap=100)=>{advance(3,k);advance(gap);},shot:name=>screenshot(s,root+'/'+name+'.png')};
 try{
  if(entry.courtSwampScene){assert.throws(()=>d.jump({...entry,party:[0,1,2]}),/own location and party/);assert.throws(()=>d.jump({...entry,id:6}),/own location and party/);}
  d.jump(entry);advance(cfg.entryFrames);assert.equal(u16(s.ram,0x100),cfg.location);
  // The piazza group appears at one of several native positions, chosen from
  // the frame counter when the room loads. The scripted walk meets the one on
  // the entry path; for the others, return and enter one frame later.
  let result;
  for(let attempt=0;;attempt++){
   try{result=await traverseCourtSwampScene(io,built.rom,key,{streams});break;}
   catch(e){
    if(key!=='palace-piazza'||!/Original encounter starts/.test(e.message)||attempt>=7)throw e;
    d.undo();advance(1);before=undefined;d.jump(entry);advance(cfg.entryFrames);assert.equal(u16(s.ram,0x100),cfg.location);
   }
  }
  assert.deepEqual(s.cart.data,built.rom);await writeFile(root+'/'+key+'.json',JSON.stringify({sha256,...result},null,2)+'\n');
  d.undo();assert.deepEqual(s.ram,before,'Exact WRAM restored after scene diagnostics');
 }finally{d.dispose();h.dispose();}
});
