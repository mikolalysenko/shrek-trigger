// Bounded native animation execution. Only the isolated diagnostic event is changed in WRAM.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {execFileSync} from 'node:child_process';
import {createCore} from '../../../scripts/core.mjs';
import {snapshot,restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {runFrames} from '../../../engine/automation.js';
import {u16} from '../../../engine/rom.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {nativeOamCells} from './native-proof-utils.mjs';
const dir='assets/imagegen/rootlings-briars',out='.local/qa/rootlings-briars-native-proof',hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(p));
const candidate=await json(out+'/candidate.json'),rom=new Uint8Array(await readFile(out+'/candidate.sfc'));assert.equal(hash(rom),candidate.candidateSha256);
await mkdir(out+'/timed',{recursive:true});
const s=await createCore(rom);restore(s,await json(out+'/bedroom.json'));
const h=installHooks(s,await json('content/hooks.json')),d=createDevTools(s,h),reports=[];
const cases={};for(const key of ['rootling','snap-briar','briar-rider'])cases[key]=(await json(dir+'/'+key+'/native-role-audit.json')).originalAnimationLists.map(a=>['AA'+a.program+' action'+a.animation+' facing'+a.facing,a.animation,a.facing]);
const recordMotion=(key,animation,facing)=>key==='rootling'&&animation===1&&facing<2||key==='snap-briar'&&animation===1&&facing===1||key==='briar-rider'&&(animation===8||animation===1&&facing===1);
function state(){return{nativeFrame:s.ram[0xf1f],timer:s.ram[0x161f],animation:s.ram[0x169e],phase:s.ram[0x169f],mode:s.ram[0x179e]};}
function expectedTiles(frame,graphics,assembly,cells){const bytes=[];for(let i=0;i<cells*4;i++){const t=u16(assembly,frame*cells*10+i*2);for(let b of graphics.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}bytes.push(b);}}return Uint8Array.from(bytes);}
try{for(const family of(process.argv.includes('--rider-only')?['briar-rider']:['rootling','snap-briar','briar-rider'])){
 const source=await json(dir+'/'+family+'/native-resource-audit.json'),graphics=new Uint8Array(await readFile(dir+'/graphics.4bpp')),assembly=new Uint8Array(await readFile(dir+'/'+family+'/assembly.bin')),[frameProgram,durationProgram]=source.animation,cells=source.assembly.cells;
 assert.equal(hash(rom.slice(frameProgram.offset,frameProgram.offset+frameProgram.bytes)),frameProgram.sha256);assert.equal(hash(rom.slice(durationProgram.offset,durationProgram.offset+durationProgram.bytes)),durationProgram.sha256);
 for(const actor of source.actors){
  d.previewActor(actor.key);runFrames(s,300);assert.equal(d.diagnostics().preview.object,15);const ready=snapshot(s),owner=[];
  for(const[role,animation,facing]of cases[family]){
   restore(s,ready);const start=animation*4,frames=[],durations=[];
   // Native AA walks until FF/zero duration, not an assumed four-byte row.
   for(let phase=0;phase<durationProgram.bytes-start;phase++){const f=rom[frameProgram.offset+facing*durationProgram.bytes+start+phase],duration=rom[durationProgram.offset+start+phase];if(f===255||duration===0)break;frames.push(f);durations.push(duration);}
   assert.ok(frames.length);const cycle=durations.reduce((a,b)=>a+b,0);let pending=true,script=null;
   const off=h.on('event.dispatch',({object,location,scriptPC})=>{if(!pending||object!==15||location!==1)return;script=0x12001+scriptPC;
    // AA starts the immutable ROM animation once. AD/11 thereafter loops only
    // the pause command; the native sprite scheduler owns all frame advances.
    s.ram.set([0xa6,facing,0xaa,animation,0xad,255,0x11,3],script);pending=false;
   });
   let elapsed=0,firstAligned=-1,previousRequest=state().nativeFrame;const startup=[];for(;elapsed<cycle*3+50;elapsed++){runFrames(s,1);const a=state(),p=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer),uploaded=cells===4?Uint8Array.from([...v.slice(p,p+256),...v.slice(p+512,p+768)]):v.slice(p,p+1024),matches=Array.from({length:source.assembly.frames},(_,f)=>f).filter(f=>Buffer.from(uploaded).equals(Buffer.from(expectedTiles(f,graphics,assembly,cells))));
    assert.ok(matches.includes(a.nativeFrame)||matches.includes(previousRequest),actor.key+' startup has a complete current or immediately preceding requested frame');const displayedFrame=matches.includes(a.nativeFrame)?a.nativeFrame:previousRequest,oam=nativeOamCells(s);for(const c of nativeSpriteCells({graphics,assembly,cells,frames:source.assembly.frames},displayedFrame))assert.ok(oam.some(o=>o.size===16&&o.x===200+c.x&&o.y===143+c.y&&Buffer.from(o.pixels).equals(Buffer.from(c.pixels))),actor.key+' coherent startup OAM');startup.push({tick:elapsed,...a,displayedFrame,delay:displayedFrame===a.nativeFrame?0:1});previousRequest=a.nativeFrame;
    if(!pending&&a.mode===1&&a.animation===animation&&a.phase===0&&a.timer===durations[0]&&a.nativeFrame===frames[0]){if(firstAligned<0)firstAligned=elapsed;else if(elapsed-firstAligned>=cycle)break;}}

   off();assert.ok(elapsed<cycle*3+50,actor.key+' '+role+' native loop alignment');
   const ticks=[],boundaries=[];
   for(let loop=0;loop<2;loop++)for(let phase=0;phase<frames.length;phase++)for(let tick=0;tick<durations[phase];tick++){
    const observed=state(),expected={nativeFrame:frames[phase],timer:durations[phase]-tick,animation,phase,mode:1};assert.deepEqual(observed,expected,actor.key+' '+role+' loop '+loop+' phase '+phase+' tick '+tick);
    const p=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer),uploaded=cells===4?Uint8Array.from([...v.slice(p,p+256),...v.slice(p+512,p+768)]):v.slice(p,p+1024),currentTiles=expectedTiles(frames[phase],graphics,assembly,cells),previousFrame=frames[(phase+frames.length-1)%frames.length];let uploadedFrame=frames[phase],handoffDelay=0;
    if(!Buffer.from(uploaded).equals(Buffer.from(currentTiles))){assert.equal(tick,0,actor.key+' bounded handoff only at phase boundary');if(!Buffer.from(uploaded).equals(Buffer.from(expectedTiles(previousFrame,graphics,assembly,cells)))){const matches=Array.from({length:source.assembly.frames},(_,f)=>f).filter(f=>Buffer.from(uploaded).equals(Buffer.from(expectedTiles(f,graphics,assembly,cells))));await writeFile(out+'/timing-failure.json',JSON.stringify({actor:actor.key,role,animation,facing,loop,phase,tick,observed,expected,previousFrame,matches,elapsed,videoFrame:s.frames,upload:hash(uploaded)},null,2));await writeFile(out+'/timing-failure-state.json',JSON.stringify(snapshot(s)));throw Error('Unexpected native handoff '+JSON.stringify({role,loop,phase,tick,matches,elapsed}));}uploadedFrame=previousFrame;handoffDelay=1;}
    const oam=nativeOamCells(s);for(const c of nativeSpriteCells({graphics,assembly,cells,frames:source.assembly.frames},uploadedFrame))assert.ok(oam.some(o=>o.size===16&&o.x===200+c.x&&o.y===143+c.y&&Buffer.from(o.pixels).equals(Buffer.from(c.pixels))),actor.key+' coherent OAM and tiles during animation');
    if(loop===0&&recordMotion(actor.key,animation,facing)){const png=new PNG({width:512,height:480});s.setPixels(png.data);await writeFile(out+'/timed/'+actor.key+'-action-'+animation+'-direction-'+facing+'-'+String(ticks.length).padStart(3,'0')+'.png',PNG.sync.write(png));}
    ticks.push({tick:ticks.length,...observed,uploadedFrame,handoffDelay});if(tick===0)boundaries.push({tick:ticks.length-1,loop,phase,frame:frames[phase],duration:durations[phase],uploadedFrame,handoffDelay});
    assert.equal(d.diagnostics().fatal,null);runFrames(s,1);
   }
   const file=actor.key+'-animation-'+animation+'-direction-'+facing,trace=JSON.stringify(ticks),png=new PNG({width:512,height:480});s.setPixels(png.data);await writeFile(out+'/timed/'+file+'.json',trace+'\n');await writeFile(out+'/timed/'+file+'.png',PNG.sync.write(png));
   owner.push({role,animation,facing,frames,durations,nativeCycles:2,nativeVideoTicks:cycle*2,exactCompleteVramStates:cycle*2,coherentOamCells:cycle*2*cells,maxRequestToDisplayDelay:Math.max(...ticks.map(t=>t.handoffDelay)),delayedPhaseBoundaries:ticks.filter(t=>t.handoffDelay).length,script,alignmentTicks:elapsed,firstAlignedTick:firstAligned,startup,maximumStartupRequestToDisplayDelay:Math.max(...startup.map(t=>t.delay)),boundaries,trace:'timed/'+file+'.json',traceSha256:hash(trace+'\n'),screenshot:'timed/'+file+'.png'});
  }
  reports.push({family,key:actor.key,enemy:actor.enemy,palette:actor.palette,fullSizeByte:rom[0x24f604+actor.enemy*10],cases:owner});d.undo();console.log(actor.key+': '+owner.length+' native timed loops passed');
 }
}}finally{d.dispose();h.dispose();}
assert.deepEqual(s.cart.data,rom);
const nativeMotion=[];for(const owner of reports)for(const c of owner.cases)if(recordMotion(owner.key,c.animation,c.facing)){const prefix=owner.key+'-action-'+c.animation+'-direction-'+c.facing,file='timed/'+prefix+'.apng';execFileSync('ffmpeg',['-v','error','-y','-framerate','60','-i',out+'/timed/'+prefix+'-%03d.png','-plays','0','-f','apng',out+'/'+file]);const bytes=await readFile(out+'/'+file);nativeMotion.push({file,bytes:bytes.length,sha256:hash(bytes),nativeVideoTicks:c.nativeVideoTicks/2,framesPerSecond:60});}
const summary={status:'passed',scope:'Native AA event animation execution in an isolated field object; exact original frame-request lists and durations, two complete steady cycles per action and owner. Complete VRAM and all original four/eight OAM cells agree on every tick. Any one-video-frame request/display handoff is bounded to a phase boundary and explicitly counted; mixed-frame uploads are rejected. Not full encounter transition order.',baselineSha256:candidate.baselineSha256,candidateSha256:candidate.candidateSha256,core:'repository SNES JS native 65816/PPU',cases:reports.reduce((n,a)=>n+a.cases.length,0),cycles:reports.reduce((n,a)=>n+a.cases.length*2,0),exactNativeVideoTicks:reports.reduce((n,a)=>n+a.cases.reduce((m,c)=>m+c.nativeVideoTicks,0),0),maximumRequestToDisplayDelay:Math.max(...reports.flatMap(a=>a.cases.map(c=>c.maxRequestToDisplayDelay))),delayedPhaseBoundaries:reports.reduce((n,a)=>n+a.cases.reduce((m,c)=>m+c.delayedPhaseBoundaries,0),0),maximumStartupRequestToDisplayDelay:Math.max(...reports.flatMap(a=>a.cases.map(c=>c.maximumStartupRequestToDisplayDelay))),nativeProgramBytesUnchanged:true,nativeMotion,cpuRegistersOrPpuNotPatched:true,cartridgeUnchanged:true,reports,evidence:out,runner:{file:dir+'/verify-timed-animation.mjs',sha256:hash(await readFile(dir+'/verify-timed-animation.mjs'))}};
await writeFile(dir+(process.argv.includes('--rider-only')?'/native-timing-debug.json':'/native-timing-proof.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({cases:summary.cases,cycles:summary.cycles,ticks:summary.exactNativeVideoTicks}));
