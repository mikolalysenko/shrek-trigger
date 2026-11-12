import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {shrekReplies} from '../content/shrek-dialogue.js';
import {dialogue} from '../content/dialogue.js';
import {encodeDialogue,dialogueLength} from '../engine/text.js';
import {put16,put24,u16,u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {installHooks} from '../engine/hooks.js';
import {runFrames} from '../engine/automation.js';
import {createDevTools} from '../engine/devtools.js';
import {nativeEventOffset} from '../engine/event-additions.js';

const b=await build();
test('Shrek replies use only their own compact strings and preserve every original field message',()=>{
  const {replies,textBytes,pointerBytes,extraWramBytes}=b.audit.shrekDialogue;
  assert.equal(replies.length,Object.values(shrekReplies).reduce((n,lines)=>n+Object.keys(lines).length,0));
  assert.equal(pointerBytes,replies.length*6);assert.equal(extraWramBytes,0);
  assert.equal(textBytes,replies.reduce((n,r)=>n+r.bytes,0));
  for(const r of replies){
    const original=encodeDialogue(dialogue[r.location][r.id],b.base);
    assert.deepEqual(b.rom.slice(r.terminator+1-original.length,r.terminator+1),original);
    const reply=encodeDialogue('{full}'+r.text+'{null}',b.base);
    assert.deepEqual(b.rom.slice(r.offset,r.offset+r.bytes),reply);
    assert.equal(dialogueLength(b.rom,r.offset),r.bytes);
    assert.equal(r.offset>>16,(r.offset+r.bytes-1)>>16);
  }
});

test('every reply terminator matches the native pointer of its relocated source string',async()=>{
  const layouts=JSON.parse(await readFile('content/event-layouts.json'));
  for(const r of b.audit.shrekDialogue.replies){
    const layout=layouts.find(l=>l.location===r.location),event=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+layout.eventId*3))).bytes,table=u24(event,nativeEventOffset(r.location,layout.tableCommands[0])+1),length=encodeDialogue(dialogue[r.location][r.id],b.base).length;
    const expected=(table&0xff0000)|((u16(b.rom,fileOffset(table)+r.id*2)+length-1)&0xffff);
    assert.equal(0xc00000|r.terminator,expected,`${r.location}:${r.id}`);
  }
});

test('the native text reader continues every reply for all active Shrek slots, never for reserve or absent Shrek',async()=>{
  const s=await createCore(b.rom);
  for(const r of b.audit.shrekDialogue.replies)for(const party of [[0,1,2],[1,0,2],[1,2,0],[1,2,4],[128,128,128]]){
    const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.c=true;c.v=true;c.d=false;c.cyclesLeft=0;
    c.r[0]=0x7e;c.r[1]=0xc2;c.br[4]=0x58b2;c.br[5]=0x200;c.br[3]=0x7ff;c.br[0]=0x3b17;c.br[1]=0x4567;c.br[2]=0x2345;
    s.ram.set(party,0x2980);s.ram[0x2983]=0;put24(s.ram,0x231,0xc00000|r.terminator);put24(s.ram,0x23d,0x7f8123);
    let ticks=0;while(c.r[1]!==0xc2||c.br[4]!==0x58b6){c.cycle();assert.ok(ticks++<50000,'native reply returns');}
    const present=party.includes(0);
    assert.equal(u24(s.ram,0x231),0xc00000|(present?r.offset:r.terminator),r.location+':'+r.id);
    assert.equal(c.br[0],0x3b00|(present?11:0));assert.equal(c.br[1],0x4567);assert.equal(c.br[2],0x2345);
    assert.equal(c.br[3],0x7ff);assert.equal(c.br[5],0x200);assert.equal(c.r[0],0x7e);assert.equal(c.c,true);assert.equal(c.v,true);
    assert.equal(c.m,false);assert.equal(c.x,false);assert.equal(c.z,!present);assert.equal(c.n,false);
    assert.equal(u24(s.ram,0x23d),0x7f8123,'numeric argument stream is untouched');
  }
});

test('ordinary glyphs, controls and the reply end keep the original byte-fetch behavior',async()=>{
  const s=await createCore(b.rom),r=b.audit.shrekDialogue.replies[0];
  for(const value of [0,1,3,6,11,12,13,19,31,32,33,127,159,160,239,255]){
    const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.c=false;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=0xc2;c.br[4]=0x58b2;c.br[5]=0x200;c.br[3]=0x7ff;c.br[0]=0x5d00;c.br[1]=0x100;c.br[2]=0x200;
    s.ram.set([0,1,2],0x2980);s.ram[0x18000]=value;put24(s.ram,0x231,0x7f8000);
    let n=0;while(c.r[1]!==0xc2||c.br[4]!==0x58b6){c.cycle();assert.ok(n++<50000);}
    assert.equal(c.br[0],0x5d00|value);assert.equal(u24(s.ram,0x231),0x7f8000);assert.equal(c.br[1],0x100);assert.equal(c.br[2],0x200);assert.equal(c.c,false);
  }
  // Ending a reply must finish normally, rather than replaying the response.
  const c=s.cpu;c.r[1]=0xc2;c.br[4]=0x58b2;c.m=true;c.cyclesLeft=0;put24(s.ram,0x231,0xc00000|(r.offset+r.bytes-1));
  let n=0;while(c.r[1]!==0xc2||c.br[4]!==0x58b6){c.cycle();assert.ok(n++<50000);}
  assert.equal(c.br[0]&255,0);assert.equal(u24(s.ram,0x231),0xc00000|(r.offset+r.bytes-1));
});

test('the opening conversation displays Shrek through the native text engine and returns to walking',async()=>{
  const s=await bedroom(b.rom),specs=JSON.parse(await readFile('content/hooks.json'));
  const h=installHooks(s,[...specs,{name:'dialogue.reply',address:0xc258b6,expected:[0xe6,0x31,0xe2,0x20]}]),d=createDevTools(s,h),seen=new Set();
  const byPointer=new Map(b.audit.shrekDialogue.replies.map(r=>[0xc00000|r.offset,r]));
  h.on('dialogue.reply',()=>{const r=byPointer.get(u24(s.ram,0x231));if(r)seen.add(r.location+':'+r.id);});
  d.jump({id:1,x:5,y:7,party:[0,1,2]});runFrames(s,180);
  for(let i=0;i<25&&!seen.has('1:10');i++){runFrames(s,3,256);runFrames(s,90);}
  assert.ok(seen.has('1:10'),'the first trip downstairs reaches Shrek\'s reply');
  runFrames(s,3,256);runFrames(s,120);
  await screenshot(s,'.local/qa/shrek-first-conversation.png');
  for(let i=0;i<40;i++){runFrames(s,3,256);runFrames(s,35);}
  assert.equal(d.diagnostics().fatal,null);assert.equal(s.cpu.stopped,false);
  d.undo();d.dispose();h.dispose();
});
