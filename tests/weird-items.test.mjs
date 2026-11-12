import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from './helpers.mjs';
import {items} from '../content/items.js';
import {u16} from '../engine/rom.js';
import {encode,encodeDialogue,dialogueLength,encodeName} from '../engine/text.js';

const built=await build();

test('weird equipment keeps native slots and emits its fitting labels and descriptions',()=>{
  const expected=new Map([
    [143,{name:'Tin Foil Hat',short:'TinFoilHat',category:'helmet',help:'Mind proof',source:'Vigil Hat'}],
    [166,{name:'Pocket Lint',short:'PocketLint',category:'accessory',help:'50% backtalk',source:'Rage Band'}],
    [171,{name:'Left Sock',short:'Left Sock',category:'accessory',help:'Auto sock attack',source:'Berserker'}]
  ]);
  for(const[id,want]of expected){
    const item=items.find(item=>item.id===id);assert.ok(item,`${want.source} remains mapped`);
    for(const key of['name','short','category','help'])assert.equal(item[key],want[key],`${want.name} ${key}`);
    const p=0xc0b5e+id*11;
    assert.equal(built.rom[p],built.base[p],`${want.name} keeps its native icon`);
    assert.deepEqual(built.rom.slice(p+1,p+11),encodeName(want.short,{length:10}),`${want.name} native label`);
    // Help lines are repacked for the whole table (engine/item-help.js).
    const address=0xc0000+u16(built.rom,0xc2eb1+id*2),bytes=encodeDialogue(want.help+'{null}',built.base);
    assert.deepEqual(built.rom.slice(address,address+bytes.length),bytes,`${want.name} native description`);
  }
});
