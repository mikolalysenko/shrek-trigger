import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {medievalDialogue} from '../content/medieval-dialogue.js';
import {areas} from '../content/areas.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {encodeDialogue,decode} from '../engine/text.js';
import {decompress} from '../engine/compression.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json')),layouts=JSON.parse(await readFile('content/event-layouts.json'));

test('all medieval dialogue pointers resolve in-bank and every native story, reward and choice branch is preserved',()=>{
  let count=0;
  for(const [location,lines]of Object.entries(medievalDialogue)){
    const l=layouts.find(l=>l.location===+location),old=decompress(built.base,l.eventPointer).bytes;
    const now=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+l.eventId*3))).bytes;
    assert.equal(now.length,old.length);assert.deepEqual(Object.keys(lines).map(Number).sort((a,b)=>a-b),l.strings.map(s=>s.id).sort((a,b)=>a-b));
    const edited=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
    for(let i=0;i<old.length;i++)if(!edited.has(i))assert.equal(now[i],old[i],`native event ${location}:${i}`);
    for(const command of l.tableCommands){
      assert.equal(now[command],0xb8);const table=fileOffset(u24(now,command+1));
      for(const [id,text]of Object.entries(lines)){
        const addr=(table&0x3f0000)+u16(built.rom,table+id*2),encoded=encodeDialogue(text,built.base);
        assert.equal(addr>>16,(addr+encoded.length-1)>>16);assert.deepEqual(built.rom.slice(addr,addr+encoded.length),encoded);
        assert.ok(text.endsWith('{null}'));assert.ok(!/\b(Crono|Lucca|Marle|Guardia|Leene|Cyrus|Glenn|Yakra|Masamune)\b/i.test(text));
        for(const line of text.replace(/\{(?:page3|page|full)\}/g,'\n').replace(/\{[^}]+\}/g,'').split('\n'))assert.ok(line.length<=36,`${location}:${id}: ${line}`);
        count++;
      }
    }
  }
  assert.equal(count,374);
  assert.equal(decode(built.rom.slice(0xc6500+144*11,0xc650b+144*11)),'Masquerader');
  // The native choice mask encodes the first and last selectable rows.
  for(const [loc,pos,opcode,id,mask]of[[116,815,192,152,11],[116,961,192,138,6],[116,1418,192,147,6],[117,1146,192,209,11],[122,1342,192,36,11],[122,1429,192,40,6],[122,2563,196,110,11],[123,1675,195,204,7],[124,1348,195,71,6],[124,1550,192,74,6],[129,1149,192,16,11]]){
    const l=layouts.find(l=>l.location===loc),e=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+l.eventId*3))).bytes;
    assert.deepEqual([...e.slice(pos+1,pos+4)],[opcode,id,mask]);
    const rows=medievalDialogue[loc][id].replace('{null}','').split('\n'),first=mask>>2,last=mask&3;
    assert.equal(rows.length,last+1);for(let row=first;row<=last;row++)assert.ok(rows[row].startsWith('   '));
  }
});

async function fixture(key){
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[];
  h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
  const area=areas.find(a=>a.rescueScene===key),original=s.ram[0x10000];dev.jump(area);runFrames(s,400);
  return {s,h,dev,messages,original,press(){runFrames(s,3,256);runFrames(s,100);},close(){dev.undo();assert.equal(u16(s.ram,256),2);assert.equal(s.ram[0x10000],original);assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,128,128]);dev.dispose();h.dispose();}};
}
function walk(s,tx,ty){
  for(let i=0;i<180;i++){
    const dx=tx*16+8-u16(s.ram,0x1802)/16,dy=ty*16+15-u16(s.ram,0x1882)/16;
    if(Math.abs(dx)<3&&Math.abs(dy)<3)return;
    runFrames(s,4,(Math.abs(dx)>3?(dx>0?128:64):0)|(Math.abs(dy)>3?(dy>0?32:16):0));
  }
  assert.fail('Medieval route did not reach its destination');
}

test('Fiona vanishes through the native royal-room scene and the diagnostic undo restores the previous campaign',async()=>{
  const f=await fixture('fiona-vanishes'),{s,dev,messages}=f;
  assert.throws(()=>dev.jump({id:6,x:8,y:10,rescueScene:'fiona-vanishes'}),/own location/);
  runFrames(s,30,16);for(let i=0;i<60&&s.ram[0x10000]!==16;i++)f.press();runFrames(s,240);
  assert.equal(s.ram[0x10000],16);assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,128,128]);
  for(let id=22;id<=34;id++)assert.ok(messages.some(([l,n])=>l===122&&n===id),'Fiona scene '+id);
  assert.equal(dev.diagnostics().fatal,null);await screenshot(s,'.local/qa/medieval-fiona-vanished.png');f.close();
});

test('Puss recruitment survives refusing and then accepting after the native ambush and naming screen',async()=>{
  const f=await fixture('puss-joins'),{s,h,messages}=f;let naming=false,declined=false;
  h.on('event.dispatch',e=>{if(e.location===129&&e.opcode===0xc8&&s.ram[0x12002+e.scriptPC]===196)naming=true;});
  runFrames(s,20,16);
  for(let i=0;i<150&&s.ram[0x10000]!==21;i++){
    if(!declined&&messages.at(-1)?.[1]===16){runFrames(s,100);runFrames(s,3,32);runFrames(s,3);declined=true;}
    if(naming){runFrames(s,120);runFrames(s,3,8);runFrames(s,120);naming=false;}
    f.press();
  }
  assert.equal(s.ram[0x10000],21);assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,2,4]);
  for(let id=4;id<=22;id++)assert.ok(messages.some(([l,n])=>l===129&&n===id),'recruitment line '+id);
  assert.equal(s.ram[0x29af]&8,8,'the native add-character command records Puss in the joined mask');assert.ok(!s.cpu.stopped);await screenshot(s,'.local/qa/medieval-puss-recruited.png');f.close();
});

test('the impostor battle, queen escort and return to court finish with native input and remove Puss from the party',async()=>{
  const f=await fixture('queen-rescue'),{s,dev,messages}=f;let fought=false;
  for(let i=0;i<3;i++)f.press();runFrames(s,70,16);
  for(let i=0;i<110;i++){f.press();if(s.ram.subarray(0xaf02,0xaf0a).includes(144))fought=true;if(messages.some(([l,n])=>l===198&&n===42)&&s.ram[0x10228])break;}
  assert.ok(fought,'native Masquerader formation');assert.equal(s.ram[0x10228],1,'queen finished her post-battle walk');
  walk(s,7,21);runFrames(s,12,32);
  for(let i=0;i<80&&s.ram[0x10000]!==28;i++)f.press();runFrames(s,240);
  assert.equal(u16(s.ram,256),120);assert.equal(s.ram[0x10000],28);assert.ok(s.ram[0x2982]&128,'Puss leaves');
  for(let id=30;id<=44;id++)assert.ok(messages.some(([l,n])=>l===198&&n===id),'rescue line '+id);
  for(const id of[95,96,97,114])assert.ok(messages.some(([l,n])=>l===120&&n===id));
  assert.equal(dev.diagnostics().fatal,null);await screenshot(s,'.local/qa/medieval-queen-returned.png');f.close();
});

test('both answers to Fiona preserve her return, recruitment and the route home',async()=>{
  for(const answer of[0,1]){
    const f=await fixture('fiona-returns'),{s,messages}=f;let chosen=false;runFrames(s,30,16);
    for(let i=0;i<100&&s.ram[0x10000]!==33;i++){
      if(!chosen&&messages.at(-1)?.[1]===110){runFrames(s,100);if(answer){runFrames(s,3,32);runFrames(s,3);}chosen=true;}
      f.press();
    }
    assert.equal(s.ram[0x10000],33);assert.ok(chosen);
    assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,2,1]);
    for(const id of[101,102,103,104,105,106,107,108,109,110,answer?112:111,113])assert.ok(messages.some(([l,n])=>l===122&&n===id),'return line '+id);
    assert.equal(s.ram[0x100a1]&4,0,'one-shot restoration trigger cleared');
    await screenshot(s,`.local/qa/medieval-fiona-answer-${answer}.png`);f.close();
  }
});
