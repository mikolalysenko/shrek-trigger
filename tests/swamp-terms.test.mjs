import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from './helpers.mjs';
import {u16} from '../engine/rom.js';
import {encode,encodeDialogue,dialogueLength,ONION,ONION_GLYPH} from '../engine/text.js';
import {statNames,toenailGlyph} from '../engine/swamp-terms.js';
import {itemHelp} from '../content/item-help.js';
import {itemHelpRegion} from '../engine/item-help.js';
import {items} from '../content/items.js';
import {dialogue} from '../content/dialogue.js';

const b=await build();

test('the status screen uses the ogre stat names in their native slots',()=>{
 assert.deepEqual(statNames.map(s=>s.label),['BEEF','ZOOM','AIM','SLY','MOJO','LAYER','EARWAX']);
 let cursor=0x3fc500;
 for(const s of statNames){
  const label=encode(s.label),source=encode(s.source);assert.equal(label.length,source.length,s.label);
  let at=-1;for(let p=cursor;p<0x3fc530&&at<0;p++)if(label.every((v,i)=>b.rom[p+i]===v))at=p;
  assert.ok(at>=0,s.label+' is on the status screen');assert.ok(source.every((v,i)=>b.base[at+i]===v),s.label+' replaces '+s.source);cursor=at+label.length;
 }
 // Nothing else in the status layout string moved.
 let changed=0;for(let p=0x3fc4f0;p<0x3fc540;p++)if(b.rom[p]!==b.base[p])changed++;
 assert.equal(changed,statNames.reduce((n,s)=>n+[...s.label].filter((c,i)=>c!==s.source[i]).length,0)+1,'only the labels and one money sign change');
});

test('money is toenails: a toenail glyph in menus and battle, the word in field text',()=>{
 assert.equal(encode(ONION)[0],ONION_GLYPH);
 const glyph=0x3f8c60+ONION_GLYPH*16;assert.deepEqual(b.rom.slice(glyph,glyph+16),toenailGlyph());
 assert.ok(toenailGlyph().some(v=>v),'the glyph is drawn');
 // The other two spare '#' glyphs are untouched.
 for(const code of[0xee,0xf3])assert.deepEqual(b.rom.slice(0x3f8c60+code*16,0x3f8c60+code*16+16),b.base.slice(0x3f8c60+code*16,0x3f8c60+code*16+16));
 const signs=[];for(let p=0x3f0000;p<0x400000;p++)if(b.rom[p-2]===0x63&&b.rom[p-1]===0x7e&&b.rom[p]===ONION_GLYPH)signs.push(p);
 assert.equal(signs.length,4,'status, save and both shop panes');
 for(let p=0x3f0000;p<0x400000;p++)assert.ok(!(b.rom[p-2]===0x63&&b.rom[p-1]===0x7e&&b.rom[p]===0xa6),'no G left after a menu amount');
 assert.equal(b.rom[b.audit.swampTerms.currency.battleSign],ONION_GLYPH);assert.equal(b.base[b.audit.swampTerms.currency.battleSign],0xa6);
 // Field text never shows the old unit after a number.
 for(const[location,lines]of Object.entries(dialogue))for(const[id,text]of Object.entries(lines))assert.doesNotMatch(text,/\d ?G\b/,`${location}:${id}`);
});

test('every item help line fits, uses the new terms and sits in the native block or free padding',()=>{
 const {start,end}=itemHelpRegion(b.base),audit=b.audit.itemHelp;
 for(const[id,line]of Object.entries(itemHelp)){
  assert.ok(line.length<=31,`item ${id}: ${line}`);
  assert.doesNotMatch(line,/\b(Power|Speed|Magic|Stamina|Vigor|Strike|Evade|Mg Defense|Lightning|Shadow)\b| G\b|Tonic|Ether|Elixir|Onion Broth/,`item ${id} uses the Shrek terms: ${line}`);
  assert.ok(items.some(i=>i.id===+id),`item ${id} is a named item`);
 }
 for(const {id,address,text} of audit.lines){
  assert.equal(0xc0000+u16(b.rom,0xc2eb1+id*2),address);
  const bytes=encodeDialogue(text+'{null}',b.base);assert.deepEqual(b.rom.slice(address,address+bytes.length),bytes,'item '+id);
  assert.ok(audit.pools.some(p=>address>=p.address&&address+bytes.length<=p.address+p.length),'item '+id+' stays in a help pool');
 }
 for(let id=0;id<242;id++)if(itemHelp[id]===undefined){const a=0xc0000+u16(b.rom,0xc2eb1+id*2);assert.equal(a,audit.empty);assert.equal(dialogueLength(b.rom,a),1,'item '+id+' has an empty line');}
 assert.equal(audit.pools[0].address,start);assert.equal(audit.pools[0].length,end-start);
 for(const pool of audit.pools.slice(1))for(let i=0;i<pool.used;i++)assert.equal(b.base[pool.address+i],0xff,'overflow uses free ROM');
 // The technique help overflow lives elsewhere in the same bank.
 const tech=b.audit.techHelp.overflow;for(const pool of audit.pools)assert.ok(tech.address+tech.bytes<=pool.address||tech.address>=pool.address+pool.length);
 // Healing is spicy roots: the Onion line for HP, the Garlic line for MP.
 assert.deepEqual([189,190,191,192,193,194].map(id=>items.find(i=>i.id===id).name),['Onion','Mid Onion','High Onion','Garlic','Mid Garlic','High Garlic']);
});
