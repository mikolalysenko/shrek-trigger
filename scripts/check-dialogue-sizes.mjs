import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dialogue} from '../content/dialogue.js';
import {additionalDialogue,nativeEventOffset} from '../engine/event-additions.js';
import {shrekReplies} from '../content/shrek-dialogue.js';
import {build} from '../tests/helpers.mjs';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {u16,u24} from '../engine/rom.js';
import {encodeDialogue} from '../engine/text.js';

const built=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json'));
const allocations=built.records.map(r=>({label:r.label,offset:r.offset,length:r.bytes.length}));
const allocation=label=>{
 const matches=allocations.filter(a=>a.label===label);
 assert.equal(matches.length,1,`one allocation for ${label}`);
 return matches[0];
};

for(const layout of layouts){
 if(layout.location===0||!dialogue[layout.location])continue; // No rewritten B8 table is emitted for these events.
 const additions=additionalDialogue[layout.location]??{};
 const count=Math.max(...layout.strings.map(s=>s.id),...Object.keys(additions).map(Number))+1;
 const table=allocation('dialogue table '+layout.location),event=allocation('event '+layout.eventId);
 const required=count*2+1+layout.strings.reduce((n,s)=>n+(dialogue[layout.location]?.[s.id]!==undefined?encodeDialogue(dialogue[layout.location][s.id],built.base).length:s.capacity),0);
 assert.ok(table.length>=required,`${layout.location} table allocation covers every pointer and string`);
 assert.ok(table.offset+table.length<=built.rom.length,`${layout.location} table fits the cartridge`);
 assert.ok(event.offset+event.length<=built.rom.length,`${layout.location} event fits the cartridge`);
 const eventBytes=decompress(built.rom,event.offset).bytes;
 for(const command of layout.tableCommands){
  const nativeCommand=nativeEventOffset(layout.location,command);
  assert.equal(eventBytes[nativeCommand],0xb8,`${layout.location} native table command`);
  const address=u24(eventBytes,nativeCommand+1);
  assert.equal(cartridgeOffset(address,built.rom),table.offset,`${layout.location} table pointer`);
  for(const s of layout.strings){
   const expected=dialogue[layout.location]?.[s.id]!==undefined?encodeDialogue(dialogue[layout.location][s.id],built.base):built.base.subarray(s.address,s.address+s.capacity);
   const pointer=(address&0xff0000)|u16(built.rom,table.offset+s.id*2),offset=cartridgeOffset(pointer,built.rom);
   assert.ok(offset>=table.offset&&offset+expected.length<=table.offset+table.length,`${layout.location}:${s.id} stays inside its table`);
   assert.deepEqual(built.rom.slice(offset,offset+expected.length),expected,`${layout.location}:${s.id} encoded text`);
  }
 }
}

const replyEntries=Object.values(shrekReplies).reduce((n,lines)=>n+Object.keys(lines).length,0);
const replyBytes=Object.values(shrekReplies).reduce((n,lines)=>n+Object.values(lines).reduce((m,text)=>m+encodeDialogue('{full}'+text+'{null}',built.base).length,0),0);
assert.equal(built.audit.shrekDialogue.replies.length,replyEntries,'every Shrek reply is emitted');
assert.equal(built.audit.shrekDialogue.textBytes,replyBytes,'Shrek reply byte total');
assert.equal(built.audit.shrekDialogue.pointerBytes,replyEntries*6,'Shrek reply pointer table size');
for(const reply of built.audit.shrekDialogue.replies){
 const expected=encodeDialogue('{full}'+reply.text+'{null}',built.base);
 assert.ok(reply.offset+reply.bytes<=built.rom.length,`${reply.location}:${reply.id} reply fits the cartridge`);
 assert.deepEqual(built.rom.slice(reply.offset,reply.offset+reply.bytes),expected,`${reply.location}:${reply.id} reply text`);
}

const dialogueAllocations=allocations.filter(a=>a.label.startsWith('dialogue table ')||a.label==='native Shrek reply pointers'||a.label.startsWith('Shrek reply ')).sort((a,b)=>a.offset-b.offset);
for(let i=1;i<dialogueAllocations.length;i++){
 const previous=dialogueAllocations[i-1],next=dialogueAllocations[i];
 assert.ok(previous.offset+previous.length<=next.offset,`no dialogue allocation overlap: ${previous.label} / ${next.label}`);
}

console.log(JSON.stringify({tables:layouts.length,replies:replyEntries,replyBytes,allocationsChecked:dialogueAllocations.length,overlaps:0},null,2));
