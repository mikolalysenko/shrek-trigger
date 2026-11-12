import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from './helpers.mjs';
import {sprite} from '../engine/sprites.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {u24,fileOffset} from '../engine/rom.js';
import {rasterArt,rasterArtInfo,partyConvention} from '../engine/raster-art.js';

const frozen=JSON.parse(await readFile('assets/raster/shrek/acting-review/freeze.json'));
const bounded=JSON.parse(await readFile('assets/raster/shrek/acting-audit-remaining/bounded-proposal.json'));
const acceptedMap=JSON.parse(await readFile('assets/raster/shrek/acting-audit-remaining/native-map.draft.json'));
const baseline=JSON.parse(await readFile('assets/raster/shrek/acting-review/baseline-role-map.json'));
const manifest=JSON.parse(await readFile('assets/raster/shrek/acting-complete/manifest.json'));
const built=await build(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=p=>p.pose==='blank'?new Uint8Array(1024):rasterArt('shrek',{facing:p.facing,pose:p.pose==='attack'?'slash':p.pose,phase:p.phase,source:true});
const runSlots=[...Array.from({length:16},(_,i)=>28+i),...Array.from({length:8},(_,i)=>59+i)];
const actingSlots=[69,70,165,166,167,168,204,205,206,207,208,209,210,211,212,220,232,233,234,235,236,237,246,247];

// The 24 previously provisional acting roles and 24 corrected run slots are
// reviewed changes. Frozen source and active outlined hashes prevent a valid
// tile upload from hiding an accidental pose or palette substitution.
test('Shrek preserves the 24 reviewed acting replacements and corrects all 24 native run slots',()=>{
  const actor=built.audit.characters[0],hashes=actor.map.map(p=>sha(source(p))),activeHashes=actor.map.map(p=>sha(sprite(0,p.facing,p.pose,p.phase))),convention=partyConvention('shrek');
  actor.map.forEach((p,f)=>{const reviewed=source(p),active=sprite(0,p.facing,p.pose,p.phase);
    for(let i=0;i<1024;i++){assert.equal(!active[i],!reviewed[i],'frame '+f+' keeps its authored silhouette');
      if(reviewed[i]&&active[i]!==convention.remap[reviewed[i]])assert.ok(active[i]===1||active[i]===12,'frame '+f+' only remaps colors or outlines');}});
  const previous=frozen.native.frameSha256.slice();
  for(const change of bounded.changes){assert.equal(previous[change.frame],change.beforeSha256);previous[change.frame]=change.afterSha256;}
  assert.deepEqual(hashes.flatMap((hash,i)=>hash===previous[i]?[]:[i]),manifest.changedFrames);
  assert.deepEqual(manifest.changedFrames,[...runSlots,...actingSlots]);
  assert.deepEqual(hashes.flatMap((hash,i)=>hash===baseline.nativeFrameHashes[i]?[]:[i]),[...new Set([...frozen.native.changedFrames,194,...manifest.changedFrames])].sort((a,b)=>a-b));
  assert.deepEqual(hashes,manifest.sourceFrameSha256);
  assert.deepEqual(activeHashes,manifest.activeFrameSha256);
  assert.deepEqual(actor.map,acceptedMap.map,'native frame IDs, directions and phases stay unchanged');
  assert.deepEqual(actor.semanticCoverage.counts,{source:60,adapted:185,fallback:0,blank:3});
  assert.deepEqual(actor.semanticCoverage.remaining,[]);
  assert.equal(actor.provisionalFrames,0);assert.equal(actor.rasterCoverage.proceduralFrames,0);
  for(const frame of [159,160,161,162,163,164])assert.equal(actor.map[frame].pose,'close-eyes');
  assert.equal(actor.map[234].pose,'wink');assert.equal(actor.map[220].pose,'horizontal-strike');
});

test('Shrek run uses six genuine foot-contact phases in every direction',()=>{
  for(let facing=0;facing<4;facing++){
    const frames=Array.from({length:6},(_,phase)=>sprite(0,facing,'run',phase));
    assert.equal(new Set(frames.map(sha)).size,6,`run direction ${facing} has six distinct drawings`);
    frames.forEach((frame,phase)=>assert.deepEqual(frame,sprite(0,facing,'walk',phase),`run direction ${facing} phase ${phase} reuses the reviewed contact cycle`));
  }
  assert.deepEqual([...new Set(runSlots.map(frame=>built.audit.characters[0].map[frame].pose))],['run']);
});

test('Shrek acting loops retain their native phase counts and have distinct authored stages',()=>{
  const info=rasterArtInfo('shrek'),pixels=(pose,facing,phase)=>rasterArt('shrek',{pose,facing,phase,source:true});
  assert.equal(info.sequences.laugh[1].length,2);assert.equal(info.sequences.laugh[2].length,2);assert.equal(info.sequences.laugh[3].length,2);
  assert.equal(info.sequences.sit[1].length,5);assert.equal(info.sequences.hold[0].length,2);assert.equal(info.sequences.drink[1].length,2);
  assert.notDeepEqual(pixels('laugh',1,0),pixels('laugh',1,1),'front laugh rebound');
  assert.notDeepEqual(pixels('laugh',3,0),pixels('laugh',3,1),'side laugh rebound');
  assert.equal(new Set([0,1,2,3,4].map(phase=>sha(pixels('sit',1,phase)))).size,5,'five distinct seated stages');
  assert.notDeepEqual(pixels('hold',0,0),pixels('hold',0,1),'escort gait contacts');
  assert.notDeepEqual(pixels('drink',1,0),pixels('drink',1,1),'mug lift and sip');
  assert.notDeepEqual(pixels('horizontal-strike',2,0),pixels('down',2,0),'airborne strike no longer reuses the prone body');
  const right=pixels('down',2,0),left=pixels('down',3,0),mirrored=Uint8Array.from({length:1024},(_,i)=>right[Math.floor(i/32)*32+31-i%32]);assert.deepEqual(left,mirrored);
  const wink=pixels('wink',1,0),open=pixels('idle',1,0),closed=pixels('close-eyes',1,1);
  assert.notDeepEqual(wink,open);assert.notDeepEqual(wink,closed);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(x<16||x>20||y<7||y>12)assert.equal(wink[y*32+x],open[y*32+x],`wink changes only one eye at ${x},${y}`);
});

test('Shrek complete acting compiles to the reviewed native graphics and assembly',()=>{
  const actor=built.audit.characters[0],graphics=cartridgeOffset(u24(built.rom,0x242000),built.rom),assembly=fileOffset(u24(built.rom,0x242300));
  assert.equal(actor.bytes,manifest.graphics.bytes);assert.ok(actor.bytes<=actor.capacity);
  assert.equal(sha(built.rom.slice(graphics,graphics+actor.bytes)),manifest.graphics.sha256);
  assert.equal(actor.assembly.bytes,manifest.assembly.bytes);
  assert.equal(sha(built.rom.slice(assembly,assembly+actor.assembly.bytes)),manifest.assembly.sha256);
});
