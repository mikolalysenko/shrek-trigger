// Private native proof on immutable published417914. No active source/ROM writes.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {u24,put16,put24,applyRecords} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {extendedDataAllocator,cartridgeDataAddress} from '../../../engine/expanded-rom.js';
import {placeNpcGraphicsStreams,npcGraphicsStreamingCode} from '../../../engine/npc-graphics-streaming.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
const dir='assets/imagegen/fortress-jugglers',out='.local/qa/fortress-jugglers-native-proof',json=async f=>JSON.parse(await readFile(f)),sha=b=>createHash('sha256').update(b).digest('hex'),audit=await json(dir+'/native-audit.json'),draft=await json(dir+'/draft-audit.json'),baseline=new Uint8Array(await readFile(audit.baseline.path)),manifestPath='.local/qa/next-family-417914abe589/manifest.json',manifest=await json(manifestPath),native=manifest.resources.npcGraphicsStreaming;
assert.equal(sha(baseline),'417914abe589d25e377b774009f983867c14617cbf7a7f176c52691c8c9f2e35');
for(const h of native.helpers)assert.deepEqual(baseline.slice(h.address,h.address+h.bytes),npcGraphicsStreamingCode(native.table|0xc00000,h.kind));
const headers=spriteHeaders(baseline);for(const [field,id]of[[0,91],[1,48],[3,82]])assert.deepEqual(headers.filter(h=>baseline[h.offset+field]===id).map(h=>[h.kind,h.id]),audit.owners.map(o=>[o.kind,o.id]));
const raw=new Uint8Array(await readFile(dir+'/graphics.4bpp')),packed=new Uint8Array(await readFile(dir+'/graphics.ct-lz')),assembly=new Uint8Array(await readFile(dir+'/assembly.bin'));
assert.equal(sha(raw),draft.graphicsSha256);assert.equal(sha(packed),draft.compressedSha256);assert.equal(sha(assembly),draft.assemblySha256);assert.deepEqual(decompress(packed,0).bytes,raw);assert.equal(assembly.length,360);assert.equal(u24(baseline,native.table+91*3),0);
assert.equal(sha(decompress(baseline,audit.resources.graphics.current.offset).bytes),audit.resources.graphics.current.sha256);assert.equal(sha(baseline.slice(audit.resources.assembly.offset,audit.resources.assembly.offset+360)),audit.resources.assembly.sha256);
const records=[],extended=extendedDataAllocator(native.pools),ptr=n=>{const b=new Uint8Array(3);put24(b,0,n);return b;},at=extended.allocate(packed,'Private Fortress Juggler compressed source');
records.push(...extended.records,{offset:0x242000+91*3,bytes:ptr(cartridgeDataAddress(at)),label:'Private Fortress Juggler compressed pointer'},{offset:audit.resources.assembly.offset,bytes:assembly,label:'Private Fortress Juggler original native geometry'});
for(const p of extended.pools)p.next=(p.next+1)&~1;
const streams=placeNpcGraphicsStreams(baseline,records,extended.allocations,[91],extended.pools);
records.push(...streams.records,...streams.streams.map(s=>({offset:native.table+s.gfx*3,bytes:ptr(s.address),label:'Private explicit gfx91 stream'})));
for(const r of records.filter(r=>r.offset>=0x400000))assert.ok(!manifest.allocations.some(a=>r.offset<a.offset+a.length&&r.offset+r.bytes.length>a.offset),'Private allocation must be in a published free pool');
const rom=applyRecords(baseline,records);for(const p of[0xffdc,0x40ffdc]){put16(rom,p,65535);put16(rom,p+2,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const p of[0xffdc,0x40ffdc]){put16(rom,p,sum^65535);put16(rom,p+2,sum);}
let changedBytes=0;for(let i=0;i<rom.length;i++)if(rom[i]!==baseline[i]){changedBytes++;assert.ok(records.some(r=>i>=r.offset&&i<r.offset+r.bytes.length)||[0xffdc,0x40ffdc].some(p=>i>=p&&i<p+4));}
for(const o of audit.owners){const p=0x24f600+o.id*10;assert.deepEqual(rom.slice(p,p+10),Uint8Array.from(o.header));}
for(const p of audit.palettes)assert.equal(sha(rom.slice(p.offset,p.offset+24)),p.sha256);
for(const [offset,bytes,expected]of[[audit.animation.frameOffset,audit.animation.frameBytes.length,audit.animation.frameSha256],[audit.animation.durationOffset,audit.animation.durationBytes.length,audit.animation.durationSha256],...audit.ai.map(a=>[a.offset,a.bytes,a.sha256])])assert.equal(sha(rom.slice(offset,offset+bytes)),expected);
const proof={status:'Private inactive native candidate',activation:false,baselinePath:audit.baseline.path,baselineSha256:sha(baseline),candidatePath:out+'/candidate.sfc',candidateSha256:sha(rom),changedBytes,streams:streams.streams,manifestPath,manifestSha256:sha(await readFile(manifestPath)),palettesWritten:false,nativeHelpersUnchanged:true,extraWramBytes:0,extraVramBytes:0,originalHeadersAiStatsNamesEventsUnchanged:true,AA82Unchanged:true,records:records.map(r=>({offset:r.offset,bytes:r.bytes.length,label:r.label,sha256:sha(r.bytes)}))};
await mkdir(out,{recursive:true});await writeFile(out+'/candidate.sfc',rom);await writeFile(out+'/candidate.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({candidate:proof.candidateSha256,streams:proof.streams,changedBytes}));
