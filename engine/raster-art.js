import {generatedRasterArt} from './generated-raster-art.js';
import {pinocchioCleanArt} from '../content/pinocchio-clean-art.js';
import {partyPaletteConvention,conformPartyFrame} from './party-palette.js';
import {authoredRasterArt} from './authored-raster-art.js';

// Pinocchio's cel-shaded render (assets/raster/pinocchio-clean) replaces the
// earlier point-sampled model render; it already follows the party outline
// convention. The other imported party art adopts that convention here
// (engine/party-palette.js): Puss's hatchet frames and every party portrait
// share their character's palette. Lookups stay live so tools can stage
// registry art.
const actorOf=key=>pinocchioCleanArt[key]??authoredRasterArt[key]??generatedRasterArt[key];
const partyFamilies={shrek:['shrek'],fiona:['fiona'],donkey:['donkey'],puss:['puss','puss-hatchet'],mongo:['mongo'],farquaad:['farquaad']};
const paletteSharers={};
// Farquaad's black bob was drawn in two near-blacks that merged into the
// outline, leaving a flat black mass with stray highlight bars. His spare
// palette slot gives the hair a dark aubergine fill inside its outline.
// Donkey's dark fur shading had merged into his outline the same way.
const darkFills={farquaad:{members:[8,10],color:'3d2e3f'},donkey:{members:[8,10],color:'3e3a42'}};
const partyMembers=new Map([...Object.entries(partyFamilies).flatMap(([base,keys])=>[...keys.map(k=>[k,{base,outline:true}]),[base+'-portrait',{base,outline:false}]]),...Object.entries(paletteSharers).map(([k,base])=>[k,{base,outline:false}])]);
export function partyConvention(base){
  const counts=new Array(13).fill(0);for(const key of partyFamilies[base])for(const frame of actorOf(key).frames)for(const ch of frame)counts[parseInt(ch,16)]++;
  return partyPaletteConvention(actorOf(base).palette,counts,{darkFill:darkFills[base]});
}
// Only art drawn in exactly its character's imported palette is converted; a
// staged mismatch keeps its own palette so palette checks still reject it.
const partyOf=(key,actor)=>{const party=partyMembers.get(key),base=party&&actorOf(party.base);return base&&actor.palette?.join()===base.palette.join()?party:null;};
const conventions=new Map();
const conventionOf=base=>{const palette=actorOf(base).palette.join();let c=conventions.get(base);if(!c||c.source!==palette){c={source:palette,value:partyConvention(base)};conventions.set(base,c);}return c.value;};
const cache=new Map();
// The ROM compiler consumes these indexed raster samples exactly as it used
// the previous procedural sprites. No image decoder or overlay runs in SNES.
// source:true returns the imported pixels before the party outline conversion.
export function rasterArt(key,{facing=1,pose='idle',phase=0,source:imported=false}={}){
  const actor=actorOf(key);if(!actor)return null;
  const width=actor.width??32,height=actor.height??32;
  if(pose==='blank')return new Uint8Array(width*height);
  let sequence=actor.sequences[pose]?.[facing],mirror=false;
  if(!sequence&&facing===3){sequence=actor.sequences[pose]?.[2];mirror=!!sequence;}
  if(!sequence)return null;
  const entry=sequence[phase%sequence.length],frame=typeof entry==='number'?entry:entry.frame,dx=entry.dx??0,dy=entry.dy??0,dissolve=entry.dissolve??0;mirror=mirror!==!!entry.flip;
  const party=imported?null:partyOf(key,actor),convention=party?conventionOf(party.base):null,id=key+':'+frame+(imported?':source':'');let cached=cache.get(id);
  if(!cached||cached.actor!==actor||cached.convention!==convention){let pixels=Uint8Array.from(actor.frames[frame],c=>parseInt(c,16));if(convention)pixels=conformPartyFrame(pixels,width,height,convention,{outline:party.outline});cached={actor,convention,pixels};cache.set(id,cached);}
  const source=cached.pixels;
  const out=new Uint8Array(width*height);
  // The existing death-scene mask only hides sampled pixels. Its result is
  // compiled into ordinary cartridge tiles; no new renderer runs on SNES.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const xx=(mirror?width-1-x:x)+dx,yy=y+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height&&(xx*3+yy*5)%11>=dissolve)out[yy*width+xx]=source[y*width+x];}
  return out;
}
export function rasterArtInfo(key){const a=actorOf(key),party=a&&partyOf(key,a);return a?{width:a.width??32,height:a.height??32,sourceType:a.sourceType??'image-generation',frames:a.frames.length,sequences:a.sequences,provenance:a.provenance,palette:party?conventionOf(party.base).palette:a.palette,...(a.semanticRoles?{semanticRoles:a.semanticRoles}:{}),...(a.originalRasterComponents?{originalRasterComponents:a.originalRasterComponents}:{})}:null;}

// A complete native-slot sequence must never wrap an invalid frame onto an
// unrelated pose. Geometry and palette checks happen before tile compilation.
export function nativeRasterArt(key,frame,{width,height,frames}){
  const info=rasterArtInfo(key),sequence=info?.sequences.native?.[1];
  if(!Number.isInteger(frame)||frame<0||frame>=frames)throw Error(key+' frame outside native table');
  if(!info||info.width!==width||info.height!==height||sequence?.length!==frames||info.palette.length!==12)throw Error(key+' native raster contract changed');
  const pixels=rasterArt(key,{pose:'native',facing:1,phase:frame});
  if(!pixels||pixels.length!==width*height||pixels.some(v=>v>12))throw Error(key+' native raster pixels are invalid');
  return pixels;
}
