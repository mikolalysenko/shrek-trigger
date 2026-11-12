// In-memory source-art overlay only; never writes a cartridge or registry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {privateFurnaceOverlay} from './private-overlay.mjs';
import {u16} from '../../../engine/rom.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {screenshot,settlePreviewFrame} from '../../../tests/helpers.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),out=path.join(d,'native-verification'),sha=b=>createHash('sha256').update(b).digest('hex'),overlay=await privateFurnaceOverlay(),{head:c,rom,palettes}=overlay;fs.mkdirSync(out,{recursive:true});
function tiles(f){const out=[];for(let i=0;i<48;i++){const word=u16(c.assembly,f*120+i*2);for(let byte of c.graphics.slice((word&1023)*32,(word&1023)*32+32)){if(word&0x4000){byte=(byte>>1&85)|(byte&85)<<1;byte=(byte>>2&51)|(byte&51)<<2;byte=(byte>>4)|(byte&15)<<4;}out.push(byte);}}return Uint8Array.from(out);}
const s=await createCore(rom);await newGame(s);const hooks=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,hooks),checks=[];let opaquePixels=0;const paletteChecks=[];
for(const [owner,actor]of c.family.actors.entries()){
 dev.previewActor(actor.key);runFrames(s,300);assert.equal(dev.diagnostics().fatal,null);const pal=palettes[owner].bytes,starts=[];for(let start=129;start<256;start+=16)if(Array.from({length:12},(_,i)=>u16(pal,i*2)).every((v,i)=>s.ppu.cgram[start+i]===v))starts.push(start);assert.ok(starts.length);paletteChecks.push({enemy:actor.enemy,palette:actor.palette,cgramStarts:starts});
 const heapBytes=u16(s.ram,0x171)-0x8000;assert.ok(heapBytes>=c.graphics.length&&heapBytes<=32768);const colors=new Map();
 for(let f=0;f<8;f++){
  settlePreviewFrame(s,dev,f);runFrames(s,30);assert.equal(s.ram[0xf1f],f);const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer),uploaded=Uint8Array.from([0,512,256,768,1024,1536].flatMap(o=>Array.from(v.slice(base+o,base+o+256))));assert.equal(sha(uploaded),sha(tiles(f)),actor.key+' native upload'+f);
  const rgba=new Uint8Array(512*480*4);s.setPixels(rgba);for(let y=0;y<96;y++)for(let x=0;x<64;x++){const value=c.frames[f][y*64+x];if(!value)continue;const p=((87+y)*2*512+(168+x)*2)*4,rgb=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];if(colors.has(value))assert.equal(rgb,colors.get(value),actor.key+' frame'+f+' pixel'+x+','+y);else colors.set(value,rgb);opaquePixels++;}
  assert.equal(dev.diagnostics().fatal,null);checks.push({enemy:actor.enemy,frame:f,opaquePixels:c.frames[f].filter(Boolean).length,heapBytes,exactVram:true,exactSourcePpuPixels:true,exactNativeAnchor:true});if([0,1,2,3,6,7].includes(f))await screenshot(s,path.join(out,actor.key+'-native-frame-'+f+'.png'));
 }
 assert.equal(new Set(colors.values()).size,colors.size);assert.equal(colors.size,12);dev.undo();runFrames(s,120);
}
dev.dispose();hooks.dispose();const report={...overlay.report,status:'All sixteen native head uploads and source-pixel positions pass in the unchanged special-size6 path.',nativeUploads:16,opaquePixelChecks:opaquePixels,paletteChecks,frameChecks:checks,placements:overlay.placements,rawGraphicsBytes:c.graphics.length,assemblyBytes:c.assembly.length,extraVramBytes:0,extraWramBytes:0,fullSceneOrBattleProof:false,bodyProof:'Separate native scene verifier required; head/body resources included in this private overlay.',settleFrames:30};fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({uploads:16,opaquePixels,palettes:2,privateRomSha256:report.privateRomSha256}));
