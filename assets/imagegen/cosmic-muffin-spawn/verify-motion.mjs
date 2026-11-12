import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {privateOverlay} from './private-overlay.mjs';import {sha} from './compile-draft.mjs';
import {uploaded,oamCells,locate} from './native-proof-utils.mjs';
import {createCore} from '../../../scripts/core.mjs';import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';import {createDevTools} from '../../../engine/devtools.js';
import {previewActors} from '../../../content/native-preview.js';import {put16} from '../../../engine/rom.js';import {snapshot,restore} from '../../../engine/save.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),out=path.join(d,'motion-verification'),c=privateOverlay();fs.mkdirSync(out,{recursive:true});
const s=await createCore(c.rom),checkpoint=path.join(d,'private/newgame.json');if(fs.existsSync(checkpoint))restore(s,JSON.parse(fs.readFileSync(checkpoint)));else{await newGame(s);fs.writeFileSync(checkpoint,JSON.stringify(snapshot(s)));}
const h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,h),rows=[],start=previewActors.length;
try{for(const a of c.candidates)for(const owner of c.audit.banks.find(b=>b.key===a.key).owners){
  const key='spawn-motion-'+owner.id;previewActors.push({key,enemy:owner.id,gfx:a.audit.gfx,asm:a.audit.asm,palette:208,size:a.cells===24?3:0,frames:2});dev.previewActor(key);runFrames(s,300);
  const preview=dev.diagnostics().preview,x=preview.object*2;dev.cancel();s.ram.set([0xad,255,0x11,3],preview.script);runFrames(s,10);
  const stride=owner.animation.bytes/4,modes=stride/4;assert.ok(Number.isInteger(modes));
  for(let facing=0;facing<4;facing++)for(let mode=0;mode<modes;mode++){
    const list=[];for(let i=mode*4;i<stride;i++){const frame=owner.animation.data[facing*stride+i],ticks=owner.durations.data[i];if(frame===255||!ticks)break;assert.ok(frame<2);list.push({frame,ticks,index:i});}if(!list.length)continue;
    put16(s.ram,0x1480+x,stride);put16(s.ram,0x1500+x,owner.animation.offset&65535);put16(s.ram,0x1580+x,owner.durations.offset&65535);
    s.ram[0x1600+x]=facing;s.ram[0x1601+x]=0;s.ram[0x1680+x]=mode;s.ram[0x1681+x]=255;s.ram[0x1780+x]=1;s.ram[0x10b01+x]=0;
    const period=list.reduce((n,e)=>n+e.ticks,0),count=Math.max(2*period,64),states=[];let maxDelay=0,exactTicks=0;
    for(let tick=0;tick<count;tick++){
      runFrames(s,1);assert.equal(dev.diagnostics().fatal,null);let phase=0,t=tick%period;while(t>=list[phase].ticks){t-=list[phase].ticks;phase++;}
      const want=list[phase].frame,requested=s.ram[0xf01+x];
      if(a.key==='head')assert.equal(requested,want,`${key}/${facing}/${mode} native request ${tick}`);
      else assert.equal(requested,255,'Fixed size3 field loader does not select ordinary assembly frames');
      const expected=a.key==='shell'?0:want,current=uploaded(s,a,preview.object,expected);let displayed=expected;
      if(!current.exact){displayed=1-expected;assert.ok(uploaded(s,a,preview.object,displayed).exact,'Previous complete native pose at transfer boundary');assert.ok(t<=1,'No persistent native pose delay');maxDelay=Math.max(maxDelay,t+1);}
      const entry=locate(a,displayed,oamCells(s,c.audit.palette.words));assert.ok(entry,`${key}/${facing}/${mode} complete native cells`);exactTicks++;
      states.push({tick,phase,requested,displayed,timer:s.ram[0x1601+x],index:s.ram[0x1681+x]});
    }
    rows.push({key:a.key,enemy:owner.id,facing,mode,list,period,ticks:count,exactTicks,maxDelay,transitions:states.filter((s,i)=>!i||s.displayed!==states[i-1].displayed),fixedBody:a.key==='shell'});
  }
  dev.undo();console.log(key+' complete');
}}finally{previewActors.splice(start);dev.dispose();h.dispose();}
assert.deepEqual(s.cart.data,c.rom);const report={...c.report,status:'Original native programs exercised',setup:'Reversible isolated native enemy object; animation pointers, facing and mode fixture initialized once per case. Native CPU advances every subsequent tick; no frame, VRAM, OAM, program, AI or cartridge writes during observation.',cases:rows.length,ticks:rows.reduce((n,r)=>n+r.ticks,0),maximumRequestDisplayDelay:Math.max(...rows.map(r=>r.maxDelay)),rows,shellBlank:'Original blank assembly1 preserved and round-tripped. Size3 field rendering remains fixed at assembly0 for all inspected original AA modes, including lists whose table byte is1; no claim that blank1 is an ordinary field upload.'};fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:report.cases,ticks:report.ticks,maxDelay:report.maximumRequestDisplayDelay}));
