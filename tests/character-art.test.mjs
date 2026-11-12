import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,needsSourceImages} from './helpers.mjs';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {spriteHeaders} from '../engine/native-sprites.js';

const b=await build(),accepted=JSON.parse(await readFile('assets/imagegen/character-art-manifest.json'));
// Banks later restored to stock Chrono Trigger art (November 1, then the
// November 6 tightening to plot-critical characters and Shrek references).
const restored=new Set(['future-mites','future-bells','sewer-pods','lantern-bats','mire-golems','drain-imps','scavenger-rats','workshop-residues','pots','beetles','rootlings-briars','swamp-imps','duloc-town-keeper','duloc-town-resident','town-tradesmen',
 'kilnback','crumb-hunters','bone-guards','future-ushers','supply-keeper','warden-legs','warden','sewer-trolls','frog-guards','palace-hexer','duloc-court-soldier','woodland-sprites','hench-hobgoblins']);
const restoredBackgrounds=new Set([186]);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('accepted character banks preserve their frozen pixels, native roles, palettes and owners',()=>{
 for(const bank of accepted.banks.filter(bank=>!restored.has(bank.key))){
  const address=u24(b.rom,0x242000+bank.gfx*3),offset=cartridgeOffset(address,b.rom),decoded=decompress(b.rom,offset).bytes;
  assert.equal(decoded.length,bank.bytes,bank.key);assert.equal(sha(decoded),bank.sha256,bank.key+' frozen pixels');
  assert.equal(address<0x800000,bank.compressedExtended,bank.key+' compressed placement');
  for(const assembly of [bank.assembly,...bank.additionalAssemblies??[]]){const p=cartridgeOffset(u24(b.rom,0x242300+assembly.id*3),b.rom);
   assert.equal(sha(b.rom.slice(p,p+assembly.bytes)),assembly.sha256,bank.key+' native roles and fixed cell positions '+assembly.id);
  }
  const owners=spriteHeaders(b.rom).filter(h=>b.rom[h.offset]===bank.gfx).map(h=>({kind:h.kind,id:h.id,assembly:b.rom[h.offset+1],palette:b.rom[h.offset+2],animation:b.rom[h.offset+3],size:b.rom[h.offset+4]}));
  assert.deepEqual(owners,bank.owners,bank.key+' complete shared ownership');
  for(const palette of bank.palettes){const p=0x240000+u16(b.rom,0x242a00+palette.id*2);assert.equal(sha(b.rom.slice(p,p+24)),palette.sha256,bank.key+' palette '+palette.id);}
  const stream=b.audit.resources.npcGraphicsStreaming.streams.find(s=>s.gfx===bank.gfx);assert.equal(!!stream,bank.streamed);
  if(stream){assert.equal(stream.bytes,bank.bytes);assert.equal(sha(b.rom.slice(stream.address,stream.address+stream.bytes)),bank.sha256);}
 }
 for(const bank of accepted.banks.filter(bank=>restored.has(bank.key))){
  const pointer=0x242000+bank.gfx*3;assert.equal(u24(b.rom,pointer),u24(b.base,pointer),bank.key+' stock graphics pointer');
  // The crowded ending scenes keep raw streams of the stock keeper and tradesman banks.
  const stream=b.audit.resources.npcGraphicsStreaming.streams.find(s=>s.gfx===bank.gfx);
  if([11,35].includes(bank.gfx))assert.deepEqual(b.rom.slice(stream.address,stream.address+stream.bytes),decompress(b.base,fileOffset(u24(b.base,pointer))).bytes,bank.key+' streams stock pixels');
  else assert.ok(!stream,bank.key+' stock bank is not streamed');
 }
 for(const background of accepted.backgrounds){
  const pointer=0x362220+background.id*3,p=fileOffset(u24(b.rom,pointer)),decoded=decompress(b.rom,p).bytes;
  if(restoredBackgrounds.has(background.id)){assert.equal(u24(b.rom,pointer),u24(b.base,pointer));assert.deepEqual(decoded,decompress(b.base,p).bytes,'stock background '+background.id);continue;}
  assert.equal(decoded.length,background.bytes);assert.equal(sha(decoded),background.sha256);
 }
 for(const packet of accepted.racingPackets??[]){const p=cartridgeOffset(u24(b.rom,0x3e0006+packet.id*3),b.rom),decoded=decompress(b.rom,p).bytes;assert.equal(decoded.length,packet.bytes);assert.equal(sha(decoded),packet.sha256,'frozen race packet '+packet.id);}
 for(const packet of accepted.nativePackets??[]){const p=cartridgeOffset(u24(b.rom,packet.pointer),b.rom),decoded=decompress(b.rom,p).bytes;assert.equal(decoded.length,packet.bytes);assert.equal(sha(decoded),packet.sha256,packet.key);}
});

test('the accepted generated source packets remain complete and unchanged',{skip:needsSourceImages},async()=>{
 const manifest=JSON.parse(await readFile('assets/imagegen/character-art-sources.json'));
 for(const file of manifest.files){const bytes=await readFile(file.file);assert.equal(bytes.length,file.bytes,file.file);assert.equal(sha(bytes),file.sha256,file.file);}
});
