import {endgameFamilies} from '../content/endgame-actors.js';
import {nativeRasterArt} from './raster-art.js';

export function endgameSprite(key,frame){
 const group=endgameFamilies.flatMap(f=>f.groups).find(g=>g.art===key);
 if(!group)throw Error('Unknown endgame artwork '+key);
 return nativeRasterArt(key,frame,group);
}
