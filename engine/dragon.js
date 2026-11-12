import {sceneCells} from './scene-map.js';
import {rasterArt,rasterArtInfo} from './raster-art.js';
import {snesColor,tile4bpp} from './sprites.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {compress,decompress} from './compression.js';
import {compileSpriteFrames} from './native-sprites.js';
import {patchDragonMode7} from './dragon-mode7.js';
import {dragonArt} from '../content/dragon-art.js';
import {cartridgeDataAddress} from './expanded-rom.js';


// Indexed pixels of one imported Dragon image (0 transparent, 1-12 colors).
export function dragonPixels(image) {
  const out=new Uint8Array(image.width*image.height);
  image.rows.forEach((row,y)=>{for(let x=0;x<image.width;x++)out[y*image.width+x]=parseInt(row[x],16);});
  return out;
}

export const dragonColors=dragonArt.palette;
export function dragonPalette({world=false}={}) {
  const p=new Uint8Array(32);dragonColors.forEach((c,i)=>put16(p,(i+(world?4:1))*2,snesColor(c)));return p;
}

// The hangar and boarding maps share a mirrored 112x160 footprint: Dragon
// resting with folded wings, her harness seats on the original rider points.
// The art comes from assets/imagegen/dragon via scripts/import-dragon-art.mjs.
export function dragonLarge() {
  return dragonPixels(dragonArt.folded);
}

// The flight maps place the same body at x+64 with the wings spread. Only the
// wing-root strips beside the body differ from the folded art, so those cells
// fit the spare native attachment tiles.
export function dragonLargeWinged() {
  return dragonPixels(dragonArt.winged);
}

// Small world frames use the native 31x32 mirrored front/back footprint and
// 32x32 side footprint. Wing beats change the original DMA source rectangles.
export function dragonWorld(facing='front',wing=0) {
  const frame=dragonArt.world[facing+(facing==='left'?Math.min(wing,1):wing)];
  if(!frame)throw Error('Unknown Dragon world frame '+facing+wing);
  return dragonPixels(frame);
}

export function patchDragon(base,allocate,add,allocateData=allocate) {
  const lz=p=>decompress(base,fileOffset(u24(base,p))).bytes;
  const packet=(p,data,label)=>{const address=allocateData(compress(data),label),b=new Uint8Array(3);put24(b,0,cartridgeDataAddress(address));add(p,b,label+' pointer');return address;};
  const world=lz(0x6fdf3);
  if(world.length!==4096)throw Error('Unexpected native vehicle bank');
  function worldRect(pixels,sx,sy,w,h,dx,dy) {
    const colors=Uint8Array.from(pixels,c=>c?c+3:0);
    for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=8)world.set(tile4bpp(colors,32,sx+x,sy+y),((dy+y)/8*16+(dx+x)/8)*32);
  }
  for(const [x,wing]of [[0,0],[16,1],[32,2],[48,1]])worldRect(dragonWorld('front',wing),0,0,16,32,x,0);
  worldRect(dragonWorld('back',2),0,0,16,32,64,0);
  const left0=dragonWorld('left',0),left1=dragonWorld('left',1);
  worldRect(left0,0,0,16,32,80,0);worldRect(left0,16,8,16,16,96,0);worldRect(left1,16,8,16,16,96,16);
  worldRect(dragonWorld('front',1),0,0,16,16,112,0);worldRect(dragonWorld('back',1),0,16,16,16,112,16);
  worldRect(dragonWorld('front',0),0,0,16,32,0,32);
  packet(0x6fdf3,world,'Dragon native world vehicle frames');
  // Give the vehicle OBJ palette 7. Palette 0 is shared with year signs and
  // background actors, so changing it would recolor unrelated world objects.
  const worldPalette=dragonPalette({world:true});
  // The world loader replaces the last palette row in its NMI shadow with
  // this otherwise-black fixed row after loading the map's full palette.
  if(base.subarray(0x6f620,0x6f640).some(Boolean))throw Error('Reserved world palette is not blank');
  add(0x6f620,worldPalette,'Dragon fixed overworld palette row');
  for(const id of[4,5,6,7,8,9,10]) {
    const p=lz(0x6fea0+id*3);
    if(p.length!==512)throw Error('Vehicle palette packet has unexpected size');
    p.set(worldPalette,480);packet(0x6fea0+id*3,p,'Dragon world palette '+id);
  }
  for(const p of[0x2431d,0x24351,0x2439d,0x24445,0x246eb]) {
    if(base[p]!==0xa9||![0xa0,0xb0].includes(base[p+1])||base[p+2]!==0x9d||u16(base,p+3)!==15)throw Error('Vehicle palette instruction signature');
    add(p+1,Uint8Array.of(base[p+1]|14),'Dragon isolated OBJ palette '+p.toString(16));
  }
  // The present-day world script (the attract demo's flight past the swamp
  // home) sets the vehicle's palette itself with world opcode 01, argument 00,
  // followed by 02 B0 for priority. Point that one argument at palette 7 too.
  const worldScript=lz(0x6ffe0),scriptPalette=0xff6;
  if(worldScript.length!==5557||![0x01,0x00,0x02,0xb0].every((v,i)=>worldScript[scriptPalette+i]===v))throw Error('Present-day world script palette signature');
  worldScript[scriptPalette+1]=14;
  packet(0x6ffe0,worldScript,'Dragon palette in the present-day world script');

  const large=dragonLarge(),cells=sceneCells(base,121,39).filter(c=>(c.word&1023)>=768),graphics=new Uint8Array(8192),seen=new Set();
  // Preserve native mirrored tile addressing; the tiny repeated saddle-pad
  // tiles have deliberately repeating art, not duplicated allocations.
  for(const cell of cells) {
    const tile=cell.word&1023;if(seen.has(tile))continue;seen.add(tile);
    const pixels=new Uint8Array(64);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)pixels[(cell.word&0x8000?7-y:y)*8+(cell.word&0x4000?7-x:x)]=large[(cell.y-96+y)*112+cell.x-72+x];
    graphics.set(tile4bpp(pixels,8,0,0),(tile-768)*32);
  }
  const foldedTiles=seen.size,winged=dragonLargeWinged();
  // Alternate maps add the unfolded wings and intermediate attachment tiles.
  // Reuse every shared body tile; author only the additional native slots.
  for(const [map,originY]of[[51,304],[145,304],[146,304],[53,48],[170,336]]) {
    for(const cell of sceneCells(base,map,26)) {
      const tile=cell.word&1023,x0=cell.x-8,y0=cell.y-originY;
      if(tile<768||seen.has(tile)||x0<0||x0+8>240||y0<0||y0+8>160)continue;
      const pixels=new Uint8Array(64);
      for(let y=0;y<8;y++)for(let x=0;x<8;x++)pixels[(cell.word&0x8000?7-y:y)*8+(cell.word&0x4000?7-x:x)]=winged[(y0+y)*240+x0+x];
      graphics.set(tile4bpp(pixels,8,0,0),(tile-768)*32);seen.add(tile);
    }
  }
  // A flat color-13 tile is also used as the entire time-tunnel mask. Give
  // that use its own formerly-unreferenced tile, leaving the saddle editable.
  const tunnelTile=776;
  const referenced=new Set();
  for(const set of[26,39]){const a=lz(0x362100+set*3);for(let p=0;p<a.length;p+=2){const t=u16(a,p)&1023;referenced.add(t);if(t===tunnelTile)throw Error('Dragon tunnel tile already referenced');}}
  const free=Array.from({length:256},(_,i)=>i+768).filter(t=>t!==tunnelTile&&!referenced.has(t)),wingRemap=new Map();
  // Unfolded wings extend through pixels that are transparent on the parked
  // body. Give those cells separate tile slots in tileset 26, so their roots
  // remain attached without widening the folded wings in the hangar.
  for(const cell of sceneCells(base,51,26)) {
    const tile=cell.word&1023,x0=cell.x-8,y0=cell.y-304;
    if(tile<768||tile===1016||wingRemap.has(tile)||x0<0||x0+8>240||y0<0||y0+8>160)continue;
    const pixels=new Uint8Array(64);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)pixels[(cell.word&0x8000?7-y:y)*8+(cell.word&0x4000?7-x:x)]=winged[(y0+y)*240+x0+x];
    const bytes=tile4bpp(pixels,8,0,0),before=graphics.subarray((tile-768)*32,(tile-767)*32);
    if(bytes.every((v,i)=>v===before[i]))continue;
    const replacement=free.shift();if(replacement===undefined)throw Error('No native wing attachment tiles remain');
    graphics.set(bytes,(replacement-768)*32);wingRemap.set(tile,replacement);
  }
  graphics.set(tile4bpp(new Uint8Array(64).fill(13),8,0,0),(tunnelTile-768)*32);
  for(let i=0;i<2;i++)packet(0x362220+(116+i)*3,graphics.slice(i*4096,(i+1)*4096),'Dragon boarding graphics '+i);
  for(const set of[26,39]) {
    const assembly=lz(0x362100+set*3);
    for(let p=0;p<assembly.length;p+=2){let w=u16(assembly,p);if(w===0x0ff8)w=(w&~1023)|tunnelTile;else if((w&1023)>=768){if(set===26&&wingRemap.has(w&1023))w=(w&~1023)|wingRemap.get(w&1023);if(w&0x1c00)w=(w&~0x1c00)|(3<<10);}put16(assembly,p,w);}
    packet(0x362100+set*3,assembly,'Dragon boarding tile assembly '+set);
  }
  const palette=dragonPalette();
  for(const id of[11,36,68])add(0x3624c0+id*210+60,palette.slice(2,26),'Dragon boarding palette '+id);
  // Reuse the vehicle seats' exclusive twelve-color palette for all three
  // vehicle actors. NPC and enemy headers both order gfx/assembly/palette/anim.
  const spritePalette=219;
  for(let i=0;i<256;i++)if((i!==169+7&&base[0x24f002+i*5]===spritePalette)||base[0x24f602+i*10]===spritePalette)throw Error('Dragon sprite palette shared outside the vehicle');
  add(0x240000+u16(base,0x242a00+spritePalette*2),palette.slice(2,26),'Dragon vehicle actor palette');
  function actor(npc,frames,dimensions) {
    const h=0x24f000+(npc+7)*5,gfx=base[h],asm=base[h+1],data=compileSpriteFrames(frames,dimensions);
    const address=fileOffset(u24(base,0x242300+asm*3)),end=Math.min(...Array.from({length:256},(_,i)=>fileOffset(u24(base,0x242300+i*3))).filter(p=>p>address));
    if(data.assembly.length!==end-address)throw Error('Dragon actor must replace every native frame without crossing its allocation');
    packet(0x242000+gfx*3,data.graphics,'Dragon vehicle actor '+npc);
    add(address,data.assembly,'Dragon vehicle actor assembly '+npc);
    add(h+2,Uint8Array.of(spritePalette),'Dragon vehicle actor palette selection '+npc);
  }
  // The seat actor is drawn over the flight maps at canvas (88,74), where those
  // maps leave the harness cells empty, so it carries that part of the art.
  const seats={pixels:new Uint8Array(64*32)};
  for(let y=0;y<32;y++)for(let x=0;x<64;x++)seats.pixels[y*64+x]=winged[(74+y)*240+88+x];
  actor(169,[seats.pixels,seats.pixels],{width:64,height:32,size:1});
  actor(174,[dragonWorld('front',0),dragonWorld('front',1)]);
  const fragments=Array.from({length:3},(_,f)=>rasterArt('dragon-fragments',{pose:'native',facing:1,phase:f}));
  actor(144,fragments);
  const mode7=patchDragonMode7(base,packet,add,palette,dragonWorld('back',2));
  return {worldBytes:world.length,worldAnimations:[24,25,26,27,28,29,30,45],boardingGraphics:[116,117],boardingLocations:[243,367,377,432,472,473,477],foldedTiles,boardingTiles:seen.size,wingAttachmentTiles:wingRemap.size,colors:12,fragmentArt:{rasterFrames:3,proceduralFrames:0,sources:rasterArtInfo('dragon-fragments').provenance},extraVramBytes:0,extraWramBytes:0,mode7,riderSeats:'native',vehicleActors:[144,169,174],spritePalette};
}
