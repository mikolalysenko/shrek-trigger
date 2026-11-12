import {cartridgeOffset} from '../engine/expanded-rom.js';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {validateRom} from '../engine/rom.js';
import {buildPatch} from '../engine/patch.js';
import {snapshot,restore} from '../engine/save.js';
import {newGame,openingReady,finishOpening} from '../engine/automation.js';
import {createCore} from '../scripts/core.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import assert from 'node:assert/strict';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {encode} from '../engine/text.js';

export function assertSpriteGraphicsStorage(built,actor){
  const original=decompress(built.base,fileOffset(u24(built.base,0x242000+actor.gfx*3))).bytes;
  const stream=built.audit.resources.npcGraphicsStreaming?.streams.find(s=>s.gfx===actor.gfx);
  if(!stream){assert.ok(actor.graphicsBytes<=original.length);return;}
  const decoded=decompress(built.rom,cartridgeOffset(u24(built.rom,0x242000+actor.gfx*3),built.rom)).bytes;
  assert.equal(actor.graphicsStorage,'direct-rom');
  assert.equal(stream.bytes,actor.graphicsBytes);assert.ok(stream.bytes<=0x8000);
  assert.deepEqual(built.rom.slice(stream.address,stream.address+stream.bytes),decoded);
  for(const id of actor.enemies??(actor.enemy===undefined?[]:[actor.enemy]))assert.ok(stream.owners.some(o=>o.kind==='enemy'&&o.id===id&&o.assembly===actor.asm));
  for(const id of actor.npcs??(actor.npc===undefined?[]:[actor.npc]))assert.ok(stream.owners.some(o=>o.kind==='npc'&&o.id===id&&o.assembly===actor.asm));
  assert.ok(stream.owners.every(o=>o.size<=2));
}

// A restored stock actor keeps its original graphics packet, assembly frames,
// header, palette and battle name (unless a retained name is given). Its bank
// is not reclaimed, and is streamed only when listed, then with stock pixels.
export function assertStockActors(built,actors,{retainedNames=new Map(),streamed=new Set()}={}){
  const streams=new Map((built.audit.resources.npcGraphicsStreaming?.streams??[]).map(s=>[s.gfx,s]));
  for(const a of actors){
    const gp=0x242000+a.gfx*3,ap=0x242300+(a.sourceAsm??a.asm)*3;
    assert.equal(u24(built.rom,gp),u24(built.base,gp),a.key+' stock graphics pointer');
    assert.equal(u24(built.rom,ap),u24(built.base,ap),a.key+' stock assembly pointer');
    const packet=fileOffset(u24(built.base,gp)),length=decompress(built.base,packet).length;
    assert.deepEqual(built.rom.slice(packet,packet+length),built.base.slice(packet,packet+length),a.key+' stock graphics packet');
    if(a.frames){
      const cells=((a.size??0)&2?3:1)*((a.size??0)&1?8:4),asm=fileOffset(u24(built.base,ap)),bytes=a.frames*cells*10;
      assert.deepEqual(built.rom.slice(asm,asm+bytes),built.base.slice(asm,asm+bytes),a.key+' stock assembly');
    }
    if(streamed.has(a.gfx)){
      const stream=streams.get(a.gfx),stock=decompress(built.base,packet).bytes;assert.ok(stream,a.key+' keeps its raw stream');
      assert.deepEqual(built.rom.slice(stream.address,stream.address+stream.bytes),stock,a.key+' streams stock pixels');
    }else assert.ok(!streams.has(a.gfx),a.key+' bank is not streamed');
    if(a.enemy!==undefined){
      const h=0x24f600+a.enemy*10,n=0xc6500+a.enemy*11,name=retainedNames.get(a.enemy);
      assert.deepEqual(built.rom.slice(h,h+10),built.base.slice(h,h+10),a.key+' enemy header');
      if(name===undefined)assert.deepEqual(built.rom.slice(n,n+11),built.base.slice(n,n+11),a.key+' stock battle name');
      else assert.deepEqual(built.rom.slice(n,n+11),encode(name,{length:11}),a.key+' retained battle name');
    }
    for(const id of a.npcs??[]){const h=0x24f000+(id+7)*5;assert.deepEqual(built.rom.slice(h,h+5),built.base.slice(h,h+5),a.key+' NPC header '+id);}
    const pointer=0x242a00+(a.sourcePalette??a.palette)*2,p=0x240000+u16(built.base,pointer);
    assert.equal(u16(built.rom,pointer),u16(built.base,pointer),a.key+' stock palette pointer');
    assert.deepEqual(built.rom.slice(p,p+24),built.base.slice(p,p+24),a.key+' stock palette');
  }
}

export async function build({cartridge=process.env.SHREK_TEST_CARTRIDGE??'auto'}={}) {
  const base=await validateRom(await readFile('.local/chrono-trigger-usa.sfc'));
  const [techs,layouts]=await Promise.all(['techs','event-layouts'].map(n=>readFile(`content/${n}.json`,'utf8').then(JSON.parse)));
  return {base,...buildPatch(base,{techs,layouts,cartridge})};
}
export async function bedroom(rom) {
  let snes=await createCore(rom);
  try {
    restore(snes,JSON.parse(await readFile('.local/checkpoints/bedroom.json','utf8')));
    if(!openingReady(snes)) {
      await finishOpening(snes);
      await writeFile('.local/checkpoints/bedroom.json',JSON.stringify(snapshot(snes)));
    }
    return snes;
  }catch{/* Rebuild stale, incomplete or absent fixtures on a clean machine. */snes=await createCore(rom);}
  await newGame(snes);
  await mkdir('.local/checkpoints',{recursive:true});
  await writeFile('.local/checkpoints/bedroom.json',JSON.stringify(snapshot(snes)));
  return snes;
}
export async function screenshot(snes,path) {
  const {PNG}=await import('pngjs'),png=new PNG({width:512,height:480});
  snes.setPixels(png.data);await writeFile(path,PNG.sync.write(png));
}
export function settlePreviewFrame(snes,dev,frame,{limit=16}={}){
  dev.previewFrame(frame);
  const object=dev.diagnostics().preview?.object;
  if(!Number.isInteger(object))throw Error('Native preview actor is not loaded');
  // AC executes in the ordinary event loop, then the field loader queues a
  // transfer for vblank. A fixed eight-frame delay can stop between those
  // steps. Wait for the native cache, then allow its pending DMA to finish.
  let elapsed=0;
  while(snes.ram[0xf01+object*2]!==frame&&elapsed++<limit)runFrames(snes,1);
  if(snes.ram[0xf01+object*2]!==frame)throw Error('Native preview frame timed out: '+frame);
  runFrames(snes,2);
}
export async function finalArena(rom) {
  const s=await createCore(rom);
  try {restore(s,JSON.parse(await readFile('.local/checkpoints/final-arena.json','utf8')));return s;}catch{}
  const start=await bedroom(rom);restore(s,snapshot(start));
  const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),dev=createDevTools(s,h);
  dev.jump({id:479,x:7,y:10,party:[0,1,2],endgame:true});
  let found=false;
  for(let i=0;i<900;i++){s.runFrame();if(s.ram[0xaf02]===206&&s.ram[0xaf08]===239){found=true;break;}}
  if(!found)throw Error('Native final formation did not load');
  runFrames(s,180);dev.dispose();h.dispose();
  await writeFile('.local/checkpoints/final-arena.json',JSON.stringify(snapshot(s)));return s;
}

// Source and review images, and the archived reference model, are kept outside
// the public repository (see .gitignore). Tests that re-sample them skip in a
// clean clone; the converted pixel data they check is still in the tree.
export const sourceImagesPresent=['assets/imagegen/dragon/sources/winged.png','assets/raster/pinocchio-model/source/pinocchio/pinocchio.mtl'].every(f=>existsSync(new URL('../'+f,import.meta.url)));
export const needsSourceImages=sourceImagesPresent?false:'needs the source images kept outside the repository';
