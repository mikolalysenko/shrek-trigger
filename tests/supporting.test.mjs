import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {supportingCast} from '../content/supporting-cast.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {supportingFrames} from '../engine/supporting-cast.js';

const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('mirrored native tile sharing reconstructs every supporting pose pixel for pixel',()=>{
  let mirrors=0;
  for(const actor of supportingCast){
    const {frames}=supportingFrames(built.base,actor),gfx=decompress(built.rom,fileOffset(u24(built.rom,0x242000+actor.gfx*3))).bytes,asm=fileOffset(u24(built.rom,0x242300+actor.asm*3));
    for(let f=0;f<frames.length;f++)for(let y=0;y<32;y++)for(let x=0;x<32;x++){
      const cell=(y>>4)*2+(x>>4),tile=u16(built.rom,asm+f*40+(y>>3&1)*16+cell*4+(x>>3&1)*2),tx=tile&0x4000?7-(x&7):x&7;
      assert.equal(tile&0x8000,0,'field loader does not support vertical tile mirroring');if(tile&0x4000)mirrors++;
      let v=0;for(let k=0;k<4;k++)v|=(gfx[(tile&1023)*32+(k>>1)*16+(y&7)*2+(k&1)]>>(7-tx)&1)<<k;
      assert.equal(v,frames[f][y*32+x],`${actor.key} frame ${f}, pixel ${x},${y}`);
    }
  }
  assert.ok(mirrors>0);
});

test('the empty house, the onion jar and the story cast preserve unrelated villagers, palette users and animation timing',()=>{
  const {base,rom}=built;
  // The household resident (NPC 21) is stock again, alongside the other
  // unrelated townsfolk that share Crono's mother's source actor.
  for(const npc of[13,14,15,17,18,21,51,97,121,146,147,148]){
    const p=0x24f000+(npc+7)*5;assert.deepEqual(rom.slice(p,p+5),base.slice(p,p+5),`unrelated NPC ${npc}`);
  }
  for(const id of[9,128,133,134,135,149,159]){
    const p=0x240000+u16(base,0x242a00+id*2);assert.deepEqual(rom.slice(p,p+24),base.slice(p,p+24),`shared palette ${id}`);
  }
  for(const table of[0x242600,0x242800])assert.deepEqual(rom.slice(table,table+512),base.slice(table,table+512),'animation and duration pointer tables');
  // Crono's mother's NPC 37 is an ordinary townswoman again; her rooms load
  // the private empty actor (215) and the onion jar (219) instead.
  {const p=0x24f000+(37+7)*5;assert.deepEqual(rom.slice(p,p+5),base.slice(p,p+5),'NPC 37 keeps its stock townswoman art');}
  for(const npc of[215,219])assert.notEqual(rom[0x24f000+(npc+7)*5],rom[0x24f000+(13+7)*5],`private home actor ${npc}`);
  assert.notEqual(rom[0x24f000+(69+7)*5],rom[0x24f000+(3+7)*5],'human Fiona is separate from her ancestor');
  assert.notEqual(rom[0x24f000+(1+7)*5],rom[0x24f000+(55+7)*5],'Harold is separate from Alder');
  for(const actor of built.audit.supportingCast){
    const gfx=decompress(rom,fileOffset(u24(rom,0x242000+actor.gfx*3))).bytes,asm=fileOffset(u24(rom,0x242300+actor.asm*3));
    assert.equal(gfx.length,actor.graphicsBytes);assert.ok(gfx.slice(0,32).every(v=>v===0));
    for(let f=0;f<actor.frames.length;f++)for(let i=0;i<16;i++)assert.ok((u16(rom,asm+f*40+i*2)&1023)*32<gfx.length,`${actor.key} frame ${f} tile bound`);
    for(const npc of actor.npcs){const p=0x24f000+(npc+7)*5;assert.deepEqual(rom.slice(p+3,p+5),base.slice(p+3,p+5),'native animation and cell budget');}
  }
});

test('every supporting actor and pose loads through native NPC, palette and static-frame commands; preview undo restores the game',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),startFrame=s.frames;
  assert.throws(()=>dev.previewActor('missing'),/Unknown/);
  assert.throws(()=>dev.previewFrame(0),/preview first/);
  for(const actor of supportingCast){
    dev.previewActor(actor.key,0);runFrames(s,280);
    const d=dev.diagnostics(),p=0x240000+u16(built.rom,0x242a00+actor.palette*2);
    assert.equal(d.location,1);assert.equal(d.preview.object,15);assert.ok(d.preview.script);
    const colors=Array.from({length:12},(_,i)=>u16(built.rom,p+i*2));
    assert.deepEqual(Array.from(s.ppu.cgram.slice(145,157)),colors,`${actor.key} native palette`);
    const script=d.preview.script;
    for(let f=0;f<actor.frames;f++){
      dev.previewFrame(f);runFrames(s,8);
      assert.equal(s.ram[0x1301+15*2],f,`${actor.key} static frame ${f}`);
      assert.equal(dev.diagnostics().preview.script,script,'bounded script during repeated frame changes');
      assert.ok(!s.cpu.stopped);
    }
    dev.previewFrame(Math.min(1,actor.frames-1));runFrames(s,8);
    await screenshot(s,`.local/qa/supporting-${actor.key}-native.png`);
    assert.throws(()=>dev.previewFrame(actor.frames),/outside/);
  }
  dev.undo();assert.equal(u16(s.ram,0x100),2);assert.equal(dev.diagnostics().preview,null);
  assert.ok(s.frames-startFrame<=1,'changing previews retains the initial return checkpoint');
  h.dispose();dev.dispose();
});
