import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from './helpers.mjs';
import {dialogue} from '../content/dialogue.js';
import {shrekReplies} from '../content/shrek-dialogue.js';
import {decompress} from '../engine/compression.js';
import {carnivalEvent} from '../engine/carnival.js';
import {fileOffset,u16,u24} from '../engine/rom.js';
import {encodeDialogue} from '../engine/text.js';
import {sourceDialogueStrings} from '../content/dialogue-ownership.js';
import {sourceDictionary,sourceHasLetters} from '../engine/source-dialogue.js';

const b=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json'));

test('every verbal native field string has an authored adaptation at every runtime owner',()=>{
 const dictionary=sourceDictionary(b.base),eventLocations=new Map();
 for(let location=0;location<512;location++){
  const eventId=u16(b.base,0x360008+location*14);if(eventId>=513)continue;
  if(!eventLocations.has(eventId))eventLocations.set(eventId,[]);eventLocations.get(eventId).push(location);
 }
 const byLocation=new Map(layouts.map(l=>[l.location,l]));let covered=0;const unchanged=[];
 for(const[address,length,owners,pointers]of sourceDialogueStrings){
  if(!sourceHasLetters(b.base.subarray(address,address+length),dictionary))continue;
  for(const eventId of owners)for(const location of eventLocations.get(eventId)??[]){
   const layout=byLocation.get(location),string=layout?.strings.find(s=>s.address===address);
   if(!string){unchanged.push(`${location}:missing-layout:${address.toString(16)}`);continue;}
   if(dialogue[location]?.[string.id]===undefined)unchanged.push(location+':'+string.id);else covered++;
  }
 }
 assert.deepEqual(unchanged,[]);assert.ok(covered>4500,`covered ${covered} runtime strings`);
});

test('adapted dialogue and Shrek responses use the current cast and setting',()=>{
 const stale=/\b(?:Crono|Marle|Lucca|Robo|Ayla|Magus|Guardia|Queen Leene|Cyrus|Glenn|Melchior|Gaspar|Belthasar|Schala|Janus|Dalton|Lavos|Masamune|Doreen|Spekkio|Enhasa|Kajar|Zeal|Mammon|Blackbird|Black Omen|Mystic Mountain|Storybrook|Predator Fortress|Puppet Refuge|Carnival Mountains|Royal Woods)\b/i;
 for(const [kind,book]of[['dialogue',dialogue],['Shrek reply',shrekReplies]])for(const[location,strings]of Object.entries(book))for(const[id,text]of Object.entries(strings)){
  assert.ok(!stale.test(text),`${kind} ${location}:${id}: ${text.match(stale)?.[0]}`);
  for(const row of text.replace(/\{(?:page|full|page3)\}/g,'\n').replace(/\{[^}]+\}/g,'').split('\n'))assert.ok(row.length<=36,`${kind} row too wide at ${location}:${id}: ${row}`);
 }
});

test('Ohio and direct-finale rewrites preserve native events and emit every authored string',()=>{
 for(const location of[382,401,415,466]){
  const layout=layouts.find(l=>l.location===location),source=decompress(b.base,layout.eventPointer).bytes;
  const expected=carnivalEvent(source,location),now=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+layout.eventId*3))).bytes;
  assert.equal(now.length,expected.length);const changed=new Set(layout.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
  for(let i=0;i<expected.length;i++)if(!changed.has(i))assert.equal(now[i],expected[i],`native event ${location}:${i}`);
  const table=fileOffset(u24(now,layout.tableCommands[0]+1));
  for(const[id,text]of Object.entries(dialogue[location])){
   const bytes=encodeDialogue(text,b.base),address=(table&0x3f0000)+u16(b.rom,table+id*2);
   assert.deepEqual(b.rom.slice(address,address+bytes.length),bytes,`dialogue ${location}:${id}`);
  }
 }
 assert.equal(dialogue[335][0],dialogue[355][0]);assert.match(dialogue[335][0],/Cleveland, Ohio/);
 assert.match(dialogue[401][0],/Ohio Palace/);assert.match(dialogue[382][97],/Wish Palace/);assert.match(dialogue[415][136],/GODMOTHER/);
});

test('native decision rows retain their original count and order',()=>{
 assert.deepEqual(dialogue[335][12].replace('{null}','').split('\n').map((r,i)=>r.startsWith('   ')?i:null).filter(i=>i!==null),[1,2,3]);
 for(const id of[5,8,32])assert.ok(dialogue[401][id].includes('\n   '));
 for(const id of[19,20,21,22,23,24])assert.ok(dialogue[466][id].endsWith('   Fight!\n   Retreat for now.{null}'));
 assert.ok(dialogue[5][16].endsWith('   B. Moss Trotter!\n   C. Catalack!\n   D. G. I. Jogger!{null}'));
});
