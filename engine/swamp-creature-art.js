import {nativeRasterArt} from './raster-art.js';

export function dozerSprite(frame){return nativeRasterArt('swamp-dozer',frame,{width:32,height:32,frames:24});}
export function swampCreatureSprite(art,frame){if(art!=='dozer')throw Error('Unknown swamp creature art');return dozerSprite(frame);}
