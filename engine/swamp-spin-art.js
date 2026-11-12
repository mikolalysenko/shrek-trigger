import {tile4bpp} from './sprites.js';
import {rasterArt} from './raster-art.js';

// Two generated 32x32 gas puffs. They occupy the same four 16x16 OBJ cells
// as the source wind frames; the animation also mirrors them natively.
export function fartCloud(frame){
 // Generated gas puffs (assets/imagegen/fart-cloud), sampled into the casting
 // Shrek's own palette indices: outline 1, greens 2-4 and 9-11.
 if(frame!==0&&frame!==1)throw Error('Invalid gas puff frame');
 const pixels=rasterArt('fart-cloud',{pose:'native',facing:1,phase:frame});
 if(!pixels||pixels.length!==1024)throw Error('Missing generated gas puff '+frame);
 return pixels;
}
export function fartGraphics(){
 const tiles=new Uint8Array(2048);
 for(let frame=0;frame<2;frame++){
  const pixels=fartCloud(frame);
  for(let y=0;y<4;y++)for(let x=0;x<4;x++)tiles.set(tile4bpp(pixels,32,x*8,y*8),(y*16+6+frame*4+x)*32);
 }
 return{tiles};
}
