import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {zealDialogue} from '../content/zeal-dialogue.js';
import {shrekReplies} from '../content/shrek-dialogue.js';
import {decompress} from '../engine/compression.js';
import {fileOffset,u16,u24} from '../engine/rom.js';
import {encodeDialogue} from '../engine/text.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
const b=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json'));

test('both Cleveland variants retain every native book, fate-choice, dream-spirit and prophecy instruction',()=>{
 for(const location of[335,355]){
  const l=layouts.find(l=>l.location===location),source=decompress(b.base,l.eventPointer).bytes,now=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+l.eventId*3))).bytes;
  assert.equal(now.length,source.length);const changed=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
  for(let i=0;i<source.length;i++)if(!changed.has(i))assert.equal(now[i],source[i],'native event '+location+':'+i);
  for(const p of[1867,1974,2068])assert.deepEqual([...now.slice(p+1,p+3)],[0x83,151],'every dream projection loads the Violent J enemy header');
  const table=fileOffset(u24(now,l.tableCommands[0]+1));
  for(const[id,text]of Object.entries(zealDialogue[location])){
   const bytes=encodeDialogue(text,b.base),address=(table&0x3f0000)+u16(b.rom,table+id*2);assert.deepEqual(b.rom.slice(address,address+bytes.length),bytes);
   for(const row of text.replace(/\{(?:page|full|null)\}/g,'\n').split('\n'))assert.ok(row.length<=36,location+':'+id+' '+row);
  }
  assert.deepEqual(zealDialogue[location][12].replace('{null}','').split('\n').map((r,i)=>r.startsWith('   ')?i:null).filter(i=>i!==null),[1,2,3]);
  assert.ok([1,2,3].every(id=>zealDialogue[location][id].startsWith('VIOLENT J:')));
  assert.ok(shrekReplies[location][26]);assert.ok(!Object.values(zealDialogue[location]).some(t=>/Doreen|Masa|Mune|Queen Zeal/.test(t)));
 }
 assert.deepEqual([...b.rom.slice(0x24f600+151*10,0x24f603+151*10)],[164,156,198]);
});

test('Cleveland loads all three clown projections and a native conversation returns to walking',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),actors=[],messages=[];
 h.on('event.init',e=>{if(e.location===355&&e.opcode===0x83)actors.push([e.object,s.ram[0x12002+e.scriptPC]]);});
 h.on('dialogue.render',e=>{if(e.location===355)messages.push(e.stringId);});
 d.jump(areas.find(a=>a.name==='Ohio · Cleveland clown dreams'));runFrames(s,500);
 assert.deepEqual(actors,[[14,151],[15,151],[16,151]]);assert.equal(u16(s.ram,256),355);
 for(let n=0;n<40&&!messages.includes(1);n++){
  runFrames(s,3,256);runFrames(s,90);if(!s.ram[0x126])runFrames(s,4,128);
 }
 assert.ok(messages.includes(1),'talk to the first clown projection');runFrames(s,160);
 await screenshot(s,'.local/qa/enhasa-clown-conversation.png');
 for(let n=0;n<40&&(s.ram[0x126]||!s.ram[0x11f]);n++){runFrames(s,3,256);runFrames(s,90);}
 assert.equal(s.ram[0x126],0);assert.equal(s.ram[0x11f],1);
 const leader=u16(s.ram,0x197),x=u16(s.ram,0x1800+leader);runFrames(s,12,64);assert.notEqual(u16(s.ram,0x1800+leader),x,'controller movement resumes');
 assert.equal(d.diagnostics().fatal,null);d.undo();assert.equal(u16(s.ram,256),2);d.dispose();h.dispose();
});
