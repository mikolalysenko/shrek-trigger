import {cast} from './cast.js';
import {rasterActorGeometry} from './generated-actor-geometry.js';
import {onionKartArt} from './onion-kart-art.js';
export const rivetActor={key:'rivet',name:'Rivet',short:'Rivet',enemy:244,npcs:[2],gfx:37,asm:26,palette:157,animation:142,npcAnimation:77,size:0,art:'rivet',...rasterActorGeometry.rivet,
  colors:['242b35','51433f','806044','ba945b','dfc38a','f5e9bc','2e5358','4d8382','91b7ac','683d43','bc5b4c','f6db69']
};
// Shrek's own twelve colors plus the onion kart's three golds.
export const cartColors=onionKartArt.palette;
export const rivetRaceColors=[...rivetActor.colors,'6f9fa1','c8d9bd','bd855b'];
// Native software-projection images use one byte per color and 64 bytes per
// row, even though only 32 (cart) or 24 (Rivet) columns are sampled.
export const cartRaceFrames=[
  {offset:0,height:24,view:'side',phase:0},{offset:1536,height:24,view:'side',phase:1},{offset:3072,height:24,view:'side',phase:2},
  {offset:4608,height:32,view:'front',phase:0},{offset:6656,height:32,view:'back',phase:0},
  {offset:8704,height:24,view:'angle',phase:0},{offset:10240,height:24,view:'angle',phase:1}
];
export const rivetRaceFrames=Array.from({length:6},(_,f)=>({offset:f*1536,height:24,view:f===4?'front':f===5?'back':'side',phase:f%4}));
