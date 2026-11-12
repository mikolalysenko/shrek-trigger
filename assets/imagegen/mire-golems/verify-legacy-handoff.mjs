// Compare native request/display scheduling with the immutable earlier-art bank.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCore} from '../../../scripts/core.mjs';
import {snapshot,restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {newGame,runFrames} from '../../../engine/automation.js';
import {u16,u24} from '../../../engine/rom.js';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {nativeOamCells} from './native-proof-utils.mjs';
const dir='assets/imagegen/mire-golems',out='.local/qa/mire-golems-native-proof',json=async p=>JSON.parse(await readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const rom=new Uint8Array(await readFile(out+'/baseline.sfc')),source=await json(dir+'/golem/native-resource-audit.json'),manifest=await json(out+'/baseline-manifest.json');
assert.equal(hash(rom),source.currentBaseline.sha256);assert.equal(u24(rom,manifest.resources.npcGraphicsStreaming.table+154*3),0,'Earlier-art bank uses legacy decoded loading');
let s=await createCore(rom);try{restore(s,await json(out+'/baseline-bedroom.json'));}catch{s=await createCore(rom);await newGame(s);await writeFile(out+'/baseline-bedroom.json',JSON.stringify(snapshot(s)));}
const h=installHooks(s,await json('content/hooks.json')),d=createDevTools(s,h),reports=[];
const state=()=>({nativeFrame:s.ram[0xf1f],timer:s.ram[0x161f],animation:s.ram[0x169e],phase:s.ram[0x169f],mode:s.ram[0x179e]});
function tiles(frame,bank){const bytes=[];for(let i=0;i<32;i++){const t=u16(bank.assembly,frame*80+i*2);for(let b of bank.graphics.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}bytes.push(b);}}return Uint8Array.from(bytes);}
try{for(const actor of source.actors){
 const bank=nativeSpriteBank(rom,{gfx:154,asm:147,size:1,frames:32,palette:actor.palette});assert.equal(hash(bank.graphics),source.currentBaseline.graphics.rawSha256);
 d.previewActor(actor.key);runFrames(s,300);const ready=snapshot(s),sourcePointer=(s.ram[0x121e]<<16)|u16(s.ram,0x129e);assert.equal(sourcePointer>>>16,0x7f);
 for(let facing=0;facing<4;facing++){
  restore(s,ready);const frames=Array.from(rom.slice(source.animation[0].offset+facing*48+4,source.animation[0].offset+facing*48+8)),durations=Array.from(rom.slice(source.animation[1].offset+4,source.animation[1].offset+8));assert.deepEqual(durations,[10,5,10,5]);
  let pending=true;const off=h.on('event.dispatch',e=>{if(pending&&e.object===15&&e.location===1){s.ram.set([0xa6,facing,0xaa,1,0xad,255,0x11,3],0x12001+e.scriptPC);pending=false;}});
  let elapsed=0;for(;elapsed<140;elapsed++){runFrames(s,1);const a=state();if(elapsed>=30&&!pending&&a.mode===1&&a.animation===1&&a.phase===0&&a.timer===10&&a.nativeFrame===frames[0])break;}off();assert.ok(elapsed<140);
  const ticks=[];for(let loop=0;loop<2;loop++)for(let phase=0;phase<4;phase++)for(let tick=0;tick<durations[phase];tick++){
   const a=state();assert.deepEqual(a,{nativeFrame:frames[phase],timer:durations[phase]-tick,animation:1,phase,mode:1});const p=u16(s.ram,0xd1e)*32,vram=new Uint8Array(s.ppu.vram.buffer).slice(p,p+1024);let displayed=frames[phase],delay=0;
   if(!Buffer.from(vram).equals(Buffer.from(tiles(displayed,bank)))){assert.equal(tick,0);displayed=frames[(phase+3)%4];assert.deepEqual(vram,tiles(displayed,bank));delay=1;}
   const oam=nativeOamCells(s);for(const c of nativeSpriteCells(bank,displayed))assert.ok(oam.some(o=>o.size===16&&o.x===200+c.x&&o.y===143+c.y&&Buffer.from(o.pixels).equals(Buffer.from(c.pixels))));
   ticks.push({tick:ticks.length,...a,displayed,delay});assert.equal(d.diagnostics().fatal,null);runFrames(s,1);
  }
  reports.push({key:actor.key,enemy:actor.enemy,facing,frames,durations,sourcePointer,exactVideoTicks:ticks.length,maxDelay:Math.max(...ticks.map(t=>t.delay)),delayedBoundaries:ticks.filter(t=>t.delay)});
 }
 d.undo();console.log(actor.key+': four original legacy walk schedules passed');
}}finally{d.dispose();h.dispose();}
assert.deepEqual(s.cart.data,rom);
const proof={status:'passed',scope:'Immutable e136 earlier-art gfx154 uses legacy 7F decoded loading. All four original walk directions, both owners, two cycles each; requested frame/duration and complete VRAM/eight-cell OAM coherence checked every video tick.',baselineSha256:hash(rom),core:'repository SNES JS native 65816/PPU',cases:reports.length,cycles:reports.length*2,exactVideoTicks:reports.reduce((n,r)=>n+r.exactVideoTicks,0),maximumRequestToDisplayDelay:Math.max(...reports.map(r=>r.maxDelay)),delayedPhaseBoundaries:reports.reduce((n,r)=>n+r.delayedBoundaries.length,0),reports,cartridgeUnchanged:true,runner:{file:dir+'/verify-legacy-handoff.mjs',sha256:hash(await readFile(dir+'/verify-legacy-handoff.mjs'))}};
await writeFile(dir+'/legacy-handoff-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({ticks:proof.exactVideoTicks,maxDelay:proof.maximumRequestToDisplayDelay,delayedBoundaries:proof.delayedPhaseBoundaries}));
