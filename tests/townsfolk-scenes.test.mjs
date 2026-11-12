import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16} from '../engine/rom.js';
import {townsfolkRoutes,traverseTownsfolkScene} from './townsfolk-controller.mjs';
const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex'),out='.local/qa/townsfolk-js-'+sha256.slice(0,12),specs=JSON.parse(await readFile('content/hooks.json'));
const streams=Object.fromEntries(b.audit.resources.npcGraphicsStreaming.streams.map(s=>[s.gfx,s.address]));await mkdir(out,{recursive:true});
for(const[key,cfg]of Object.entries(townsfolkRoutes))test('native townsfolk scene and continuation: '+key,async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs);let before;h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});const d=createDevTools(s,h);
 const advance=(n,k=0)=>{runFrames(s,n,k);assert.equal(d.diagnostics().fatal,null);};
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>advance(n),hold:(k,n)=>advance(n,k),tap:(k=256,gap=100)=>{advance(3,k);advance(gap);},shot:name=>screenshot(s,out+'/'+name+'.png')};
 const entry={id:cfg.location,x:cfg.x,y:cfg.y,facing:cfg.facing??1,endgame:true,...(cfg.trialScene?{trialScene:cfg.trialScene}:cfg.medinaScene?{medinaScene:cfg.medinaScene}:{townsfolkScene:key})};
 try{
  if(entry.townsfolkScene){assert.throws(()=>d.jump({...entry,party:[0,1,2]}),/own location and party/);assert.throws(()=>d.jump({...entry,id:6}),/own location and party/);}
  d.jump(entry);advance(cfg.entryFrames);assert.equal(u16(s.ram,0x100),cfg.location);
  const result=await traverseTownsfolkScene(io,b.rom,key,{streams});assert.deepEqual(s.cart.data,b.rom);await writeFile(out+'/'+key+'.json',JSON.stringify({sha256,...result},null,2)+'\n');
  d.undo();assert.deepEqual(s.ram,before);
 }finally{d.dispose();h.dispose();}
});
