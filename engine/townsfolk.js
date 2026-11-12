import {townsfolkFamilies,customTownsfolkFamilies,stockTownsfolkFamilyKeys} from '../content/townsfolk.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';
import {nativeRasterArt} from './raster-art.js';
import {patchActorFamilies} from './actor-families.js';

export function townsfolkSprite(art,frame){
 if(!townsfolkFamilies.some(f=>f.groups.some(g=>g.art===art)))throw Error('Unknown townsfolk artwork: '+art);
 return nativeRasterArt(art,frame,rasterActorGeometry[art]);
}

export function patchTownsfolk(base,allocate,add,records,options){
 // Ordinary keepers, residents and tradesmen keep their stock CT art. Only
 // the substantially different woodland creature and hobgoblins stay custom.
 const result=patchActorFamilies(base,customTownsfolkFamilies,townsfolkSprite,allocate,add,records,options);
 return{...result,stockRestored:[...stockTownsfolkFamilyKeys]};
}
