import {swampBelchRaster as source} from './swamp-belch-raster.js';
import {techPictures} from './tech-pictures.js';
import {tile4bpp,snesColor} from './sprites.js';
import {put16} from './rom.js';

// Three source colors, nearest-neighbor 3× enlargement and ordinary 8×8 BG3
// cells. The existing 4 KiB effect upload is sufficient for the 192px cloud.
// No canvas or browser-only painting participates in the cartridge image.
// `mirror` draws the right half as the left half's tiles flipped (BG3 map
// bit 14), which halves the tile count for a symmetrical picture.
export function backdropGraphics(source,{mirror=false,name='Backdrop',scale=3,top=2}={}){
  const N=source.width,size=N*scale;
  if(source.height!==N||size%8||size>192||source.palette.length!==3||source.pixels.length!==N*N||!/^[0-3]+$/.test(source.pixels))throw Error('Invalid '+name+' raster');
  const pixels=Uint8Array.from(source.pixels,Number),expanded=new Uint8Array(size*size),left=(32-size/8)/2;
  if(mirror)for(let y=0;y<N;y++)for(let x=N/2;x<N;x++)pixels[y*N+x]=pixels[y*N+N-1-x];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)expanded[y*size+x]=pixels[Math.floor(y/scale)*N+Math.floor(x/scale)];
  const tiles=[new Uint8Array(16)],lookup=new Map([[Array(16).fill(0).join(','),0]]),tilemap=new Uint8Array(2048);
  const flipped=bytes=>Array.from(bytes,v=>{v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;return(v>>4)|(v&15)<<4;});
  for(let q=0;q<4;q++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const xx=(q%2*16+x-left)*8,yy=(Math.floor(q/2)*16+y-top)*8;
    let tile=0,flip=0;
    if(xx>=0&&xx<size&&yy>=0&&yy<size){
      const bytes=tile4bpp(expanded,size,xx,yy).slice(0,16),key=Array.from(bytes).join(','),mirrored=flipped(bytes).join(',');
      if(lookup.has(key))tile=lookup.get(key);
      else if(mirror&&lookup.has(mirrored)){tile=lookup.get(mirrored);flip=0x4000;}
      else{lookup.set(key,tiles.length);tiles.push(bytes);tile=lookup.get(key);}
    }
    put16(tilemap,q*512+(y*16+x)*2,tile|0x3800|flip);
  }
  // The original loader blanks tiles EE/EF/FE/FF in its final chunk.
  if(tiles.length>0xee)throw Error(name+' overlaps native blank tiles: '+tiles.length);
  const graphics=new Uint8Array(4096);tiles.forEach((t,i)=>graphics.set(t,i*16));
  // 64 rows of [left, right) in 64ths of the picture, whatever its size.
  const contour=new Uint8Array(128).fill(255),lo=Array(64).fill(255),hi=Array(64).fill(0);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(expanded[y*size+x]){const r=Math.floor(y*64/size);lo[r]=Math.min(lo[r],Math.floor(x*64/size));hi[r]=Math.max(hi[r],Math.ceil((x+1)*64/size));}
  lo.forEach((v,r)=>{if(v!==255){contour[r*2]=v;contour[r*2+1]=hi[r];}});
  return{graphics,tilemap,contour,uniqueTiles:tiles.length,palette:source.palette.map(snesColor),pixels,expanded,width:size,height:size,center:{x:128,y:top*8+size/2},radius:size/2,source};
}
export function swampBelchGraphics(){return backdropGraphics(source,{name:'Swamp Belch'});}
// A picture technique's art (engine/tech-pictures.js): front on and mirrored,
// 160 pixels across at one screen pixel per source pixel.
export function techPictureGraphics(picture){return backdropGraphics(picture.raster,{mirror:true,scale:1,name:picture.name});}
export function callMyWifeGraphics(){return techPictureGraphics(techPictures[0]);}

// Exact integer reference for the native scanline-mask renderer.
export function swampBelchWindow(radius,contour){
  if(!Number.isInteger(radius)||radius<1||radius>100)throw Error('Invalid Swamp Belch radius');
  const bytes=new Uint8Array(radius*4);
  for(let row=0;row<radius*2;row++){
    const p=Math.floor(row*32/radius)*2,left=contour[p],right=contour[p+1];
    bytes[row*2]=left===255?255:128-radius+Math.floor(left*radius/32);
    bytes[row*2+1]=left===255?0:128-radius+Math.ceil(right*radius/32);
  }
  return bytes;
}
