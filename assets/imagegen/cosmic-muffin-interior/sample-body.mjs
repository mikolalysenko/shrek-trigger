import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
import {createHash} from 'node:crypto';
const d=import.meta.dirname;
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const rgb=v=>[0,5,10].map(n=>{const c=v>>n&31;return c<<3|c>>2;});
const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function lab([r,g,b]){r=linear(r);g=linear(g);b=linear(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
export function render(pixels,width,height,palette,scale=1){const p=new PNG({width:width*scale,height:height*scale});for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){const v=pixels[Math.floor(y/scale)*width+Math.floor(x/scale)];p.data.set([...(v?rgb(palette[v]):[30,39,45]),255],(y*p.width+x)*4);}return p;}
export const warmColors=['211b22','fff5d2','f5c783','e3b65c','ce8c55','975535','593426','4a221b','362127','751b30','180f16','e77520','cf3541','edb56a','b5682c'];
export const colorWord=h=>(parseInt(h.slice(0,2),16)>>3)|((parseInt(h.slice(2,4),16)>>3)<<5)|((parseInt(h.slice(4,6),16)>>3)<<10);
export function sampleBody({source='source-body-v2.png',targetWidth=256,method='area',dy=4,warm=false,sourceBounds}={}){
 const bytes=fs.readFileSync(path.join(d,source)),p=PNG.sync.read(bytes),audit=JSON.parse(fs.readFileSync(path.join(d,'native-audit.json'))),palette=[0,...(warm?warmColors.map(colorWord):audit.background.palettes[6].words)],labs=palette.map(v=>lab(rgb(v))),cache=new Map();
 let x0=p.width,y0=p.height,x1=0,y1=0;for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)if(p.data[(y*p.width+x)*4+3]>=128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const bounds=sourceBounds??[x0,y0,x1-x0+1,y1-y0+1],height=Math.round(bounds[3]*targetWidth/bounds[2]),dx=Math.floor((256-targetWidth)/2),pixels=new Uint8Array(256*144);[x0,y0]=bounds;
 const nearest=(r,g,b)=>{const key=r<<16|g<<8|b;if(cache.has(key))return cache.get(key);const c=lab([r,g,b]);let best=1,dist=Infinity;for(let i=1;i<16;i++){const v=labs[i],m=(c[0]-v[0])**2+(c[1]-v[1])**2+(c[2]-v[2])**2;if(m<dist){dist=m;best=i;}}cache.set(key,best);return best;};
 for(let y=0;y<height;y++)for(let x=0;x<targetWidth;x++){
  const ax=x0+x*bounds[2]/targetWidth,bx=x0+(x+1)*bounds[2]/targetWidth,ay=y0+y*bounds[3]/height,by=y0+(y+1)*bounds[3]/height;
  if(method==='nearest'){const i=(Math.floor((ay+by)/2)*p.width+Math.floor((ax+bx)/2))*4;if(p.data[i+3]>=128)pixels[(y+dy)*256+x+dx]=nearest(...p.data.subarray(i,i+3));continue;}
  const votes=new Float64Array(16);let opacity=0;for(let yy=Math.floor(ay);yy<Math.ceil(by);yy++)for(let xx=Math.floor(ax);xx<Math.ceil(bx);xx++){const i=(yy*p.width+xx)*4;if(p.data[i+3]<128)continue;const w=(Math.min(xx+1,bx)-Math.max(xx,ax))*(Math.min(yy+1,by)-Math.max(yy,ay))*p.data[i+3]/255;opacity+=w;votes[nearest(...p.data.subarray(i,i+3))]+=w;}
  if(opacity/((bx-ax)*(by-ay))>=.28){let best=1;for(let i=2;i<16;i++)if(votes[i]>votes[best])best=i;pixels[(y+dy)*256+x+dx]=best;}
 }
 // The native background stores paired horizontal reflections; preserve this exact tile sharing.
 for(let y=0;y<144;y++)for(let x=0;x<128;x++)pixels[y*256+255-x]=pixels[y*256+x];
 const coverage=new Uint8Array(pixels.length),cells=JSON.parse(fs.readFileSync(path.join(d,'native-cells.json'))).filter(c=>c.layer===0&&(c.word&1023)!==256);for(const c of cells)for(let y=0;y<8;y++)for(let x=0;x<8;x++)coverage[(c.y+y)*256+c.x+x]=1;
 const outside=[];pixels.forEach((v,i)=>{if(v&&!coverage[i])outside.push([i%256,Math.floor(i/256)]);});
 return{pixels,palette,audit:{source,sourceSha256:sha(bytes),bounds,method,targetWidth,sampledHeight:height,origin:[dx,dy],reflection:'Exact horizontal reflection of source left half to match native BG tile pairs',alphaThreshold:128,coverageThreshold:.28,paletteUnchanged:!warm,outsideOldNonblankFootprint:outside,opaquePixels:pixels.reduce((n,v)=>n+!!v,0),pixelsSha256:sha(pixels)}};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const reports=[];for(const warm of[false,true])for(const method of['area','nearest']){const r=sampleBody({warm,method});reports.push(r.audit);fs.writeFileSync(path.join(d,`review/body-${warm?'warm':'original'}-${method}-3x.png`),PNG.sync.write(render(r.pixels,256,144,r.palette,3)));}fs.writeFileSync(path.join(d,'body-sampling-audit.json'),JSON.stringify(reports,null,2)+'\n');console.log(reports.map(r=>({width:r.targetWidth,height:r.sampledHeight,method:r.method,original:r.paletteUnchanged,outside:r.outsideOldNonblankFootprint.length})));}
