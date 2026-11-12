// Converts the selected gpt-image-2 onion kart sources in ./sources into the
// race's native indexed art (content/onion-kart-art.js). The image model would
// not draw Shrek, so the driver is Shrek's own field sprite head seated on the
// kart. Deterministic: the same sources always give the same bytes.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {rasterArt} from '../../../engine/raster-art.js';
import {cast} from '../../../content/cast.js';

const require=createRequire(import.meta.url);
const {PNG}=require('pngjs');
const hex=h=>[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
function lab(r,g,b){
  const R=lin(r),G=lin(g),B=lin(b),f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
  const X=f((R*.4124+G*.3576+B*.1805)/.95047),Y=f(R*.2126+G*.7152+B*.0722),Z=f((R*.0193+G*.1192+B*.9505)/1.08883);
  return [116*Y-16,500*(X-Y),200*(Y-Z)];
}
const dist=(p,q)=>(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;
const nearest=(L,list)=>{let bi=0,bd=1e18;list.forEach((c,j)=>{const d=dist(L,c);if(d<bd){bd=d;bi=j;}});return bi;};
function kmeans(samples,k,iters){
  samples=samples.slice().sort((p,q)=>p[0]-q[0]);
  let c=Array.from({length:k},(_,i)=>samples[Math.floor((i+.5)*samples.length/k)].slice());
  for(let it=0;it<iters;it++){const acc=c.map(()=>[0,0,0,0]);for(const s of samples){const a=acc[nearest(s,c)];a[0]+=s[0];a[1]+=s[1];a[2]+=s[2];a[3]++;}c=c.map((v,j)=>acc[j][3]?[acc[j][0]/acc[j][3],acc[j][1]/acc[j][3],acc[j][2]/acc[j][3]]:v);}
  return c;
}
// Flat magenta key (green keys would eat the ogre's skin), cropped to the kart.
function keyed(name){
  const p=PNG.sync.read(readFileSync(new URL('./sources/'+name,import.meta.url))),{width:w,height:h,data:d}=p,a=new Float32Array(w*h);
  let x0=w,x1=-1,y0=h,y1=-1;
  for(let i=0;i<w*h;i++){const k=Math.min(d[i*4],d[i*4+2])-d[i*4+1];a[i]=k<=60?1:k>=140?0:1-(k-60)/80;if(a[i]>.5){const x=i%w,y=i/w|0;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
  return {w,h,d,a,box:{x0,y0,x1,y1}};
}
// Area-average the kart into a box that keeps its aspect ratio.
function shrink(k,W,H){
  const bw=k.box.x1-k.box.x0+1,bh=k.box.y1-k.box.y0+1,s=Math.min(W/bw,H/bh),w=Math.round(bw*s),h=Math.round(bh*s),px=new Float32Array(w*h*4);
  for(let ty=0;ty<h;ty++)for(let tx=0;tx<w;tx++){
    const fx0=k.box.x0+tx*bw/w,fx1=k.box.x0+(tx+1)*bw/w,fy0=k.box.y0+ty*bh/h,fy1=k.box.y0+(ty+1)*bh/h;let A=0,R=0,G=0,B=0,Wt=0;
    for(let y=Math.floor(fy0);y<Math.ceil(fy1);y++)for(let x=Math.floor(fx0);x<Math.ceil(fx1);x++){const wt=(Math.min(x+1,fx1)-Math.max(x,fx0))*(Math.min(y+1,fy1)-Math.max(y,fy0));if(wt<=0)continue;const i=y*k.w+x,al=k.a[i];A+=al*wt;R+=k.d[i*4]*al*wt;G+=k.d[i*4+1]*al*wt;B+=k.d[i*4+2]*al*wt;Wt+=wt;}
    const o=(ty*w+tx)*4;px[o+3]=Wt?A/Wt:0;if(A>0){px[o]=R/A;px[o+1]=G/A;px[o+2]=B/A;}
  }
  return {px,w,h};
}
const outline=(f,W,H)=>{const o=f.slice();for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!f[i])continue;const t=(xx,yy)=>xx<0||yy<0||xx>=W||yy>=H||!f[yy*W+xx];if(t(x-1,y)||t(x+1,y)||t(x,y-1)||t(x,y+1))o[i]=1;}return o;};

export function convertOnionKart(){
  const shrekPal=cast[0].palette.map(hex),sLab=shrekPal.map(c=>lab(...c));
  const boxes={side:['side.png',32,17],angle:['angle.png',30,18],back:['back.png',28,21],front:['front.png',28,21],parked:['parked.png',94,46]};
  const v=Object.fromEntries(Object.entries(boxes).map(([k,[f,W,H]])=>[k,shrink(keyed(f),W,H)]));
  // Three onion golds: k-means over kart colors that Shrek's palette lacks.
  const dmin=L=>Math.min(...sLab.map(s=>dist(L,s))),far=[];
  for(const s of Object.values(v))for(let i=0;i<s.w*s.h;i++)if(s.px[i*4+3]>=.5){const L=lab(s.px[i*4],s.px[i*4+1],s.px[i*4+2]);if(dmin(L)>150)far.push(L);}
  const gl=kmeans(far,3,30),acc=gl.map(()=>[0,0,0,0]);
  for(const s of Object.values(v))for(let i=0;i<s.w*s.h;i++)if(s.px[i*4+3]>=.5){const L=lab(s.px[i*4],s.px[i*4+1],s.px[i*4+2]);if(dmin(L)<=150)continue;const a=acc[nearest(L,gl)];a[0]+=s.px[i*4];a[1]+=s.px[i*4+1];a[2]+=s.px[i*4+2];a[3]++;}
  const golds=acc.map(a=>[a[0]/a[3],a[1]/a[3],a[2]/a[3]].map(c=>Math.round(c/255*31)*255/31|0)).sort((p,q)=>lab(...p)[0]-lab(...q)[0]);
  const pal=[...shrekPal,...golds],palLab=pal.map(c=>lab(...c));
  const index=(s,i)=>nearest(lab(s.px[i*4],s.px[i*4+1],s.px[i*4+2]),palLab)+1;
  const kart=(s,W,H)=>{const f=new Uint8Array(W*H),x0=Math.floor((W-s.w)/2),y0=H-s.h;for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const i=y*s.w+x;if(s.px[i*4+3]>=.5)f[(y0+y)*W+x0+x]=index(s,i);}return f;};
  // Shrek's own field sprite head and two rows of shoulders.
  const head=(facing,r0,r1)=>{const p=rasterArt('shrek',{facing,pose:'idle',phase:0}),rows=[];let x0=32,x1=-1;for(let y=r0;y<=r1;y++)for(let x=0;x<32;x++)if(p[y*32+x]){x0=Math.min(x0,x);x1=Math.max(x1,x);}for(let y=r0;y<=r1;y++){const row=[];for(let x=x0;x<=x1;x++)row.push(p[y*32+x]);rows.push(row);}return rows;};
  // The kart covers the driver's lower rows; his head stays on top above the seat.
  const seat=(k,W,H,h,dx,dy,headRows)=>{const f=new Uint8Array(W*H);for(let y=0;y<h.length;y++)for(let x=0;x<h[0].length;x++){const c=h[y][x],xx=dx+x,yy=dy+y;if(c&&xx>=0&&yy>=0&&xx<W&&yy<H)f[yy*W+xx]=c;}for(let i=0;i<W*H;i++)if(k[i]&&!(f[i]&&Math.floor(i/W)<dy+headRows))f[i]=k[i];return outline(f,W,H);};
  const side=kart(v.side,32,24),angle=kart(v.angle,32,24),back=kart(v.back,32,32),front=kart(v.front,32,32);
  const hL=head(2,1,11),hB=head(0,2,10),hF=head(1,2,10);
  // Native phases: the driver bobs one pixel while the kart holds the road.
  const views={
    side0:seat(side,32,24,hL,16,1,8),side1:seat(side,32,24,hL,16,0,8),side2:seat(side,32,24,hL,16,2,7),
    angle0:seat(angle,32,24,hL,14,0,8),angle1:seat(angle,32,24,hL,14,1,7),
    back0:seat(back,32,32,hB,Math.round((32-hB[0].length)/2),6,6),
    front0:seat(front,32,32,hF,Math.round((32-hF[0].length)/2),5,7)};
  const parked=outline(kart(v.parked,96,48),96,48);
  // Packet 1 is not a minimap: the race pastes these four 8x8 patches over
  // the rider every frame (stock: Crono's hair and face), as solid blocks.
  // Each patch therefore repeats the kart art at its native paste position:
  // 0/1 side views at (8,0), 2 front view at (12,8), 3 back view at (12,0).
  const patch=(frame,x0,y0)=>{const a=views[frame],out=new Uint8Array(64);for(let y=0;y<8;y++)for(let x=0;x<8;x++)out[y*8+x]=a[(y0+y)*32+x0+x];return out;};
  for(const f of['side0','side1','side2'])for(let y=0;y<9;y++)for(let x=8;x<16;x++)if(views[f][y*32+x]&&y<8)throw Error('Side view must leave the rider patch area empty');
  const minimap=[patch('side0',8,0),patch('side0',8,0),patch('front0',12,8),patch('back0',12,0)];
  const hexOf=c=>c.map(x=>x.toString(16).padStart(2,'0')).join('');
  const img=(a,w,h)=>({width:w,height:h,rows:Array.from({length:h},(_,y)=>Array.from(a.slice(y*w,(y+1)*w),c=>c.toString(16)).join(''))});
  const art={palette:pal.map(hexOf),views:Object.fromEntries(Object.entries(views).map(([k,a])=>[k,img(a,32,a.length/32)])),parked:img(parked,96,48),riderPatches:minimap.map(a=>img(a,8,8))};
  return `// Generated by scripts/import-onion-kart-art.mjs from the image-generation
// sources in assets/imagegen/onion-kart (see its README); do not edit by hand.
// Indexed rows of hex digits: 0 transparent, 1-c Shrek's own colors, d-f the
// three onion golds (the race and parked-cart palettes use these 15 colors).
export const onionKartArt = ${JSON.stringify(art,null,1)};
`;
}
