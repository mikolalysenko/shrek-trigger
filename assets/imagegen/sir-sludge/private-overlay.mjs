import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compileDraft,dir,hash} from './compile-draft.mjs';
import {u16,u24,put16,put24,applyRecords} from '../../../engine/rom.js';
import {npcGraphicsStreamTable} from '../../../engine/npc-graphics-streaming.js';
import {cartridgeDataAddress} from '../../../engine/expanded-rom.js';
import {readEnemyAI} from '../../../engine/enemy-ai.js';
export{dir,hash};
export async function privateOverlay(){
 const c=await compileDraft(),qa=dir+'/private-qa',baseline=c.audit.baseline;await mkdir(qa,{recursive:true});const active=new Uint8Array(await readFile(baseline.path));assert.equal(hash(active),baseline.sha256);const table=npcGraphicsStreamTable(active);assert.notEqual(table,null);
 const records=[],placements=[],rawPointers={};let offset=0x7c0000;
 const add=(bytes,label,pointer)=>{assert.ok(bytes.length<=32768);if((offset&65535)+bytes.length>32768)offset=(offset&0xff0000)+0x10000;const p=offset;offset+=Math.ceil(bytes.length/16)*16;assert.ok(offset<=0x7d8000);assert.deepEqual(active.slice(p,p+bytes.length),active.slice(p-0x400000,p-0x400000+bytes.length),'Private mirror span unused in pinned baseline');records.push({offset:p,bytes,label});if(pointer!==undefined){const ptr=new Uint8Array(3);put24(ptr,0,cartridgeDataAddress(p));records.push({offset:pointer,bytes:ptr,label:label+' pointer'});}placements.push({label,offset:p,bytes:bytes.length,sha256:hash(bytes),pointer});return p;};
 for(const bank of c.compiled){add(bank.compressed,'Private gfx82 compressed packet',0x242000+82*3);for(const group of bank.groups)add(group.assembly,'Private asm37',0x242300+37*3);assert.equal(u24(active,table+82*3),0);rawPointers[82]=add(bank.graphics,'Private gfx82 raw stream',table+82*3);}
 for(const p of c.palettes)assert.deepEqual(active.slice(p.offset,p.offset+24),p.bytes,'Palette unchanged '+p.id);
 const rom=applyRecords(active,records);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}
 const actors=c.families.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a,previewKey:'draft-'+a.key})));
 for(const a of actors){const p=0x24f600+a.enemy*10,owner=c.audit.resources[0].owners.find(o=>o.kind==='enemy'&&o.id===a.enemy);assert.deepEqual([...rom.slice(p,p+10)],owner.header);const ai=readEnemyAI(rom,a.enemy),expected=c.audit.ai.find(x=>x.enemy===a.enemy);assert.equal(hash(rom.slice(ai.start,ai.start+ai.bytes)),expected.currentSha256);for(const[base,stride]of[[0xc4700,23],[0xc5e00,7]])assert.deepEqual(rom.slice(base+a.enemy*stride,base+(a.enemy+1)*stride),active.slice(base+a.enemy*stride,base+(a.enemy+1)*stride));}
 const a=c.audit.animation;assert.equal(hash(rom.slice(a.frameOffset,a.frameOffset+a.frameBytes.length)),a.frameSha256);assert.equal(hash(rom.slice(a.durationOffset,a.durationOffset+a.durationBytes.length)),a.durationSha256);
 await writeFile(qa+'/candidate.sfc',rom);return{c,rom,active,activePath:baseline.path,baseline,actors,table,records,placements,rawPointers,qa};
}
