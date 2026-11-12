import {rasterArt} from './raster-art.js';

export function skyDrakeSprite(art,frame){
  if(art!=='sky-drake'||!Number.isInteger(frame)||frame<0||frame>3)throw Error('Invalid sky-drake frame');
  const pixels=rasterArt(art,{pose:'native',facing:1,phase:frame});
  if(!pixels)throw Error('Missing sky-drake frame '+frame);
  return pixels;
}

// World poses use the native shared mount colors 8..15 beneath the rider.
// The generated sheet (assets/imagegen/sky-drake-world) is sampled into the
// eight mount colors as indices 1..8, which map onto 8..15 here.
const worldOrder=['front','back','left'];
export function skyDrakeWorld(facing,beat){
  if(!worldOrder.includes(facing)||!Number.isInteger(beat)||beat<0||beat>2)throw Error('Invalid sky-drake world pose');
  const pixels=rasterArt('sky-drake-world',{pose:'native',facing:1,phase:worldOrder.indexOf(facing)*3+beat});
  if(!pixels)throw Error('Missing sky-drake world pose '+facing+'-'+beat);
  return pixels.map(v=>{if(v>8)throw Error('Sky-drake world pose leaves the mount colors');return v?v+7:0;});
}
