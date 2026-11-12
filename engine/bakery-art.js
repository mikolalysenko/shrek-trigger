import {rasterArt} from './raster-art.js';

function nativeRaster(key,frame=0){
 const pixels=rasterArt(key,{pose:'native',facing:1,phase:frame});
 if(!pixels)throw Error('Missing accepted Bakery source: '+key+':'+frame);
 return pixels;
}
export const masterGlaze=f=>nativeRaster('master-glaze',f);
export const kilnback=f=>nativeRaster('kilnback',f);
export const crumbHunter=f=>nativeRaster('crumb-hunter',f);
export const furnaceMaw=f=>nativeRaster('furnace-maw',f);
export const furnaceBody=()=>nativeRaster('furnace-maw-body');
export function bakerySprite(art,f){
 if(!['master-glaze','kilnback','crumb-hunter','furnace-maw'].includes(art))throw Error('Unknown Bakery artwork');
 return nativeRaster(art,f);
}
