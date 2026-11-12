import test from 'node:test';
import assert from 'node:assert/strict';
import {customTownsfolk as townsfolk} from '../content/townsfolk.js';
import {customStorybookActors as storybookActors} from '../content/storybook-actors.js';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot,assertSpriteGraphicsStorage} from './helpers.mjs';
import {bakeryVillagerFamilies,bakeryVillagers} from '../content/bakery-villagers.js';
import {bakeryVillagerSprite} from '../engine/bakery-village-art.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {spriteHeaders} from '../engine/native-sprites.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

const privateAssemblies=new Map([...townsfolk,...storybookActors].flatMap(a=>[a.npc,...(a.npcs??[])].filter(id=>id!==undefined).map(id=>[id,a.asm])));
test('Bakery civilians and feast props preserve unrelated villagers, shared palettes and native allocations',()=>{
 const a=b.audit.bakeryActors.community;assert.equal(a.actors.length,10);assert.equal(a.actors.reduce((n,a)=>n+a.frames,0),153);assert.equal(a.extraVramBytes,0);assert.equal(a.extraWramBytes,0);
 for(const actor of a.actors){
  assertSpriteGraphicsStorage(b,actor);
  assert.equal(actor.cells,4);assert.equal(actor.assemblyBytes,actor.frames*40);
  for(const id of actor.npcs){const p=0x24f000+(id+7)*5;assert.deepEqual([...b.rom.slice(p,p+5)],[actor.gfx,actor.asm,actor.palette,actor.animation,0]);}
  const p=0x240000+u16(b.base,0x242600+actor.animation*2),end=0x240000+u16(b.base,0x242602+actor.animation*2);assert.deepEqual(b.rom.slice(p,end),b.base.slice(p,end));
 }
 for(const asm of[7,11]){
  const p=fileOffset(u24(b.base,0x242300+asm*3));assert.equal(u24(b.rom,0x242300+asm*3),u24(b.base,0x242300+asm*3));
  assert.deepEqual(b.rom.slice(p,p+(asm===7?19:15)*40),b.base.slice(p,p+(asm===7?19:15)*40));
  assert.ok(!b.audit.resources.reclaimedSprites.some(r=>r.field===1&&r.id===asm));
  // Custom townsfolk would move to private assemblies; the stock household
  // residents, townkeepers and every unrelated villager keep the shared one.
  for(const h of spriteHeaders(b.base).filter(h=>h.kind==='npc'&&b.base[h.offset+1]===asm&&![32,33,64].includes(h.id))){
   const own=privateAssemblies.get(h.id),expected=[...b.base.slice(h.offset,h.offset+5)];if(own!==undefined)expected[1]=own;
   assert.deepEqual([...b.rom.slice(h.offset,h.offset+5)],expected,own!==undefined?`NPC ${h.id} only moves to its private assembly ${own}`:`unrelated NPC ${h.id}`);
  }
 }
 const p=0x240000+u16(b.base,0x242a00+174*2);assert.deepEqual(b.rom.slice(p,p+24),b.base.slice(p,p+24),'drummers leave shared prop palette unchanged');
 for(const[art,frame]of[['crumb-child',14],['brioche-elder',16]])assert.ok(bakeryVillagerSprite(art,frame).every(n=>n===0));
 const ownHeaders=new Set(bakeryVillagers.flatMap(a=>a.npcs.flatMap(id=>[0x24f000+(id+7)*5+1,0x24f000+(id+7)*5+2]))),prior=b.records.filter(r=>!ownHeaders.has(r.offset));
 const run=(base,families=bakeryVillagerFamilies)=>patchActorFamilies(base,families,bakeryVillagerSprite,()=>0x300000,()=>{},prior,{streamedGraphics:new Set([15,20,24,25,52,53,191])});
 assert.doesNotThrow(()=>run(b.base));
 const owned=b.base.slice();owned[0x24f000+(19+7)*5+1]=245;assert.throws(()=>run(owned),/another owner|already owned/);
 const source=structuredClone(bakeryVillagerFamilies);source[2].actors[0].sourceAsm=7;assert.throws(()=>run(b.base,source),/NPC header changed/);
 const palette=b.base.slice();palette[0x24f000+(19+7)*5+2]=123;assert.throws(()=>run(palette),/palette has another owner/);
});

test('all 153 Bakery civilian and feast frames render through native NPC uploads, including blank and head-only slots',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),original=s.cart.data.slice();
 for(const a of bakeryVillagers){
  d.previewActor(a.key);runFrames(s,300);assert.equal(u16(s.ram,0x141e),u16(b.rom,0x242a00+a.palette*2));
  const gfx=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+a.gfx*3),b.rom)).bytes,asm=cartridgeOffset(u24(b.rom,0x242300+a.asm*3),b.rom);
  for(let f=0;f<a.frames;f++){
   d.previewFrame(f);runFrames(s,48);assert.equal(s.ram[0xf1f],f);const expected=[];
   for(let i=0;i<16;i++){const t=u16(b.rom,asm+f*40+i*2);for(let v of gfx.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}expected.push(v);}}
   const start=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer);assert.deepEqual([...v.slice(start,start+256),...v.slice(start+512,start+768)],expected,a.key+':'+f);
   const p=bakeryVillagerSprite(a.art,f),rgba=new Uint8Array(512*480*4),colors=new Map(),ox=184+(a.anchor?.[0]??0)+(a.frameOffsets?.[f]?.[0]??0),oy=119+(a.anchor?.[1]??0)+(a.frameOffsets?.[f]?.[1]??0);s.setPixels(rgba);
   for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(p[y*32+x]){const k=p[y*32+x],i=((oy+y)*2*512+(ox+x)*2)*4,rgb=rgba[i]<<16|rgba[i+1]<<8|rgba[i+2];if(!colors.has(k))colors.set(k,rgb);else assert.equal(rgb,colors.get(k),`${a.key}:${f} pixel ${x},${y}`);}
   assert.equal(colors.size,new Set(p.filter(Boolean)).size);assert.equal(new Set(colors.values()).size,colors.size);assert.equal(d.diagnostics().fatal,null);
  }
  d.previewFrame(1);runFrames(s,48);await screenshot(s,`.local/qa/${a.key}-native.png`);
 }
 assert.deepEqual(s.cart.data,original);d.undo();assert.equal(u16(s.ram,0x100),2);d.dispose();h.dispose();
});

test('Bakery village rooms load their actual civilian and feast banks within the native field heap',async()=>{
 for(const[id,x,y]of[[275,7,12],[276,7,10],[277,7,10],[278,7,10],[279,12,15],[280,12,15],[292,12,15]]){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);s.ram[0x10000]=id===292?142:111;
  d.jump({id,x,y,party:[0,1,2]});runFrames(s,600);assert.equal(d.diagnostics().fatal,null);assert.equal(u16(s.ram,0x100),id);assert.ok(!s.cpu.stopped);
  await screenshot(s,`.local/qa/bakery-village-${id}.png`);d.undo();assert.equal(u16(s.ram,0x100),2);d.dispose();h.dispose();
 }
});
