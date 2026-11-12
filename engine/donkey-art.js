import {rasterArt} from './raster-art.js';

// Generated PNGs, extraction decisions and native role sequences are recorded
// in assets/imagegen/donkey/import-spec.json. No procedural anatomy fallback.
export function donkeySprite(facing=1,pose='idle',phase=0){
  const pixels=rasterArt('donkey',{facing,pose:pose==='attack'?'shoot':pose,phase});
  if(!pixels)throw Error(`Missing generated Donkey sprite: ${pose}/${facing}/${phase}`);
  return pixels;
}
