import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileDraft,sha} from './compile-draft.mjs';
import {put16,put24,u16,applyRecords} from '../../../engine/rom.js';
const root=path.resolve(import.meta.dirname,'../../..');
export function privateOverlay() {
  const c=compileDraft(),activePath='.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc';
  const active=new Uint8Array(fs.readFileSync(path.join(root,activePath)));
  assert.equal(sha(active),'2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066');
  const records=[],placements=[];let offset=0x7d0000;
  for(const a of c.candidates) {
    const graphicsOffset=offset,gp=new Uint8Array(3),ap=new Uint8Array(3);
    put24(gp,0,graphicsOffset);offset+=Math.ceil(a.compressed.length/16)*16;
    const assemblyOffset=offset;put24(ap,0,assemblyOffset);offset+=Math.ceil(a.assembly.length/16)*16;
    records.push({offset:graphicsOffset,bytes:a.compressed,label:'Private spawn '+a.key+' graphics'},
      {offset:assemblyOffset,bytes:a.assembly,label:'Private spawn '+a.key+' assembly'},
      {offset:0x242000+a.audit.gfx*3,bytes:gp,label:'Private graphics pointer'},
      {offset:0x242300+a.audit.asm*3,bytes:ap,label:'Private assembly pointer'});
    placements.push({key:a.key,graphicsOffset,assemblyOffset});
  }
  assert.ok(offset<0x7d8000);assert.deepEqual(active.slice(0x7d0000,offset),active.slice(0x3d0000,offset-0x400000));
  const rom=applyRecords(active,records);
  for(const h of [0xffc0,0x40ffc0]) {put16(rom,h+28,65535);put16(rom,h+30,0);}
  const checksum=rom.reduce((n,b)=>(n+b)&65535,0);
  for(const h of [0xffc0,0x40ffc0]) {put16(rom,h+28,checksum^65535);put16(rom,h+30,checksum);}
  for(const bank of c.audit.banks)for(const owner of bank.owners) {
    const hp=0x24f600+owner.id*10;
    assert.deepEqual([...rom.slice(hp,hp+10)],owner.header);
    assert.equal(sha(rom.slice(owner.ai.offset,owner.ai.offset+owner.ai.bytes)),owner.ai.sha256);
    for(const p of [owner.animation,owner.durations])assert.equal(sha(rom.slice(p.offset,p.offset+p.bytes)),p.sha256);
  }
  const paletteOffset=0x240000+u16(active,0x242a00+208*2);
  assert.equal(paletteOffset,c.audit.palette.offset);
  assert.deepEqual([...rom.slice(paletteOffset,paletteOffset+24)],c.audit.palette.words.flatMap(w=>[w&255,w>>8]));
  return {...c,activePath,active,rom,placements,report:{activePath,activeSha256:sha(active),privateSha256:sha(rom),placements,palette208Unchanged:true,headersAiProgramsUnchanged:true,streamingUsed:false}};
}
