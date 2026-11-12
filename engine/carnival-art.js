import {rasterArt} from './raster-art.js';

const P=(facing,pose,phase=0,x=0,y=0)=>({facing,pose,phase,x,y});
export function carnivalFieldMap(){return [
  ...[0,1,2,3].map(d=>P(d,'walk',1)),
  ...[0,1].flatMap(d=>[0,1,2].map(f=>P(d,'walk',f))),
  P(2,'walk',0),P(2,'walk',2),P(3,'walk',0),P(3,'walk',2),P(1,'hit')
];}
export function carnivalFrameMap(key){
  if(key==='great-milenko')return [
    ...[2,1,3].flatMap(d=>[P(d,'walk',0),P(d,'walk',1,0,-4),P(d,'walk',2)]),
    P(0,'windup',0,0,-12),P(0,'attack'),P(1,'windup',0,0,-12),P(1,'attack'),
    P(2,'windup',0,0,-12),P(2,'attack',0,-6),P(3,'windup',0,0,-12),P(3,'attack',0,6),
    P(1,'hit'),P(1,'raise'),P(1,'down')
  ];
  // These 37 IDs include the four directional attack triplets and the
  // separate no-trail versions used by the mountain and shrine events.
  return [
    ...[0,1,2,3].flatMap(d=>[P(d,'walk',0),P(d,'walk',1,0,-4),P(d,'walk',2)]),
    P(1,'hit'),...[0,1,2,3].flatMap(d=>[P(d,'windup'),P(d,'attack',1),P(d,'recover')]),
    ...[0,1,2,3].flatMap(d=>[P(d,'windup'),P(d,'attack'),P(d,'attack',2)])
  ];
}
export function clownSprite(key,{facing=1,pose='walk',phase=1}={}){
  const pixels=rasterArt(key,{facing,pose,phase});
  if(!pixels)throw Error(`Missing generated ${key} role ${pose}/${facing}/${phase}`);
  return pixels;
}

export function milenkoSprite({facing=1,pose='walk',phase=1}={}){
  const raster=rasterArt('great-milenko',{facing,pose,phase});
  if(!raster)throw Error('Unassigned generated Milenko pose '+pose+'/'+facing+'/'+phase);
  return raster;
}

export function hatchetSprite(key,frame){
  const pixels=rasterArt(key,{pose:'native',facing:1,phase:frame});
  if(!pixels)throw Error(`Missing authored hatchet frame ${key}/${frame}`);
  return pixels;
}
