import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from './helpers.mjs';
import {techHelp} from '../content/tech-help.js';
import {techHelpRegion} from '../engine/tech-help.js';
import {encodeDialogue,dialogueLength} from '../engine/text.js';
import {u16} from '../engine/rom.js';

const b=await build(),techs=JSON.parse(await readFile('content/techs.json','utf8')),TABLE=0xc3a09;

test('every technique has its own Shrek help line that fits the native window',()=>{
 assert.deepEqual(Object.keys(techHelp).map(Number),Array.from({length:116},(_,i)=>i+1));
 assert.equal(new Set(Object.values(techHelp)).size,116,'no two techniques share a help line');
 for(const[id,line]of Object.entries(techHelp)){
  assert.ok(line.length<=31,`technique ${id} help fits 31 characters: ${line}`);
  // Stock names and the stock elements never appear; Air and Dirt do.
  assert.doesNotMatch(line,/Lightning|Shadow|Antipode|Masamune|Meltbeam|Tailspin|Rollokick|Glacier|Volt Bite|Cube Toss|Ice Toss|Sword Stream|Spire|X Strike|Laser Spin|Confuse|Triple Kick|Multi-Punch|Darkbomb|Darkmist|Max Shock|Blaze Kick|Flame Kick|Fire Whirl|Fire Punch|Fire Tackle|Bubble|Drill Kick|Spin Kick|Final Kick|Gatling|Delta|Chaos/,`technique ${id} help names no Chrono Trigger technique`);
 }
});

test('the repacked help block keeps every pointer, neighbor and byte inside its native bounds',()=>{
 const {start,end}=techHelpRegion(b.base),audit=b.audit.techHelp,seen=new Set();
 assert.equal(audit.lines.length,116);assert.equal(audit.extraVramBytes,0);assert.equal(audit.extraWramBytes,0);
 for(const {id,address,text} of audit.lines){
  assert.equal(0xc0000+u16(b.rom,TABLE+id*2),address,`technique ${id} pointer`);
  const bytes=encodeDialogue(text+'{null}',b.base);
  assert.deepEqual(b.rom.slice(address,address+bytes.length),bytes,`technique ${id} text`);
  assert.equal(dialogueLength(b.rom,address),bytes.length,`technique ${id} terminates`);
  const inBlock=address>=start&&address+bytes.length<=end,inSpare=address>=audit.overflow.address&&address+bytes.length<=audit.overflow.address+audit.overflow.bytes;
  assert.ok(inBlock||inSpare,`technique ${id} stays in the help block or its padding`);
  assert.ok(!seen.has(address));seen.add(address);
 }
 // The padding used for the overflow was unused 0xFF in the original cartridge.
 for(let i=0;i<audit.overflow.bytes;i++)assert.equal(b.base[audit.overflow.address+i],0xff);
 // Every other help entry (the three category labels, "Can't run away" and the
 // unrelated entries after them) keeps its pointer and text.
 for(let id=0;id<130;id++){
  if(id>=1&&id<=116)continue;
  const pointer=u16(b.base,TABLE+id*2),address=0xc0000+pointer;assert.equal(u16(b.rom,TABLE+id*2),pointer,`help pointer ${id}`);
  if(id>=117&&id<=120){const n=dialogueLength(b.base,address);assert.deepEqual(b.rom.slice(address,address+n),b.base.slice(address,address+n),`help text ${id}`);}
 }
 assert.equal(techs.length,116);
});
