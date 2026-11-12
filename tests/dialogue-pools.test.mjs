import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from './helpers.mjs';
import {dialogue} from '../content/dialogue.js';
import {sourceDialogueEvents,sourceDialogueStrings,nativeEventCount} from '../content/dialogue-ownership.js';
import {replacedDialoguePools} from '../engine/dialogue-pools.js';
import {u16,u24,put24} from '../engine/rom.js';
import {cartridgeDataAddress} from '../engine/expanded-rom.js';
import {nativeEventOffset} from '../engine/event-additions.js';
import {decompress} from '../engine/compression.js';
import {buildPatch} from '../engine/patch.js';
const built=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json'));
const replaced=layouts.filter(l=>dialogue[l.location]&&l.storage!=='extended').map(l=>l.eventId),rewritten=new Set(replaced);
const overlaps=(a,b)=>a.offset<b.offset+b.length&&b.offset<a.offset+a.length;

test('dialogue reclamation preserves still-used source strings and rebuilds the final global event',()=>{
  assert.equal(nativeEventCount,513);assert.equal(new Set(sourceDialogueEvents.map(e=>e[0])).size,492);
  assert.ok(sourceDialogueEvents.some(([id])=>id===512));
  assert.equal(u16(built.base,0x360000+449*14+8),512,'the parade location uses a real 513th global entry');
  const finalEvent=built.audit.events.find(e=>e.eventId===512);assert.ok(finalEvent,'the newly adapted final event is rebuilt');
  assert.equal(u24(built.rom,0x3cfff0),cartridgeDataAddress(finalEvent.offset));
  for(const [address,length,owners]of sourceDialogueStrings)if(owners.some(id=>!rewritten.has(id)))assert.deepEqual(built.rom.slice(address,address+length),built.base.slice(address,address+length),'live original string '+address.toString(16));
  for(const table of new Set(sourceDialogueEvents.flatMap(([, ,tables])=>tables.map(([,t])=>t))))assert.deepEqual(built.rom.slice(table,table+512),built.base.slice(table,table+512),'original pointer table '+table.toString(16));
  const pools=built.audit.resources.reclaimedDialogue;
  assert.ok(pools.reduce((n,p)=>n+p.length,0)>40000);assert.ok(built.audit.resources.freeReclaimedBytes>0,'the cartridge retains audited free space');
  for(let i=0;i<pools.length;i++){
    const p=pools[i];assert.equal(p.offset>>16,(p.offset+p.length-1)>>16);assert.ok(p.owners.every(id=>rewritten.has(id)));
    if(i)assert.ok(p.offset>=pools[i-1].offset+pools[i-1].length);
  }
});

test('newly inventoried source event packets and exclusive strings remain byte-for-byte intact',()=>{
 const extendedOwners=new Set(layouts.filter(l=>l.storage==='extended').map(l=>l.eventId));
 for(const layout of layouts.filter(l=>l.storage==='extended'&&l.eventId!==84)){
  const source=decompress(built.base,layout.eventPointer);assert.deepEqual(built.rom.subarray(layout.eventPointer,layout.eventPointer+source.length),built.base.subarray(layout.eventPointer,layout.eventPointer+source.length),`original event ${layout.eventId} must not be reclaimed`);
 }
 for(const[address,length,owners]of sourceDialogueStrings)if(owners.every(id=>extendedOwners.has(id)))assert.deepEqual(built.rom.subarray(address,address+length),built.base.subarray(address,address+length),`exclusive extended source string ${address.toString(16)}`);
});

test('every rebuilt event and extended text table has an explicit valid cartridge pointer',()=>{
 const textAllocations=[...built.audit.allocations,...built.audit.resources.extendedCompressedGraphics.allocations];
 for(const layout of layouts.filter(l=>dialogue[l.location])){
  const event=built.audit.events.find(e=>e.eventId===layout.eventId);assert.ok(event,`event ${layout.eventId}`);
  assert.equal(u24(built.rom,0x3cf9f0+layout.eventId*3),cartridgeDataAddress(event.offset));
  const bytes=decompress(built.rom,event.offset).bytes;assert.equal(bytes.length,event.eventBytes);
  const table=textAllocations?.find(a=>a.label==='dialogue table '+layout.location);
  if(table)for(const command of layout.tableCommands){const shifted=nativeEventOffset(layout.location,command);assert.equal(u24(bytes,shifted+1),cartridgeDataAddress(table.offset),`table ${layout.location}`);}
 }
});

test('a live owner or direct native pointer reserves the entire string and overlapping suffixes',()=>{
  assert.deepEqual(replacedDialoguePools(built.base,[]),[]);
  const pool=built.audit.resources.reclaimedDialogue[0],sample=sourceDialogueStrings.find(([offset,length])=>offset>=pool.offset&&offset+length<=pool.offset+pool.length);
  assert.ok(sample);const[offset,length,owners]=sample,span={offset,length};
  const partial=replacedDialoguePools(built.base,replaced.filter(id=>id!==owners[0]));assert.ok(!partial.some(p=>overlaps(p,span)));
  for(const bank of[0xc00000,0x400000]){
    const direct=built.base.slice();put24(direct,0xffc0,bank|offset);
    assert.ok(!replacedDialoguePools(direct,replaced).some(p=>overlaps(p,span)),'direct HiROM pointer alias');
  }
  const bad=built.base.slice();bad[0x3cf9f0]^=1;assert.throws(()=>replacedDialoguePools(bad,replaced),/event pointer changed/);
});

test('the builder refuses to reclaim an event whose text table commands were omitted from its layout',async()=>{
  const invalid=structuredClone(layouts),l=invalid.find(l=>l.location===27);l.tableCommands=[];
  const techs=JSON.parse(await readFile('content/techs.json'));
  assert.throws(()=>buildPatch(built.base,{techs,layouts:invalid}),/Incomplete dialogue table commands/);
});
