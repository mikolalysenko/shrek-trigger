import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {snapshot,restore} from '../engine/save.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {decompress} from '../engine/compression.js';
import {dragonPalette} from '../engine/dragon.js';
import {dragonEscapeEvent} from '../engine/dragon-mode7.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('Dragon preserves vehicle actors and isolates its tiles and palettes from world UI and tunnel masks',()=>{
  for(const npc of [144,169,174]){
    const p=0x24f000+(npc+7)*5;
    assert.equal(built.rom[p],built.base[p]);assert.equal(built.rom[p+1],built.base[p+1]);
    assert.equal(built.rom[p+2],219);assert.deepEqual(built.rom.slice(p+3,p+5),built.base.slice(p+3,p+5),'native animation and size retained');
  }
  assert.equal(decompress(built.rom,cartridgeOffset(u24(built.rom,0x6fdf3),built.rom)).bytes.length,4096);
  for(let i=4;i<=10;i++){
    const original=decompress(built.base,fileOffset(u24(built.base,0x6fea0+i*3))).bytes,patched=decompress(built.rom,cartridgeOffset(u24(built.rom,0x6fea0+i*3),built.rom)).bytes;
    assert.deepEqual(patched.slice(0,480),original.slice(0,480),'world scenery, UI and NPC colors');
    assert.deepEqual(patched.slice(480),dragonPalette({world:true}));
  }
  const assembly=decompress(built.rom,cartridgeOffset(u24(built.rom,0x362100+26*3),built.rom)).bytes;
  for(let c=0;c<4;c++)assert.equal(u16(assembly,307*8+c*2),0x0c00|776,'tunnel mask has a separate flat tile');
});

test('Dragon boards three riders, flies in four directions and lands using native controls',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
  dev.jump({id:496,x:55,y:35,party:[0,1,2],dragon:'flying'});runFrames(s,500);
  const expected=dragonPalette({world:true});for(let i=0;i<16;i++)assert.equal(s.ppu.cgram[240+i],u16(expected,i*2));
  runFrames(s,3,256);runFrames(s,600);assert.equal(s.ram[0x294]&0xe3,0xe3,'all three riders and flight state');
  const boarded=snapshot(s);
  for(const input of[64,16,128,32]){runFrames(s,60,input);assert.ok(s.ram[0x294]&0x40);assert.equal(u16(s.ram,0x100),496);}
  await screenshot(s,'.local/qa/dragon-native-flight.png');
  restore(s,boarded);runFrames(s,3,256);runFrames(s,600);assert.equal(s.ram[0x294]&0x40,0,'landed');assert.equal(s.ram[0x27e],0,'party can walk again');
  h.dispose();
});

test('Dragon crosses time before the wing repair without enabling free flight',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
  dev.jump({id:496,x:55,y:35,party:[0,1,2],dragon:'grounded'});runFrames(s,500);
  runFrames(s,3,256);runFrames(s,600);assert.equal(s.ram[0x27c],8,'native time gauge');
  assert.equal(s.ram[0x294]&0x20,0,'wings still unavailable');
  runFrames(s,3,1024);runFrames(s,200);runFrames(s,3,256);runFrames(s,1200);
  assert.equal(u16(s.ram,0x100),497,'travel from present to medieval world');
  assert.equal(s.ram[0x294]&0x20,0);assert.ok(!s.cpu.stopped);
  await screenshot(s,'.local/qa/dragon-native-time-jump.png');h.dispose();
});

test('Dragon cinematic packets fit the native layouts and preserve the animated sky colors',()=>{
  for(const [id,length]of[[0x22,288],[0x24,6144],[0x26,1024],[0x27,3072],[0x46,19456]]){
    const p=0x3e0006+id*3,data=decompress(built.rom,cartridgeOffset(u24(built.rom,p),built.rom)).bytes;
    assert.equal(data.length,length);
    if(id===0x22)assert.deepEqual(data.slice(0,128),decompress(built.base,fileOffset(u24(built.base,p))).bytes.slice(0,128));
    if(id===0x26||id===0x46)for(let y=0;y<data.length/64;y++){
      assert.ok(data.slice(y*64,y*64+32).every(c=>c<=12));
      assert.ok(data.slice(y*64+32,y*64+64).every(c=>c===0),'unused projection half remains empty');
    }
  }
  assert.deepEqual(built.rom.slice(0x3efdde,0x3efdfe),dragonPalette());
  const original=decompress(built.base,0x3adcc8).bytes,event=dragonEscapeEvent(original);
  for(let i=0;i<14*16;i++)assert.equal(u16(event,1+i*2),u16(original,1+i*2)+32,'original function pointers relocated');
  assert.equal(event[0],15);
});

test('the dive arrival shows Dragon leaving alive before the party resumes its native cutscene',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),actor=[];
  h.on('event.dispatch',e=>{
    if(e.location===474&&e.object===14&&![0xb2,0xad,0x96,7].includes(e.opcode))actor.push(e);
  });
  dev.jump({id:474,x:7,y:58,party:[0,1,2],arrival:'dragon-dive'});
  runFrames(s,280);assert.ok(actor.some(e=>e.opcode===0x90),'Dragon appears beside the party');
  await screenshot(s,'.local/qa/dragon-native-escape.png');
  runFrames(s,320);
  const visible=actor.find(e=>e.opcode===0x90),gone=actor.find(e=>e.opcode===0x91&&e.frame>visible.frame);
  assert.ok(gone.frame-visible.frame>=150,'flight is visible long enough to read');
  assert.ok(h.timeline.some(e=>e.name==='dialogue.render'&&e.location===474&&e.stringId===129),'original party recovery resumes');
  assert.equal(s.ram[0x100ce],5,'broken-harness branch retained');h.dispose();
});

test('the full Dragon approach clears its native callbacks and reaches the original recovery dialogue',async()=>{
  assert.ok(built.rom.slice(0x120000,0x120020).every(v=>v===0),'the original absolute cinematic zero source survives relocation');
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
  assert.equal(s.ram[0x1238e],0xb2);
  s.ram.set([0,1,2,3,4,5,6,128],0x2980);
  // The original approach script includes the cue-producing music, queued
  // destination and broken-harness branch. No subsequent state writes.
  s.ram.set([0xea,80,0x66,2,0xaa,0x56,5,0xce,0,0x65,7,0x6d,0xde,0xda,1,7,58,0x56,0,0xed,1,0xff,0x26,0],0x1238e);
  let recovered=false;
  for(let f=0;f<6000;f++){
    runFrames(s,1);assert.equal(dev.diagnostics().fatal,null,'native cinematic callback remains valid');
    if(s.ram[0x12a]===129&&u16(s.ram,0x100)===474){recovered=true;break;}
  }
  assert.ok(recovered,'full approach reaches original recovery dialogue');
  assert.equal(s.ram[0x100ce],5);await screenshot(s,'.local/qa/dragon-approach-native.png');dev.dispose();h.dispose();
});

test('the hangar draws the seat actor behind the floor instead of a detached block of Dragon',()=>{
  const read=rom=>decompress(rom,cartridgeOffset(u24(rom,0x3cf9f0+u16(built.base,0x360008+243*14)*3),rom)).bytes;
  const before=read(built.base),after=read(built.rom),start=u16(after,1+15*32)+1;
  assert.deepEqual([...after.slice(start,start+2)],[0x82,169],'object 15 still loads the seat actor');
  assert.deepEqual([...after.slice(start+32,start+34)],[0x8e,0x00],'sprite priority 0');
  assert.equal(before[u16(before,1+15*32)+1+33],0x26);
});

test('the approach dive phase draws Dragon in her own palette, not the Epoch white',()=>{
  // Raw resource 23 is loaded into OBJ row 4 when the approach dives.
  assert.equal(fileOffset(u24(built.base,0x3e0006+0x23*3)),0x3e8d15);
  assert.deepEqual(built.rom.slice(0x3e8d15,0x3e8d35),dragonPalette());
  assert.notDeepEqual(built.base.slice(0x3e8d15,0x3e8d35),dragonPalette());
});
