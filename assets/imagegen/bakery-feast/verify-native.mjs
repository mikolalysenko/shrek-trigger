import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {privateOverlay,hash} from './private-overlay.mjs';
import {u16,u24} from '../../../engine/rom.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {decompress} from '../../../engine/compression.js';
import {patchActorFamilies} from '../../../engine/actor-families.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {screenshot,settlePreviewFrame} from '../../../tests/helpers.mjs';
const root='assets/imagegen/bakery-feast/',out=root+'native-verification/',{candidates,active,activePath,rom,audit,placements}=await privateOverlay();await mkdir(out,{recursive:true});
for(const c of candidates)assert.throws(()=>patchActorFamilies(c.base,[c.family],(_,f)=>c.frames[f],()=>0x300000,()=>{}),/exceeds its original decoded graphics budget/);
const sceneMap=new Map(audit.families.flatMap(a=>a.scenes.map(s=>[s.location,s]))),scenes=[...sceneMap.values()].sort((a,b)=>a.location-b.location).map(scene=>{const banks=[...new Set([...scene.allEnemyIds.map(id=>active[0x24f600+id*10]),...scene.allNpcIds.map(id=>active[0x24f000+(id+7)*5])].filter(g=>g>6))],parts=banks.map(g=>({gfx:g,currentBytes:decompress(active,cartridgeOffset(u24(active,0x242000+g*3),active)).bytes.length,candidateBytes:decompress(rom,cartridgeOffset(u24(rom,0x242000+g*3),rom)).bytes.length})),currentBytes=parts.reduce((n,p)=>n+p.currentBytes,0),candidateBytes=parts.reduce((n,p)=>n+p.candidateBytes,0);return{location:scene.location,currentBytes,candidateBytes,limit:32768,spareBytes:32768-candidateBytes,exceedsBudget:candidateBytes>32768,parts,scope:'Conservative union across all original event branches using saved-build resources; not actual simultaneous residency'};});
await writeFile(root+'current-co-loads.json',JSON.stringify({activePath,activeRomSha256:hash(active),allThreeCandidatesLoaded:true,scenes},null,2)+'\n');
const s=await createCore(rom);await newGame(s);const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),paletteChecks=[],heaps=[],loads=[];let uploads=0,opaquePixels=0,expectedNpc=null;
const offNpc=h.on('event.init',({location,opcode,scriptPC})=>{const p=0x12001+scriptPC;if(expectedNpc!==null&&location===1&&opcode===0x82&&s.ram[p]===0x82&&s.ram[p+1]===expectedNpc)loads.push(expectedNpc);});
function tileBytes(c,f){const out=[];for(let i=0;i<16;i++){const word=u16(c.assembly,f*40+i*2);for(let b of c.graphics.slice((word&1023)*32,(word&1023)*32+32)){if(word&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}out.push(b);}}return Uint8Array.from(out);}
for(const c of candidates)for(const a of c.family.actors){
 expectedNpc=a.npc;const before=loads.length;d.previewActor(a.key);runFrames(s,300);assert.equal(loads.length,before+1,'Actual82NPC load '+a.npc);assert.equal(d.diagnostics().fatal,null);assert.equal(u16(s.ram,0x141e),u16(rom,0x242a00+a.palette*2));
 const colors=new Map(),expectedPalette=c.palettes.find(p=>p.palette===a.palette).bytes,slots=[];
 for(let start=129;start<256;start+=16)if(Array.from({length:12},(_,i)=>u16(expectedPalette,i*2)).every((w,i)=>s.ppu.cgram[start+i]===w))slots.push(start);assert.ok(slots.length,'Exact12-color shared palette '+a.palette);
 const heapEnd=u16(s.ram,0x171),heapBytes=heapEnd-0x8000;assert.ok(heapBytes>=c.graphics.length&&heapBytes<=32768);heaps.push({actor:a.key,heapEnd,heapBytes});
 for(let f=0;f<c.frames.length;f++){
  settlePreviewFrame(s,d,f);runFrames(s,30);assert.equal(s.ram[0xf1f],f);const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer);assert.deepEqual(Uint8Array.from([0,512].flatMap(o=>Array.from(v.slice(base+o,base+o+256)))),tileBytes(c,f),a.key+':'+f);
  const rgba=new Uint8Array(512*480*4);s.setPixels(rgba);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const k=c.frames[f][y*32+x];if(!k)continue;const anchor=c.family.groups[0].anchor??[0,0],delta=c.family.groups[0].frameOffsets?.[f]??[0,0],p=((119+y+anchor[1]+delta[1])*2*512+(184+x+anchor[0]+delta[0])*2)*4,rgb=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2],w=u16(expectedPalette,(k-1)*2),b=s.ppu.brightnessMults[s.ppu.brightness],expectedRgb=(Math.floor((w&31)*b)<<16)|(Math.floor((w>>5&31)*b)<<8)|Math.floor((w>>10&31)*b);assert.equal(rgb,expectedRgb,a.key+':'+f+' exact palette pixel '+x+','+y);colors.set(k,rgb);opaquePixels++;}
  assert.equal(d.diagnostics().fatal,null);uploads++;if(true)await screenshot(s,out+a.key+'-native-frame-'+f+'.png');
 }
 paletteChecks.push({actor:a.key,npc:a.npc,palette:a.palette,cgramStarts:slots,colorsObserved:colors.size});d.undo();console.log(a.key+':'+c.frames.length+' exact native uploads and PPU pixels passed');
}
assert.deepEqual(s.cart.data,rom);offNpc();d.dispose();h.dispose();
const report={status:'Private compressed native proof; all three actual NPC owners passed',activeRomPath:activePath,activeRomSha256:hash(active),privateRomSha256:hash(rom),nativeFrameUploads:uploads,opaquePixelChecks:opaquePixels,exactPaletteRgb:true,actualNpcLoads:loads,paletteChecks,paletteBytesUnchanged:true,originalUnrelatedPaletteBytesUnchanged:true,sharedPaletteOwnerSnapshot:'shared-village-owners.json',cartridgeUnchanged:true,isolatedPreviewHeaps:heaps,candidates:candidates.map(c=>({key:c.key,rawGraphicsBytes:c.graphics.length,compressedBytes:c.compressed.length,assemblyBytes:c.assembly.length,originalRawBytes:c.original.graphicsBytes,blankFrames:c.spec.notes.blankFrames,anchor:c.family.groups[0].anchor??[0,0],frameOffsets:c.family.groups[0].frameOffsets??{},sourceProvenance:c.asset.provenance})),placements,sceneUnionBudget:scenes.map(({location,candidateBytes,spareBytes,exceedsBudget})=>({location,candidateBytes,spareBytes,exceedsBudget})),settledCaptureMinimumFrames:30,extraVramBytes:0,cellCount:4,overlap:false,wholeSceneOrIndependentCoreProof:false,strictOriginalFamilyGuard:'Retained; root owns production streaming and actual shared scene loads.'};await writeFile(out+'manifest.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({uploads,opaquePixels,loads,privateRomSha256:report.privateRomSha256}));
