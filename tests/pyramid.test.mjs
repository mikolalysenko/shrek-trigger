import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {u16} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
import {visitPyramid} from './pyramid-controller.mjs';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
async function fixture({companion=1,charged=true,claimed=false}={}){
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[];let before,seeded=false;
 s.ram[0x1019c]=255;s.ram[0x101a0]=255;s.ram[0x101a2]=85;
 s.ram.set([83,138],0x24c8);s.ram.set([9,9],0x25c8);
 h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
 const d=createDevTools(s,h),original=s.cart.data.slice(),party=[0,companion,companion===1?2:1];
 h.on('event.dispatch',()=>{
  if(seeded)return;seeded=true;
  assert.equal(s.ram[0x1019c],251);assert.equal(s.ram[0x101a0],254);assert.equal(s.ram[0x101a2],85);
  assert.equal(s.ram[0x29af],254);for(const id of[83,138])assert.ok(!s.ram.subarray(0x2400,0x2500).includes(id));
  // Every branch override is prepared before E0, never during the route.
  s.ram.fill(128,0x2980,0x2989);s.ram.set([...party,...[0,1,2,3,4,5,6].filter(id=>!party.includes(id))],0x2980);
  if(!charged)s.ram[0x10000]=170;
  if(claimed){s.ram[0x1019c]|=4;s.ram[0x101a0]|=1;}
 });
 assert.throws(()=>d.jump({id:6,x:8,y:10,medinaScene:'medina-pyramid'}),/own location/);
 d.jump(areas.find(a=>a.medinaScene==='medina-pyramid'));runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=100)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>screenshot(s,'.local/qa/'+key+'.png')};
 return{s,io,messages,close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}

test('the forest pyramid opens with all six companion reactions, awards exactly one native gift and exits to the world',async()=>{
 for(const companion of[1,2,3,4,5,6]){
  const f=await fixture({companion}),result=await visitPyramid(f.io,{gift:companion%2?'left':'right'});
  assert.equal(result.item,companion%2?138:83);assert.equal(result.destination,496);
  assert.deepEqual(f.messages.filter(([l])=>l===42).map(([,id])=>id),[221+companion,228,229,230,231,232,243]);
  assert.equal(f.s.ram[0x10000],171);f.close();
 }
});

test('the pyramid seal stays closed before the charged-pendant story point and claimed gifts cannot be taken again',async()=>{
 const locked=await fixture({charged:false});assert.deepEqual(await visitPyramid(locked.io,{charged:false}),{opened:false});assert.deepEqual(locked.messages,[]);locked.close();
 const old=await fixture({claimed:true}),result=await visitPyramid(old.io,{claimed:true});
 assert.equal(result.item,null);assert.deepEqual(old.messages,[]);old.close();
});
