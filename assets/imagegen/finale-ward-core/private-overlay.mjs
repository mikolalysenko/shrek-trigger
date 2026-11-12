import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileFinaleDraft} from './compile-draft.mjs';
import {u16,u24,put16,put24,fileOffset,applyRecords} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
export function privateFinaleOverlay(){const parts=compileFinaleDraft(),audit=JSON.parse(fs.readFileSync(path.join(d,'native-audit.json'))),active=new Uint8Array(fs.readFileSync(path.join(root,audit.activeRomPath)));assert.equal(sha(active),audit.activeRomSha256);let cursor=0x7d0000;const records=[],placements=[];
 const place=(b,label)=>{cursor=Math.ceil(cursor/16)*16;const offset=cursor;cursor+=b.length;assert.ok(cursor<0x7d8000);assert.deepEqual(active.slice(offset,cursor),active.slice(offset-0x400000,cursor-0x400000),'Proven unused expanded mirror');records.push({offset,bytes:b});placements.push({label,offset,bytes:b.length,sha256:sha(b)});return offset;};
 const pointer=(table,id,offset)=>{const b=new Uint8Array(3);put24(b,0,offset);records.push({offset:table+id*3,bytes:b});};
 for(const c of parts){pointer(0x242000,c.actor.gfx,place(c.compressed,c.actor.name+' compressed graphics'));pointer(0x242300,c.actor.asm,place(c.assembly,c.actor.name+' assembly'));}
 const rom=applyRecords(active,records);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,v)=>(n+v)&65535,0);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}
 const protections=[];
 for(const r of audit.current){const p=0x24f600+r.id*10;assert.deepEqual(rom.slice(p,p+10),active.slice(p,p+10));for(const q of[r.ai,r.program,r.durations])assert.deepEqual(rom.slice(q.offset,q.offset+q.bytes),active.slice(q.offset,q.offset+q.bytes));}
 const pal=0x240000+u16(active,0x242a00+233*2);assert.deepEqual(rom.slice(pal,pal+24),active.slice(pal,pal+24));protections.push({label:'All twelve shared palette233 colors',bytes:24,sha256:sha(rom.slice(pal,pal+24)),owners:[11,206,237,239]});
 for(const id of[11,206]){const p=0x24f600+id*10;assert.deepEqual(rom.slice(p,p+10),active.slice(p,p+10));const[gfx,asm]=active.slice(p,p+2),go=fileOffset(u24(active,0x242000+gfx*3)),g=decompress(active,go),ao=fileOffset(u24(active,0x242300+asm*3)),frames=id===206?45:8,bytes=id===206?45*120:8*120;assert.deepEqual(rom.slice(0x242000+gfx*3,0x242003+gfx*3),active.slice(0x242000+gfx*3,0x242003+gfx*3));assert.deepEqual(rom.slice(0x242300+asm*3,0x242303+asm*3),active.slice(0x242300+asm*3,0x242303+asm*3));assert.deepEqual(rom.slice(go,go+g.length),active.slice(go,go+g.length));assert.deepEqual(rom.slice(ao,ao+bytes),active.slice(ao,ao+bytes));protections.push({label:'Unchanged shared owner'+id,gfx,asm,rawGraphicsBytes:g.bytes.length,graphicsSha256:sha(g.bytes),assemblyBytes:bytes,assemblySha256:sha(rom.slice(ao,ao+bytes)),framesChecked:frames});}
 return{rom,parts,placements,report:{activeRomPath:audit.activeRomPath,activeRomSha256:sha(active),privateRomSha256:sha(rom),sourceOnlyInactive:true,unusedExpandedMirrorProved:true,originalHeadersProgramsAiUnchanged:true,sharedPaletteUnchanged:true,protectedResources:protections}};}
