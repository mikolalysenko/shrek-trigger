import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from './helpers.mjs';
import {decompress} from '../engine/compression.js';
import {u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {customMedinaFamilies as medinaFamilies} from '../content/medina-actors.js';
import {medinaActorSprite} from '../engine/medina-art.js';
import {ghostFamilies} from '../content/ghost-actors.js';
import {ghostSprite} from '../engine/ghost-art.js';
import {readEnemyAI} from '../engine/enemy-ai.js';

const b=await build(),accepted=JSON.parse(await readFile('assets/imagegen/boss-art-manifest.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// The Dozer (November 1) and Crag Keeper (November 6) banks are stock again.
const restored=new Set(['swamp-dozer','crag-keeper']);

test('the complete accepted boss banks and all accepted native assembly slots survive production compilation',()=>{
  for(const bank of accepted.banks.filter(bank=>restored.has(bank.key))){
    const pointer=0x242000+bank.gfx*3;assert.equal(u24(b.rom,pointer),u24(b.base,pointer),bank.key+' stock graphics pointer');
    const p=fileOffset(u24(b.base,pointer));assert.deepEqual(decompress(b.rom,p).bytes,decompress(b.base,p).bytes,bank.key+' stock pixels');
  }
  for(const bank of accepted.banks.filter(bank=>!restored.has(bank.key))){
    const source=cartridgeOffset(u24(b.rom,0x242000+bank.gfx*3),b.rom),decoded=decompress(b.rom,source).bytes;
    assert.equal(decoded.length,bank.bytes,bank.key);assert.equal(sha(decoded),bank.sha256,bank.key+' accepted pixels');
    const stream=b.audit.resources.npcGraphicsStreaming.streams.find(s=>s.gfx===bank.gfx);
    assert.ok(stream,bank.key+' selected native loader');assert.equal(sha(b.rom.slice(stream.address,stream.address+stream.bytes)),bank.sha256);
    for(const assembly of bank.assemblies){const p=cartridgeOffset(u24(b.rom,0x242300+assembly.id*3),b.rom);assert.equal(sha(b.rom.slice(p,p+assembly.bytes)),assembly.sha256,bank.key+' accepted native roles and cell positions');}
  }
});

test('larger artwork requires an explicit native-streamed family; unselected families retain the strict decoded budget',()=>{
  for(const [families,draw]of [[medinaFamilies,medinaActorSprite],[ghostFamilies,ghostSprite]]){
    assert.throws(()=>patchActorFamilies(b.base,families,draw,()=>0x300000,()=>{},b.records),/original decoded graphics budget/);
  }
});

test('the spectral Sir Bram replaces only its artwork and battle label, preserving native combat and animation headers',()=>{
  const id=143,p=0x24f600+id*10;assert.deepEqual(b.rom.slice(p,p+10),b.base.slice(p,p+10));
  for(const [table,stride]of [[0xc4700,23],[0xc5e00,7]])assert.deepEqual(b.rom.slice(table+id*stride,table+(id+1)*stride),b.base.slice(table+id*stride,table+(id+1)*stride));
  const ai=readEnemyAI(b.base,id);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  assert.equal(b.audit.ghosts.actors[0].cells,12);assert.equal(b.audit.ghosts.actors[0].frames,21);
});
