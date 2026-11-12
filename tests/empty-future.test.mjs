import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {emptyFutureDialogue} from '../content/empty-future-dialogue.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {encodeDialogue,dialogueLength} from '../engine/text.js';
import {decompress} from '../engine/compression.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
import {cast} from '../content/cast.js';
import {encode} from '../engine/text.js';
import {appendedObjectRooms,nativeEventOffset} from '../engine/event-additions.js';
const built=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json')),specs=JSON.parse(await readFile('content/hooks.json'));

test('the empty future preserves every native scene command, button puzzle, numeric race score and choice',()=>{
  let count=0;
  for(const[location,lines]of Object.entries(emptyFutureDialogue)){
    const l=layouts.find(l=>l.location===+location),old=decompress(built.base,l.eventPointer).bytes;
    const now=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+l.eventId*3))).bytes;
    // The Kodiak storeroom (344) appends Mr. Worldwide and guards two functions
    // (tests/mr-worldwide.test.mjs); every source byte keeps its moved offset.
    const appended=appendedObjectRooms[+location],at=i=>nativeEventOffset(+location,i);
    if(appended===undefined)assert.equal(now.length,old.length);else assert.equal(now[0],old[0]+1);
    assert.ok(l.tableCommands.length);
    assert.deepEqual(Object.keys(lines).map(Number).sort((a,b)=>a-b),l.strings.map(s=>s.id).sort((a,b)=>a-b));
    const edited=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
    for(let i=appended===undefined?0:1+appended*32;i<old.length;i++)if(!edited.has(i))assert.equal(now[at(i)],old[i],`native event ${location}:${i}`);
    for(const command of l.tableCommands){
      assert.equal(now[at(command)],0xb8);assert.notEqual(u24(now,at(command)+1),u24(old,command+1));
      const table=fileOffset(u24(now,at(command)+1));
      for(const[id,text]of Object.entries(lines)){
        const addr=(table&0x3f0000)+u16(built.rom,table+id*2),encoded=encodeDialogue(text,built.base);
        assert.equal(addr>>16,(addr+encoded.length-1)>>16);assert.deepEqual(built.rom.slice(addr,addr+encoded.length),encoded);
        assert.equal(dialogueLength(built.rom,addr),encoded.length);
        assert.ok(!/\b(Crono|Lucca|Marle|Robo|Lavos|Johnny|Enertron|Tonic|Ether|PowerTab)\b/i.test(text));
        for(const row of text.replace(/\{(?:page3|page|full)\}/g,'\n').replace(/\{[^}]+\}/g,'').split('\n'))assert.ok(row.length<=36,`${location}:${id}: ${row}`);
        count++;
      }
    }
  }
  assert.equal(count,327);
  const choices=[[210,931,192,166,6],[210,1117,195,21,6],[214,1325,192,170,6],[214,1364,195,21,6],[214,2210,192,44,11],[218,1493,195,78,6],[223,963,192,12,11],[223,1566,192,13,6],[223,1738,192,105,6],[223,1747,192,108,6],[223,1779,192,109,1],[225,588,192,13,6],[225,720,192,105,6],[225,729,192,108,6],[225,761,192,109,1],[226,1337,192,80,11],[226,1905,192,81,11],[226,3506,192,77,6],[226,3877,192,102,6],[229,663,192,32,2],[230,2737,192,32,2]];
  for(const[loc,pos,opcode,id,mask]of choices){
    const l=layouts.find(l=>l.location===loc),e=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+l.eventId*3))).bytes;
    assert.deepEqual([...e.slice(pos+1,pos+4)],[opcode,id,mask]);
    const rows=emptyFutureDialogue[loc][id].replace('{null}','').split(/\{(?:page|full)\}/).at(-1).split('\n'),first=mask>>2,last=mask&3;
    for(let row=first;row<=last;row++)assert.ok(rows[row]?.startsWith('   '),`choice ${loc}:${id}:${row}`);
  }
  for(const loc of[223,225])assert.equal([...encodeDialogue(emptyFutureDialogue[loc][22],built.base)].filter(b=>b===14).length,3);
  assert.deepEqual([...encodeDialogue(emptyFutureDialogue[212][79],built.base).slice(-4)],[3,4,3,0]);
});

async function fixture(key){
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[],maps=new Set(),transitions=new Set();let naming=false,named=false;
  h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
  h.on('event.dispatch',e=>{maps.add(e.location);if(e.opcode===0xe0)transitions.add(u16(s.ram,0x12002+e.scriptPC)&511);if(e.location===226&&e.opcode===0xc8&&!named)naming=true;});
  const original=s.ram[0x10000];dev.jump(areas.find(a=>a.futureScene===key));runFrames(s,400);
  return{s,h,dev,messages,maps,transitions,press(){
    // C8 opens the real naming screen. Start keeps the character's existing
    // short name; pressing A there would type letters instead of advancing.
    if(naming){runFrames(s,600);runFrames(s,8,8);runFrames(s,360);naming=false;named=true;}
    else{runFrames(s,3,256);runFrames(s,100);}
  },close(){assert.equal(dev.diagnostics().fatal,null);dev.undo();assert.equal(u16(s.ram,256),2);assert.equal(s.ram[0x10000],original);assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,128,128]);dev.dispose();h.dispose();}};
}
const saw=(f,loc,id)=>f.messages.some(([l,n])=>l===loc&&n===id);

test('the native future arrival and failed food store preserve the seed discovery and return checkpoint',async()=>{
  for(const key of['future-arrival','future-food']){
    const f=await fixture(key),{s}=f,arrival=key==='future-arrival';
    assert.throws(()=>f.dev.jump({id:6,x:8,y:10,futureScene:key}),/own location/);
    for(let i=0;i<100&&!(s.ram[arrival?0x100a5:0x100a4]&1);i++)f.press();runFrames(s,120);
    assert.equal(s.ram[arrival?0x100a5:0x100a4]&1,1);assert.equal(u16(s.ram,256),arrival?208:344);
    for(let id=arrival?3:5;id<=(arrival?8:10);id++)assert.ok(saw(f,arrival?208:344,id),key+' '+id);
    assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,1,2]);
    if(!arrival){const slot=s.ram.subarray(0x2400,0x2500).indexOf(212);assert.ok(slot>=0);assert.equal(s.ram[0x2500+slot],1);}
    await screenshot(s,`.local/qa/${key}.png`);f.close();
  }
});

test('both archive answers complete the native recordings and the decision to change the future',async()=>{
  for(const hesitate of[false,true]){
    const f=await fixture('future-archive'),{s}=f;let chosen=false;runFrames(s,24,16);
    for(let i=0;i<180&&s.ram[0x10000]!==54;i++){
      if(!chosen&&saw(f,218,78)){runFrames(s,120);if(hesitate){runFrames(s,3,32);runFrames(s,3);}chosen=true;}
      f.press();
    }
    assert.equal(s.ram[0x10000],54);assert.ok(chosen);assert.equal(saw(f,218,79),hesitate);
    for(const id of[56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,77,78,80,81,82])assert.ok(saw(f,218,id),'archive '+id);
    assert.ok(f.transitions.has(498)&&f.transitions.has(503),'both native world recordings');
    await screenshot(s,`.local/qa/future-archive-${hesitate?'hesitate':'agree'}.png`);f.close();
  }
});

test('the shelter accepts the seeds and gives the native race-bike key',async()=>{
  const f=await fixture('future-seeds'),{s}=f;runFrames(s,8,16);
  for(let i=0;i<140&&s.ram[0x10000]!==55;i++)f.press();runFrames(s,120);
  assert.equal(s.ram[0x10000],55);for(let id=83;id<=99;id++)assert.ok(saw(f,214,id),'seed return '+id);
  assert.ok(saw(f,214,0));const slot=s.ram.subarray(0x2400,0x2500).indexOf(213);assert.ok(slot>=0);assert.equal(s.ram[0x2500+slot],1);
  await screenshot(s,'.local/qa/future-seeds-returned.png');f.close();
});

test('Pinocchio wakes, retains his own name and joins either native workshop party',async()=>{
  for(const leaveDonkey of[false,true]){
    const f=await fixture('puppet-recruit'),{s}=f;let chosen=false;runFrames(s,24,16);
    for(let i=0;i<190&&s.ram[0x10000]!==60;i++){
      if(!chosen&&saw(f,226,77)){runFrames(s,150);if(leaveDonkey){runFrames(s,3,32);runFrames(s,3);}chosen=true;}
      f.press();
    }
    runFrames(s,400);assert.equal(s.ram[0x10000],60);assert.ok(chosen);
    for(let id=33;id<=77;id++)assert.ok(saw(f,226,id),'first repair '+id);
    assert.ok(saw(f,226,leaveDonkey?79:78));assert.equal(s.ram[0x10148]&15,15);
    assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,3,leaveDonkey?1:2]);
    assert.equal(s.ram[0x10150]&3,leaveDonkey?2:1);assert.equal(s.ram[0x29af],240);
    assert.deepEqual(s.ram.slice(0x2c23+3*6,0x2c23+4*6),encode(cast[3].short,{length:6,pad:0}),'native name screen preserves Pinoc');
    await screenshot(s,`.local/qa/puppet-recruit-${leaveDonkey?'fiona':'donkey'}.png`);f.close();
  }
});

test('both workshop companion branches fight the six brothers and carry Pinocchio out',async()=>{
  for(const companion of['donkey','fiona']){
    const f=await fixture('puppet-brothers-'+companion),{s}=f;let fought=false;
    for(let i=0;i<240&&u16(s.ram,256)!==498;i++){
      f.press();if(s.ram.subarray(0xaf02,0xaf0a).filter(id=>id===248).length===6)fought=true;
    }
    assert.ok(fought,'all six native battle actors');assert.equal(s.ram[0x10000],66);assert.equal(u16(s.ram,256),498);
    for(const id of[37,38,39,40,41,42,43,44,45,46,52,53,54,57])assert.ok(saw(f,230,id),'brothers '+id);
    for(const id of companion==='donkey'?[47,55,58,59]:[48,56,60,61])assert.ok(saw(f,230,id),'companion '+id);
    assert.equal(s.ram[0x101f0]&128,128,'native return-to-workshop flag');
    await screenshot(s,`.local/qa/puppet-brothers-${companion}-rescued.png`);f.close();
  }
});

test('Pinocchio chooses the party after the second repair and all four reach the Last Inn',async()=>{
  const f=await fixture('puppet-repair'),{s}=f;
  const count=decompress(built.base,layouts.find(l=>l.location===464).eventPointer).bytes[0];
  for(let i=0;i<220&&!(u16(s.ram,256)===464&&s.ram[0x12000]===count);i++)f.press();
  runFrames(s,400);assert.equal(u16(s.ram,256),464);assert.equal(s.ram[0x12000],count);assert.equal(s.ram[0x29af],240);
  for(let id=85;id<=100;id++)assert.ok(saw(f,226,id),'second repair '+id);assert.ok(saw(f,227,101));
  const available=[...s.ram.subarray(0x2980,0x2989)].filter(id=>id<7);assert.deepEqual(available.sort((a,b)=>a-b),[0,1,2,3]);
  assert.ok(s.ram[0x10000]>=69);await screenshot(s,'.local/qa/puppet-four-at-inn.png');f.close();
});
