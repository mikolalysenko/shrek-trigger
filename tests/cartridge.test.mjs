import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {compress,decompress} from '../engine/compression.js';
import {u16,u24,validateRom,makeIps} from '../engine/rom.js';
import {makeBps} from '../engine/bps.js';
import {readBps} from './bps-reader.mjs';
import {createCore} from '../scripts/core.mjs';
import {snapshot,restore} from '../engine/save.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
import {cast} from '../content/cast.js';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {build,bedroom,screenshot} from './helpers.mjs';
import {ROM_HACK_CREDIT} from '../engine/credits.js';
import {items} from '../content/items.js';
import {encode,encodeDialogue,decode,encodeName} from '../engine/text.js';

const built=await build(),specs=JSON.parse(await readFile('content/hooks.json','utf8'));
await mkdir('.local/qa',{recursive:true});

test('base fingerprint accepts copier headers and rejects altered cartridges',async()=>{
  const headered=new Uint8Array(built.base.length+512);headered.set(built.base,512);
  assert.deepEqual(await validateRom(headered),built.base);
  const bad=built.base.slice();bad[123]^=1;await assert.rejects(validateRom(bad),/original Chrono/);
});

test('the distributable patch reconstructs the exact cartridge; checksum and mechanics survive',()=>{
  let out;
  if(built.rom.length>built.base.length)out=readBps(built.base,makeBps(built.base,built.rom)).target;
  else{
  const ips=makeIps(built.base,built.rom);out=built.base.slice();let p=5;
  assert.equal(new TextDecoder().decode(ips.slice(0,5)),'PATCH');
  while(!(ips[p]===69&&ips[p+1]===79&&ips[p+2]===70)) {
    const offset=ips[p]*65536+ips[p+1]*256+ips[p+2],n=ips[p+3]*256+ips[p+4];p+=5;
    assert.ok(n>0);out.set(ips.slice(p,p+n),offset);p+=n;
  }
  }
  assert.deepEqual(out,built.rom);assert.equal(out.length,built.audit.resources.romLimit);assert.ok([0x400000,0x800000].includes(out.length));
  assert.equal(u16(out,0xffdc)^u16(out,0xffde),65535);
  assert.equal(out.reduce((n,b)=>(n+b)&65535,0),u16(out,0xffde));
  assert.deepEqual(out.slice(0xc0000,0xc0b5e),built.base.slice(0xc0000,0xc0b5e),'item properties and starting stats');
  assertRevisedBytes(out,built.base,0xc1b00,0xc2eb1,'tech effects, costs and targeting');
  assert.equal(built.audit.techs,116);assert.equal(built.audit.characters.length,7);
  for(const c of built.audit.characters) {
    assert.ok(c.bytes<=c.capacity);
    const rec=built.records.find(r=>r.label===c.name+' 4bpp tiles');
    assert.ok(rec.bytes.slice(0,32).every(v=>v===0),'native blank tile invariant');
  }
  assert.equal(built.audit.resources.extraVramBytes,0);assert.equal(built.audit.resources.extraWramBytes,0);
});

test('every native inventory name is covered, encoded and mechanically inert',()=>{
  assert.equal(items.length,212);assert.equal(built.audit.items,212);
  const mapped=new Set();
  for(const item of items){
    assert.ok(item.id>0&&item.id<=242);assert.ok(!mapped.has(item.id),'duplicate item ID '+item.id);mapped.add(item.id);
    const p=0xc0b5e+item.id*11;
    assert.equal(built.rom[p],built.base[p],'item icon '+item.id);
    assert.deepEqual(built.rom.slice(p+1,p+11),encodeName(item.short,{length:10}),'native item name '+item.id);
    if(item.help){
      const address=0xc0000+u16(built.rom,0xc2eb1+item.id*2),bytes=encodeDialogue(item.help+'{null}',built.base);
      assert.deepEqual(built.rom.slice(address,address+bytes.length),bytes,'native item help '+item.id);
    }
  }
  for(let id=1;id<=242;id++){
    const p=0xc0b5e+id*11,stock=decode(built.base.slice(p+1,p+11));
    if(stock)assert.ok(mapped.has(id),`unmapped native item ${id}: ${stock}`);
  }
});

test('generated LZ packets execute in the real cartridge decompressor, including short literal tails',async()=>{
  const samples=[new Uint8Array(),...Array.from({length:24},(_,n)=>Uint8Array.from({length:n+1},(_,i)=>(i*31+n*7)&255)),new Uint8Array(4096).fill(37),Uint8Array.from({length:4096},(_,i)=>(i*i+i*7)&255)];
  const distant=new Uint8Array(5595);let seed=0x12345678;
  for(let i=0;i<4095;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;distant[i]=seed&255;}
  distant.set(distant.slice(0,1500),4095);samples.push(distant);
  assert.ok(compress(distant,{mode:12}).length<compress(distant,{mode:11}).length,'4 KiB window reaches distant repeated data');
  assert.deepEqual(compress(distant),compress(distant,{mode:12}),'automatic mode selects the shorter packet');
  for(const a of built.audit.allocations.filter(a=>/^event |title|cinematic|swamp roots|overworld hero sprites/.test(a.label)))samples.push(decompress(built.rom,a.offset).bytes);
  const rom=built.base.slice();
  // A native JSL to C3:0557, returning to STP. Guard bytes detect fast-path overrun.
  rom.set([0x78,0xc2,0x30,0xa9,0,0,0x8d,0,3,0xa9,0,0x40,0x8d,3,3,0xe2,0x20,0xa9,0xd0,0x8d,2,3,0xa9,0x7f,0x8d,5,3,0x22,0x57,5,0xc3,0xdb],0x308000);
  const s=await createCore(rom);
  for(const sample of samples)for(const mode of[11,12]) {
    const packed=compress(sample,{mode});assert.deepEqual(decompress(packed,0).bytes,sample);
    s.cart.data.set(packed,0x100000);s.cpu.reset();s.cpu.r[1]=0xf0;s.cpu.br[4]=0x8000;s.cpu.br[3]=0x1ff;s.cpu.br[5]=0;s.cpu.e=false;s.cpu.cyclesLeft=0;
    s.ram.fill(0xa5,0x13fff,0x14000+sample.length+1);
    let cycles=0;while(!s.cpu.stopped&&cycles++<4000000)s.cpu.cycle();
    assert.ok(s.cpu.stopped,`decompressor must return (${sample.length} bytes)`);
    assert.deepEqual(s.ram.slice(0x14000,0x14000+sample.length),sample);
    assert.equal(s.ram[0x13fff],0xa5);assert.equal(s.ram[0x14000+sample.length],0xa5);
  }
  const cinematic=built.audit.allocations.find(a=>a.label==='cinematic code with title sprite layout');
  assert.ok(cinematic.length<=decompress(built.base,0x31313).length,'edited cinematic fits its original packet allocation');
});

test('the native ending credits name Kimi without shifting later entries',()=>{
  const {offset,text}=built.audit.credits;
  assert.equal(text,ROM_HACK_CREDIT);
  const expected=Uint8Array.from([...ROM_HACK_CREDIT].map(c=>c.charCodeAt(0)).concat(0x80));
  assert.deepEqual(built.rom.slice(offset,offset+expected.length),expected);
  assert.equal(built.rom[0x3da6eb],built.base[0x3da6eb],'the following SPECIAL THANKS entry stays at its native offset');
});

test('native title boot loads Shrek artwork and green fading palettes without hooks',async()=>{
  const s=await createCore(built.rom);runFrames(s,1200);
  const expected=decompress(built.rom,built.audit.title.graphicsOffset).bytes;
  assert.deepEqual(new Uint8Array(s.ppu.vram.buffer).slice(0x8000,0x8000+expected.length),expected);
  assert.ok(s.ppu.cgram[128+3]!==0);
  await screenshot(s,'.local/qa/native-title.png');
});

test('vblank status precedes the NMI edge and native immediate scene changes finish',async()=>{
  const probe=await createCore(built.base);probe.cpu.stopped=true;probe.nmiEnabled=true;probe.yPos=225;probe.xPos=0;
  probe.cycle(true);assert.ok(probe.inNmi);assert.equal(probe.cpu.nmiWanted,false);
  assert.equal(probe.readReg(0x4210)&128,128);assert.equal(probe.readReg(0x4210)&128,128,'status remains latched during hardware hold');
  assert.equal(probe.skipIdleCycles(),0,'fast path must not skip the interrupt edge');
  probe.cycle(true);probe.cycle(true);assert.equal(probe.cpu.nmiWanted,false);
  assert.equal(probe.readReg(0x4210)&128,128);assert.equal(probe.readReg(0x4210)&128,0);
  probe.cycle(true);assert.ok(probe.cpu.nmiWanted);
  probe.cpu.nmiWanted=false;probe.nmiEnabled=false;probe.inNmi=true;probe.writeReg(0x4200,128);
  assert.equal(probe.nmiDelay,6,'enabling NMI during vblank produces a delayed edge');
  const s=await bedroom(built.rom),hooks=installHooks(s,specs);let injected=false;
  hooks.on('event.dispatch',({scriptPC})=>{if(!injected){s.ram.set([0xe1,6,2,8,10,0xb2],0x12001+scriptPC);injected=true;}});
  runFrames(s,600);assert.equal(u16(s.ram,0x100),6,'E1 must escape its RDNMI polling loop');hooks.dispose();
});

test('live event boundary jumps, all cast slots, native battle, and exact checkpoint return',async()=>{
  const s=await bedroom(built.rom),hooks=installHooks(s,specs),dev=createDevTools(s,hooks);
  const initial=snapshot(s);assert.equal(u16(s.ram,0x100),2);
  assert.throws(()=>dev.jump({id:0,x:0,y:0}),/Invalid/);
  assert.throws(()=>dev.jump({id:6,x:8,y:10,party:[0,0,1]}),/distinct/);
  dev.jump({id:6,x:8,y:10,party:[0,1,2]});runFrames(s,600);
  assert.equal(u16(s.ram,0x100),6);assert.deepEqual([...s.ram.slice(0x2980,0x2983)],[0,1,2]);
  assert.ok(hooks.counts['event.dispatch']>0);assert.ok(hooks.counts['scene.load']>0);
  dev.undo();assert.equal(u16(s.ram,0x100),2);assert.deepEqual([...s.ram.slice(0x2980,0x2983)],[0,128,128]);
  assert.ok(s.frames-initial.nodes[0].props.frames<=1,'undo returns to the event boundary immediately before injection');
  restore(s,initial);runFrames(s,30);restore(s,initial);assert.deepEqual(snapshot(s),initial);
  for(const party of [[0,1,2],[3,4,5],[6,0,1]]) {
    dev.jump({id:6,x:8,y:10,party});runFrames(s,420);runFrames(s,35,16);runFrames(s,30);
    assert.equal(u16(s.ram,0x100),6);assert.deepEqual([...s.ram.slice(0x2980,0x2983)],party);
    // The native character table runs from bit 7 down to bit 1. Bit 0 is not
    // a character, and the roster has nine slots including inactive entries.
    assert.equal(s.ram[0x29af],built.rom.slice(0x3ff9bb,0x3ff9c2).reduce((m,b)=>m|b,0));
    assert.deepEqual([...s.ram.slice(0x2980,0x2989)].filter(id=>id<7).sort((a,b)=>a-b),[0,1,2,3,4,5,6]);
    await screenshot(s,`.local/qa/cast-${party[0]}.png`);
    dev.undo();
  }
  dev.jump({id:6,x:8,y:10,party:[0,1,2]});runFrames(s,420);runFrames(s,25,16);runFrames(s,30);runFrames(s,12,256);runFrames(s,250);
  for(let i=0;i<10;i++){runFrames(s,8,256);runFrames(s,180);}
  assert.ok(hooks.counts['dialogue.render']>0);
  // Battle core owns the party combatant table after the native battle command.
  assert.deepEqual([...s.ram.slice(0xaeff,0xaf02)],[0,1,2]);
  await screenshot(s,'.local/qa/native-battle.png');
  restore(s,initial);
  const before=snapshot(s),bad=structuredClone(before);bad.romHash^=1;assert.throws(()=>restore(s,bad),/different/);assert.deepEqual(snapshot(s),before);
  hooks.dispose();
});

test('home and every area preset load through the native event VM',async()=>{
  const s=await bedroom(built.rom),hooks=installHooks(s,specs),dev=createDevTools(s,hooks),initial=snapshot(s);
  for(const area of areas) {
    restore(s,initial);dev.jump(area);runFrames(s,420);
    assert.equal(u16(s.ram,0x100),area.id,area.name);assert.equal(dev.pending,null);
    assert.ok(!s.cpu.stopped,area.name);
    assert.equal(dev.diagnostics().fatal,null,area.name+' must not reach the native fatal-error loop');
    await screenshot(s,`.local/qa/map-${area.id.toString(16)}.png`);
  }
  hooks.dispose();
});
