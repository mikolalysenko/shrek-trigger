import {nativeRasterArt} from './raster-art.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';

export function courtPalaceSprite(art,frame){
 if(!['palace-hexer','duloc-court-soldier'].includes(art))throw Error('Unknown court actor artwork: '+art);
 return nativeRasterArt(art,frame,rasterActorGeometry[art]);
}
