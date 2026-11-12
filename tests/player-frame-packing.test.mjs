import test from 'node:test';
import assert from 'node:assert/strict';
import {packPlayerFrames} from '../engine/player-frame-packing.js';
import {build} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {u24,put16} from '../engine/rom.js';

const built=await build();

test('frame sharing preserves complete tile words, mirrored flags, coordinates and logical frame order',()=>{
  const source=new Uint8Array(4*40);source.fill(12,0,40);source[5]=0x40;
  source.fill(24,40,80);source.set(source.slice(0,40),80);source.set(source.slice(40,80),120);source[159]=31;
  const before=source.slice(),packed=packPlayerFrames(source);
  assert.deepEqual(packed.frameMap,[0,1,0,2]);assert.equal(packed.bytes.length,120);
  for(let f=0;f<4;f++)assert.deepEqual(packed.bytes.slice(packed.frameMap[f]*40,packed.frameMap[f]*40+40),source.slice(f*40,f*40+40));
  assert.deepEqual(source,before);assert.deepEqual(packPlayerFrames(source,{compact:false}).bytes,source);
  assert.throws(()=>packPlayerFrames(new Uint8Array(39)),/Invalid player frame table/);
  assert.ok(built.audit.resources.playerFramePacking.savedAssemblyBytes>25000);
});

test('native shared-frame lookups preserve CPU context and original cached IDs in field, battle and menus',async()=>{
  const s=await createCore(built.rom),c=s.cpu;
  const start=(pc,db,dp,x8=false)=>{
    s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=x8;c.i=true;c.d=false;c.v=true;c.c=true;c.cyclesLeft=0;
    c.r[0]=db;c.r[1]=pc>>16;c.br[4]=pc&65535;c.br[5]=dp;c.br[3]=0x7ff;c.br[0]=0xbe73;
    c.br[1]=x8?0x35:0x35a0;c.br[2]=x8?0x67:0x4567;
  };
  const until=pc=>{let n=0;while(((c.r[1]<<16)|c.br[4])!==pc&&n++<10000)c.cycle();assert.ok(n<10000,'native helper returns');};
  const context=(db,dp,x,x8,y)=>{
    assert.equal(c.r[0],db);assert.equal(c.br[5],dp);assert.equal(c.br[3],0x7ff);
    assert.equal(c.br[1],x);assert.equal(c.br[2],y);assert.equal(c.x,x8);assert.equal(c.m,true);
    assert.equal(c.c,true);assert.equal(c.v,true);assert.equal(c.d,false);assert.equal(c.br[0]>>8,0xbe);
  };
  for(let id=0;id<7;id++)for(const frame of id===4?Array.from({length:built.audit.characters[id].frameCount},(_,i)=>i):[0,1,17,70,120,built.audit.characters[id].frameCount-1]){
    const address=u24(built.rom,0x242300+id*3),stored=built.audit.characters[id].assembly.frameMap[frame];
    for(const [entry,returned]of[[0xc0cc22,0xc0cc2d],[0xc0cdca,0xc0cdd5]])for(const x8 of[false,true]){
      start(entry,0,0x100,x8);c.br[1]=30;put16(s.ram,0x139e,address&65535);s.ram[0x131e]=address>>16;s.ram[0xf1f]=frame;
      until(returned);
      assert.equal(s.read(0x4216)|s.read(0x4217)<<8,stored*40);assert.equal(s.ram[0xf1f],frame);context(0,0x100,30,x8,x8?0x67:0x4567);
    }
    for(const source of[address,...built.audit.resources.playerFramePacking.menuAssemblyAliases.filter(a=>a.id===id).map(a=>a.address)])for(const x8 of[false,true]){
      start(0xc2f707,0x7e,0x1900,x8);put16(s.ram,0x1907,source&65535);s.ram[0x1909]=source>>16;s.ram[0x1903]=frame;
      until(0xc2f70b);s.write(0x4203,40);assert.equal(s.read(0x4216)|s.read(0x4217)<<8,stored*40);
      context(0x7e,0x1900,x8?0x35:0x35a0,x8,x8?0x67:0x4567);assert.equal(c.br[0],0xbe73);assert.equal(s.ram[0x1903],frame);
    }
    for(const slot of[0,1,2,3,10]){
      start(0xc11c7a,0x7e,0);s.ram[0x9679]=slot;s.ram[0x967b]=frame;
      put16(s.ram,0x1c78+slot*3,address&65535);s.ram[0x1c7a+slot*3]=address>>16;
      until(0xc11c7f);
      assert.equal(s.ram[0xa5],stored);assert.equal(c.br[0]&255,stored);assert.equal(s.ram[0x967b],frame);
      context(0x7e,0,0x35a0,false,0x4567);
    }
  }
  start(0xc0cc22,0,0x100);c.br[1]=30;put16(s.ram,0x139e,0x1234);s.ram[0x131e]=0xdc;s.ram[0xf1f]=73;
  until(0xc0cc2d);assert.equal(s.read(0x4216)|s.read(0x4217)<<8,73*40,'unrelated NPC assembly is untouched');
  start(0xc11c7a,0x7e,0);s.ram[0x9679]=3;s.ram[0x967b]=73;put16(s.ram,0x1c81,0x1234);s.ram[0x1c83]=0xdc;
  until(0xc11c7f);assert.equal(s.ram[0xa5],73,'unrelated enemy assembly is untouched');
});
