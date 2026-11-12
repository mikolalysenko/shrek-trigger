import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {privateOverlay} from './private-overlay.mjs';
import {uploaded,oamCells,locate,pixelProof} from './native-proof-utils.mjs';
import {colorWord} from '../../imagegen/cosmic-muffin-interior/sample-body.mjs';
import {finalePalette} from '../../../engine/finale.js';
import {createCore} from '../../../scripts/core.mjs';
import {restore,snapshot} from '../../../engine/save.js';
import {runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {u16,u24} from '../../../engine/rom.js';

const d=import.meta.dirname,root=path.resolve(d,'../../..'),c=privateOverlay();
const s=await createCore(c.rom),out=path.join(d,'scene-verification');
restore(s,JSON.parse(fs.readFileSync(path.join(d,'private/after-battle.json'))));
assert.equal(u16(s.ram,0x100),475);assert.equal(s.ram[0x117]&1,0);
assert.deepEqual([...s.ram.slice(0xaf02,0xaf0a)],new Array(8).fill(255));
const h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json'))));
const palette=finalePalette.map(colorWord),raw=u24(c.rom,c.report.streamTable+238*3);
const frames=new Map(),canonicalFrames=new Map(),states=[],events=[],actions=[],phaseRuns=[];
let tick=0,lastTap=-120,lastState='',lastPhase=-1,final=null;
fs.mkdirSync(out,{recursive:true});
const capture=name=>{const p=new PNG({width:512,height:480});s.setPixels(p.data);fs.writeFileSync(path.join(out,name+'.png'),PNG.sync.write(p));};
const animation=process.argv.includes('--animation');
if(animation)for(const name of['emergence','challenge'])fs.mkdirSync(path.join(d,'private',name),{recursive:true});
function animationFrame(name,index){const rgba=new Uint8Array(512*480*4),p=new PNG({width:256,height:240});s.setPixels(rgba);for(let y=0;y<240;y++)for(let x=0;x<256;x++)p.data.set(rgba.subarray((y*2*512+x*2)*4,(y*2*512+x*2)*4+4),(y*256+x)*4);fs.writeFileSync(path.join(d,'private',name,String(index).padStart(4,'0')+'.png'),PNG.sync.write(p));}
h.on('event.init',e=>{if(e.location===475&&e.object===8&&[0xaa,0xab,0xac,0x90,0x91].includes(e.opcode))events.push({tick,...e});});
for(;tick<14000;tick++){
  let keys=0;if(s.ram[0x126]&&tick-lastTap>=120){lastTap=tick;actions.push({tick,keys:256,ticks:3});}
  if(tick-lastTap<3)keys=256;
  runFrames(s,1,keys);
  if(animation&&tick>=500&&tick<1200)animationFrame('emergence',tick-500);
  if(animation&&tick>=2800&&tick<3000)animationFrame('challenge',tick-2800);
  const location=u16(s.ram,0x100),battle=s.ram[0x117]&1;
  const state={tick,location,battle,control:s.ram[0x11f],dialogue:s.ram[0x126],brightness:s.ppu.brightness,formation:[...s.ram.slice(0xaf02,0xaf0a)]};
  const sig=JSON.stringify([state.location,state.battle,state.control,state.dialogue]);
  if(sig!==lastState){states.push(state);lastState=sig;}
  if(location===475){
    const object=8,x=object*2,requested=s.ram[0xf01+x],pointer=s.ram[0x1200+x]*65536+u16(s.ram,0x1280+x);
    if(process.argv.includes('--trace')&&tick%120===0)console.log(JSON.stringify({tick,raw,object,requested,pointer,brightness:s.ppu.brightness,dialogue:s.ram[0x126],other:Array.from({length:12},(_,o)=>({o,f:s.ram[0xf01+o*2],p:s.ram[0x1200+o*2]*65536+u16(s.ram,0x1280+o*2)}))}));
    if(pointer===raw&&requested<8){
      if(requested!==lastPhase){phaseRuns.push({tick,requested,fieldXY:[u16(s.ram,0x1800+x)/16,u16(s.ram,0x1880+x)/16],brightness:s.ppu.brightness});lastPhase=requested;}
      if(process.argv.includes('--trace')&&tick%120===0){const all=locate(c.bank,requested,oamCells(s,null));capture('trace-'+tick);console.log(JSON.stringify({tick,requested,upload:uploaded(s,c.bank,object,requested),anyPalette:all?{origin:all.origin,palette:all.cells[0].palette,colors:Array.from(s.ppu.cgram.slice(129+all.cells[0].palette*16,141+all.cells[0].palette*16))}:null,expectedPalette:palette}));}
      if(s.ppu.brightness===15&&(!frames.has(requested)||!canonicalFrames.has(requested))){
        const part=locate(c.bank,requested,oamCells(s,null));
        if(part){const activePalette=Array.from(s.ppu.cgram.slice(129+part.cells[0].palette*16,141+part.cells[0].palette*16)),pixel=pixelProof(s,[part],activePalette);
          if(pixel.mismatches===0){
            const row={tick,frame:requested,pointer,fieldXY:[u16(s.ram,0x1800+x)/16,u16(s.ram,0x1880+x)/16],origin:part.origin,nativeTilePixelsExact:true,activePalette,originalRevealPaletteEffect:!activePalette.every((v,i)=>v===palette[i]),pixel,cells:part.cells.map(a=>({entry:a.entry,x:a.x,y:a.y,palette:a.palette}))};
            if(!frames.has(requested)){frames.set(requested,row);capture('reveal-native-frame-'+requested);console.log(JSON.stringify({tick,frame:requested,pixels:pixel.exact,fieldXY:row.fieldXY,origin:part.origin}));}
            if(!row.originalRevealPaletteEffect&&!canonicalFrames.has(requested)){canonicalFrames.set(requested,row);capture('reveal-native-frame-'+requested+'-canonical');}
          }
        }
      }
    }
  }
  if(location===479&&battle&&state.formation.every((v,i)=>v===[206,255,255,255,237,255,239,255][i])&&s.ppu.brightness===15){final=state;capture('native-final-formation');fs.writeFileSync(path.join(d,'private/reveal-battle.json'),JSON.stringify(snapshot(s)));break;}
}
assert.ok(final,'Original reveal reaches the final battle');
assert.deepEqual(final.formation,[206,255,255,255,237,255,239,255]);
fs.writeFileSync(path.join(d,'private/reveal-trace.json'),JSON.stringify({frames:[...frames.values()],canonicalFrames:[...canonicalFrames.values()],phaseRuns,states,events,final},null,2));
for(const f of[0,1,3,4,5,6,7])assert.ok(frames.has(f),'Original reveal displays source-exact native frame '+f);
for(const f of[3,4,5,6,7])assert.ok(canonicalFrames.has(f),'Later reveal phase uses unchanged canonical palette '+f);
const report={...c.report,status:'Original 475 victory continuation displays the approved Tyson source and reaches original 479 final formation',setup:'Restore the genuine 19-tech / 3-MegaElixir interior victory checkpoint produced by verify-scene; confirm input only when native dialogue is active.',controllerOnlyAfterDiagnosticEntry:true,ticks:tick+1,confirmTaps:actions.length,actions,events,phaseRuns,states,frames:[...frames.values()].sort((a,b)=>a.frame-b.frame),canonicalColorFrames:[...canonicalFrames.values()].sort((a,b)=>a.frame-b.frame),paletteScope:'Original0/1 emergence and early3 use the original white-silhouette palette fade. Every source-indexed OAM pixel is exact under the actual native CGRAM; canonical shared233 colors are separately verified on later3/4/5/6/7.',frame2Scope:'Boxing-guard frame2 is present in original animation mode5 and exact native isolated/timed checks; this event continuation does not request mode5.',final,scope:'Actual original475 battle and post-victory reveal after diagnostic475 entry. The preceding full shell/world campaign traversal and all final branch variants remain root integration QA. No event PC, victory flag, formation, AI, palette or actor coordinate was written after diagnostic entry.'};
fs.writeFileSync(path.join(out,'reveal-manifest.json'),JSON.stringify(report,null,2)+'\n');
assert.deepEqual(s.cart.data,c.rom);h.dispose();
console.log(JSON.stringify({status:report.status,ticks:report.ticks,confirmTaps:report.confirmTaps,frames:report.frames.map(a=>a.frame),final}));
