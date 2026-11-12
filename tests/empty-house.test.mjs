import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16,u24} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {dialogue} from '../content/dialogue.js';
import {shrekReplies} from '../content/shrek-dialogue.js';
import {caretaker,onionJar} from '../content/caretaker.js';
import {homeEventLocations} from '../engine/home-event.js';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
const eventOf=(rom,location)=>{const id=u16(b.base,0x360008+location*14);return decompress(rom,cartridgeOffset(u24(rom,0x3cf9f0+id*3),rom)).bytes;};
const loads=(event,npc)=>{let n=0;for(let p=0;p+1<event.length;p++)if(event[p]===0x82&&event[p+1]===npc)n++;return n;};

test('nobody lives with Shrek: no line or actor is left for a caretaker',()=>{
 for(const[location,lines]of Object.entries(dialogue))for(const[id,text]of Object.entries(lines))assert.doesNotMatch(text,/granny/i,`${location}:${id}`);
 for(const[location,lines]of Object.entries(shrekReplies))for(const[id,text]of Object.entries(lines))assert.doesNotMatch(text,/granny/i,`reply ${location}:${id}`);
 assert.deepEqual(homeEventLocations,[1,2,80,85,125]);
 // Downstairs and the fortress illusion load the jar; the bedroom and the
 // ending load the empty actor; none of them loads Crono's mother.
 for(const[location,npc]of[[1,onionJar.npc],[125,onionJar.npc],[2,caretaker.npc],[85,caretaker.npc]]){
  const before=eventOf(b.base,location),now=eventOf(b.rom,location);
  assert.equal(now.length,before.length,`room ${location} keeps its size`);assert.equal(loads(now,npc),1,`room ${location} loads NPC ${npc}`);
 }
 // The mother's own NPC row is stock again for the unrelated women who share it.
 const row=0x24f000+(37+7)*5;assert.deepEqual(b.rom.slice(row,row+5),b.base.slice(row,row+5));
 assert.equal(b.audit.environment.caretaker.rasterCoverage.blankFrames,21);assert.equal(b.audit.environment.caretaker.onionJar.frames,21);
});

test('the onion jar by the stove hands over the 200 onions once',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),seen=[];
 h.on('dialogue.render',e=>{if(e.location===1)seen.push(e.stringId);});
 const onions=()=>s.ram[0x2c53]|s.ram[0x2c54]<<8|s.ram[0x2c55]<<16,press=(wait=90)=>{runFrames(s,3,256);runFrames(s,wait);};
 d.jump({id:1,x:7,y:8});runFrames(s,180);const before=onions();
 // The first trip downstairs: the scorch mark, Donkey's name, the note, the hint.
 press(120);press(200);runFrames(s,3,8);runFrames(s,300);
 for(let i=0;i<10;i++)press(70);
 for(const id of[10,11,12])assert.ok(seen.includes(id),'greeting line '+id);
 assert.equal(onions(),before,'nothing is handed over until the jar is opened');
 // The jar never moves from the stove.
 const jar=()=>[u16(s.ram,0x1800+30),u16(s.ram,0x1880+30)],home=jar();
 // Walk to it and open it.
 for(const[key,frames]of[[16,24],[64,16],[16,10],[64,12],[16,10],[64,12],[16,10]]){if(onions()!==before)break;runFrames(s,frames,key);press();press(60);}
 assert.ok(seen.includes(13),'the savings line');assert.equal(onions(),before+200,'200 onions');
 for(let i=0;i<4;i++)press();
 assert.equal(onions(),before+200,'only once');assert.deepEqual(jar(),home,'the jar stayed put');
 assert.equal(d.diagnostics().fatal,null);d.undo();d.dispose();h.dispose();
});

test('with Shrek gone, the Stand-in can still be taken from the empty house',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),seen=[];
 h.on('dialogue.render',e=>{if(e.location===2)seen.push(e.stringId);});
 const has=id=>s.ram.subarray(0x2400,0x2500).includes(id),press=(wait=110)=>{runFrames(s,3,256);runFrames(s,wait);};
 // The quest state the Last Inn sets up: Shrek lost and out of the party
 // list, the doll won at the fair and waiting in his room, no handoff yet.
 s.ram[0x10000]=0xcb;s.ram[0x1007c]|=1;s.ram[0x1005e]|=1;s.ram[0x1014f]&=~3;
 s.ram.fill(128,0x2980,0x2989);s.ram.set([1,2,3,4,5,6],0x2980);s.ram[0x29af]=0x7e;
 d.jump({id:2,x:20,y:9});runFrames(s,300);
 assert.equal(u16(s.ram,0x100),2);assert.notEqual(u16(s.ram,0x1800+19*2),0xff00,'the doll is in the room');
 assert.ok(!has(226));
 // Touch the doll: the party talks it over in the empty room.
 runFrames(s,30,16);
 for(let i=0;i<40&&!(s.ram[0x1014f]&1);i++)press();
 assert.equal(s.ram[0x1014f]&1,1,'the handoff flag is set by the original scene');
 for(const id of[17,23,32])assert.ok(seen.includes(id),'scene line '+id);
 assert.ok(!has(226),'the scene itself does not award the doll');
 // Touch it again to take it.
 for(const[key,frames]of[[64,20],[16,12],[64,12],[16,12],[32,6],[64,10],[16,10]]){if(has(226))break;runFrames(s,frames,key);press();press(60);}
 assert.ok(seen.includes(15),'"You got the Shrek stand-in!"');assert.ok(has(226),'the Stand-in is in the inventory');
 assert.equal(s.ram[0x1005e]&1,0,'the doll leaves the room');
 assert.equal(d.diagnostics().fatal,null);d.dispose();h.dispose();
});
