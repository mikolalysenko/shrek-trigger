import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {skyDrakes,skyDrakeFamilies} from '../content/sky-drakes.js';
import {skyDrakeSprite,skyDrakeWorld} from '../engine/sky-drake-art.js';
import {compileSkyDrakeWorld} from '../engine/sky-drakes.js';
import {patchActorFamilies} from '../engine/actor-families.js';
import {bakeryCheckpoints,seedBakeryCheckpoint} from '../engine/bakery-checkpoints.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {areas} from '../content/areas.js';
import {recruitSkyDrakes,flyToFurnaceLair} from './bakery-return-controller.mjs';
import {rasterArtInfo} from '../engine/raster-art.js';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
test('sky drakes fit the source banks and retain unrelated palettes, animation programs and world data',()=>{
 // The generated field drake has more unique tiles than the stock bank, so it streams raw from ROM (gfx42) instead of using the field heap.
 const a=b.audit.bakeryActors.drakes.actors[0];assert.equal(a.frames,4);assert.equal(a.cells,8);assert.equal(a.graphicsStorage,'direct-rom');
 const info=rasterArtInfo('sky-drake');assert.equal(info.sourceType,'image-generation');assert.equal(info.frames,4);assert.equal(info.sequences.native[1].length,4);assert.deepEqual(info.palette,skyDrakes[0].colors);
 assert.deepEqual(b.audit.bakeryActors.drakes.world.rasterCoverage,{rasterFrames:9,proceduralFrames:0,blankFrames:0,sources:rasterArtInfo('sky-drake-world').provenance});
 for(const p of[0x24f000+15*5,0x24f000+219*5])assert.deepEqual(b.rom.slice(p,p+5),b.base.slice(p,p+5));
 const pal=0x240000+u16(b.base,0x242a00+129*2);assert.deepEqual(b.rom.slice(pal,pal+24),b.base.slice(pal,pal+24));
 const anim=0x240000+u16(b.base,0x242600+56*2),end=0x240000+u16(b.base,0x242600+57*2);assert.deepEqual(b.rom.slice(anim,end),b.base.slice(anim,end));
 const c=compileSkyDrakeWorld(b.base),old=decompress(b.base,fileOffset(u24(b.base,0x6fe0e))).bytes,now=decompress(b.rom,fileOffset(u24(b.rom,0x6fe0e))).bytes;
 assert.equal(c.poses,9);assert.equal(c.tiles.length,88);assert.equal(now.length,4096);assert.deepEqual(now,c.graphics);
 for(let t=0;t<128;t++)if(!c.tiles.includes(t))assert.deepEqual(now.slice(t*32,t*32+32),old.slice(t*32,t*32+32));
 for(const facing of['front','back','left'])for(let f=0;f<3;f++)assert.ok(skyDrakeWorld(facing,f).every(k=>!k||k>=8&&k<=15));
 const world=0x60000+u16(b.base,0x6fd06);assert.deepEqual(b.rom.slice(world,world+24),b.base.slice(world,world+24));
 const bad=b.base.slice();bad[0x60000+u16(b.base,0x6fd00)+12]=10;assert.throws(()=>compileSkyDrakeWorld(bad),/ownership/);
 const badFamily=structuredClone(skyDrakeFamilies);badFamily[0].actors[0].colors[0]='000000';assert.throws(()=>patchActorFamilies(b.base,badFamily,skyDrakeSprite,()=>0x300000,()=>{},b.records,{streamedGraphics:new Set([42])}),/palette has another owner/);
});

test('all four sky-drake poses upload and display their exact eight-cell indexed artwork',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),a=skyDrakes[0],original=s.cart.data.slice();
 d.previewActor(a.key);runFrames(s,300);const gfx=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+a.gfx*3),b.rom)).bytes,asm=cartridgeOffset(u24(b.rom,0x242300+a.asm*3),b.rom);
 for(let f=0;f<4;f++){
  d.previewFrame(f);runFrames(s,48);assert.equal(s.ram[0xf1f],f);assert.equal(u16(s.ram,0x141e),u16(b.rom,0x242a00+a.palette*2));
  const expected=[];for(let i=0;i<32;i++){const t=u16(b.rom,asm+f*80+i*2);for(let v of gfx.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}expected.push(v);}}
  const base=u16(s.ram,0xd1e)*32,v=new Uint8Array(s.ppu.vram.buffer);assert.deepEqual(Uint8Array.from([0,256,512,768].flatMap(o=>[...v.slice(base+o,base+o+256)])),Uint8Array.from(expected));
  const pixels=skyDrakeSprite(a.art,f),rgba=new Uint8Array(512*480*4),colors=new Map();s.setPixels(rgba);
  for(let y=0;y<48;y++)for(let x=0;x<80;x++)if(pixels[y*80+x]){const k=pixels[y*80+x],p=((103+y)*2*512+(160+x)*2)*4,rgb=rgba[p]<<16|rgba[p+1]<<8|rgba[p+2];if(colors.has(k))assert.equal(rgb,colors.get(k),`frame ${f} at ${x},${y}`);else colors.set(k,rgb);}
  assert.equal(new Set(colors.values()).size,colors.size);assert.equal(colors.size,new Set(pixels.filter(Boolean)).size);await screenshot(s,`.local/qa/sky-drake-native-${f}.png`);
 }
 assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();d.dispose();h.dispose();
});

test('the summit shortcut recruits Mongo through the native scene, flies all nine poses, lands and restores exactly',async()=>{
 const r=new Uint8Array(0x20000);r[0x10160]=255;r[0x101df]=255;r[0x100ee]=173;seedBakeryCheckpoint(r,'bakery-drakes');
 assert.equal(r[0x10160],239);assert.equal(r[0x101df],251);assert.equal(r[0x100ee],173);assert.equal(r[0x29af],248);assert.deepEqual([...r.slice(0x2980,0x2983)],bakeryCheckpoints['bakery-drakes'].party);
 const s=await bedroom(b.rom),h=installHooks(s,specs),original=s.cart.data.slice();let before;
 h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});const d=createDevTools(s,h);d.jump(areas.find(a=>a.bakeryScene==='bakery-drakes'));runFrames(s,400);
 const io={read:(a,n=1)=>n===2?u16(s.ram,a):s.ram[a],bytes:(a,n)=>s.ram.slice(a,a+n),hold:(k,n)=>runFrames(s,n,k),wait:n=>runFrames(s,n),tap:(k=256,n=100)=>{runFrames(s,3,k);runFrames(s,n);},shot:k=>screenshot(s,'.local/qa/'+k+'.png')};
 await recruitSkyDrakes(io);const bank=compileSkyDrakeWorld(b.base).graphics,poses=new Set();
 for(const[name,key]of[['front',32],['back',16],['left',64],['right',128]]){
  runFrames(s,20,key);for(let n=0;n<64;n++){
   runFrames(s,1,key);assert.deepEqual(new Uint8Array(s.ppu.vram.buffer).slice(0,4096),bank,'native mount bank');
   const cells=[];for(let i=0;i<256;i+=2){const w=s.ppu.oam[i+1];if((w&0xf00)===0x800&&(s.ppu.oam[i]>>8)<210)cells.push(w&255);}
   poses.add((name==='right'?'left':name)+':'+cells.sort((a,b)=>a-b).join(','));
  }
  await io.shot('sky-drake-world-'+name);
 }
 assert.equal(poses.size,9);await flyToFurnaceLair(io);assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();
});
