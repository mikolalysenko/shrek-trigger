import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot,settlePreviewFrame} from './helpers.mjs';
import {workshopPuppet as a} from '../content/workshop-puppets.js';
import {u16} from '../engine/rom.js';
import {sprite,tile4bpp,snesColor} from '../engine/sprites.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
test('the workshop brothers use the native shared puppet bank and private wooden palette without extra memory',async()=>{
  const p=0x24f600+a.enemy*10,ai=readEnemyAI(built.base,a.enemy);
  assert.deepEqual(built.rom.slice(p,p+10),built.base.slice(p,p+10));
  assert.deepEqual(built.rom.slice(ai.start,ai.start+ai.bytes),built.base.slice(ai.start,ai.start+ai.bytes));
  assert.equal(built.audit.workshopPuppets.graphicsBytesAdded,0);assert.equal(built.audit.workshopPuppets.assemblyBytesAdded,0);
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
  dev.previewActor(a.key,0);runFrames(s,300);assert.equal(dev.diagnostics().preview.object,15);
  assert.equal(u16(s.ram,0x141e),u16(built.rom,0x242a00+a.palette*2));
  const colors=a.colors.map(snesColor);assert.ok(Array.from({length:8},(_,i)=>129+i*16).some(p=>colors.every((v,k)=>s.ppu.cgram[p+k]===v)));
  for(let frame=0;frame<256;frame++){
    settlePreviewFrame(s,dev,frame);
    const m=built.audit.characters[3].map[frame],pixels=sprite(3,m.facing,m.pose,m.phase),tile=u16(s.ram,0xd1e),vram=new Uint8Array(s.ppu.vram.buffer);
    for(let row=0;row<2;row++){
      const expected=new Uint8Array(256);
      for(let cell=0;cell<4;cell++)for(let col=0;col<2;col++)expected.set(tile4bpp(pixels,32,cell%2*16+col*8,(cell>>1)*16+row*8),(cell*2+col)*32);
      assert.deepEqual(vram.slice(tile*32+row*512,tile*32+row*512+256),expected,'workshop puppet frame '+frame);
    }
    assert.equal(dev.diagnostics().fatal,null);
  }
  dev.previewFrame(110);runFrames(s,16);await screenshot(s,'.local/qa/workshop-puppet-native.png');
  dev.undo();assert.equal(u16(s.ram,256),2);dev.dispose();h.dispose();
});
