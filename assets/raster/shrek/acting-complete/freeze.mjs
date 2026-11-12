import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../../../../tests/helpers.mjs';
import {rasterArt} from '../../../../engine/raster-art.js';
import {sprite} from '../../../../engine/sprites.js';
import {cartridgeOffset} from '../../../../engine/expanded-rom.js';
import {u24,fileOffset} from '../../../../engine/rom.js';
import {completeShrekArt} from './art.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const built=await build(),actor=built.audit.characters[0];
const frozen=JSON.parse(await readFile('assets/raster/shrek/acting-review/freeze.json'));
const bounded=JSON.parse(await readFile('assets/raster/shrek/acting-audit-remaining/bounded-proposal.json'));
const previous=frozen.native.frameSha256.slice();
for(const change of bounded.changes)previous[change.frame]=change.afterSha256;
const source=p=>p.pose==='blank'?new Uint8Array(1024):rasterArt('shrek',{...p,source:true});
const sourceFrameSha256=actor.map.map(p=>sha(source(p)));
const activeFrameSha256=actor.map.map(p=>sha(sprite(0,p.facing,p.pose,p.phase)));
const changedFrames=sourceFrameSha256.flatMap((hash,i)=>hash===previous[i]?[]:[i]);
const runSlots=[...Array.from({length:16},(_,i)=>28+i),...Array.from({length:8},(_,i)=>59+i)];
const actingSlots=[69,70,165,166,167,168,204,205,206,207,208,209,210,211,212,220,232,233,234,235,236,237,246,247];
const expected=[...runSlots,...actingSlots];
if(JSON.stringify(changedFrames)!==JSON.stringify(expected))throw Error('Unexpected changed Shrek frames: '+changedFrames);
const graphics=cartridgeOffset(u24(built.rom,0x242000),built.rom),assembly=fileOffset(u24(built.rom,0x242300));
const manifest={
  status:'complete; 24 authored acting roles and 24 reviewed run slots; no fallback frames',
  nativeFrames:actor.frameCount,
  authoredSourceFrames:completeShrekArt.authoredActing.frames,
  changedFrames,
  semanticCounts:actor.semanticCoverage.counts,
  sourceFrameSha256,
  activeFrameSha256,
  graphics:{bytes:actor.bytes,capacity:actor.capacity,sha256:sha(built.rom.slice(graphics,graphics+actor.bytes))},
  assembly:{bytes:actor.assembly.bytes,sha256:sha(built.rom.slice(assembly,assembly+actor.assembly.bytes))},
};
await writeFile(new URL('manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(`Shrek: ${actingSlots.length} acting roles and ${runSlots.length} corrected run slots, ${actor.semanticCoverage.counts.fallback} fallbacks, ${actor.bytes}/${actor.capacity} graphics bytes, ${actor.assembly.bytes} assembly bytes.`);
