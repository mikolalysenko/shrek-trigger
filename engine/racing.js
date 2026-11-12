import {cartColors,cartRaceFrames} from '../content/racing.js';
import {racingCartSprite,racingMiniatures,racingFieldCart} from './rivet-art.js';
import {compress,decompress} from './compression.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {snesColor,tile4bpp} from './sprites.js';

const packetSizes=[11776,256,9216,512];
const cartTiles=Array.from({length:72},(_,i)=>Math.floor(i/12)*16+i%12);
export const racingBackground={graphics:37,tileset:7,palette:19,paletteRow:6,locations:[212,213,223,224,225],maps:[126,126,126,127,126],width:96,height:48};

// The race's software projector consumes raw indices with a fixed 64-byte
// stride. These are not conventional planar SNES OBJ tiles. Its existing
// projection code, image offsets and work buffers remain unchanged.
export function racingPackets(base){
  const source=packetSizes.map((size,id)=>{
    const p=decompress(base,fileOffset(u24(base,0x3e0006+id*3))).bytes;
    if(p.length!==size)throw Error('Native race packet size changed: '+id);
    return p;
  });
  // Rivet (packet 2, palette rows 9/13) keeps Johnny's stock race art.
  const out=source.map(p=>new Uint8Array(p.length));out[2]=source[2].slice();
  for(const [id,width,frames,draw]of[[0,32,cartRaceFrames,racingCartSprite]]){
    for(const f of frames){
      const pixels=draw(f);
      if(pixels.length!==width*f.height||pixels.some(v=>v>15))throw Error('Race projection artwork exceeds its native dimensions or palette');
      for(let y=0;y<f.height;y++)out[id].set(pixels.subarray(y*width,(y+1)*width),f.offset+y*64);
    }
  }
  out[1]=racingMiniatures();out[3]=source[3].slice();
  for(const [rows,colors]of[[[8,12],cartColors]])for(const row of rows){
    if(colors.length!==15)throw Error('Native race palette requires 15 visible colors');
    // Index zero is transparent; preserve its original value as well as all
    // scenery/HUD colors in the other twelve rows.
    colors.forEach((c,i)=>put16(out[3],row*32+(i+1)*2,snesColor(c)));
  }
  return out;
}

export function compileRacingBackground(base){
  const b=racingBackground;
  if(base[0x361c00+b.tileset*8+3]!==b.graphics)throw Error('Parked cart background bank changed');
  for(let i=0;i<64;i++)if(i!==b.tileset&&base.slice(0x361c00+i*8,0x361c00+(i+1)*8).includes(b.graphics))throw Error('Parked cart background bank is shared');
  for(let i=0;i<512;i++)if(base[0x360001+i*14]===b.tileset||base[0x360003+i*14]===b.palette){
    const n=b.locations.indexOf(i);
    if(n<0||base[0x360001+i*14]!==b.tileset||base[0x360003+i*14]!==b.palette||u16(base,0x360004+i*14)!==b.maps[n])throw Error('Parked cart location ownership changed');
  }
  const assembly=decompress(base,fileOffset(u24(base,0x362100+b.tileset*3))).bytes,uses=new Map();
  for(let i=0;i<assembly.length;i+=2){
    const word=u16(assembly,i),tile=(word&1023)-640,palette=word>>10&7,body=cartTiles.includes(tile);
    if((palette===7)!==body)throw Error('Parked cart palette or tiles have another owner');
    if(body)uses.set(tile,(uses.get(tile)??0)+1);
  }
  if(uses.size!==72||[...uses.values()].some(n=>n!==2))throw Error('Parked cart assembly footprint changed');
  const graphics=decompress(base,fileOffset(u24(base,0x362220+b.graphics*3))).bytes;
  if(graphics.length!==4096)throw Error('Parked cart graphics budget changed');
  const pixels=racingFieldCart();
  if(pixels.length!==b.width*b.height||pixels.some(v=>v>15))throw Error('Parked cart artwork exceeds its native dimensions or palette');
  for(let y=0;y<6;y++)for(let x=0;x<12;x++)graphics.set(tile4bpp(pixels,b.width,x*8,y*8),(y*16+x)*32);
  return {graphics,tiles:cartTiles.slice()};
}

export function patchRacing(base,allocate,add){
  const packets=racingPackets(base),audit=[];
  const packet=(pointer,bytes,label)=>{
    const offset=allocate(compress(bytes),label),p=new Uint8Array(3);put24(p,0,0xc00000|offset);add(pointer,p,label+' pointer');
    return {pointer,offset,decodedBytes:bytes.length};
  };
  for(let id=0;id<packets.length;id++)audit.push({id,...packet(0x3e0006+id*3,packets[id],['Racing cart projection frames','Racing minimap icons','Rivet stock projection frames','Racing palettes'][id])});
  const b=racingBackground,bg=compileRacingBackground(base),background=packet(0x362220+b.graphics*3,bg.graphics,'Parked cart background graphics');
  const colors=new Uint8Array(30);cartColors.forEach((c,i)=>put16(colors,i*2,snesColor(c)));
  add(0x3624c0+b.palette*210+b.paletteRow*30,colors,'Parked cart background palette');
  return {packets:audit,cartFrames:7,rivetFrames:0,miniatures:4,background:{...b,...background,tiles:bg.tiles.length},extraVramBytes:0,extraWramBytes:0,native:true};
}
