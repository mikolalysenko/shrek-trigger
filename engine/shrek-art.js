import {rasterArt} from './raster-art.js';

// Source PNGs, crop decisions, native role sequences and unfinished acting
// substitutions are recorded in assets/raster/shrek/import-spec.json.
// Death Peak's front-tagged down role has an explicit, provisional alias there.
export function shrekSprite(facing=1,pose='idle',phase=0){
  const pixels=rasterArt('shrek',{facing,pose:pose==='attack'?'slash':pose,phase});
  if(!pixels)throw Error(`Missing raster Shrek sprite: ${pose}/${facing}/${phase}`);
  return pixels;
}
