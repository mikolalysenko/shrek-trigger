import {rasterArt} from './raster-art.js';
import {courtBeastGeometry} from '../content/court-beasts.js';

export const courtBeastFrames=courtBeastGeometry.roles.map((role,nativeFrame)=>({...role,pose:'native',phase:nativeFrame,nativeFrame}));
export function courtBeastSprite({nativeFrame=0}={}){
 const pixels=rasterArt('court-beast',{pose:'native',facing:1,phase:nativeFrame});
 if(!pixels)throw Error('Missing accepted Court Beast frame '+nativeFrame);
 return pixels;
}
