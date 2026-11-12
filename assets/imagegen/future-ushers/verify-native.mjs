// Private bounded native display proof; existing production four-cell stream helpers.
// Source overrides only. No active source, canonical ROM or gallery writes.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {u16,u24,put16,put24,applyRecords,fileOffset} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {coalesceReclaimedPools} from '../../../engine/resource-pools.js';
import {ResourceAllocator} from '../../../engine/resource-allocation.js';
import {placeNpcGraphicsStreams,npcGraphicsStreamingCode} from '../../../engine/npc-graphics-streaming.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {snapshot,restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {nativePixels} from './prepare-draft.mjs';
const dir='assets/imagegen/future-ushers',out='.local/qa/future-ushers-native-proof',hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(p));
const source=await json(dir+'/native-resource-audit.json'),draft=await json(dir+'/draft-audit.json'),map=await json(dir+'/native-frame-map.draft.json');
const baseline=new Uint8Array(await readFile(out+'/baseline.sfc')),base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));
const expectedBaseline='e13648757bbeee05dff8ff1cd0048b9cf60c13a24851c5625d7f3623adf06500';assert.equal(hash(baseline),expectedBaseline);assert.equal(hash(base),source.sourceRomSha256);
const manifest=await json(out+'/baseline-manifest.json'),oldRecords=await json(out+'/baseline-records.json'),actor=manifest.futureMachines.actors.find(a=>a.gfx===97),native=manifest.resources.npcGraphicsStreaming;
const graphics=new Uint8Array(await readFile(dir+'/graphics.4bpp')),assembly=new Uint8Array(await readFile(dir+'/assembly.bin')),compressed=new Uint8Array(await readFile(dir+'/graphics.ct-lz')),frames=nativePixels(await json(dir+'/preview-raster.json'));
for(const [bytes,expected]of [[graphics,draft.graphicsSha256],[assembly,draft.assemblySha256],[compressed,draft.compressedSha256]])assert.equal(hash(bytes),expected);
assert.equal(u24(baseline,native.table+97*3),0,'Inactive baseline has no Usher stream');
for(const helper of native.helpers)assert.deepEqual(baseline.slice(helper.address,helper.address+helper.bytes),npcGraphicsStreamingCode(native.table|0xc00000,helper.kind));
assert.deepEqual(spriteHeaders(baseline).filter(h=>baseline[h.offset]===97).map(h=>[h.kind,h.id]),[['npc',170],['enemy',137],['enemy',138],['enemy',139]]);
assert.equal(actor.assemblyBytes,1000);assert.equal(fileOffset(u24(baseline,0x242300+56*3)),actor.assemblyOffset);
const spans=['reclaimedEvents','reclaimedSprites','reclaimedPackets','reclaimedDialogue','reclaimedMusic'].flatMap(k=>manifest.resources[k].map(p=>({next:p.offset,end:p.offset+p.length}))).concat(manifest.characters.flatMap(c=>[{next:c.sourceGraphicsOffset,end:c.sourceGraphicsOffset+c.sourceCapacity},{next:c.assembly.offset+c.assembly.bytes,end:c.assembly.offset+c.assembly.sourceBytes}]));
let free=coalesceReclaimedPools(spans);
for(const a of [...oldRecords,...manifest.allocations.map(a=>({...a,length:a.label.startsWith('event ')?(a.length+7)&~7:(a.length+1)&~1}))]){
  const end=a.offset+a.length;free=free.flatMap(p=>end<=p.next||a.offset>=p.end?[p]:[{next:p.next,end:Math.max(p.next,a.offset)},{next:Math.min(end,p.end),end:p.end}].filter(p=>p.next<p.end));
}
free=free.map(p=>({next:(p.next+1)&~1,end:p.end&~1})).filter(p=>p.next<p.end);
const allocator=new ResourceAllocator(free),packet=allocator.allocate(compressed.length,'Private Usher compressed graphics');
const ptr=n=>{const b=new Uint8Array(3);put24(b,0,n);return b;};
const records=[{offset:packet,bytes:compressed,label:'Private Usher compressed graphics'},
{offset:0x242000+97*3,bytes:ptr(packet|0xc00000),label:'Private Usher graphics pointer'},
{offset:actor.assemblyOffset,bytes:assembly,label:'Private Usher assembly56'}];
const placement=placeNpcGraphicsStreams(baseline,records,[{offset:packet,length:compressed.length,label:records[0].label}],[97],native.pools);
records.push(...placement.records,{offset:native.table+97*3,bytes:ptr(placement.streams[0].address),label:'Private Usher selected raw stream'});
for(const r of[records[0],...placement.records])assert.ok(!oldRecords.some(a=>r.offset<a.offset+a.length&&r.offset+r.bytes.length>a.offset),'Private allocation overlap');
assert.equal(placement.streams[0].bytes,graphics.length);
const rom=applyRecords(baseline,records);for(const p of[0xffdc,0x40ffdc]){put16(rom,p,65535);put16(rom,p+2,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const p of[0xffdc,0x40ffdc]){put16(rom,p,sum^65535);put16(rom,p+2,sum);}
let changed=0;for(let i=0;i<rom.length;i++)if(rom[i]!==baseline[i]){changed++;assert.ok(records.some(r=>i>=r.offset&&i<r.offset+r.bytes.length)||[0xffdc,0x40ffdc].some(p=>i>=p&&i<p+4));}
for(const a of source.actors){const h=0x24f600+a.enemy*10;assert.deepEqual(rom.slice(h,h+10),base.slice(h,h+10));assert.equal(hash(rom.slice(a.ai.offset,a.ai.offset+a.ai.bytes)),a.ai.sha256);assert.equal(hash(rom.slice(a.paletteOffset,a.paletteOffset+24)),a.preservedPaletteSha256);for(const[table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(rom.slice(p,p+stride),base.slice(p,p+stride));}}
for(const a of source.animation){assert.equal(hash(rom.slice(a.offset,a.offset+a.bytes)),a.sha256);assert.deepEqual(rom.slice(a.pointer,a.pointer+4),base.slice(a.pointer,a.pointer+4));}
const npcHeader=0x24f000+(170+7)*5;assert.deepEqual(rom.slice(npcHeader,npcHeader+5),Uint8Array.from([97,56,52,41,0]));assert.deepEqual(rom.slice(npcHeader,npcHeader+5),base.slice(npcHeader,npcHeader+5));
await mkdir(out,{recursive:true});await writeFile(out+'/candidate.sfc',rom);
const candidate={baselineSha256:hash(baseline),candidateSha256:hash(rom),candidatePath:out+'/candidate.sfc',changedBytes:changed,defaultDecodedGuardPassed:false,originalDecodedBudget:source.originalGraphics.decodedBytes,requiredStreaming:true,nativeStreamSelection:placement.streams[0],nativeHelpersUnchanged:true,baselineManifestSha256:hash(await readFile(out+'/baseline-manifest.json')),baselineRecordsSha256:hash(await readFile(out+'/baseline-records.json')),records:records.map(r=>({offset:r.offset,bytes:r.bytes.length,label:r.label,sha256:hash(r.bytes)})),geometry:dir+'/native-frame-map.draft.json'};await writeFile(out+'/candidate.json',JSON.stringify(candidate,null,2)+'\n');
let s=await createCore(rom);try{restore(s,await json(out+'/bedroom.json'));}catch{s=await createCore(rom);await newGame(s);await writeFile(out+'/bedroom.json',JSON.stringify(snapshot(s)));}console.log('Private streamed candidate bedroom ready');
const h=installHooks(s,await json('content/hooks.json')),dev=createDevTools(s,h),reports=[];
let forceNpc=false,npcInitCount=0;const offNpc=h.on('event.init',({location,opcode,scriptPC})=>{if(forceNpc&&location===1&&opcode===0x82){const p=0x12001+scriptPC;if(s.ram[p]===0x83&&s.ram[p+1]===138){s.ram.set([0x82,170,0x8b,12,8,0xa6,1,0],p);npcInitCount++;}}});
function expectedTiles(frame){const bytes=[];for(let i=0;i<16;i++){const t=u16(assembly,frame*40+i*2);for(let b of graphics.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}bytes.push(b);}}return Uint8Array.from(bytes);}
function oam(){const result=[];for(let entry=0;entry<128;entry++){
  const i=entry*2,xy=s.ppu.oam[i],ta=s.ppu.oam[i+1],ex=ta>>8;let x=(xy&255)|((s.ppu.highOam[i>>4]>>(i&15)&1)<<8);if(x>255)x-=512;
  const y=xy>>8,size=s.ppu.spriteSizes[s.ppu.objSize+((s.ppu.highOam[i>>4]>>(i&15)&2)?8:0)]*8,tile=ta&255,pixels=new Uint8Array(size*size),addr=s.ppu.sprAdr1+(ex&1?s.ppu.sprAdr2:0);
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){const xx=ex&64?size-1-px:px,yy=ex&128?size-1-py:py,t=(tile+(yy>>3)*16+(xx>>3))&255,w=s.ppu.vram[(addr+t*16+(yy&7))&32767],w2=s.ppu.vram[(addr+t*16+(yy&7)+8)&32767],shift=7-(xx&7);pixels[py*size+px]=(w>>shift&1)|((w>>(shift+8)&1)<<1)|((w2>>shift&1)<<2)|((w2>>(shift+8)&1)<<3);}
  result.push({entry,x,y,size,palette:(ex&14)>>1,priority:(ex&48)>>4,pixels});
}return result;}
try{for(const a of [...source.actors,{...source.actors.find(a=>a.enemy===138),key:'brass-usher-npc170',enemy:undefined,npc:170,animation:41}]){
  forceNpc=a.npc===170;dev.previewActor(forceNpc?'brass-usher':a.key);runFrames(s,300);assert.equal(dev.diagnostics().preview.object,15);assert.equal(dev.diagnostics().fatal,null);
  const pointer=(s.ram[0x121e]<<16)|u16(s.ram,0x129e),heap=u16(s.ram,0x171)-0x8000;assert.equal(pointer,placement.streams[0].address);assert.ok(heap>=0&&heap<=32768);if(forceNpc)assert.equal(npcInitCount,1);assert.equal(u16(s.ram,0x141e),u16(rom,0x242a00+a.palette*2));
  const report={key:a.key,enemy:a.enemy,npc:a.npc,animation:a.animation,palette:a.palette,sourcePointer:pointer,isolatedHeapBytes:heap,actorOrigin:[200,143],frames:[]};
  for(let frame=0;frame<25;frame++){
    dev.previewFrame(frame);let elapsed=0;while(s.ram[0xf1f]!==frame&&elapsed++<40)runFrames(s,1);assert.equal(s.ram[0xf1f],frame);runFrames(s,8);
    const p=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer),uploaded=Uint8Array.from([...v.slice(p,p+256),...v.slice(p+512,p+768)]);assert.deepEqual(uploaded,expectedTiles(frame));
    const sprites=oam(),png=new PNG({width:512,height:480});s.setPixels(png.data);const cells=[];let opaquePixels=0;
    for(const c of nativeSpriteCells({graphics,assembly,cells:4,frames:25},frame)){
      const cx=200+c.x,cy=143+c.y,entry=sprites.find(o=>o.x===cx&&o.y===cy&&o.size===16&&Buffer.from(o.pixels).equals(Buffer.from(c.pixels)));assert.ok(entry,a.key+':'+frame+' exact cell '+c.cell);
      const colors=Array.from({length:12},(_,i)=>u16(rom,a.paletteOffset+i*2));assert.deepEqual(Array.from({length:12},(_,i)=>s.ppu.cgram[128+entry.palette*16+i+1]),colors);
      cells.push({cell:c.cell,oamEntry:entry.entry,x:cx,y:cy,palette:entry.palette,priority:entry.priority});
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=c.pixels[y*16+x];if(!k)continue;const at=(((cy+y+8)*2)*512+(cx+x)*2)*4,n=colors[k-1],mult=s.ppu.brightnessMults[s.ppu.brightness],rgb=[n&31,n>>5&31,n>>10&31].map(c=>(c*mult)&255);assert.deepEqual([...png.data.slice(at,at+3)],rgb,a.key+':'+frame+' native pixel '+(cx+x)+','+(cy+y));opaquePixels++;}
    }
    assert.equal(opaquePixels,frames[frame].reduce((n,k)=>n+(k!==0),0));assert.equal(dev.diagnostics().fatal,null);
    const file=a.key+'-'+String(frame).padStart(2,'0')+'.png';await writeFile(out+'/'+file,PNG.sync.write(png));report.frames.push({frame,role:map.frames[frame].role,exactCells:cells,opaquePixels,uploadSha256:hash(uploaded),screenshot:file});
  }
  reports.push(report);dev.undo();console.log(a.key+': all25 native cells, pixels and palette passed');
}}finally{offNpc();dev.dispose();h.dispose();}
assert.deepEqual(s.cart.data,rom);assert.equal(hash(await readFile(out+'/baseline.sfc')),expectedBaseline);
await writeFile(out+'/display-report.json',JSON.stringify({status:'passed',core:'repository SNES JS native65816/PPU',reports},null,2)+'\n');
for(const a of reports){const sheet=new PNG({width:8*112,height:4*112});for(let i=0;i<sheet.data.length;i+=4)sheet.data.set([25,25,30,255],i);for(const f of a.frames){const png=PNG.sync.read(await readFile(out+'/'+f.screenshot));for(let y=0;y<108;y++)for(let x=0;x<108;x++){const src=(((76+y+8)*2)*512+(146+x)*2)*4,dst=((Math.floor(f.frame/8)*112+y)*sheet.width+f.frame%8*112+x)*4;sheet.data.set(png.data.subarray(src,src+4),dst);}}await writeFile(out+'/'+a.key+'-native-1x.png',PNG.sync.write(sheet));}
const evidenceFiles=[];for(const file of['candidate.json','display-report.json',...reports.map(a=>a.key+'-native-1x.png'),...reports.flatMap(a=>a.frames.map(f=>f.screenshot))]){const bytes=await readFile(out+'/'+file);evidenceFiles.push({file,bytes:bytes.length,sha256:hash(bytes)});}
const proof={status:'All100 bounded native owner/pose combinations passed; source remains inactive',...candidate,nativeFrameUploads:100,exactDisplayedCells:400,exactDisplayedOpaquePixels:reports.reduce((n,a)=>n+a.frames.reduce((m,f)=>m+f.opaquePixels,0),0),allOpaquePixelsVisible:true,originalFrameAndDurationListsUnchanged:true,allThreeCurrentPalettePacketsUnchanged:true,npc170Animation41Preserved:true,brassEnemy138Animation159Preserved:true,npc170NativeInitCount:npcInitCount,originalHeadersAiAndStatsUnchanged:true,extraWramBytes:0,extraVramBytes:0,isolatedHeapBytes:reports.map(a=>({key:a.key,bytes:a.isolatedHeapBytes})),evidence:out,evidenceFiles,runner:{file:dir+'/verify-native.mjs',sha256:hash(await readFile(dir+'/verify-native.mjs'))},limitations:['Bounded native field preview only; no full encounter choreography or battle claim.','The review motion page uses original gait frame order/durations; native encounter transitions remain controlled by original AI/events.','The original 6,144-byte decoded guard is exceeded by 1,888 bytes; the existing strict native-streamed family contract is required for production.', 'Independent-core validation and original route/encounter residency remain integration checks.'],activation:false};
await writeFile(dir+'/native-display-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:proof.status,candidate:proof.candidateSha256,uploads:100,cells:400,pixels:proof.exactDisplayedOpaquePixels}));
