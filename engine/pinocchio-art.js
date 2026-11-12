import {rasterArt} from './raster-art.js';

// Cel-shaded render of the authentic model in its authored joint poses and
// native roles: assets/raster/pinocchio-clean (poses and roles from
// assets/raster/pinocchio-model). Workshop variants share these exact indexed
// pixels through their own costume palette.
export function pinocchioSprite(facing=1,pose='idle',phase=0){
  const pixels=rasterArt('pinocchio',{facing,pose:pose==='attack'?'punch':pose,phase});
  if(!pixels)throw Error(`Missing raster Pinocchio sprite: ${pose}/${facing}/${phase}`);
  return pixels;
}
