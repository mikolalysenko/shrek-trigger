import {rasterArt} from './raster-art.js';

// Generated PNGs, extraction decisions and native role sequences are recorded
// in assets/imagegen/mongo/import-spec.json. No procedural anatomy fallback.
export function mongoSprite(facing=1,pose='idle',phase=0){
  const pixels=rasterArt('mongo',{facing,pose:pose==='attack'?'punch':pose,phase});
  if(!pixels)throw Error(`Missing generated Mongo sprite: ${pose}/${facing}/${phase}`);
  return pixels;
}
