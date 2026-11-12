import {nativeRasterArt} from './raster-art.js';
export function briarKnight(frame){return nativeRasterArt('briar-knight',frame,{width:64,height:80,frames:86});}
export function mothWitch(frame){return nativeRasterArt('moth-witch',frame,{width:32,height:64,frames:16});}
export function enforcerSprite(art,frame){
  if(art==='briar-knight')return briarKnight(frame);
  if(art==='moth-witch')return mothWitch(frame);
  throw Error('Unknown enforcer artwork');
}
