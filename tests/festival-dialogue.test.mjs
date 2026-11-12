import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,screenshot} from './helpers.mjs';
import {dialogue} from '../content/dialogue.js';
import {decompress} from '../engine/compression.js';
import {fileOffset,u16,u24} from '../engine/rom.js';
import {createCore} from '../scripts/core.mjs';
import {newGame,runFrames} from '../engine/automation.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {restore,snapshot} from '../engine/save.js';

const built=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json','utf8')),specs=JSON.parse(await readFile('content/hooks.json','utf8')),glyphPixels=new Uint8Array(512*480*4);
function glyphBandHash(s,y0){
  s.setPixels(glyphPixels);const mask=new Uint8Array(512*16/8);
  for(let y=y0;y<y0+16;y++)for(let x=64;x<240;x++){
    const p=(y*512+x)*4;if(glyphPixels[p]>150&&glyphPixels[p+1]>150&&glyphPixels[p+2]>150){const bit=(y-y0)*512+x;mask[bit>>3]|=1<<(bit&7);}
  }
  return createHash('sha256').update(mask).digest('hex');
}

function finalPage(id){
  return dialogue[439][id].replace('{null}','').split(/\{(?:page|full)\}/).at(-1).split('\n');
}

test('Fiona pendant and company choices select the exact native rows',()=>{
  const layout=layouts.find(l=>l.location===439),event=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+layout.eventId*3))).bytes;
  assert.equal(layout.eventId,74);
  assert.deepEqual([...event.slice(0x5b1,0x5b4)],[0xc0,41,0x06]);
  assert.deepEqual([...event.slice(0x5be,0x5c1)],[0xc0,43,0x0b]);
  // The masks address the complete option rows, including their indentation.
  assert.deepEqual(finalPage(41).map((row,i)=>[i,row]),[
    [0,'May I have it back?'],[1,'   Yes.'],[2,'   No.']
  ]);
  assert.deepEqual(finalPage(43).map((row,i)=>[i,row]),[
    [0,'Would you mind'],[1,'some company?'],[2,'   Sure.'],[3,'   Sorry.']
  ]);
  assert.deepEqual(finalPage(41).slice(1,3),['   Yes.','   No.']);
  assert.deepEqual(finalPage(43).slice(2,4),['   Sure.','   Sorry.']);
  assert.match(dialogue[439][59],/Fiona[\s\S]*fair\nvendors/,'setup hint names Fiona and the fair vendors');
});

test('native festival pendant, company branches, naming and vendor progression',{timeout:120000},async()=>{
  const s=await createCore(built.rom);
  // Start through real input. In particular, do not use helpers.bedroom(), which
  // is allowed to regenerate its on-disk checkpoint for a changed cartridge.
  await newGame(s);
  const h=installHooks(s,specs),dev=createDevTools(s,h),messages=[];
  h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
  const saw=(id,location=439)=>messages.some(([l,n])=>l===location&&n===id);
  const story=()=>s.ram[0x10000],location=()=>u16(s.ram,0x100),playable=()=>s.ram[0x11f]&&!s.ram[0x126];
  const position=()=>{const leader=u16(s.ram,0x197);return{x:u16(s.ram,0x1800+leader)/16,y:u16(s.ram,0x1880+leader)/16};};
  const press=(button=256,gap=117)=>{runFrames(s,3,button);runFrames(s,gap);};
  function advanceTo(id,max=40){for(let n=0;n<max&&!saw(id);n++)press();assert.ok(saw(id),`dialogue ${id} rendered`);}
  function finish(max=40){for(let n=0;n<max&&!playable();n++)press();assert.ok(playable(),'native dialogue returned control');}
  async function choose(id,first,option){
    const ready=()=>s.ram[0x12a]===id&&s.ram[0x126]&&s.ram[0x162]===2&&s.ram[0x164]===first;
    for(let n=0;n<30&&!ready();n++)press();
    assert.ok(ready(),`dialogue ${id} starts its choice at row ${first}`);
    if(id===43){
      assert.equal(glyphBandHash(s,112),'b853ef29c64f5905cff3c098cda0b595e2dbeb2833b581c59e38b97418c29840','Sure renders as a complete label');
      assert.equal(glyphBandHash(s,144),'1e0328c0bd671f9fa526fdac68ba242c4a3e734ea3396741b5b4a33819db288a','Sorry renders as a complete label, not a blank row');
    }
    await screenshot(s,`.local/qa/festival-choice-${id}-before.png`);
    const target=first+option;
    for(let n=0;n<5&&s.ram[0x163]!==target;n++){press(s.ram[0x163]<target?32:16,6);}
    assert.equal(s.ram[0x163],target,`dialogue ${id} selected row ${target}`);
    await screenshot(s,`.local/qa/festival-choice-${id}-target-${target}.png`);
    press();
  }
  function walk(x,y,{max=900,allowStuck=false}={}){
    let last='',stuck=0,arrived=false;
    for(let n=0;n<max&&location()===439&&playable();n++){
      const p=position(),dx=x-p.x,dy=y-p.y;
      if(Math.abs(dx)<.7&&Math.abs(dy)<.7){arrived=true;break;}
      const now=`${p.x},${p.y}`;stuck=now===last?stuck+1:0;last=now;
      if(stuck>160){assert.ok(allowStuck,`route to ${x},${y} did not stall`);return;}
      runFrames(s,1,(Math.abs(dx)>.4?(dx>0?128:64):0)|(Math.abs(dy)>.4?(dy>0?32:16):0));
    }
    assert.ok(arrived||allowStuck,`controller reached ${x},${y}`);
  }
  function recruitAfterNaming(){
    advanceTo(46);
    for(let n=0;n<20&&s.ram[0x126];n++)press();
    assert.equal(story(),6,'naming happens before recruitment');
    assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,128,128]);
    press(8,300);
    assert.ok(saw(47),'Start confirms Fiona\'s native naming screen');
    for(let n=0;n<30&&!(story()===8&&playable());n++)press();
    assert.equal(story(),8);assert.ok(playable());
    assert.deepEqual([...s.ram.subarray(0x2980,0x2983)],[0,1,128]);
    assert.ok(saw(48));
  }
  function returnPendant(){
    walk(544,240);
    for(let n=0;n<1500&&!saw(41);n++){
      const p=position(),dx=u16(s.ram,0x1806)/16-p.x,dy=u16(s.ram,0x1886)/16-p.y;
      if(Math.abs(dx)<24&&Math.abs(dy)<24){press(Math.abs(dx)>Math.abs(dy)?(dx>0?128:64):(dy>0?32:16),3);press(256,100);}
      else runFrames(s,1,(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0));
    }
    assert.ok(saw(41),'Fiona accepts the recovered pendant');
  }
  try{
    dev.jump({id:439,x:24,y:16,facing:1});runFrames(s,400);
    for(let n=0;n<3000&&playable()&&!saw(36);n++){
      const p=position(),dx=u16(s.ram,0x1806)/16-p.x,dy=u16(s.ram,0x1886)/16-p.y;
      runFrames(s,1,(Math.abs(dx)>1?(dx>0?128:64):0)|(Math.abs(dy)>1?(dy>0?32:16):0));
    }
    advanceTo(39);
    for(let n=0;n<30&&!(story()===6&&playable());n++)press();
    assert.equal(story(),6);runFrames(s,300);
    assert.ok(saw(36)&&saw(37)&&saw(38));

    walk(544,240);walk(544,144);walk(488,144,{allowStuck:true});
    press(64,3);press(256,300);
    assert.ok(s.ram.subarray(0x2400,0x2500).indexOf(214)>=0,'Plot Pendant entered native inventory');
    assert.ok(s.ram[0x10054]&0x20,'native pendant-acquired flag');
    const collected=snapshot(s);

    // Refusing company reaches the follow-up question. Refusing that once
    // repeats it; accepting it then completes recruitment.
    returnPendant();await choose(41,1,0);await choose(43,2,1);await choose(44,2,1);await choose(44,2,0);
    assert.ok(saw(44),'Sorry takes the native follow-up branch');
    advanceTo(45);recruitAfterNaming();

    // Replay from the real post-pendant state and accept company directly.
    restore(s,collected);messages.length=0;runFrames(s,30);
    returnPendant();await choose(41,1,0);await choose(43,2,0);advanceTo(45);
    assert.ok(!saw(44),'Sure bypasses the refusal follow-up');
    recruitAfterNaming();assert.equal(s.ram[0x10055]&0x80,0,'recruitment alone does not clear setup');

    messages.length=0;dev.jump({id:439,x:24,y:12,facing:0});runFrames(s,400);
    for(let n=0;n<700&&location()===439&&position().y>94;n++)runFrames(s,1,16);
    press(16,3);press(256,200);
    assert.ok(saw(59),'pre-vendor setup hint rendered');assert.equal(location(),439);
    finish();

    dev.jump({id:5,x:25,y:35,facing:0});runFrames(s,500);
    for(let n=0;n<8&&!saw(61,5);n++){press(16,3);press(256,180);}
    assert.ok(saw(60,5)&&saw(61,5),'fair vendor explains the demonstration');
    assert.ok(s.ram[0x10055]&0x80,'vendor set the native setup-release flag');
    finish();

    dev.jump({id:439,x:24,y:12,facing:0});runFrames(s,500);
    for(let n=0;n<3000&&location()===439&&!(saw(67)&&playable());n++){
      if(playable())runFrames(s,1,16);else press();
    }
    // Reposition at the cleared corridor after the real vendor/candy events.
    // The exit itself and all progression remain ordinary native execution.
    dev.jump({id:439,x:24,y:12,facing:0});runFrames(s,500);
    for(let n=0;n<700&&location()===439;n++){
      if(playable())runFrames(s,1,16);else press();
    }
    runFrames(s,300);
    assert.equal(location(),8,`post-vendor north route reaches Donkey's demonstration: ${JSON.stringify(position())}`);
    assert.ok(saw(63)&&saw(66)&&saw(67),'Fiona\'s candy scene also completes');
    assert.equal(dev.diagnostics().fatal,null);
  }finally{dev.dispose();h.dispose();}
});
