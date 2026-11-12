import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {build,bedroom,screenshot} from './helpers.mjs';
import {elements,elementHelp} from '../content/elements.js';
import {elementBadgeTiles,elementBadgePalettes} from '../engine/elements.js';
import {encodeDialogue} from '../engine/text.js';
import {snesColor} from '../engine/sprites.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames,openingReady} from '../engine/automation.js';
import {u16} from '../engine/rom.js';
import {dialogue} from '../content/dialogue.js';
import {magnetQuestion,scientistRefrain,miracleElements} from '../content/miracles.js';

const b=await build();
test('Air and Dirt use their native element identities without changing combat or the Water/Fire badges',()=>{
 assert.deepEqual(elements.map(e=>[e.name,e.mask]),[['Air',128],['Dirt',64],['Water',32],['Fire',16]]);
 for(const[a,z]of[[0xc1acb,0xc247b],[0xc253b,0xc2580],[0x1ef3a,0x1efbd],[0x2a2c6,0x2a2cd],[0x3fd8e4,0x3fdbe4],[0x3fcda4,0x3fcde4]])assertRevisedBytes(b.rom,b.base,a,z,'unchanged native data '+a.toString(16));
 // Item help stays in its native slot; technique help is repacked (engine/tech-help.js) and must still name the element.
 // Item and technique help are both repacked (engine/item-help.js, engine/tech-help.js) and must still name the element.
 for(const h of elementHelp.filter(h=>h.kind==='item')){const line=b.audit.itemHelp.lines.find(l=>l.id===h.id);assert.ok(line,'item '+h.id+' help');assert.match(line.text,new RegExp(h.text.match(/“(\w+)”/)[1]));assert.doesNotMatch(line.text,/Lightning|Shadow/);}
 for(const line of b.audit.techHelp.lines)assert.doesNotMatch(line.text,/Lightning|Shadow/,`technique ${line.id} help uses Air and Dirt`);
 for(const id of[3,49])assert.match(b.audit.techHelp.lines[id-1].text,/Air/);
 assert.equal(b.audit.elements.allocatedBytes,0);assert.equal(b.audit.elements.extraVramBytes,0);assert.equal(b.audit.elements.extraWramBytes,0);
});
test('the supplied excerpt fits the native dialogue windows and Pinocchio answers explanations in both recruitment and magic lessons',()=>{
 assert.ok(dialogue[465][138].includes(miracleElements));
 for(const[location,id]of[[465,142],[226,48]])assert.ok(dialogue[location][id].includes(magnetQuestion));
 for(const[location,id]of[[465,142],[226,50]])assert.ok(dialogue[location][id].includes(scientistRefrain));
 for(const[location,id]of[[465,138],[465,139],[465,142],[465,167],[226,41],[226,47],[226,48],[226,49],[226,50],[226,51],[226,52]]){
  const text=dialogue[location][id];assert.ok(text.endsWith('{null}'));
  for(const row of text.replace(/\{(?:null|page|full)\}/g,'\n').split('\n'))assert.ok(row.length<=36,location+':'+id+' '+row);
 }
});
test('status menus upload the exact Air/Dirt tiles and palettes for Shrek and Farquaad through ordinary menu input',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json'));
 for(const[id,name]of[[0,'Air'],[6,'Dirt']]){
  const s=await bedroom(b.rom);assert.ok(openingReady(s));const h=installHooks(s,specs),d=createDevTools(s,h);
  d.jump({id:5,x:27,y:32,party:[id,1,2]});runFrames(s,400);runFrames(s,3,512);runFrames(s,300);
  assert.equal(s.ram[0xd46]&7,id);const wanted=elementBadgeTiles(name),vram=new Uint8Array(s.ppu.vram.buffer);
  const start=vram.findIndex((v,i)=>v===wanted[0]&&i+ wanted.length<=vram.length&&wanted.every((w,j)=>vram[i+j]===w));
  assert.ok(start>=0,'native element badge upload');
  assert.deepEqual([...s.ppu.cgram.slice(96,112)],elementBadgePalettes[name].map(snesColor),'native badge palette');
  // Dismiss the icon selector so the complete status panel is reviewable.
  runFrames(s,3,256);runFrames(s,120);await screenshot(s,`.local/qa/element-menu-${name.toLowerCase()}.png`);
  assert.equal(d.diagnostics().fatal,null);d.undo();assert.equal(u16(s.ram,256),2);d.dispose();h.dispose();
 }
});
