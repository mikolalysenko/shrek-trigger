import {rasterArt} from './raster-art.js';

// Five native sparkle-frame IDs share the same authored static drawing. The
// private palettes recolor identical indices, preserving the original decoded
// tile budget, field anchor and animation program.
export function faygoBottle(color='orange'){
  const pixels=rasterArt('faygo-'+color,{pose:'native',facing:1,phase:0});
  if(!pixels)throw Error('Missing authored Faygo bottle: '+color);
  return pixels;
}
