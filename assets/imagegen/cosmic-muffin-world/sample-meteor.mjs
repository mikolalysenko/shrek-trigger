import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
import {decompress} from '../../../engine/compression.js';
import {u16,u24,fileOffset} from '../../../engine/rom.js';
import {rgb,render,sha} from './sample-world.mjs';
const d=import.meta.dirname;
const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function lab([r,g,b]){r=linear(r);g=linear(g);b=linear(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
export function meteorPalette(base){const p=fileOffset(u24(base,0x3e003c));return Array.from({length:16},(_,i)=>i?u16(base,p+i*2):0);}
export function sampleMeteor(base,{targetWidth=48,method='area',bottom=49}={}){
 const source=fs.readFileSync(path.join(d,'source-meteor-v1.png')),p=PNG.sync.read(source),palette=meteorPalette(base),labs=palette.map(v=>lab(rgb(v))),cache=new Map();
 const map=decompress(base,fileOffset(u24(base,0x3e0030))).bytes;
 let x0=p.width,y0=p.height,x1=0,y1=0;for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)if(p.data[(y*p.width+x)*4+3]>=128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const bounds=[x0,y0,x1-x0+1,y1-y0+1],height=Math.round(bounds[3]*targetWidth/bounds[2]),dx=Math.floor((48-targetWidth)/2),dy=bottom-height,pixels=new Uint8Array(48*56);
 if(dy<0||bottom>56||targetWidth>48)throw Error('Source does not fit native canvas');
 const nearest=(r,g,b)=>{const key=r<<16|g<<8|b;if(cache.has(key))return cache.get(key);const c=lab([r,g,b]);let best=1,dist=Infinity;for(let i=1;i<16;i++){const v=labs[i],m=(c[0]-v[0])**2+(c[1]-v[1])**2+(c[2]-v[2])**2;if(m<dist){dist=m;best=i;}}cache.set(key,best);return best;};
 for(let y=0;y<height;y++)for(let x=0;x<targetWidth;x++){
  const ax=x0+x*bounds[2]/targetWidth,bx=x0+(x+1)*bounds[2]/targetWidth,ay=y0+y*bounds[3]/height,by=y0+(y+1)*bounds[3]/height;
  if(method==='nearest'){const i=(Math.floor((ay+by)/2)*p.width+Math.floor((ax+bx)/2))*4;if(p.data[i+3]>=128)pixels[(y+dy)*48+x+dx]=nearest(...p.data.subarray(i,i+3));continue;}
  const votes=new Float64Array(16);let opacity=0;for(let yy=Math.floor(ay);yy<Math.ceil(by);yy++)for(let xx=Math.floor(ax);xx<Math.ceil(bx);xx++){const i=(yy*p.width+xx)*4;if(p.data[i+3]<128)continue;const w=(Math.min(xx+1,bx)-Math.max(xx,ax))*(Math.min(yy+1,by)-Math.max(yy,ay))*p.data[i+3]/255;opacity+=w;votes[nearest(...p.data.subarray(i,i+3))]+=w;}
  if(opacity/((bx-ax)*(by-ay))>=.28){let best=1;for(let i=2;i<16;i++)if(votes[i]>votes[best])best=i;pixels[(y+dy)*48+x+dx]=best;}
 }
 const outside=[];pixels.forEach((v,i)=>{const x=i%48,y=Math.floor(i/48);if(v&&!map[(y>>3)*64+(x>>3)])outside.push([x,y]);});
 return {pixels,palette,map,audit:{source:'source-meteor-v1.png',sourceSha256:sha(source),sourceDimensions:[p.width,p.height],bounds,method,targetWidth,sampledHeight:height,origin:[dx,dy],alphaThreshold:128,coverageThreshold:.28,paletteSource:{resource:0x12,pointer:0x3e003c,rawOffset:0x3e4bba,bytes:32,colorZeroForcedTransparentByNativeCode:true,unchanged:true},outsideNativeCoverage:outside,opaquePixels:pixels.reduce((n,v)=>n+!!v,0),pixelsSha256:sha(pixels)}};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const base=fs.readFileSync(path.resolve(d,'../../../.local/chrono-trigger-usa.sfc')),reports=[];fs.mkdirSync(path.join(d,'meteor'),{recursive:true});for(const targetWidth of[48,46,44])for(const bottom of[56,54,52,49])for(const method of['area','nearest']){const r=sampleMeteor(base,{targetWidth,method,bottom});reports.push(r.audit);for(const scale of[1,6])fs.writeFileSync(path.join(d,`meteor/sample-${targetWidth}-${bottom}-${method}-${scale}x.png`),PNG.sync.write(render(r.pixels,48,56,r.palette,scale)));}fs.writeFileSync(path.join(d,'meteor/sampling-audit.json'),JSON.stringify(reports,null,2)+'\n');console.log(reports.map(r=>({width:r.targetWidth,height:r.sampledHeight,origin:r.origin,method:r.method,outside:r.outsideNativeCoverage.length})));}
