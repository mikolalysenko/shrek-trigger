import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from './helpers.mjs';
import {decode} from '../engine/text.js';
import {storyBattleNames} from '../content/retained-boss-names.js';

const built=await build(),name=(rom,id)=>decode(rom.subarray(0xc6500+id*11,0xc6500+id*11+11)).trim();

test('story enemies show their adapted battle names',()=>{
  for(const a of storyBattleNames){
    assert.equal(name(built.base,a.enemy),a.source);
    assert.equal(name(built.rom,a.enemy),a.short,`enemy ${a.enemy.toString(16)}`);
  }
});

test('no battle name keeps a source plot name the adaptation replaced',()=>{
  // Generic stock mobs keep their names; these belong to recast story roles.
  const stale=/^(Zeal|Lavos|Magus|Mammon M\.|Flea\??|Dalton|Ozzie|Slash|Spekkio|Masa|Mune|Yakra|Azala|Lavos Core|Lavos Spawn)$/;
  for(let id=0;id<0xfb;id++)assert.doesNotMatch(name(built.rom,id),stale,`enemy ${id.toString(16)}`);
});
