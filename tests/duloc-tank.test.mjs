import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {dulocTank,dulocTankColors,tankBodyCells} from '../content/duloc-tank.js';
import {dulocTankSprite} from '../engine/duloc-tank-art.js';
import {compileSpriteFrames} from '../engine/native-sprites.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {decompress} from '../engine/compression.js';
import {u16} from '../engine/rom.js';
import {snesColor} from '../engine/sprites.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
function frameTiles(a,frame){
  const gfx=decompress(built.rom,a.graphicsOffset).bytes,out=[],asm=a.assemblyOffset+frame*a.cells*10;
  for(let i=0;i<a.cells*4;i++){
    const t=u16(built.rom,asm+i*2);
    for(let b of gfx.subarray((t&1023)*32,(t&1023)*32+32)){
      if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}out.push(b);
    }
  }
  return Uint8Array.from(out);
}
test('Duloc Tank preserves all three native targets, their anchors, AI, palette budget and unused assembly padding',()=>{
  assert.equal(built.audit.dulocTank.extraVramBytes,0);assert.equal(built.audit.dulocTank.extraWramBytes,0);
  for(const a of built.audit.dulocTank.actors){
    const p=0x24f600+a.enemy*10;assert.deepEqual(built.rom.slice(p,p+10),built.base.slice(p,p+10));
    const ai=readEnemyAI(built.base,a.enemy);assert.deepEqual(built.rom.slice(ai.start,ai.start+ai.bytes),built.base.slice(ai.start,ai.start+ai.bytes));
    const frames=Array.from({length:a.frames},(_,f)=>dulocTankSprite(a.key,f)),compiled=compileSpriteFrames(frames,{...a,cellOrigins:a.enemy===147?tankBodyCells:undefined});
    assert.deepEqual(decompress(built.rom,a.graphicsOffset).bytes,compiled.graphics);
    assert.equal(a.cells,a.enemy===147?24:4);assert.ok(a.graphicsBytes<=0x8000);
    for(let f=0;f<a.frames;f++)for(let c=0;c<a.cells;c++)for(let axis=0;axis<2;axis++){
      const q=f*a.cells*10+a.cells*8+c*2+axis;assert.equal(built.rom[a.assemblyOffset+q],(compiled.assembly[q]+a.anchor[axis])&255);
    }
  }
  const pool=built.audit.resources.reclaimedSprites.find(p=>p.field===1&&p.id===119);assert.equal(pool.length,240);
  assert.deepEqual(built.rom.slice(pool.offset+240,pool.offset+480),built.base.slice(pool.offset+240,pool.offset+480));
  assert.throws(()=>dulocTankSprite('duloc-tank',1),/Invalid/,'size-class 3 has a single fixed frame');
});
test('all eight native tank frames upload with the original 24-cell and four-cell tile layouts',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
  for(const a of built.audit.dulocTank.actors){
    dev.previewActor(a.key);runFrames(s,300);
    assert.equal(u16(s.ram,0x141e),u16(built.rom,0x242a00+a.palette*2));
    const colors=dulocTankColors.map(snesColor);assert.ok(Array.from({length:8},(_,i)=>129+i*16).some(p=>colors.every((v,k)=>s.ppu.cgram[p+k]===v)));
    for(let f=0;f<a.frames;f++){
      dev.previewFrame(f);runFrames(s,32);const tile=u16(s.ram,0xd1e),vram=new Uint8Array(s.ppu.vram.buffer),expected=frameTiles(a,f);
      const actual=a.cells===4?Uint8Array.from([...vram.slice(tile*32,tile*32+256),...vram.slice(tile*32+512,tile*32+768)]):vram.slice(tile*32,tile*32+expected.length);
      assert.deepEqual(actual,expected,a.key+' frame '+f);assert.equal(dev.diagnostics().fatal,null);
      // Four-cell parts are clear of the kitchen foreground. The larger
      // chassis is also reviewed in its real catwalk battle, where its rail
      // occlusion is intentional.
      if(a.cells===4){
        const pixels=dulocTankSprite(a.key,f),rgba=new Uint8Array(512*480*4),colors=new Map();s.setPixels(rgba);
        const ox=200-a.width/2+a.anchor[0],oy=151-a.height+a.anchor[1];
        for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(pixels[y*a.width+x]){
          const k=pixels[y*a.width+x],p=((oy+y)*2*512+(ox+x)*2)*4,v=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];
          if(!colors.has(k))colors.set(k,v);else assert.equal(v,colors.get(k),`${a.key}:${f} pixel ${x},${y}`);
        }
        assert.ok(colors.size>=5);assert.equal(new Set(colors.values()).size,colors.size);
      }
    }
    dev.previewFrame(0);runFrames(s,32);await screenshot(s,`.local/qa/${a.key}-native.png`);
  }
  dev.undo();assert.equal(u16(s.ram,256),2);dev.dispose();h.dispose();
});
