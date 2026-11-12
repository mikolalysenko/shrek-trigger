import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from './helpers.mjs';
import {bakeryDialogue} from '../content/bakery-dialogue.js';
import {carnivalDialogue} from '../content/carnival-dialogue.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {encodeDialogue,dialogueLength,decode} from '../engine/text.js';
import {bakeryEventEdits,bakeryEvent} from '../engine/bakery-events.js';

const b=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json'));
const event=location=>{const l=layouts.find(l=>l.location===location);return decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+l.eventId*3))).bytes;};
test('Bakery chapters preserve their native programs outside guarded staging edits and all 445 strings fit',()=>{
 let count=0;
 for(const[location,lines]of Object.entries(bakeryDialogue)){
  const l=layouts.find(l=>l.location===+location),old=decompress(b.base,l.eventPointer).bytes,now=event(+location);
  assert.equal(now.length,old.length);assert.ok(l.tableCommands.length);
  assert.deepEqual(Object.keys(lines).map(Number).sort((a,b)=>a-b),l.strings.map(s=>s.id).sort((a,b)=>a-b));
  const edited=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
  for(const{pc,to}of bakeryEventEdits[location]??[])for(let i=0;i<to.length;i++){edited.add(pc+1+i);assert.equal(now[pc+1+i],to[i]);}
  for(let i=0;i<old.length;i++)if(!edited.has(i))assert.equal(now[i],old[i],`native event ${location}:${i}`);
  for(const pos of l.tableCommands){
   assert.equal(now[pos],0xb8);assert.notEqual(u24(now,pos+1),u24(old,pos+1));const table=fileOffset(u24(now,pos+1));
   for(const[id,text]of Object.entries(lines)){
    const address=(table&0x3f0000)+u16(b.rom,table+id*2),encoded=encodeDialogue(text,b.base);
    assert.equal(address>>16,(address+encoded.length-1)>>16);assert.deepEqual(b.rom.slice(address,address+encoded.length),encoded);assert.equal(dialogueLength(b.rom,address),encoded.length);
    assert.ok(!/\b(Crono|Lucca|Marle|Robo|Ayla|Kino|Lavos|Magus|Ozzie|Azala|Reptite|Tyrano|Nizbel|Ioka|Laruba)\b/i.test(text));
    for(const page of text.split(/\{(?:instant|page3|page|full)\}/g)){
     const rows=page.replace(/\{[^}]+\}/g,'').split('\n');assert.ok(rows.length<=4,`${location}:${id} page height`);
     for(const row of rows)assert.ok(row.length<=36,`${location}:${id}: ${row}`);
    }
   }
  }
  count+=Object.keys(lines).length;
 }
 assert.equal(count,445);assert.equal(Object.keys(bakeryDialogue).length,24);
 assert.equal(bakeryDialogue[271][188],carnivalDialogue[271][188]);
});

test('Mongo listens to Gingy in a native folded-arm pose without the former strike or impact cue',()=>{
 const l=layouts.find(l=>l.location===282),source=decompress(b.base,l.eventPointer).bytes,patched=bakeryEvent(source,282);
 assert.equal(patched.length,source.length);assert.deepEqual([...patched.slice(0x682,0x686)],[0xac,201,0xad,8]);
 for(const pc of[0x892,0x8a5,0x8b1])assert.deepEqual([...patched.slice(pc+1,pc+3)],[0xac,2]);
 const damaged=source.slice();damaged[0x682]=0;assert.throws(()=>bakeryEvent(damaged,282),/scene signature/);assert.equal(damaged[0x683],62);
 assert.ok(!bakeryDialogue[282][9].includes('squeezing'));assert.ok(bakeryDialogue[282][10].includes('always friend'));
});

test('Bakery menus retain their real selectable rows and material quantities, and waking cues keep native delays',()=>{
 const choices=[
  [272,1084,43,6],[275,673,54,6],[277,655,173,6],[277,671,197,6],[277,705,230,6],
  [277,859,168,3],[277,987,168,3],[277,1122,174,6],[277,1134,192,6],[277,1187,176,6],[277,1199,190,6],
  [277,1252,178,6],[277,1264,188,6],[277,1317,180,6],[277,1329,186,6],[277,1379,182,6],[277,1410,184,6],[277,1557,198,6],
  [278,567,53,11],[280,942,74,11],[280,1408,75,11],[280,1423,78,11],[280,1847,90,6],[280,2055,96,11],[289,875,145,6]
 ];
 for(const[loc,pc,id,mask]of choices){
  const e=event(loc);assert.ok([0xc0,0xc3].includes(e[pc+1]));assert.deepEqual([...e.slice(pc+2,pc+4)],[id,mask]);
  const rows=bakeryDialogue[loc][id].replace('{null}','').split('\n');assert.equal(rows.length,(mask&3)+1);
  for(let row=(mask>>2)&3;row<=(mask&3);row++)assert.ok(rows[row].startsWith('   '),`${loc}:${id} row ${row}`);
 }
 assert.equal(bakeryDialogue[277][168].match(/\{value 8\}/g).length,4);
 assert.equal([...encodeDialogue(bakeryDialogue[277][168],b.base)].filter(v=>v===13).length,4);
 for(const[id,delays]of[[0,[15,15,9,0]],[214,[10,10,9,0]]]){
  const text=bakeryDialogue[271][id],bytes=encodeDialogue(text,b.base);
  assert.deepEqual([...text.matchAll(/\{delay (\d+)\}/g)].map(m=>+m[1]),delays);
  assert.equal([...bytes].filter(v=>v===9).length,3); // Two breaks and the delay operand.
  assert.equal(text.match(/\{instant\}/g).length,2);assert.equal(dialogueLength(bytes),bytes.length);
 }
});

test('Bakery trade confirmations describe the equipment IDs actually awarded by the original events',()=>{
 const e=event(277);
 for(const[pc,id,line,name,short]of[
  [1169,36,175,'Ruby Ducky Nozzle','RubyDucky'],[1175,37,193,'Dream Stream','DreamStrem'],
  [1234,21,177,'Sage Advice','SageAdvic'],[1240,22,191,'Daydreamer','Daydreamer'],
  [1299,49,179,'Okey-Dokey Oak Arms','Oak Doke'],[1305,51,189,'Emberassed Hand','Emberassed'],
  [1364,6,181,'Sizzle Stick','SizzleStik'],[1370,8,187,'Old Splinter','OldSplintr'],
  [1397,98,183,'Ruby Tuesday Vest','RubyTues'],[1428,129,185,'Stonehenge Cap','Stonehenge']
 ]){
  assert.deepEqual([...e.slice(pc+1,pc+3)],[0xca,id]);
  const message=pc+(id===98||id===129?5:3);assert.deepEqual([...e.slice(message,message+2)],[0xc1,line]);
  assert.ok(bakeryDialogue[277][line].includes(name));assert.equal(decode(b.rom.slice(0xc0b5f+id*11,0xc0b69+id*11)),short);
 }
});
