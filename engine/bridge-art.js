import {nativeRasterArt} from './raster-art.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';

// Generated source frames retain the native crown/leg split and each pose's
// original function. The event controls the root separation in each encounter.
export function wardenLegs(frame){return nativeRasterArt('warden-legs',frame,rasterActorGeometry['warden-legs']);}
export function wardenCrown(frame){return nativeRasterArt('warden',frame,rasterActorGeometry.warden);}
export function boneGuard(frame){return nativeRasterArt('bone-guards',frame,rasterActorGeometry['bone-guards']);}
export function bridgeActorSprite(art,frame){
 if(art==='warden-legs')return wardenLegs(frame);
 if(art==='warden')return wardenCrown(frame);
 if(art==='bone-guard')return boneGuard(frame);
 throw Error('Unknown bridge actor art');
}
