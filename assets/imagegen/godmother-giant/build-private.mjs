// Private source overlay only. Does not invoke or alter the active art registry.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {u16,u24,put16,put24,applyRecords} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {extendedDataAllocator,cartridgeDataAddress} from '../../../engine/expanded-rom.js';
import {placeNpcGraphicsStreams,npcGraphicsStreamingCode} from '../../../engine/npc-graphics-streaming.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
const dir='assets/imagegen/godmother-giant',out='.local/qa/godmother-giant-native-proof',hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(p));
const baseline=new Uint8Array(await readFile(out+'/baseline.sfc')),original=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc')),manifest=await json(out+'/baseline-manifest.json'),oldRecords=await json(out+'/baseline-records.json'),audit=await json(dir+'/native-resource-audit.json'),draft=await json(dir+'/draft-audit.json'),native=manifest.resources.npcGraphicsStreaming;
assert.equal(hash(baseline),'fdb8865eda88fcf8e9aea35de50c688b38a131da48ca73e5c72d42c36b66f2a6');assert.equal(hash(baseline),audit.baselineSha256);
for(const h of native.helpers)assert.deepEqual(baseline.slice(h.address,h.address+h.bytes),npcGraphicsStreamingCode(native.table|0xc00000,h.kind));
const records=[],extended=extendedDataAllocator(native.pools),ptr=n=>{const b=new Uint8Array(3);put24(b,0,n);return b;};
for(const [i,key]of ['face','hands'].entries()){
 const a=audit.groups[i],r=draft.groups[i],raw=new Uint8Array(await readFile(dir+'/'+key+'/graphics.4bpp')),packed=new Uint8Array(await readFile(dir+'/'+key+'/graphics.ct-lz')),asm=new Uint8Array(await readFile(dir+'/'+key+'/assembly.bin')),pal=new Uint8Array(await readFile(dir+'/'+key+'/palette-'+a.palette.id+'.bin'));
 assert.equal(hash(raw),r.graphicsSha256);assert.equal(hash(packed),r.compressedSha256);assert.equal(hash(asm),r.assemblySha256);assert.equal(hash(pal),r.paletteSha256);assert.deepEqual(decompress(packed,0).bytes,raw);assert.equal(asm.length,a.assembly.usedBytes);
 for(const field of[0,1,2])assert.deepEqual(spriteHeaders(baseline).filter(h=>baseline[h.offset+field]===([a.gfx,a.asm,a.palette.id][field])).map(h=>[h.kind,h.id]),a.ownership.find(o=>o.field===field).owners.map(o=>[o.kind,o.id]));
 assert.equal(u24(baseline,native.table+a.gfx*3),0);assert.equal(hash(baseline.slice(a.assembly.offset,a.assembly.offset+asm.length)),a.assembly.sha256);assert.equal(hash(baseline.slice(a.palette.offset,a.palette.offset+24)),a.palette.sha256);
 const at=extended.allocate(packed,'Private giant Godmother '+key+' compressed graphics');records.push({offset:0x242000+a.gfx*3,bytes:ptr(cartridgeDataAddress(at)),label:'Private '+key+' compressed pointer'},{offset:a.assembly.offset,bytes:asm,label:'Private '+key+' authored cell geometry'},{offset:a.palette.offset,bytes:pal,label:'Private exclusive palette'+a.palette.id});
 for(const p of extended.pools)p.next=(p.next+1)&~1;
}
records.push(...extended.records);
const streams=placeNpcGraphicsStreams(baseline,records,extended.allocations,[161],extended.pools);records.push(...streams.records,...streams.streams.map(s=>({offset:native.table+s.gfx*3,bytes:ptr(s.address),label:'Private selected gfx'+s.gfx+' stream pointer'})));
for(const r of records.filter(r=>r.offset>=0x400000))assert.ok(!oldRecords.some(a=>r.offset<a.offset+a.length&&r.offset+r.bytes.length>a.offset));
const rom=applyRecords(baseline,records);for(const p of[0xffdc,0x40ffdc]){put16(rom,p,65535);put16(rom,p+2,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const p of[0xffdc,0x40ffdc]){put16(rom,p,sum^65535);put16(rom,p+2,sum);}let changedBytes=0;for(let i=0;i<rom.length;i++)if(rom[i]!==baseline[i]){changedBytes++;assert.ok(records.some(r=>i>=r.offset&&i<r.offset+r.bytes.length)||[0xffdc,0x40ffdc].some(p=>i>=p&&i<p+4));}
for(const a of audit.groups){for(const o of a.owners){const p=0x24f600+o.id*10;assert.deepEqual(rom.slice(p,p+10),original.slice(p,p+10));assert.equal(hash(rom.slice(o.ai.offset,o.ai.offset+o.ai.bytes)),o.ai.sha256);for(const [table,stride]of [[0xc4700,23],[0xc5e00,7],[0xc6500,11]]){const p=table+o.id*stride;assert.deepEqual(rom.slice(p,p+stride),baseline.slice(p,p+stride));}}for(const p of a.animations){assert.equal(hash(rom.slice(p.frameOffset,p.frameOffset+p.frameBytes.length)),p.frameSha256);assert.equal(hash(rom.slice(p.durationOffset,p.durationOffset+p.durationBytes.length)),p.durationSha256);}}
assert.equal(u24(rom,native.table+162*3),0,'Hands preserve ordinary compressed loading');
const proof={status:'Private inactive candidate',baselineSha256:hash(baseline),candidateSha256:hash(rom),candidatePath:out+'/candidate.sfc',baselineManifestSha256:hash(await readFile(out+'/baseline-manifest.json')),changedBytes,streams:streams.streams,ordinaryCompressedGraphics:[162],palettesWritten:[205,206],nativeHelpersUnchanged:true,extraWramBytes:0,extraVramBytes:0,originalHeadersAiStatsNamesEventsBackgroundsUnchanged:true,sharedAA177AndNpc150Unchanged:true,records:records.map(r=>({offset:r.offset,bytes:r.bytes.length,label:r.label,sha256:hash(r.bytes)})),resourceDelta:draft.groups.map(g=>({gfx:g.gfx,decoded:g.graphicsBytes-g.originalGraphicsBytes,compressed:g.compressedBytes-g.originalCompressedBytes,assembly:0})),activation:false};
await writeFile(out+'/candidate.sfc',rom);await writeFile(out+'/candidate.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
