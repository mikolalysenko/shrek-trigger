import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {privateOverlay,hash} from './private-overlay.mjs';
import {put16} from '../../../engine/rom.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';

const root='assets/imagegen/bakery-children-elder/',{candidates,rom,audit}=await privateOverlay(),out=root+'motion-verification/';await mkdir(out,{recursive:true});
assert.equal(hash(rom),JSON.parse(await readFile(root+'native-verification/manifest.json')).privateRomSha256);
const s=await createCore(rom);await newGame(s);const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),traces=[],sourcePrograms=[];
let totalTicks=0;
for(const[index,c]of candidates.entries()){
 const a=audit.families[index],stride=a.source.animationBytes/4,modes=[...Array.from({length:4},(_,facing)=>({key:['back','front','left','right'][facing]+'-walk',facing,mode:1})),{key:'blank-hold',facing:1,mode:3},...(index?[{key:'left-head-fragment',facing:2,mode:4},{key:'right-head-fragment',facing:3,mode:4}]:[])];
 const animationSpan=a.source.animationBytes,durationSpan=a.source.durationBytes;
 assert.deepEqual(rom.slice(a.source.animationOffset,a.source.animationOffset+animationSpan),c.base.slice(a.source.animationOffset,a.source.animationOffset+animationSpan));assert.deepEqual(rom.slice(a.source.durationOffset,a.source.durationOffset+durationSpan),c.base.slice(a.source.durationOffset,a.source.durationOffset+durationSpan));
 sourcePrograms.push({key:c.key,animation:c.family.actors[0].animation,animationOffset:a.source.animationOffset,animationBytes:a.source.animationBytes,animationSha256:a.source.animationSha256,durationOffset:a.source.durationOffset,durationBytes:a.source.durationBytes,durationSha256:a.source.durationSha256,readThrough:null});
 for(const m of modes){m.list=[];for(let i=m.mode*4;i<m.mode*4+32;i++){const frame=rom[a.source.animationOffset+m.facing*stride+i],ticks=rom[a.source.durationOffset+i];if(frame===255||!ticks)break;assert.ok(frame<c.frames.length,'Original list remains inside native frame allocation');m.list.push({frame,ticks,programIndex:i});}assert.ok(m.list.length);}
 d.previewActor(c.family.actors[0].key);runFrames(s,300);const preview=d.diagnostics().preview,x=preview.object*2;assert.equal(preview.object,15);d.cancel();s.ram.set([0xad,255,0x11,3],preview.script);runFrames(s,10);
 for(const m of modes){
  put16(s.ram,0x1480+x,stride);put16(s.ram,0x1500+x,a.source.animationOffset&65535);put16(s.ram,0x1580+x,a.source.durationOffset&65535);s.ram[0x1600+x]=m.facing;s.ram[0x1601+x]=0;s.ram[0x1680+x]=m.mode;s.ram[0x1681+x]=255;s.ram[0x1780+x]=1;s.ram[0x10b01+x]=0;
  const rawTicks=[],period=m.list.reduce((n,e)=>n+e.ticks,0);
  for(let tick=0;tick<180;tick++){runFrames(s,1);assert.equal(d.diagnostics().fatal,null);const r={tick,frame:s.ram[0xf01+x],index:s.ram[0x1681+x],timer:s.ram[0x1601+x]};let t=tick%period,frame;for(const e of m.list){frame=e.frame;if(t<e.ticks)break;t-=e.ticks;}assert.equal(r.frame,frame,c.key+'/'+m.key+' original native timing at'+tick);rawTicks.push(r);totalTicks++;}
  assert.ok(m.list.every(e=>rawTicks.some(t=>t.frame===e.frame)));const transitions=rawTicks.filter((r,i)=>!i||r.frame!==rawTicks[i-1].frame);traces.push({actor:c.key,npc:c.family.actors[0].npc,...m,period,transitions,rawTicks});console.log(c.key+'/'+m.key+': '+m.list.map(e=>e.frame+'/'+e.ticks).join(' '));
 }d.undo();
}
assert.deepEqual(s.cart.data,rom);d.dispose();h.dispose();
await writeFile(out+'manifest.json',JSON.stringify({status:'Original native timed lists verified through actual field NPC loaders',privateRomSha256:hash(rom),nativeTimedTicks:totalTicks,scenarios:traces,sourcePrograms,cartridgeUnchanged:true,scope:'Private solo field animation execution; original pointers and ordinary looping mode state, no per-frame pose injection. Full feast/chapter event transitions remain unproven.'},null,2)+'\n');console.log(JSON.stringify({scenarios:traces.length,nativeTimedTicks:totalTicks,status:'passed'}));
