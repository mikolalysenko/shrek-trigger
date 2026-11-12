import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {build} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {put16,u16} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {fartGraphics,fartCloud} from '../engine/swamp-spin-art.js';
import {encode,encodeDialogue} from '../engine/text.js';
const b=await build();
function start(s,pc){
  const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=pc>>16;c.br[4]=pc&65535;c.br[5]=0;c.br[3]=0x7ff;
}
function until(s,pc){let n=0;while((s.cpu.r[1]<<16|s.cpu.br[4])!==pc&&n++<100000)s.cpu.cycle();assert.ok(n<100000,'native routine returned');}
test('Fart alone adds poison; original damage, MP, targets and all combo records are preserved',async()=>{
  const s=await createCore(b.rom),source=b.base.slice(0xc214b,0xc2157);
  for(const tech of[1,2,57,58,79,90,112])for(const participant of[0,1,2]){
    start(s,0xc1d5fd);s.ram.set(source,0xaee6);put16(s.ram,0xb2c3,tech*11);s.ram[0xb2c7]=participant;s.cpu.c=true;
    until(s,0xc1d601);const expected=source.slice();if(tech===1){expected[1]=254;expected[2]=64;expected[7]|=4;}
    assert.deepEqual(s.ram.slice(0xaee6,0xaef2),expected);assert.equal(s.cpu.br[0],participant);assert.equal(s.cpu.br[1],participant);assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.c,true);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);
  }
  for(const[start,end]of[[0xc1acb,0xc1beb],[0xc1beb,0xc247b],[0xc253b,0xc2580]])assertRevisedBytes(b.rom,b.base,start,end);
});
test('Fart has its native name and help text and never changes a shared combo description',()=>{
 assert.deepEqual(b.rom.slice(0xc15cf,0xc15da),encode('Fart',{length:11}));
 const help=0xc0000+u16(b.rom,0xc3a09+2),line=encodeDialogue('Gas nearby foes / 25% poison{null}',b.base);
 assert.deepEqual(b.rom.slice(help,help+line.length),line);
 // Every technique owns its help string after the repack; none is shared with Fart's.
 for(let id=2;id<128;id++)assert.notEqual(u16(b.rom,0xc3a09+id*2),u16(b.rom,0xc3a09+2),`help pointer ${id}`);
});
test('the faster sprite scheduler preserves the CPU and only removes the two-frame floor for Fart rotation',async()=>{
 const s=await createCore(b.rom);
 for(const slot of[0,1,2])for(const tech of[1,2,57])for(const spinning of[false,true]){
  start(s,0xc1430a);s.cpu.br[0]=0x7b37;s.cpu.br[1]=1234;s.cpu.br[2]=5678;s.cpu.c=true;
  s.ram[0xae91]=slot;s.ram[0xae92]=2;s.ram[0xae93]=tech;s.ram[0x9679]=slot;
  put16(s.ram,0xa1fe+slot*2,spinning?0xa8cc:0xa800);put16(s.ram,0xa1e8+slot*2,0x30cc);s.ram[0x80]=8;
  until(s,0xc1430f);const expected=tech===1&&spinning?1:2;assert.equal(s.ram[0xa012],expected);assert.equal(s.cpu.br[0],0x7b00|expected);assert.equal(s.cpu.br[1],1234);assert.equal(s.cpu.br[2],5678);assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.c,true);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);
 }
});
test('gas tiles execute through the native decoder, use four cells and reuse Shrek colors in every party slot',async()=>{
 const s=await createCore(b.rom),source=await createCore(b.base),gfx=fartGraphics();
 for(const slot of[0,1,2])for(const tech of[1,2,57])for(const chunk of[218,219,220,239]){
  for(const core of[s,source]){start(core,0xcd1368);core.cpu.br[1]=chunk;core.ram[0xae91]=slot;core.ram[0xae92]=2;core.ram[0xae93]=tech;put16(core.ram,0x67,32);until(core,0xcd13c9);}
  assert.deepEqual(s.ram.slice(0x2d00,0x3100),tech===1&&chunk<220?gfx.tiles.slice((chunk-218)*1024,(chunk-217)*1024):source.ram.slice(0x2d00,0x3100));
  assert.equal(s.cpu.r[0],0x7e);assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);assert.ok(s.ram.slice(0x2000,0x2400).every(v=>v===0),'no palette writes');
 }
 for(const slot of[0,1,2]){
  start(s,0xc1486d);s.ram[0xae91]=slot;s.ram[0xae92]=2;s.ram[0xae93]=1;s.cpu.br[1]=0x268e;until(s,0xc14875);
  const ptr=(s.ram[0x302]&63)*65536+u16(s.ram,0x300);assert.equal(ptr,b.audit.swampSpin.graphics.assemblies[slot]);
  const cells=decompress(b.rom,ptr).bytes;for(let frame=0;frame<4;frame++)for(let cell=0;cell<4;cell++)assert.equal(cells[frame*13+4+cell*2]&14,(5+slot)*2);
  assert.equal(cells.length,52);assert.equal(s.cpu.br[3],0x7ff);
 }
 for(const frame of[0,1]){const pixels=fartCloud(frame);assert.equal(pixels.length,1024);assert.ok(pixels.every(v=>[0,1,2,3,4,9,10,11].includes(v)))/* outline and Shrek's green ramp only */;}
 assert.equal(b.audit.swampSpin.extraVramBytes,0);assert.equal(b.audit.swampSpin.extraWramBytes,0);
});
test('the native fart sound replaces only its own spin cue and fits both resident sound banks',async()=>{
 const s=await createCore(b.rom);
 for(const tech of[1,2,57])for(const cue of[0x91,0xff,0x80]){
  start(s,0xc1619f);s.cpu.br[2]=0;s.ram.set([0,0x10,0x7e],0xe6);s.ram[0x1000]=cue;s.ram[0xae91]=0;s.ram[0xae92]=2;s.ram[0xae93]=tech;s.cpu.c=true;
  until(s,0xc161a4);assert.equal(s.ram[0x1e01],tech===1&&cue===0x91?253:cue);assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.c,true);
 }
 for(const block of[0x7430b,0x75b0d]){
  assert.equal(u16(b.rom,block+253*4),0x46f4);assert.equal(u16(b.rom,block+253*4+2),0);
  // Swamp Belch's burp (sound $FC) sits in the empty slots of sounds $10-$18; see tests/swamp-belch.test.mjs.
  const burp=p=>(p>=0x40&&p<0x40+34+9)||(p>=0xfb*4&&p<0xfc*4+4); // and the fart toot (sound $FB) after it
  for(let p=0;p<0x17f4;p++)if(!burp(p)&&(p<253*4||p>=253*4+2))assert.equal(b.rom[block+p],b.base[block+p],'unrelated native effect');
 }
});
test('the native on-hit path poisons exactly 64 of 256 RNG states and respects immunity on every enemy slot',async()=>{
  const s=await createCore(b.rom);
  for(const target of[3,7,10])for(const immune of[false,true]){
    let hits=0;
    for(let seed=0;seed<256;seed++){
      start(s,0xc1e976);s.ram[0x16]=254;s.ram[0x18]=64;s.ram[0x26]=seed;put16(s.ram,0xb1f6,target*128);s.ram[0xb1fd]=target;s.ram[0x5e73]=255;
      s.ram[0x5e50+target*128]=immune?64:0;
      until(s,0xc1e9a2);if(s.ram[0x5e4b+target*128]&64)hits++;
      assert.equal(s.ram[0x26],(seed+1)&255,'one native random value consumed');assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);
    }
    assert.equal(hits,immune?0:64);
  }
});
test('unrelated on-hit effects retain their original RNG distribution and CPU state',async()=>{
  const source=await createCore(b.base),patched=await createCore(b.rom);
  for(const chance of[0,10,24,50,100])for(let seed=0;seed<256;seed++){
    for(const s of[source,patched]){start(s,0xc1e976);s.ram[0x16]=chance;s.ram[0x18]=64;s.ram[0x26]=seed;put16(s.ram,0xb1f6,384);s.ram[0xb1fd]=3;s.ram[0x5e73]=255;until(s,0xc1e9a2);}
    assert.deepEqual(patched.ram.slice(0x5e00,0x6400),source.ram.slice(0x5e00,0x6400));assert.equal(patched.ram[0x26],source.ram[0x26]);assert.equal(u16(patched.ram,0x16),u16(source.ram,0x16));assert.deepEqual(patched.cpu.br,source.cpu.br);
  }
});
test('the native frame loader performs three rotations per sixteen ticks, in every party slot and direction',async()=>{
 const s=await createCore(b.rom),durations=[1,1,2,1,1,2,1,1,2,1,1,2,0];
 for(const slot of[0,1,2])for(const facing of[0,1,2,3])for(let frame=0;frame<13;frame++){
  for(const[address,x,expected]of[[0xc142d0,0xa8cc+frame,durations[frame]],[0xc14300,0x30cc+facing*296+frame,frame===12?255:[129,131,128,130][frame%4]]]){
   start(s,address);s.ram[0xae91]=slot;s.ram[0xae92]=2;s.ram[0xae93]=1;put16(s.ram,0xa1fe+slot*2,0xa8cc);put16(s.ram,0xa1e8+slot*2,0x30cc);s.ram[0xa13a+slot]=frame;s.ram[0x80]=slot;s.cpu.br[1]=x;s.cpu.br[2]=slot*2;s.cpu.c=true;
   until(s,address+4);assert.equal(s.cpu.br[0],expected);assert.equal(s.cpu.br[1],x);assert.equal(s.cpu.br[2],slot*2);assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.c,true);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);
  }
 }
 assert.equal(durations.reduce((a,b)=>a+b),16);
 for(const tech of[2,57,58,79])for(const address of[0xc142d0,0xc14300]){
  start(s,address);s.ram[0xae92]=2;s.ram[0xae93]=tech;put16(s.ram,0xa1fe,0xa8cc);put16(s.ram,0xa1e8,0x30cc);s.cpu.br[1]=address===0xc142d0?0xa8cc:0x30cc;until(s,address+4);assert.equal(s.cpu.br[0],address===0xc142d0?4:127);
 }
});
