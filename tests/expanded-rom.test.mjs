import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {expandHirom,cartridgeOffset,HIROM_BYTES,EXHIROM_BYTES} from '../engine/expanded-rom.js';
import {patchPlayerGraphicsStreaming} from '../engine/player-graphics-streaming.js';
import {makeBps,crc32} from '../engine/bps.js';
import {u16,put16,put24} from '../engine/rom.js';
import {createCore} from '../scripts/core.mjs';
import {readBps} from './bps-reader.mjs';

const base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));

test('ExHiROM preserves upper mirrors, maps both ROM halves, and limits SRAM to20–3F/A0–BF',async()=>{
  const records=[{offset:0x400000,bytes:Uint8Array.of(0x12,0x34),label:'first'},{offset:0x7d7ffe,bytes:Uint8Array.of(0x56,0x78),label:'last'}];
  const rom=expandHirom(base,records),s=await createCore(rom);
  assert.equal(rom.length,EXHIROM_BYTES);assert.equal(s.cart.isExhirom,true);
  for(let bank=0;bank<64;bank++)assert.deepEqual(rom.slice(bank*65536+0x8000,(bank+1)*65536),rom.slice(HIROM_BYTES+bank*65536+0x8000,HIROM_BYTES+(bank+1)*65536));
  for(const bank of[0x00,0x20,0x3f,0x40,0x41,0x7d,0x80,0xa0,0xbf,0xc0,0xd5,0xff])for(const address of[0x8000,0xbfff,0xfffc]){
    const expected=rom[cartridgeOffset(bank*65536+address,rom)];assert.equal(s.read(bank*65536+address),expected,bank.toString(16)+':'+address.toString(16));
  }
  assert.equal(s.read(0x400000),0x12);assert.equal(s.read(0x7d7fff),0x78);
  assert.equal(s.read(0xc00000),base[0]);assert.equal(s.read(0xfd7fff),base[0x3d7fff]);
  s.cart.sram.fill(0xa5);
  for(const bank of[0x20,0x3f,0xa0,0xbf]){s.write(bank*65536+0x6107,bank);assert.equal(s.read(bank*65536+0x6107),bank);}
  for(const bank of[0,0x1f,0x40,0x7d,0x80,0x9f,0xc0,0xff]){const saved=s.cart.sram.slice();s.write(bank*65536+0x6107,0x5a);assert.deepEqual(s.cart.sram,saved,'no SRAM alias in bank '+bank.toString(16));}
  const sum=rom.reduce((n,b)=>(n+b)&65535,0);
  for(const header of[0xffc0,0x40ffc0]){assert.equal(rom[header+21],0x35);assert.equal(rom[header+23],13);assert.equal(u16(rom,header+30),sum);assert.equal(u16(rom,header+28),sum^65535);}
  for(const [offset,bytes]of[[0x3fffff,1],[0x407fff,2],[0x408000,1],[0x7e0000,1]])assert.throws(()=>expandHirom(base,[{offset,bytes:new Uint8Array(bytes),label:'bad'}]),/owned lower-half/);
  assert.throws(()=>expandHirom(base,[records[0],records[0]]),/Overlapping/);
});

test('native tile copier handles extended banks and retains D5, registers, stack and WRAM-port semantics',async()=>{
  const core=base.slice(),address=0x3e8000;
  patchPlayerGraphicsStreaming(base,(bytes)=>{core.set(bytes,address);return address;},(offset,bytes)=>core.set(bytes,offset));
  const rom=expandHirom(core),s=await createCore(rom);
  const until=pc=>{for(let n=0;n<10000;n++){if(s.cpu.r[1]*65536+s.cpu.br[4]===pc&&s.cpu.cyclesLeft===0)return;s.cpu.cycle();}throw Error('tile copier did not return');};
  for(const [bank,source,tile]of[[0x40,0,0],[0x41,0x120,17],[0x7d,0,1023],[0xd5,0,2047]])for(const dp of[0,0x100])for(const db of[0,0x80]){
    const start=(source+tile*32)&65535,dest=0x4320,expected=Uint8Array.from({length:32},(_,i)=>(i*19+tile)&255);
    s.cart.data.set(expected,cartridgeOffset(bank*65536+start,rom));
    s.ram.fill(0xa5);const c=s.cpu;c.reset();c.e=false;c.m=false;c.x=false;c.i=true;c.d=false;c.cyclesLeft=0;
    c.r[0]=db;c.r[1]=0xc0;c.br[4]=0xe687;c.br[0]=tile;c.br[1]=0x9876;c.br[2]=0x4567;c.br[3]=0x7ff;c.br[5]=dp;
    put24(s.ram,dp+0xcd,bank*65536+source);put16(s.ram,dp+0xd0,dest);s.write(0x2183,1);
    until(0xc0e738);
    assert.deepEqual(s.ram.slice(0x10000+dest,0x10000+dest+32),expected);
    assert.equal(s.ram[0x10000+dest-1],0xa5);assert.equal(s.ram[0x10000+dest+32],0xa5);
    assert.equal(c.br[1],start);assert.equal(c.br[2],0x4567);assert.equal(c.br[3],0x7ff);assert.equal(c.br[5],dp);assert.equal(c.r[0],db);assert.equal(c.m,false);assert.equal(c.x,false);
    s.write(0x2180,0x69);assert.equal(s.ram[0x10000+dest+32],0x69,'native epilogue advances the WRAM port');
  }
});

test('BPS reconstructs resized cartridges with source reads and mirror copies; all CRCs detect corruption',()=>{
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  for(const length of[1,127,128,129,16384,32769]){
    const source=Uint8Array.from({length},(_,i)=>(i*37+123)&255),target=new Uint8Array(length*2);target.set(source);target.set(source,length);
    target[0]^=255;target[length-1]^=31;target[length+Math.floor(length/2)]^=255;
    const patch=makeBps(source,target);assert.deepEqual(readBps(source,patch).target,target);
    const corrupt=patch.slice();corrupt[corrupt.length-1]^=1;assert.throws(()=>readBps(source,corrupt),/patch CRC/);
    const wrong=source.slice();wrong[0]^=1;assert.throws(()=>readBps(wrong,patch),/source CRC/);
  }
  const target=expandHirom(base,[{offset:0x400010,bytes:Uint8Array.of(12,34,56),label:'new art'}]);
  const patch=makeBps(base,target),decoded=readBps(base,patch);
  assert.deepEqual(decoded.target,target);assert.ok(decoded.commands[0]>0&&decoded.commands[3]>0);assert.ok(patch.length<256,'mirrors require copy commands, not embedded original ROM');
});
