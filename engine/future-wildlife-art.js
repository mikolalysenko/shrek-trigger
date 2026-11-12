import {nativeRasterArt} from './raster-art.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';
import{mireGolemSprite}from'./future-golem-art.js';
import{sewerPodSprite,drainImpSprite,lanternBatSprite}from'./future-sewer-art.js';
export function ratSprite(frame){return nativeRasterArt('scavenger-rats',frame,rasterActorGeometry['scavenger-rats']);}

export function futureWildlifeSprite(art,frame){
 const sewer={
  'sewer-pod':[14,sewerPodSprite],'drain-imp':[20,drainImpSprite],'lantern-bat':[7,lanternBatSprite]
 }[art];
 if(sewer){
  if(!Number.isInteger(frame)||frame<0||frame>=sewer[0])throw Error('Invalid sewer creature frame');
  return sewer[1](frame);
 }
 if(['rootling','snap-briar','briar-rider','cracked-pot','spore-pot','ember-pot','beetle','sewer-troll','frog-guards'].includes(art))return nativeRasterArt(art,frame,rasterActorGeometry[art]);
 if(art==='mire-golem'){
  if(!Number.isInteger(frame)||frame<0||frame>=32)throw Error('Invalid golem frame');
  return mireGolemSprite(frame);
 }
 if(!['rat','wisp'].includes(art)||!Number.isInteger(frame)||frame<0||frame>=13)throw Error('Invalid wildlife frame');
 return art==='rat'?ratSprite(frame):wispSprite(frame);
}

// The original floating-wisp and creeping-residue programs share these slots.
export function wispSprite(frame){return nativeRasterArt('workshop-residues',frame,rasterActorGeometry['workshop-residues']);}
