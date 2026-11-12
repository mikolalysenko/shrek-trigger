import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compileDraft,dir,hash} from './compile-draft.mjs';
import {u16,u24,put16,put24,applyRecords} from '../../../engine/rom.js';
import {npcGraphicsStreamTable} from '../../../engine/npc-graphics-streaming.js';
import {readEnemyAI} from '../../../engine/enemy-ai.js';
export{dir,hash};
export async function privateOverlay(){
 const c=await compileDraft(),qa='.local/qa/rumpelstiltskin-wishworks';await mkdir(qa,{recursive:true});
 let baseline;try{baseline=JSON.parse(await readFile(dir+'/baseline.json'));}catch(e){if(e.code!=='ENOENT')throw e;const bytes=await readFile('.local/shrek-trigger.sfc'),path=qa+'/baseline.sfc';baseline={path,sha256:hash(bytes),sourcePath:'.local/shrek-trigger.sfc',scope:'Fixed private copy; never rewritten by candidate generation'};await writeFile(path,bytes);await writeFile(dir+'/baseline.json',JSON.stringify(baseline,null,2)+'\n');}
 const active=new Uint8Array(await readFile(baseline.path));assert.equal(hash(active),baseline.sha256);const table=npcGraphicsStreamTable(active);assert.notEqual(table,null);
 const records=[],placements=[],rawPointers={};let offset=0x7d0000;
 const add=(bytes,label,pointer)=>{const p=offset;offset+=Math.ceil(bytes.length/16)*16;records.push({offset:p,bytes,label});if(pointer!==undefined){const ptr=new Uint8Array(3);put24(ptr,0,p);records.push({offset:pointer,bytes:ptr,label:label+' pointer'});}placements.push({label,offset:p,bytes:bytes.length,sha256:hash(bytes),pointer});return p;};
 for(const bank of c.compiled){add(bank.compressed,'Private gfx'+bank.family.gfx+' compressed packet',0x242000+bank.family.gfx*3);for(const group of bank.groups)add(group.assembly,'Private asm'+group.asm,0x242300+group.asm*3);assert.equal(u24(active,table+bank.family.gfx*3),0,'Selected family is not streamed in baseline');rawPointers[bank.family.gfx]=add(bank.graphics,'Private gfx'+bank.family.gfx+' raw stream',table+bank.family.gfx*3);}
 assert.ok(offset<=0x7d8000,'Private packets fit one proven unused 32 KiB mirror');assert.deepEqual(active.slice(0x7d0000,offset),active.slice(0x3d0000,offset-0x400000),'Owned unused mirror only');for(const p of c.palettes)assert.deepEqual(active.slice(p.offset,p.offset+24),p.bytes,'Preserved palette '+p.id);
 const rom=applyRecords(active,records);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}assert.equal(npcGraphicsStreamTable(rom),table);
 const actors=c.families.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a,previewKey:'draft-'+a.key})));
 for(const a of actors){const p=0x24f600+a.enemy*10,source=c.audit.families.find(f=>f.gfx===a.gfx),owner=source.ownership[0].owners.find(o=>o.kind==='enemy'&&o.id===a.enemy);assert.deepEqual([...rom.slice(p,p+10)],owner.header,'Native header unchanged');const ai=readEnemyAI(rom,a.enemy),expected=source.ai.find(x=>x.enemy===a.enemy);assert.equal(hash(rom.slice(ai.start,ai.start+ai.bytes)),expected.currentSha256,'AI unchanged');for(const[base,stride]of[[0xc4700,23],[0xc5e00,7]])assert.deepEqual(rom.slice(base+a.enemy*stride,base+(a.enemy+1)*stride),active.slice(base+a.enemy*stride,base+(a.enemy+1)*stride),'Native statistics/rewards unchanged');}
 for(const f of c.audit.families){const a=f.animation;assert.equal(hash(rom.slice(a.frameOffset,a.frameOffset+a.frameBytes.length)),a.frameSha256);assert.equal(hash(rom.slice(a.durationOffset,a.durationOffset+a.durationBytes.length)),a.durationSha256);}
 return{c,rom,active,activePath:baseline.path,baseline,actors,table,records,placements,rawPointers,qa};
}
