import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {portrait} from '../engine/portraits.js';
import {tile4bpp,paletteBytes} from '../engine/sprites.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16} from '../engine/rom.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('all dedicated portraits upload into their original menu slots and use the selected character palette through native controls',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
  for(let id=0;id<7;id++){
    const others=[0,1,2,3,4,5,6].filter(n=>n!==id).slice(0,2);
    dev.jump({id:5,x:27,y:32,party:[id,...others]});runFrames(s,400);runFrames(s,3,512);runFrames(s,300);
    assert.equal(s.ram[0xd46]&7,id,'native menu selection');
    const pal=paletteBytes(id,{full:true});assert.deepEqual(Array.from(s.ppu.cgram.subarray(48,64)),Array.from({length:16},(_,i)=>u16(pal,i*2)));
    if(id===0)for(let pc=0;pc<7;pc++){
      const pixels=portrait(pc),expected=[];assert.equal(pixels.length,48*48);assert.ok(pixels.every(v=>v<=12));
      for(let y=0;y<48;y+=8)for(let x=0;x<48;x+=8)expected.push(...tile4bpp(pixels,48,x,y));
      const at=0x4020+pc*0x480;assert.deepEqual(Array.from(new Uint8Array(s.ppu.vram.buffer).subarray(at,at+0x480)),expected,'native portrait '+pc);
      assert.equal(built.audit.portraits[pc].bytes,0x480);
    }
    await screenshot(s,`.local/qa/portrait-menu-${id}.png`);assert.equal(dev.diagnostics().fatal,null);dev.undo();
    assert.equal(u16(s.ram,0x100),2,'menu preview restores the field');
  }
  dev.dispose();h.dispose();
});
