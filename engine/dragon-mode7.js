import {dragonArt} from '../content/dragon-art.js';
import {tile4bpp} from './sprites.js';
import {u24,fileOffset} from './rom.js';
import {decompress} from './compression.js';

// These are the cartridge's original Mode 7 resource numbers (hexadecimal).
// The projected sprites are linear color indices with a 64-byte row stride;
// only the left 32 pixels are sampled by the native projection routine.
export const dragonMode7Resources=[0x22,0x23,0x24,0x26,0x27,0x35,0x46];

const pixelsOf=image=>{const out=new Uint8Array(image.width*image.height);image.rows.forEach((row,y)=>{for(let x=0;x<image.width;x++)out[y*image.width+x]=parseInt(row[x],16);});return out;};

// Projected 32x16 views for the approach, banking and ending. They reuse the
// world frames, squashed 2:1 for the low camera, narrowed between views and
// sheared when banking. They follow the original Epoch table in resource $46:
// heading 0 faces the camera (head-down front art), pi flies away from it
// (rear art, head up), and pi/2 is a side view. In that table the Epoch's nose
// points left at every angle, so the ending passes headLeft; the approach's
// side sprite keeps its head-right view.
export function dragonGlide(angle=0,bank=0,{headLeft=false}={}) {
  const s=Math.abs(Math.sin(angle)),c=Math.cos(angle),side=s>=Math.sin(Math.PI*3/8);
  let frame=pixelsOf(dragonArt.world[side?'left0':c>0?'front0':'back0']);
  const width=Math.max(.55,side?s:Math.abs(c));
  if(side){
    // Center the side view horizontally; mirror it when the head leads right.
    let x0=32,x1=-1;for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(frame[y*32+x]){x0=Math.min(x0,x);x1=Math.max(x1,x);}
    const shift=Math.round((31-(x0+x1))/2),m=new Uint8Array(1024);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){const sx=headLeft?x-shift:31-x-shift;if(sx>=0&&sx<32)m[y*32+x]=frame[y*32+sx];}
    frame=m;
  }
  const out=new Uint8Array(512);
  for(let y=0;y<16;y++)for(let x=0;x<32;x++){
    const sx=Math.round(15.5+(x+.5-15.5)/width-.5),sy=y-(bank?Math.round((x-15.5)*.12):0);
    if(sx<0||sx>31||sy<0||sy>15)continue;
    out[y*32+x]=frame[sy*2*32+sx]||frame[(sy*2+1)*32+sx];
  }
  return out;
}

export function dragonSaddleView() {
  // Rider's view over Dragon's neck with her wings spread to both edges. Below
  // the original raster split (row 40) the sky layer is unavailable, so the
  // wings cover that entire BG region; the art is mirrored about the center.
  const pixels=pixelsOf(dragonArt.saddle);
  const result=new Uint8Array(6144);
  for(let y=0;y<96;y+=8)for(let x=0;x<128;x+=8)result.set(tile4bpp(pixels,256,x,y),((y>>3)*16+(x>>3))*32);
  // Native OAM uses these tiles for rotating needles and paired control
  // levers. Removing them exposes the continuous neck and harness beneath.
  for(const t of[0,1,2,3,4,5,6,7,8,9,10,11,12,16,17,18,19,32,33,34,35,48,49,50,51,64,65,66,67])result.fill(0,t*32,t*32+32);
  return result;
}

// Append one native field actor; all existing object IDs and branch distances
// stay unchanged. Only the pointer table grows, so every old function pointer
// advances by 32 bytes. The new actor is called solely by the crash arrival.
export function dragonEscapeEvent(event) {
  if(event[0]!==14||event.length!==2361)throw Error('Unexpected approach event layout');
  const cue=1859,expected=[0xad,60,7,0,0x45];
  if(!expected.every((v,i)=>event[cue+i]===v))throw Error('Dragon escape cue signature');
  const old=event.slice();old.set([0xad,0,4,28,0x43],cue);
  const init=Uint8Array.of(0x82,174,0x8b,9,57,0x91,0),idle=Uint8Array.of(0xb2,0);
  const escape=Uint8Array.of(0x87,0,0x8b,9,57,0x90,0xaa,0,0xad,40,0x89,48,0x96,20,52,0x91,7,0,0x45,0);
  const out=new Uint8Array(event.length+32+init.length+idle.length+escape.length),tableEnd=1+14*32;
  out[0]=15;out.set(old.subarray(1,tableEnd),1);out.set(old.subarray(tableEnd),tableEnd+32);
  for(let p=1;p<tableEnd;p+=2){const target=old[p]|old[p+1]<<8;out[p]=(target+32)&255;out[p+1]=(target+32)>>8;}
  let end=event.length+32;out.set(init,end);out.set(idle,end+init.length);out.set(escape,end+init.length+idle.length);
  for(let f=0;f<16;f++){
    const target=end-1+(f===0?0:f===3?init.length+idle.length:init.length),p=tableEnd+f*2;
    out[p]=target&255;out[p+1]=target>>8;
  }
  return out;
}

export function patchDragonMode7(base,packet,add,palette,backFrame) {
  const get=id=>decompress(base,fileOffset(u24(base,0x3e0006+id*3))).bytes;
  const palettes=get(0x22);
  if(palettes.length!==288)throw Error('Unexpected flight palette layout');
  // Rows 4–8 belong to the dashboard/vehicle; 0–3 animate the sky. The
  // native loader also copies dashboard rows to their corresponding OBJ rows.
  for(let i=4;i<9;i++)palettes.set(palette,i*32);
  packet(0x3e0006+0x22*3,palettes,'Dragon Mode 7 vehicle palettes');
  packet(0x3e0006+0x24*3,dragonSaddleView(),'Dragon first-person saddle');
  const stream=(pixels,height)=>{const out=new Uint8Array(height*64);for(let y=0;y<height;y++)out.set(pixels.subarray(y*32,y*32+32),y*64);return out;};
  if(get(0x26).length!==1024||get(0x27).length!==3072||get(0x46).length!==19456)throw Error('Unexpected projected vehicle layout');
  packet(0x3e0006+0x26*3,stream(dragonGlide(Math.PI/2),16),'Dragon streamed approach sprite');
  const angles=[Math.PI/2,Math.PI*.42,Math.PI*.58,Math.PI*.32,Math.PI*.68,Math.PI*.22,Math.PI*.78,Math.PI*.12,Math.PI*.88,0,Math.PI,Math.PI/2],sheet=new Uint8Array(128*48);
  for(let i=0;i<12;i++){const frame=dragonGlide(angles[i],i===11?1:0);for(let y=0;y<16;y++)sheet.set(frame.subarray(y*32,y*32+32),(Math.floor(i/4)*16+y)*128+(i%4)*32);}
  const tiles=new Uint8Array(3072);
  for(let y=0;y<48;y+=8)for(let x=0;x<128;x+=8)tiles.set(tile4bpp(sheet,128,x,y),((y>>3)*16+(x>>3))*32);
  packet(0x3e0006+0x27*3,tiles,'Dragon approach banking frames');
  const ending=new Uint8Array(19456);ending.set(stream(backFrame,32));
  for(let i=0;i<17;i++)ending.set(stream(dragonGlide(i*Math.PI/16,0,{headLeft:true}),16),2048+i*1024);
  packet(0x3e0006+0x46*3,ending,'Dragon ending projection frames');
  // Resource 35 is a raw 16-color palette, copied to both the live and fade
  // palettes by the ending's projection setup at 7E8833. It is not an LZ packet.
  const endingPalette=fileOffset(u24(base,0x3e0006+0x35*3));
  if(endingPalette!==0x3efdde)throw Error('Ending vehicle palette signature');
  add(endingPalette,palette,'Dragon ending projection palette');
  // Resource 23 is another raw palette: the approach's dive phase switches the
  // vehicle to OBJ row 4 and loads it there, so Dragon turned Epoch-white.
  const divePalette=fileOffset(u24(base,0x3e0006+0x23*3));
  if(divePalette!==0x3e8d15||u24(base,0x3e0006+0x24*3)-u24(base,0x3e0006+0x23*3)!==32)throw Error('Approach dive palette signature');
  add(divePalette,palette,'Dragon approach dive palette');
  return {divePalette,resources:dragonMode7Resources,projectionStride:64,endingAngles:17,extraVramBytes:0,extraWramBytes:0,endingPalette,escapeActor:14,escapeLocation:474};
}

// The hangar (location 243) loads the vehicle seat actor, NPC 169, as the
// Epoch's boarding ladder below the parked ship. That actor now carries
// Dragon's harness for the flight maps, so in the hangar it drew a detached
// block of her body beneath her tail. Its init ends with 8E 26 (sprite
// priority); priority 0 keeps the object in place with its native functions
// and collision but draws it behind the opaque hangar floor.
export function dragonHangarEvent(event,location){
  if(location!==243)return event;
  const object=15,start=(event[1+object*32]|event[2+object*32]<<8)+1;
  const expected=[0x82,0xa9,0x16,0xec,0x04,0x06,0x08,0x8d,0x00,0x08,0x00,0x0d,0x10,0x13,0x16,0xee,0x80,0x06,0x08,0x8d,0x00,0x08,0x00,0x12,0x10,0x07,0x8d,0x00,0x08,0x00,0x1e,0x91,0x8e,0x26,0x00];
  if(!expected.every((v,i)=>event[start+i]===v))throw Error('Hangar seat actor signature');
  const out=event.slice();out[start+33]=0x00;
  return out;
}
