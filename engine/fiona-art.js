import {rasterArt} from './raster-art.js';

// Generated PNGs, extraction decisions and native role sequences are recorded
// in assets/imagegen/fiona/import-spec.json. No procedural anatomy fallback.
export function fionaSprite(facing=1,pose='idle',phase=0){
  const pixels=rasterArt('fiona',{facing,pose:pose==='attack'?'shoot':pose,phase});
  if(!pixels)throw Error(`Missing generated Fiona sprite: ${pose}/${facing}/${phase}`);
  return pixels;
}
