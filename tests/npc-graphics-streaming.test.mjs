import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {patchNpcGraphicsStreaming,placeNpcGraphicsStreams} from '../engine/npc-graphics-streaming.js';
import {expandHirom} from '../engine/expanded-rom.js';
import {u16,put16,put24} from '../engine/rom.js';
import {compress} from '../engine/compression.js';
import {createCore} from '../scripts/core.mjs';

const base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));

test('NPC and enemy loaders select direct-ROM pointers without consuming heap or changing legacy setup',async()=>{
  const first=base.slice();let cursor=0x3e8000;
  const streams=[{gfx:19,address:0x467a00,bytes:0x600},{gfx:164,address:0x470000,bytes:0x2100}];
  const audit=patchNpcGraphicsStreaming(base,streams,(bytes)=>{const p=cursor;first.set(bytes,p);cursor+=bytes.length;return p;},(p,b)=>first.set(b,p));
  const rom=expandHirom(first),s=await createCore(rom);
  const until=address=>{for(let n=0;n<2000;n++){if(s.cpu.r[1]*65536+s.cpu.br[4]===address&&s.cpu.cyclesLeft===0)return;s.cpu.cycle();}throw Error('Native sprite selector did not rejoin its loader');};
  for(const[kind,id,header,stride,resume,legacy]of[['npc',37,0x24f023,5,0xc0463b,0xc04626],['enemy',151,0x24f600,10,0xc04799,0xc04775]])for(const selected of[true,false]){
    const c=s.cpu,object=10,gfx=selected?(kind==='npc'?19:164):28;
    s.cart.data[header+id*stride]=gfx;s.ram.fill(0xa5);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;
    c.r[0]=0;c.r[1]=0xc0;c.br[4]=audit.helpers.find(h=>h.kind===kind).entry;c.br[5]=0x100;c.br[3]=0x7ff;c.br[1]=0x7777;c.br[2]=0x2345;
    put16(s.ram,0x1bf,id*stride);put16(s.ram,0x16d,object);put16(s.ram,0x171,0x9a20);
    const cache=s.ram.slice(0x920,0x940);until(selected?resume:legacy);
    assert.equal(s.ram[0x1e3],gfx);assert.equal(c.br[3],0x7ff);assert.equal(c.br[5],0x100);assert.equal(c.r[0],0);assert.equal(c.m,true);assert.equal(c.x,false);
    assert.equal(u16(s.ram,0x171),0x9a20);assert.deepEqual(s.ram.slice(0x920,0x940),cache);assert.equal(s.ram[0x1201+object],0xa5,'native cell size stays intact');
    if(selected){const stream=streams.find(s=>s.gfx===gfx);assert.equal(u16(s.ram,0x1280+object),stream.address&65535);assert.equal(s.ram[0x1200+object],stream.address>>16);assert.equal(c.br[1],object);assert.equal(c.br[2],object);}
    else{assert.equal(c.br[0]&255,gfx);assert.equal(c.br[1],id*stride);assert.equal(c.br[2],0x2345);assert.equal(u16(s.ram,0x1280+object),0xa5a5);assert.equal(s.ram[0x1200+object],0xa5);}
  }
});

test('streaming rejects ambiguous IDs, crossing banks and changed native instructions',()=>{
  const valid={gfx:19,address:0x460000,bytes:1024},allocate=()=>0x3e8000,add=()=>{};
  for(const streams of[[valid,valid],[{...valid,gfx:3}],[{...valid,address:0x467ff0}],[{...valid,address:0x7e0000}],[{...valid,bytes:0}],[{...valid,bytes:33}]])assert.throws(()=>patchNpcGraphicsStreaming(base,streams,allocate,add),/Invalid|exceed/);
  const changed=base.slice();changed[0x461e]^=1;assert.throws(()=>patchNpcGraphicsStreaming(changed,[valid],allocate,add),/boundary changed/);
});

test('raw sprite placement retains compressed resources and checks every emitted owner and extended span',()=>{
  const source=Uint8Array.from({length:1024},(_,i)=>i*17&255),packed=compress(source),pointer=new Uint8Array(3);put24(pointer,0,0xf00000);
  const resource={offset:0x300000,bytes:packed,label:'fixture graphics'},header={offset:0x24f000+44*5,bytes:Uint8Array.of(249,231,138,1,0),label:'fixture header'};
  const records=[resource,{offset:0x242000+249*3,bytes:pointer,label:'fixture pointer'},header],allocations=[{offset:resource.offset,length:packed.length,label:resource.label}],pools=[{next:0x467e00,end:0x468000},{next:0x470000,end:0x478000}];
  const place=(rs=records,ps=pools)=>placeNpcGraphicsStreams(base,rs,allocations,[249],ps),saved=structuredClone(records),result=place();
  assert.equal(result.records[0].offset,0x470000);assert.deepEqual(result.records[0].bytes,source);assert.deepEqual(records,saved);assert.deepEqual(pools,[{next:0x467e00,end:0x468000},{next:0x470000,end:0x478000}]);
  assert.deepEqual(result.streams[0].owners,[{kind:'npc',id:37,assembly:231,palette:138,size:0}]);assert.equal(result.freeBytes,0x7e00);
  for(const size of [1,2]){
    const mixed=place([...records,{offset:0x24f600+151*10,bytes:Uint8Array.of(249,156,198,1,size)}]);
    assert.equal(mixed.streams[0].owners.find(o=>o.kind==='enemy'&&o.id===151).size,size);
    assert.deepEqual(mixed.records[0].bytes,source);
  }
  assert.throws(()=>place([...records,{offset:0x24f600+151*10,bytes:Uint8Array.of(249,156,198,1,3)}]),/twelve-cell owners/);
  assert.throws(()=>place([...records,{offset:0x242000+249*3+1,bytes:Uint8Array.of(0)}]),/Ambiguous/);
  assert.throws(()=>place(records,[{next:0x467e00,end:0x470000}]),/Invalid extended/);
  assert.throws(()=>place(records,[pools[1],pools[1]]),/Overlapping/);
  assert.throws(()=>place([...records,{offset:0x470200,bytes:new Uint8Array(32)}]),/overlaps an existing/);
  assert.throws(()=>place(records,[pools[0]]),/exceed extended/);
  assert.throws(()=>placeNpcGraphicsStreams(base,records,[],[249],pools),/no owned resource/);
});

test('compressed resources in extended banks require exact ownership and cannot cross mirrors',()=>{
  const source=Uint8Array.from({length:1024},(_,i)=>i*17&255),packed=compress(source),gfx=249;
  const fixture=(address,bytes=packed)=>{
    const pointer=new Uint8Array(3);put24(pointer,0,address);
    const resource={offset:address,bytes,label:'extended fixture'};
    return {records:[resource,{offset:0x242000+gfx*3,bytes:pointer},
      {offset:0x24f000+44*5,bytes:Uint8Array.of(gfx,231,138,1,0)}],
      allocations:[{offset:address,length:bytes.length,label:resource.label}]};
  };
  const pools=[{next:0x470000,end:0x478000}],run=({records,allocations})=>placeNpcGraphicsStreams(base,records,allocations,[gfx],pools);
  for(const address of[0x400000,0x467ffe-packed.length+2,0x7d8000-packed.length]){
    const valid=fixture(address),result=run(valid);
    assert.equal(result.streams[0].compressedSource,address);assert.deepEqual(result.records[0].bytes,source);
    assert.throws(()=>run({...valid,allocations:[]}),/no owned resource/);
    assert.throws(()=>run({...valid,allocations:[{...valid.allocations[0],label:'unrelated'}]}),/no owned resource/);
    assert.throws(()=>run({...valid,allocations:[{...valid.allocations[0],length:packed.length+1}]}),/no owned resource/);
  }
  for(const address of[0x3fffff,0x408000,0x7e0000])assert.throws(()=>run(fixture(address)),/outside owned ROM/);
  assert.throws(()=>run(fixture(0x467fff)),/crosses its owned lower-half bank/);
});
