import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {placePlayerGraphics,PlayerGraphicsCapacityError} from '../engine/player-graphics-packing.js';
import {cartridgeOffset,EXHIROM_BYTES} from '../engine/expanded-rom.js';
import {makeCharacterRecords} from '../engine/sprites.js';
import {u24,put24} from '../engine/rom.js';

const base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));
const current=()=>Array.from({length:7},(_,id)=>makeCharacterRecords(base,id,{allowGrowth:true}));
// Freeze the measured 4 MiB placement fixture while artwork evolves. These
// tests exercise ownership, bank boundaries and reclaiming, not sprite art.
const compile=()=>current().map((actor,id)=>{
  const size=[31104,23520,21216,16512,38208,27200,26400][id],bytes=new Uint8Array(size);
  bytes.set(actor.records[0].bytes.subarray(0,size));actor.records[0].bytes=bytes;actor.audit.bytes=size;return actor;
});

test('oversized Puss artwork moves Donkey within their owned D3 region and preserves every byte',()=>{
  const actors=compile(),puss=actors[4],source=puss.records[0].bytes;
  const expanded=new Uint8Array(32832);expanded.set(source.subarray(0,expanded.length));expanded.fill(0x5a,Math.min(source.length,expanded.length));
  puss.records[0].bytes=expanded;puss.audit.bytes=expanded.length;
  const result=placePlayerGraphics(base,actors),placement=result.audit.find(a=>a.id===2);
  assert.equal(placement.offset,0x138040);assert.equal(placement.bank,0xd3);
  assert.equal(u24(result.records.find(r=>r.offset===0x242006).bytes,0),0xd38040);
  for(const a of actors){
    const placed=result.audit.find(p=>p.id===a.audit.id),record=result.records.find(r=>r.offset===placed.offset);
    assert.deepEqual(record.bytes,a.records[0].bytes,'tile order and indexed pixels survive relocation');
    assert.ok(record.offset+record.bytes.length<=placed.offset+placed.capacity);
    assert.equal(record.offset>>16,(record.offset+record.bytes.length-1)>>16);
    for(const pool of result.pools)assert.ok(pool.next>=record.offset+record.bytes.length||pool.end<=record.offset,'only unoccupied bytes are reclaimed');
  }
  assert.equal(result.audit.find(a=>a.id===4).capacity,32832);
  assert.equal(placement.offset+placement.capacity,0x13e280,'the next source allocation remains reserved');
});

test('player placement rejects excess combined capacity and additional pointer owners',()=>{
  const actors=compile();actors[4].records[0].bytes=new Uint8Array(0x10000);actors[4].audit.bytes=0x10000;
  assert.throws(()=>placePlayerGraphics(base,actors),/jointly owned/);
  const aliased=base.slice();put24(aliased,0x242000+255*3,u24(base,0x242000+4*3));
  assert.throws(()=>placePlayerGraphics(aliased,compile()),/aliased/);
});

test('reclaimed graphics tails begin after the final complete native tile',()=>{
  const result=placePlayerGraphics(base,compile());
  let subpageBytes=0;
  for(const a of result.audit){
    const end=a.offset+a.bytes,limit=a.offset+a.capacity;
    assert.equal(a.bytes%32,0,'a complete tile stream never ends within a tile');
    const tail=result.pools.find(p=>p.next===end&&p.end===limit);
    assert.ok(tail,`actor ${a.id} releases every byte after its final tile`);
    subpageBytes+=Math.min(limit,(end+255)&~255)-end;
  }
  assert.ok(subpageBytes>0,'the fixture exercises formerly stranded subpage tails');
});

test('a full two-weapon Puss bank moves Donkey into owned D4 space without changing native tile indices',()=>{
  const actors=compile();
  for(const[id,size]of[[4,38208],[5,27200],[6,26400]]){
    const expanded=new Uint8Array(size);expanded.set(actors[id].records[0].bytes);expanded.fill(0x5a,actors[id].audit.bytes);
    actors[id].records[0].bytes=expanded;actors[id].audit.bytes=size;
  }
  const result=placePlayerGraphics(base,actors),puss=result.audit.find(a=>a.id===4),donkey=result.audit.find(a=>a.id===2);
  assert.equal(puss.offset,0x130000);assert.equal(donkey.bank,0xd4);
  assert.equal(result.audit.filter(a=>a.bank!==(0xc0|(a.source>>16))).length,1,'only one actor changes banks');
  for(const a of result.audit){
    assert.deepEqual(result.records.find(r=>r.offset===a.offset).bytes,actors[a.id].records[0].bytes);
    assert.equal(a.offset>>16,(a.offset+a.bytes-1)>>16);
    for(const b of result.audit)if(a!==b)assert.ok(a.offset+a.bytes<=b.offset||b.offset+b.bytes<=a.offset);
    for(const p of result.pools)assert.ok(p.next>=a.offset+a.bytes||p.end<=a.offset);
  }
  assert.ok(result.pools.some(p=>p.end===0x13e280&&p.next>=0x130000+38208),'former Donkey span is safely reclaimed');
});

test('expanded placement retains the complete Pinocchio bank and only reclaims redirected player allocations',()=>{
  const actors=compile(),pino=actors[3],bytes=new Uint8Array(30912);bytes.set(pino.records[0].bytes);pino.records[0].bytes=bytes;pino.audit.bytes=bytes.length;
  assert.throws(()=>placePlayerGraphics(base,actors),PlayerGraphicsCapacityError);
  const result=placePlayerGraphics(base,actors,{extended:true}),rom={length:EXHIROM_BYTES};
  assert.equal(result.audit.find(a=>a.id===4).offset,0x130000,'weapon selectors retain Puss address');
  assert.deepEqual(result.extended.actors.slice().sort(),[0,1,2,3,5,6]);
  for(const placed of result.audit){
    const data=result.records.find(r=>r.offset===placed.offset);assert.deepEqual(data.bytes,actors[placed.id].records[0].bytes);
    if(placed.extended){
      assert.ok(placed.offset>=0x400000&&placed.offset+placed.bytes<=0x7d8000);
      assert.ok((placed.offset&65535)+placed.bytes<=0x8000,'complete actor stays in an owned lower-half bank');
      const pointer=result.records.find(r=>r.offset===0x242000+placed.id*3);assert.equal(cartridgeOffset(u24(pointer.bytes,0),rom),placed.offset);
    }
    for(const p of result.pools)assert.ok(p.next>=placed.offset+placed.bytes||p.end<=placed.offset);
    for(const other of result.audit)if(other!==placed)assert.ok(placed.offset+placed.bytes<=other.offset||other.offset+other.bytes<=placed.offset);
  }
  const original=result.audit.find(a=>a.id===3).source;
  assert.ok(result.pools.some(p=>p.next<=original&&p.end>=original+actors[3].audit.sourceCapacity),'complete redirected Pinocchio allocation is reclaimable');
});

test('moving Farquaad retains the absolute blank tile used to clear cinematic callbacks',()=>{
  const result=placePlayerGraphics(base,compile(),{extended:true});
  assert.ok(!result.pools.some(p=>p.next<0x120020&&p.end>0x120000));
  assert.deepEqual(result.sharedData,[{offset:0x120000,length:32,label:'cinematic callback zero source'}]);
  const changed=base.slice();changed[0x120000]=1;
  assert.throws(()=>placePlayerGraphics(changed,compile(),{extended:true}),/Shared cinematic zero tile/);
  const actors=compile();actors[6].records[0].bytes[0]=1;
  assert.throws(()=>placePlayerGraphics(base,actors),/overwrite the shared cinematic zero tile/);
});
