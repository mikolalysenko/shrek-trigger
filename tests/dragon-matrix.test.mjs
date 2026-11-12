import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16,u24} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {dragonPalette,dragonWorld} from '../engine/dragon.js';
import {dragonGlide} from '../engine/dragon-mode7.js';
import {DRAGON_PARTIES,driveAcquisition,driveWorldFlight,driveRepairAndUpgrade,driveUpgradedFlight,driveApproachAndEscape,driveEndingProjection} from '../scripts/check-dragon-matrix.mjs';

// Diagnostic scene acceptance only. bedroom() is a pre-fixture checkpoint. No
// case below snapshots/restores or writes WRAM/AI/story after its documented
// native-entry boundary; subsequent operations are reads and controller input.
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
function controller(s){return{
 read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),
 wait:n=>runFrames(s,n),hold:(input,n)=>runFrames(s,n,input),tap:(input=256,gap=12)=>{runFrames(s,3,input);runFrames(s,gap);},
 shot:name=>screenshot(s,'.local/qa/dragon-matrix-'+name+'.png')
};}
async function fixture({id,x,y,facing=1,party,story,flags,dragon,endgame=false}={}){
 const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
 if(story!==undefined)s.ram[0x10000]=story;if(flags)for(const[addr,value]of flags)s.ram[addr]=value;
 if(party){const reserve=[0,1,2,3,4,5,6].filter(id=>!party.includes(id));s.ram.fill(128,0x2980,0x2989);s.ram.set([...party,...reserve],0x2980);s.ram[0x29af]=party.reduce((mask,id)=>mask|(128>>id),0);}
 dev.jump({id,x,y,facing,dragon,endgame});
 return{s,h,dev,io:controller(s)};
}
function close(f){assert.equal(f.s.cpu.stopped,false);assert.equal(f.dev.diagnostics().fatal,null);f.dev.dispose();f.h.dispose();}

test('current native Dragon ending packets contain every helper projection and isolated palette',()=>{
 const packet=id=>decompress(built.rom,cartridgeOffset(u24(built.rom,0x3e0006+id*3),built.rom)).bytes;
 const stream=(pixels,height)=>{const out=new Uint8Array(height*64);for(let y=0;y<height;y++)out.set(pixels.subarray(y*32,y*32+32),y*64);return out;};
 const ending=packet(0x46);assert.equal(ending.length,19456);assert.deepEqual(ending.slice(0,2048),stream(dragonWorld('back',2),32));
 for(let i=0;i<17;i++)assert.deepEqual(ending.slice(2048+i*1024,2048+(i+1)*1024),stream(dragonGlide(i*Math.PI/16,0,{headLeft:true}),16),'native ending angle '+i);
 assert.deepEqual(packet(0x26),stream(dragonGlide(Math.PI/2),16),'native approach projection');
 assert.deepEqual(built.rom.slice(0x3efdde,0x3efdfe),dragonPalette());
});

test('all 35 retained parties acquire and name Dragon through the native hangar event',async()=>{
 for(const party of DRAGON_PARTIES){
  const f=await fixture({id:243,x:8,y:28,party,story:0x7f,flags:[[0x100cd,3],[0x100ee,2]]});runFrames(f.s,300);
  // Boundary: story/recording flags, party and E0 are complete. Controller only.
  const result=await driveAcquisition(f.io,party);assert.ok(result.acquired&&result.named);
  if(party[1]===party[0]+1&&party[2]===party[0]+2)await f.io.shot('acquisition-'+party.join('-'));
  close(f);
 }
});

test('all 35 parties board, fly and land; four directions and pre-repair time travel remain native',async()=>{
 for(const party of DRAGON_PARTIES){
  const f=await fixture({id:496,x:55,y:35,party,dragon:'flying'});runFrames(f.s,500);
  const expected=dragonPalette({world:true});for(let i=0;i<16;i++)assert.equal(f.s.ppu.cgram[240+i],u16(expected,i*2),'isolated native world palette');
  const result=await driveWorldFlight(f.io,party);assert.ok(result.landed);close(f);
 }
 const flying=await fixture({id:496,x:55,y:35,party:[0,1,2],dragon:'flying'});runFrames(flying.s,500);
 const directions=await driveWorldFlight(flying.io,[0,1,2],{allDirections:true});assert.equal(directions.moves.length,4);await flying.io.shot('four-direction-flight');close(flying);
 const grounded=await fixture({id:496,x:55,y:35,party:[0,1,2],dragon:'grounded'});runFrames(grounded.s,500);
 const jumped=await driveWorldFlight(grounded.io,[0,1,2],{grounded:true});assert.deepEqual(jumped.timeTravel,[496,497]);await grounded.io.shot('pre-repair-time-travel');close(grounded);
});

test('native wing repair continues through the real deck battle and enables upgraded flight',async()=>{
 const party=[1,2,3],f=await fixture({id:367,x:7,y:25,party,story:207,endgame:true,flags:[[0x100d2,1],[0x100ec,4],[0x100ee,0x80]]});runFrames(f.s,300);
 // Strong level-60 kit is fixture setup, not campaign balance evidence. The
 // repair, original formation, AI, victory and continuation are all native.
 const result=await driveRepairAndUpgrade(f.io,built.rom,party);assert.ok(result.upgradedFlight);await f.io.shot('repair-upgraded-flight');close(f);
});

test('all 35 parties complete the scripted upgraded-flight scene',async()=>{
 const failures=[];
 for(const party of DRAGON_PARTIES){
  const f=await fixture({id:363,x:56,y:9,party,story:207,endgame:true,flags:[[0x100d2,8],[0x100ec,4],[0x100ee,0x80]]});
  try{
   // Post-victory wing fixture: walk through the real Dragon transition. No
   // battle or AI writes are needed for this party-dependent X/flight sequence.
   const result=await driveUpgradedFlight(f.io,party,new Set(),{requireY:false});assert.ok(result.upgradedFlight);
   if(party[1]===party[0]+1&&party[2]===party[0]+2)await f.io.shot('upgraded-flight-'+party.join('-'));
   close(f);
  }catch(error){failures.push({party,error:error.message});await f.io.shot('upgraded-flight-FAIL-'+party.join('-'));f.dev.dispose();f.h.dispose();}
 }
 assert.deepEqual(failures,[],'every retained party completes the native upgraded-flight scene');
});

test('all 35 parties complete the full approach, dive and living-Dragon escape',async()=>{
 for(const party of DRAGON_PARTIES){
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),io=controller(s),actor=[];
  h.on('event.dispatch',e=>{if(e.location===474&&e.object===14&&![0xb2,0xad,0x96,7].includes(e.opcode))actor.push(e);});
  s.ram.set([...party,...[0,1,2,3,4,5,6].filter(id=>!party.includes(id)),128,128],0x2980);s.ram[0x29af]=party.reduce((mask,id)=>mask|(128>>id),0);
  s.ram[0x100ce]=5;s.ram[0x100aa]&=~4;
  s.ram.set([0xea,80,0x66,2,0xaa,0x56,5,0xce,0,0x65,7,0x6d,0xde,0xda,1,7,58,0x56,0,0xed,1,0xff,0x26,0],0x1238e);
  // Boundary: original approach script, party and dive flags are complete.
  const result=await driveApproachAndEscape(io,party);assert.ok(result.recovered);
  const visible=actor.find(e=>e.opcode===0x90),gone=actor.find(e=>e.opcode===0x91&&visible&&e.frame>visible.frame);
  assert.ok(visible,'Dragon appears beside the party');assert.ok(gone,'Dragon leaves alive');assert.ok(gone.frame-visible.frame>=150,'escape remains visible');
  if(party[1]===party[0]+1&&party[2]===party[0]+2)await io.shot('approach-escape-'+party.join('-'));
  close({s,h,dev});
 }
});

test('intact and dive fixtures execute native ending projection frames',async()=>{
 for(const intact of[true,false]){
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),io=controller(s);
  s.ram.set([0,1,2,3,4,5,6,128,128],0x2980);s.ram[0x29af]=0x7f;s.ram[0x100ce]=intact?0:5;
  s.ram[0x100aa]=intact?s.ram[0x100aa]|4:s.ram[0x100aa]&~4;
  // Established native ending diagnostic: the cue and FF 2B execute the real
  // projection without a JavaScript gameplay hook or a later state write.
  s.ram.set([0xea,0x3f,0xff,0x2b,0],0x1238e);
  const result=await driveEndingProjection(io,built.rom,intact);assert.equal(result.resourceBytes,19456);assert.equal(s.ppu.mode,7,'native Mode 7 projection is active');
  await io.shot('ending-'+(intact?'intact':'dive'));close({s,h,dev});
 }
});
