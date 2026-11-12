import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from './helpers.mjs';
import {comboPresentation} from '../engine/combo-descriptions.js';
import {encode,encodeDialogue,encodeName} from '../engine/text.js';
import {u16} from '../engine/rom.js';
import {techHelp} from '../content/tech-help.js';

const b=await build(),techs=JSON.parse(await readFile('content/techs.json','utf8'));

test('the eighteen scoped custom combos have native labels and their catalogue help line',()=>{
 assert.equal(comboPresentation.length,18);
 for(const p of comboPresentation){
  const t=techs.find(t=>t.id===p.id);assert.equal(t.name,p.name);assert.equal(t.short,p.short);
  const address=0xc15c4+p.id*11,magic=b.base[address]===0x2f;
  assert.deepEqual(b.rom.subarray(address,address+11),Uint8Array.from([...(magic?[0x2f]:[]),...encodeName(p.short,{length:magic?10:11})]),`combo ${p.id} label`);
  // Help lines live in the repacked technique help block (engine/tech-help.js).
  const help=0xc0000+u16(b.rom,0xc3a09+p.id*2),bytes=encodeDialogue(techHelp[p.id]+'{null}',b.base);
  assert.deepEqual(b.rom.subarray(help,help+bytes.length),bytes,`combo ${p.id} help`);
 }
 assert.equal(b.audit.comboDescriptions.count,18);
});
