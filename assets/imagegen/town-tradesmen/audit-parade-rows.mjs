import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {hash,dir} from './private-overlay.mjs';
import {oamCells,locate,pixelProof} from './native-proof-utils.mjs';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {createCore} from '../../../scripts/core.mjs';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {runFrames} from '../../../engine/automation.js';
import {restore} from '../../../engine/save.js';
import {u16} from '../../../engine/rom.js';

const baseline=JSON.parse(await readFile(dir+'/proof-baseline.json')),rom=new Uint8Array(await readFile(baseline.path)),saved=JSON.parse(await readFile(dir+'/private-qa/newgame-'+baseline.sha256.slice(0,12)+'.json'));assert.equal(hash(rom),baseline.sha256);
const cases=[];
function allOam(s){
 const out=[],v=new Uint8Array(s.ppu.vram.buffer);
 for(let entry=0;entry<128;entry++){
  const lo=s.ppu.oam[entry*2],word=s.ppu.oam[entry*2+1],hi=s.ppu.highOam[entry>>3]>>((entry&7)*2)&3,size=hi&2?16:8;
  let x=(lo&255)|(hi&1)<<8;if(x>255)x-=512;const y=lo>>8;if(x<=-size||x>=256||y>=224)continue;
  const palette=word>>9&7,attrs=word>>8,base=s.ppu.sprAdr1*2+(attrs&1?s.ppu.sprAdr2*2:0),tile=word&255,pixels=new Uint8Array(256);
  for(let yy=0;yy<size;yy++)for(let xx=0;xx<size;xx++){const tx=attrs&64?size-1-xx:xx,ty=attrs&128?size-1-yy:yy,t=tile+(tx>>3)+(ty>>3)*16;for(let b=0;b<4;b++)pixels[yy*16+xx]|=(v[base+t*32+(b>>1)*16+(ty&7)*2+(b&1)]>>(7-(tx&7))&1)<<b;}
  if(pixels.some(Boolean))out.push({entry,x,y,palette,size,tile:word&511,pixels});
 }return out;
}
for(const view of [{name:'center',x:20,y:32},{name:'west',x:12,y:33},{name:'east',x:26,y:30}]){
 const s=await createCore(rom);restore(s,saved);const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),loads=[],assignments=[];
 let tick=0;
 h.on('event.init',e=>{if(e.location!==80)return;if([0x81,0x82,0x57,0x5c,0x62].includes(e.opcode))loads.push({...e,tick,id:({0x57:0,0x5c:1,0x62:2})[e.opcode]??s.ram[0x12002+e.scriptPC],kind:e.opcode===0x82?'npc':'pc'});if(e.opcode===0x33)assignments.push({...e,tick,row:s.ram[0x12002+e.scriptPC],sourcePointer:u16(s.ram,0x1400+e.object*2)});});
 s.ram[0x10000]=200;s.ram[0x1006d]=64;d.jump({id:80,x:view.x,y:view.y,facing:0,party:[0,1,2],endgame:true});for(;tick<1100;tick++){runFrames(s,1);assert.equal(d.diagnostics().fatal,null);}assert.equal(u16(s.ram,0x100),80);
 const cells=oamCells(s),all=allOam(s),objects=loads.map(l=>{const x=l.object*2,header=l.kind==='npc'?[...rom.slice(0x24f023+l.id*5,0x24f023+l.id*5+5)]:null;return{object:l.object,kind:l.kind,id:l.id,header,sourceLoadBody:l.scriptPC,explicitRowCommand:assignments.find(a=>a.object===l.object),runtimeRow:s.ram[0xf81+x]>>1&7,palettePointer:u16(s.ram,0x1400+x),nativeFrame:s.ram[0xf01+x],world:[u16(s.ram,0x1800+x)>>4,u16(s.ram,0x1880+x)>>4],tileAllocation:u16(s.ram,0xd00+x)};});
 const bankFor=o=>nativeSpriteBank(rom,{gfx:o.header[0],asm:o.header[1],palette:o.header[2],size:o.header[4],frames:o.nativeFrame+1});
 let camera;
 for(const id of [39,215,0,213,79]){const o=objects.find(o=>o.kind==='npc'&&o.id===id);if(!o||o.nativeFrame===255)continue;const m=locate(bankFor(o),o.nativeFrame,cells);if(m){camera={referenceObject:o.object,world:o.world,origin:m.origin,offset:o.world.map((n,i)=>n-m.origin[i])};break;}}
 assert.ok(camera,'At least one unique audited reference actor is fully on screen');
 for(const o of objects){
  if(o.kind!=='npc'){o.visibleScope='PC rows are covered by actual OAM occupancy below; no source-cell ownership reconstruction for this PC.';continue;}
  if(o.nativeFrame===255){o.sourceVisible=false;o.nativeFrameNotResident=true;o.visibleScope='Native cached-frame sentinel255: no source-frame visibility claim. Palette row assignment still executed.';continue;}
  const expected=nativeSpriteCells(bankFor(o),o.nativeFrame).filter(c=>c.pixels.some(Boolean));
  const origin=o.world.map((n,i)=>n-camera.offset[i]),matched=[];
  for(const c of expected){const m=cells.find(m=>m.x===origin[0]+c.x&&m.y===origin[1]+c.y&&m.palette===o.runtimeRow&&hash(m.pixels)===hash(c.pixels));if(m)matched.push(m);}
  const words=[...s.ppu.cgram.slice(129+o.runtimeRow*16,141+o.runtimeRow*16)],pixels=pixelProof(s,[{key:'object'+o.object,cells:matched}],words);
  Object.assign(o,{expectedScreenOrigin:origin,matchingNativeOamCells:matched.map(c=>c.entry),visibleExactActualColorPixels:pixels.exact,occludedOrDifferent:pixels.mismatches,sourceVisible:pixels.exact>0,source133Requested:o.header[2]===133,actualRowMatchesSource:Array.from({length:12},(_,i)=>u16(rom,0x240000+o.palettePointer+i*2)).every((w,i)=>w===words[i])});
 }
 const rows=Array.from({length:8},(_,row)=>{const rowCells=all.filter(c=>c.palette===row),words=[...s.ppu.cgram.slice(129+row*16,144+row*16)],pixels=pixelProof(s,[{key:'row'+row,cells:rowCells}],words);return{row,cgramWords:words,explicitObjects:assignments.filter(a=>a.row===row).map(a=>a.object),runtimeObjects:objects.filter(o=>o.runtimeRow===row).map(o=>o.object),onscreenNonemptyOamEntries:rowCells.map(c=>c.entry),visibleActualColorPixels:pixels.exact,occludedOrDifferent:pixels.mismatches};});
 const png=new PNG({width:512,height:480});s.setPixels(png.data);const screenshot=dir+'/scene-verification/parade-rows-'+view.name+'.png';writeFileSync(screenshot,PNG.sync.write(png));
 cases.push({view,checkpoint:{story:200,flag7F006D:64,party:[0,1,2],endgameKit:true},nativeTicks:tick,camera,objects,objectsWithoutSpriteLoad:Array.from({length:42},(_,i)=>i).filter(i=>!objects.some(o=>o.object===i)),assignments,rows,screenshot,coVisibleSpecial:objects.filter(o=>o.kind==='npc'&&[0,39,79,215].includes(o.id)&&o.sourceVisible).map(o=>({npc:o.id,object:o.object,row:o.runtimeRow,visiblePixels:o.visibleExactActualColorPixels}))});assert.deepEqual(s.cart.data,rom);d.dispose();h.dispose();console.log(JSON.stringify({view:view.name,visible:cases.at(-1).coVisibleSpecial,rows:rows.filter(r=>r.visibleActualColorPixels).map(r=>r.row)}));
}
await writeFile(dir+'/scene-verification/parade-row-ownership.json',JSON.stringify({status:'Read-only af338 authored post-parade row occupancy diagnosis',baseline,location:80,cases,scope:'Three explicit camera entry checkpoints of the same original post-parade branch. All object palette assignments are actual initialization and native RAM; visibility is exact source-cell match plus actual PPU pixels for NPCs, with all OAM row occupancy recorded. A row absent from these views is not globally free in every route or parade phase. No active fix or source changes.'},null,2)+'\n');
