import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {overworldPaletteBytes} from '../engine/environment.js';
import {u16} from '../engine/rom.js';

// Exercise the real overworld object engine, not just the exported tile sheet.
test('Shrek and Fiona walk in the input direction with native frame cycling and colors',async()=>{
  const b=await build(),s=await bedroom(b.rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h);
  try{
    for(const leader of [0,1]){
      if(leader)d.undo();
      const name=leader?'Fiona':'Shrek',party=leader?[1,0,2]:[0,1,2],paletteRow=4;
      d.jump({id:497,x:41,y:69,facing:1,party});runFrames(s,400);
      const palette=overworldPaletteBytes(leader);
      for(let i=1;i<=7;i++)assert.equal(s.ppu.cgram[0xc0+i],u16(palette,i*2),`live ${name} object color ${i}`);
      for(const[direction,input,expected,flip]of[
        ['down',32,[0,1],null],
        ['up',16,[2,3],null],
        ['left',64,[4,5,6],0],
        ['right',128,[4,5,6],0x40],
      ]){
        const seen=new Set(),mirrors=new Set();
        runFrames(s,2,input); // cross the native direction-change boundary
        for(let frame=0;frame<32;frame++){
          runFrames(s,1,input);
          for(let i=0;i<128;i++){
            const x=s.ppu.oam[i*2]&255,y=s.ppu.oam[i*2]>>8,tile=s.ppu.oam[i*2+1]&255,ex=s.ppu.oam[i*2+1]>>8;
            if(x<80||x>=160||y<70||y>=140||tile>=16||((ex>>1)&7)!==paletteRow)continue;
            seen.add(tile>>1);mirrors.add(ex&0xc0);
          }
        }
        assert.deepEqual([...seen].sort((a,b)=>a-b),expected,`${name} ${direction} native object frames`);
        if(flip!==null)assert.deepEqual([...mirrors],[flip],`${name} ${direction} OAM mirroring`);
        runFrames(s,16);
      }
    }
    assert.equal(d.diagnostics().fatal,null);
  }finally{d.dispose();h.dispose();}
});
