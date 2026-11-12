// Private, in-memory overlay on one saved cartridge. Never writes a ROM,
// checkpoint, active registry or native engine change. Full scene budget
// failures stay explicit; this proof loads only a single Briar family bank.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compileBriarDraft} from './compile-draft.mjs';
import {u16,u24,put16,put24,applyRecords} from '../../../engine/rom.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {decompress} from '../../../engine/compression.js';
import {patchActorFamilies} from '../../../engine/actor-families.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {screenshot,settlePreviewFrame} from '../../../tests/helpers.mjs';
const root='assets/imagegen/briar-knight/',out=root+'native-verification/',c=await compileBriarDraft(),hash=b=>createHash('sha256').update(b).digest('hex'),activePath='.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc',active=new Uint8Array(await readFile(activePath));assert.equal(hash(active),'2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066');await mkdir(out,{recursive:true});
assert.throws(()=>patchActorFamilies(c.base,[c.family],(_,f)=>c.frames[f],()=>0x300000,()=>{}),/exceeds its original decoded graphics budget/);assert.ok(c.graphics.length<=32768);assert.equal(c.assembly.length,86*8*10);
const packetOffset=0x7d0000,assemblyOffset=packetOffset+Math.ceil(c.compressed.length/16)*16,end=assemblyOffset+c.assembly.length;assert.ok(end<=0x7d8000);assert.equal(hash(active.slice(packetOffset,end)),hash(active.slice(packetOffset-0x400000,end-0x400000)),'Private extended placement must still contain the saved-build unused lower-half mirror');
const gp=new Uint8Array(3),ap=new Uint8Array(3);put24(gp,0,packetOffset);put24(ap,0,assemblyOffset);
const records=[{offset:packetOffset,bytes:c.compressed,label:'Private Briar compressed packet'},{offset:assemblyOffset,bytes:c.assembly,label:'Private Briar assembly'},{offset:0x242000+166*3,bytes:gp,label:'Private Briar graphics pointer'},{offset:0x242300+158*3,bytes:ap,label:'Private Briar assembly pointer'},{offset:c.original.paletteOffset,bytes:c.palette,label:'Private Briar palette'}],rom=applyRecords(active,records);
for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}
for(const a of c.family.actors)assert.deepEqual(rom.slice(0x24f600+a.enemy*10,0x24f600+a.enemy*10+10),active.slice(0x24f600+a.enemy*10,0x24f600+a.enemy*10+10));
const audit=JSON.parse(await readFile(root+'native-audit.json'));assert.deepEqual(rom.slice(audit.source.animationOffset,audit.source.animationOffset+audit.source.animationBytes),active.slice(audit.source.animationOffset,audit.source.animationOffset+audit.source.animationBytes));for(const a of audit.headers)assert.deepEqual(rom.slice(a.ai.offset,a.ai.offset+a.ai.bytes),active.slice(a.ai.offset,a.ai.offset+a.ai.bytes));
const scenes=audit.scenes.map(scene=>{const banks=[...new Set([...scene.allEnemyIds.map(id=>active[0x24f600+id*10]),...scene.allNpcIds.map(id=>active[0x24f000+(id+7)*5])].filter(g=>g>6))],parts=banks.map(g=>({gfx:g,currentBytes:decompress(active,cartridgeOffset(u24(active,0x242000+g*3),active)).bytes.length,candidateBytes:decompress(rom,cartridgeOffset(u24(rom,0x242000+g*3),rom)).bytes.length}));const current=parts.reduce((n,p)=>n+p.currentBytes,0),candidate=parts.reduce((n,p)=>n+p.candidateBytes,0);return{location:scene.location,currentBytes:current,candidateBytes:candidate,limit:32768,spareBytes:32768-candidate,exceedsBudget:candidate>32768,parts,scope:'Conservative union of all original event load branches using actual saved-build headers/resources; not all actors necessarily resident simultaneously'};});
await writeFile(root+'draft/current-co-loads.json',JSON.stringify({activePath,activeRomSha256:hash(active),strictOriginalFamilyGuard:'Retained; rejects growth from 12384 to 25856 raw bytes. Large family streaming or proved scene residency is required before activation.',scenes},null,2)+'\n');
const s=await createCore(rom);await newGame(s);const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),colors=new Map(),heaps=[];let uploads=0,opaquePixels=0;
function tileBytes(f){const out=[];for(let i=0;i<32;i++){const word=u16(c.assembly,f*80+i*2);for(let b of c.graphics.slice((word&1023)*32,(word&1023)*32+32)){if(word&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}out.push(b);}}return Uint8Array.from(out);}
for(const a of c.family.actors){
 d.previewActor(a.key);runFrames(s,300);assert.equal(d.diagnostics().fatal,null);assert.equal(u16(s.ram,0x141e),u16(rom,0x242a00+a.palette*2));const heapEnd=u16(s.ram,0x171),heap=heapEnd-0x8000;assert.ok(heap>=c.graphics.length&&heap<=32768,'Isolated preview heap '+heap);heaps.push({actor:a.key,heapEnd,heapBytes:heap});
 for(let f=0;f<86;f++){
  settlePreviewFrame(s,d,f);runFrames(s,30);assert.equal(s.ram[0xf1f],f);const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer);assert.deepEqual(Uint8Array.from([0,256,512,768].flatMap(o=>Array.from(v.slice(base+o,base+o+256)))),tileBytes(f),a.key+':'+f);
  const rgba=new Uint8Array(512*480*4);s.setPixels(rgba);const ox=168+(c.family.groups[0].frameOffsets[f]?.[0]??0),oy=71+(c.family.groups[0].frameOffsets[f]?.[1]??0);
  for(let y=0;y<80;y++)for(let x=0;x<64;x++){const k=c.frames[f][y*64+x];if(!k)continue;const p=((oy+y)*2*512+(ox+x)*2)*4,rgb=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];if(colors.has(k))assert.equal(rgb,colors.get(k),a.key+':'+f+' pixel '+x+','+y);else colors.set(k,rgb);opaquePixels++;}
  assert.equal(d.diagnostics().fatal,null);uploads++;if(a.key==='briar-knight'&&[0,3,6,7,9,13,18,20,22,27,29,33,39,45,52,54,59,63,64,69,76,84,85].includes(f))await screenshot(s,out+'native-frame-'+f+'.png');
 }
 d.undo();console.log(a.key+':86 exact native uploads and pixels passed');
}
d.dispose();h.dispose();
const report={status:'Private saved-build compressed solo overlay passed; full scenes remain unproven and active family-size guard is unchanged',activeRomPath:activePath,activeRomSha256:hash(active),privateRomSha256:hash(rom),nativeFrameUploads:uploads,variants:4,framesPerVariant:86,blankFrames:[39,40,41],allOpaqueNativePixelsVerified:true,opaquePixelChecks:opaquePixels,colorsObserved:colors.size,sourceType:'image-generation',sourceProvenance:c.asset.provenance,rawGraphicsBytes:c.graphics.length,compressedBytes:c.compressed.length,assemblyBytes:c.assembly.length,originalRawBytes:c.original.graphicsBytes,strictFamilyGrowthGuard:'Retained. No ordinary integration until large-bank streaming or actual complete-scene residency is proved.',placement:{packetOffset,assemblyOffset,ownedUnusedExtendedMirror:true},sceneUnionBudget:scenes.map(({location,candidateBytes,spareBytes,exceedsBudget})=>({location,candidateBytes,spareBytes,exceedsBudget})),isolatedPreviewHeaps:heaps,nativeFrameOffsets:c.family.groups[0].frameOffsets,settledCaptureMinimumFrames:30,extraVramBytes:0,wholeSceneOrBattleProof:false};
await writeFile(out+'manifest.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
