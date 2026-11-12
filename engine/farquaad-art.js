import {rasterArt} from './raster-art.js';

// Generated PNGs, extraction decisions and native role sequences are recorded
// in assets/imagegen/farquaad/import-spec.json. No procedural anatomy fallback.
export function farquaadSprite(facing=1,pose='idle',phase=0){
  const pixels=rasterArt('farquaad',{facing,pose:pose==='attack'?'swing':pose,phase});
  if(!pixels)throw Error(`Missing generated Farquaad sprite: ${pose}/${facing}/${phase}`);
  return pixels;
}
