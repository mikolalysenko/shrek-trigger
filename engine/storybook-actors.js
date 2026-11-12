import {storybookFamilies,customStorybookFamilies,stockStorybookFamilyKeys} from '../content/storybook-actors.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';
import {nativeRasterArt} from './raster-art.js';
import {patchActorFamilies} from './actor-families.js';
import {u24} from './rom.js';

export function storybookSprite(art,frame){
 if(!storybookFamilies.some(f=>f.groups.some(g=>g.art===art)))throw Error('Unknown storybook artwork: '+art);
 return nativeRasterArt(art,frame,rasterActorGeometry[art]);
}

export function patchStorybookActors(base,allocate,add,records,options){
 // A custom household bank would leave shared assembly7 intact through private
 // slot248; both its source pointer and earlier emitted writes are checked.
 if(customStorybookFamilies.some(f=>f.groups.some(g=>g.asm===248))){
  const pointer=0x242300+248*3;
  if(u24(base,pointer)!==0||records.some(r=>r.offset<pointer+3&&r.offset+r.bytes.length>pointer))throw Error('Household private assembly slot is already allocated');
 }
 const result=patchActorFamilies(base,customStorybookFamilies,storybookSprite,allocate,add,records,options);
 return{...result,stockRestored:[...stockStorybookFamilyKeys]};
}
