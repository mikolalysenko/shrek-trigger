import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {privateOverlay,sha} from './private-overlay.mjs';
import {uploaded,oamCells,locate,pixelProof} from './native-proof-utils.mjs';
import {nativeSpriteBank} from '../../../scripts/native-sprite-view.mjs';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {createCore} from '../../../scripts/core.mjs';
import {runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {previewActors} from '../../../content/native-preview.js';
import {put16} from '../../../engine/rom.js';
import {restore} from '../../../engine/save.js';
const dir=import.meta.dirname,root=path.resolve(dir,'../../..'),c=privateOverlay(),rows=[],timed=[];
const s=await createCore(c.rom);restore(s,JSON.parse(fs.readFileSync(path.join(dir,'private/newgame-'+c.report.privateSha256.slice(0,12)+'.json'))));
const h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,h),start=previewActors.length;
try {
 for(const [id,frames] of [[22,19],[14,20],[40,21]]) {
  const hd=spriteHeaders(c.base).find(q=>q.kind==='npc'&&q.id===id),v=[...c.base.slice(hd.offset,hd.offset+5)];
  const actor={key:'household-sentinel-'+id,npc:id,gfx:v[0],asm:v[1],palette:v[2],animation:v[3],size:v[4],frames};
  const old=nativeSpriteBank(c.base,actor),bank={...nativeSpriteBank(c.rom,actor),key:actor.key};
  assert.deepEqual(bank.graphics,old.graphics);assert.deepEqual(bank.assembly,old.assembly);assert.deepEqual(bank.nativeColors,old.nativeColors);
  previewActors.push(actor);dev.previewActor(actor.key);runFrames(s,300);assert.equal(dev.diagnostics().fatal,null);
  const object=dev.diagnostics().preview.object;
  for(let frame=0;frame<frames;frame++) {
   dev.previewFrame(frame);runFrames(s,24);const upload=uploaded(s,bank,object,frame);assert.ok(upload.exact);
   const entry=locate(bank,frame,oamCells(s,bank.nativeColors));
   const pixels=entry?pixelProof(s,[entry],bank.nativeColors):{exact:0,mismatches:0};assert.equal(pixels.mismatches,0);
   rows.push({npc:id,header:v,frame,upload,opaquePixels:pixels.exact,blank:!entry});
  }
  if(v[3]===7) {
   const p=dev.diagnostics().preview,x=object*2;dev.cancel();s.ram.set([0xad,255,0x11,3],p.script);runFrames(s,10);
   for(const l of c.audit.animation.lists.filter(l=>l.mode===1)) {
    const a=c.audit.animation;put16(s.ram,0x1480+x,a.durationBytes);put16(s.ram,0x1500+x,a.offset&65535);put16(s.ram,0x1580+x,a.durationOffset&65535);s.ram[0x1600+x]=l.facing;s.ram[0x1601+x]=0;s.ram[0x1680+x]=l.mode;s.ram[0x1681+x]=255;s.ram[0x1780+x]=1;s.ram[0x10b01+x]=0;
    const period=l.steps.reduce((n,q)=>n+q.ticks,0),ticks=period*2;
    for(let tick=0;tick<ticks;tick++) {
     runFrames(s,1);let t=tick%period,phase=0;while(t>=l.steps[phase].ticks)t-=l.steps[phase++].ticks;
     const frame=l.steps[phase].frame;assert.equal(s.ram[0xf01+x],frame);assert.ok(uploaded(s,bank,object,frame).exact);assert.ok(locate(bank,frame,oamCells(s,bank.nativeColors)));
    }
    timed.push({npc:id,animation:7,facing:l.facing,list:l.steps,ticks,displayDelay:0});
   }
  }
  dev.undo();console.log('Unchanged sentinel NPC'+id+' passed');
 }
} finally {previewActors.splice(start);dev.dispose();h.dispose();}
assert.deepEqual(s.cart.data,c.rom);
const report={...c.report,status:'Unrelated shared assembly, animation and palette sentinels remain exact',scope:'Pinned0758 sentinel sources, not claims about later published art. NPC22 shares asm7/AA7; NPC14 shares AA7 and palette135; NPC40 shares palette131.',uploads:rows.length,exactOpaquePixels:rows.reduce((n,r)=>n+r.opaquePixels,0),timingCases:timed.length,timingTicks:timed.reduce((n,r)=>n+r.ticks,0),rows,timed};
fs.writeFileSync(path.join(dir,'native-verification/shared-sentinels.json'),JSON.stringify(report,null,2)+'\n');
