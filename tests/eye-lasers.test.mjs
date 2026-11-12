import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {build,bedroom,screenshot} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {put16,u16} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {eyeLaserGraphics} from '../engine/eye-lasers-art.js';
import {encodeDialogue} from '../engine/text.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
const b=await build();
function start(s,pc,{slot=0,tech=2,action=2}={}){
 const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=pc>>16;c.br[4]=pc&65535;c.br[5]=0;c.br[3]=0x7ff;
 s.ram[0xae91]=slot;s.ram[0xae92]=action;s.ram[0xae93]=tech;
}
function until(s,pc){let n=0;while((s.cpu.r[1]<<16|s.cpu.br[4])!==pc&&n++<100000)s.cpu.cycle();assert.ok(n<100000,'native routine returned');}
function cpu(s,x,y){assert.equal(s.cpu.br[1],x);assert.equal(s.cpu.br[2],y);assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.r[0],0x7e);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);assert.equal(s.cpu.c,true);}
test('Eye Lasers retains source lightning damage, line targets, MP, immunity and combo components',()=>{
 for(const[start,end]of[[0xc1acb,0xc247b],[0xc253b,0xc2580],[0x114100,0x115000]])assertRevisedBytes(b.rom,b.base,start,end);
 const p=0xd45a6+14;assert.deepEqual(b.rom.slice(p,p+7),Uint8Array.of(2,232,0,33,17,2,255));
 assert.deepEqual(b.rom.slice(0xea9a4,0xea9dc),b.base.slice(0xea9a4,0xea9dc),'shared effect sequence is untouched');
 {const help=0xc0000+(b.rom[0xc3a0d]|b.rom[0xc3a0e]<<8),line=encodeDialogue('Eye beams burn foes in a line{null}',b.base);assert.deepEqual(b.rom.slice(help,help+line.length),line);}
 assert.equal(b.audit.eyeLasers.extraVramBytes,0);assert.equal(b.audit.eyeLasers.extraWramBytes,0);
});
test('native two-plane decoder expands exact beam pixels and leaves unrelated spells and enemy actions alone',async()=>{
 const s=await createCore(b.rom),source=await createCore(b.base),gfx=eyeLaserGraphics();
 for(const slot of[0,1,2,3])for(const tech of[2,3,18,40,101])for(const chunk of[232,233,234,235,236]){
  for(const c of[s,source]){start(c,0xcd1368,{slot,tech});c.cpu.br[1]=chunk;put16(c.ram,0x67,32);until(c,0xcd13c9);}
  assert.deepEqual(s.ram.slice(0x2d00,0x3100),slot<3&&tech===2&&chunk<236?gfx.tiles.slice((chunk-232)*1024,(chunk-231)*1024):source.ram.slice(0x2d00,0x3100));
  assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.r[0],0x7e);assert.ok(s.ram.slice(0x2000,0x2400).every(v=>v===0));
 }
 for(const slot of[0,1,2]){
  start(s,0xc1486d,{slot});s.cpu.br[1]=0x26c4;until(s,0xc14875);
  const p=(s.ram[0x302]&63)*65536+u16(s.ram,0x300);assert.equal(p,b.audit.eyeLasers.graphics.assembly);assert.deepEqual(decompress(b.rom,p).bytes,gfx.assembly);
 }
 assert.equal(gfx.tiles.length,4096);assert.equal(gfx.packed.length,2048);assert.equal(gfx.assembly.length,120);
 for(let i=0;i<20;i++){assert.equal(gfx.assembly[i*6],0x11);assert.equal(gfx.assembly[i*6+1],0x80);}
});
test('all 256 native angles select the proper paired beam in every party position and facing',async()=>{
 const s=await createCore(b.rom);
 for(const slot of[0,1,2])for(const facing of[0,1,2,3])for(let angle=0;angle<256;angle++){
  const effect=angle%5,y=effect*2;start(s,0xcfef1b,{slot});s.cpu.br[1]=effect;s.cpu.br[2]=y;s.cpu.c=true;s.ram[0x96db+slot]=facing;s.ram[0xa5aa+slot]=angle;
  put16(s.ram,0xa240+y,130);put16(s.ram,0xa250+y,120);until(s,0xcfef20);
  assert.equal(s.cpu.br[0],((angle+8)&255)>>4);assert.equal(u16(s.ram,0xcc),122+[0,0,-4,3][facing]);assert.equal(u16(s.ram,0xce),87);cpu(s,effect,y);
 }
 for(const frame of[5,6,7,8]){start(s,0xcfef1b);s.cpu.br[1]=5;s.cpu.br[2]=10;s.cpu.c=true;s.ram[0xa2c5]=frame;put16(s.ram,0xa24a,120);put16(s.ram,0xa25a,95);until(s,0xcfef20);assert.equal(s.cpu.br[0],frame+11);assert.equal(u16(s.ram,0xcc),112);assert.equal(u16(s.ram,0xce),79);cpu(s,5,10);}
 for(const args of[{tech:1},{tech:17},{tech:40},{slot:3},{action:1}]){
  start(s,0xcfef1b,args);s.cpu.br[1]=2;s.cpu.br[2]=4;s.cpu.c=true;s.ram[0xa2c2]=0xa5;put16(s.ram,0xcc,234);put16(s.ram,0xce,123);until(s,0xcfef20);
  assert.equal(s.cpu.br[0],0x25);assert.equal(u16(s.ram,0xcc),234);assert.equal(u16(s.ram,0xce),123);cpu(s,2,4);
 }
});
test('flames bind all native secondary targets and re-anchor only their existing visual object',async()=>{
 const s=await createCore(b.rom);
 for(const slot of[0,1,2])for(const tech of[1,2,17,40]){
  start(s,0xc1608b,{slot,tech});s.cpu.br[0]=0x85;s.cpu.br[1]=58;s.cpu.br[2]=0;s.cpu.c=true;s.ram[0xa2b6]=5;s.ram.set([4,5,6,7,8,9,10],0xa018);
  until(s,0xc16090);assert.equal(s.ram[0xa419],0x85);for(let n=4;n<11;n++)assert.equal(s.ram[0xa416+n],tech===2?0x85:0);assert.equal(s.cpu.br[0],2);cpu(s,58,0);
  for(let parent=3;parent<11;parent++){
   start(s,0xcfeef0,{slot,tech});s.cpu.br[1]=55+parent;s.cpu.br[2]=46;s.cpu.c=true;s.ram[0xa416+parent]=0x85;s.ram[0x1d0c+parent]=40+parent;s.ram[0x1d23+parent]=90+parent;
   put16(s.ram,0xa24a,254);put16(s.ram,0xa25a,253);const positions=s.ram.slice(0x1d0c,0x1d2e);until(s,0xcfeef5);
   assert.equal(s.cpu.br[0],5);assert.equal(u16(s.ram,0xa24a),tech===2?40+parent:254);assert.equal(u16(s.ram,0xa25a),tech===2?90+parent:253);assert.deepEqual(s.ram.slice(0x1d0c,0x1d2e),positions);cpu(s,55+parent,46);
  }
 }
});

test('native Eye Lasers casts from every party position and against Milenko with exact graphics, native damage and cleanup',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json')),gfx=eyeLaserGraphics();
 for(const[party,fixture]of[[[0,1,2],'swamp-pack'],[[1,0,2],'swamp-pack'],[[1,2,0],'swamp-pack'],[[0,1,2],'milenko']]){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),slot=party.indexOf(0);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture,unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();
  const mp=u16(s.ram,0x5e34+slot*128),hits=[];let cast=false,exact=false,flames=false;
  h.on('battle.tech',e=>{if(e.techId===2)cast=true;});h.on('battle.result',e=>{if(e.techId===2&&e.actor===slot)hits.push(e);});
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  await chooseNativeTech(io,b.rom,slot,2);
  for(let f=0;f<600;f++){
   s.runFrame();
   if(cast&&s.ram[0xae91]===slot&&s.ram[0xae92]===2&&s.ram[0xae93]===2){
    const vram=new Uint8Array(s.ppu.vram.buffer);
    if(gfx.tiles.every((v,i)=>vram[0x1800+i]===v))exact=true;
    if(s.ram[0xa2c5]>=5&&s.ram[0xa2c5]<=8&&Array.from(s.ram.slice(0xa419,0xa421)).some(v=>(v&7)===5))flames=true;
   }
   if(f===68)await screenshot(s,`.local/qa/eye-lasers-${fixture}-slot-${slot}.png`);
  }
  assert.ok(cast,'native tech dispatch');assert.ok(exact,'exact four-kilobyte beam/fire upload');assert.ok(flames,'native target flames');
  assert.ok(hits.length>0,'native damage result');assert.ok(hits.every(e=>e.target>=3&&e.value>0));
  assert.equal(u16(s.ram,0x5e34+slot*128),mp-1,'Gold Stud keeps the source 2 MP discount');
  assert.equal(d.diagnostics().fatal,null);assert.equal(s.cpu.stopped,false);
  d.undo();assert.deepEqual(s.cart.data,b.rom,'diagnostic retry restores the cartridge');d.dispose();h.dispose();
 }
});
