import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newGameSequence} from '../engine/automation.js';
import {seedFutureCheckpoint} from '../engine/future-checkpoints.js';
import {raceController,raceRewardCases} from '../tests/race-controller.mjs';
import {traverseFutureRoad} from '../tests/future-road-controller.mjs';
import {traverseWesternRuins,traverseEasternRuins} from '../tests/ruins-controller.mjs';
import {traverseSewerEntrance,traverseSewerDiary,traverseSewer,traverseUpperSewer} from '../tests/sewer-controller.mjs';
import {areas} from '../content/areas.js';
import {compileRacingBackground} from '../engine/racing.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';

// A streaming driver is needed here: race steering follows the positions
// produced by each core. After preparing a checkpoint it only reads RAM and
// sends controller input. No native race code, score or position is changed.
export async function checkIndependentRacing({host,core,rom,out,built,name,checkpoint}){
  await mkdir(out,{recursive:true});
  const child=spawn(host,['--core',core,'--rom',rom,'--out',out,'--stdin','--sram','zero','--quiet'],{stdio:['pipe','pipe','pipe']});
  let pending,stderr='',closed=false;
  const finished=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>{closed=true;if(pending)pending.reject(Error('Race emulator closed: '+stderr));code===0?resolve():reject(Error('Race emulator exited '+code+': '+stderr));});});
  // A rejection is also awaited in finally; attaching a handler prevents an
  // early process error becoming an unhandled rejection during a request.
  finished.catch(()=>{});child.stderr.on('data',b=>stderr=(stderr+b).slice(-4000));
  const lines=createInterface({input:child.stdout});lines.on('line',line=>{
    if(!pending)return;
    const p=pending;pending=null;
    try{const r=JSON.parse(line);r.ok?p.resolve(r):p.reject(Error(JSON.stringify(r)));}catch(e){p.reject(e);}
  });
  const request=step=>new Promise((resolve,reject)=>{
    if(closed)return reject(Error('Race emulator is closed'));
    if(pending)return reject(Error('Race emulator commands must be sequential'));
    pending={resolve,reject};child.stdin.write(JSON.stringify(step)+'\n');
  });
  const wait=frames=>request({op:'wait',frames});
  const hold=(buttons,frames)=>request({op:'hold',buttons,frames});
  const tap=(buttons='a',gap=120)=>request({op:'tap',buttons,frames:12,gap});
  const read=async(addr,size=1)=>(await request({op:'read',mem:'wram',addr,size})).value;
  const bytes=async(addr,len,mem='wram')=>(await request({op:'read',mem,addr,len})).value;
  const write=(addr,bytes)=>request({op:'write',mem:'wram',addr,bytes});
  const shot=name=>request({op:'shot',name});
  const until=async(addr,value,frames=6000,{size=1,buttons='',every=0,hold=3}={})=>{
    const r=await request({op:'until',mem:'wram',addr,size,value,frames,buttons,every,hold});assert.ok(r.met,`native race condition ${addr.toString(16)} = ${value}`);return r;
  };
  const packet=id=>Array.from(decompress(built.rom,fileOffset(u24(built.rom,0x3e0006+id*3))).bytes);
  const summary={wins:[],loss:false,retry:false,introduction:false,camera:false,boost:false,noBoost:false,sourceBuffers:false,scoreRecord:false,rewards:[]};
  try{
    if(checkpoint)await request({op:'loadstate',file:checkpoint});
    else for(const[frames,input]of newGameSequence)await(input?hold(input===8?'start':'a',frames):wait(frames));
    assert.equal(await read(0x100,2),2);await request({op:'savestate',name:'bedroom'});
    async function fixture(key,result,{rescuedPrisoner=false}={}){
      await request({op:'loadstate',file:path.join(out,'bedroom.state')});
      const ram=new Uint8Array(0x20000);seedFutureCheckpoint(ram,key);
      for(const[p,n]of[[0x10000,1],[0x10058,1],[0x1005b,2],[0x100a4,2],[0x100ec,1],[0x10130,7],[0x10148,24],[0x101d0,1],[0x101ed,1],[0x101f0,1],[0x2980,9],[0x29af,1]])await write(p,Array.from(ram.slice(p,p+n)));
      if(key.startsWith('future-sewer')){
        await write(0x100ed,[ram[0x100ed]]);
        await write(0x10070,[await read(0x10070)&~32]);await write(0x10011,[await read(0x10011)&~64]);
        await write(0x1019b,[(await read(0x1019b)&~64)|(rescuedPrisoner?64:0)]);
        const items=await bytes(0x2400,256);
        for(let slot=0;slot<256;slot++)if(items[slot]===15){await write(0x2400+slot,[0]);await write(0x2500+slot,[0]);}
      }
      const bike=key.startsWith('rivet-')||key==='future-road';
      await write(0x2411,[bike?213:0,key==='rivet-no-boost'?221:0]);await write(0x2511,[bike?1:0,key==='rivet-no-boost'?1:0]);
      if(result){
        await write(0x10154,[11]);await write(0x10136,[result.claimed?131:129]);await write(0x380,[1,result.flags,result.score&255,result.score>>8]);
        await write(0x10130,[232,3,32,3,100,0]);
      }
      if(key==='future-road'){
        await write(0x10010,[await read(0x10010)&~1]);
        const items=await bytes(0x2400,256);
        for(let slot=0;slot<256;slot++)if(items[slot]===221){await write(0x2400+slot,[0]);await write(0x2500+slot,[0]);}
      }
      const area=areas.find(a=>a.futureScene===key),map=area.id|((area.facing??1)<<9);
      await write(0x1238e,result?[0xe0,225,2,51,7,0xb2]:[0xe0,map&255,map>>8,area.x,area.y,0xb2]);await wait(400);assert.equal(await read(0x100,2),result?225:area.id);
    }
    async function enter(){await hold('up',4);await tap();await wait(1000);assert.equal(await read(0x100,2),271);}
    async function artwork(){
      assert.deepEqual(await bytes(0x10a00,11776),packet(0));assert.deepEqual(await bytes(0x18a00,9216),packet(2));
      assert.deepEqual(await bytes(0x2000,512),packet(3));summary.sourceBuffers=true;
    }
    async function drive(){
      const steer=raceController(),button={0:'',16:'up',32:'down',64:'left',128:'right'};
      for(let i=0;i<6000;i++){
        const ram=Uint8Array.from(await bytes(0,0x384));
        if(u16(ram,256)!==271)break;
        await hold(ram[0x380]?'':button[steer(ram)],1);
      }
      assert.equal(await read(0x100,2),225);assert.equal(await read(0x380),1);return read(0x382,2);
    }
    async function walk(x,y){
      for(let i=0;i<800;i++){
        const n=await read(0x197,2),p=await bytes(0x1800+n,130),dx=x-u16(p,0)/16,dy=y-u16(p,128)/16;
        if(Math.abs(dx)<2&&Math.abs(dy)<2)return;
        await hold(['b',...(Math.abs(dx)>1?[dx>0?'right':'left']:[]),...(Math.abs(dy)>1?[dy>0?'down':'up']:[])].join(' '),1);
      }assert.fail('native racecourse waypoint');
    }
    await fixture('rivet-race');
    if(name==='snes9x')assert.deepEqual(await bytes(0x7000,4096,'vram'),Array.from(compileRacingBackground(built.base).graphics));
    const palette=0x3624c0+19*210+6*30;assert.deepEqual(await bytes(0x20e2,30),Array.from(built.rom.slice(palette,palette+30)));
    await shot('parked-cart');await enter();await artwork();assert.equal(await read(0x9a,2),3);await shot('race-boost');
    await until(0x100,223,6000,{size:2});assert.equal(await read(0x380),2);summary.loss=true;
    await until(0x12a,18,5000,{buttons:'a',every:36});await wait(180);await tap();await tap();await wait(120);await shot('race-loss');
    for(const[x,y]of[[41,14],[41,7],[43,7]])await walk(x*16+8,y*16+7);
    await hold('up',12);await tap();await wait(1000);assert.equal(await read(0x100,2),271);assert.equal(await read(0x9a,2),3);summary.retry=true;

    await fixture('rivet-intro');await hold('up',4);await tap();
    await until(0x10154,1,14000,{buttons:'a',every:36});await wait(120);summary.introduction=true;await shot('rivet-introduction');
    for(const[x,y]of[[41,14],[41,7],[43,7]])await walk(x*16+8,y*16+7);
    await hold('up',12);await tap();await wait(1000);await artwork();
    await tap('b',180);assert.equal(await read(0x9a,2),2);summary.boost=true;
    summary.wins.push({mode:0,score:await drive()});await until(0x12a,15,4000,{buttons:'a',every:36});await tap();await shot('race-victory');

    await fixture('rivet-no-boost');await enter();await artwork();assert.equal(await read(0x384),9);assert.equal(await read(0x9a,2),0);
    await tap('b',60);assert.equal(await read(0x9a,2),0);summary.noBoost=true;
    const angle=await read(0x92,2);for(let i=0;i<5;i++)await tap('l',60);
    assert.notEqual(await read(0x92,2),angle);await shot('race-turned-camera');
    for(let i=0;i<5;i++)await tap('r',60);assert.equal(await read(0x92,2),angle);summary.camera=true;
    const score=await drive();assert.ok(score>0);summary.wins.push({mode:9,score});
    await until(0x12a,22,6000,{buttons:'a',every:36});assert.equal(await read(0x10130,2),score);summary.scoreRecord=true;
    await tap();await shot('race-record');assert.equal(await read(0x10000),55);
    const buttons=input=>[[1,'b'],[16,'up'],[32,'down'],[64,'left'],[128,'right'],[256,'a']].filter(([bit])=>input&bit).map(([,name])=>name).join(' ');
    const controller={read,bytes,wait,shot,hold:(input,frames)=>hold(buttons(input),frames),
      tap:(input=256,gap=90)=>request({op:'tap',buttons:buttons(input),frames:3,gap})};
    await fixture('future-scavengers');summary.westernRuins=await traverseWesternRuins(controller);
    summary.easternRuins=await traverseEasternRuins(controller,built.rom);
    summary.sewer=[];
    for(const noisy of[false,true]){
      await fixture(noisy?'future-sewer':'future-sewer-entrance',null,{rescuedPrisoner:!noisy});
      const entrance=noisy?null:await traverseSewerEntrance(controller);
      const diary=await traverseSewerDiary(controller),result=await traverseSewer(controller,noisy);
      result.entrance=entrance;result.diary=diary;
      if(!noisy)result.upper=await traverseUpperSewer(controller);
      summary.sewer.push(result);
    }
    await fixture('future-road');summary.road=await traverseFutureRoad(controller,built.rom);
    const inventory=async()=>{
      const data=await bytes(0x2400,512),items=new Map();for(let i=0;i<256;i++)if(data[i])items.set(data[i],(items.get(data[i])??0)+data[i+256]);return items;
    };
    for(const c of raceRewardCases){
      await fixture('rivet-no-boost',c);const before=await inventory(),ranking=[1000,800,100,c.score].sort((a,b)=>b-a).slice(0,3);
      for(let i=0;i<60;i++){
        await tap();const now=await inventory(),records=await bytes(0x10130,6);
        if(c.reward.every(([id,n])=>(now.get(id)??0)-(before.get(id)??0)===n)&&ranking.every((n,i)=>u16(records,i*2)===n))break;
      }
      await wait(120);const after=await inventory(),delta=[];
      for(const[id,n]of after)if(n!==(before.get(id)??0))delta.push([id,n-(before.get(id)??0)]);
      assert.deepEqual(delta.sort((a,b)=>a[0]-b[0]),[...c.reward].sort((a,b)=>a[0]-b[0]),'race reward '+c.score);
      const records=await bytes(0x10130,6);assert.deepEqual([u16(records,0),u16(records,2),u16(records,4)],ranking);
      if(c.claimed||c.reward.some(([id])=>id===205))assert.equal((await read(0x10136))&2,2);
      summary.rewards.push({score:c.score,claimed:!!c.claimed,items:delta});
    }
    const end=await request({op:'quit'});summary.frames=end.frame;await finished;return summary;
  }finally{
    lines.close();if(!closed){child.stdin.end();await finished;}
  }
}
