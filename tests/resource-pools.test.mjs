import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {replacedPacketPools,replacedMusicPools,coalesceReclaimedPools} from '../engine/resource-pools.js';
import {spriteResourcePools} from '../engine/native-sprites.js';
import {u24,put24} from '../engine/rom.js';

const base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));

test('adjacent reclaimed spans combine without crossing a bank or claiming a gap',()=>{
  const spans=[{next:0x120080,end:0x120100},{next:0x11ff80,end:0x120000},{next:0x120000,end:0x120080},{next:0x120101,end:0x120200},{next:0x120200,end:0x120200}];
  const original=structuredClone(spans);
  assert.deepEqual(coalesceReclaimedPools(spans),[{next:0x11ff80,end:0x120000},{next:0x120000,end:0x120100},{next:0x120101,end:0x120200}]);
  assert.deepEqual(spans,original,'ownership evidence is not mutated');
  assert.throws(()=>coalesceReclaimedPools([{next:0x11fff0,end:0x120010}]),/crosses a bank/);
  assert.throws(()=>coalesceReclaimedPools([{next:16,end:32},{next:31,end:40}]),/overlap/);
});

test('replaced cinematic packets exclude aliases, raw palettes and padding',()=>{
  const pools=replacedPacketPools(base),code=pools.find(p=>p.pointer===0x3e0003);
  assert.equal(code.offset,0x31313);assert.equal(code.length,26393);
  assert.equal(code.decodedBytes,34175);
  assert.ok(!pools.some(p=>p.pointer===0x3e0048),'conservative repeated title pointer is retained');
  assert.ok(!pools.some(p=>p.pointer===0x3e00a5),'raw ending palette is not a packet');
  const aliased=base.slice();put24(aliased,0x3ff900,u24(base,0x3e0003));
  assert.ok(!replacedPacketPools(aliased).some(p=>p.pointer===0x3e0003),'a second pointer excludes the packet');
});

test('a sparse next assembly pointer cannot claim unrelated intervening banks',()=>{
  assert.deepEqual(spriteResourcePools(base,[],[208]),[],'final boss source assembly has a large unowned gap');
  assert.deepEqual(spriteResourcePools(base,[],[50]),[],'the mounted enemy is the final assembly pointer, with no successor proving an extent');
  const [ward]=spriteResourcePools(base,[],[223]);assert.equal(ward.length,120);
});

test('retired music packets require unique pointer ownership and exclude the following data',()=>{
  const pools=replacedMusicPools(base);
  assert.deepEqual(pools.map(p=>[p.id,p.offset,p.length]),[[81,0xbe88f,1426],[82,0xbee21,835]]);
  assert.equal(pools.at(-1).offset+pools.at(-1).length,0xbf164);
  const aliased=base.slice();put24(aliased,0x3ff900,u24(base,pools[0].pointer));
  assert.deepEqual(replacedMusicPools(aliased).map(p=>p.id),[82]);
});
