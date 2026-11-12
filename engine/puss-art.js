import {rasterArt} from './raster-art.js';

// Generated PNGs, extraction decisions and complete equipment-specific roles
// are recorded in assets/imagegen/puss and puss-hatchet/import-spec.json.
export function pussSprite(facing=1,pose='idle',phase=0,{weapon='rapier'}={}){
  const key=weapon==='hatchet'?'puss-hatchet':'puss';
  const pixels=rasterArt(key,{facing,pose:pose==='attack'?'slash':pose,phase});
  if(!pixels)throw Error(`Missing generated Puss sprite: ${weapon}/${pose}/${facing}/${phase}`);
  return pixels;
}
