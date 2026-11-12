import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,settlePreviewFrame,needsSourceImages} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {rasterArt,rasterArtInfo} from '../engine/raster-art.js';
import {donkeyFamilyEvent,donkeyFamilyLocations} from '../engine/donkey-family.js';
import {donkeyFamily,donkeyFamilyRooms} from '../content/donkey-family.js';
import {caretaker} from '../content/caretaker.js';
import {nativeSpriteBank,nativeSpriteCells} from '../scripts/native-sprite-view.mjs';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const eventOf=(rom,location)=>{const id=u16(b.base,0x360008+location*14);return decompress(rom,cartridgeOffset(u24(rom,0x3cf9f0+id*3),rom)).bytes;};
const loads=(event,npc)=>{let n=0;for(let p=0;p+1<event.length;p++)if(event[p]===0x82&&event[p+1]===npc)n++;return n;};
const header=(rom,npc)=>rom.slice(0x24f000+(npc+7)*5,0x24f000+(npc+7)*5+5);
const colors=(rom,id)=>{const p=0x240000+u16(rom,0x242a00+id*2);return rom.slice(p,p+24);};

test('the Wolf, the Blind Mouse and young Donkey load from their own rows in every room they appear in',()=>{
 assert.deepEqual(donkeyFamilyLocations,[4,8,9,80,81,125]);
 for(const location of donkeyFamilyLocations){
  const before=eventOf(b.base,location),now=eventOf(b.rom,location),moved=[];
  assert.equal(now.length,before.length,`room ${location} keeps its size`);
  for(const actor of donkeyFamily){
   const offset=actor.rooms[location];if(offset===undefined)continue;
   assert.deepEqual([...before.slice(offset,offset+2)],[0x82,actor.sourceNpc]);assert.deepEqual([...now.slice(offset,offset+2)],[0x82,actor.npc],`${actor.name} in room ${location}`);
   // The stock row is no longer loaded by this room's object.
   assert.equal(loads(now,actor.npc),1);moved.push(offset+1);
  }
  // The edit is one operand per actor and nothing else.
  const edited=donkeyFamilyEvent(before,location);
  assert.deepEqual([...edited.keys()].filter(p=>edited[p]!==before[p]),moved.sort((x,y)=>x-y));
  const broken=before.slice();broken[moved[0]]^=1;assert.throws(()=>donkeyFamilyEvent(broken,location),/signature/);
  assert.throws(()=>donkeyFamilyEvent(before.slice(1),location),/changed size/);
 }
 assert.equal(donkeyFamilyEvent(eventOf(b.base,5),5).length,eventOf(b.base,5).length);
 // No original event loads the three private rows.
 for(let location=1;location<0x1f0;location++){
  if(donkeyFamilyRooms[location])continue;
  let event;try{event=eventOf(b.base,location);}catch{continue;}
  for(let p=1+event[0]*32;p+1<event.length;p++)if(event[p]===0x82&&donkeyFamily.some(a=>a.npc===event[p+1])&&Array.from({length:event[0]},(_,o)=>u16(event,1+o*32)).includes(p-1))assert.fail(`room ${location} already loads NPC ${event[p+1]}`);
 }
});

test('the stock townswoman, tradesman and child keep their rows, banks, assemblies and palettes',()=>{
 for(const actor of donkeyFamily){
  assert.deepEqual(header(b.rom,actor.sourceNpc),header(b.base,actor.sourceNpc),`NPC ${actor.sourceNpc} row`);
  const {gfx,asm,palette}=actor.source,gp=0x242000+gfx*3,ap=0x242300+asm*3;
  assert.equal(u24(b.rom,gp),u24(b.base,gp));assert.equal(u24(b.rom,ap),u24(b.base,ap));
  const packet=fileOffset(u24(b.base,gp)),length=decompress(b.base,packet).length,assembly=fileOffset(u24(b.base,ap));
  assert.deepEqual(b.rom.slice(packet,packet+length),b.base.slice(packet,packet+length),`stock graphics ${gfx}`);
  assert.deepEqual(b.rom.slice(assembly,assembly+actor.frames*40),b.base.slice(assembly,assembly+actor.frames*40),`stock assembly ${asm}`);
  assert.equal(u16(b.rom,0x242a00+palette*2),u16(b.base,0x242a00+palette*2));assert.deepEqual(colors(b.rom,palette),colors(b.base,palette),`stock palette ${palette}`);
 }
 // Their other owners are untouched too: the women and men of the towns.
 for(const npc of[13,37,40,25,52,20,47,198])assert.deepEqual(header(b.rom,npc),header(b.base,npc),`NPC ${npc} row`);
 // The stock tradesman still stands in the rooms that are not the Mouse's.
 for(const[location,count]of[[90,3],[152,1],[338,1],[439,1]])assert.equal(loads(eventOf(b.rom,location),39),count,`room ${location}`);
});

test('every native frame slot is the imported generated raster in the actor\'s palette',()=>{
 const audit=b.audit.environment.caretaker.tenants;
 assert.deepEqual(audit.map(t=>t.key),['wolf','blind-mouse','young-donkey']);
 const claimed=new Set();
 for(const actor of donkeyFamily){
  const [gfx,asm,palette,animation,size]=header(b.rom,actor.npc),source=header(b.base,actor.sourceNpc),info=rasterArtInfo(actor.key);
  assert.deepEqual([gfx,asm,palette,animation,size],[caretaker.gfx,actor.asm,actor.palette,source[3],source[4]],actor.name+' row');
  assert.ok(!claimed.has(asm));claimed.add(asm);
  // Same animation program and frame count as the actor it stands in for.
  const stockAssembly=u24(b.base,0x242300+actor.source.asm*3),next=Math.min(...Array.from({length:256},(_,i)=>u24(b.base,0x242300+i*3)).filter(p=>p>stockAssembly));
  assert.equal((next-stockAssembly)/40,actor.frames,actor.name+' frame count');
  assert.equal(actor.stockPalette?palette:null,actor.stockPalette?actor.source.palette:null);
  const words=Array.from({length:12},(_,i)=>u16(colors(b.rom,palette),i*2)),expected=info.palette.map(c=>{const[r,g,bl]=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)>>3);return r|g<<5|bl<<10;});
  assert.deepEqual(words,expected,actor.name+' art is indexed in the palette its row names');
  const bank=nativeSpriteBank(b.rom,{gfx,asm,palette,size,frames:actor.frames});
  for(let frame=0;frame<actor.frames;frame++){
   const role=actor.frameMap[frame],pixels=new Uint8Array(1024);
   for(const c of nativeSpriteCells(bank,frame))for(let i=0;i<256;i++)if(c.pixels[i])pixels[(32+c.y+(i>>4))*32+16+c.x+(i&15)]=c.pixels[i];
   assert.deepEqual(pixels,rasterArt(actor.key,role),`${actor.name} frame ${frame} ${role.pose}/${role.facing}`);
   assert.equal(pixels.some(Boolean),role.pose!=='blank',`${actor.name} frame ${frame}`);
  }
 }
 // The host of the bank still draws nobody.
 const host=fileOffset(u24(b.rom,0x242300+caretaker.asm*3)),tiles=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+caretaker.gfx*3),b.rom)).bytes;
 for(let f=0;f<caretaker.frames;f++)for(let i=0;i<16;i++)assert.equal(u16(b.rom,host+f*40+i*2)&1023,0);
 assert.ok(tiles.subarray(0,32).every(v=>v===0));assert.ok(tiles.length<=0x8000);
 assert.equal(b.audit.resources.extraVramBytes,0);assert.equal(b.audit.resources.extraWramBytes,0);
});

test('source sheets are the recorded generations',{skip:needsSourceImages},async()=>{
 for(const actor of donkeyFamily){
  const info=rasterArtInfo(actor.key);assert.ok(info.provenance.length);
  for(const source of info.provenance){
   assert.equal(source.sourceType,'image-generation');assert.equal(sha(await readFile(source.file)),source.sha256,source.file);
   const record=JSON.parse(await readFile(source.file.replace(/source-([^/]+)\.png$/,'provenance-$1.json')));
   assert.equal(record.sha256,source.sha256);assert.ok(record.requestId);assert.equal(sha((await readFile(record.prompt.file,'utf8')).trim()),record.prompt.sha256);
  }
 }
});

test('every frame uploads its exact cartridge tiles through the streamed native loader',async()=>{
 const s=await bedroom(b.rom),hooks=installHooks(s,specs),dev=createDevTools(s,hooks);
 const stream=b.audit.resources.npcGraphicsStreaming.streams.find(g=>g.gfx===caretaker.gfx);
 const data=decompress(b.rom,cartridgeOffset(u24(b.rom,0x242000+caretaker.gfx*3),b.rom)).bytes;
 assert.deepEqual(b.rom.slice(stream.address,stream.address+stream.bytes),data);
 for(const a of donkeyFamily){
  assert.ok(stream.owners.some(o=>o.kind==='npc'&&o.id===a.npc&&o.assembly===a.asm));
  const assembly=cartridgeOffset(u24(b.rom,0x242300+a.asm*3),b.rom);
  dev.previewActor(a.key,0);runFrames(s,280);
  const object=dev.diagnostics().preview.object,x=object*2;
  assert.equal(u16(s.ram,0x1280+x),stream.address&65535,a.key+' raw source');assert.equal(s.ram[0x1200+x],stream.address>>16,a.key+' raw bank');
  for(let frame=0;frame<a.frames;frame++){
   settlePreviewFrame(s,dev,frame);
   const tile=u16(s.ram,0xd00+x),vram=new Uint8Array(s.ppu.vram.buffer);
   for(let row=0;row<2;row++){
    const expected=new Uint8Array(256);
    for(let i=0;i<8;i++){
     const t=u16(b.rom,assembly+frame*40+row*16+i*2),pixels=data.slice((t&1023)*32,(t&1023)*32+32);
     if(t&0x4000)for(let k=0;k<32;k++){let v=pixels[k];v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;pixels[k]=(v>>4)|(v&15)<<4;}
     expected.set(pixels,i*32);
    }
    assert.deepEqual(vram.slice(tile*32+row*512,tile*32+row*512+256),expected,a.key+' frame '+frame+' row '+row);
   }
   assert.equal(dev.diagnostics().fatal,null);
  }
 }
 dev.undo();dev.dispose();hooks.dispose();
});

test('the red Gate flashback plays with the Wolf and the foal in their own colors',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),seen=[],objects=new Map();
 h.on('dialogue.render',e=>{if(e.location===4&&!seen.includes(e.stringId))seen.push(e.stringId);});
 h.on('event.init',e=>{if(e.location===4&&e.opcode===0x82)objects.set(s.ram[0x12002+e.scriptPC],e.object);});
 try{
  // The flag the red Gate sets before the workshop loads.
  s.ram[0x10000]=0xcb;s.ram[0x1005a]|=2;
  d.jump({id:4,x:10,y:19,facing:0});runFrames(s,520);
  assert.equal(u16(s.ram,0x100),4);assert.equal(d.diagnostics().fatal,null);
  const [wolf,mouse,foal]=donkeyFamily;
  for(const actor of[wolf,foal]){
   const object=objects.get(actor.npc);assert.ok(Number.isInteger(object),actor.name+' is loaded');
   assert.notEqual(s.ram[0xf01+object*2],255,actor.name+' is drawn');
   const row=s.ram[0xf81+object*2]>>1&7,words=Array.from({length:12},(_,i)=>u16(colors(b.rom,actor.palette),i*2));
   assert.deepEqual([...s.ppu.cgram.slice(129+row*16,141+row*16)],words,actor.name+' palette row');
  }
  assert.ok(!objects.has(213)&&!objects.has(38)&&!objects.has(39),'no stock row stands in for the family');
  assert.equal(s.ram[0xf01+objects.get(mouse.npc)*2],255,'the Mouse is out during the accident');
  // The nightgown catches while the foal runs about.
  const frames=new Set();
  for(let n=0;n<2600&&u16(s.ram,0x100)===4&&!(seen.includes(18)&&frames.has(16));n++){runFrames(s,1,n%150<3?256:0);frames.add(s.ram[0xf01+objects.get(wolf.npc)*2]);}
  for(const id of[15,16,17,18])assert.ok(seen.includes(id),'flashback line '+id);
  // The scene's animation 3 is the startled slot (16) of the townswoman program.
  assert.ok(frames.has(16),'the Wolf panics in his startled frame');
  for(const frame of frames)assert.ok(frame<wolf.frames,'the Wolf only shows frames of his own assembly');
  assert.equal(d.diagnostics().fatal,null);
 }finally{d.dispose();h.dispose();}
});
