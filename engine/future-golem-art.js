import {nativeRasterArt} from './raster-art.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';

export function mireGolemSprite(frame){
 return nativeRasterArt('mire-golems',frame,rasterActorGeometry['mire-golems']);
}
