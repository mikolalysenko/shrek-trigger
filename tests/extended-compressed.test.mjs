import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extendedDataAllocator,cartridgeDataAddress,cartridgeOffset,expandHirom} from '../engine/expanded-rom.js';
import {compress,decompress} from '../engine/compression.js';
import {createCore} from '../scripts/core.mjs';

test('extended packet allocation owns complete lower-half spans and rejects mirrors, overlaps and exhausted banks',()=>{
 const pools=[{next:0x407ff1,end:0x408000},{next:0x410000,end:0x418000}],saved=structuredClone(pools),a=extendedDataAllocator(pools);
 assert.equal(a.allocate(new Uint8Array(14),'tail'),0x407ff2);assert.equal(a.allocate(new Uint8Array(33),'next'),0x410000);assert.deepEqual(pools,saved);
 assert.equal(cartridgeDataAddress(0x300001),0xf00001);assert.equal(cartridgeDataAddress(0x410001),0x410001);
 for(const address of[-1,0x408000,0x7e0000,1.5])assert.throws(()=>cartridgeDataAddress(address),/address/);
 assert.throws(()=>extendedDataAllocator([pools[1],pools[1]]),/Overlapping/);
 assert.throws(()=>extendedDataAllocator([{next:0x408000,end:0x410000}]),/Invalid/);
 assert.throws(()=>a.allocate(new Uint8Array(1),'tail'),/Invalid/);
 assert.throws(()=>a.allocate(new Uint8Array(0x8001),'too large'),/Invalid/);
 assert.throws(()=>a.allocate(new Uint8Array(0x8000),'full'),/exceed/);
});

test('the unmodified cartridge decompressor reads both LZ modes from first and last extended data banks',async()=>{
 const base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));
 const sample=Uint8Array.from({length:8192},(_,i)=>(i*i+(i>>6)*37)&255);
 for(const mode of[11,12])for(const bank of[0x40,0x46,0x7d]){
  const packed=compress(sample,{mode}),address=bank*65536+(bank===0x40?0:0x8000-packed.length),first=base.slice();
  assert.deepEqual(decompress(packed,0).bytes,sample);
  first.set([0x78,0xc2,0x30,0xa9,address&255,address>>8&255,0x8d,0,3,0xa9,0,0x40,0x8d,3,3,0xe2,0x20,0xa9,bank,0x8d,2,3,0xa9,0x7f,0x8d,5,3,0x22,0x57,5,0xc3,0xdb],0x308000);
  const rom=expandHirom(first,[{offset:address,bytes:packed,label:'native compressed fixture'}]),s=await createCore(rom);
  assert.equal(cartridgeOffset(address,rom),address);assert.equal(cartridgeOffset(address,base),address&0x3fffff);
  s.cpu.reset();s.cpu.r[1]=0xf0;s.cpu.br[4]=0x8000;s.cpu.br[3]=0x1ff;s.cpu.br[5]=0;s.cpu.e=false;s.cpu.cyclesLeft=0;
  s.ram.fill(0xa5,0x13fff,0x14000+sample.length+1);let cycles=0;while(!s.cpu.stopped&&cycles++<4000000)s.cpu.cycle();
  assert.ok(s.cpu.stopped);assert.deepEqual(s.ram.slice(0x14000,0x14000+sample.length),sample);assert.equal(s.ram[0x13fff],0xa5);assert.equal(s.ram[0x14000+sample.length],0xa5);
 }
});
