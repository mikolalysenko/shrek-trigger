import {needsSourceImages} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compress} from '../engine/compression.js';
import {put16,put24} from '../engine/rom.js';
import {nativeSpriteBank,nativeSpriteAtlas,nativeSpriteCells} from '../scripts/native-sprite-view.mjs';
import {dulocTank,tankBodyCells} from '../content/duloc-tank.js';
import {dulocTankSprite} from '../engine/duloc-tank-art.js';

test('native sprite reviews read extended assembly pointers without aliasing original ROM',()=>{
  const rom=new Uint8Array(0x800000),actor={gfx:0,asm:0,palette:0,size:0,frames:1};
  const graphics=new Uint8Array(32);for(let y=0;y<8;y++)graphics[y*2]=255;
  rom.set(compress(graphics),0x300000);put24(rom,0x242000,0xf00000);
  put16(rom,0x242a00,0x100);put16(rom,0x240100,0x03e0);
  const assembly=new Uint8Array(40);assembly.set([240,224,0,224,240,240,0,240],32);
  rom.set(assembly,0x310000);put24(rom,0x242300,0xf10000);
  const expected=nativeSpriteBank(rom,actor),view=nativeSpriteAtlas(expected);
  for(const pointer of[0x400040,0x7d02f0,0x7d0690]){
    rom.set(assembly,pointer);rom.fill(0xa5,pointer&0x3fffff,(pointer&0x3fffff)+assembly.length);
    put24(rom,0x242300,pointer);
    const actual=nativeSpriteBank(rom,actor);
    assert.deepEqual(actual,expected,pointer.toString(16)+' exact extended bank');
    assert.deepEqual(nativeSpriteAtlas(actual),view,'the frame inspector uses the same native cells');
  }
});

test('fixed tank reviews decode all three eight-cell groups and reject fictitious extra poses',{skip:needsSourceImages},async()=>{
  const rom=new Uint8Array(0x400000),actor=dulocTank[0];
  rom.set(await readFile('assets/imagegen/duloc-tank/chassis-draft/graphics.ct-lz'),0x300000);
  rom.set(await readFile('assets/imagegen/duloc-tank/chassis-draft/assembly.bin'),0x310000);
  put24(rom,0x242000+actor.gfx*3,0xf00000);put24(rom,0x242300+actor.asm*3,0xf10000);
  const bank=nativeSpriteBank(rom,actor),source=dulocTankSprite(actor.key,0);assert.equal(bank.cells,24);assert.equal(bank.assembly.length,240);
  for(const cell of nativeSpriteCells(bank,0)){
    const [x,y]=tankBodyCells[cell.cell];assert.equal(cell.x,x-64);assert.equal(cell.y,y-96);
    for(let row=0;row<16;row++)assert.deepEqual(cell.pixels.slice(row*16,(row+1)*16),source.slice((y+row)*128+x,(y+row)*128+x+16));
  }
  assert.throws(()=>nativeSpriteBank(rom,{...actor,frames:2}),/one native frame/);
});
