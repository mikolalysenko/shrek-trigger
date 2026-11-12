import {cartridgeOffset} from '../engine/expanded-rom.js';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {withIndependentController} from './independent-controller.mjs';
import {seedFortressCheckpoint} from '../engine/fortress-checkpoints.js';
import {areas} from '../content/areas.js';
import {skyDrakes} from '../content/sky-drakes.js';
import {skyDrakeSprite} from '../engine/sky-drake-art.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {interruptFarquaadRitual} from '../tests/fortress-controller.mjs';
import {wakeAfterRitual,visitBurnedBakery,climbDrakeNest,recruitSkyDrakes,flyToFurnaceLair,rescueBakeryPrisoners,followGingy,openIronPassage,completeFurnaceLair} from '../tests/bakery-return-controller.mjs';
import {quantity} from '../tests/bakery-chapter-controller.mjs';

export async function checkIndependentBakeryReturn(options){
 const{out,checkpoint,name}=options,routesOnly=options.routesOnly??true;if(!checkpoint)throw Error('Second Bakery checks require a bedroom prepared on this cartridge');
 const rom=options.built?.rom??new Uint8Array(await readFile(options.rom));
 return withIndependentController(options,async({request,write,controller:io})=>{
  // Reuse the ordinary kitchen NPC for four isolated native pose checks.
  // This diagnostic setup is separate from the connected controller run.
  await request({op:'loadstate',file:options.previewCheckpoint??path.join(path.dirname(checkpoint),'bedroom.state')});assert.equal(await io.read(0x100,2),2);
  await write(0x1238e,[0xe0,1,2,8,8,0xb2]);
  if(!routesOnly){
  // Catch the idle loop before the caretaker's approach conversation starts.
  // Native music loading changes the map-entry duration across cartridges.
  for(let n=0;n<400&&await io.read(0x119e,2)!==0x57d;n++)await io.wait(1);
  assert.equal(await io.read(0x119e,2),0x57d);assert.equal(await io.read(0x1180,2),0x25c);
  const controller=0x12001+await io.read(0x1180,2),actor=0x12001+await io.read(0x119e,2);
  assert.ok(controller>=0x12200&&controller<0x13000&&actor>=0x12200&&actor<0x13000);
  await write(controller,[0xb2]);await write(actor,[0x82,8,0x33,1,0x8b,12,8,0xa6,1,0xac,1,0xad,1,0x11,5]);await io.wait(40);
  // In-place 82 reloads retain the old four-cell tile slot. Match the native
  // eight-cell allocator's free pair (12/13), preserving the cat in slot 25.
  // Only diagnostic allocation descriptors change; the native streamer still
  // decodes, flips and uploads every tile from the unmodified cartridge.
  assert.deepEqual(await io.bytes(0xb94,2),[128,128]);assert.equal(await io.read(0xba0),30);
  await write(0xb94,[30,30]);await write(0xba0,[128]);await write(0xd1e,[192,0]);await write(0x171e,[128,1]);await write(0xf1f,[255]);
  const a=skyDrakes[0],gfx=decompress(rom,cartridgeOffset(u24(rom,0x242000+a.gfx*3),rom)).bytes,asm=fileOffset(u24(rom,0x242300+a.asm*3));
  for(let f=0;f<4;f++){
   await write(actor+10,[f]);await io.wait(f===0?600:48);assert.equal(await io.read(0xf1f),f);assert.equal(await io.read(0x141e,2),u16(rom,0x242a00+129*2));
   const key='sky-drake-'+f;await io.shot(key);
   if(name==='snes9x'){
    const expected=[];for(let i=0;i<32;i++){const t=u16(rom,asm+f*80+i*2);for(let v of gfx.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}expected.push(v);}}
    const base=await io.read(0xd1e,2)*32,actual=[];for(const off of[0,256,512,768])actual.push(...(await request({op:'read',mem:'vram',addr:base+off,len:256})).value);assert.deepEqual(actual,expected,key+' uploaded tiles');
   }
   const png=PNG.sync.read(await readFile(path.join(out,key+'.png'))),pixels=skyDrakeSprite(a.art,f),colors=new Map();
   for(let y=0;y<48;y++)for(let x=0;x<80;x++)if(pixels[y*80+x]){const k=pixels[y*80+x],p=((95+y)*png.width+160+x)*4,rgb=png.data[p]<<16|png.data[p+1]<<8|png.data[p+2];if(colors.has(k))assert.equal(rgb,colors.get(k),key+' pixel '+x+','+y);else colors.set(k,rgb);}
   assert.equal(new Set(colors.values()).size,colors.size);assert.equal(colors.size,new Set(pixels.filter(Boolean)).size);
  }
  }
  await request({op:'loadstate',file:checkpoint});assert.equal(await io.read(0x100,2),2);
  const old=Uint8Array.from(await io.bytes(0,0x20000)),ram=old.slice();seedFortressCheckpoint(ram,'fortress-ritual');
  for(let id=0;id<6;id++)ram[0x2600+id*80+0x28]=110;
  for(let p=0;p<ram.length;){if(ram[p]===old[p]){p++;continue;}const start=p++;while(p<ram.length&&ram[p]!==old[p])p++;await write(start,ram.slice(start,p));}
  const area=areas.find(a=>a.fortressScene==='fortress-ritual'),map=area.id|((area.facing??1)<<9);await write(0x1238e,[0xe0,map&255,map>>8,area.x,area.y,0xb2]);await io.wait(400);
  const ritual=await interruptFarquaadRitual(io),wake=await wakeAfterRitual(io),village=await visitBurnedBakery(io),climb=await climbDrakeNest(io),recruit=await recruitSkyDrakes(io);
  const worldGraphics=decompress(rom,fileOffset(u24(rom,0x6fe0e))).bytes;
  for(const[key,buttons]of[['front',32],['back',16],['left',64],['right',128]]){
   await io.hold(buttons,84);await io.wait(24);await io.shot('sky-drake-world-'+key);
   if(name==='snes9x')assert.deepEqual(Uint8Array.from((await request({op:'read',mem:'vram',addr:0,len:4096})).value),worldGraphics,'native drake world bank '+key);
  }
  const flight=await flyToFurnaceLair(io);await request({op:'savestate',name:'bakery-lair-entry'});
  let prisoners,gingy,passage,lair,heals;
  try{
   prisoners=await rescueBakeryPrisoners(io);gingy=await followGingy(io);await request({op:'savestate',name:'bakery-gingy-open'});
   const onions=await quantity(io,197);passage=await openIronPassage(io);lair=await completeFurnaceLair(io,rom);
   heals=[...passage.encounters,...lair.encounters].reduce((n,e)=>n+e.heals,0);assert.ok(heals>0);assert.equal(await quantity(io,197),onions-heals);
  }
  catch(error){await request({op:'savestate',name:'bakery-return-failure'});await io.shot('bakery-return-failure');throw error;}
  return{poses:routesOnly?0:4,ritual,wake,village,climb,recruit,flight,prisoners,gingy,passage,lair,heals};
 });
}
