import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileDorisDraft,draftDorisMaps} from './compile-draft.mjs';
import {dorisTiers,dorisColors} from '../../../content/doris.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {snapshot,restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {largePreviewFrameWrites} from '../../../engine/preview-frames.js';
import {u16,u24,fileOffset,put16} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {snesColor} from '../../../engine/sprites.js';
import {screenshot} from '../../../tests/helpers.mjs';
const root=path.resolve(import.meta.dirname,'../../..'),out=path.join(import.meta.dirname,'native-verification'),romFile=path.join(root,'.local/qa/doris-generated/shrek-trigger.sfc'),rom=new Uint8Array(fs.readFileSync(romFile));
const sha=b=>createHash('sha256').update(b).digest('hex'),{frames,merged}=compileDorisDraft(),base=new Uint8Array(fs.readFileSync(path.join(root,'.local/chrono-trigger-usa.sfc')));
fs.mkdirSync(out,{recursive:true});
assert.deepEqual(decompress(rom,fileOffset(u24(rom,0x242000+252*3))).bytes,merged.graphics);
for(let tier=0;tier<6;tier++){
 const t=dorisTiers[tier],p=0x24f600+t.id*10;assert.deepEqual(rom.slice(p+3,p+10),base.slice(p+3,p+10));
 assert.deepEqual(rom.slice(p,p+3),Uint8Array.from([252,t.asm,t.palette]));
}
const event=JSON.parse(fs.readFileSync(path.join(root,'.local/reference/events.json'))).filter(e=>e.commands.some(([,op,a])=>op===0x83&&a[0]>=224&&a[0]<=229));assert.deepEqual(event.map(e=>e.location),[465]);
const union=new Map([[252,{gfx:252,bytes:merged.graphics.length,owners:'Doris224–229 (mutually exclusive level selection)'}]]);
for(const[,op,a]of event[0].commands)if(op===0x82){const p=0x24f000+(a[0]+7)*5,gfx=rom[p];if(!union.has(gfx))union.set(gfx,{gfx,bytes:decompress(rom,fileOffset(u24(rom,0x242000+gfx*3))).bytes.length,owners:'Native reward NPC'+a[0]});}
const bound=[...union.values()].reduce((n,a)=>n+a.bytes,0);assert.ok(bound<32768);
const s=await createCore(rom);await newGame(s);const initial=snapshot(s),h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,h);
let previewMode=false,tierNow=0,actor=null,script=0,loads=[],messages=[],techs=[];
h.on('event.init',e=>{if(e.location===465&&e.opcode===0x83){loads.push(s.ram[0x12002+e.scriptPC]);actor=e.object;}});
h.on('event.dispatch',e=>{if(!previewMode||e.location!==465||actor===null||script||e.object!==actor)return;script=0x12001+e.scriptPC;s.ram.set(tierNow===4?[0xa6,1,0xad,1,0x11,3]:[0xa6,1,0xac,0,0xad,1,0x11,5],script);});
h.on('dialogue.render',e=>{if(e.location===465)messages.push(e.stringId);});h.on('battle.tech',e=>techs.push(e.techId));
const checks=[],levels=[1,10,20,30,40,99];
function tileBytes(tier,f){const t=dorisTiers[tier],cells=(t.size&2?3:1)*(t.size&1?8:4),assembly=fileOffset(u24(rom,0x242300+t.asm*3)),expected=[];for(let i=0;i<cells*4;i++){
 const tile=u16(rom,assembly+f*cells*10+i*2);assert.equal(tile&0x8000,0);
 for(let byte of merged.graphics.slice((tile&1023)*32,(tile&1023)*32+32)){if(tile&0x4000){byte=(byte>>1&85)|(byte&85)<<1;byte=(byte>>2&51)|(byte&51)<<2;byte=(byte>>4)|(byte&15)<<4;}expected.push(byte);}
 }return Uint8Array.from(expected);}
try{
 previewMode=true;
 for(let tier=0;tier<6;tier++){
  restore(s,initial);tierNow=tier;actor=null;script=0;loads=[];
  dev.jump({id:465,x:8,y:11,party:[0,1,2],trainingLevel:levels[tier]});runFrames(s,300);
  assert.deepEqual(loads,[224+tier]);assert.equal(actor,10);assert.ok(script);
  const t=dorisTiers[tier],colors=dorisColors(tier).map(snesColor),paletteSlot=Array.from({length:8},(_,i)=>129+i*16).find(p=>colors.every((v,k)=>s.ppu.cgram[p+k]===v));assert.ok(paletteSlot);
  assert.equal(u16(s.ram,0x1400+actor*2),u16(rom,0x242a00+t.palette*2));
  const loadedHeap=u16(s.ram,0x171)-0x8000;assert.ok(loadedHeap<=bound);
  for(let f=0;f<t.frames;f++){
   if(tier===4){for(const[address,bytes]of largePreviewFrameWrites(rom,{enemy:t.id,size:t.size,frames:t.frames},actor,f))s.ram.set(bytes,address);}
   else s.ram[script+3]=f;
   runFrames(s,48);assert.equal(s.ram[0xf01+actor*2],f,'Native cached frame '+tier+':'+f);
   const start=u16(s.ram,0xd00+actor*2)*32,v=new Uint8Array(s.ppu.vram.buffer),segments=t.size===2?[0,512,256,768,1024,1536]:t.size===1?[0,256,512,768]:[0,512];
   const actual=Uint8Array.from(segments.flatMap(o=>Array.from(v.slice(start+o,start+o+256))));assert.deepEqual(actual,tileBytes(tier,f),'Native graphics upload '+tier+':'+f);
   assert.deepEqual(Array.from(s.ppu.cgram.slice(paletteSlot,paletteSlot+12)),colors);assert.equal(dev.diagnostics().fatal,null);assert.ok(!s.cpu.stopped);
   checks.push({tier,frame:f,role:draftDorisMaps[tier][f],nativeUploadSha256:sha(actual),paletteSlot,heapBytes:loadedHeap});
   if([4,12,t.frames-1].includes(f)||(tier===4&&[9,13,15].includes(f))||(tier===5&&[17,19].includes(f)))await screenshot(s,path.join(out,`tier${tier}-frame${f}.png`));
  }
  console.log(`Doris tier${tier}: ${t.frames} exact native uploads; heap ${loadedHeap}/${bound}`);
 }
 previewMode=false;
 const battles=[];
 for(const tier of[0,3,4,5]){
  restore(s,initial);actor=null;script=0;loads=[];messages=[];techs=[];
  dev.jump({id:465,x:7,y:10,facing:0,party:[0,1,2],trainingLevel:levels[tier]});runFrames(s,300);
  const press=b=>{runFrames(s,3,b);runFrames(s,90);};
  for(let i=0;i<16&&s.ram[0xaf02]!==224+tier;i++){press(256);runFrames(s,120);}
  runFrames(s,300);assert.equal(s.ram[0xaf02],224+tier);assert.ok(messages.includes(154)&&messages.includes(153));assert.equal(dev.diagnostics().fatal,null);
  await screenshot(s,path.join(out,`tier${tier}-ordinary-battle.png`));
  const entry={tier,enemy:224+tier,originalChoiceAccepted:true,nativeBattle:true,heapBytes:u16(s.ram,0x171)-0x8000,techs:[]};
  if(tier===0){
   put16(s.ram,0x5e30+3*128,1);press(32);press(256);press(32);press(32);press(256);press(256);runFrames(s,1400);
   assert.ok(techs.some(t=>[3,11].includes(t)));assert.ok(messages.includes(156));assert.equal(u16(s.ram,0x100),465);assert.ok(!s.cpu.stopped);
   entry.victoryReturned=true;entry.techs=techs;entry.fixture='Only temporary enemy battle HP set to1 after ordinary fight entry, matching the existing native practice test. No cartridge stats changed.';
   await screenshot(s,path.join(out,'tier0-victory.png'));
  }
  battles.push(entry);console.log(`Doris tier${tier}: ordinary practice entry${entry.victoryReturned?' and native magic/victory passed':''}`);
 }
 const report={status:'Private generated Doris cartridge passed targeted native tests; active engine/registry remain unchanged',privateRomSha256:sha(rom),privateRomPath:'.local/qa/doris-generated/shrek-trigger.sfc',nativeUploads:checks.length,tiers:6,graphicsBytes:merged.graphics.length,tiles:merged.tiles,nativeCellSizes:[4,4,4,8,12,4],allTwelveColorPalettesVerified:true,originalHeadersAnimationStatsAndAIBytesPreserved:true,allNativeFrameXYOffsetsPreserved:true,displayedPixelClaim:'Exact native VRAM bytes and hardware palettes verified for every slot. Representative real-room and real-battle PPU captures are supplied for visual review; arbitrary background occlusion is not claimed pixel-exact.',roomHeap:{location:465,allConditionalResourceUnion:[...union.values()],conservativeBytes:bound,limit:32768,spareBytes:32768-bound},checks,battles,noActiveWrites:true,canonicalRomWritten:false,extraVramBytes:0,extraWramBytes:0};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,nativeUploads:checks.length,battles:battles.length,roomBound:bound,rom:sha(rom)}));
}finally{dev.dispose();h.dispose();}
