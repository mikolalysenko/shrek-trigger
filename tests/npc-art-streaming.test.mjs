import {cartridgeOffset} from '../engine/expanded-rom.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,settlePreviewFrame} from './helpers.mjs';
import {supportingCast} from '../content/supporting-cast.js';
import {caretaker} from '../content/caretaker.js';
import {carnivalFields,carnivalCast} from '../content/carnival.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {snapshot,restore} from '../engine/save.js';

const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
const actors=[caretaker,...supportingCast,...carnivalFields,...carnivalCast.filter(a=>a.size===0)];

test('every streamed supporting, caretaker and clown frame uploads exact cartridge tiles through native loaders',async()=>{
  const s=await bedroom(built.rom),hooks=installHooks(s,specs),dev=createDevTools(s,hooks),start=s.frames;
  for(const a of actors){
    const stream=built.audit.resources.npcGraphicsStreaming.streams.find(g=>g.gfx===a.gfx);
    assert.ok(stream,a.key+' has a guarded raw allocation');
    const data=decompress(built.rom,cartridgeOffset(u24(built.rom,0x242000+a.gfx*3),built.rom)).bytes,assembly=fileOffset(u24(built.rom,0x242300+a.asm*3));
    assert.deepEqual(built.rom.slice(stream.address,stream.address+stream.bytes),data,'standard compressed representation is retained');
    dev.previewActor(a.key,0);runFrames(s,280);
    const object=dev.diagnostics().preview.object,x=object*2;
    assert.equal(u16(s.ram,0x1280+x),stream.address&65535,a.key+' raw source');assert.equal(s.ram[0x1200+x],stream.address>>16,a.key+' raw bank');
    for(let frame=0;frame<a.frames;frame++){
      settlePreviewFrame(s,dev,frame);
      const tile=u16(s.ram,0xd00+x),vram=new Uint8Array(s.ppu.vram.buffer);
      for(let row=0;row<2;row++){
        const expected=new Uint8Array(256);
        for(let i=0;i<8;i++){
          const t=u16(built.rom,assembly+frame*40+row*16+i*2),pixels=data.slice((t&1023)*32,(t&1023)*32+32);
          if(t&0x4000)for(let k=0;k<32;k++){let v=pixels[k];v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;pixels[k]=(v>>4)|(v&15)<<4;}
          expected.set(pixels,i*32);
        }
        assert.deepEqual(vram.slice(tile*32+row*512,tile*32+row*512+256),expected,a.key+' frame '+frame+' row '+row);
      }
      assert.equal(dev.diagnostics().fatal,null);
    }
  }
  dev.undo();assert.equal(u16(s.ram,0x100),2);assert.ok(s.frames-start<=1,'the entire preview session restores its starting machine');dev.dispose();hooks.dispose();
});

test('all six crowded ending variants retain native scene dispatch with bounded sprite heap',async()=>{
  const s=await bedroom(built.rom),initial=snapshot(s),hooks=installHooks(s,specs),dev=createDevTools(s,hooks);
  for(const [story,flag,variant]of[[0xc2,0,0],[0xc5,0,1],[0xc9,0,2],[0xcb,0,3],[0xff,1,4],[0xff,0,255]]){
    restore(s,initial);s.ram[0x10000]=story;s.ram[0x100db]=flag;
    dev.jump({id:415,x:7,y:31,party:[0,1,2],endgame:true});runFrames(s,500);
    assert.equal(u16(s.ram,0x100),415);assert.equal(s.ram[0x10210],variant);assert.equal(dev.diagnostics().fatal,null);
    const bytes=u16(s.ram,0x171)-0x8000;
    // Story actors stream raw; the stock Nu (bank 99) decompresses as in the
    // original game, so the scene stays well inside the native 32 KiB heap.
    assert.ok(bytes>0&&bytes<=16*1024,'crowded ending leaves at least 16 KiB of the native 32 KiB heap free');
    dev.undo();
  }
  dev.dispose();hooks.dispose();
});
