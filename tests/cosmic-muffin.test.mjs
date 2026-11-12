import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot,settlePreviewFrame,needsSourceImages} from './helpers.mjs';
import {cosmicMuffinActors,cosmicMuffinSpawnActors} from '../content/cosmic-muffin.js';
import {compileCosmicMuffinMouth,compileCosmicMuffinBackground,compileCosmicMuffinWorld,compileCosmicMuffinMeteor} from '../engine/cosmic-muffin.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {nativeSpriteBank,nativeSpriteCells} from '../scripts/native-sprite-view.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {cosmicMuffinRaster} from '../engine/generated-cosmic-muffin-art.js';
import {snesColor} from '../engine/sprites.js';
import {traverseMuffinSpawn} from './cosmic-scene-controller.mjs';
import {defeatFurnaceMaw} from './bakery-controller.mjs';
import {areas} from '../content/areas.js';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
const decode=(rom,table,id=0)=>decompress(rom,cartridgeOffset(u24(rom,table+id*3),rom)).bytes;
const frozen=async name=>new Uint8Array(await readFile('assets/imagegen/'+name));

test('Cosmic Muffin packets reproduce the accepted source bytes and fixed offspring blank',{skip:needsSourceImages},async()=>{
 const mouth=compileCosmicMuffinMouth(b.base),bg=compileCosmicMuffinBackground(b.base);
 assert.deepEqual(mouth.graphics,await frozen('cosmic-muffin-shell/draft/mouth.4bpp'));
 assert.deepEqual(mouth.assembly,await frozen('cosmic-muffin-shell/draft/mouth.asm'));
 for(const bank of bg.banks){assert.deepEqual(bank.graphics,await frozen('cosmic-muffin-shell/draft/bg'+bank.id+'.4bpp'));assert.deepEqual(decode(b.rom,0x362220,bank.id),bank.graphics);}
 assert.deepEqual(compileCosmicMuffinWorld(b.base).graphics,await frozen('cosmic-muffin-world/draft/world.4bpp'));
 assert.deepEqual(compileCosmicMuffinMeteor(b.base).graphics,await frozen('cosmic-muffin-world/meteor/meteor.packed4bpp'));
 for(const[gfx,asm,file,frames]of[[163,155,'cosmic-muffin-shell/draft/mouth',7],[176,171,'cosmic-muffin-spawn/head-area-draft/graphics',2],[177,173,'cosmic-muffin-spawn/shell-draft/graphics',2]]){
  assert.deepEqual(decode(b.rom,0x242000,gfx),await frozen(file+'.4bpp'));
  const bytes=await frozen(gfx===163?'cosmic-muffin-shell/draft/mouth.asm':file.replace('graphics','assembly')+'.bin');
  const p=fileOffset(u24(b.rom,0x242300+asm*3));assert.deepEqual(b.rom.slice(p,p+bytes.length),bytes);
  const a=[...cosmicMuffinActors,...cosmicMuffinSpawnActors].find(a=>a.gfx===gfx),bank=nativeSpriteBank(b.rom,a);assert.equal(bank.frames,frames);
  if(gfx===177){assert.equal(bank.cells,24);assert.ok(nativeSpriteCells(bank,1).every(c=>!c.pixels.some(Boolean)));assert.equal(bank.graphics.length,2528);}
 }
 assert.deepEqual(decode(b.rom,0x6fdf6),compileCosmicMuffinWorld(b.base).graphics);
 assert.deepEqual(decode(b.rom,0x3e002d),compileCosmicMuffinMeteor(b.base).graphics);
 assert.equal(b.audit.cosmicMuffin.extraVramBytes,0);assert.equal(b.audit.cosmicMuffin.extraWramBytes,0);
 assert.ok(b.audit.resources.npcGraphicsStreaming.streams.some(s=>s.gfx===163&&s.bytes===4768));
 assert.ok(b.audit.resources.npcGraphicsStreaming.streams.some(s=>s.gfx===176&&s.bytes===608));
 assert.ok(!b.audit.resources.npcGraphicsStreaming.streams.some(s=>s.gfx===177));
});

test('shell ownership flags, shared scenery, native combat and untouched palettes remain intact',()=>{
 for(const a of [...cosmicMuffinActors,...cosmicMuffinSpawnActors]){
  const h=a.enemy===undefined?0x24f000+(a.npc+7)*5:0x24f600+a.enemy*10,n=a.enemy===undefined?5:10;
  assert.deepEqual(b.rom.slice(h,h+n),b.base.slice(h,h+n),a.key+' original header including upper size flags');
  if(a.enemy!==undefined){
   for(const[table,stride]of[[0xc4700,23],[0xc5e00,7]]){const p=table+a.enemy*stride;assert.deepEqual(b.rom.slice(p,p+stride),b.base.slice(p,p+stride));}
   const ai=readEnemyAI(b.base,a.enemy);assert.deepEqual(b.rom.slice(ai.start,ai.start+ai.bytes),b.base.slice(ai.start,ai.start+ai.bytes));
  }
 }
 for(const id of[159,208]){const p=0x240000+u16(b.base,0x242a00+id*2);assert.deepEqual(b.rom.slice(p,p+24),b.base.slice(p,p+24));}
 for(const id of[64,109,195])assert.deepEqual(decode(b.rom,0x362220,id),decode(b.base,0x362220,id));
 for(const p of[0x3e0030,0x3e0036,0x3e0039])assert.deepEqual(b.rom.slice(p,p+3),b.base.slice(p,p+3),'meteor maps, palettes and planet pointers');
 const oldWorld=decode(b.base,0x6fdf6),nextWorld=decode(b.rom,0x6fdf6),changed=new Set(b.audit.cosmicMuffin.world.changedTiles);
 for(let t=0;t<256;t++)if(!changed.has(t))assert.deepEqual(nextWorld.slice(t*32,t*32+32),oldWorld.slice(t*32,t*32+32));
 const oldPal=decode(b.base,0x6fea0,6),nextPal=decode(b.rom,0x6fea0,6);assert.deepEqual(nextPal.slice(9*32,10*32),oldPal.slice(9*32,10*32));
 const bad=b.base.slice();bad[0x24f600]=163;assert.throws(()=>compileCosmicMuffinMouth(bad),/ownership changed/);
 const badBg=b.base.slice();badBg[0x360001]=29;assert.throws(()=>compileCosmicMuffinBackground(badBg),/tileset ownership changed/);
});

test('all shared shell mouths and offspring heads upload their exact native cells',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),actors=[...cosmicMuffinActors,...cosmicMuffinSpawnActors.filter(a=>a.gfx===176)];
 for(const a of actors){
  d.previewActor(a.key);runFrames(s,300);const bank=nativeSpriteBank(b.rom,a),object=d.diagnostics().preview.object;
  assert.equal(u16(s.ram,0x1400+object*2),u16(b.rom,0x242a00+a.palette*2));
  for(let f=0;f<a.frames;f++){
   settlePreviewFrame(s,d,f);const expected=[];
   for(let i=0;i<bank.cells*4;i++){const word=u16(bank.assembly,f*bank.cells*10+i*2);assert.equal(word&0x8000,0);for(let v of bank.graphics.slice((word&1023)*32,(word&1023)*32+32)){if(word&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}expected.push(v);}}
   const vram=new Uint8Array(s.ppu.vram.buffer),base=u16(s.ram,0xd00+object*2)*32,offsets=bank.cells===8?[0,256,512,768]:[0,512];
   assert.deepEqual(Uint8Array.from(offsets.flatMap(o=>[...vram.slice(base+o,base+o+256)])),Uint8Array.from(expected),a.key+':'+f);
   assert.equal(d.diagnostics().fatal,null);
  }
 }
 assert.deepEqual(s.cart.data,b.rom);d.undo();d.dispose();h.dispose();
});

test('original shell arrival displays the generated body with its shared edge graphics intact',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);d.jump({id:467,x:7,y:10,party:[0,1,2],endgame:true});runFrames(s,900);
 assert.equal(u16(s.ram,0x100),467);assert.equal(d.diagnostics().fatal,null);
 const colors=cosmicMuffinRaster.body.palette.map(snesColor);assert.deepEqual(Array.from(s.ppu.cgram.slice(113,128)),colors);
 const vr=new Uint8Array(s.ppu.vram.buffer);for(const[id,page]of[[193,4],[194,5],[128,6]]){const expected=decode(b.rom,0x362220,id),p=s.ppu.tileAdr[0]*2+page*4096;assert.deepEqual(vr.slice(p,p+expected.length),expected);}
 const body=Uint8Array.from(cosmicMuffinRaster.body.pixels,v=>parseInt(v,16)),rgba=new Uint8Array(512*480*4);s.setPixels(rgba);let checked=0;
 for(let y=35;y<100;y++)for(let x=32;x<224;x++){const v=body[y*256+x];if(!v)continue;const rgb=[0,5,10].map(n=>((colors[v-1]>>n&31)*s.ppu.brightnessMults[15])&255),p=((y-25)*2*512+x*2)*4;assert.deepEqual(Array.from(rgba.slice(p,p+3)),rgb,'native body pixel '+x+','+y);checked++;}
 assert.ok(checked>10000);await screenshot(s,'.local/qa/cosmic-shell-integrated-arrival.png');assert.deepEqual(s.cart.data,b.rom);d.dispose();h.dispose();
});

test('all four original offspring battles and the movable platform finish through ordinary controller input',async()=>{
 for(const location of[96,264,247,495]){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),battles=[],loads=[];
  h.on('battle.initialized',e=>battles.push(e));
  h.on('event.init',e=>{if(e.location===location&&e.opcode===0x83&&[111,215].includes(s.ram[0x12002+e.scriptPC]))loads.push(e.object);});
  const start=location===264?{x:5,y:24}:location===247?{x:10,y:61}:location===495?{x:4,y:20}:{x:24,y:19};
  d.jump({id:location,...start,party:[0,1,2],endgame:true});runFrames(s,500);assert.equal(loads.length,1);
  const bank=nativeSpriteBank(b.rom,cosmicMuffinSpawnActors.find(a=>a.gfx===177)),expected=[];
  for(let i=0;i<96;i++){const word=u16(bank.assembly,i*2);for(let v of bank.graphics.slice((word&1023)*32,(word&1023)*32+32)){if(word&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=v>>4|(v&15)<<4;}expected.push(v);}}
  const p=u16(s.ram,0xd00+loads[0]*2)*32;assert.deepEqual(new Uint8Array(s.ppu.vram.buffer).slice(p,p+3072),Uint8Array.from(expected));
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>Array.from(s.ram.slice(p,p+n)),hold:(k,n)=>runFrames(s,n,k),wait:n=>runFrames(s,n),tap:(k=256,gap=12)=>{runFrames(s,3,k);runFrames(s,gap);},shot:name=>screenshot(s,'.local/qa/'+name+'.png')};
  const result=await traverseMuffinSpawn(io,location);assert.ok(result.attacks>0);assert.equal(battles.length,1);assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,b.rom);d.dispose();h.dispose();
 }
});

test('the archive disaster and native Mode7 meteor use the generated packets and return normally',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),world=compileCosmicMuffinWorld(b.base).graphics;
 d.jump({id:218,x:56,y:43,facing:0,futureScene:'future-archive'});runFrames(s,400);runFrames(s,24,16);let exactWorld=0,worldTicks=0;
 for(let step=0;step<230&&s.ram[0x10000]!==54;step++){
  runFrames(s,3,256);
  for(let i=0;i<100;i++){runFrames(s,1);if(u16(s.ram,0x100)!==503)continue;worldTicks++;const v=new Uint8Array(s.ppu.vram.buffer).subarray(0,8192);if(v.every((x,n)=>x===world[n])){exactWorld++;if(exactWorld===500)await screenshot(s,'.local/qa/cosmic-world-integrated.png');}}
 }
 assert.equal(s.ram[0x10000],54);assert.equal(u16(s.ram,0x100),218);assert.ok(worldTicks>2000&&exactWorld>1000);assert.equal(d.diagnostics().fatal,null);d.dispose();h.dispose();
 const m=await bedroom(b.rom),mh=installHooks(m,specs),md=createDevTools(m,mh);let started=false,exactTexture=0;
 mh.on('event.dispatch',e=>{if(e.location===301&&e.opcode===0xff&&m.ram[0x12002+e.scriptPC]===0x24)started=true;});
 md.jump(areas.find(a=>a.bakeryScene==='bakery-furnace'));runFrames(m,400);
 const packed=compileCosmicMuffinMeteor(b.base).graphics,expanded=Uint8Array.from(Array.from(packed,v=>[v&15,v>>4]).flat());
 function advance(frames,keys=0){for(let i=0;i<frames;i++){runFrames(m,1,keys);if(started&&m.ppu.mode===7&&expanded.every((v,n)=>m.ppu.vram[n]>>8===v))exactTexture++;}}
 const io={read:(p,n=1)=>n===2?u16(m.ram,p):m.ram[p],bytes:(p,n)=>Array.from(m.ram.slice(p,p+n)),hold:(k,n)=>advance(n,k),wait:n=>advance(n),tap:(k=256,gap=90)=>{advance(3,k);advance(gap);},shot:name=>screenshot(m,'.local/qa/cosmic-'+name+'.png')};
 const result=await defeatFurnaceMaw(io);assert.equal(result.story,153);assert.ok(started&&exactTexture>1500);assert.equal(u16(m.ram,0x100),499);
 const beforeX=u16(m.ram,0x283);advance(12,128);assert.notEqual(u16(m.ram,0x283),beforeX,'original playable world continuation');
 assert.equal(md.diagnostics().fatal,null);assert.deepEqual(m.cart.data,b.rom);md.dispose();mh.dispose();
});
