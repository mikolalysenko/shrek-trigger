import {nativeRasterArt} from './raster-art.js';
export function ghostSprite(art,frame){
  if(art!=='sir-bram-ghost')throw Error('Unknown ghost artwork');
  return nativeRasterArt(art,frame,{width:64,height:64,frames:21});
}
