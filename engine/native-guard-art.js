import {nativeRasterArt} from './raster-art.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';

export function nativeGuardSprite(art,frame){
 if(art!=='native-guard')throw Error('Unknown native guard artwork: '+art);
 return nativeRasterArt(art,frame,rasterActorGeometry[art]);
}
