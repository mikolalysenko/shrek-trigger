import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16} from '../engine/rom.js';
import {areas} from '../content/areas.js';
import {traverseSewerEntrance,traverseSewerDiary,traverseSewer,traverseUpperSewer} from './sewer-controller.mjs';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
test('continuous sewer route preserves both frog scenes, diary branches, sound traps, toll boss, bridge, treasure and world exit',async()=>{
  for(const noisy of[false,true]){
    const s=await bedroom(b.rom),h=installHooks(s,specs),dispatches=[],upperDispatches=[],messages=[];let before;
    s.ram[0x100ed]=31;s.ram[0x100ec]=2; // Simulate revisiting after completing the sewer.
    s.ram[0x10070]|=32;s.ram[0x10011]|=64;
    s.ram[0x24ff]=15;s.ram[0x25ff]=4;
    s.ram[0x1019b]=(s.ram[0x1019b]&~64)|(noisy?0:64);
    h.on('event.dispatch',e=>{
      if(!before)before=s.ram.slice();
      if(e.location===237&&e.opcode===0xd8&&dispatches.at(-1)!==e.scriptPC)dispatches.push(e.scriptPC);
      if(e.location===236&&e.opcode===0xd8&&upperDispatches.at(-1)!==e.scriptPC)upperDispatches.push(e.scriptPC);
    });
    h.on('dialogue.render',e=>{if(e.location===236||e.location===237)messages.push([e.location,e.stringId]);});
    const d=createDevTools(s,h),original=s.cart.data.slice();
    d.jump(areas.find(a=>a.futureScene===(noisy?'future-sewer':'future-sewer-entrance')));runFrames(s,400);
    assert.equal(s.ram[0x100ed],0);assert.equal(s.ram[0x100ec],0);
    assert.equal(s.ram[0x10070]&32,0);assert.equal(s.ram[0x10011]&64,0);
    assert.equal(s.ram.subarray(0x2400,0x2500).includes(15),false);
    assert.equal(s.ram[0x1019b]&64,noisy?0:64);
    const io={
      read:(p,size=1)=>size===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),
      hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),
      tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},
      shot:key=>screenshot(s,'.local/qa/'+key+'.png')
    };
    if(!noisy){const entrance=await traverseSewerEntrance(io);assert.equal(entrance.flags,7);}
    const diary=await traverseSewerDiary(io);assert.equal(diary.visible,!noisy);
    assert.equal(messages.some(([loc,id])=>loc===237&&id===100),!noisy);
    const result=await traverseSewer(io,noisy);
    assert.equal(result.formations.length,noisy?4:0);
    assert.deepEqual(dispatches,noisy?[0x3d2,0x465,0x51e,0x588]:[]);
    if(!noisy){
      const upper=await traverseUpperSewer(io);assert.equal(upper.flags,31);
      assert.deepEqual(upperDispatches,[0x675,0x6ca,0x978,0x722]);
      assert.deepEqual(upper.bridgeStates,[2,0,2]);assert.deepEqual(upper.treasure,{id:15,quantity:1});
      for(const id of[43,44,45,46,47,48,49,96,97,98,99,52,53,54,55,56,57,58])assert.ok(messages.some(([loc,n])=>loc===236&&n===id),'native sewer dialogue '+id);
    }
    assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);
    d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();
  }
});
