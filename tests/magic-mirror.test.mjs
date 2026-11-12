import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {magicMirror,magicMirrorResources} from '../content/magic-mirror.js';
import {magicMirrorRaster} from '../assets/raster/magic-mirror-art.js';
import {compileMagicMirror,patchMagicMirror} from '../engine/magic-mirror.js';
import {spriteResourcePools} from '../engine/native-sprites.js';
import {ResourceAllocator,planResources} from '../engine/resource-allocation.js';
import {decompress} from '../engine/compression.js';
import {fileOffset,u16,u24,put16,put24,applyRecords} from '../engine/rom.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {encode} from '../engine/text.js';

const base=new Uint8Array(await readFile(new URL('../.local/chrono-trigger-usa.sfc',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex'),signed=v=>v>127?v-256:v;
const compiled=compileMagicMirror(base);

test('Magic Mirror synchronously reproduces every frozen full-scene binary record',()=>{
  assert.equal(compiled instanceof Promise,false);
  for(const [bytes,hash]of [
    [compiled.model.graphics,'9dff816e7704548a7d2babf198a0e82041071efd7047b60caa7433f880c18834'],
    [compiled.model.compressed,'c7e53dff1bbf56f4fe04ef7bfc0d58e5dd07f92ffa97b2d14feddc0d4c5e60fa'],
    [compiled.model.assemblies[0],'35d2ecf8d541e6a8f383905ab3240e98e8708418833d43d4a9eef373c6d9a3da'],
    [compiled.model.assemblies[1],'0a877a009b3d149757cd527e537b460cd730f338eb637b25a489c7028a702839'],
    [compiled.display.graphics,'bd3c001869a1f5a44eb0979c0b3312a1eed064347575d30318c0eab8be47d5da'],
    [compiled.display.compressed,'d3e216c70b5793297a95540b81a3efb7830912f15820d52777d56f3613d0f942'],
    [compiled.display.assembly,'98d176890155c73497c90956e0e6f2992c8397f1c6f70d59a867bb2d5b58625c'],
    [compiled.palette,'d538beecae729f4bef3b0b737035ab93edc261bbfbdaa54e07f2d8a6732b63a5']])assert.equal(sha(bytes),hash);
});

// Decode native tile words independently of the raster compiler and composite
// at the real signed cell offsets. Overlapping boot cells must agree exactly.
function render(graphics,assembly,frame,cells,origin){
  const pixels=new Uint8Array(96*128),perGroup=cells===12?4:cells;
  for(let c=0;c<cells;c++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const p=frame*cells*10+(Math.floor(c/perGroup)*perGroup*4+(y>>3)*perGroup*2+(c%perGroup)*2+(x>>3))*2,w=u16(assembly,p);
    assert.equal(w&0x8000,0);assert.ok((w&1023)*32<graphics.length);
    const tx=w&0x4000?7-(x&7):x&7;let value=0;
    for(let bit=0;bit<4;bit++)value|=(graphics[(w&1023)*32+(bit>>1)*16+(y&7)*2+(bit&1)]>>(7-tx)&1)<<bit;
    if(!value)continue;
    const xx=origin[0]+signed(assembly[frame*cells*10+cells*8+c*2])+x,yy=origin[1]+signed(assembly[frame*cells*10+cells*8+c*2+1])+y;
    assert.ok(xx>=0&&xx<96&&yy>=0&&yy<128);const at=yy*96+xx;assert.ok(!pixels[at]||pixels[at]===value);pixels[at]=value;
  }
  return pixels;
}

test('all compound layers and eight Display phases retain exact source pixels and intentional blank geometry',()=>{
  const layers=magicMirror.model.actors.map((a,i)=>render(compiled.model.graphics,compiled.model.assemblies[i],0,a.cells,[48,64])),expected=new Uint8Array(96*128),source=magicMirrorRaster.model.frames[0];
  for(let y=0;y<96;y++)for(let x=0;x<48;x++)expected[(y+16)*96+x+24]=parseInt(source[y*48+x],16);
  assert.deepEqual(Uint8Array.from(layers[0],(v,i)=>{assert.ok(!(v&&layers[1][i]));return v||layers[1][i];}),expected);
  for(const [i,a]of magicMirror.model.actors.entries()){
    assert.ok(render(compiled.model.graphics,compiled.model.assemblies[i],1,a.cells,[48,64]).every(v=>!v));
    const p=fileOffset(u24(base,0x242300+a.asm*3)),start=a.cells*18;
    assert.deepEqual(compiled.model.assemblies[i].slice(start),base.slice(p+start,p+a.assemblyBytes));
  }
  const p=fileOffset(u24(base,0x242300+161*3));
  for(let frame=0;frame<8;frame++){
    assert.deepEqual(compiled.display.assembly.slice(frame*40+32,frame*40+40),base.slice(p+frame*40+32,p+frame*40+40));
    const expected=new Uint8Array(96*128),source=magicMirrorRaster.display.frames[frame]??'0'.repeat(512);
    for(let y=0;y<16;y++)for(let x=0;x<32;x++)expected[(y+28)*96+x+40]=parseInt(source[y*32+x],16);
    assert.deepEqual(render(compiled.display.graphics,compiled.display.assembly,frame,4,[48,64]),expected,'Display frame '+frame);
  }
});

test('normal measured allocation relocates two compressed banks and three assemblies without changing native behavior',()=>{
  const pools=spriteResourcePools(base,magicMirrorResources.graphics,magicMirrorResources.assemblies);
  assert.deepEqual(new Set(pools.filter(p=>p.field===0).map(p=>p.id)),new Set([213,168]));
  assert.deepEqual(new Set(pools.filter(p=>p.field===1).map(p=>p.id)),new Set([206,207,161]));
  const spans=pools.map(p=>({next:p.offset,end:p.offset+p.length})),requirements=new Map(),measure=new ResourceAllocator(spans,requirements,null,true);
  patchMagicMirror(base,(bytes,label)=>measure.allocate(bytes.length,label),()=>{});
  const allocator=new ResourceAllocator(spans,requirements,planResources(spans,requirements)),records=[],allocations=[];
  const add=(offset,bytes,label)=>records.push({offset,bytes,label});
  const result=patchMagicMirror(base,(bytes,label)=>{const offset=allocator.allocate(bytes.length,label);add(offset,bytes,label);allocations.push({offset,bytes,label});return offset;},add);
  allocator.finish();assert.equal(allocations.length,5);assert.equal(records.length,15);
  const rom=applyRecords(base,records);
  assert.equal(magicMirror.model.actors[1].short,'','visual-only trim keeps its original blank battle label');
  for(const a of [...magicMirror.model.actors,magicMirror.display])assert.deepEqual(rom.slice(0xc6500+a.enemy*11,0xc6500+(a.enemy+1)*11),encode(a.short,{length:11}));
  for(const [key,family]of [['model',magicMirror.model],['display',magicMirror.display]]){
    const offset=fileOffset(u24(rom,0x242000+family.gfx*3));assert.deepEqual(decompress(rom,offset).bytes,compiled[key].graphics);
    assert.ok(compiled[key].graphics.length<=family.original.graphicsBytes);
  }
  for(const a of result.actors){const offset=fileOffset(u24(rom,0x242300+a.asm*3));assert.equal(offset,a.assemblyAddress);assert.equal(a.graphicsStorage,'compressed');}
  for(const id of [183,190,191]){
    const header=0x24f600+id*10;assert.deepEqual(rom.slice(header,header+10),base.slice(header,header+10));
    const ai=readEnemyAI(base,id);assert.deepEqual(rom.slice(ai.start,ai.start+ai.bytes),base.slice(ai.start,ai.start+ai.bytes));
    for(const [table,stride]of [[0xc4700,23],[0xc5e00,7]])assert.deepEqual(rom.slice(table+id*stride,table+(id+1)*stride),base.slice(table+id*stride,table+(id+1)*stride));
  }
  const npc=0x24f000+134*5;assert.deepEqual(rom.slice(npc,npc+5),base.slice(npc,npc+5));
  for(const id of [115,143,173]){const p=0x240000+u16(base,0x242600+id*2),end=0x240000+u16(base,0x242602+id*2);assert.deepEqual(rom.slice(p,end),base.slice(p,end));}
  const scene=3891788;assert.deepEqual(decompress(rom,scene).bytes,decompress(base,scene).bytes);
  assert.equal(result.decodedBytes,2976);assert.equal(result.originalDecodedBytes,3008);assert.equal(result.extraWramBytes+result.extraVramBytes,0);
});

test('foreign owners, pointer aliases, source geometry and header changes fail before any record or allocation',()=>{
  const changes=[
    b=>{b[0x24f000+255*5]=213;},
    b=>{b[0x24f000+255*5+1]=161;},
    b=>{b[0x24f000+255*5+2]=232;},
    b=>put24(b,0x242000+254*3,u24(b,0x242000+213*3)),
    b=>put24(b,0x242300+254*3,u24(b,0x242300+206*3)),
    b=>put16(b,0x242a00+254*2,u16(b,0x242a00+144*2)),
    b=>{b[0x24f600+191*10+8]^=1;},
    b=>{b[fileOffset(u24(b,0x242300+161*3))+32]^=1;},
    b=>put24(b,0x242300+207*3,u24(b,0x242300+207*3)+1)
  ];
  for(const change of changes){const b=base.slice();change(b);let calls=0;assert.throws(()=>patchMagicMirror(b,()=>{calls++;return 0;},()=>calls++),/Magic Mirror/);assert.equal(calls,0);}
});

test('altered approved raster source is rejected instead of silently resampling a different pose',()=>{
  const original=magicMirrorRaster.model.frames[0];
  try{magicMirrorRaster.model.frames[0]='1'+original.slice(1);assert.throws(()=>compileMagicMirror(base),/approved source frame/);}
  finally{magicMirrorRaster.model.frames[0]=original;}
});
