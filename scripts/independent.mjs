import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {newGameSequence} from '../engine/automation.js';
import {build} from '../tests/helpers.mjs';
import {supportingCast} from '../content/supporting-cast.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {guyFieriTiers} from '../content/guy-fieri.js';
import {carnivalCast,carnivalFields,hatchetProps} from '../content/carnival.js';
import {sprite} from '../engine/sprites.js';
import {portrait} from '../engine/portraits.js';
import {PNG} from 'pngjs';
import {courtBeasts} from '../content/court-beasts.js';
import {courtBeastFrames,courtBeastSprite} from '../engine/court-beast-art.js';
import {decompress} from '../engine/compression.js';
import {dulocTank} from '../content/duloc-tank.js';
import {dulocTankSprite} from '../engine/duloc-tank-art.js';
import {workshopPuppet} from '../content/workshop-puppets.js';
import {seedFutureCheckpoint} from '../engine/future-checkpoints.js';
import {areas} from '../content/areas.js';
import {encode} from '../engine/text.js';
import {customFutureMachines as futureMachines} from '../content/future-machines.js';
import {customFutureWildlife as futureWildlife} from '../content/future-wildlife.js';
import {futureWildlifeSprite} from '../engine/future-wildlife-art.js';
import {customMedinaActors as medinaActors} from '../content/medina-actors.js';
import {medinaActorSprite} from '../engine/medina-art.js';
import {customBridgeActors as bridgeActors} from '../content/bridge-actors.js';
import {bridgeActorSprite} from '../engine/bridge-art.js';
import {enforcerActors} from '../content/enforcer-actors.js';
import {enforcerSprite} from '../engine/enforcer-art.js';
import {customBakeryActors as bakeryActors} from '../content/bakery-actors.js';
import {bakerySprite} from '../engine/bakery-art.js';
import {bakeryVillagers} from '../content/bakery-villagers.js';
import {bakeryVillagerSprite} from '../engine/bakery-village-art.js';
import {skyDrakes} from '../content/sky-drakes.js';
import {skyDrakeSprite} from '../engine/sky-drake-art.js';
import {futureMachineSprite} from '../engine/future-machine-art.js';
import {largePreviewFrameWrites} from '../engine/preview-frames.js';
import {milenkoSprite,carnivalFrameMap} from '../engine/carnival-art.js';
import {checkIndependentRacing} from './independent-racing.mjs';
import {checkIndependentMedina} from './independent-medina.mjs';
import {checkIndependentPyramid} from './independent-pyramid.mjs';
import {checkIndependentBridge} from './independent-bridge.mjs';
import {checkIndependentVillages} from './independent-villages.mjs';
import {checkIndependentFortress} from './independent-fortress.mjs';
import {checkIndependentHideout} from './independent-hideout.mjs';
import {checkIndependentBakery} from './independent-bakery.mjs';
import {checkIndependentBakeryChapter} from './independent-bakery-chapter.mjs';
import {checkIndependentBakeryReturn} from './independent-bakery-return.mjs';
import {writeCandidate} from './independent-controller.mjs';

// External emulators stay outside the distributed game. The local Secret of
// Goku harness is supported directly; explicit paths work on other machines.
const exists=async p=>{try{await access(p);return true;}catch{return false;}};
async function tool(env,name) {
  if(process.env[env])return path.resolve(process.env[env]);
  for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){
    const candidate=path.resolve(dir,name);if(await exists(candidate))return candidate;
  }
  throw Error(`Set ${env} to the installed ${name}; see docs/native-port.md.`);
}
const requested=process.argv[2]??'snes9x',partyArtOnly=process.argv.includes('--party-art'),routesOnly=!partyArtOnly;
if(!['snes9x','bsnes','all'].includes(requested))throw Error('Choose snes9x, bsnes or all');
const host=await tool('RETRO_HOST','retro-host'),built=await build();
const fingerprint=createHash('sha256').update(built.rom).digest('hex'),reports=[];
const outputRoot=path.resolve(process.env.SHREK_QA_ROOT??'.local/qa',(partyArtOnly?'party-art-':'independent-')+fingerprint.slice(0,12));
await mkdir(outputRoot,{recursive:true});
const rom=path.join(outputRoot,'shrek-trigger.sfc');
await writeCandidate(rom,built.rom);
function pussFrame(hatchet){
  const asm=hatchet?built.audit.carnival.equippedWeapon.assembly:fileOffset(u24(built.rom,0x24230c)),gfx=cartridgeOffset(u24(built.rom,0x24200c),built.rom),out=[];
  for(let i=0;i<16;i++){
    const frame=built.audit.characters[4].assembly.frameMap[1],t=u16(built.rom,asm+frame*40+i*2),tile=built.rom.slice(gfx+(t&2047)*32,gfx+(t&2047)*32+32);
    for(let v of tile){if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}out.push(v);}
  }
  return out;
}
function playerFrame(id,frame,weapon){
  const stored=built.audit.characters[id].assembly.frameMap[frame];
  const asm=(id===4&&weapon==='hatchet'?built.audit.carnival.equippedWeapon.assembly:fileOffset(u24(built.rom,0x242300+id*3)))+stored*40,gfx=cartridgeOffset(u24(built.rom,0x242000+id*3),built.rom),out=[];
  for(let i=0;i<16;i++){
    const t=u16(built.rom,asm+i*2);
    for(let v of built.rom.slice(gfx+(t&2047)*32,gfx+(t&2047)*32+32)){
      if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}out.push(v);
    }
  }
  return out;
}
async function checkPlayerPixels(file,id,frame,weapon){
  const png=PNG.sync.read(await readFile(file)),a=built.audit.characters[id].map[frame],pixels=sprite(id,a.facing,a.pose,a.phase,{weapon}),colors=new Map();
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(pixels[y*32+x]){
    const index=pixels[y*32+x],p=((111+y)*png.width+184+x)*4,color=png.data[p]<<16|png.data[p+1]<<8|png.data[p+2];
    if(!colors.has(index))colors.set(index,color);else assert.equal(color,colors.get(index),`${file}: player pixel ${x},${y}`);
  }
  assert.ok(colors.size>=4,'visible pose uses distinct palette indices');assert.equal(new Set(colors.values()).size,colors.size,'player indexed colors remain distinct');
}
const partyChecks=[
  {id:0,key:'shrek',shots:[0,3,59,47,85,89,115,69,70,108,110,159,160,161,162,163,164,184,194,195,219,220,234,235]},
  {id:1,key:'fiona',shots:[0,1,156,214,140,148,162,79,98,110,194,229]},
  {id:2,key:'donkey',shots:[0,1,36,53,177,160,210,64,62,94,73,206]},
  {id:3,key:'pinocchio',shots:[0,3,32,185,110,116,142,77,94,174,196,197]},
  {id:4,key:'puss-rapier',weapon:'rapier',shots:[0,1,36,51,102,116,126,78,90,226,223,235]},
  {id:4,key:'puss-hatchet',weapon:'hatchet',shots:[0,1,36,51,102,116,126,78,90,226,223,235]},
  {id:5,key:'mongo',shots:[0,1,2,18,42,98,146,216,195,59,160,251]},
  {id:6,key:'farquaad',shots:[0,3,32,166,112,168,172,77,91,145,234,252]}
];
async function checkPussPixels(file,hatchet){
  const png=PNG.sync.read(await readFile(file)),pixels=sprite(4,1,'idle',0,{weapon:hatchet?'hatchet':'rapier'}),colors=new Map();
  // This preset centers Puss at (136,143), clear of the balloon seller.
  // bsnes applies its own display color curve, so verify the exact indexed
  // pattern with a one-to-one palette mapping instead of assuming RGB gamma.
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(pixels[y*32+x]){
    const index=pixels[y*32+x],p=((111+y)*png.width+120+x)*4,color=png.data[p]<<16|png.data[p+1]<<8|png.data[p+2];
    if(!colors.has(index))colors.set(index,color);else assert.equal(color,colors.get(index),`${file}: native sprite pixel ${x},${y}`);
  }
  assert.ok(colors.size>=9);assert.equal(new Set(colors.values()).size,colors.size,'distinct indexed sprite colors');
}
async function checkPortraitPixels(file,id){
  const png=PNG.sync.read(await readFile(file)),pixels=portrait(id),colors=new Map();
  for(let y=0;y<48;y++)for(let x=0;x<48;x++)if(pixels[y*48+x]){
    const index=pixels[y*48+x],p=((24+y)*png.width+120+x)*4,color=png.data[p]<<16|png.data[p+1]<<8|png.data[p+2];
    if(!colors.has(index))colors.set(index,color);else assert.equal(color,colors.get(index),`${file}: portrait pixel ${x},${y}`);
  }
  assert.ok(colors.size>=8);assert.equal(new Set(colors.values()).size,colors.size,'distinct native portrait colors');
}
const beastGraphics=decompress(built.rom,built.audit.courtBeasts.graphicsOffset).bytes;
function beastTiles(frame){
  const out=[],asm=built.audit.courtBeasts.assemblyOffset+frame*80;
  for(let i=0;i<32;i++){
    const t=u16(built.rom,asm+i*2);
    for(let b of beastGraphics.subarray((t&1023)*32,(t&1023)*32+32)){
      if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}out.push(b);
    }
  }
  return out;
}
async function checkBeastPixels(file,frame){
  const png=PNG.sync.read(await readFile(file)),pixels=courtBeastSprite(courtBeastFrames[frame]),colors=new Map();
  const a=built.audit.courtBeasts.actors[0],ox=200-a.width/2+(a.anchor?.[0]??0)+(a.frameOffsets?.[frame]?.[0]??0),oy=143-a.height+(a.anchor?.[1]??0)+(a.frameOffsets?.[frame]?.[1]??0);
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(pixels[y*a.width+x]){
    const k=pixels[y*a.width+x],p=((oy+y)*png.width+ox+x)*4,v=png.data[p]<<16|png.data[p+1]<<8|png.data[p+2];
    if(!colors.has(k))colors.set(k,v);else assert.equal(v,colors.get(k),`${file}: beast pixel ${x},${y}`);
  }
  assert.ok(colors.size>=5);assert.equal(new Set(colors.values()).size,colors.size);
}
function tankTiles(actor,frame){
  const a=built.audit.dulocTank.actors.find(a=>a.key===actor.key),gfx=decompress(built.rom,a.graphicsOffset).bytes,out=[];
  for(let i=0;i<a.cells*4;i++){
    const t=u16(built.rom,a.assemblyOffset+frame*a.cells*10+i*2);
    for(let b of gfx.subarray((t&1023)*32,(t&1023)*32+32)){
      if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}out.push(b);
    }
  }
  return out;
}
async function checkTankPixels(file,actor,frame){
  const png=PNG.sync.read(await readFile(file)),pixels=dulocTankSprite(actor.key,frame),colors=new Map();
  const ox=200-actor.width/2+actor.anchor[0],oy=143-actor.height+actor.anchor[1];
  for(let y=0;y<actor.height;y++)for(let x=0;x<actor.width;x++)if(pixels[y*actor.width+x]){
    const k=pixels[y*actor.width+x],p=((oy+y)*png.width+ox+x)*4,v=png.data[p]<<16|png.data[p+1]<<8|png.data[p+2];
    if(!colors.has(k))colors.set(k,v);else assert.equal(v,colors.get(k),`${file}: tank pixel ${x},${y}`);
  }
  assert.ok(colors.size>=5);assert.equal(new Set(colors.values()).size,colors.size);
}
const machineActors=[...futureMachines,...futureWildlife,...medinaActors,...bridgeActors,...enforcerActors,...bakeryActors,...bakeryVillagers,...skyDrakes,carnivalCast.find(a=>a.key==='great-milenko')];
const ratTheftCases=[[3,1000,79],[1,1000,79],[0,1000,78],[0,500,78],[0,499,null],[0,0,null]];
function machineTiles(a,frame){
  const gfx=decompress(built.rom,cartridgeOffset(u24(built.rom,0x242000+a.gfx*3),built.rom)).bytes,asm=fileOffset(u24(built.rom,0x242300+a.asm*3)),cells=(a.size&2?3:1)*(a.size&1?8:4),out=[];
  for(let i=0;i<cells*4;i++){
    const t=u16(built.rom,asm+frame*cells*10+i*2);
    for(let b of gfx.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}out.push(b);}
  }return out;
}
async function checkMachinePixels(file,a,frame){
  const pose=a.key==='great-milenko'?carnivalFrameMap(a.key)[frame]:null;
  const pixels=pose?milenkoSprite(pose):futureWildlife.includes(a)?futureWildlifeSprite(a.art,frame):medinaActors.includes(a)?medinaActorSprite(a.art,frame):bridgeActors.includes(a)?bridgeActorSprite(a.art,frame):enforcerActors.includes(a)?enforcerSprite(a.art,frame):bakeryActors.includes(a)?bakerySprite(a.art,frame):bakeryVillagers.includes(a)?bakeryVillagerSprite(a.art,frame):skyDrakes.includes(a)?skyDrakeSprite(a.art,frame):futureMachineSprite(a.art,frame);
  if(!pixels.some(Boolean))return;
  const png=PNG.sync.read(await readFile(file)),colors=new Map(),ox=200-a.width/2+(pose?.x??0)+(a.anchor?.[0]??0)+(a.frameOffsets?.[frame]?.[0]??0),oy=143-a.height+(pose?.y??0)+(a.anchor?.[1]??0)+(a.frameOffsets?.[frame]?.[1]??0);
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(pixels[y*a.width+x]){
    const k=pixels[y*a.width+x],p=((oy+y)*png.width+ox+x)*4,v=png.data[p]<<16|png.data[p+1]<<8|png.data[p+2];
    if(!colors.has(k))colors.set(k,v);else assert.equal(v,colors.get(k),`${file}: machine pixel ${x},${y}`);
  }
  assert.ok(colors.size>=5);assert.equal(new Set(colors.values()).size,colors.size);
}
async function verifyPartyArt(name,out,v,puppetShots){
  for(const actor of partyChecks)for(const frame of name==='snes9x'?Array.from({length:built.audit.characters[actor.id].frameCount},(_,i)=>i):actor.shots){
    const key=actor.key+'-'+frame;
    assert.equal(v[key+'-frame'],frame);assert.equal(v[key+'-tile'],384);
    if(name==='snes9x'){
      const expected=playerFrame(actor.id,frame,actor.weapon);
      assert.deepEqual(v[key+'-upper'],expected.slice(0,256),key+' upper tiles');
      assert.deepEqual(v[key+'-lower'],expected.slice(256),key+' lower tiles');
    }
    if(actor.shots.includes(frame))await checkPlayerPixels(path.join(out,actor.key+'-frame-'+frame+'.png'),actor.id,frame,actor.weapon);
  }
  assert.equal(v['workshop-palette'],u16(built.rom,0x242a00+workshopPuppet.palette*2));
  const puppetPal=0x240000+u16(built.rom,0x242a00+workshopPuppet.palette*2);
  assert.deepEqual(v['workshop-colors'],Array.from(built.rom.subarray(puppetPal,puppetPal+24)));
  for(const frame of name==='snes9x'?Array.from({length:256},(_,i)=>i):puppetShots){
    const key='workshop-puppet-'+frame;assert.equal(v[key+'-frame'],frame);assert.equal(v[key+'-tile'],64);
    if(name==='snes9x'){const expected=playerFrame(3,frame);assert.deepEqual(v[key+'-upper'],expected.slice(0,256));assert.deepEqual(v[key+'-lower'],expected.slice(256));}
    if(puppetShots.includes(frame))await checkPlayerPixels(path.join(out,key+'.png'),3,frame);
  }
  for(const weapon of[59,61,66]){
    assert.equal(v['puss-'+weapon+'-frame'],1);assert.equal(v['puss-'+weapon+'-tile'],8);
    if(name==='snes9x'){const expected=pussFrame(weapon!==59);assert.deepEqual(v['puss-'+weapon+'-upper'],expected.slice(0,256),'native upper sprite tiles for weapon '+weapon);assert.deepEqual(v['puss-'+weapon+'-lower'],expected.slice(256),'native lower sprite tiles for weapon '+weapon);}
    await checkPussPixels(path.join(out,'puss-weapon-'+weapon+'.png'),weapon!==59);
  }
  for(let id=0;id<7;id++){
    assert.equal(v['portrait-'+id+'-selection']&7,id);
    if(name==='snes9x')assert.deepEqual(v['portrait-'+id+'-tiles'],Array.from(built.rom.subarray(0x3f0000+id*0x480,0x3f0480+id*0x480)),'native portrait upload '+id);
    await checkPortraitPixels(path.join(out,'portrait-'+id+'.png'),id);
  }
}
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
  const extension=process.platform==='darwin'?'dylib':'so',core=await tool(name.toUpperCase()+'_CORE',name+'_libretro.'+extension);
  const out=path.join(outputRoot,name);await mkdir(out,{recursive:true});
  const steps=[],push=(...s)=>steps.push(...s),wait=frames=>({op:'wait',frames}),shot=name=>({op:'shot',name});
  const read=(name,addr,size=1)=>({op:'read',name,mem:'wram',addr,size});
  const write=(addr,bytes)=>({op:'write',mem:'wram',addr,bytes});
  const load=name=>({op:'loadstate',file:path.join(out,name+'.state')});
  const tap=buttons=>({op:'tap',buttons,frames:3,gap:600});
  const script=bytes=>write(0x1238e,bytes); // Bedroom controller's verified idle B2.
  const party=()=>write(0x2980,[0,1,2,3,4,5,6,128]);
  for(const [frames,input]of newGameSequence)push(input?{op:'hold',frames,buttons:input===8?'start':'a'}:wait(frames));
  push(read('bedroom',0x100,2),read('idleOpcode',0x1238e),shot('swamp'),{op:'savestate',name:'bedroom'});
  const introEnd=steps.length;
  function vehicle(flying) {
    push(load('bedroom'),party(),write(0x29af,[254]),write(0x294,[flying?0xa0:0x80]),
      write(0x290,[184,1,24,1]),write(0x29f,[240,1]),write(0x27e,[0]),write(0x28f,[0]),write(0x100ec,[4]),
      script([0xe0,0xf0,3,55,35,0xb2]),wait(500),tap('a'));
  }
  vehicle(true);push(read('boarded',0x294),shot('dragon-boarded'),{op:'savestate',name:'boarded'});
  for(const buttons of['left','up','right','down'])push({op:'hold',buttons,frames:60});
  push(read('flightMap',0x100,2),read('flying',0x294),shot('dragon-flight'),load('boarded'),tap('a'),read('landed',0x294),read('walking',0x27e));
  vehicle(false);push(read('timeGauge',0x27c),read('unrepaired',0x294),{op:'tap',buttons:'l',frames:3,gap:200},tap('a'),wait(600),read('medieval',0x100,2),read('stillUnrepaired',0x294),shot('dragon-time-travel'));
  push(load('bedroom'),party(),write(0x100ce,[5]),write(0x100aa,[0]),script([0xe0,0xda,3,7,58,0xb2]),wait(280),shot('dragon-escape'),wait(320),read('arrivalMap',0x100,2),read('arrivalLine',0x12a),read('brokenHarness',0x100ce));
  // Native approach preconditions include the cue-producing Determination
  // track and the original queued location. Omitting the music stalls its VM.
  push(load('bedroom'),party(),script([0xea,80,0x66,2,0xaa,0x56,5,0xce,0,0x65,7,0x6d,0xde,0xda,1,7,58,0x56,0,0xed,1,0xff,0x26,0]),wait(1200),shot('dragon-saddle'));
  push({op:'until',mem:'wram',addr:0x12a,value:129,frames:6000,every:1},read('approachMap',0x100,2),read('approachLine',0x12a),shot('approach-arrival'));
  // FF 2B retains the music used by the ending's native cue synchronization.
  push(load('bedroom'),script([0xea,0x3f,0xff,0x2b,0]),wait(2400),shot('dragon-ending'),read('endingScript',0xb20,2));
  // A native kitchen NPC provides a controlled pose check. 82 loads an NPC,
  // 33 refreshes its already-assigned OBJ palette row, AC selects a frame.
  // Every change is WRAM diagnostic state; the tested cartridge stays intact.
  const castStageStart=steps.length;
  // Snapshot on the frame the kitchen NPC reaches its init return ($57D) while
  // the controller still waits at $25C. Since the Nov 4 kitchen song change the
  // scene no longer stalls there: seven frames later both scripts move on and
  // the NPC halts at $5AB, where the injected preview loop would run only once.
  push(load('bedroom'),script([0xe0,1,2,8,8,0xb2]),{op:'until',mem:'wram',addr:0x119e,size:2,value:0x57d,frames:400,every:1},read('castNpcScript',0x119e,2),read('castControllerScript',0x1180,2),{op:'savestate',name:'cast-stage'});
  const castStageEnd=steps.length;
  for(const actor of supportingCast){
    push(load('cast-stage'),write(0x1225d,[0xb2]),
      write(0x1257e,[0x82,actor.npcs[0],0x33,1,0xa6,1,0xac,1,0xad,1,0x11,5]),wait(30),
      shot('cast-'+actor.key),read('cast-'+actor.key+'-front',0x131f),
      read('cast-'+actor.key+'-ink',0x2122,2),read('cast-'+actor.key+'-last-color',0x2138,2),
      write(0x12585,[actor.frames-1]),wait(8),read('cast-'+actor.key+'-last-frame',0x131f));
  }
  for(let tier=0;tier<6;tier++)push(load('bedroom'),party(),write(0x2612,[[1,10,20,30,40,99][tier]]),
    script([0xe0,0xd1,3,8,11,0xb2]),wait(300),shot('guy-fieri-tier-'+tier),read('guy-fieri-tier-'+tier+'-palette',0x1414,2));
  const carnivalActors=[...carnivalCast,...carnivalFields,...hatchetProps];
  for(const actor of carnivalActors){
    const enemy=actor.enemy!==undefined,frame=enemy?4:0,bytes=enemy?[0x83,actor.enemy,0x83]:[0x82,actor.npc],operand=0x1257e+bytes.length+5;
    push(load('cast-stage'),write(0x1225d,[0xb2]),write(0x1257e,[...bytes,0x33,1,0xa6,1,0xac,frame,0xad,1,0x11,5]),wait(40),
      shot('carnival-'+actor.key),read('carnival-'+actor.key+'-frame',0x131f),read('carnival-'+actor.key+'-palette',0x141e,2),
      read('carnival-'+actor.key+'-ink',0x2122,2),write(operand,[actor.frames-1]),wait(8),read('carnival-'+actor.key+'-last-frame',0x131f));
  }
  for(const actor of courtBeasts){
    push(load('cast-stage'),write(0x1225d,[0xb2]),write(0x1257e,[0x83,actor.enemy,0x83,0x33,1,0x8b,12,8,0xa6,1,0xac,1,0xad,1,0x11,5]),wait(40));
    for(let frame=0;frame<31;frame++){
      const key=actor.key+'-'+frame;
      push(write(0x12589,[frame]),wait(32),read(key+'-frame',0xf1f),read(key+'-tile',0xd1e,2));
      if(name==='snes9x')push({op:'read',name:key+'-tiles',mem:'vram',addr:0x800,len:1024});
      if([3,6,16,24,30].includes(frame))push(shot(key));
    }
  }
  for(const actor of dulocTank){
    push(load('cast-stage'),write(0x1225d,[0xb2]));
    // A size-3 actor reserves fixed tiles 64..159 when a location initializes.
    // This bench reloads an already initialized kitchen object, so suppress
    // the other objects' tile streamers before using that fixed reservation.
    // The actual catwalk battle below exercises ordinary scene allocation.
    if(actor.enemy===147)for(let object=0;object<24;object++)if(object!==15)push(write(0x1100+object*2,[128]));
    push(write(0x1257e,[0x83,actor.enemy,0x83,0x33,1,0x8b,12,8,0xa6,1,0xac,actor.enemy===147?0:1,0xad,1,0x11,5]),wait(actor.enemy===147?300:40));
    if(actor.enemy===147)push(read('tank-source-bank',0x121e),read('tank-source-address',0x129e,2));
    for(let frame=0;frame<actor.frames;frame++){
      const key=actor.key+'-'+frame;
      push(write(0x12589,[frame]),wait(frame===0?600:32),read(key+'-frame',0xf1f),read(key+'-tile',0xd1e,2),shot(key));
      if(name==='snes9x'){
        if(actor.enemy===147)push({op:'read',name:key+'-tiles',mem:'vram',addr:0x800,len:3072});
        else push({op:'read',name:key+'-upper',mem:'vram',addr:0x800,len:256},{op:'read',name:key+'-lower',mem:'vram',addr:0xa00,len:256});
      }
    }
  }
  for(const actor of machineActors){
    const large=(actor.size&3)===2,header=actor.enemy===undefined?[0x82,actor.npc]:[0x83,actor.enemy,0x83];
    push(load('cast-stage'),write(0x1225d,[0xb2]),write(0x1257e,[...header,0x33,1,0x8b,12,8,0xa6,1,...(large?[0xad,1,0x11,3]:[0xac,1,0xad,1,0x11,5])]),wait(40));
    if(actor.enemy===undefined&&(actor.size&3)===1){
      // An eight-cell NPC needs a complete native cache pair after replacing
      // this initialized four-cell caretaker. Keep slot 25's cat intact.
      push(read(actor.key+'-preview-free',0xb94,2),read(actor.key+'-preview-old',0xba0),write(0xb94,[30,30]),write(0xba0,[128]),write(0xd1e,[192,0]),write(0x171e,[128,1]),write(0xf1f,[255]));
    }
    // An in-place actor reload can retain the home actor's cached frame zero.
    // Prime the native large-frame streamer with another pose before zero,
    // just as the static previews do. Normal event initialization starts FF.
    if(large){for(const[p,bytes]of largePreviewFrameWrites(built.rom,actor,15,1))push(write(p,bytes));push(wait(48));}
    push({op:'read',name:actor.key+'-colors',mem:'wram',addr:0x2122,len:24});
    for(let frame=0;frame<actor.frames;frame++){
      const key='machine-'+actor.key+'-'+frame;
      if(large)for(const[p,bytes]of largePreviewFrameWrites(built.rom,actor,15,frame))push(write(p,bytes));
      else push(write(0x12586+header.length,[frame]));
      push(wait(frame===0?600:48),read(key+'-frame',0xf1f),read(key+'-tile',0xd1e,2));
      if(name==='snes9x')for(const[offset,i]of(large?[0,512,256,768,1024,1536]:actor.size&1?[0,256,512,768]:[0,512]).map((o,i)=>[o,i]))push({op:'read',name:key+'-tiles-'+i,mem:'vram',addr:(actor.enemy===undefined?actor.size&1?0x1800:0x3000:0x800)+offset,len:256});
      if(large||medinaActors.includes(actor)||bridgeActors.includes(actor)||enforcerActors.includes(actor)||bakeryActors.includes(actor)||bakeryVillagers.includes(actor)||skyDrakes.includes(actor)||[0,actor.frames-1].includes(frame))push(shot(key));
    }
  }
  // An in-place 81 reload retains the old object's frame cache. Start on 1
  // before testing 0 so the native loader cannot reuse the home actor's cached frame 0.
  // The browser bench instead replaces 82 during initialization (cache FF).
  const partyStart=steps.length;
  const puppetShots=[0,3,32,110,116,142,77,94,185,196,197];
  push(load('cast-stage'),write(0x1225d,[0xb2]),write(0x1257e,[0x83,248,0x83,0x33,1,0x8b,12,8,0xa6,1,0xac,1,0xad,1,0x11,5]),wait(40),read('workshop-palette',0x141e,2),{op:'read',name:'workshop-colors',mem:'wram',addr:0x2122,len:24});
  for(const frame of name==='snes9x'?Array.from({length:256},(_,i)=>i):puppetShots){
    const key='workshop-puppet-'+frame;
    push(write(0x12589,[frame]),wait(8),read(key+'-frame',0xf1f),read(key+'-tile',0xd1e,2));
    if(name==='snes9x')push({op:'read',name:key+'-upper',mem:'vram',addr:0x800,len:256},{op:'read',name:key+'-lower',mem:'vram',addr:0xa00,len:256});
    if(puppetShots.includes(frame))push(shot(key));
  }
  for(const actor of partyChecks){
    push(load('cast-stage'),write(0x2769,[actor.weapon==='hatchet'?61:59]),write(0x1225d,[0xb2]),write(0x1257e,[0x81,actor.id,0x33,1,0x8b,12,8,0xa6,1,0xac,1,0xad,1,0x11,5]),wait(40));
    for(const frame of name==='snes9x'?Array.from({length:built.audit.characters[actor.id].frameCount},(_,i)=>i):actor.shots){
      const key=actor.key+'-'+frame;
      push(write(0x12588,[frame]),wait(frame===0?600:8),read(key+'-frame',0xf1f),read(key+'-tile',0xd1e,2));
      if(name==='snes9x')push({op:'read',name:key+'-upper',mem:'vram',addr:0x3000,len:256},{op:'read',name:key+'-lower',mem:'vram',addr:0x3200,len:256});
      if(actor.shots.includes(frame))push(shot(actor.key+'-frame-'+frame));
    }
  }
  for(const weapon of[59,61,66]){
    push(load('bedroom'),write(0x2980,[4,0,1,2,3,5,6,128]),write(0x29af,[254]),write(0x2769,[weapon]),script([0xe0,5,2,30,32,0xb2]),wait(400),
      read('puss-'+weapon+'-frame',0x0f0b),read('puss-'+weapon+'-tile',0xd0a,2),shot('puss-weapon-'+weapon));
    if(name==='snes9x')push({op:'read',name:'puss-'+weapon+'-upper',mem:'vram',addr:0x100,len:256},{op:'read',name:'puss-'+weapon+'-lower',mem:'vram',addr:0x300,len:256});
    push({op:'tap',buttons:'x',frames:3,gap:300},shot('puss-weapon-menu-'+weapon));
  }
  for(let id=0;id<7;id++){
    const others=[0,1,2,3,4,5,6].filter(n=>n!==id);
    push(load('bedroom'),write(0x2980,[id,...others,128]),write(0x29af,[254]),script([0xe0,5,2,27,32,0xb2]),wait(400),{op:'tap',buttons:'x',frames:3,gap:300},shot('portrait-'+id),read('portrait-'+id+'-selection',0xd46));
    if(name==='snes9x'&&id===0)for(let pc=0;pc<7;pc++)push({op:'read',name:'portrait-'+pc+'-tiles',mem:'vram',addr:0x4020+pc*0x480,len:0x480});
  }
  const routesStart=steps.length;
  const partyEnd=steps.length;
  // Isolated native encounter: establish the same diagnostic party as the
  // workshop shortcut, then use only controller input through both victories,
  // the fusion, pickup and automatic wind ride. Enemy stats are never edited.
  push(load('bedroom'),party(),write(0x29af,[254]),write(0x10000,[0x5f]),write(0x100f3,[0]),
    write(0x2830,new Array(7).fill(8)),write(0x2837,new Array(7).fill(255)),write(0x283e,new Array(15).fill(224)),write(0x284d,new Array(15).fill(128)));
  const kitItems=[189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178];
  push(write(0x2400,[...kitItems,0]),write(0x2500,[...kitItems.map(()=>20),0]));
  for(let id=0;id<7;id++){
    const p=0x2600+id*80;
    push(write(p+3,[231,3,231,3,99,0,99,0]),write(p+0xb,[65,60,12,60,60,50,60]),write(p+0x12,[60]),
      write(p+0x36,[65,60,12,60,60,50,60]),write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]),write(p+0x3d,[200,220,231,3]));
  }
  const pressUntil=(addr,value,frames=15000,size=1)=>({op:'until',mem:'wram',addr,value,size,frames,buttons:'a',every:93,hold:3});
  push({op:'savestate',name:'carnival-kit'});
  push(script([0xe0,151,0,8,13,0xb2]),wait(420),{op:'hold',buttons:'up',frames:75},wait(90),
    pressUntil(0xaf08,151),wait(60),shot('carnival-duo-battle'),read('carnival-j',0xaf08),read('carnival-shaggy',0xaf09),
    pressUntil(0xaf05,153),wait(60),shot('carnival-milenko-battle'),read('carnival-milenko',0xaf05),pressUntil(0x12a,38));
  for(let i=0;i<4;i++)push({op:'tap',buttons:'a',frames:3,gap:180});
  push({op:'hold',buttons:'right',frames:8},{op:'hold',buttons:'up',frames:200},pressUntil(0x10000,0x60),wait(2),
    read('carnival-head',0x2411),read('carnival-head-quantity',0x2511),pressUntil(0x100,497,6000,2),read('carnival-return-map',0x100,2),read('carnival-story',0x10000),shot('carnival-wind-return'));
  push(load('carnival-kit'),write(0x2980,[4,0,1,2,3,5,6,128]),script([0xe0,151,0,8,13,0xb2]),wait(420),{op:'hold',buttons:'up',frames:75},wait(90),pressUntil(0xaf08,151),wait(60),read('hatchet-battle-puss',0xaeff),read('hatchet-battle-weapon',0x2769),shot('puss-hatchet-battle'));
  // Seed the same reversible rescue fixtures as the browser, then use only
  // controller input. Temporary Puss recruitment retains the native party mask.
  function rescue(story,partyIds,flags){
    push(load('carnival-kit'),write(0x10000,[story]),write(0x100a1,[flags]),write(0x100a9,[2]),write(0x101ed,[0]),write(0x100ff,[0]),
      write(0x2980,[...partyIds,...new Array(9-partyIds.length).fill(128)]),write(0x29af,[partyIds.reduce((m,id)=>m|(128>>id),0)]));
  }
  rescue(15,[0],0);push(script([0xe0,122,0,40,44,0xb2]),wait(400),{op:'hold',buttons:'up',frames:30},pressUntil(0x10000,16),wait(240),read('fiona-vanished',0x10000),shot('fiona-vanished'));
  rescue(18,[0,2],3);push(script([0xe0,129,0,8,12,0xb2]),wait(400),{op:'hold',buttons:'up',frames:20},pressUntil(0x12a,19),wait(240),{op:'tap',buttons:'a',frames:3,gap:180},{op:'tap',buttons:'start',frames:3,gap:180},pressUntil(0x10000,21),wait(120),read('puss-joined',0x10000),read('puss-party',0x2982),shot('puss-recruited'));
  rescue(26,[0,2,4],3);push(script([0xe0,198,0,7,16,0xb2]),wait(400));
  for(let i=0;i<3;i++)push({op:'tap',buttons:'a',frames:3,gap:100});
  push({op:'hold',buttons:'up',frames:70},pressUntil(0xaf02,144),wait(60),read('masquerader-formation',0xaf02),shot('masquerader-battle'),pressUntil(0x10228,1),wait(120),
    {op:'hold',buttons:'left',frames:8},{op:'hold',buttons:'down',frames:125},pressUntil(0x10000,28),wait(240),read('queen-return-story',0x10000),read('queen-return-map',0x100,2),read('puss-departed',0x2982),shot('queen-returned'));
  for(const answer of[0,1]){
    rescue(28,[0,2],7);push(script([0xe0,122,0,40,48,0xb2]),wait(400),{op:'hold',buttons:'up',frames:30},pressUntil(0x12a,110),wait(180));
    if(answer)push({op:'tap',buttons:'down',frames:3,gap:3});
    push(pressUntil(0x10000,33),wait(120),read('fiona-answer-'+answer,0x2982),read('fiona-flag-'+answer,0x100a1),shot('fiona-return-'+answer));
  }
  function trial(story,partyIds,{selfish=false,cell=false,office=false}={}){
    rescue(story,partyIds,3);
    const evidence=new Array(12).fill(0);evidence[4]=selfish?6:1;evidence[5]=selfish?0x73:0;evidence[9]=story===44?0:16;
    const prison=new Array(16).fill(0);if(story!==44){prison[0]=cell?3:7;prison[2]=16;prison[7]=3;}if(office)prison[8]=32;
    push(write(0x10050,evidence),write(0x100a2,[0]),write(0x10190,prison));
  }
  for(const selfish of[false,true]){
    const key=selfish?'guilty':'innocent';trial(44,[0],{selfish});
    push(script([0xe0,27,2,8,23,0xb2]),wait(400),pressUntil(0x12a,selfish?6:7,40000),read('trial-'+key+'-intake',0x12a),
      pressUntil(0x100,71,10000,2),read('trial-'+key+'-votes',0x10051),read('trial-'+key+'-story',0x10000),read('trial-'+key+'-days',0x10197),shot('trial-'+key));
    if(!selfish){
      push(pressUntil(0x12a,0),wait(50),read('prison-counter-two',0x200),shot('prison-two-days'),
        pressUntil(0x10197,1),wait(60),read('prison-counter-one',0x200),shot('prison-one-day'),
        pressUntil(0x10000,46,20000),wait(120),read('prison-timed-party',0x2981),read('prison-timed-map',0x100,2),shot('prison-timed-rescue'));
    }
  }
  trial(45,[0],{office:true});push(script([0xe0,29,2,6,10,0xb2]),wait(400),{op:'hold',buttons:'down',frames:20},
    pressUntil(0x10000,46),wait(120),read('prison-office-party',0x2981),shot('prison-office-rescue'));
  trial(46,[0,2]);push(script([0xe0,28,4,25,9,0xb2]),wait(400),{op:'hold',buttons:'left',frames:20},pressUntil(0x12a,39),
    wait(180),{op:'tap',buttons:'a',frames:3,gap:100},{op:'hold',buttons:'left',frames:200},pressUntil(0xaf02,147),wait(240),
    read('tank-body',0xaf02),read('tank-head',0xaf08),read('tank-wheel',0xaf09),shot('duloc-tank-battle'),
    ...(name==='snes9x'?[{op:'read',name:'tank-battle-tiles',mem:'vram',addr:0x800,len:3072}]:[]),
    pressUntil(0x1021a,1),read('tank-collapsed',0x10199),shot('duloc-tank-defeated'));
  trial(46,[0,2]);push(write(0x10199,[4]),script([0xe0,21,0,31,52,0xb2]),wait(400),{op:'hold',buttons:'up',frames:60},
    pressUntil(0x100,19,15000,2),read('court-escape-story',0x10000),read('court-escape-fiona',0x2982),shot('court-escape'));
  trial(48,[0,2,1]);push(script([0xe0,20,2,7,6,0xb2]),wait(400),pressUntil(0x10000,51),wait(600),
    {op:'hold',buttons:'right',frames:34},pressUntil(0x100,208,15000,2),pressUntil(0x12000,13,6000),wait(240),read('forest-gate-future',0x100,2),read('forest-gate-event-count',0x12000),read('forest-gate-fiona',0x2982),shot('forest-gate-future'));
  function future(key,{password=true,onions,gold}={}){
    const ram=new Uint8Array(0x20000);seedFutureCheckpoint(ram,key);
    if(!password)ram[0x100ec]=17;
    const a=areas.find(a=>a.futureScene===key),map=a.id|((a.facing??1)<<9);
    push(load('carnival-kit'));
    for(const[p,n]of[[0x10000,1],[0x10058,1],[0x1005b,2],[0x100a4,2],[0x100ec,1],[0x101d0,1],[0x101ed,1],[0x101f0,1],[0x10148,24],[0x2980,9],[0x29af,1]])push(write(p,Array.from(ram.subarray(p,p+n))));
    if(key==='future-seeds')push(write(0x2411,[212]),write(0x2511,[1]));
    if(onions!==undefined)push(write(0x2400,[onions?189:0]),write(0x2500,[onions]),write(0x2c53,[gold&255,gold>>8,0]),write(0x12a,[0]));
    push(script([0xe0,map&255,map>>8,a.x,a.y,0xb2]),wait(400));
  }
  future('future-arrival');push(pressUntil(0x100a5,1),wait(120),read('future-arrived',0x100a5),shot('future-arrived'));
  for(const[onions,gold]of ratTheftCases){
    const key=`rat-theft-${onions}-${gold}`;future('future-scavengers',{onions,gold});
    push({op:'hold',buttons:'up right b',frames:11},{op:'hold',buttons:'right b',frames:8},{op:'hold',buttons:'down right b',frames:16},wait(600),
      read(key+'-item',0x2400),read(key+'-quantity',0x2500),read(key+'-gold',0x2c53,3),read(key+'-line',0x12a),read(key+'-rat-x',0x1812,2),shot(key));
  }
  future('factory-conveyor');push(read('conveyor-patrol-before',0x1810,2),wait(60),read('conveyor-patrol-after',0x1810,2),
    {op:'hold',buttons:'up b',frames:6},pressUntil(0x117,1,2000),wait(500),
    {op:'read',name:'conveyor-formation',mem:'wram',addr:0xaf02,len:8},shot('conveyor-battle'),
    pressUntil(0x117,0,15000),wait(120),read('conveyor-cleared',0x10210),read('conveyor-leader',0x197,2),
    read('conveyor-before-walk',0x1882,2),{op:'hold',buttons:'down b',frames:16},read('conveyor-after-walk',0x1882,2),read('conveyor-return-map',0x100,2),shot('conveyor-battle-cleared'));
  future('future-keeper');push({op:'hold',buttons:'up',frames:24},pressUntil(0xaf02,212),wait(300),{op:'read',name:'keeper-formation',mem:'wram',addr:0xaf02,len:8},
    {op:'read',name:'keeper-body-colors',mem:'wram',addr:0x20c2,len:30},shot('supply-keeper-battle'));
  if(name==='snes9x')push({op:'read',name:'keeper-body-tiles',mem:'vram',addr:0x7000,len:4096});
  for(let i=0;i<90;i++)push({op:'tap',buttons:'a',frames:3,gap:100});
  push({op:'hold',buttons:'up',frames:240},read('keeper-food-route',0x100,2),read('keeper-cleared',0x100ec),shot('keeper-food-route'));
  future('future-food');push(pressUntil(0x100a4,1),wait(120),read('future-seed-found',0x100a4),shot('future-seed-found'));
  const move=(addr,cmp,value,buttons,frames=1600)=>({op:'until',mem:'wram',addr,size:2,cmp,value:Math.round(value*16),frames,buttons,every:1,hold:1});
  future('future-rat');push({op:'hold',buttons:'down b',frames:18},{...pressUntil(0x100ec,49,1500),every:24},
    move(0x1882,'ge',133,'down b'),move(0x1802,'le',73,'left b'),move(0x1882,'ge',325,'down b'),
    move(0x1802,'ge',407,'right b'),move(0x1882,'ge',517,'down b'),move(0x1802,'le',313,'left b'),move(0x1882,'ge',693,'down b'));
  // Keep B/direction continuous while tapping A; releasing the whole pad
  // between taps would slow the player below the running rat.
  for(let i=0;i<80;i++)push({op:'hold',buttons:'left b a',frames:2},{op:'hold',buttons:'left b',frames:2});
  push(pressUntil(0x100ec,97,3000),read('rat-password',0x100ec),shot('rat-password'));
  future('future-passage-left',{password:false});push({op:'hold',buttons:'up',frames:10},{op:'hold',buttons:'l r',frames:8},
    {op:'tap',buttons:'l r a',frames:12,gap:400},read('passage-unknown',0x100a4),read('passage-unknown-text',0x12a));
  for(const side of['left','right']){
    future('future-passage-'+side);push({op:'hold',buttons:'up',frames:10});
    for(const buttons of['a','l a','r a'])push({op:'tap',buttons,frames:12,gap:400});
    push(read('passage-'+side+'-wrong',0x100a4),{op:'hold',buttons:'l r',frames:8},{op:'tap',buttons:'l r a',frames:12,gap:400},
      read('passage-'+side+'-open',0x100a4),shot('passage-'+side),{op:'hold',buttons:'l r',frames:8},
      {op:'tap',buttons:'l r a',frames:12,gap:400},read('passage-'+side+'-closed',0x100a4));
  }
  future('factory-entry');push({op:'hold',buttons:'up',frames:36},pressUntil(0x10058,4),read('factory-security',0x10058),shot('factory-security'));
  const releaseCode=()=>({op:'until',mem:'wram',addr:0x110,value:0,frames:5000});
  const code=buttons=>{for(const b of buttons)push({op:'tap',buttons:b,frames:12,gap:120});push(releaseCode(),wait(120));};
  future('factory-crane');push({op:'hold',buttons:'up',frames:12},wait(300),{op:'tap',buttons:'a',frames:12,gap:180});
  code(['a','b']);push(read('crane-wrong',0x10058));
  for(const [label,buttons]of[['first',['x','a']],['second',['b','b']],['repeat',['x','a']]]){
    push({op:'tap',buttons:'a',frames:12,gap:300},{op:'tap',buttons:'a',frames:12,gap:180});code(buttons);push(read('crane-'+label,0x10058));
  }
  push(shot('crane-cleared'));
  future('factory-lab');push({op:'hold',buttons:'up',frames:36},pressUntil(0x10058,101),wait(120));
  for(let i=0;i<100;i++)push({op:'tap',buttons:'a',frames:12,gap:120});
  push(read('factory-lab',0x10058),read('factory-lab-control',0x11f),shot('factory-lab'));
  future('factory-lock');push({op:'hold',buttons:'up',frames:12},wait(600),{op:'tap',buttons:'a',frames:12,gap:180});
  code(['x','a','y']);push(read('factory-lock-wrong',0x101d0),{op:'tap',buttons:'a',frames:12,gap:600},{op:'tap',buttons:'a',frames:12,gap:180});
  code(['x','a','b','y']);push(read('factory-lock-open',0x101d0),shot('factory-lock-open'));
  future('factory-power');push({op:'hold',buttons:'up',frames:12},pressUntil(0x10000,63),read('factory-emergency',0x101ed),wait(240),
    move(0x1884,'ge',438,'down b'),pressUntil(0x101d0,3),{op:'until',mem:'wram',addr:0x11f,value:1,frames:2500},
    read('factory-doors',0x101d0),shot('factory-doors'),move(0x1884,'ge',767,'down b'),
    move(0x1804,'le',697,'left down b'),{op:'until',mem:'wram',addr:0x100,size:2,value:230,frames:1200,buttons:'up b',every:1,hold:1},wait(400),
    read('factory-ladder-map',0x100,2),read('factory-ladder-story',0x10000),shot('factory-ladder'));
  for(const hesitate of[false,true]){
    const key=hesitate?'hesitate':'agree';future('future-archive');
    push({op:'hold',buttons:'up',frames:24},pressUntil(0x12a,78,25000),wait(180));
    if(hesitate)push({op:'tap',buttons:'down',frames:3,gap:3});
    push(pressUntil(0x10000,54),wait(120),read('archive-'+key,0x10000),shot('archive-'+key));
  }
  future('future-seeds');push({op:'hold',buttons:'up',frames:8},pressUntil(0x10000,55),wait(120),read('future-seeds-returned',0x10000),read('future-bike-key',0x2411),shot('future-seeds-returned'));
  for(const companion of['donkey','fiona']){
    future('puppet-recruit');push({op:'hold',buttons:'up',frames:24},pressUntil(0x12a,58,22000),wait(180),{op:'tap',buttons:'a',frames:3,gap:600},{op:'tap',buttons:'start',frames:8,gap:360},pressUntil(0x12a,77),wait(180));
    if(companion==='fiona')push({op:'tap',buttons:'down',frames:3,gap:3});
    push(pressUntil(0x10000,60),wait(400),read('puppet-join-'+companion,0x2982),read('puppet-join-mask-'+companion,0x29af),{op:'read',name:'puppet-name-'+companion,mem:'wram',addr:0x2c35,len:6},shot('puppet-join-'+companion));
    future('puppet-brothers-'+companion);push(pressUntil(0xaf02,248,22000),wait(120),{op:'read',name:'brothers-formation-'+companion,mem:'wram',addr:0xaf02,len:8},shot('brothers-'+companion),pressUntil(0x100,498,24000,2),read('brothers-rescued-'+companion,0x10000),read('brothers-return-'+companion,0x101f0),shot('brothers-rescued-'+companion));
  }
  future('puppet-repair');push(pressUntil(0x100,464,22000,2),wait(600),read('puppet-four-map',0x100,2),read('puppet-four-mask',0x29af),{op:'read',name:'puppet-four-party',mem:'wram',addr:0x2980,len:9},shot('puppet-four-at-inn'));
  const selectedSteps=routesOnly?[...steps.slice(0,introEnd),...steps.slice(routesStart)]:partyArtOnly?[...steps.slice(0,introEnd),...steps.slice(castStageStart,castStageEnd),...steps.slice(partyStart,partyEnd)]:steps;
  const file=path.join(out,'steps.json');await writeFile(file,JSON.stringify(selectedSteps,null,2)+'\n');
  console.log(partyArtOnly?`Checking all party art, workshop puppets and portraits with ${name}…`:`Checking native sprites, travel, Carnival, medieval rescue, trial/prison and the empty future with ${name}…`);
  await new Promise((resolve,reject)=>{
    const child=spawn(host,['--core',core,'--rom',rom,'--out',out,'--script',file,'--sram','zero','--quiet'],{stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',b=>output=(output+b).slice(-4000));child.stderr.on('data',b=>output=(output+b).slice(-4000));
    child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(`${name} exited ${code}: ${output}`)));
  });
  const result=JSON.parse(await readFile(path.join(out,'results.json'))),v=result.values;
  assert.equal(v.bedroom,2);assert.equal(v.idleOpcode,0xb2);
  if(!routesOnly)await verifyPartyArt(name,out,v,puppetShots);
  if(partyArtOnly){
    assert.equal(v.castNpcScript,0x57d);assert.equal(v.castControllerScript,0x25c);
    const frames=partyChecks.reduce((n,a)=>n+(name==='snes9x'?built.audit.characters[a.id].frameCount:a.shots.length),0);
    reports.push({core:result.core.library_name,version:result.core.library_version,romSha256:fingerprint,emulatedFrames:result.frames,partyFrames:frames,workshopFrames:name==='snes9x'?256:puppetShots.length,portraits:7,shots:result.shots.map(s=>s.name)});
    console.log(`${name}: ${frames} party frames, workshop puppets, both Puss weapons and all seven portraits passed (${fingerprint.slice(0,12)}).`);
    continue;
  }
  if(!routesOnly){
  assert.equal(v.boarded&0xe3,0xe3);
  assert.equal(v.flightMap,496);assert.ok(v.flying&64);assert.equal(v.landed&64,0);assert.equal(v.walking,0);
  assert.equal(v.timeGauge,8);assert.equal(v.unrepaired&32,0);assert.equal(v.medieval,497);assert.equal(v.stillUnrepaired&32,0);
  assert.equal(v.arrivalMap,474);assert.equal(v.arrivalLine,129);assert.equal(v.brokenHarness,5);
  assert.equal(v.approachMap,474);assert.equal(v.approachLine,129);assert.notEqual(v.endingScript,0x97a6,'ending left its initial synchronization loop');
  assert.equal(v.castNpcScript,0x57d);assert.equal(v.castControllerScript,0x25c);
  for(const actor of supportingCast){
    const p=0x240000+u16(built.rom,0x242a00+actor.palette*2);
    assert.equal(v['cast-'+actor.key+'-front'],1);
    assert.equal(v['cast-'+actor.key+'-ink'],u16(built.rom,p));
    assert.equal(v['cast-'+actor.key+'-last-color'],u16(built.rom,p+22));
    assert.equal(v['cast-'+actor.key+'-last-frame'],actor.frames-1);
  }
  for(let tier=0;tier<6;tier++)assert.equal(v['guy-fieri-tier-'+tier+'-palette'],u16(built.rom,0x242a00+guyFieriTiers[tier].palette*2));
  for(const actor of carnivalActors){
    const p=u16(built.rom,0x242a00+actor.palette*2);
    assert.equal(v['carnival-'+actor.key+'-frame'],actor.enemy===undefined?0:4);
    assert.equal(v['carnival-'+actor.key+'-palette'],p);assert.equal(v['carnival-'+actor.key+'-ink'],u16(built.rom,0x240000+p));
    assert.equal(v['carnival-'+actor.key+'-last-frame'],actor.frames-1);
  }
  for(const actor of courtBeasts)for(let frame=0;frame<31;frame++){
    const key=actor.key+'-'+frame;assert.equal(v[key+'-frame'],frame);assert.equal(v[key+'-tile'],64);
    if(name==='snes9x')assert.deepEqual(v[key+'-tiles'],beastTiles(frame),key+' native tiles');
    if([3,6,16,24,30].includes(frame))await checkBeastPixels(path.join(out,key+'.png'),frame);
  }
  for(const actor of dulocTank)for(let frame=0;frame<actor.frames;frame++){
    const key=actor.key+'-'+frame;assert.equal(v[key+'-frame'],frame);assert.equal(v[key+'-tile'],64);
    if(name==='snes9x'){
      const expected=tankTiles(actor,frame),actual=actor.enemy===147?v[key+'-tiles']:[...v[key+'-upper'],...v[key+'-lower']];
      if(actor.enemy!==147&&actor.key!=='sky-drake')assert.deepEqual(actual,expected,key+' native tiles');
    }
    if(actor.enemy!==147)await checkTankPixels(path.join(out,key+'.png'),actor,frame);
  }
  for(const actor of machineActors){
    const palette=0x240000+u16(built.rom,0x242a00+actor.palette*2),large=(actor.size&3)===2;
    assert.deepEqual(v[actor.key+'-colors'],Array.from(built.rom.slice(palette,palette+24)));
    for(let frame=0;frame<actor.frames;frame++){
      const key='machine-'+actor.key+'-'+frame;assert.equal(v[key+'-frame'],frame,key+' frame');assert.equal(v[key+'-tile'],actor.enemy===undefined?actor.size&1?192:384:64,key+' native tile allocation');
      if(actor.enemy===undefined&&(actor.size&3)===1){assert.equal(v[actor.key+'-preview-free'],0x8080);assert.equal(v[actor.key+'-preview-old'],30);}
      if(name==='snes9x')assert.deepEqual(Array.from({length:large?6:actor.size&1?4:2},(_,i)=>v[key+'-tiles-'+i]).flat(),machineTiles(actor,frame),key+' native tiles');
      if(large||medinaActors.includes(actor)||bridgeActors.includes(actor)||enforcerActors.includes(actor)||bakeryActors.includes(actor)||bakeryVillagers.includes(actor)||skyDrakes.includes(actor)||[0,actor.frames-1].includes(frame))await checkMachinePixels(path.join(out,key+'.png'),actor,frame);
    }
  }
  }
  if(name==='snes9x')assert.deepEqual(v['tank-battle-tiles'],tankTiles(built.audit.dulocTank.actors[0],0),'real three-part battle tank tiles');
  assert.equal(v['keeper-formation'][0],212);assert.equal(v['keeper-formation'].filter(id=>id===207).length,2);
  const keeperPalette=0x3624c0+57*210+5*30;assert.deepEqual(v['keeper-body-colors'],Array.from(built.rom.slice(keeperPalette,keeperPalette+30)));
  // The Guardian keeps its stock background body; the retired Storekeeper art is inactive.
  if(name==='snes9x')assert.deepEqual(v['keeper-body-tiles'],Array.from(decompress(built.base,fileOffset(u24(built.base,0x362220+186*3))).bytes));
  assert.equal(v['keeper-cleared']&1,1);assert.equal(v['keeper-food-route'],344);
  assert.equal(v['carnival-j'],151);assert.equal(v['carnival-shaggy'],152);assert.equal(v['carnival-milenko'],153);
  assert.equal(v['carnival-head'],80);assert.equal(v['carnival-head-quantity'],1);assert.equal(v['carnival-return-map'],497);assert.equal(v['carnival-story'],96);
  assert.equal(v['hatchet-battle-puss'],4);assert.equal(v['hatchet-battle-weapon'],66);
  assert.equal(v['fiona-vanished'],16);assert.equal(v['puss-joined'],21);assert.equal(v['puss-party'],4);assert.equal(v['masquerader-formation'],144);
  assert.equal(v['queen-return-story'],28);assert.equal(v['queen-return-map'],120);assert.ok(v['puss-departed']&128);
  for(const answer of[0,1]){assert.equal(v['fiona-answer-'+answer],1);assert.equal(v['fiona-flag-'+answer]&4,0);}
  for(const selfish of[false,true]){
    const key=selfish?'guilty':'innocent';assert.equal(v['trial-'+key+'-intake'],selfish?6:7);assert.equal(v['trial-'+key+'-votes'],selfish?6:0);
    assert.equal(v['trial-'+key+'-story'],45);assert.equal(v['trial-'+key+'-days'],3);
  }
  assert.equal(v['prison-counter-two'],2);assert.equal(v['prison-counter-one'],1);assert.equal(v['prison-timed-party'],2);assert.equal(v['prison-timed-map'],30);
  assert.equal(v['prison-office-party'],2);assert.equal(v['tank-body'],147);assert.equal(v['tank-head'],173);assert.equal(v['tank-wheel'],148);assert.ok(v['tank-collapsed']&4);
  assert.equal(v['court-escape-story'],48);assert.equal(v['court-escape-fiona'],1);assert.equal(v['forest-gate-future'],208);assert.equal(v['forest-gate-event-count'],13);assert.equal(v['forest-gate-fiona'],1);
  assert.equal(v['future-arrived'],1);assert.equal(v['future-seed-found'],1);assert.equal(v['archive-agree'],54);assert.equal(v['archive-hesitate'],54);assert.equal(v['future-seeds-returned'],55);assert.equal(v['future-bike-key'],213);
  for(const[onions,gold,line]of ratTheftCases){
    const key=`rat-theft-${onions}-${gold}`;
    assert.equal(v[key+'-quantity'],Math.max(0,onions-1),key+' quantity');
    assert.equal(v[key+'-gold'],gold-(!onions&&gold>=500?500:0),key+' gold');
    assert.equal(v[key+'-line'],line??0,key+' text');assert.equal(v[key+'-rat-x'],v['rat-theft-3-1000-rat-x'],key+' same native patrol after contact');
  }
  assert.notEqual(v['conveyor-patrol-before'],v['conveyor-patrol-after']);
  assert.deepEqual(v['conveyor-formation'],[140,140,140,140,255,255,255,255]);assert.equal(v['conveyor-cleared'],0);assert.equal(v['conveyor-return-map'],232);
  assert.equal(v['conveyor-leader'],2);assert.ok(v['conveyor-after-walk']>v['conveyor-before-walk'],'native field movement resumes after the conveyor battle');
  assert.equal(v['rat-password'],97);assert.equal(v['passage-unknown'],1);assert.equal(v['passage-unknown-text'],202);
  for(const [side,bit]of[['left',32],['right',64]]){assert.equal(v['passage-'+side+'-wrong'],1);assert.equal(v['passage-'+side+'-open'],1|bit);assert.equal(v['passage-'+side+'-closed'],1);}
  assert.equal(v['factory-security'],4);assert.equal(v['crane-wrong'],4);assert.equal(v['crane-first'],36);assert.equal(v['crane-second'],100);assert.equal(v['crane-repeat'],100);
  assert.equal(v['factory-lab'],101);assert.equal(v['factory-lab-control'],1);assert.equal(v['factory-lock-wrong'],0);assert.equal(v['factory-lock-open'],1);
  assert.equal(v['factory-emergency'],1);assert.equal(v['factory-doors'],3);assert.equal(v['factory-ladder-map'],230);assert.equal(v['factory-ladder-story'],63);
  for(const companion of['donkey','fiona']){
    assert.equal(v['puppet-join-'+companion],companion==='donkey'?2:1);assert.equal(v['puppet-join-mask-'+companion],240);
    assert.deepEqual(v['puppet-name-'+companion],Array.from(encode('Pinoc',{length:6,pad:0})));
    assert.equal(v['brothers-formation-'+companion].filter(id=>id===248).length,6);assert.equal(v['brothers-rescued-'+companion],66);assert.ok(v['brothers-return-'+companion]&128);
  }
  assert.equal(v['puppet-four-map'],464);assert.equal(v['puppet-four-mask'],240);assert.deepEqual(v['puppet-four-party'].filter(id=>id<7).sort((a,b)=>a-b),[0,1,2,3]);
  const racing=await checkIndependentRacing({host,core,rom,out:path.join(out,'racing'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const medina=await checkIndependentMedina({host,core,rom,out:path.join(out,'medina'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const pyramid=await checkIndependentPyramid({host,core,rom,out:path.join(out,'pyramid'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const bridge=await checkIndependentBridge({host,core,rom,out:path.join(out,'bridge'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const villages=await checkIndependentVillages({host,core,rom,out:path.join(out,'villages'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const fortress=await checkIndependentFortress({host,core,rom,out:path.join(out,'fortress'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const hideout=await checkIndependentHideout({host,core,rom,out:path.join(out,'hideout'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const bakery=await checkIndependentBakery({host,core,rom,out:path.join(out,'bakery'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const bakeryChapter=await checkIndependentBakeryChapter({host,core,rom,out:path.join(out,'bakery-chapter'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  const bakeryReturn=await checkIndependentBakeryReturn({host,core,rom,out:path.join(out,'bakery-return'),built,name,checkpoint:path.join(out,'carnival-kit.state')});
  reports.push({core:result.core.library_name,version:result.core.library_version,romSha256:fingerprint,frames:result.frames,racing,medina,pyramid,bridge,villages,fortress,hideout,bakery,bakeryChapter,bakeryReturn,values:v,shots:result.shots.map(s=>s.name)});
  const checkedFrames=partyChecks.reduce((n,a)=>n+(name==='snes9x'?built.audit.characters[a.id].frameCount:a.shots.length),0);
  console.log(routesOnly?`${name}: native travel, combat, puzzles, quests and connected chapters passed; shared actor-preview coverage is excluded.`:`${name}: party poses (${checkedFrames} exact ${name==='snes9x'?'VRAM frames':'pixel patterns'}), portraits, Dragon, supporting cast, Guy Fieri, court beasts, Duloc Tank, workshop puppets, future machines and wildlife, Horner, cave guardian and swamp creatures, large-frame streaming, Carnival, medieval rescue, trial/prison, empty-future scenes, rat theft, both native race modes, Medina routes, pyramid gifts, bridge guards and both enforcers, the complete bridge defense, village services, the continuous Rowan quest, fortress duels, Farquaad's ritual, the complete Horner hideout, both connected Bakery chapters and sky drakes passed.`);
}
await writeFile(path.join(outputRoot,'report.json'),JSON.stringify({romSha256:fingerprint,reports},null,2)+'\n');
