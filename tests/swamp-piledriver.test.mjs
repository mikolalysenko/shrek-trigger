import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {build,bedroom,screenshot} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {swampPiledriverScene,piledriverTargetAnchored} from '../engine/swamp-piledriver.js';
import {put16,u16} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';

const b=await build(),rom=b.rom,audit=b.audit.swampPiledriver,sha256=createHash('sha256').update(rom).digest('hex');
const out='.local/qa/piledriver-'+sha256.slice(0,12);await mkdir(out,{recursive:true});await writeFile(out+'/candidate.sfc',rom);
test('Piledriver preserves damage, MP, targets, combos, shared animations and native resource limits',()=>{
 for(const[start,end]of[[0xc1acb,0xc247b],[0xc253b,0xc2580],[0x114100,0x115000],[0xe0c87,0xe0c94],[0xe2c67,0xe2d00],[0xd45a6+44*7,0xd45a6+45*7]])assertRevisedBytes(rom,b.base,start,end);
 assert.equal(audit.scriptBytes,206);assert.ok(audit.extraRomBytes<128);assert.equal(audit.extraVramBytes,0);assert.equal(audit.extraWramBytes,0);
 assert.deepEqual(rom.slice(0xe0bb2+audit.scriptBytes,0xe0c94),b.base.slice(0xe0bb2+audit.scriptBytes,0xe0c94));
 for(const id of[25,27,30]){const p=0xe0000+u16(b.base,0xd5ef0+id*2);assert.deepEqual(rom.slice(p,p+48),b.base.slice(p,p+48));}
});
test('Piledriver rejects new owners inside its native program prefix',()=>{
 const alias=b.base.slice();put16(alias,0xd5ef0+4,0x0bb2);assert.throws(()=>swampPiledriverScene(alias),/another header owner/);
 const channel=b.base.slice();put16(channel,0xe099c+4,0x0bc2);assert.throws(()=>swampPiledriverScene(channel),/another channel owner/);
 const sub=b.base.slice();put16(sub,0xe0000+80*2,0x0bc2);assert.throws(()=>swampPiledriverScene(sub),/shared subscript/);
 const tech=b.base.slice();tech[0xd45a6+2*7]=4;assert.throws(()=>swampPiledriverScene(tech),/another tech owner/);
});
test('native wrestling classifier covers both techs, every enemy header and every party slot and preserves the CPU',async()=>{
 const s=await createCore(rom),start=({actor=0,command=2,tech=4,target=3,enemy=151,miss=0}={})=>{
  s.ram.fill(0);const c=s.cpu;c.reset();c.e=false;c.m=false;c.x=false;c.i=true;c.cyclesLeft=0;c.c=true;c.v=true;
  c.r[0]=0x7e;c.r[1]=0xc1;c.br[4]=0x4617;c.br[5]=0;c.br[3]=0x7ff;c.br[1]=tech*2;c.br[2]=0x1234;
  s.ram.set([actor,command,tech,0x25],0xae91);s.ram[0xaecc]=target;put16(s.ram,0xa0b3,miss);
  if(target>=3&&target<11){s.ram[0x5e2d+target*128]=enemy;s.ram[0x5e46+target*128]=b.base[0xc4700+enemy*23+20];}
  let n=0;while((c.r[1]*65536+c.br[4])!==0xc1461b&&n++<3000)c.cycle();assert.ok(n<3000,'classifier returns');
  assert.equal(c.br[0],u16(rom,0xd5ef0+tech*2));assert.equal(c.br[1],tech*2);assert.equal(c.br[2],0x1234);assert.equal(c.br[3],0x7ff);assert.equal(c.r[0],0x7e);assert.equal(c.m,false);assert.equal(c.x,false);assert.equal(c.c,true);assert.equal(c.v,true);assert.equal(c.z,false);assert.equal(c.n,!!(c.br[0]&0x8000));assert.equal(s.ram[0xae94],0x25);
  return u16(s.ram,0xa0b3);
 };
 for(const tech of[4,7])for(let enemy=0;enemy<256;enemy++)for(const actor of[0,1,2])for(const miss of[0,0x40]){
  const expected=miss|| (piledriverTargetAnchored(b.base[0xc4700+enemy*23+20],rom[0x24f604+enemy*10])?0x40:0);
  assert.equal(start({tech,enemy,actor,target:3+enemy%8,miss}),expected,'tech '+tech+' enemy '+enemy+' actor '+actor);
 }
 for(const tech of[0,1,2,3,5,6,8,44,57,95,127])for(const actor of[0,2,3])assert.equal(start({tech,actor,enemy:176}),0,'other tech untouched');
 for(const tech of[4,7]){
  for(const actor of[3,10])assert.equal(start({tech,actor,enemy:176}),0,'enemy action untouched');
  for(const command of[1,3])assert.equal(start({tech,command,enemy:176}),0,'other command untouched');
  for(const target of[0,2,11,255])assert.equal(start({tech,target}),0x40,'invalid target anchors');
 }
});
test('native Piledriver lifts, rotates, slams and restores actors; large bosses anchor and a following tech works',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json'));
 for(const[name,address]of[['pile.frame',0xc14304],['pile.sound',0xc161a4],['pile.script',0xc14cc4],['pile.select',0xc1461b]])specs.push({name,address,expected:[...rom.slice(address&0x3fffff,(address&0x3fffff)+4)]});
 const reports=[];
 for(const[party,fixture,anchored]of[[[0,1,2],'clowns',false],[[1,0,2],'clowns',false],[[1,2,0],'clowns',false],[[0,1,2],'court-beast',false],[[0,1,2],'milenko',true]]){
  const s=await bedroom(rom),h=installHooks(s,specs),d=createDevTools(s,h),slot=party.indexOf(0);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture,unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();
  const hp=Array.from({length:8},(_,i)=>u16(s.ram,0x5e30+(i+3)*128)),mp=u16(s.ram,0x5e34+slot*128),frames=new Set(),sounds=[],hits=[];
  const position=i=>[s.ram[0x1d0c+i],s.ram[0x1d23+i]];let before=null;
  let cast=false,selection=null,finished=null,target=null,elapsed=-1,shrekLift=0,enemyLift=0,followup=false;
  const active=()=>s.ram[0xae91]===slot&&s.ram[0xae92]===2&&s.ram[0xae93]===4;
  h.on('battle.tech',e=>{if(e.actor===slot&&e.techId===4){cast=true;elapsed=0;}if(e.actor===slot&&e.techId===2)followup=true;});
  h.on('battle.result',e=>{if(e.actor===slot&&e.techId===4){hits.push(e);target=e.target;}});
  h.on('pile.select',()=>{if(active()){selection=!!u16(s.ram,0xa0b3);before=Array.from({length:11},(_,i)=>position(i));}});
  h.on('pile.frame',()=>{if(active()&&s.ram[0x9679]===slot)frames.add(s.cpu.br[0]&255);});
  h.on('pile.sound',()=>{if(active())sounds.push(s.ram[0x1e01]);});
  h.on('pile.script',()=>{if(!active())return;const p=((u16(s.ram,0xe6)+s.cpu.br[2])&65535)|((s.ram[0xe8]&63)<<16);
   if(s.ram[0xa010]===0&&p>=0xe0bb2&&p<0xe0c87&&rom[p]===1)finished={positions:Array.from({length:11},(_,i)=>position(i)),heights:[...s.ram.slice(0xa4af,0xa4ba)],locks:[...s.ram.slice(0xa5d8,0xa5e3)],counter:s.ram[0x5d9d]};
  });
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  await chooseNativeTech(io,rom,slot,4);
  for(let f=0;f<650;f++){
   s.runFrame();if(active()&&!finished){const height=i=>(s.ram[0xa4af+i]<<24)>>24;shrekLift=Math.max(shrekLift,-height(slot));if(target!==null)enemyLift=Math.max(enemyLift,-height(target));}
   if([80,100,120,140].includes(elapsed))await screenshot(s,out+'/'+fixture+'-slot-'+slot+'-'+elapsed+'.png');if(elapsed>=0)elapsed++;
  }
  await writeFile(out+'/'+fixture+'-slot-'+slot+'-cast.json',JSON.stringify({party,fixture,anchored,selection,frames:[...frames],sounds,hits,shrekLift,enemyLift,before,finished},null,2));
  assert.ok(cast&&finished);assert.equal(selection,anchored);assert.ok([194,195,196,197].every(f=>frames.has(f)));assert.deepEqual(sounds,[0x6b,0x6c]);assert.equal(shrekLift,32);assert.equal(enemyLift,anchored?0:48);
  assert.deepEqual(finished.positions[slot],before[slot]);assert.deepEqual(finished.positions[target],before[target]);assert.equal(finished.heights[slot],0);assert.equal(finished.heights[target],0);assert.equal(finished.locks[slot],0);assert.equal(finished.locks[target],0);assert.equal(finished.counter,anchored?2:6);
  assert.equal(hits.length,1);assert.ok(hits[0].value>0);const damaged=hp.map((n,i)=>({slot:i+3,value:n-u16(s.ram,0x5e30+(i+3)*128)})).filter(n=>n.value>0);assert.equal(damaged.length,1);assert.equal(damaged[0].slot,target);assert.equal(damaged[0].value,hits[0].value);assert.equal(u16(s.ram,0x5e34+slot*128),mp-1);
  for(let n=0;n<180&&s.ram[0x95d5]!==slot;n++){if(s.ram[0x95d5]<3)await io.tap(64,12);await io.wait(24);}assert.equal(s.ram[0x95d5],slot);
  await chooseNativeTech(io,rom,slot,2);runFrames(s,700);assert.ok(followup);assert.equal(u16(s.ram,0x5e34+slot*128),mp-2);assert.equal(d.diagnostics().fatal,null);
  reports.push({party,fixture,anchored,selection,frames:[...frames],sounds,hits,shrekLift,enemyLift,finished,followup});d.undo();assert.deepEqual(s.cart.data,rom);d.dispose();h.dispose();
 }
 await writeFile(out+'/native-casts.json',JSON.stringify({sha256,audit,reports},null,2));
});
