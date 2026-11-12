import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from './helpers.mjs';
import {zealSpiritScenes,carnivalCast} from '../content/carnival.js';
import {decompress} from '../engine/compression.js';
import {u16,u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {rasterArtInfo} from '../engine/raster-art.js';

const b=await build();
test('all thirteen Zeal and Ocean Palace spirit loads select ICP or Great Milenko native artwork',()=>{
  let loads=0;
  for(const scene of zealSpiritScenes){
    assert.equal(u16(b.rom,0x360000+scene.location*14+8),scene.eventId);
    const event=decompress(b.rom,cartridgeOffset(u24(b.rom,0x3cf9f0+scene.eventId*3),b.rom)).bytes;
    for(const [offset,enemy]of scene.loads){
      assert.deepEqual([...event.slice(offset+1,offset+3)],[0x83,enemy],scene.location+':'+offset);
      const actor=carnivalCast.find(a=>a.enemy===enemy),p=0x24f600+enemy*10;
      assert.ok(actor);assert.deepEqual([...b.rom.slice(p,p+3)],[actor.gfx,actor.asm,actor.palette]);
      assert.ok(rasterArtInfo(actor.key),'a source-based clown/fusion bank is active');loads++;
    }
  }
  assert.equal(loads,13);
});
