import {nativeRasterArt} from './raster-art.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';

export function sewerPodSprite(frame){return nativeRasterArt('sewer-pods',frame,rasterActorGeometry['sewer-pods']);}
export function drainImpSprite(frame){return nativeRasterArt('drain-imps',frame,rasterActorGeometry['drain-imps']);}
export function lanternBatSprite(frame){return nativeRasterArt('lantern-bats',frame,rasterActorGeometry['lantern-bats']);}
