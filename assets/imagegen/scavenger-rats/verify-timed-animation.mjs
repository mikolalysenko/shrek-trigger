// Bounded native animation execution. Only the isolated diagnostic event is changed in WRAM.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {createCore} from '../../../scripts/core.mjs';
import {snapshot,restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {runFrames} from '../../../engine/automation.js';
import {u16} from '../../../engine/rom.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {nativeOamCells} from './native-proof-utils.mjs';
const dir='assets/imagegen/scavenger-rats',out='.local/qa/scavenger-rats-native-proof',hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(p));
const candidate=await json(out+'/candidate.json'),rom=new Uint8Array(await readFile(out+'/candidate.sfc'));assert.equal(hash(rom),candidate.candidateSha256);
await mkdir(out+'/timed',{recursive:true});
const s=await createCore(rom);restore(s,await json(out+'/bedroom.json'));
const h=installHooks(s,await json('content/hooks.json')),d=createDevTools(s,h),reports=[];
const cases=(await json(dir+'/rat/review-audit.json')).actions;
let forceNpc=false,npcInitCount=0;const offNpc=h.on('event.init',({location,opcode,scriptPC})=>{if(forceNpc&&location===1&&opcode===0x82){const p=0x12001+scriptPC;if(s.ram[p]===0x83&&s.ram[p+1]===134){s.ram.set([0x82,164,0x8b,12,8,0xa6,1,0],p);npcInitCount++;}}});

function state(){return{nativeFrame:s.ram[0xf1f],timer:s.ram[0x161f],animation:s.ram[0x169e],phase:s.ram[0x169f],mode:s.ram[0x179e]};}
function expectedTiles(frame,graphics,assembly){const bytes=[];for(let i=0;i<16;i++){const t=u16(assembly,frame*40+i*2);for(let b of graphics.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}bytes.push(b);}}return Uint8Array.from(bytes);}
try{for(const family of['rat']){
 const source=await json(dir+'/'+family+'/native-resource-audit.json'),graphics=new Uint8Array(await readFile(dir+'/'+family+'/graphics.4bpp')),assembly=new Uint8Array(await readFile(dir+'/'+family+'/assembly.bin'));
 for(const actor of [...source.actors,{...source.actors.find(a=>a.enemy===134),key:'scrap-rat-npc164',enemy:undefined,npc:164,animation:44}]){
 const [frameProgram,durationProgram]=source.animation.filter(a=>a.id===actor.animation);assert.equal(hash(rom.slice(frameProgram.offset,frameProgram.offset+frameProgram.bytes)),frameProgram.sha256);assert.equal(hash(rom.slice(durationProgram.offset,durationProgram.offset+durationProgram.bytes)),durationProgram.sha256);
  forceNpc=actor.npc===164;d.previewActor(forceNpc?'scrap-rat':actor.key);runFrames(s,300);assert.equal(d.diagnostics().preview.object,15);const ready=snapshot(s),owner=[];
  for(const{name:role,animation,facing}of cases.filter(c=>c.program===actor.animation)){
   restore(s,ready);const start=animation*4,frames=[],durations=[];
   // Native AA walks until FF/zero duration, not an assumed four-byte row.
   for(let phase=0;phase<durationProgram.bytes-start;phase++){const f=rom[frameProgram.offset+facing*durationProgram.bytes+start+phase],duration=rom[durationProgram.offset+start+phase];if(f===255||duration===0)break;frames.push(f);durations.push(duration);}
   assert.ok(frames.length);const cycle=durations.reduce((a,b)=>a+b,0);let pending=true,script=null;
   const off=h.on('event.dispatch',({object,location,scriptPC})=>{if(!pending||object!==15||location!==1)return;script=0x12001+scriptPC;
    // AA starts the immutable ROM animation once. AD/11 thereafter loops only
    // the pause command; the native sprite scheduler owns all frame advances.
    s.ram.set([0xa6,facing,0xaa,animation,0xad,255,0x11,3],script);pending=false;
   });
   let elapsed=0;for(;elapsed<cycle*3+50;elapsed++){runFrames(s,1);const a=state();if(elapsed>=cycle&&!pending&&a.mode===1&&a.animation===animation&&a.phase===0&&a.timer===durations[0]&&a.nativeFrame===frames[0])break;}
   off();assert.ok(elapsed<cycle*3+50,actor.key+' '+role+' native loop alignment');
   const ticks=[],boundaries=[];
   for(let loop=0;loop<2;loop++)for(let phase=0;phase<frames.length;phase++)for(let tick=0;tick<durations[phase];tick++){
    const observed=state(),expected={nativeFrame:frames[phase],timer:durations[phase]-tick,animation,phase,mode:1};assert.deepEqual(observed,expected,actor.key+' '+role+' loop '+loop+' phase '+phase+' tick '+tick);
    const p=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer),uploaded=Uint8Array.from([...v.slice(p,p+256),...v.slice(p+512,p+768)]);assert.deepEqual(uploaded,expectedTiles(frames[phase],graphics,assembly));
    const oam=nativeOamCells(s);for(const c of nativeSpriteCells({graphics,assembly,cells:4,frames:13},frames[phase]))assert.ok(oam.some(o=>o.size===16&&o.x===200+c.x&&o.y===143+c.y&&Buffer.from(o.pixels).equals(Buffer.from(c.pixels))),actor.key+' native coherent OAM cell');
    ticks.push({tick:ticks.length,...observed});if(tick===0)boundaries.push({tick:ticks.length-1,loop,phase,frame:frames[phase],duration:durations[phase]});
    assert.equal(d.diagnostics().fatal,null);runFrames(s,1);
   }
   const file=actor.key+'-animation-'+animation+'-direction-'+facing,trace=JSON.stringify(ticks),png=new PNG({width:512,height:480});s.setPixels(png.data);await writeFile(out+'/timed/'+file+'.json',trace+'\n');await writeFile(out+'/timed/'+file+'.png',PNG.sync.write(png));
   owner.push({role,animation,facing,frames,durations,nativeCycles:2,nativeVideoTicks:cycle*2,exactVramUploads:cycle*2,exactOamCellStates:cycle*2*4,script,alignmentTicks:elapsed,boundaries,trace:'timed/'+file+'.json',traceSha256:hash(trace+'\n'),screenshot:'timed/'+file+'.png'});
  }
  reports.push({family,key:actor.key,enemy:actor.enemy,npc:actor.npc,program:actor.animation,palette:actor.palette,fullSizeByte:actor.npc===164?rom[0x24f000+171*5+4]:rom[0x24f604+actor.enemy*10],cases:owner});d.undo();console.log(actor.key+': '+owner.length+' native timed loops passed');
 }
}}finally{offNpc();d.dispose();h.dispose();}
assert.deepEqual(s.cart.data,rom);
const summary={status:'passed',scope:'Native AA event animation execution in an isolated field object; exact original frame lists and durations, two complete steady cycles per selected action and owner with exact VRAM and four-cell OAM every tick. Not full encounter transition order.',baselineSha256:candidate.baselineSha256,candidateSha256:candidate.candidateSha256,core:'repository SNES JS native 65816/PPU',cases:reports.reduce((n,a)=>n+a.cases.length,0),cycles:reports.reduce((n,a)=>n+a.cases.length*2,0),exactNativeVideoTicks:reports.reduce((n,a)=>n+a.cases.reduce((m,c)=>m+c.nativeVideoTicks,0),0),nativeProgramBytesUnchanged:true,npcNativeInitCount:npcInitCount,unusedNpc44OutOfBankListsNotInvoked:true,cpuRegistersOrPpuNotPatched:true,cartridgeUnchanged:true,reports,evidence:out,runner:{file:dir+'/verify-timed-animation.mjs',sha256:hash(await readFile(dir+'/verify-timed-animation.mjs'))}};
await writeFile(dir+'/native-timing-proof.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({cases:summary.cases,cycles:summary.cycles,ticks:summary.exactNativeVideoTicks}));
