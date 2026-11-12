import {dulocTank} from '../content/duloc-tank.js';
import {nativeRasterArt} from './raster-art.js';

export function dulocTankSprite(key,frame=0){
 const actor=dulocTank.find(a=>a.key===key);
 if(!actor||!Number.isInteger(frame)||frame<0||frame>=actor.frames)throw Error('Invalid Duloc Tank frame');
 return nativeRasterArt(key,frame,actor);
}
