import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
import {createHash} from 'node:crypto';
import {decompress} from '../../../engine/compression.js';
import {u16,u24,fileOffset} from '../../../engine/rom.js';
const d=import.meta.dirname;
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const rgb=v=>[0,5,10].map(n=>{const c=v>>n&31;return c<<3|c>>2;});
const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function lab([r,g,b]){r=linear(r);g=linear(g);b=linear(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
export function worldPalette(base){const p=fileOffset(u24(base,0x6fea0+6*3)),raw=decompress(base,p).bytes;return Array.from({length:16},(_,i)=>u16(raw,9*32+i*2));}
export function render(pixels,width,height,palette,scale=1){const p=new PNG({width:width*scale,height:height*scale});for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){const v=pixels[Math.floor(y/scale)*width+Math.floor(x/scale)];p.data.set([...(v?rgb(palette[v]):[35,43,48]),255],(y*p.width+x)*4);}return p;}
export function sampleWorld(base,{targetWidth=62,method='area'}={}){
 const source=fs.readFileSync(path.join(d,'source-world-v1.png')),p=PNG.sync.read(source),palette=worldPalette(base),labs=palette.map(v=>lab(rgb(v))),cache=new Map();
 let x0=p.width,y0=p.height,x1=0,y1=0;for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)if(p.data[(y*p.width+x)*4+3]>=128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const bounds=[x0,y0,x1-x0+1,y1-y0+1],height=Math.round(bounds[3]*targetWidth/bounds[2]),dx=Math.floor((64-targetWidth)/2),dy=41-height,pixels=new Uint8Array(64*41);
 const nearest=(r,g,b)=>{const key=r<<16|g<<8|b;if(cache.has(key))return cache.get(key);const c=lab([r,g,b]);let best=1,dist=Infinity;for(let i=1;i<16;i++){const v=labs[i],m=(c[0]-v[0])**2+(c[1]-v[1])**2+(c[2]-v[2])**2;if(m<dist){dist=m;best=i;}}cache.set(key,best);return best;};
 for(let y=0;y<height;y++)for(let x=0;x<targetWidth;x++){
  const ax=x0+x*bounds[2]/targetWidth,bx=x0+(x+1)*bounds[2]/targetWidth,ay=y0+y*bounds[3]/height,by=y0+(y+1)*bounds[3]/height;
  if(method==='nearest'){const i=(Math.floor((ay+by)/2)*p.width+Math.floor((ax+bx)/2))*4;if(p.data[i+3]>=128)pixels[(y+dy)*64+x+dx]=nearest(...p.data.subarray(i,i+3));continue;}
  const votes=new Float64Array(16);let opacity=0;for(let yy=Math.floor(ay);yy<Math.ceil(by);yy++)for(let xx=Math.floor(ax);xx<Math.ceil(bx);xx++){const i=(yy*p.width+xx)*4;if(p.data[i+3]<128)continue;const w=(Math.min(xx+1,bx)-Math.max(xx,ax))*(Math.min(yy+1,by)-Math.max(yy,ay))*p.data[i+3]/255;opacity+=w;votes[nearest(...p.data.subarray(i,i+3))]+=w;}
  if(opacity/((bx-ax)*(by-ay))>=.28){let best=1;for(let i=2;i<16;i++)if(votes[i]>votes[best])best=i;pixels[(y+dy)*64+x+dx]=best;}
 }
 const outside=[];pixels.forEach((v,i)=>{const x=i%64,y=Math.floor(i/64);if(v&&y<9&&(x<16||x>=48))outside.push([x,y]);});
 return {pixels,palette,audit:{source:'source-world-v1.png',sourceSha256:sha(source),bounds,method,targetWidth,sampledHeight:height,origin:[dx,dy],alphaThreshold:128,coverageThreshold:.28,paletteSource:{pointer:0x6fea0+6*3,packetOffset:0x3d35f,row:9,unchanged:true},outsideNativeCoverage:outside,opaquePixels:pixels.reduce((n,v)=>n+!!v,0),pixelsSha256:sha(pixels)}};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const base=fs.readFileSync(path.resolve(d,'../../../.local/chrono-trigger-usa.sfc')),reports=[];fs.mkdirSync(path.join(d,'review'),{recursive:true});for(const targetWidth of[64,62,60])for(const method of['area','nearest']){const r=sampleWorld(base,{targetWidth,method});reports.push(r.audit);fs.writeFileSync(path.join(d,`review/world-${targetWidth}-${method}-6x.png`),PNG.sync.write(render(r.pixels,64,41,r.palette,6)));fs.writeFileSync(path.join(d,`review/world-${targetWidth}-${method}-1x.png`),PNG.sync.write(render(r.pixels,64,41,r.palette)));}fs.writeFileSync(path.join(d,'sampling-audit.json'),JSON.stringify(reports,null,2)+'\n');console.log(reports.map(r=>({width:r.targetWidth,height:r.sampledHeight,method:r.method,outside:r.outsideNativeCoverage.length})));}
