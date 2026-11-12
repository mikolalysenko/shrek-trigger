import {rasterArt,rasterArtInfo} from './raster-art.js';
import {mrWorldwidePalette,mrWorldwideSprite} from '../content/mr-worldwide-palette.js';

// Indexed native frames for Mr. Worldwide from the generated-art registry
// (assets/imagegen/mr-worldwide/import-spec.json, sampled by
// scripts/import-raster-art.mjs). Frames 1 and 2 are the breathing shifts of
// frame 0 recorded in that spec.
export function mrWorldwideFrames(){
  const info=rasterArtInfo('mr-worldwide');
  if(!info||info.width!==mrWorldwideSprite.width||info.height!==mrWorldwideSprite.height||info.frames!==mrWorldwideSprite.frames)throw Error('Mr. Worldwide raster dimensions changed; re-import the sheet');
  if(info.palette?.join()!==mrWorldwidePalette.join())throw Error('Mr. Worldwide raster palette changed; re-import the sheet');
  return Array.from({length:mrWorldwideSprite.frames},(_,frame)=>{
    const pixels=rasterArt('mr-worldwide',{pose:'native',facing:1,phase:frame});
    if(!pixels||pixels.length!==mrWorldwideSprite.width*mrWorldwideSprite.height)throw Error('Missing Mr. Worldwide frame '+frame);
    return pixels;
  });
}
export function mrWorldwideArtInfo(){
  const info=rasterArtInfo('mr-worldwide');
  return {width:info.width,height:info.height,frames:info.frames,provenance:info.provenance};
}
