import fs from 'node:fs';import path from 'node:path';
import {privateOverlay} from './private-overlay.mjs';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {u16,u24} from '../../../engine/rom.js';
import {screenshot} from '../../../tests/helpers.mjs';
const root=path.resolve(import.meta.dirname,'../../..'),c=privateOverlay();
const loc=Number(process.argv[2]??264),x=Number(process.argv[3]??5),y=Number(process.argv[4]??22),out=path.join(import.meta.dirname,'private');fs.mkdirSync(out,{recursive:true});
const s=await createCore(c.rom);await newGame(s);const h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,h);
const events=[];h.on('*',e=>{if(['battle.initialized','battle.result','event.prepare'].includes(e.name))events.push(e);});
dev.jump({id:loc,x,y,party:[0,1,2],endgame:true});
for(const n of [300,600,1200]) {
  runFrames(s,n-(s._lastProbe??0));s._lastProbe=n;
  await screenshot(s,path.join(out,`scene-${loc}-${n}.png`));
  const objects=Array.from({length:s.ram[0x10a]},(_,i)=>({i,x:u16(s.ram,0xb00+i*2),y:u16(s.ram,0xb80+i*2),frame:s.ram[0xf01+i*2],gfx:u24(s.ram,0xd20+i*2),asm:u24(s.ram,0xe80+i*2),tile:u16(s.ram,0xd00+i*2)}));
  console.log(JSON.stringify({n,diag:dev.diagnostics(),objects,scroll:[s.ppu.bgHoff?.[0],s.ppu.bgVoff?.[0]],events}));
  fs.writeFileSync(path.join(out,`state-${loc}-${n}.bin`),s.ram);
  fs.writeFileSync(path.join(out,`oam-${loc}-${n}.bin`),s.ppu.oam);
}
dev.dispose();h.dispose();
