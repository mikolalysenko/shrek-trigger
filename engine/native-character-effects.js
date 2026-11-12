import {tile4bpp} from './sprites.js';
import {compress,decompress} from './compression.js';
import {u16} from './rom.js';

export function parseNativeAssembly(bytes){
 const frames=[];
 for(let p=0;p<bytes.length;){
  if(p+2===bytes.length&&bytes[p]===255&&bytes[p+1]===255)break;
  const start=p,header=(bytes[p]&15)+1;
  let end=-1;for(let q=p+header;q+1<bytes.length;q+=2)if(bytes[q]===255&&bytes[q+1]===255){end=q+2;break;}
  if(end<0)throw Error('Unterminated native effect assembly');
  const cells=(end-start-header-2)/2;
  if(!Number.isInteger(cells)||cells<1||cells>32)throw Error('Invalid native effect cell count');
  frames.push({start,header,cells,end});p=end;
 }
 if(!frames.length)throw Error('Empty native effect assembly');
 return frames;
}

export function makeEffectTiles(frames,side){
 const pixelsPerFrame=side*16,tiles=new Uint8Array(frames.length*side*side*4*32);
 frames.forEach((draw,frame)=>{
  const pixels=draw(pixelsPerFrame,frame);
  if(pixels.length!==pixelsPerFrame*pixelsPerFrame)throw Error('Wrong native effect canvas size');
  for(let y=0;y<side*2;y++)for(let x=0;x<side*2;x++)tiles.set(tile4bpp(pixels,pixelsPerFrame,x*8,y*8),(frame*side*side*4+y*side*2+x)*32);
 });
 return tiles;
}

// Build isolated native OBJ art for a technique without changing its damage,
// target list, scene script, VRAM reservation or shared source package.
export function patchCharacterEffects(base,allocate,add,effects,definitions,allocateData=allocate){
 const audits=[],layoutCache=new Map(),tileCache=new Map();
 for(const d of definitions){
   const presentationTech=d.presentationTech??d.tech,config=(d.sharedAnimation?0xd5526:0xd45a6)+presentationTech*7,index=base[config+3],source=0x110000+u16(base,0x110060+index*2);
  if(d.sourceAssembly!==undefined&&source!==d.sourceAssembly)throw Error(`Tech ${d.tech} effect assembly changed`);
  const sourceBytes=decompress(base,source).bytes,frames=parseNativeAssembly(sourceBytes);
  const side=d.side??(frames.some(f=>f.cells>1)?2:1),tileBase=sourceBytes[frames[0].start+frames[0].header],rawTiles=d.tileChunk?d.tileChunk():makeEffectTiles(d.frames,side);
  const chunkCount=d.chunks??1;
  if(rawTiles.length>1024*chunkCount)throw Error(`Tech ${d.tech} exceeds its native effect chunks`);
  // Each decoded chunk copies its own 1 KB slice (chunk n at n KB).
  const tileData=new Uint8Array(1024*chunkCount);tileData.set(rawTiles);if(d.tileChunk&&rawTiles.length===1024)for(let n=1;n<chunkCount;n++)tileData.set(rawTiles,n*1024);
  const tileKey=d.tileChunk?'chunk:'+d.name:side+':'+d.frames.map(f=>f.name).join(':'),tiles=tileCache.get(tileKey)??allocateData(tileData,d.name+' native effect tiles');
  tileCache.set(tileKey,tiles);
  const hooks=[];
  const assemblies=Array.from({length:1},(_,slot)=>{
   const key=[source,side,d.frames.length,slot,!!d.keepAssembly].join(':');
   if(layoutCache.has(key))return layoutCache.get(key);
   const data=sourceBytes.slice();
   frames.forEach((f,frame)=>{
    const art=frame%d.frames.length;
    for(let cell=0;cell<f.cells;cell++){
     const p=f.start+f.header+cell*2,tile=tileBase+(art*side*side+(cell%4))*2;
     if(!d.keepAssembly)data[p]=tile;
    }
   });
   const address=allocate(compress(data),`${d.name} native cells slot ${slot}`);layoutCache.set(key,address);return address;
  });
   const components=d.presentationTech?[presentationTech]:[];
   effects.push({tech:d.tech,name:d.name,selected:!!d.selected,chunkFirst:base[config+1],chunks:d.chunks??1,format:'4bpp',tiles,sourceAssembly:source&65535,assemblies,components,hooks});
   audits.push({tech:d.tech,name:d.name,tiles,assemblies,source,chunkFirst:base[config+1],sharedAnimation:!!d.sharedAnimation,presentationTech,components,sourceFrames:frames.length,uniqueFrames:d.frames.length,side,bytes:tileData.length,cells:side*side,hooks});
 }
 return{techs:audits.map(a=>a.tech),effects:audits,extraVramBytes:0,extraWramBytes:0};
}

export function canvas(size){return new Uint8Array(size*size);}
export function dot(p,size,x,y,color){if(x>=0&&x<size&&y>=0&&y<size)p[(y|0)*size+(x|0)]=color;}
export function ellipse(p,size,cx,cy,rx,ry,color){for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)dot(p,size,x,y,color);}
export function line(p,size,x0,y0,x1,y1,color){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let i=0;i<=n;i++)dot(p,size,Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),color);}
