import {cartridgeOffset} from '../engine/expanded-rom.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot,assertSpriteGraphicsStorage,assertStockActors} from './helpers.mjs';
import {bakeryActors,customBakeryFamilies as bakeryFamilies,customBakeryActors,stockBakeryFamilyKeys} from '../content/bakery-actors.js';
import {retainedBossNames} from '../content/retained-boss-names.js';
import {bakerySprite} from '../engine/bakery-art.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {compileFurnaceBackground} from '../engine/furnace-background.js';
import {sceneMap,sceneCells} from '../engine/scene-map.js';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
test('furnace bodies preserve shared architecture, map topology and native background allocations',()=>{
 const c=compileFurnaceBackground(b.base),a=b.audit.bakeryActors.background;
 assert.equal(a.extraVramBytes,0);assert.equal(a.extraWramBytes,0);assert.equal(c.cells.length,215);assert.equal(c.edges.length,32);
 for(const[id,graphics,edited]of[[190,c.graphics,c.tiles],[171,c.edgeGraphics,c.edgeTiles]]){
  const old=decompress(b.base,fileOffset(u24(b.base,0x362220+id*3))).bytes,now=decompress(b.rom,fileOffset(u24(b.rom,0x362220+id*3))).bytes;
  assert.equal(now.length,old.length);assert.deepEqual(now,graphics);
  for(let t=0;t<old.length/32;t++)if(!edited.includes(t))assert.deepEqual(now.slice(t*32,t*32+32),old.slice(t*32,t*32+32));
 }
 for(const[map,tileset]of[[154,41],[158,41],[41,52]]){
  assert.deepEqual(sceneMap(b.rom,map).bytes,sceneMap(b.base,map).bytes);
  assert.deepEqual(sceneCells(b.rom,map,tileset),sceneCells(b.base,map,tileset));
 }
 const shared=b.base.slice();shared[0x361c00]=190;assert.throws(()=>compileFurnaceBackground(shared),/ownership/);
 const palette=b.base.slice();palette[0x360003]=79;assert.throws(()=>compileFurnaceBackground(palette),/palette ownership/);
});
test('Nizbel and the Reptites restore stock art while the Kilnbacks keep their names',()=>{
 assert.deepEqual(new Set(b.audit.bakeryActors.stockRestored),stockBakeryFamilyKeys);
 const stock=bakeryActors.filter(a=>[139,79].includes(a.gfx));assert.equal(stock.length,4);
 assertStockActors(b,stock,{retainedNames:new Map(retainedBossNames.map(a=>[a.enemy,a.short]))});
 assert.deepEqual(stock.filter(a=>retainedBossNames.some(r=>r.enemy===a.enemy)).map(a=>a.enemy),[155,156]);
});
test('Glaze and the Furnace Maw preserve combat within their native memory budgets',()=>{
 assert.equal(b.audit.bakeryActors.extraVramBytes,0);assert.equal(b.audit.bakeryActors.extraWramBytes,0);
 assert.deepEqual(b.audit.bakeryActors.actors.map(a=>a.key),['master-glaze','furnace-maw','buried-kiln']);
 assert.equal(b.audit.bakeryActors.actors.reduce((n,a)=>n+a.frames,0),36);
 for(const a of b.audit.bakeryActors.actors){
  const h=0x24f600+a.enemy*10;assert.deepEqual(b.rom.slice(h,h+10),b.base.slice(h,h+10));
  for(const npc of a.npcs??[]){const h=0x24f000+(npc+7)*5;assert.deepEqual(b.rom.slice(h,h+5),b.base.slice(h,h+5));}
  for(const[table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride));}
  const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  const start=0x240000+u16(b.base,0x242600+a.animation*2),end=0x240000+u16(b.base,0x242602+a.animation*2);assert.deepEqual(b.rom.slice(start,end),b.base.slice(start,end));
  assertSpriteGraphicsStorage(b,a);
  assert.equal(a.cells,(a.size&2?3:1)*(a.size&1?8:4));assert.equal(a.assemblyBytes,a.frames*a.cells*10);
 }
 const streamedGraphics=new Set(b.audit.resources.npcGraphicsStreaming.streams.map(s=>s.gfx));
 const run=(base,families=bakeryFamilies)=>patchActorFamilies(base,families,bakerySprite,()=>0x300000,()=>{},b.records,{streamedGraphics});
 assert.throws(()=>patchActorFamilies(b.base,bakeryFamilies,bakerySprite,()=>0x300000,()=>{},b.records),/decoded graphics budget/);
 assert.doesNotThrow(()=>run(b.base));
 const absent=structuredClone(bakeryFamilies);absent[1].actors.pop();assert.throws(()=>run(b.base,absent),/another owner/);
 const shared=b.base.slice();shared[0x24f600+2]=190;assert.throws(()=>run(shared),/palette has another owner/);
});

test('all 36 custom Bakery enemy poses load exact native graphics and indexed pixels without runtime ROM writes',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),original=s.cart.data.slice();
 for(const a of customBakeryActors){
  d.previewActor(a.key);runFrames(s,300);assert.equal(u16(s.ram,0x141e),u16(b.rom,0x242a00+a.palette*2));
  const gfx=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+a.gfx*3),b.rom)).bytes,asm=fileOffset(u24(b.rom,0x242300+a.asm*3));
  for(let f=0;f<a.frames;f++){
   d.previewFrame(f);runFrames(s,48);assert.equal(s.ram[0xf1f],f);
   const cells=(a.size&2?3:1)*(a.size&1?8:4),expected=[];
   for(let i=0;i<cells*4;i++){const t=u16(b.rom,asm+f*cells*10+i*2);for(let v of gfx.slice((t&1023)*32,(t&1023)*32+32)){
    if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}expected.push(v);
   }}
   const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer),uploads=cells===12?[0,512,256,768,1024,1536]:cells===8?[0,256,512,768]:[0,512];
   assert.deepEqual(Uint8Array.from(uploads.flatMap(o=>[...v.slice(base+o,base+o+256)])),Uint8Array.from(expected),a.key+':'+f);
   const pixels=bakerySprite(a.art,f),rgba=new Uint8Array(512*480*4),colors=new Map();s.setPixels(rgba);
   const ox=200-a.width/2+(a.anchor?.[0]??0)+(a.frameOffsets?.[f]?.[0]??0),oy=151-a.height+(a.anchor?.[1]??0)+(a.frameOffsets?.[f]?.[1]??0);
   for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(pixels[y*a.width+x]){
    const k=pixels[y*a.width+x],p=((oy+y)*2*512+(ox+x)*2)*4,rgb=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];
    if(!colors.has(k))colors.set(k,rgb);else assert.equal(rgb,colors.get(k),`${a.key}:${f} pixel ${x},${y}`);
   }
   assert.equal(colors.size,new Set(pixels.filter(Boolean)).size);assert.equal(new Set(colors.values()).size,colors.size);assert.equal(d.diagnostics().fatal,null);
  }
  d.previewFrame(3);runFrames(s,48);await screenshot(s,`.local/qa/${a.key}-native.png`);
 }
 assert.deepEqual(s.cart.data,original);d.undo();assert.equal(u16(s.ram,256),2);d.dispose();h.dispose();
});
