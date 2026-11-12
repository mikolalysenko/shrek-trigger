import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot,assertSpriteGraphicsStorage} from './helpers.mjs';
import {enforcerFamilies,enforcerActors} from '../content/enforcer-actors.js';
import {enforcerSprite} from '../engine/enforcer-art.js';
import {compileActorFamily,patchActorFamilies} from '../engine/actor-families.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {compileSpriteFrames} from '../engine/native-sprites.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
const streamedGraphics=new Set(b.audit.resources.npcGraphicsStreaming.streams.map(s=>s.gfx));

test('per-frame cell layouts preserve the fixed reservation and reject missing, overlapping or uncovered poses',()=>{
 const frames=[new Uint8Array(64*32),new Uint8Array(64*32)];
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){frames[0][y*64+x]=2;frames[1][y*64+x+32]=3;}
 const frameCellOrigins=[[[0,0],[16,0],[0,16],[16,16]],[[32,0],[48,0],[32,16],[48,16]]],options={width:64,height:32,frameCellOrigins};
 const c=compileSpriteFrames(frames,options);assert.equal(c.assembly.length,80);assert.equal(c.assembly[32],224);assert.equal(c.assembly[72],0);assert.equal(c.assembly[33],224);assert.equal(c.assembly[73],224);
 assert.throws(()=>compileSpriteFrames(frames,{...options,frameCellOrigins:frameCellOrigins.slice(0,1)}),/per-frame/);
 assert.throws(()=>compileSpriteFrames(frames,{...options,cellOrigins:frameCellOrigins[0]}),/per-frame/);
 const overlap=structuredClone(frameCellOrigins);overlap[1][1]=overlap[1][0];assert.throws(()=>compileSpriteFrames(frames,{...options,frameCellOrigins:overlap}),/overlap/);
 assert.throws(()=>compileSpriteFrames(frames,{...options,frameCellOrigins:[frameCellOrigins[0],frameCellOrigins[0]]}),/outside native sprite cells/);
});

test('both enforcers and all later variants retain native combat, palette ownership and their original eight-cell budgets',()=>{
 assert.equal(b.audit.enforcers.extraVramBytes,0);assert.equal(b.audit.enforcers.extraWramBytes,0);
 assert.equal(b.audit.enforcers.actors.reduce((n,a)=>n+a.frames,0),392);
 for(const a of b.audit.enforcers.actors){
  const h=0x24f600+a.enemy*10;assert.deepEqual(b.rom.slice(h,h+10),b.base.slice(h,h+10));
  for(const[table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride));}
  const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  const start=0x240000+u16(b.base,0x242600+a.animation*2),end=0x240000+u16(b.base,0x242602+a.animation*2);
  assert.deepEqual(b.rom.slice(start,end),b.base.slice(start,end));
  assertSpriteGraphicsStorage(b,a);
  assert.equal(a.cells,(a.size&2?3:1)*(a.size&1?8:4));assert.equal(a.assemblyBytes,a.frames*a.cells*10);
 }
 const run=(base,families=enforcerFamilies)=>patchActorFamilies(base,families,enforcerSprite,()=>0x300000,()=>{},b.records,{streamedGraphics});
 assert.doesNotThrow(()=>run(b.base));
 const incomplete=structuredClone(enforcerFamilies);incomplete[0].actors.pop();assert.throws(()=>run(b.base,incomplete),/another owner/);
 const shared=b.base.slice();shared[0x24f600+2]=200;assert.throws(()=>run(shared),/palette has another owner/);
 const alias=b.base.slice();alias.set(alias.slice(0x242a00+200*2,0x242a02+200*2),0x242a00+201*2);assert.throws(()=>run(alias),/aliased/);
 const knight=enforcerFamilies[0];
 assert.throws(()=>compileActorFamily(knight,(art,f)=>{const p=enforcerSprite(art,f);p[0]=1;return p;}),/outside native sprite cells/);
 for(const f of[39,40,41])assert.ok(enforcerSprite('briar-knight',f).every(v=>v===0));
});

test('all 392 enforcer poses render exact native tiles and indexed pixels, including tall blades, wide sweeps and blank slots',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),original=s.cart.data.slice();
 for(const a of enforcerActors){
  d.previewActor(a.key);runFrames(s,300);
  assert.equal(u16(s.ram,0x141e),u16(b.rom,0x242a00+a.palette*2));
  const gfx=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+a.gfx*3),b.rom)).bytes,asm=cartridgeOffset(u24(b.rom,0x242300+a.asm*3),b.rom);
  for(let f=0;f<a.frames;f++){
   d.previewFrame(f);runFrames(s,32);assert.equal(s.ram[0xf1f],f);
   const cells=(a.size&2?3:1)*(a.size&1?8:4),expected=[];for(let i=0;i<cells*4;i++){
    const t=u16(b.rom,asm+f*cells*10+i*2);for(let v of gfx.slice((t&1023)*32,(t&1023)*32+32)){
     if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}expected.push(v);
    }
   }
   const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer);
   assert.deepEqual(Uint8Array.from((cells===12?[0,512,256,768,1024,1536]:cells===8?[0,256,512,768]:[0,512]).flatMap(o=>[...v.slice(base+o,base+o+256)])),Uint8Array.from(expected),a.key+':'+f);
   const pixels=enforcerSprite(a.art,f),rgba=new Uint8Array(512*480*4),colors=new Map();s.setPixels(rgba);
   const ox=200-a.width/2+(a.anchor?.[0]??0)+(a.frameOffsets?.[f]?.[0]??0),oy=151-a.height+(a.anchor?.[1]??0)+(a.frameOffsets?.[f]?.[1]??0);
   for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(pixels[y*a.width+x]){
    const k=pixels[y*a.width+x],p=((oy+y)*2*512+(ox+x)*2)*4,rgb=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];
    if(!colors.has(k))colors.set(k,rgb);else assert.equal(rgb,colors.get(k),`${a.key}:${f} pixel ${x},${y}`);
   }
   assert.equal(colors.size,new Set(pixels.filter(Boolean)).size);assert.equal(new Set(colors.values()).size,colors.size);assert.equal(d.diagnostics().fatal,null);
  }
  d.previewFrame(3);runFrames(s,32);await screenshot(s,`.local/qa/${a.key}-native.png`);
 }
 assert.deepEqual(s.cart.data,original);d.undo();assert.equal(u16(s.ram,256),2);d.dispose();h.dispose();
});
