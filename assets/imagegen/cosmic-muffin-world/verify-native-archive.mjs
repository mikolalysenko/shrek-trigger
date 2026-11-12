import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import zlib from 'node:zlib';
import {privateOverlay} from './private-overlay.mjs';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {u16,u24} from '../../../engine/rom.js';
import {snapshot,restore} from '../../../engine/save.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),out=path.join(d,'native-verification');fs.mkdirSync(out,{recursive:true});
const c=privateOverlay(),specs=JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json'))),cases=[];
for(const [label,rom]of[['baseline',c.baseline],['candidate',c.rom]]){
 const s=await createCore(rom),checkpoint=path.join(d,'private',label+'-bedroom.json.gz');if(fs.existsSync(checkpoint))restore(s,JSON.parse(zlib.gunzipSync(fs.readFileSync(checkpoint))));else{await newGame(s);fs.writeFileSync(checkpoint,zlib.gzipSync(JSON.stringify(snapshot(s))));}const h=installHooks(s,specs),dev=createDevTools(s,h);dev.jump({id:218,x:56,y:43,facing:0,futureScene:'future-archive'});runFrames(s,400);runFrames(s,24,16);cases.push({label,s,h,dev,worldTicks:0,frames:[],firstBody:null,firstFront:null});
}
let fullUploadTicks=0,exactOamTicks=0,pixelChecks=0,occludedPixels=0,overlapExclusions=0,unchangedOcclusionExclusions=0;const phases=[];
function capture(s,name){const p=new PNG({width:512,height:480});s.setPixels(p.data);fs.writeFileSync(path.join(out,name+'.png'),PNG.sync.write(p));return p;}
function cells(s){const a=[];for(let k=0;k<128;k++){const i=k*2,ex=s.ppu.oam[i+1]>>8,tile=s.ppu.oam[i+1]&255;let x=s.ppu.oam[i]&255;x|=(s.ppu.highOam[i>>4]>>(i&15)&1)<<8;if(x>255)x-=512;let y=s.ppu.oam[i]>>8;if(y>=240)y-=256;const big=!!(s.ppu.highOam[i>>4]>>(i&15)&2),size=s.ppu.spriteSizes[s.ppu.objSize+(big?8:0)]*8;if(y+size>0&&y<224&&x+size>0&&x<256)a.push({index:k,x,y,ex,tile,size});}return a;}
const isBody=o=>o.ex===0x32&&o.tile<=14&&!(o.tile&1),isFront=o=>o.ex===0x32&&[96,98,100,102].includes(o.tile);
for(let step=0;step<230&&cases[0].s.ram[0x10000]!==54;step++){
 for(const q of cases)runFrames(q.s,3,256);
 for(let n=0;n<100;n++){
  const displayedCells=cells(cases[1].s),displayedPalette=cases[1].s.ppu.cgram.slice(),displayedBrightness=cases[1].s.ppu.brightness;
  for(const q of cases)runFrames(q.s,1);
  const a=cases[0].s,s=cases[1].s;assert.equal(u16(s.ram,0x100),u16(a.ram,0x100));assert.equal(s.ram[0x10000],a.ram[0x10000]);
  if(u16(s.ram,0x100)!==503)continue;
  const tick=++cases[1].worldTicks;cases[0].worldTicks++;
  assert.deepEqual(s.ppu.oam,a.ppu.oam,'Original OAM choreography tick '+tick);assert.deepEqual(s.ppu.highOam,a.ppu.highOam);assert.deepEqual(s.ppu.cgram,a.ppu.cgram,'Shared palettes untouched tick '+tick);exactOamTicks++;
  const o=displayedCells,body=o.filter(isBody),front=o.filter(isFront);
  if(body.length===8){assert.deepEqual(new Uint8Array(s.ppu.vram.buffer).slice(0,8192),c.graphics);fullUploadTicks++;if(cases[1].firstBody===null)cases[1].firstBody=tick;}
  if(front.length===4&&cases[1].firstFront===null)cases[1].firstFront=tick;
  const want=body.length===8&&(tick===cases[1].firstBody+30||front.length===4&&[0,8,16,24,40,160].includes(tick-cases[1].firstFront));
  if(!want)continue;
  const name='world-'+String(tick).padStart(4,'0'),originalImg=capture(a,name+'-baseline'),img=capture(s,name);
  const selected=o.filter(o=>isBody(o)||isFront(o)),targets=[];
  for(const cell of selected){const origin=isBody(cell)?{w:64,p:c.body,x:(cell.tile%8)/2*16,y:Math.floor(cell.tile/8)*16}:{w:32,p:c.front,x:Math.floor((cell.tile-96)/4)*16,y:(cell.tile-96)%4/2*16};for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=origin.p[(origin.y+y)*origin.w+origin.x+x];if(!v)continue;const sx=cell.x+x,sy=cell.y+y;if(sx<0||sx>=256||sy<1||sy>=224)continue;targets.push({cell:cell.index,x:sx,y:sy,value:v});}}
  const seen=new Set();let checks=0,occluded=0,overlap=0,unchangedOcclusion=0;
  for(const t of targets.sort((a,b)=>a.cell-b.cell)){
   const key=t.y*256+t.x;if(seen.has(key))continue;seen.add(key);
   const blocker=o.some(o=>o.index<t.cell&&t.x>=o.x&&t.x<o.x+o.size&&t.y>=o.y&&t.y<o.y+o.size&&!selected.includes(o));
   if(blocker){occluded++;overlap++;continue;}
   const color=displayedPalette[144+t.value],rgb=[0,5,10].map(n=>((color>>n&31)*s.ppu.brightnessMults[displayedBrightness])&255),p=(((t.y+1)*2+(s.ppu.frameOverscan?0:14))*512+t.x*2)*4;
   if(rgb.every((v,i)=>v===img.data[p+i]))checks++;
   else{assert.ok([0,1,2].every(i=>img.data[p+i]===originalImg.data[p+i]),`Unexplained changed world pixel ${tick}:${t.x},${t.y} expected${rgb} got${Array.from(img.data.slice(p,p+3))} original${Array.from(originalImg.data.slice(p,p+3))}`);occluded++;unchangedOcclusion++;}
  }
  pixelChecks+=checks;occludedPixels+=occluded;overlapExclusions+=overlap;unchangedOcclusionExclusions+=unchangedOcclusion;phases.push({tick,bodyCells:body.length,frontCells:front.length,bodyRoot:body.length?[body[0].x+32,body[0].y]:null,frontRoot:front.length?[front[0].x+16,front[0].y+16]:null,exactDisplayedOpaquePixels:checks,excludedPixels:occluded,conservativeObjBoundsExclusions:overlap,unchangedNativeForegroundOcclusion:unchangedOcclusion,capture:name+'.png'});console.log(name,checks,front.length);
 }
}
for(const q of cases){assert.equal(q.s.ram[0x10000],54);assert.equal(q.dev.diagnostics().fatal,null);q.dev.dispose();q.h.dispose();}
assert.ok(phases.length>=5);assert.ok(fullUploadTicks>1000);
const report={...c.report,setup:'Existing future-archive diagnostic checkpoint at location218; all recording scenes then follow the original native events with normal controller confirm presses.',completion:'Both baseline and candidate return to218 and advance native story53→54.',exactOamAndPaletteTicks:exactOamTicks,exactFull8192ByteWorldUploads:fullUploadTicks,exactDisplayedOpaquePixels:pixelChecks,excludedPixels:occludedPixels,conservativeObjBoundsExclusions:overlapExclusions,unchangedNativeForegroundOcclusion:unchangedOcclusionExclusions,firstBodyTick:cases[1].firstBody,firstFrontTick:cases[1].firstFront,phases,limits:['This proves the original archive recording path, not every playable1999 approach or bad-ending branch.','Effect overlap is excluded from direct framebuffer comparisons while all original effect bytes and OAM coordinates are exact.']};fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
