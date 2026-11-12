// Private saved-cartridge overlay; no ROM, checkpoint or production file writes.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compileCivilianDrafts} from './compile-draft.mjs';
import {u16,put16,put24,applyRecords} from '../../../engine/rom.js';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export async function privateOverlay(){
 const candidates=await compileCivilianDrafts(),activePath='.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc',active=new Uint8Array(await readFile(activePath));assert.equal(hash(active),'2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066');
 const records=[],placements=[];let offset=0x7d0000;
 for(const c of candidates){const gp=new Uint8Array(3),ap=new Uint8Array(3),packetOffset=offset;put24(gp,0,packetOffset);offset+=Math.ceil(c.compressed.length/16)*16;const assemblyOffset=offset;put24(ap,0,assemblyOffset);offset+=Math.ceil(c.assembly.length/16)*16;
  records.push({offset:packetOffset,bytes:c.compressed,label:'Private '+c.key+' compressed packet'},{offset:assemblyOffset,bytes:c.assembly,label:'Private '+c.key+' assembly'},{offset:0x242000+c.family.gfx*3,bytes:gp,label:'Private '+c.key+' graphics pointer'},{offset:0x242300+c.family.groups[0].asm*3,bytes:ap,label:'Private '+c.key+' assembly pointer'});placements.push({key:c.key,packetOffset,assemblyOffset});
  for(const p of c.palettes)assert.deepEqual(active.slice(p.offset,p.offset+24),p.bytes,'Existing shared village palette must already match; no palette write is authorized');
 }
 assert.ok(offset<=0x7d8000);assert.deepEqual(active.slice(0x7d0000,offset),active.slice(0x3d0000,offset-0x400000),'Private placement is unused saved-build mirror');
 const rom=applyRecords(active,records);for(const h of [0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of [0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}
 const audit=JSON.parse(await readFile('assets/imagegen/bakery-civilians/native-audit.json'));
 for(const a of audit.families){for(const h of a.npcHeaders){const p=0x24f000+(h.id+7)*5;assert.deepEqual(rom.slice(p,p+5),active.slice(p,p+5));}for(const[type,length]of [['animation',a.source.animationBytes],['duration',a.source.durationBytes]])assert.deepEqual(rom.slice(a.source[type+'Offset'],a.source[type+'Offset']+length),active.slice(a.source[type+'Offset'],a.source[type+'Offset']+length));}
 for(const palette of audit.paletteRecords)assert.deepEqual(rom.slice(palette.offset,palette.offset+24),active.slice(palette.offset,palette.offset+24));
 return {candidates,active,activePath,rom,audit,placements};
}
