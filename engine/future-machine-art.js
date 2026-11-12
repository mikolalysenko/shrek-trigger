import {nativeRasterArt} from './raster-art.js';
import {rivetFrames,rivetFieldSprite} from './rivet-art.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';

const P=(facing,pose,phase=0)=>({facing,pose,phase});
export const futureMachineFrames={
  mite:[P(1,'walk'),P(1,'crouch'),P(1,'walk',1),P(1,'spark'),P(1,'walk',2),P(1,'crouch',1),P(1,'extend'),P(1,'extend',1),P(1,'extend',2)],
  usher:[...[0,1,2,3].flatMap(d=>[0,1,2].map(f=>P(d,'walk',f))),P(1,'hit'),P(1,'charge'),P(1,'charge',1),P(1,'guard'),P(0,'signal'),P(0,'signal',1),P(1,'signal'),P(1,'signal',1),P(1,'signal',2),P(2,'signal'),P(2,'signal',1),P(3,'signal'),P(3,'signal',1)],
  bell:[0,1,2,3,4].map(f=>P(1,'hover',f)),
  rivet:rivetFrames
};
export function futureMachineSprite(art,frame){
 if(art==='rivet')return rivetFieldSprite(frame);
 const key={mite:'future-mites',usher:'future-ushers',bell:'future-bells'}[art];
 if(!key)throw Error('Unknown future machine artwork');
 return nativeRasterArt(key,frame,rasterActorGeometry[key]);
}

export function supplyKeeperBackground(){
 return nativeRasterArt('supply-keeper-body',0,{width:128,height:176,frames:1});
}

export function supplyKeeperFrame(frame){
 if(!Number.isInteger(frame)||frame<0||frame>3)throw Error('Invalid supply keeper frame');
 const geometry=rasterActorGeometry['supply-keeper'];
 // The native fourth slot is blank while the background body rests.
 if(frame===3)return new Uint8Array(geometry.width*geometry.height);
 return nativeRasterArt('supply-keeper',frame,{...geometry,frames:3});
}
