import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from './helpers.mjs';
import {decompress} from '../engine/compression.js';
import {u24,fileOffset} from '../engine/rom.js';
import {supportingCast} from '../content/supporting-cast.js';
import {caretaker,onionJar} from '../content/caretaker.js';
import {carnivalCast,carnivalFields} from '../content/carnival.js';

const accepted=JSON.parse(await readFile('art-review/art-pass/supporting-raster-source-manifest.json'));
const built=await build(),actors=[caretaker,onionJar,...supportingCast,...carnivalCast.map(a=>({...a,key:a.key+'-battle'})),...carnivalFields];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

test('active supporting art preserves the visually accepted source banks and every native story role',()=>{
  // The accepted set predates Granny's removal; her retired bank is no longer in the cartridge.
  for(const actor of accepted.actors.filter(a=>a.key!=='granny')){
    const owner=actors.find(a=>a.key===actor.consumers[0].key),graphics=decompress(built.rom,fileOffset(u24(built.rom,0x242000+owner.gfx*3))).bytes;
    assert.equal(graphics.length,actor.expected.graphicsBytes,actor.key+' complete accepted tile bank');
    assert.equal(sha256(graphics),actor.expected.graphicsSha256,actor.key+' accepted source pixels');
    for(const consumer of actor.expected.consumers){
      const a=actors.find(a=>a.key===consumer.key),offset=fileOffset(u24(built.rom,0x242300+a.asm*3));
      assert.equal(sha256(built.rom.slice(offset,offset+consumer.assemblyBytes)),consumer.assemblySha256,consumer.key+' accepted roles, offsets and native IDs');
    }
  }
});
