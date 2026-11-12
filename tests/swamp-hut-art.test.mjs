import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,needsSourceImages} from './helpers.mjs';
import {decompress} from '../engine/compression.js';
import {u16,u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {swampHutArt} from '../content/swamp-hut-art.js';
import {convertSwampHut,hutAllowed} from '../assets/imagegen/swamp-hut/convert.mjs';

const built=await build();

test('the swamp home is reproducible from its image-generation source and stays in the native footprint',{skip:needsSourceImages},async()=>{
  assert.equal(convertSwampHut(built.base),await readFile(new URL('../content/swamp-hut-art.js',import.meta.url),'utf8'));
  swampHutArt.rows.forEach((row,y)=>{for(let x=0;x<32;x++)if(!hutAllowed(x,y))assert.equal(row[x],'0',`empty native cell at ${x},${y}`);});
});

test('only the swamp home metatiles of the present-day map move to the foliage palette row',()=>{
  const read=rom=>decompress(rom,cartridgeOffset(u24(rom,0x6ff00),rom)).bytes;
  const before=read(built.base),after=read(built.rom),hut=new Set([0x9d,0x9e,0xad,0xae]);
  assert.equal(after.length,before.length);
  for(let i=0;i<before.length;i+=2){
    const metatile=i>>3,a=u16(before,i),b=u16(after,i);
    if(hut.has(metatile)&&a)assert.equal(b,(a&~0x1c00)|swampHutArt.paletteRow<<10);
    else assert.equal(b,a,'world assembly word '+i);
  }
});
