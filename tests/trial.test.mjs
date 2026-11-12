import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {trialDialogue} from '../content/trial-dialogue.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {encodeDialogue,dialogueLength} from '../engine/text.js';
import {decompress} from '../engine/compression.js';
import {areas} from '../content/areas.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
const built=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json')),specs=JSON.parse(await readFile('content/hooks.json'));

test('trial and prison text retains all native evidence, verdict, countdown and escape instructions',()=>{
  let count=0;
  for(const[location,lines]of Object.entries(trialDialogue)){
    const l=layouts.find(l=>l.location===+location),old=decompress(built.base,l.eventPointer).bytes;
    const now=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+l.eventId*3))).bytes;
    assert.equal(now.length,old.length);assert.ok(l.tableCommands.length);
    assert.deepEqual(Object.keys(lines).map(Number).sort((a,b)=>a-b),l.strings.map(s=>s.id).sort((a,b)=>a-b));
    const edited=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
    for(let i=0;i<old.length;i++)if(!edited.has(i))assert.equal(now[i],old[i],`native event ${location}:${i}`);
    for(const command of l.tableCommands){
      assert.equal(now[command],0xb8);assert.notEqual(u24(now,command+1),u24(old,command+1));
      const table=fileOffset(u24(now,command+1));
      for(const[id,text]of Object.entries(lines)){
        const addr=(table&0x3f0000)+u16(built.rom,table+id*2),encoded=encodeDialogue(text,built.base);
        assert.equal(addr>>16,(addr+encoded.length-1)>>16);assert.deepEqual(built.rom.slice(addr,addr+encoded.length),encoded);
        assert.equal(dialogueLength(built.rom,addr),encoded.length);
        assert.ok(!/\b(Crono|Lucca|Marle|Guardia|Aliza|Melchior|Chancellor|Dragon Tank|Mid Tonic|Ether|Jerky)\b/i.test(text));
        for(const row of text.replace(/\{(?:page3|page|full)\}/g,'\n').replace(/\{[^}]+\}/g,'').split('\n'))assert.ok(row.length<=36,`${location}:${id}: ${row}`);
        count++;
      }
    }
  }
  assert.equal(count,304);
  for(const[loc,pos,opcode,id,mask]of[[24,1296,195,153,7],[27,1762,192,141,11],[27,1851,192,159,11],[27,1936,192,165,11],[27,1951,192,168,11],[29,1292,192,43,6],[72,2402,192,45,6]]){
    const l=layouts.find(l=>l.location===loc),e=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+l.eventId*3))).bytes;
    assert.deepEqual([...e.slice(pos+1,pos+4)],[opcode,id,mask]);
    const rows=trialDialogue[loc][id].replace('{null}','').split(/\{(?:page|full)\}/).at(-1).split('\n'),first=mask>>2,last=mask&3;
    assert.equal(rows.length,last+1);for(let row=first;row<=last;row++)assert.ok(rows[row].startsWith('   '));
  }
  const countdown=encodeDialogue(trialDialogue[71][0],built.base);
  assert.ok(countdown.includes(13));assert.deepEqual([...countdown.slice(-4)],[3,10,3,0]);
});

async function fixture(key){
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[],days=[];
  h.on('dialogue.render',e=>{messages.push([e.location,e.stringId]);if(e.location===71&&e.stringId===0)days.push(s.ram[0x200]);});
  const original=s.ram[0x10000];dev.jump(areas.find(a=>a.trialScene===key));runFrames(s,400);
  return{s,h,dev,messages,days,press(){runFrames(s,3,256);runFrames(s,100);},close(){assert.equal(dev.diagnostics().fatal,null);dev.undo();assert.equal(u16(s.ram,256),2);assert.equal(s.ram[0x10000],original);assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,128,128]);dev.dispose();h.dispose();}};
}
function saw(f,loc,id){return f.messages.some(([l,n])=>l===loc&&n===id);}

test('the native jury follows helpful or selfish evidence and preserves both prison-intake verdict branches',async()=>{
  for(const selfish of[false,true]){
    const f=await fixture(selfish?'trial-selfish':'trial-kind'),{s,messages}=f,chosen=new Set();
    assert.throws(()=>f.dev.jump({id:6,x:8,y:10,trialScene:'trial-kind'}),/own location/);
    for(let i=0;i<280&&u16(s.ram,256)!==71;i++){
      const last=messages.at(-1);
      if(last?.[0]===27&&[141,159,165,168].includes(last[1])&&!chosen.has(last[1])){
        chosen.add(last[1]);
        if([141,159].includes(last[1])){
          // Observe the native decision cursor becoming active. A fixed
          // delay can send Down while the question is still printing.
          for(let n=0;n<600&&s.ram[0x162]!==2;n++)runFrames(s,1);
          assert.equal(s.ram[0x162],2,'native trial decision is ready');
          const row=s.ram[0x164]+Number(selfish);
          for(let n=0;n<4&&s.ram[0x163]!==row;n++){runFrames(s,3,32);runFrames(s,6);}
          assert.equal(s.ram[0x163],row,'native trial answer cursor');
        }else runFrames(s,120);
      }
      f.press();
    }
    assert.equal(u16(s.ram,256),71);assert.equal(s.ram[0x10000],45);
    assert.equal(s.ram[0x10051],selfish?7:0,'seven native jury votes');
    for(const id of selfish?[143,154,155,156,159,161,162,163,170,173,174,175,176,177,185]:[142,149,150,151,152,153,169,186])assert.ok(saw(f,27,id),'trial branch '+id);
    assert.ok(saw(f,439,36)&&saw(f,439,37),'native festival collision flashback');
    if(selfish){assert.ok(saw(f,5,27)&&saw(f,439,42)&&saw(f,439,65));assert.ok(saw(f,29,6));assert.ok(!saw(f,29,7));}
    else{for(const id of[7,8,9])assert.ok(saw(f,29,id));assert.ok(!saw(f,29,6));}
    for(const id of[187,188,189,190,191,192])assert.ok(saw(f,27,id));
    assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,128,128]);assert.equal(s.ram[0x10197],3);
    await screenshot(s,`.local/qa/trial-${selfish?'guilty':'innocent'}-intake.png`);f.close();
  }
});

test('admitting a ransom motive follows the separate native confession branch',async()=>{
  const f=await fixture('trial-kind'),{s,messages}=f;let chosen=false;
  for(let i=0;i<260&&u16(s.ram,256)!==71;i++){
    if(!chosen&&messages.at(-1)?.[0]===27&&messages.at(-1)?.[1]===165){
      runFrames(s,120);f.press();runFrames(s,120);runFrames(s,3,32);runFrames(s,3);chosen=true;
    }
    f.press();
  }
  assert.ok(chosen);assert.ok(saw(f,27,166));assert.ok(!saw(f,27,168));assert.ok(!saw(f,27,170));
  assert.equal(u16(s.ram,256),71);assert.equal(s.ram[0x10050]&2,2);f.close();
});

test('waiting in the cell renders the native day counter and completes Donkey’s execution-room rescue',async()=>{
  const f=await fixture('prison-cell'),{s}=f;
  for(let i=0;i<150&&s.ram[0x10000]!==46;i++)f.press();runFrames(s,120);
  assert.deepEqual(f.days,[2,1]);assert.ok(saw(f,71,1));assert.ok(saw(f,71,25)&&saw(f,71,26));
  for(let id=27;id<=34;id++)assert.ok(saw(f,30,id),'execution rescue '+id);
  assert.equal(u16(s.ram,256),30);assert.equal(s.ram[0x10000],46);assert.equal(s.ram[0x10197],0);
  assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,2,128]);await screenshot(s,'.local/qa/prison-timed-rescue.png');f.close();
});

test('banging on the cell bars starts the native breakout, guard fight and return to exploration',async()=>{
  const f=await fixture('prison-cell'),{s,h}=f;let finished=false,fought=false;
  h.on('event.dispatch',e=>{if(e.location===71&&e.scriptPC===0xc86)finished=true;});runFrames(s,12,32);
  for(let i=0;i<100&&!finished;i++){
    f.press();if(f.messages.at(-1)?.[1]===15)runFrames(s,12,32);
    if(s.ram.subarray(0xaf02,0xaf0a).includes(49))fought=true;
  }
  assert.ok(finished);assert.ok(fought);for(const id of[15,16,17,18])assert.ok(saw(f,71,id));
  assert.ok(s.ram[0x10190]&4);assert.equal(s.ram[0x10000],45);assert.equal(s.ram[0x2981],128);
  await screenshot(s,'.local/qa/prison-breakout.png');f.close();
});

test('Donkey also joins through the office after Shrek breaks out alone',async()=>{
  const f=await fixture('prison-office'),{s}=f;runFrames(s,20,32);
  for(let i=0;i<90&&s.ram[0x10000]!==46;i++)f.press();runFrames(s,120);
  for(const id of[35,29,37,34])assert.ok(saw(f,29,id));assert.equal(s.ram[0x10000],46);
  assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,2,128]);await screenshot(s,'.local/qa/prison-office-rescue.png');f.close();
});

test('the Duloc Tank formation, defeat and collapsed bridge complete with native controller input',async()=>{
  const f=await fixture('prison-tank'),{s}=f,targets=new Set();runFrames(s,20,64);
  for(let i=0;i<130&&s.ram[0x1021a]!==1;i++){
    f.press();if(saw(f,28,39)&&!saw(f,28,40))runFrames(s,12,64);
    for(const id of s.ram.subarray(0xaf02,0xaf0a))if([147,148,173].includes(id))targets.add(id);
  }
  assert.deepEqual([...targets].sort((a,b)=>a-b),[147,148,173]);assert.equal(s.ram[0x1021a],1,'post-collapse native flag');
  assert.ok(s.ram[0x10199]&4);assert.equal(s.ram[0x10000],46);for(const id of[39,40,41])assert.ok(saw(f,28,id));
  await screenshot(s,'.local/qa/prison-tank-defeated.png');f.close();
});

test('Fiona confronts Harold and joins the escape party through the native court scene',async()=>{
  const f=await fixture('castle-escape'),{s}=f;runFrames(s,60,16);
  for(let i=0;i<100&&u16(s.ram,256)!==19;i++)f.press();runFrames(s,120);
  assert.equal(u16(s.ram,256),19);assert.equal(s.ram[0x10000],48);assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,2,1]);
  for(let id=17;id<=35;id++)assert.ok(saw(f,21,id),'court escape '+id);
  await screenshot(s,'.local/qa/prison-fiona-escape.png');f.close();
});

test('the forest escape activates its real gate and reaches the future with all three companions',async()=>{
  const f=await fixture('forest-escape'),{s}=f;
  for(let i=0;i<100&&s.ram[0x10000]!==51;i++)f.press();runFrames(s,600);
  assert.equal(s.ram[0x10000],51);for(let id=6;id<=13;id++)assert.ok(saw(f,20,id));
  // Walk Shrek (native object 2) to the gate after the pursuit finishes.
  for(let i=0;i<90&&s.ram[0x10212]!==1;i++){
    const dx=152-u16(s.ram,0x1804)/16,dy=175-u16(s.ram,0x1884)/16;
    runFrames(s,4,Math.abs(dx)>2?(dx>0?128:64):Math.abs(dy)>2?(dy>0?32:16):256);
  }
  for(let i=0;i<90&&(u16(s.ram,256)!==208||s.ram[0x12000]!==13);i++)f.press();runFrames(s,240);
  assert.ok(saw(f,20,14));assert.equal(u16(s.ram,256),208);assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,2,1]);
  assert.equal(s.ram[0x12000],13,'the destination event loaded after the time tunnel');
  await screenshot(s,'.local/qa/prison-future-arrival.png');f.close();
});
