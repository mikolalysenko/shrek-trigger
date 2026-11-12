import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16} from '../engine/rom.js';
import {areas} from '../content/areas.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
async function fixture(key,{password=true}={}){
  const s=await bedroom(built.rom),h=installHooks(s,specs),messages=[],commands=new Set();let before;
  h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});
  const dev=createDevTools(s,h),rom=s.cart.data.slice();
  if(!password){let seeded=false;h.on('event.dispatch',()=>{if(!seeded){seeded=true;s.ram[0x100ec]=17;}});}
  h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
  h.on('event.dispatch',e=>commands.add(`${e.location}:${e.scriptPC}`));
  dev.jump(areas.find(a=>a.futureScene===key));runFrames(s,400);
  return {s,h,dev,messages,commands,tap(button=256,gap=120){runFrames(s,12,button);runFrames(s,gap);},
    until(fn,frames=4000){for(let i=0;i<frames&&!fn();i++)runFrames(s,1);assert.ok(fn(),'native scene completed within its frame budget');},
    close(){assert.equal(dev.diagnostics().fatal,null);assert.deepEqual(s.cart.data,rom);dev.undo();assert.deepEqual(s.ram,before);dev.dispose();h.dispose();}};
}
const saw=(f,loc,id)=>f.messages.some(([l,n])=>l===loc&&n===id);
function walk(s,x,y,done=()=>false,catchRat=false){
  // Follow the inside of the catwalk with ordinary B + directional input.
  // Reading coordinates steers the test; no actor, speed or flag is written.
  for(let i=0;i<1200&&!done();i++){
    const leader=u16(s.ram,0x197),px=u16(s.ram,0x1800+leader)/16,py=u16(s.ram,0x1880+leader)/16,dx=x-px,dy=y-py;
    if(Math.abs(dx)<2&&Math.abs(dy)<2)return;
    let buttons=1|(Math.abs(dx)>1?(dx>0?128:64):0)|(Math.abs(dy)>1?(dy>0?32:16):0);
    if(catchRat&&i%4<2&&[12,13].some(id=>Math.abs(u16(s.ram,0x1800+id*2)/16-px)+Math.abs(u16(s.ram,0x1880+id*2)/16-py)<26))buttons|=256;
    runFrames(s,1,buttons);
  }
  assert.ok(done(),'controller route reached its waypoint');
}
function openCode(f,loc,first){
  f.commands.clear();
  for(let i=0;i<12&&!f.commands.has(`${loc}:${first}`);i++)f.tap();
  assert.ok(f.commands.has(`${loc}:${first}`),'native code reader is waiting');
}
function enterCode(f,buttons){for(const b of buttons)f.tap(b);f.until(()=>f.s.ram[0x110]===0,5000);}

test('the rat chase teaches the buttons, accepts a real dash-and-catch and awards the passage password',async()=>{
  const f=await fixture('future-rat'),{s}=f;
  for(let i=0;i<60&&!saw(f,221,2);i++)runFrames(s,1,33);
  assert.ok(saw(f,221,2));
  for(let i=0;i<400&&!(s.ram[0x100ec]&32);i++)runFrames(s,1,i%24<3?256:0);
  assert.ok(saw(f,221,3));assert.equal(s.ram[0x100ec],49);
  const caught=()=>saw(f,221,4);
  for(const[x,y]of[[19,8],[4,8],[4,20],[25,20],[25,32],[19,32],[19,43],[4,43]]){
    walk(s,x*16+8,y*16+7,caught,true);if(caught())break;
  }
  assert.ok(caught());await screenshot(s,'.local/qa/future-rat-caught.png');
  for(let i=0;i<12&&!(s.ram[0x100ec]&64);i++)f.tap();
  assert.equal(s.ram[0x100ec],97,'native catch clears chase bit and learns password');assert.equal(s.ram[0x10000],53);f.close();
});

test('both passage switches require the learned password and both shoulder buttons, and can be toggled back',async()=>{
  const unknown=await fixture('future-passage-left',{password:false});runFrames(unknown.s,10,16);
  runFrames(unknown.s,8,3072);unknown.tap(3072|256,400);
  assert.equal(unknown.s.ram[0x100a4],1);assert.ok(saw(unknown,216,202));unknown.close();
  for(const [key,bit]of[['future-passage-left',32],['future-passage-right',64]]){
    const f=await fixture(key),{s}=f;runFrames(s,10,16);
    for(const keys of[256,1024|256,2048|256]){f.tap(keys,400);assert.equal(s.ram[0x100a4],1);}
    runFrames(s,8,3072);f.tap(3072|256,400);assert.equal(s.ram[0x100a4],1|bit);
    await screenshot(s,`.local/qa/${key}-open.png`);
    runFrames(s,8,3072);f.tap(3072|256,400);assert.equal(s.ram[0x100a4],1);f.close();
  }
});

test('Pinocchio uses his security tag to open the factory entrance',async()=>{
  const f=await fixture('factory-entry'),{s}=f;runFrames(s,36,16);
  for(let i=0;i<20&&!(s.ram[0x10058]&4);i++)f.tap();
  assert.equal(s.ram[0x10058]&4,4);assert.ok(saw(f,228,31));
  assert.deepEqual([...s.ram.slice(0x2980,0x2983)],[0,3,2]);await screenshot(s,'.local/qa/factory-security-open.png');f.close();
});

test('the factory crane rejects a wrong code, moves both barrels with XA and BB, and safely repeats a used code',async()=>{
  const f=await fixture('factory-crane'),{s}=f;runFrames(s,12,16);
  openCode(f,231,0x3d4);enterCode(f,[256,1]);assert.equal(s.ram[0x10058],4);
  openCode(f,231,0x3d4);enterCode(f,[512,256]);assert.equal(s.ram[0x10058],36);
  openCode(f,231,0x3d4);enterCode(f,[1,1]);assert.equal(s.ram[0x10058],100);
  openCode(f,231,0x3d4);enterCode(f,[512,256]);assert.equal(s.ram[0x10058],100);
  assert.ok(saw(f,231,62));assert.equal(s.ram[0x10000],60);await screenshot(s,'.local/qa/factory-crane-both-cleared.png');f.close();
});

test('the native factory door rejects a wrong password, accepts X A B Y, and returns control after reopening',async()=>{
  const f=await fixture('factory-lock'),{s}=f;runFrames(s,12,16);
  openCode(f,235,0x588);enterCode(f,[512,256,2]);assert.equal(s.ram[0x101d0],0);
  openCode(f,235,0x588);enterCode(f,[512,256,1,2]);assert.equal(s.ram[0x101d0],1);
  assert.ok(saw(f,235,57));f.tap();f.until(()=>s.ram[0x110]===0);assert.equal(s.ram[0x101d0],1);
  assert.equal(s.ram[0x10000],60);await screenshot(s,'.local/qa/factory-door-open.png');f.close();
});

test('the lab terminal disables the native lasers and its ambush returns control',async()=>{
  const f=await fixture('factory-lab'),{s}=f;let battle=false,returned=false;
  f.h.on('event.dispatch',e=>{if(e.location===230&&e.opcode===0xd8)battle=true;if(battle&&e.location===230&&e.opcode===0x00)returned=true;});
  runFrames(s,36,16);
  for(let i=0;i<170&&!returned;i++)f.tap();
  assert.ok(battle&&returned);assert.equal(s.ram[0x10058],101);assert.ok(saw(f,230,35));
  assert.equal(s.ram[0x10000],60);await screenshot(s,'.local/qa/factory-lab-cleared.png');f.close();
});

test('the generator starts the emergency, Pinocchio holds the doors, and the party escapes by the real ladder',async()=>{
  const f=await fixture('factory-power'),{s}=f;runFrames(s,12,16);
  for(let i=0;i<30&&s.ram[0x10000]!==63;i++)f.tap();
  assert.equal(s.ram[0x10000],63);assert.equal(s.ram[0x101ed],1);assert.ok(saw(f,235,59));runFrames(s,240);
  walk(s,824,439);
  for(let i=0;i<40&&(!(s.ram[0x101d0]&2)||!s.ram[0x11f]);i++)f.tap();
  assert.equal(s.ram[0x101d0],3);assert.ok(s.ram[0x11f]);assert.ok(saw(f,235,60));
  await screenshot(s,'.local/qa/factory-doors-escaped.png');
  walk(s,824,767);walk(s,696,775);walk(s,696,647,()=>u16(s.ram,256)!==235);runFrames(s,400);
  assert.equal(u16(s.ram,256),230);assert.equal(s.ram[0x10000],63);
  assert.deepEqual([...s.ram.slice(0x2980,0x2983)],[0,3,2]);await screenshot(s,'.local/qa/factory-ladder-return.png');f.close();
});
