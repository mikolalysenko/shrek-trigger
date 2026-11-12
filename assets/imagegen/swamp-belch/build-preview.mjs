// Inactive effect-art study. Pixels are only sampled from the saved generated PNG.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {tile4bpp,snesColor} from '../../../engine/sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
const dir=import.meta.dirname,sourceBytes=fs.readFileSync(dir+'/source-v1.png'),source=PNG.sync.read(sourceBytes),sha=b=>createHash('sha256').update(b).digest('hex');
const palette=['425232','7f9f43','c2d981'],colors=palette.map(c=>{const w=snesColor(c);return[0,1,2].map(n=>{const v=w>>n*5&31;return v<<3|v>>2;});});
const {width:sw,height:sh,data}=source,seen=new Uint8Array(sw*sh),components=[];
for(let start=0;start<seen.length;start++)if(!seen[start]&&data[start*4+3]>=128){
 const pixels=[start];seen[start]=1;let x0=sw,y0=sh,x1=0,y1=0,sx=0,sy=0;
 for(let i=0;i<pixels.length;i++){const p=pixels[i],x=p%sw,y=Math.floor(p/sw);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);sx+=x;sy+=y;
  for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){const xx=x+dx,yy=y+dy,q=yy*sw+xx;if(xx>=0&&xx<sw&&yy>=0&&yy<sh&&!seen[q]&&data[q*4+3]>=128){seen[q]=1;pixels.push(q);}}
 }
 if(pixels.length>=64)components.push({bounds:[x0,y0,x1-x0+1,y1-y0+1],centroid:[sx/pixels.length,sy/pixels.length],pixels});
}
const clouds=Array.from({length:8},(_,cell)=>{const x=cell%4*sw/4,y=Math.floor(cell/4)*sh/2,m=components.filter(c=>c.centroid[0]>=x&&c.centroid[0]<x+sw/4&&c.centroid[1]>=y&&c.centroid[1]<y+sh/2).sort((a,b)=>b.pixels.length-a.pixels.length);assert.equal(m.length,1,`cell ${cell} must have one significant connected cloud`);return m[0];});
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const lab=([r,g,b])=>{r=linear(r);g=linear(g);b=linear(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];};
const labs=colors.map(lab),cache=new Map();
function nearest(r,g,b){const key=r<<16|g<<8|b;if(cache.has(key))return cache.get(key);const c=lab([r,g,b]);let best=0,dist=Infinity;for(let i=0;i<3;i++){const d=c.reduce((n,v,j)=>n+(v-labs[i][j])**2,0);if(d<dist){dist=d;best=i;}}cache.set(key,best);return best;}
function render(cloud,size){
 const[x0,y0,w,h]=cloud.bounds,scale=(size-4)/Math.max(...clouds.at(-1).bounds.slice(2)),nw=Math.round(w*scale),nh=Math.round(h*scale),ox=Math.floor((size-nw)/2),oy=Math.floor((size-nh)/2),mask=new Set(cloud.pixels),out=new Uint8Array(size*size);assert.ok(nw<=size-4&&nh<=size-4);
 for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){const ax=x0+x*w/nw,bx=x0+(x+1)*w/nw,ay=y0+y*h/nh,by=y0+(y+1)*h/nh,votes=[0,0,0];let opacity=0;
  for(let yy=Math.floor(ay);yy<Math.ceil(by);yy++)for(let xx=Math.floor(ax);xx<Math.ceil(bx);xx++){const p=yy*sw+xx,a=data[p*4+3];if(!mask.has(p)||a<128)continue;const area=(Math.min(bx,xx+1)-Math.max(ax,xx))*(Math.min(by,yy+1)-Math.max(ay,yy)),weight=area*a/255;opacity+=weight;votes[nearest(...data.subarray(p*4,p*4+3))]+=weight;}
  if(opacity/((bx-ax)*(by-ay))>=.28)out[(oy+y)*size+ox+x]=votes.indexOf(Math.max(...votes))+1;
 }
 return{pixels:out,bounds:[ox,oy,nw,nh],scale};
}
function image(pixels,size){const p=new PNG({width:size,height:size});pixels.forEach((v,i)=>{if(v)p.data.set([...colors[v-1],255],i*4);});return p;}
function atlas(frames,size,zoom=1){const p=new PNG({width:size*4*zoom,height:size*2*zoom});frames.forEach((f,i)=>f.pixels.forEach((v,j)=>{if(v)for(let yy=0;yy<zoom;yy++)for(let xx=0;xx<zoom;xx++)p.data.set([...colors[v-1],255],(((Math.floor(i/4)*size+Math.floor(j/size))*zoom+yy)*p.width+(i%4*size+j%size)*zoom+xx)*4);}));return PNG.sync.write(p);}
function flip(p,h,v){const out=new Uint8Array(64);for(let y=0;y<8;y++)for(let x=0;x<8;x++)out[y*8+x]=p[(v?7-y:y)*8+(h?7-x:x)];return out;}
function compile(frames,size){
 const tiles=[],tilePixels=[],lookup=new Map(),maps=[],plainLookup=new Set(),perFrameTiles=[];
 for(const frame of frames){const map=[],raw=[];for(let y=0;y<size;y+=8)for(let x=0;x<size;x+=8){const p=new Uint8Array(64);for(let yy=0;yy<8;yy++)p.set(frame.pixels.subarray((y+yy)*size+x,(y+yy)*size+x+8),yy*8);const base=Buffer.from(p).toString('hex');plainLookup.add(base);let found;
   for(const[h,v]of[[false,false],[true,false],[false,true],[true,true]]){const variant=Buffer.from(flip(p,h,v)).toString('hex');if(lookup.has(variant)){found={tile:lookup.get(variant),h,v};break;}}
   if(!found){found={tile:tiles.length,h:false,v:false};lookup.set(base,tiles.length);tilePixels.push(p);tiles.push(tile4bpp(p,8,0,0).subarray(0,16));}
   map.push(found.tile|(found.h?0x4000:0)|(found.v?0x8000:0));raw.push(...tile4bpp(p,8,0,0).subarray(0,16));
  }
  const decoded=new Uint8Array(size*size),side=size/8;
  map.forEach((entry,i)=>{const tile=tiles[entry&1023],p=new Uint8Array(64);for(let y=0;y<8;y++)for(let x=0;x<8;x++)p[y*8+x]=((tile[y*2]>>(7-x))&1)|(((tile[y*2+1]>>(7-x))&1)<<1);const adjusted=flip(p,!!(entry&0x4000),!!(entry&0x8000));for(let y=0;y<8;y++)decoded.set(adjusted.subarray(y*8,y*8+8),(Math.floor(i/side)*8+y)*size+(i%side)*8);});assert.deepEqual(decoded,frame.pixels);
  maps.push(map);perFrameTiles.push(Uint8Array.from(raw));
 }
 const bank=Uint8Array.from(tiles.flatMap(t=>Array.from(t))),packed=compress(bank);assert.deepEqual(decompress(packed,0).bytes,bank);
 return{bank,packed,maps,perFrameTiles,uniqueTiles:tiles.length,unflippedUniqueTiles:plainLookup.size,roundTrip:true};
}
const variants={};
for(const size of [64,32]){
 const frames=clouds.map(c=>render(c,size)),out=`${dir}/native-${size}`;fs.mkdirSync(out,{recursive:true});
 frames.forEach((f,i)=>fs.writeFileSync(`${out}/phase-${String(i).padStart(2,'0')}.png`,PNG.sync.write(image(f.pixels,size))));
 fs.writeFileSync(`${out}/atlas.png`,atlas(frames,size));fs.writeFileSync(`${out}/atlas-4x.png`,atlas(frames,size,4));
 const compiled=compile(frames,size);fs.writeFileSync(`${out}/unique-tiles.2bpp`,compiled.bank);fs.writeFileSync(`${out}/unique-tiles.ct-compressed`,compiled.packed);
 const mapBytes=Buffer.alloc(compiled.maps.flat().length*2);compiled.maps.flat().forEach((v,i)=>mapBytes.writeUInt16LE(v,i*2));fs.writeFileSync(`${out}/tilemaps.bin`,mapBytes);
 compiled.perFrameTiles.forEach((bytes,i)=>fs.writeFileSync(`${out}/phase-${String(i).padStart(2,'0')}.2bpp`,bytes));
 const indexed={key:'swamp-belch',width:size,height:size,palette,frames:frames.map(f=>Array.from(f.pixels).join('')),source:'assets/imagegen/swamp-belch/source-v1.png',sourceSha256:sha(sourceBytes),sampling:{method:'area',componentAlpha:128,alphaThreshold:128,coverageThreshold:.28,scale:frames[0].scale,anchor:'center each connected source cloud bounding box; preserve one shared scale for all eight phases'},bounds:frames.map(f=>f.bounds)};fs.writeFileSync(`${out}/indexed.json`,JSON.stringify(indexed,null,2)+'\n');
 variants[size]={dimensions:[size,size],frameCount:8,nativeBounds:frames.map(f=>f.bounds),paletteIndices:[0,1,2,3],rawAllFramesBytes:compiled.perFrameTiles.reduce((n,b)=>n+b.length,0),rawOneFrameBytes:compiled.perFrameTiles[0].length,uniqueTiles:compiled.uniqueTiles,unflippedUniqueTiles:compiled.unflippedUniqueTiles,sharedTileBytes:compiled.bank.length,sharedTileCompressedBytes:compiled.packed.length,tilemapBytes:mapBytes.length,sharedTilesFit4KiB:compiled.bank.length<=4096,spareSharedTileBytes:4096-compiled.bank.length,allFramesRoundTrip:true,compressedBankRoundTrip:true};
}
const report={key:'swamp-belch',status:'inactive generated effect study',sourceSha256:sha(sourceBytes),sourceDimensions:[sw,sh],palette,paletteRgb555:palette.map(snesColor),paletteDisplayRgb:colors,layout:{columns:4,rows:2},phases:clouds.map((c,i)=>({phase:i,sourceBounds:c.bounds,sourceCentroid:c.centroid,componentPixels:c.pixels.length})),variants,limits:['These are eight expanding billow drawings. No fade or full-screen coverage is claimed.','Native Luminaire BG/window integration, tilemap placement and timing are still owned by root.','2bpp tile maps use local palette zero and exact horizontal/vertical tile sharing; no source pixels are redrawn.']};fs.writeFileSync(`${dir}/review-v1.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.variants,null,2));
