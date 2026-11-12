import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {encodeDialogue} from '../engine/text.js';
import {eggChallengeDialogue} from '../content/resurrection.js';
import {innCommands,resurrectionEvent} from '../engine/resurrection.js';
import {challengeSteve} from './resurrection-controller.mjs';
const b=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json'));

test('Steve challenge fits the original event buffer and its native message IDs own complete same-bank strings',()=>{
 const layout=layouts.find(l=>l.location===464),source=decompress(b.base,layout.eventPointer).bytes;
 const event=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+layout.eventId*3))).bytes;
 assert.ok(event.length<=0x1700);assert.equal(event[0],source[0]);innCommands(event);
 const table=fileOffset(u24(event,layout.tableCommands[0]+1));
 for(const[id,text]of Object.entries(eggChallengeDialogue)){
   const p=(table&0x3f0000)+u16(b.rom,table+id*2),encoded=encodeDialogue(text,b.base);
   assert.deepEqual(b.rom.slice(p,p+encoded.length),encoded);assert.equal(p>>16,(p+encoded.length-1)>>16);
   for(const page of text.split(/\{(?:page|full)\}/)){
     const lines=page.replace(/\{pc1\}/g,'WWWWW').replace('{null}','').split('\n');assert.ok(lines.length<=4);
     for(const line of lines)assert.ok(line.length<=36,line);
   }
 }
 const changed=source.slice();changed[0x7f7]=0;assert.throws(()=>resurrectionEvent(changed,464),/signature/);
 assert.equal(resurrectionEvent(source,465),source);
});

test('cartridge requires the 24-egg dare, counts every bite, refuses safely and awards one saved Second Chance',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),dev=createDevTools(s,h);
 const previousStory=s.ram[0x10000],calls=[];
 h.on('event.dispatch',e=>{if(e.location===464&&e.object===28&&e.opcode===0xac)calls.push(s.ram[0x12002+e.scriptPC]);});
 assert.throws(()=>dev.jump({id:1,x:8,y:8,resurrectionScene:'resurrection-eggs'}),/Resurrection checkpoint/);
 dev.jump({id:464,x:29,y:23,facing:0,resurrectionScene:'resurrection-eggs'});runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),
   hold:(input,n)=>runFrames(s,n,input),wait:n=>runFrames(s,n),tap:(input=256,gap=90)=>{runFrames(s,3,input);runFrames(s,gap);},
   shot:name=>screenshot(s,'.local/qa/'+name+'.png')};
 const result=await challengeSteve(io);assert.equal(result.eggs,24);
 assert.equal(calls.filter(f=>f===8).length,24);assert.equal(calls.filter(f=>f===9).length,24);
 assert.equal(dev.diagnostics().fatal,null);dev.undo();assert.equal(s.ram[0x10000],previousStory);assert.equal(u16(s.ram,0x100),2);
 dev.dispose();h.dispose();
});
