import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compileDraft,dir,hash} from './compile-draft.mjs';
import {u16,u24,put16,put24,applyRecords} from '../../../engine/rom.js';
import {npcGraphicsStreamTable} from '../../../engine/npc-graphics-streaming.js';
import {cartridgeDataAddress,cartridgeOffset} from '../../../engine/expanded-rom.js';
import {decompress} from '../../../engine/compression.js';
export{dir,hash};
export async function privateOverlay(){
 const c=await compileDraft(),qa=dir+'/private-qa',baseline=JSON.parse(await readFile(dir+'/baseline.json'));await mkdir(qa,{recursive:true});const active=new Uint8Array(await readFile(baseline.path));assert.equal(hash(active),baseline.sha256);const table=npcGraphicsStreamTable(active);assert.notEqual(table,null);assert.equal(u24(active,table+36*3),0);
 const source=decompress(active,cartridgeOffset(u24(active,0x242000+36*3),active));assert.equal(hash(source.bytes),c.audit.graphics.current.rawSha256);assert.equal(source.length,c.audit.graphics.current.compressedBytes);const oldAsm=cartridgeOffset(u24(active,0x242300+25*3),active);assert.equal(hash(active.slice(oldAsm,oldAsm+840)),c.audit.assembly.sha256);
 for(const o of c.audit.owners)assert.deepEqual([...active.slice(o.offset,o.offset+5)],o.header);for(const p of c.palettes){const offset=0x240000+u16(active,0x242a00+p.id*2);assert.deepEqual(active.slice(offset,offset+24),p.bytes);}for(const span of[c.audit.animation.frameSpan,c.audit.animation.durationSpan])assert.equal(hash(active.slice(span.start,span.endExclusive)),span.sha256);
 const records=[],placements=[];let offset=0x7c0000;
 const add=(bytes,label,pointer)=>{assert.ok(bytes.length<=32768);if((offset&65535)+bytes.length>32768)offset=(offset&0xff0000)+0x10000;const p=offset;offset+=Math.ceil(bytes.length/16)*16;assert.ok(offset<=0x7d8000);assert.deepEqual(active.slice(p,p+bytes.length),active.slice(p-0x400000,p-0x400000+bytes.length),'Unused expanded mirror bytes in pinned proof baseline');records.push({offset:p,bytes,label});if(pointer!==undefined){const ptr=new Uint8Array(3);put24(ptr,0,cartridgeDataAddress(p));records.push({offset:pointer,bytes:ptr,label:label+' pointer'});}placements.push({label,offset:p,bytes:bytes.length,sha256:hash(bytes),pointer});return p;};
 const bank=c.compiled[0];add(bank.compressed,'Private gfx36 compressed packet',0x242000+36*3);add(bank.groups[0].assembly,'Private asm25',0x242300+25*3);const rawPointer=add(bank.graphics,'Private gfx36 raw stream',table+36*3),rom=applyRecords(active,records);
 for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}
 const family=c.families[0],group=family.groups[0],actors=family.actors.flatMap(a=>a.npcs.map(npc=>({...group,gfx:36,...a,npc,key:a.key+'-'+npc,previewKey:'draft-townswoman-'+npc})));
 await writeFile(qa+'/candidate.sfc',rom);await writeFile(qa+'/overlay.json',JSON.stringify({baseline,privateRomSha256:hash(rom),auditBaseline:c.audit.baseline,sourceResourceIdentityRechecked:true,placements,rawPointer,recordRanges:records.map(r=>({offset:r.offset,bytes:r.bytes.length,label:r.label})),scope:'Private only; original headers, shared palettes, animation16 and all event packets remain exact.'},null,2)+'\n');return{c,rom,active,activePath:baseline.path,baseline,actors,table,records,placements,rawPointer,qa};
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){const p=await privateOverlay();console.log(JSON.stringify({baseline:p.baseline.sha256,candidate:hash(p.rom),rawPointer:p.rawPointer,placements:p.placements}));}
