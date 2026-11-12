import {nativeRasterArt} from './raster-art.js';

export function hornerSprite(frame){return nativeRasterArt('horner',frame,{width:64,height:64,frames:30});}
export function cragKeeperSprite(frame){return nativeRasterArt('crag-keeper',frame,{width:64,height:64,frames:27});}
export function medinaActorSprite(art,frame){
 if(art==='horner')return hornerSprite(frame);
 if(art==='crag-keeper')return cragKeeperSprite(frame);
 throw Error('Unknown Medina actor art');
}
