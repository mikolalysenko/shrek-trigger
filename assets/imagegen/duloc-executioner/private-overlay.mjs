import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {applyRecords,u16,u24,put16,put24} from '../../../engine/rom.js';
import {npcGraphicsStreamTable} from '../../../engine/npc-graphics-streaming.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {decompress} from '../../../engine/compression.js';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function privateOverlay(){
 const d=import.meta.dirname,read=n=>JSON.parse(fs.readFileSync(path.join(d,n))),audit=read('native-audit.json'),compiled=read('draft/audit.json'),base=new Uint8Array(fs.readFileSync(path.join(d,'private/baseline-21abd2c3bb7b.sfc')));
 assert.equal(sha(base),audit.baseline.sha256);
 const table=npcGraphicsStreamTable(base);assert.ok(table);assert.equal(u24(base,table+158*3),0,'GFX158 is not already streamed in pinned baseline');
 const graphics=new Uint8Array(fs.readFileSync(path.join(d,'draft/graphics.4bpp'))),compressed=new Uint8Array(fs.readFileSync(path.join(d,'draft/graphics.ct-lz'))),assembly=new Uint8Array(fs.readFileSync(path.join(d,'draft/assembly.bin'))),records=[],placements=[];
 for(const [b,h]of[[graphics,compiled.graphicsSha256],[compressed,compiled.compressedSha256],[assembly,compiled.assemblySha256]])assert.equal(sha(b),h);
 let at=0x7c0000;
 function add(bytes,label,pointer){const offset=at;at+=(bytes.length+15)&~15;assert.ok(at<=0x7c8000);assert.deepEqual(base.slice(offset,offset+bytes.length),base.slice(offset-0x400000,offset-0x400000+bytes.length),'Private span is still unused original mirror');records.push({offset,bytes,label});const p=new Uint8Array(3);put24(p,0,offset);records.push({offset:pointer,bytes:p,label:label+' pointer'});placements.push({offset,bytes:bytes.length,sha256:sha(bytes),label,pointer});return offset;}
 add(compressed,'Private Sergeant compressed graphics',0x242000+158*3);add(assembly,'Private Sergeant assembly',0x242300+151*3);const raw=add(graphics,'Private Sergeant raw stream',table+158*3);
 const rom=applyRecords(base,records);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}
 assert.deepEqual(decompress(rom,cartridgeOffset(u24(rom,0x242000+158*3),rom)).bytes,graphics);assert.deepEqual(rom.slice(raw,raw+graphics.length),graphics);
 for(const o of audit.ownership[0].owners)assert.deepEqual([...rom.slice(o.offset,o.offset+o.header.length)],o.header);
 assert.equal(sha(rom.slice(audit.paletteRecord.offset,audit.paletteRecord.offset+24)),audit.paletteRecord.sha256);
 assert.deepEqual(rom.slice(0x24f000,0x250000),base.slice(0x24f000,0x250000),'Every original header remains exact');
 const an=audit.nativeAnimation;assert.equal(sha(rom.slice(an.offset,an.offset+an.bytes)),an.sha256);assert.equal(sha(rom.slice(an.durationOffset,an.durationOffset+an.durationBytes)),an.durationSha256);
 let changedBytes=0;for(let i=0;i<rom.length;i++)if(rom[i]!==base[i]){changedBytes++;assert.ok(records.some(r=>i>=r.offset&&i<r.offset+r.bytes.length)||[0xffdc,0x40ffdc].some(p=>i>=p&&i<p+4),'Every byte change explicitly owned');}
 const report={baselinePath:'assets/imagegen/duloc-executioner/private/baseline-21abd2c3bb7b.sfc',baselineSha256:sha(base),privateSha256:sha(rom),streamTable:table,streamedGraphics:[158],rawPointer:raw,placements,changedBytes,headersAiStatsAnimationPalettesUnchanged:true,nativeStreamingHelperUnchanged:true,extraWramBytes:0,extraVramBytes:0,privateOnly:true};
 fs.writeFileSync(path.join(d,'private/candidate.sfc'),rom);fs.writeFileSync(path.join(d,'private/candidate.json'),JSON.stringify(report,null,2)+'\n');
 return{rom,base,audit:{...audit,owners:audit.ownership[0].owners,palettes:[{id:160,words:audit.paletteRecord.words}],animation:audit.nativeAnimation},compiled,bank:{key:'duloc-court-soldier',gfx:158,asm:151,size:0,cells:4,frames:26,graphics,assembly,compressed},report};
}
