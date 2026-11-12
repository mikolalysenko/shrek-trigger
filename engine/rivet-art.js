import {nativeRasterArt} from './raster-art.js';
import {rasterActorGeometry} from '../content/generated-actor-geometry.js';
import {onionKartArt} from '../content/onion-kart-art.js';
const F=(facing,pose='stand',phase=0)=>({facing,pose,phase});
export const rivetFrames=[F(0),F(1),F(2),F(3),F(0,'ride'),F(1,'ride'),F(2,'ride'),F(3,'ride'),F(1,'step',1),F(1,'step',2),F(0,'ride'),F(1,'ride'),F(2,'ride'),F(3,'ride'),F(2,'step'),F(2,'step',1),F(2,'step',2),F(1,'wave'),F(2,'ride'),F(2,'ride'),F(3,'ride'),F(3,'ride'),F(2,'crouch'),F(2,'fold'),F(2)];
export function rivetFieldSprite(frame){
 return nativeRasterArt('rivet',frame,rasterActorGeometry.rivet);
}
export function rivetRaceSprite({offset}){
 return nativeRasterArt('rivet-race',offset/1536,{width:24,height:24,frames:6});
}

// Shrek's onion kart: generated kart art with his own field-sprite head seated
// on it (assets/imagegen/onion-kart, scripts/import-onion-kart-art.mjs).
const kartPixels=image=>{const out=new Uint8Array(image.width*image.height);image.rows.forEach((row,y)=>{for(let x=0;x<image.width;x++)out[y*image.width+x]=parseInt(row[x],16);});return out;};
export function racingCartSprite({view,height,phase=0}){
 const image=onionKartArt.views[view+phase]??onionKartArt.views[view+'0'];
 if(!image||image.height!==height)throw Error('Missing onion kart view '+view+phase);
 return kartPixels(image);
}

// Race packet 1 holds four 8x8 rider patches that the native projector pastes
// over the racer (stock: Crono's hair and face). They repeat the kart art at
// the paste positions, so the paste never punches holes in Shrek's sprite.
export function racingMiniatures(){
 const out=new Uint8Array(256);
 onionKartArt.riderPatches.forEach((patch,f)=>out.set(kartPixels(patch),f*64));
 return out;
}

export function racingFieldCart(){
 // The parked onion kart keeps the original 96 by 48 background footprint.
 return kartPixels(onionKartArt.parked);
}
