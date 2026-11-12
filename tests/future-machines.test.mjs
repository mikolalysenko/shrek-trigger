import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot,assertSpriteGraphicsStorage,assertStockActors} from './helpers.mjs';
import {retainedBossNames} from '../content/retained-boss-names.js';
import {futureMachines,customFutureMachines,supplyKeeper,stockMachineGraphics} from '../content/future-machines.js';
import {futureMachineSprite} from '../engine/future-machine-art.js';
import {keeperBackgroundLayout,patchFutureMachines} from '../engine/future-machines.js';
import {carnivalCast} from '../content/carnival.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
function tiles(actor,frame){
  const gfx=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+actor.gfx*3),b.rom)).bytes,asm=cartridgeOffset(u24(b.rom,0x242300+actor.asm*3),b.rom),cells=(actor.size&2?3:1)*(actor.size&1?8:4),out=[];
  for(let i=0;i<cells*4;i++){
    const t=u16(b.rom,asm+frame*cells*10+i*2);
    for(let v of gfx.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}out.push(v);}
  }return Uint8Array.from(out);
}
function pixelCheck(s,a,f){
  const pixels=futureMachineSprite(a.art,f),rgba=new Uint8Array(512*480*4),colors=new Map();s.setPixels(rgba);
  const ox=200-a.width/2+(a.anchor?.[0]??0)+(a.frameOffsets?.[f]?.[0]??0),oy=151-a.height+(a.anchor?.[1]??0)+(a.frameOffsets?.[f]?.[1]??0);
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(pixels[y*a.width+x]){
    const k=pixels[y*a.width+x],p=((oy+y)*2*512+(ox+x)*2)*4,v=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];
    if(!colors.has(k))colors.set(k,v);else assert.equal(v,colors.get(k),`${a.key}:${f} pixel ${x},${y}`);
  }
  assert.ok(colors.size>=5);assert.equal(new Set(colors.values()).size,colors.size);
}
test('stock machines and the Guardian keep their original banks, background body and palette',()=>{
  assert.equal(b.audit.futureMachines.extraVramBytes,0);assert.equal(b.audit.futureMachines.extraWramBytes,0);
  assert.deepEqual(new Set(b.audit.futureMachines.stockRestored),stockMachineGraphics);
  assert.deepEqual(customFutureMachines.map(a=>a.key),['rivet']);assert.equal(b.audit.futureMachines.background,null);
  // The Guardian keeps the Storekeeper battle name; every other machine is fully stock.
  const stock=[...futureMachines.filter(a=>stockMachineGraphics.has(a.gfx)),supplyKeeper];
  assertStockActors(b,stock,{retainedNames:new Map(retainedBossNames.map(a=>[a.enemy,a.short]))});
  assert.deepEqual(stock.filter(a=>retainedBossNames.some(r=>r.enemy===a.enemy)).map(a=>a.enemy),[212]);
  const bg=supplyKeeper.background,pointer=0x362220+bg.graphics*3,packet=fileOffset(u24(b.base,pointer)),source=decompress(b.base,packet);
  assert.equal(u24(b.rom,pointer),u24(b.base,pointer));assert.deepEqual(b.rom.slice(packet,packet+source.length),b.base.slice(packet,packet+source.length));
  assert.ok(!b.audit.resources.reclaimedPackets.some(p=>p.pointer===pointer),'the stock background packet is not reclaimed');
  for(const [table,id]of[[0x361e00,123],[0x361e00,20],[0x362100,43]]){
    assert.deepEqual(b.rom.slice(table+id*3,table+id*3+3),b.base.slice(table+id*3,table+id*3+3));
    const p=fileOffset(u24(b.base,table+id*3)),map=decompress(b.base,p);assert.deepEqual(b.rom.slice(p,p+map.length),b.base.slice(p,p+map.length));
  }
  const palettes=0x3624c0+bg.palette*210;assert.deepEqual(b.rom.slice(palettes,palettes+210),b.base.slice(palettes,palettes+210));
});
test('Rivet retains native AI and headers within an explicit cartridge memory budget',()=>{
  for(const a of b.audit.futureMachines.actors){
    const p=0x24f600+a.enemy*10;assert.deepEqual(b.rom.slice(p,p+10),b.base.slice(p,p+10));
    const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
    assertSpriteGraphicsStorage(b,a);
  }
  const bad=b.base.slice();bad[0x361c00+4*8]=186;assert.throws(()=>keeperBackgroundLayout(bad),/shared/);
  assert.throws(()=>patchFutureMachines(b.base,()=>0x300000,()=>{}),/original decoded graphics budget/);
  const wrongNpc=b.base.slice();wrongNpc[0x24f000+(2+7)*5+3]=159;
  assert.throws(()=>patchFutureMachines(wrongNpc,()=>0x300000,()=>{},{streamedGraphics:new Set([37])}),/NPC header changed/);
});
test('all 25 custom Rivet variants upload exact native tiles and display their indexed artwork',async()=>{
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  for(const a of customFutureMachines){
    d.previewActor(a.key);runFrames(s,300);
    assert.equal(u16(s.ram,0x141e),u16(b.rom,0x242a00+a.palette*2));
    for(let f=0;f<a.frames;f++){
      d.previewFrame(f);runFrames(s,32);assert.equal(s.ram[0xf1f],f);
      const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer);
      assert.deepEqual(Uint8Array.from([...v.slice(base,base+256),...v.slice(base+512,base+768)]),tiles(a,f),a.key+':'+f);
      pixelCheck(s,a,f);assert.equal(d.diagnostics().fatal,null);
    }
    d.previewFrame(0);runFrames(s,32);await screenshot(s,`.local/qa/${a.key}-native.png`);
  }
  d.undo();assert.equal(u16(s.ram,256),2);d.dispose();h.dispose();
});
test('large previews stream all 20 Great Milenko frames and four Guardian overlays through the native animation queue',async()=>{
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),rom=s.cart.data.slice();
  for(const a of[carnivalCast.find(a=>a.key==='great-milenko'),supplyKeeper]){
    d.previewActor(a.key);runFrames(s,300);
    for(let f=0;f<a.frames;f++){
      d.previewFrame(f);runFrames(s,48);assert.equal(s.ram[0xf1f],f,a.key+':'+f);
      const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer),offsets=[0,512,256,768,1024,1536];
      assert.deepEqual(Uint8Array.from(offsets.flatMap(o=>[...v.slice(base+o,base+o+256)])),tiles(a,f),a.key+':'+f+' native tiles');
      assert.equal(d.diagnostics().fatal,null);
    }
    d.previewFrame(1);runFrames(s,48);await screenshot(s,`.local/qa/${a.key}-native-streamer.png`);
  }
  assert.deepEqual(s.cart.data,rom,'preview changes only reversible machine state');d.undo();assert.equal(u16(s.ram,256),2);d.dispose();h.dispose();
});
test('the Guardian reveal, three-target battle and return use the stock background and moving parts',async()=>{
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),messages=[];let complete=false;
  h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));h.on('event.dispatch',e=>{if(e.location===219&&e.opcode===0xda)complete=true;});
  d.jump(areas.find(a=>a.futureScene==='future-keeper'));runFrames(s,400);runFrames(s,24,16);
  for(let i=0;i<50&&s.ram[0xaf02]!==212;i++){runFrames(s,3,256);runFrames(s,100);}
  assert.equal(s.ram[0xaf02],212);assert.equal([...s.ram.slice(0xaf02,0xaf0a)].filter(id=>id===207).length,2);
  runFrames(s,300);
  const v=new Uint8Array(s.ppu.vram.buffer),bg=supplyKeeper.background,stock=decompress(b.base,fileOffset(u24(b.base,0x362220+bg.graphics*3))).bytes,row=0x3624c0+bg.palette*210+5*30;
  assert.deepEqual(v.slice(0x7000,0x8000),stock,'stock 4 KiB background upload');
  assert.deepEqual(Array.from(s.ppu.cgram.slice(97,109)),Array.from({length:12},(_,i)=>u16(b.base,row+i*2)),'stock background palette in native CGRAM bank six');
  await screenshot(s,'.local/qa/supply-keeper-battle.png');
  for(let i=0;i<140&&!complete;i++){runFrames(s,3,256);runFrames(s,100);}
  assert.ok(complete,'battle returned through native end-of-battle command');runFrames(s,400);
  for(const id of[12,13,14])assert.ok(messages.some(([l,n])=>l===219&&n===id));
  assert.equal(s.ram[0x100ec]&1,1);assert.equal(s.ram[0x10000],53);assert.equal(d.diagnostics().fatal,null);
  await screenshot(s,'.local/qa/supply-keeper-cleared.png');runFrames(s,240,16);assert.equal(u16(s.ram,256),344,'the cleared keeper opens the route to the food store');
  d.undo();assert.equal(u16(s.ram,256),2);d.dispose();h.dispose();
});
