import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {snapshot,restore} from '../engine/save.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {decode,encodeDialogue} from '../engine/text.js';
import {snesColor} from '../engine/sprites.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {worldwideSong} from '../engine/music.js';
import {mrWorldwideAI,mrWorldwideStatRecord,mrWorldwideRewardRecord,mrWorldwideTechMap,eventCommands,releasedMessageSpan} from '../engine/mr-worldwide.js';
import {mrWorldwideFrames} from '../engine/mr-worldwide-art.js';
import {mrWorldwide,mrWorldwideStates as F,mrWorldwideDialogue,greeterDialogue,mrWorldwideBattleMessages,mrWorldwidePhases,mrWorldwidePalette,mrWorldwideText as T,greeterText as G} from '../content/mr-worldwide.js';
import {nativeSpriteBank,nativeSpriteCells} from '../scripts/native-sprite-view.mjs';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json','utf8'));
const {enemy,gfx,asm,palette,flag,kitchen,walmart}=mrWorldwide,BOSS=0x5e2d+3*128;
const sourceEvents=Array.from({length:513},(_,id)=>{try{return decompress(b.base,fileOffset(u24(b.base,0x3cf9f0+id*3))).bytes;}catch{return null;}}).filter(Boolean);
const flagByte=()=>0x10000+flag;
const builtEvent=id=>decompress(b.rom,cartridgeOffset(u24(b.rom,0x3cf9f0+id*3),b.rom)).bytes;
const sourceEvent=id=>decompress(b.base,fileOffset(u24(b.base,0x3cf9f0+id*3))).bytes;

test('Mr. Worldwide takes an unused enemy record and private native resources',()=>{
  // No source event loads the record and no AI transforms into it.
  for(const ev of sourceEvents)for(let i=0;i+2<ev.length;i++)assert.ok(!(ev[i]===0x83&&ev[i+1]===enemy),'source event loads enemy 0x24');
  for(let id=0;id<256;id++)for(const s of readEnemyAI(b.base,id).sections)for(const block of s)for(const a of block.actions)assert.ok(!(a.bytes[0]===7&&a.bytes[1]===enemy));
  assert.equal(decode(b.base.slice(0xc6500+enemy*11,0xc6500+enemy*11+11)),'Octobino');
  // The saved flag byte is unused by source events and native long addresses.
  const address=[flag&255,flag>>8,0x7f];
  for(const ev of sourceEvents)for(let i=0;i+2<ev.length;i++)assert.ok(!address.every((v,k)=>ev[i+k]===v),'source event uses the flag byte');
  for(let p=0;p+3<0x400000;p++)if([0xaf,0x8f,0xcf,0x0f,0x2f].includes(b.base[p]))assert.ok(!address.every((v,k)=>b.base[p+1+k]===v),'native code uses the flag byte');
  // Ordinary records.
  assert.deepEqual(b.rom.slice(0xc4700+enemy*23,0xc4700+enemy*23+23),mrWorldwideStatRecord());
  assert.deepEqual(b.rom.slice(0xc5e00+enemy*7,0xc5e00+enemy*7+7),mrWorldwideRewardRecord());
  assert.equal(decode(b.rom.slice(0xc6500+enemy*11,0xc6500+enemy*11+11)),'Pitbull');
  assert.deepEqual([...b.rom.slice(0x24f600+enemy*10,0x24f605+enemy*10)],[gfx,asm,palette,mrWorldwide.animation,mrWorldwide.size]);
  for(const h of[...Array.from({length:256},(_,i)=>0x24f000+i*5),...Array.from({length:256},(_,i)=>0x24f600+i*10)])if(h!==0x24f600+enemy*10)
    assert.ok(b.rom[h]!==gfx&&b.rom[h+1]!==asm&&b.rom[h+2]!==palette,'sprite resources are private');
  const colors=0x240000+u16(b.rom,0x242a00+palette*2);
  assert.deepEqual(Array.from({length:12},(_,i)=>u16(b.rom,colors+i*2)),mrWorldwidePalette.map(snesColor));
  // Native AI in the released bank-CC message span.
  assert.equal(u16(b.rom,0xc8b08+enemy*2),releasedMessageSpan.start&65535);
  assert.notEqual(u16(b.rom,0xd0299),releasedMessageSpan.start&65535,'message table relocated');
  const ai=mrWorldwideAI(),read=readEnemyAI(b.rom,enemy);
  assert.deepEqual(b.rom.slice(read.start,read.end),ai.bytes);
  assert.equal(read.sections[0].length,ai.sections[0].length);
  // Technique clones keep their source animation, element and formula;
  // every damaging move but the HP-halving Heat Wave is Fire.
  for(const t of Object.values(mrWorldwideTechMap())){
    assert.deepEqual([...b.rom.slice(0xd5526+t.id*7,0xd5526+t.id*7+7)],[...b.base.slice(0xd5526+t.source*7,0xd5526+t.source*7+7)]);
    assert.equal(b.rom[0xc6fc9+t.id*11+5],t.id);
    assert.equal(b.rom[0xc6fc9+t.id*11+3],b.base[0xc6fc9+t.source*11+3],'native element and category');
    if(!['heat-wave','room-service'].includes(t.key))assert.equal(b.rom[0xc6fc9+t.id*11+3]&0xf0,0x10,t.key+' is Fire');
    const effect=b.rom.slice(0xc7ac9+t.id*12,0xc7ac9+t.id*12+12),source=b.base.slice(0xc7ac9+t.source*12,0xc7ac9+t.source*12+12);
    assert.deepEqual([effect[0],...effect.slice(3,9)],[source[0],...source.slice(3,9)],'native formula');
  }
  // Battle text in the relocated message table.
  const table=fileOffset(u24(b.rom,0xd0299)&0xffff|(b.rom[0xd02a0]<<16));
  for(const [id,text]of Object.entries(mrWorldwideBattleMessages)){
    const p=(table&0xff0000)|u16(b.rom,table+id*2),bytes=encodeDialogue(text,b.base);
    assert.deepEqual(b.rom.slice(p,p+bytes.length),bytes,'battle message '+id);
  }
  // The fight plays Fireball · Boss Battle 2 from its own song slot.
  assert.equal(mrWorldwide.song,worldwideSong);
});

test('the cartridge holds the authored twelve-cell Mr. Worldwide frames',()=>{
  const bank=nativeSpriteBank(b.rom,{gfx,asm,palette,size:mrWorldwide.size,frames:mrWorldwide.frames}),authored=mrWorldwideFrames();
  assert.equal(bank.cells,12);
  authored.forEach((pixels,frame)=>{
    const image=new Uint8Array(pixels.length);
    for(const c of nativeSpriteCells(bank,frame))for(let i=0;i<256;i++)if(c.pixels[i]){
      const x=c.x+24+(i&15),y=c.y+64+(i>>4);assert.ok(x>=0&&x<48&&y>=0&&y<64);image[y*48+x]=c.pixels[i];
    }
    assert.deepEqual(image,pixels,'frame '+frame);
  });
  assert.ok(b.audit.mrWorldwide.tiles<=1024);
});

function stringsInTable(event,objects,strings){
  const command=event.findIndex((v,i)=>v===0xb8&&i>=1+objects*32&&i<1+objects*32+8),table=fileOffset(u24(event,command+1));
  for(const [id,text]of Object.entries(strings)){
    const p=(table&0xff0000)|u16(b.rom,table+id*2),bytes=encodeDialogue(text,b.base);
    assert.deepEqual(b.rom.slice(p,p+bytes.length),bytes,'room string '+id);
  }
}

test('room 465 appends the greeter without moving any lesson-room function',()=>{
  const built=builtEvent(kitchen.eventId),source=sourceEvent(kitchen.eventId);
  assert.equal(built[0],kitchen.objects+1);assert.ok(built.length<=0x1700);
  eventCommands(built);
  for(let i=0;i<kitchen.objects*16;i++)assert.equal(u16(built,1+i*2),u16(source,1+i*2)+32,'source function '+i);
  // The greeter is an ordinary stock NPC, so Guy's practice calls stay direct.
  for(const p of[0x557,0x6ea])assert.deepEqual([...built.slice(p+32,p+35)],[0x04,0x00,0x43],'practice call unchanged');
  const init=u16(built,1+kitchen.objects*32);
  assert.ok(built.slice(init+1,init+16).includes(0x82),'loads a stock NPC');
  stringsInTable(built,kitchen.objects+1,greeterDialogue);
});

test('room 344 keeps every storeroom function and guards two behind the visit flag',()=>{
  const built=builtEvent(walmart.eventId),source=sourceEvent(walmart.eventId);
  assert.equal(built[0],walmart.objects+1);assert.ok(built.length<=0x1700);
  eventCommands(built);
  const starts=[...new Set(Array.from({length:source[0]*16},(_,i)=>u16(source,1+i*2)))].sort((x,y)=>x-y);
  const length=old=>(starts[starts.indexOf(old)+1]??source.length-1)-old;
  for(let i=0;i<walmart.objects*16;i++){
    const old=u16(source,1+i*2),now=u16(built,1+i*2);
    if(i===0||i===8*16){
      // Ordinary visits run a verbatim copy behind a flag read.
      assert.deepEqual([...built.slice(now+1+(i?0:1),now+1+(i?0:1)+5)],[0x48,flag&255,flag>>8,0x7f,mrWorldwide.flagLocal]);
      // Object 0's copy starts after its return and patched B8 table command.
      const copy=[...source.slice(old+1+(i?0:5),old+1+length(old))].join(),body=[...built.slice(now+1)].join();
      assert.ok(body.includes(copy),'verbatim source copy of function '+i);
      continue;
    }
    assert.equal(now,old+32,'storeroom function '+i+' moves with the table');
    // The dialogue table pointer is the only difference.
    for(let k=1;k<=length(old);k++)if(old+k<0x123||old+k>0x125)assert.equal(built[now+k],source[old+k],`storeroom function ${i}, byte ${k}`);
  }
  stringsInTable(built,walmart.objects+1,mrWorldwideDialogue);
});

// ---------------------------------------------------------------- emulator
const loc=s=>u16(s.ram,0x100);
async function kitchenRoom({story=0xd0,state=F.unmet,x=8,y=10,level}={}){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  const seen=[],battle=[];
  h.on('battle.message',e=>battle.push(['message',e.messageId]));
  h.on('battle.enemy-tech',e=>battle.push(['tech',e.operand]));
  s.ram[0x10000]=story;s.ram[flagByte()]=state;
  if(level!==undefined)d.jump({id:kitchen.location,x,y,facing:0,party:[0,1,2],trainingLevel:level});
  else d.jump({id:kitchen.location,x,y,facing:0,party:[0,1,2],endgame:true});
  runFrames(s,320);
  const observe=()=>{if(s.ram[0x126]&&seen.at(-1)!==s.ram[0x12a])seen.push(s.ram[0x12a]);};
  const tap=(button,wait=60)=>{runFrames(s,4,button);for(let i=0;i<wait;i++){runFrames(s,1);observe();}};
  const close=()=>{for(let n=0;n<80&&(s.ram[0x126]||!s.ram[0x11f]);n++)tap(256,80);};
  return {s,h,d,seen,battle,observe,tap,close};
}
const quantity=(s,id)=>{let n=0;for(let i=0;i<256;i++)if(s.ram[0x2400+i]===id)n+=s.ram[0x2500+i];return n;};
const inBattle=s=>!!(s.ram[0x117]&1);
const formation=s=>[...s.ram.slice(0xaf02,0xaf0a)];
const choosing=(r,id)=>()=>r.s.ram[0x12a]===id&&r.s.ram[0x162]===2;
function talkToGreeter(r,until){r.close();runFrames(r.s,40,128);runFrames(r.s,6);r.tap(256,90);for(let n=0;n<30&&!until();n++)r.tap(256,60);}
function choose(r,row){if(r.s.ram[0x163]!==row)r.tap(row===2?16:32,12);r.tap(256,60);}
function arrive(r){for(let n=0;n<40&&loc(r.s)!==walmart.location;n++)r.tap(256,60);assert.equal(loc(r.s),walmart.location,'Kodiak');}
function backInKitchen(r){for(let n=0;n<60&&!(loc(r.s)===kitchen.location&&!r.s.ram[0x126]&&r.s.ram[0x11f]);n++)r.tap(256,70);assert.equal(loc(r.s),kitchen.location,'back in Guy\'s kitchen');assert.equal(r.s.ram[0x29ae],kitchen.song,'the kitchen theme returns');}
function rejump(r){r.d.jump({id:kitchen.location,x:8,y:10,facing:0});runFrames(r.s,320);}

let battleStart=null;
test('the greeter waits for the story gate, then the Kodiak trip is refusable twice over',async()=>{
  const early=await kitchenRoom({story:0xca});
  talkToGreeter(early,()=>early.s.ram[0x126]);
  assert.ok(!early.seen.some(id=>id>=G.greet&&id<=G.after),'no greeter before the gate');
  assert.equal(early.s.ram[flagByte()],F.unmet);early.d.dispose();early.h.dispose();

  const r=await kitchenRoom();
  talkToGreeter(r,choosing(r,G.choice));
  assert.deepEqual(r.seen.slice(0,2),[G.greet,G.choice]);await screenshot(r.s,'.local/qa/mr-worldwide-greeter.png').catch(()=>{});
  choose(r,3);assert.equal(r.s.ram[0x12a],G.decline);r.close();
  assert.equal(loc(r.s),kitchen.location);assert.equal(r.s.ram[flagByte()],F.unmet);

  r.seen.length=0;talkToGreeter(r,choosing(r,G.choice));choose(r,2);
  assert.ok(r.seen.includes(G.go));arrive(r);assert.equal(r.s.ram[flagByte()],F.visitFirst);
  for(let n=0;n<30&&!choosing(r,T.choice)();n++)r.tap(256,60);
  assert.deepEqual(r.seen.filter(id=>id<=T.loss),[T.intro,T.donkey,T.choice],'first meeting, with Donkey in the party');
  assert.equal(r.s.ram[0x29ae],worldwideSong,'his theme plays in the stockroom');
  await screenshot(r.s,'.local/qa/mr-worldwide-choice.png').catch(()=>{});
  choose(r,3);assert.equal(r.s.ram[0x12a],T.decline);backInKitchen(r);
  assert.equal(r.s.ram[flagByte()],F.met);assert.equal(inBattle(r.s),false);

  r.seen.length=0;rejump(r);talkToGreeter(r,choosing(r,G.choice));choose(r,2);arrive(r);
  assert.equal(r.s.ram[flagByte()],F.visitRepeat);
  for(let n=0;n<30&&!choosing(r,T.choice)();n++)r.tap(256,60);
  assert.ok(r.seen.includes(T.repeat)&&!r.seen.includes(T.intro),'repeat visit');
  choose(r,2);
  for(let n=0;n<80&&!inBattle(r.s);n++)r.tap(256,60);
  assert.ok(inBattle(r.s),'native battle');assert.ok(r.seen.includes(T.accept));
  runFrames(r.s,240);
  assert.deepEqual(formation(r.s),[enemy,255,255,255,255,255,255,255],'Mr. Worldwide alone, in battle slot 3');
  assert.equal(r.s.ram[BOSS+5]|r.s.ram[BOSS+6]<<8,mrWorldwidePhases[0].hp);
  assert.equal(r.s.ram[0x29ae],worldwideSong,'Fireball · Boss Battle 2');
  assert.ok(r.battle.some(([k,v])=>k==='message'&&v===227),'battle intro');
  await screenshot(r.s,'.local/qa/mr-worldwide-battle.png').catch(()=>{});
  battleStart=snapshot(r.s);r.d.dispose();r.h.dispose();
});

async function fromBattle(){
  const r=await kitchenRoom();restore(r.s,battleStart);r.seen.length=0;return r;
}

test('winning grants the reward scene once and ends the exile',async()=>{
  assert.ok(battleStart);
  const r=await fromBattle(),specs0=quantity(r.s,187),feasts0=quantity(r.s,197);
  r.s.ram[BOSS+3]=1;r.s.ram[BOSS+4]=0; // diagnostic: one hit from victory
  for(let n=0;n<600&&inBattle(r.s);n++){runFrames(r.s,4,256);runFrames(r.s,8);}
  assert.equal(inBattle(r.s),false);
  backInKitchen(r);
  for(const id of[T.victory,T.reward,T.aftermath])assert.ok(r.seen.includes(id),'scene '+id);
  assert.equal(quantity(r.s,187),specs0+1,'Spectacular Specs');
  assert.equal(quantity(r.s,197),feasts0+3+1,'three Ginger Roots plus the native battle drop');
  assert.equal(r.s.ram[flagByte()],F.defeated);
  // The greeter only says goodbye now: no trip, no second reward.
  rejump(r);r.seen.length=0;talkToGreeter(r,()=>r.seen.includes(G.after));
  assert.ok(r.seen.includes(G.after));r.close();
  assert.equal(loc(r.s),kitchen.location);assert.equal(quantity(r.s,187),specs0+1);assert.equal(r.s.ram[flagByte()],F.defeated);
  r.d.dispose();r.h.dispose();
});

test('losing has no game over and leaves a rematch',async()=>{
  const r=await fromBattle();
  for(let n=0;n<4000&&inBattle(r.s);n++){
    for(let slot=0;slot<3;slot++){const p=0x5e2d+slot*128;if((r.s.ram[p+3]|r.s.ram[p+4]<<8)>1){r.s.ram[p+3]=1;r.s.ram[p+4]=0;}}
    runFrames(r.s,12);
  }
  assert.equal(inBattle(r.s),false);
  backInKitchen(r);
  assert.ok(r.seen.includes(T.loss));assert.equal(r.s.ram[flagByte()],F.met);
  assert.equal([0,1,2].filter(slot=>r.s.ram[0x2600+r.s.ram[0x2980+slot]*80+3]|r.s.ram[0x2604+r.s.ram[0x2980+slot]*80]).length,3,'the party is restored');
  rejump(r);talkToGreeter(r,choosing(r,G.choice));choose(r,2);arrive(r);
  for(let n=0;n<30&&!choosing(r,T.choice)();n++)r.tap(256,60);
  assert.equal(r.s.ram[0x12a],T.choice,'rematch offered');
  r.d.dispose();r.h.dispose();
});

test('ordinary storeroom visits stay stock and Guy practice stays one-on-one',async()=>{
  for(const state of[F.unmet,F.met,F.defeated]){
    const r=await kitchenRoom({state});
    r.d.jump({id:walmart.location,x:8,y:12,facing:0});runFrames(r.s,400);
    assert.equal(loc(r.s),walmart.location);
    assert.ok(!r.seen.some(id=>id>=T.intro&&id<=T.loss),'no Kodiak scene');
    assert.notEqual(r.s.ram[0x29ae],worldwideSong,'the storeroom keeps its own music');
    assert.equal(r.s.ram[flagByte()],state);
    r.d.dispose();r.h.dispose();
  }
  for(const level of[25,50]){
    const r=await kitchenRoom({state:F.met,x:7,y:12,level});
    r.close();runFrames(r.s,30,16);runFrames(r.s,6);r.tap(256,90);
    for(let n=0;n<80&&!inBattle(r.s);n++){
      if(r.s.ram[0x162]===2&&[152,154].includes(r.s.ram[0x12a])){if(r.s.ram[0x163]!==r.s.ram[0x164])r.tap(16,12);r.tap(256,60);continue;}
      r.tap(256,60);
    }
    assert.ok(inBattle(r.s),'practice battle at level '+level);runFrames(r.s,200);
    const f=formation(r.s);
    assert.ok(f[0]>=224&&f[0]<=229,'Guy in slot 3');assert.ok(!f.includes(enemy),'Mr. Worldwide stays in Kodiak');
    r.d.dispose();r.h.dispose();
  }
});

test('the AI tours four phases with native barrier writes and a telegraphed FIREBALL',async()=>{
  const r=await fromBattle(),ids=mrWorldwideTechMap();
  const heal=()=>{for(let slot=0;slot<3;slot++){const p=0x5e2d+slot*128;r.s.ram[p+3]=r.s.ram[p+5];r.s.ram[p+4]=r.s.ram[p+6];r.s.ram[p+0x1d]&=0x7f;}};
  for(const [phase,next] of mrWorldwidePhases.slice(1).entries()){
    const hp=next.hp-500;r.s.ram[BOSS+3]=hp&255;r.s.ram[BOSS+4]=hp>>8;
    for(let n=0;n<300&&r.s.ram[BOSS+0x37]!==phase+1;n++){heal();runFrames(r.s,10);}
    assert.equal(r.s.ram[BOSS+0x37],phase+1,'phase '+(phase+2));
    assert.deepEqual([...r.s.ram.slice(BOSS+0x3f,BOSS+0x43)],next.elements,'element bytes');
    assert.equal(r.s.ram[BOSS+0x3e],next.defense);assert.equal(r.s.ram[BOSS+0x3c],next.magicDefense);
  }
  r.battle.length=0;
  for(let n=0;n<900&&!r.battle.some(([k,v])=>k==='tech'&&v===ids.fireball.id);n++){heal();runFrames(r.s,10);}
  const strike=r.battle.findIndex(([k,v])=>k==='tech'&&v===ids.fireball.id);
  assert.ok(strike>0,'FIREBALL');
  assert.ok(r.battle.slice(0,strike).some(([k,v])=>k==='message'&&v===233),'one-turn countdown before the strike');
  r.d.dispose();r.h.dispose();
});

test('Fire is absorbed in Miami and hypes him up in Fireball mode',async()=>{
  const {chooseNativeTech}=await import('./battle-controller.mjs');
  const r=await fromBattle(),s=r.s,io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(k,n=12)=>{runFrames(s,3,k);runFrames(s,n);},wait:n=>runFrames(s,n)};
  const heal=()=>{for(let slot=0;slot<3;slot++){const p=0x5e2d+slot*128;s.ram[p+3]=s.ram[p+5];s.ram[p+4]=s.ram[p+6];s.ram[p+0x1d]&=0x7f;}};
  const castFire=async()=>{
    r.battle.length=0;
    // Shrek and Fiona take ordinary attacks until Donkey's command menu opens.
    for(let n=0;n<900&&!(s.ram[0x95d5]===2&&s.ram[0x95db]===0&&!s.ram[0x9609]);n++){heal();runFrames(s,4,s.ram[0x95d5]<2?256:0);runFrames(s,6);}
    await chooseNativeTech(io,b.rom,2,19);
    for(let n=0;n<120&&!r.battle.some(([k])=>k==='message');n++){heal();runFrames(s,5);}
  };
  for(let n=0;n<300&&s.ram[BOSS+0x37]!==0;n++){heal();runFrames(s,10);}
  assert.equal(s.ram[BOSS+0x37],0,'first phase after the intro');
  const before=u16(s.ram,BOSS+3);
  await castFire();
  assert.ok(r.battle.some(([k,v])=>k==='message'&&v===240),'Miami absorbs Fire');
  assert.ok(u16(s.ram,BOSS+3)>=before,'absorbed, not damaged');
  for(const next of mrWorldwidePhases.slice(1,3)){const hp=next.hp-500;s.ram[BOSS+3]=hp&255;s.ram[BOSS+4]=hp>>8;for(let n=0;n<300&&u16(s.ram,BOSS+3)!==0&&s.ram[BOSS+0x3f+3]!==next.elements[3];n++){heal();runFrames(s,10);}}
  for(let n=0;n<300&&s.ram[BOSS+0x37]!==2;n++){heal();runFrames(s,10);}
  assert.equal(s.ram[BOSS+0x37],2,'Fireball mode');
  await castFire();
  assert.ok(r.battle.some(([k,v])=>k==='message'&&v===238),'Fire hypes him up');
  assert.equal(s.ram[BOSS+0x3d],0xd0);
  r.d.dispose();r.h.dispose();
});
