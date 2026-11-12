import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {encodeDialogue,dialogueLength} from '../engine/text.js';
import {createCore} from '../scripts/core.mjs';
import {put24,u16,u24} from '../engine/rom.js';
const base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));

test('text controls distinguish inline operands from the separate numeric argument stream',()=>{
  const suffix=encodeDialogue('the story{null}',base);
  for(const [name,code]of[['value 8',13],['value 16',14],['value 24',15]])assert.deepEqual(encodeDialogue('{'+name+'}the story{null}',base),Uint8Array.from([code,...suffix]));
  assert.equal(dialogueLength(Uint8Array.of(18,0,0xa0,0)),4,'zero entity selector is not a terminator');
  assert.equal(dialogueLength(Uint8Array.of(1,0,0xa0,0)),4,'zero extended glyph is not a terminator');
  assert.equal(dialogueLength(Uint8Array.of(3,10,13,0xa0,3,0,0xa1,0)),6,'timed zero ends the string');
  assert.equal(dialogueLength(Uint8Array.of(13,0)),2,'numeric control has no inline operand');
  assert.throws(()=>dialogueLength(Uint8Array.of(18)),/Truncated/);
  assert.throws(()=>dialogueLength(Uint8Array.of(0xa0)),/Unterminated/);
  for(const n of['-1','256','1.5','wat'])assert.throws(()=>encodeDialogue('{delay '+n+'}',base),/must be a byte/);
  const boundary=new Uint8Array(65537);boundary[65535]=0xa0;assert.throws(()=>dialogueLength(boundary,65535),/Unterminated/);
});

test('native numeric controls consume argument bytes without swallowing the following text glyph',async()=>{
  const s=await createCore(base),c=s.cpu;
  for(const [code,size,values]of[[13,1,[0,3,255]],[14,2,[0,1000,65535]],[15,3,[0,1000000,16777215]]])for(const value of values){
    s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=0xc2;c.br[4]=0x58b2;c.br[5]=0x200;c.br[3]=0x7ff;
    put24(s.ram,0x231,0x7f8000);put24(s.ram,0x23d,0x7f8100);s.ram.set([code,0xad,0],0x18000);put24(s.ram,0x18100,value);s.ram[0x213]=10;
    // Stop at the real glyph emitter, after native numeric conversion. No
    // function is patched or substituted in this CPU-level check.
    let n=0;while(((c.r[1]<<16)|c.br[4])!==0xc25dc4&&n++<10000)c.cycle();assert.ok(n<10000);
    assert.equal(u24(s.ram,0x231),0x7f8001,'only the numeric control consumed from text');
    assert.equal(u24(s.ram,0x23d),0x7f8100+size,'argument width');
    assert.equal(u16(s.ram,0x235),0xd4+Number(String(value)[0]));
    assert.equal(s.ram[0x23a],String(value).length);assert.deepEqual([...s.ram.subarray(0x240,0x240+String(value).length)],Array.from(String(value),Number));
  }
});
