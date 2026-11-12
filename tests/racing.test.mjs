import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {rivetActor,cartColors} from '../content/racing.js';
import {compileRacingBackground,racingBackground} from '../engine/racing.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,put16,fileOffset} from '../engine/rom.js';
import {snesColor} from '../engine/sprites.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
import {raceController,raceRewardCases} from './race-controller.mjs';
import {seedFutureCheckpoint} from '../engine/future-checkpoints.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
const packet=(rom,id)=>decompress(rom,fileOffset(u24(rom,0x3e0006+id*3))).bytes;

test('race art preserves the native projection formats, gameplay code, scenery and fixed memory budgets',()=>{
  const a=built.audit.racing;
  assert.equal(a.native,true);assert.equal(a.extraVramBytes,0);assert.equal(a.extraWramBytes,0);
  for(const[id,size,width]of[[0,11776,32],[1,256,8],[2,9216,24],[3,512,0]]){
    const p=packet(built.rom,id);assert.equal(p.length,size);
    if(id===0||id===2)for(let y=0;y<size/64;y++){
      assert.ok(p.slice(y*64,y*64+width).every(v=>v<=15));
      assert.ok(p.slice(y*64+width,(y+1)*64).every(v=>v===0),'unused projection columns stay transparent');
    }
    if(id===1)assert.ok(p.every(v=>v<=15));
  }
  const oldPalette=packet(built.base,3),palette=packet(built.rom,3);
  for(let row=0;row<16;row++){
    // Only the cart rows change; Rivet (rows 9/13, packet 2) keeps Johnny's stock race art.
    if(![8,12].includes(row)){assert.deepEqual(palette.slice(row*32,(row+1)*32),oldPalette.slice(row*32,(row+1)*32));continue;}
    assert.equal(u16(palette,row*32),u16(oldPalette,row*32));
    assert.deepEqual(Array.from({length:15},(_,i)=>u16(palette,row*32+(i+1)*2)),cartColors.map(snesColor));
  }
  assert.deepEqual(packet(built.rom,2),packet(built.base,2),'stock Johnny race views');
  for(let id=4;id<=12;id++)assert.deepEqual(packet(built.rom,id),packet(built.base,id),'native race scenery and HUD '+id);
  const oldCode=decompress(built.base,fileOffset(u24(built.base,0x3e0003))).bytes,newCode=decompress(built.rom,fileOffset(u24(built.rom,0x3e0003))).bytes;
  assert.deepEqual(newCode.slice(0xb48,0x23bb),oldCode.slice(0xb48,0x23bb),'both race modes retain their original program');
  const npc=0x24f000+(2+7)*5,enemy=0x24f600+rivetActor.enemy*10;
  assert.deepEqual(built.rom.slice(npc,npc+5),built.base.slice(npc,npc+5));
  assert.deepEqual(built.rom.slice(enemy,enemy+10),built.base.slice(enemy,enemy+10));
  assert.equal(built.rom[npc+3],77);assert.equal(built.rom[enemy+3],142);
});

test('the parked cart replaces only its 72 owned tiles and palette while preserving both road maps and collision',()=>{
  const b=racingBackground,c=compileRacingBackground(built.base),old=decompress(built.base,fileOffset(u24(built.base,0x362220+b.graphics*3))).bytes;
  const now=decompress(built.rom,fileOffset(u24(built.rom,0x362220+b.graphics*3))).bytes;
  assert.deepEqual(now,c.graphics);assert.equal(now.length,4096);assert.equal(c.tiles.length,72);
  for(let i=0;i<128;i++)if(!c.tiles.includes(i))assert.deepEqual(now.slice(i*32,(i+1)*32),old.slice(i*32,(i+1)*32),'other road tile '+i);
  for(const[table,id]of[[0x361e00,126],[0x361e00,127],[0x362100,7]]){
    const p=fileOffset(u24(built.base,table+id*3)),bytes=decompress(built.base,p);
    assert.deepEqual(built.rom.slice(table+id*3,table+id*3+3),built.base.slice(table+id*3,table+id*3+3));
    assert.deepEqual(built.rom.slice(p,p+bytes.length),built.base.slice(p,p+bytes.length));
  }
  for(let row=0;row<7;row++)if(row!==6){const p=0x3624c0+b.palette*210+row*30;assert.deepEqual(built.rom.slice(p,p+30),built.base.slice(p,p+30));}
  const bad=built.base.slice();bad[0x360003+2*14]=19;
  assert.throws(()=>compileRacingBackground(bad),/ownership/);
});

async function fixture(key,{score,flags=0,claimed=false,records=[]}={}){
  const s=await bedroom(built.rom),h=installHooks(s,specs),messages=[],modes=[];let before;
  h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();if(e.opcode===255)modes.push(s.ram[0x12002+e.scriptPC]);});
  h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
  const d=createDevTools(s,h),rom=s.cart.data.slice();
  if(score!==undefined){
    let seeded=false;h.on('event.dispatch',()=>{
      if(seeded)return;seeded=true;seedFutureCheckpoint(s.ram,'rivet-no-boost');
      s.ram[0x10154]=11;s.ram[0x10136]=claimed?131:129;
      s.ram[0x380]=1;s.ram[0x381]=flags;put16(s.ram,0x382,score);
      records.forEach((n,i)=>put16(s.ram,0x10130+i*2,n));
    });
    d.jump({id:225,x:51,y:7,party:[0,1,2],endgame:true});
  }else d.jump(areas.find(a=>a.futureScene===key));
  runFrames(s,400);
  return {s,h,d,messages,modes,tap(keys=256,gap=120){runFrames(s,12,keys);runFrames(s,gap);},
    close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,rom);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}
function enterRace(f){
  runFrames(f.s,4,16);f.tap();assert.equal(u16(f.s.ram,256),271);runFrames(f.s,1000);
}
function checkRaceBuffers(s){
  assert.deepEqual(s.ram.slice(0x10a00,0x13800),packet(built.rom,0),'native cart source buffer');
  assert.deepEqual(s.ram.slice(0x18a00,0x1ae00),packet(built.rom,2),'native Rivet source buffer');
  const palette=packet(built.rom,3);
  for(const row of[8,9,12,13])for(let i=1;i<16;i++)assert.equal(s.ppu.cgram[row*16+i],u16(palette,row*32+i*2),'native race CGRAM');
}

test('the native race loads the new art, finishes a loss, returns its field scene and remains fully reversible',async()=>{
  const f=await fixture('rivet-race'),{s}=f,bg=compileRacingBackground(built.base);
  assert.deepEqual(new Uint8Array(s.ppu.vram.buffer).slice(0x7000,0x8000),bg.graphics);
  assert.deepEqual(Array.from(s.ppu.cgram.slice(113,128)),cartColors.map(snesColor));
  await screenshot(s,'.local/qa/racing-parked-cart.png');enterRace(f);assert.deepEqual(f.modes,[0]);assert.equal(u16(s.ram,0x9a),3);
  checkRaceBuffers(s);await screenshot(s,'.local/qa/racing-native-boost.png');
  for(let i=0;i<6000&&u16(s.ram,256)===271;i++)runFrames(s,1);
  assert.equal(u16(s.ram,256),223);assert.equal(s.ram[0x380],2,'native race reports the opponent finished first');
  for(let i=0;i<30&&!f.messages.some(([l,n])=>l===223&&n===18);i++)f.tap();
  for(const id of[8,9,18])assert.ok(f.messages.some(([l,n])=>l===223&&n===id));
  f.tap();f.tap();assert.equal(s.ram[0x10000],55);await screenshot(s,'.local/qa/racing-native-loss.png');
  for(const[x,y]of[[41,14],[41,7],[43,7]])walk(s,x*16+8,y*16+7);
  runFrames(s,12,16);f.tap();runFrames(s,1000);assert.equal(u16(s.ram,256),271);
  assert.deepEqual(f.modes,[0,0]);assert.equal(u16(s.ram,0x9a),3,'a real retry replenishes the three boosts');f.close();
});

function winRace(s){
  const drive=raceController();
  for(let i=0;i<6000&&u16(s.ram,256)===271;i++)runFrames(s,1,s.ram[0x380]?0:drive(s.ram));
  assert.equal(u16(s.ram,256),225);assert.equal(s.ram[0x380],1,'controller driving wins through the native finish line');
}
function walk(s,x,y){
  for(let i=0;i<800;i++){
    const n=u16(s.ram,0x197),dx=x-u16(s.ram,0x1800+n)/16,dy=y-u16(s.ram,0x1880+n)/16;
    if(Math.abs(dx)<2&&Math.abs(dy)<2)return;
    runFrames(s,1,1|(Math.abs(dx)>1?(dx>0?128:64):0)|(Math.abs(dy)>1?(dy>0?32:16):0));
  }
  assert.fail('racecourse waypoint was unreachable');
}

test('Rivet introduces himself, unfolds his wheels, and the party walks to the cart and wins a boost race',async()=>{
  const f=await fixture('rivet-intro'),{s}=f;
  runFrames(s,4,16);f.tap();
  for(let i=0;i<14000&&!(s.ram[0x10154]&1);i++)runFrames(s,1,i%36<3?256:0);
  assert.equal(s.ram[0x10154],1);runFrames(s,120);
  for(const id of[0,1,2,3,4,5,12])assert.ok(f.messages.some(([l,n])=>l===223&&n===id));
  await screenshot(s,'.local/qa/rivet-native-introduction.png');
  for(const[x,y]of[[41,14],[41,7],[43,7]])walk(s,x*16+8,y*16+7);
  runFrames(s,12,16);f.tap();runFrames(s,1000);assert.deepEqual(f.modes,[0]);checkRaceBuffers(s);
  f.tap(1,180);assert.equal(u16(s.ram,0x9a),2,'B spends exactly one native Turbo Boost');
  winRace(s);for(let i=0;i<30&&!f.messages.some(([l,n])=>l===225&&n===15);i++)f.tap();
  assert.ok(f.messages.some(([l,n])=>l===225&&n===15));f.tap();
  assert.equal(s.ram[0x10000],55);await screenshot(s,'.local/qa/racing-native-victory.png');f.close();
});

test('the no-boost race ignores B, turns the native camera, wins and records the actual score',async()=>{
  const f=await fixture('rivet-no-boost'),{s}=f;enterRace(f);assert.deepEqual(f.modes,[9]);checkRaceBuffers(s);
  assert.equal(u16(s.ram,0x9a),0);f.tap(1,60);assert.equal(u16(s.ram,0x9a),0);
  const angle=u16(s.ram,0x92);for(let i=0;i<5;i++)f.tap(1024,60);
  assert.notEqual(u16(s.ram,0x92),angle);await screenshot(s,'.local/qa/racing-native-turned-camera.png');
  for(let i=0;i<5;i++)f.tap(2048,60);assert.equal(u16(s.ram,0x92),angle);
  winRace(s);const score=u16(s.ram,0x382);assert.ok(score>0);
  for(let i=0;i<50&&!f.messages.some(([l,n])=>l===225&&n===22);i++)f.tap();
  assert.ok(f.messages.some(([l,n])=>l===225&&n===21));assert.ok(f.messages.some(([l,n])=>l===225&&n===22));
  assert.equal(u16(s.ram,0x10130),score,'record is the score produced by this race');f.tap();
  await screenshot(s,'.local/qa/racing-native-record.png');f.close();
});

const inventory=s=>{
  const items=new Map();for(let i=0;i<256;i++){const id=s.ram[0x2400+i];if(id)items.set(id,(items.get(id)??0)+s.ram[0x2500+i]);}return items;
};
test('native score-return branches award the advertised onions, sort records and grant the Red Onion only once',async()=>{
  // Returned-race fixtures exercise rare exact scores and thresholds. The
  // preceding controller test separately verifies earning a real score.
  for(const c of raceRewardCases){
    const f=await fixture('rivet-no-boost',{...c,records:[1000,800,100]}),before=inventory(f.s);
    const ranking=[1000,800,100,c.score].sort((a,b)=>b-a).slice(0,3);
    for(let i=0;i<60;i++){
      f.tap();const now=inventory(f.s);
      if(c.reward.every(([id,n])=>(now.get(id)??0)-(before.get(id)??0)===n)&&ranking.every((n,i)=>u16(f.s.ram,0x10130+i*2)===n))break;
    }
    runFrames(f.s,120);
    const after=inventory(f.s),delta=[];
    for(const[id,n]of after)if(n!==(before.get(id)??0))delta.push([id,n-(before.get(id)??0)]);
    assert.deepEqual(delta.sort((a,b)=>a[0]-b[0]),[...c.reward].sort((a,b)=>a[0]-b[0]),'score '+c.score+(c.claimed?' repeat':''));
    for(const id of c.lines)assert.ok(f.messages.some(([l,n])=>l===225&&n===id),'reward dialogue '+id);
    assert.deepEqual(Array.from({length:3},(_,i)=>u16(f.s.ram,0x10130+i*2)),ranking);
    if(c.claimed||c.reward.some(([id])=>id===205))assert.equal(f.s.ram[0x10136]&2,2);
    f.close();
  }
});
