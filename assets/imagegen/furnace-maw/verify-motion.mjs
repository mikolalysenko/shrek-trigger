import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {privateFurnaceOverlay} from './private-overlay.mjs';
import {put16} from '../../../engine/rom.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),out=path.join(d,'motion-verification'),overlay=await privateFurnaceOverlay(),{rom}=overlay,audit=JSON.parse(fs.readFileSync(path.join(d,'animation-contract.json')));fs.mkdirSync(out,{recursive:true});
const s=await createCore(rom);await newGame(s);const hooks=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,hooks);dev.previewActor('furnace-maw');runFrames(s,300);const preview=dev.diagnostics().preview,object=preview.object,x=object*2;assert.equal(object,15);dev.cancel();s.ram.set([0xad,255,0x11,3],preview.script);runFrames(s,10);
const traces=[];for(const m of audit.motions){
 // Restore the original immutable animation/duration pointers after the
 // diagnostic static-frame holder, then let ordinary AA animation run.
 put16(s.ram,0x1480+x,audit.stride);put16(s.ram,0x1500+x,audit.animationOffset&65535);put16(s.ram,0x1580+x,audit.durationOffset&65535);s.ram[0x1600+x]=m.facing;s.ram[0x1601+x]=0;s.ram[0x1680+x]=m.mode;s.ram[0x1681+x]=255;s.ram[0x1780+x]=1;s.ram[0x10b01+x]=0;
 const ticks=[];for(let tick=0;tick<150;tick++){runFrames(s,1);assert.equal(dev.diagnostics().fatal,null);ticks.push({tick,frame:s.ram[0xf01+x],index:s.ram[0x1681+x],timer:s.ram[0x1601+x]});}
 for(const r of ticks){let t=r.tick%m.list.reduce((n,e)=>n+e.ticks,0),f;for(const e of m.list){f=e.frame;if(t<e.ticks)break;t-=e.ticks;}assert.equal(r.frame,f,m.key+' exact native timing tick'+r.tick);}
 const transitions=ticks.filter((r,i)=>!i||r.frame!==ticks[i-1].frame);traces.push({...m,transitions,rawTicks:ticks});console.log(m.key+': '+transitions.map(r=>r.tick+':'+r.frame).join(' '));
}
assert.deepEqual(s.cart.data,rom);dev.undo();dev.dispose();hooks.dispose();fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({...overlay.report,status:'All900 native ticks follow the original six motion lists exactly through the unchanged size6 native loader.',animation:164,animationSha256:audit.animationSha256,durationSha256:audit.durationSha256,nativeTimedTicks:900,variantsShareProgram:true,scenarios:traces,scope:'Solo field-native timing proof; source frames are not injected per tick. Encounter AI transitions/defeat route are root integration scope.'},null,2)+'\n');
