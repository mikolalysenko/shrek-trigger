import {cartridgeOffset} from '../engine/expanded-rom.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {courtBeasts,courtBeastGeometry} from '../content/court-beasts.js';
import {courtBeastFrames,courtBeastSprite} from '../engine/court-beast-art.js';
import {compileSpriteFrames} from '../engine/native-sprites.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {snesColor} from '../engine/sprites.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
function frameTiles(frame){
  const gfx=decompress(built.rom,cartridgeOffset(u24(built.rom,0x242000+133*3),built.rom)).bytes,asm=fileOffset(u24(built.rom,0x242300+127*3))+frame*80,out=[];
  for(let i=0;i<32;i++){
    const t=u16(built.rom,asm+i*2);
    for(let b of gfx.subarray((t&1023)*32,(t&1023)*32+32)){
      if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}out.push(b);
    }
  }
  return Uint8Array.from(out);
}
test('both court beasts preserve native AI and size while their eight-cell art stays inside the hardware budget',()=>{
  const a=built.audit.courtBeasts;assert.equal(a.cells,8);assert.equal(a.assemblyBytes,31*80);assert.ok(a.tiles<1024);
  for(const c of courtBeasts){
    const p=0x24f600+c.enemy*10;assert.deepEqual(built.rom.slice(p,p+10),built.base.slice(p,p+10));
    const ai=readEnemyAI(built.base,c.enemy);assert.deepEqual(built.rom.slice(ai.start,ai.start+ai.bytes),built.base.slice(ai.start,ai.start+ai.bytes));
    assert.ok(a.graphicsBytes<=0x8000);
  }
  assert.ok(built.audit.resources.reclaimedSprites.some(p=>p.field===0&&p.id===133&&p.owners.length===2));
  assert.ok(built.audit.resources.reclaimedSprites.some(p=>p.field===1&&p.id===127&&p.length===2480));
  const frame=courtBeastSprite(courtBeastFrames[0]).slice(),origins=courtBeastGeometry.frameCellOrigins[0],coverage=new Uint8Array(frame.length);
  for(const[x,y]of origins)for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++)coverage[(y+yy)*64+x+xx]=1;
  const outside=coverage.indexOf(0),options={width:64,height:64,size:1,frameCellOrigins:[origins]};assert.ok(outside>=0);
  frame[outside]=1;assert.throws(()=>compileSpriteFrames([frame],options),/outside native/);frame[outside]=0;
  assert.throws(()=>compileSpriteFrames([frame],{...options,frameCellOrigins:[[origins[0],origins[0],...origins.slice(2)]]}),/overlap/);
  assert.throws(()=>compileSpriteFrames([frame],{...options,frameCellOrigins:[origins.slice(1)]}),/origins/);
  assert.equal(a.graphicsStorage,'direct-rom');

});
test('all 62 court-beast poses and both palettes upload exactly through the native enemy loader',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
  for(const a of courtBeasts){
    dev.previewActor(a.key,0);runFrames(s,280);
    assert.equal(dev.diagnostics().preview.object,15);assert.equal(u16(s.ram,0x141e),u16(built.rom,0x242a00+a.palette*2));
    const colors=a.colors.map(snesColor);assert.ok(Array.from({length:8},(_,i)=>129+i*16).some(p=>colors.every((v,k)=>s.ppu.cgram[p+k]===v)));
    for(let frame=0;frame<31;frame++){
      dev.previewFrame(frame);runFrames(s,8);assert.equal(s.ram[0x131f],frame);
      const tile=u16(s.ram,0xd1e),bytes=new Uint8Array(s.ppu.vram.buffer).slice(tile*32,tile*32+1024);
      assert.deepEqual(bytes,frameTiles(frame),a.key+' frame '+frame);assert.equal(dev.diagnostics().fatal,null);
    }
    for(const frame of[3,6,16,24,30]){
      dev.previewFrame(frame);runFrames(s,32);
      const pixels=courtBeastSprite(courtBeastFrames[frame]),rgba=new Uint8Array(512*480*4),colors=new Map();s.setPixels(rgba);
      const ox=200-a.width/2+(a.anchor?.[0]??0)+(a.frameOffsets?.[frame]?.[0]??0),oy=151-a.height+(a.anchor?.[1]??0)+(a.frameOffsets?.[frame]?.[1]??0);
      for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(pixels[y*a.width+x]){
        const k=pixels[y*a.width+x],p=((oy+y)*2*512+(ox+x)*2)*4,v=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];
        if(!colors.has(k))colors.set(k,v);else assert.equal(v,colors.get(k),`${a.key} visible frame ${frame} pixel ${x},${y}`);
      }
      assert.ok(colors.size>=5);assert.equal(new Set(colors.values()).size,colors.size,'opaque colors display distinctly');
    }
    dev.previewFrame(16);runFrames(s,32);await screenshot(s,`.local/qa/${a.key}-native.png`);
  }
  dev.undo();assert.equal(u16(s.ram,256),2);dev.dispose();h.dispose();
});
