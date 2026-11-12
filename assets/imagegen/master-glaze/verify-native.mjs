// Isolated, in-memory proof on a pinned saved cartridge. No ROM, checkpoint,
// production registry or engine file is written by this verifier.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileGlazeDraft} from './compile-draft.mjs';
import {u16,put16,put24,applyRecords} from '../../../engine/rom.js';
import {snesColor} from '../../../engine/sprites.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {screenshot,settlePreviewFrame} from '../../../tests/helpers.mjs';

const dir=import.meta.dirname,root=path.resolve(dir,'../../..'),out=path.join(dir,'native-verification'),sha=b=>createHash('sha256').update(b).digest('hex'),c=compileGlazeDraft();
const activePath='.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc',active=new Uint8Array(fs.readFileSync(path.join(root,activePath)));
assert.equal(sha(active),'2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066');
const packetOffset=0x7d0000,assemblyOffset=packetOffset+Math.ceil(c.compressed.length/16)*16,end=assemblyOffset+c.assembly.length;assert.ok(end<=0x7d8000);assert.deepEqual(active.slice(packetOffset,end),active.slice(packetOffset-0x400000,end-0x400000),'Private placement contains only the saved unused expanded mirror.');
const gp=new Uint8Array(3),ap=new Uint8Array(3),palette=new Uint8Array(24);put24(gp,0,packetOffset);put24(ap,0,assemblyOffset);c.asset.palette.forEach((s,i)=>put16(palette,i*2,snesColor(s)));
const paletteOffset=0x240000+u16(active,0x242a00+190*2),records=[{offset:packetOffset,bytes:c.compressed},{offset:assemblyOffset,bytes:c.assembly},{offset:0x242000+141*3,bytes:gp},{offset:0x242300+135*3,bytes:ap},{offset:paletteOffset,bytes:palette}],rom=applyRecords(active,records);
assert.deepEqual(active.slice(paletteOffset,paletteOffset+24),palette,'Existing project palette stays unchanged.');
for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}
const native=JSON.parse(fs.readFileSync(path.join(dir,'native-audit.json')));assert.deepEqual(rom.slice(0x24f600+154*10,0x24f600+154*10+10),active.slice(0x24f600+154*10,0x24f600+154*10+10));
assert.deepEqual(rom.slice(native.source.animationOffset,native.source.animationOffset+native.source.animationBytes),active.slice(native.source.animationOffset,native.source.animationOffset+native.source.animationBytes));
assert.deepEqual(rom.slice(native.source.ai.offset,native.source.ai.offset+native.source.ai.bytes),active.slice(native.source.ai.offset,native.source.ai.offset+native.source.ai.bytes));
function tiles(f){const out=[];for(let i=0;i<16;i++){const word=u16(c.assembly,f*40+i*2);for(let byte of c.graphics.slice((word&1023)*32,(word&1023)*32+32)){if(word&0x4000){byte=(byte>>1&85)|(byte&85)<<1;byte=(byte>>2&51)|(byte&51)<<2;byte=(byte>>4)|(byte&15)<<4;}out.push(byte);}}return Uint8Array.from(out);}
fs.mkdirSync(out,{recursive:true});const s=await createCore(rom);await newGame(s);const hooks=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,hooks);dev.previewActor('master-glaze');runFrames(s,300);assert.equal(dev.diagnostics().fatal,null);
const paletteSlots=[];for(let start=129;start<256;start+=16)if(Array.from({length:12},(_,i)=>u16(palette,i*2)).every((v,i)=>s.ppu.cgram[start+i]===v))paletteSlots.push(start);assert.ok(paletteSlots.length);const heapBytes=u16(s.ram,0x171)-0x8000;assert.ok(heapBytes>=c.graphics.length&&heapBytes<=32768);
let opaquePixels=0;const colors=new Map(),checks=[];
for(let f=0;f<20;f++){
 settlePreviewFrame(s,dev,f);runFrames(s,30);assert.equal(s.ram[0xf1f],f);const base=u16(s.ram,0xd1e)*32,vram=new Uint8Array(s.ppu.vram.buffer),uploaded=Uint8Array.from([0,512].flatMap(offset=>Array.from(vram.slice(base+offset,base+offset+256))));assert.equal(sha(uploaded),sha(tiles(f)),'Native VRAM '+f);
 const rgba=new Uint8Array(512*480*4);s.setPixels(rgba);const[dx,dy]=c.family.groups[0].frameOffsets[f]??[0,0];
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const value=c.frames[f][y*32+x];if(!value)continue;const p=((119+dy+y)*2*512+(184+dx+x)*2)*4,rgb=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];if(colors.has(value))assert.equal(rgb,colors.get(value),'Frame '+f+' pixel '+x+','+y);else colors.set(value,rgb);opaquePixels++;}
 assert.equal(dev.diagnostics().fatal,null);checks.push({frame:f,opaquePixels:c.frames[f].filter(Boolean).length,offset:[dx,dy],exactVram:true,exactPpuPixels:true});
 if([1,4,7,8,12,13,15,18,19].includes(f))await screenshot(s,path.join(out,'master-glaze-native-frame-'+f+'.png'));
}
dev.undo();dev.dispose();hooks.dispose();
const report={status:'All twenty isolated native frames pass exact VRAM, authored XY and opaque PPU pixel checks on an in-memory overlay.',activeRomPath:activePath,activeRomSha256:sha(active),privateRomSha256:sha(rom),nativeUploads:20,opaquePixelChecks:opaquePixels,colorsObserved:colors.size,palette:190,paletteCgramStarts:paletteSlots,paletteUnchanged:true,heapBytes,graphicsBytes:c.graphics.length,compressedBytes:c.compressed.length,assemblyBytes:c.assembly.length,frameChecks:checks,privatePlacement:{packetOffset,assemblyOffset,unusedExpandedMirrorProved:true},originalHeaderAnimationAiUnchanged:true,settleFramesAfterUpload:30,extraVramBytes:0,extraWramBytes:0,fullSceneOrBattleProof:false,sourceProvenance:c.asset.provenance,scope:'Isolated compressed-bank upload proof only. Production activation/storage selection and complete Bakery scenes are handled by root.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({nativeUploads:20,opaquePixelChecks:opaquePixels,colors:colors.size,heapBytes,privateRomSha256:report.privateRomSha256}));
