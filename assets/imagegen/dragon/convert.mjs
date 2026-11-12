// Converts the selected gpt-image-2 sources in ./sources into Dragon's native
// indexed art (content/dragon-art.js). Deterministic: the same sources and
// base ROM always give the same bytes. See README.md for the steps.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {sceneCells} from '../../../engine/scene-map.js';

const require=createRequire(import.meta.url);
const {PNG}=require('pngjs');
const source=name=>new URL('./sources/'+name,import.meta.url);

function loadRGBA(url){const p=PNG.sync.read(readFileSync(url));return {w:p.width,h:p.height,d:p.data};}

// Alpha from the flat green chroma key, with green spill clamped on edges.
function keyGreen(img,lo=40,hi=110){
  const {w,h,d}=img,a=new Float32Array(w*h),rgb=new Float32Array(w*h*3);
  for(let i=0;i<w*h;i++){
    const r=d[i*4],g=d[i*4+1],b=d[i*4+2],k=g-Math.max(r,b),al=k<=lo?1:k>=hi?0:1-(k-lo)/(hi-lo);a[i]=al;
    rgb[i*3]=r;rgb[i*3+1]=al<1?Math.min(g,Math.max(r,b)):g;rgb[i*3+2]=b;
  }
  return {w,h,a,rgb};
}

// Area-average a source rectangle into w x h premultiplied RGBA floats.
function resample(k,sx,sy,sw,sh,w,h){
  const out=new Float32Array(w*h*4);
  for(let ty=0;ty<h;ty++)for(let tx=0;tx<w;tx++){
    const fx0=sx+tx*sw/w,fx1=sx+(tx+1)*sw/w,fy0=sy+ty*sh/h,fy1=sy+(ty+1)*sh/h;let A=0,R=0,G=0,B=0,W=0;
    for(let y=Math.floor(fy0);y<Math.ceil(fy1);y++)for(let x=Math.floor(fx0);x<Math.ceil(fx1);x++){
      if(x<0||y<0||x>=k.w||y>=k.h){W+=1;continue;}
      const wt=(Math.min(x+1,fx1)-Math.max(x,fx0))*(Math.min(y+1,fy1)-Math.max(y,fy0));if(wt<=0)continue;
      const i=y*k.w+x,al=k.a[i];A+=al*wt;R+=k.rgb[i*3]*al*wt;G+=k.rgb[i*3+1]*al*wt;B+=k.rgb[i*3+2]*al*wt;W+=wt;
    }
    const o=(ty*w+tx)*4;out[o+3]=W?A/W:0;if(A>0){out[o]=R/A;out[o+1]=G/A;out[o+2]=B/A;}
  }
  return out;
}

const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
function lab(r,g,b){
  const R=lin(r),G=lin(g),B=lin(b),f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
  const X=f((R*.4124+G*.3576+B*.1805)/.95047),Y=f(R*.2126+G*.7152+B*.0722),Z=f((R*.0193+G*.1192+B*.9505)/1.08883);
  return [116*Y-16,500*(X-Y),200*(Y-Z)];
}
const dist=(p,q)=>(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;
const nearest=(L,palLab)=>{let bi=0,bd=1e18;palLab.forEach((c,j)=>{const d=dist(L,c);if(d<bd){bd=d;bi=j;}});return bi;};
function kmeans(samples,k,iters){
  samples=samples.slice().sort((p,q)=>p[0]-q[0]);
  let c=Array.from({length:k},(_,i)=>samples[Math.floor((i+.5)*samples.length/k)].slice());
  for(let it=0;it<iters;it++){
    const acc=c.map(()=>[0,0,0,0]);
    for(const s of samples){const a=acc[nearest(s,c)];a[0]+=s[0];a[1]+=s[1];a[2]+=s[2];a[3]++;}
    c=c.map((v,j)=>acc[j][3]?[acc[j][0]/acc[j][3],acc[j][1]/acc[j][3],acc[j][2]/acc[j][3]]:v);
  }
  return c;
}
const mirrorAverage=(px,W,H)=>{
  for(let y=0;y<H;y++)for(let x=0;x<W/2;x++){
    const i=(y*W+x)*4,j=(y*W+W-1-x)*4,ai=px[i+3],aj=px[j+3];
    for(let q=0;q<3;q++){const v=(ai+aj)>0?(px[i+q]*ai+px[j+q]*aj)/(ai+aj):0;px[i+q]=px[j+q]=v;}
    px[i+3]=px[j+3]=(ai+aj)/2;
  }
};
const outline=(idx,W,H)=>{
  const o=idx.slice();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x;if(!idx[i])continue;
    const t=(xx,yy)=>xx<0||yy<0||xx>=W||yy>=H||!idx[yy*W+xx];
    if(t(x-1,y)||t(x+1,y)||t(x,y-1)||t(x,y+1))o[i]=1;
  }
  return o;
};

// Native cells that draw Dragon's large art: folded maps 121/52 (tileset 39,
// 112x160 canvas) and flight maps 51/145/146 (tileset 26, 240x160 canvas).
function coverage(base){
  const folded=new Uint8Array(14*20),winged=new Uint8Array(30*20);
  for(const [map,oy] of [[121,96],[52,48]])for(const c of sceneCells(base,map,39))if((c.word&1023)>=768){
    const x=c.x-72,y=c.y-oy;if(x>=0&&x<112&&y>=0&&y<160)folded[(y>>3)*14+(x>>3)]=1;
  }
  for(const map of [51,145,146])for(const c of sceneCells(base,map,26)){
    const t=c.word&1023,x=c.x-8,y=c.y-304;
    if(t<768||t===1016||t===776||x<0||x+8>240||y<0||y+8>160)continue;
    winged[(y>>3)*30+(x>>3)]=1;
  }
  return {folded,winged};
}

// The layout guide's body (no wings) at canvas resolution; the generated
// sources were drawn into these shapes (see sources/guide-*.png).
function guideBody(W=240,H=160){
  const c=new Uint8Array(W*H);
  const inPoly=(x,y,pts)=>{let ins=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))ins=!ins;}return ins;};
  const ell=(cx,cy,rx,ry)=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1)c[y*W+x]=1;};
  const poly=pts=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inPoly(x+.5,y+.5,pts))c[y*W+x]=1;};
  ell(120,44,12,14);poly([[111,52],[129,52],[132,68],[108,68]]);ell(120,90,31,32);
  ell(91,110,9,9);ell(149,110,9,9);ell(96,72,8,7);ell(144,72,8,7);
  poly([[110,116],[130,116],[124,140],[122,152],[118,152],[116,140]]);poly([[120,147],[127,154],[120,160],[113,154]]);
  return c;
}

// Folded and winged large art with one shared twelve-color palette. The winged
// canvas shares the folded head, neck, harness, hips and tail (shared tiles);
// only the wing-root strips beside the body differ, within the spare tiles.
function largeArt(base){
  const W=240,H=160,cov=coverage(base);
  const prep=name=>{const k=keyGreen(loadRGBA(source(name))),px=resample(k,0,0,k.w,k.h,W,H);mirrorAverage(px,W,H);return px;};
  const wOK=(x,y)=>!!cov.winged[(y>>3)*30+(x>>3)],fOK=(x,y)=>x>=64&&x<176&&!!cov.folded[(y>>3)*14+((x-64)>>3)];
  const pw=prep('winged.png'),pf=prep('folded.png');
  const opW=i=>pw[i*4+3]>=.5&&wOK(i%W,i/W|0),opF=i=>pf[i*4+3]>=.5&&fOK(i%W,i/W|0);
  const samples=[];
  for(let i=0;i<W*H;i++){if(opW(i))samples.push(lab(pw[i*4],pw[i*4+1],pw[i*4+2]));if(opF(i))samples.push(lab(pf[i*4],pf[i*4+1],pf[i*4+2]));}
  const cent=kmeans(samples,12,40),acc=cent.map(()=>[0,0,0,0]);
  for(const px of [pw,pf])for(let i=0;i<W*H;i++)if(px[i*4+3]>=.5){const a=acc[nearest(lab(px[i*4],px[i*4+1],px[i*4+2]),cent)];a[0]+=px[i*4];a[1]+=px[i*4+1];a[2]+=px[i*4+2];a[3]++;}
  const pal=acc.map(a=>a[3]?[a[0]/a[3],a[1]/a[3],a[2]/a[3]]:[0,0,0]).map(c=>c.map(v=>Math.round(v/255*31)*255/31|0)).sort((p,q)=>lab(...p)[0]-lab(...q)[0]);
  const palLab=pal.map(c=>lab(...c)),q=(px,i)=>nearest(lab(px[i*4],px[i*4+1],px[i*4+2]),palLab)+1;
  let wi=new Uint8Array(W*H),fi=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++){if(opW(i))wi[i]=q(pw,i);if(opF(i))fi[i]=q(pf,i);}
  fi=outline(fi,W,H);wi=outline(wi,W,H);
  const shared=(x,y)=>x>=64&&x<176&&(x>=96&&x<144||y<64||y>=120);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(shared(x,y))wi[y*W+x]=fi[y*W+x];
  // In the shared shoulder and hip rows, drop folded-wing pixels outside the
  // body so no folded wing tips float beside the spread wings.
  const g=guideBody(),body=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(g[y*W+x])for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H)body[yy*W+xx]=1;}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(shared(x,y)&&!(x>=96&&x<144)&&!body[y*W+x])wi[y*W+x]=0;
  wi=outline(wi,W,H);
  const folded=new Uint8Array(112*160);for(let y=0;y<160;y++)for(let x=0;x<112;x++)folded[y*112+x]=fi[y*W+x+64];
  return {palette:pal,folded,winged:wi};
}

// Samples generated "enlarged pixel art" back onto its grid: block size and
// phase from color edges, then the most common palette color per block.
function gridSample(name,palette){
  const {w,h,d}=loadRGBA(source(name)),pal=palette.map(c=>lab(...c));
  const edge=axis=>{const n=axis?h:w,e=new Float32Array(n);for(let a=1;a<n;a++){let s=0;const m=axis?w:h;for(let b=0;b<m;b+=2){const i=axis?((a*w+b)*4):((b*w+a)*4),j=axis?(((a-1)*w+b)*4):((b*w+a-1)*4);s+=Math.abs(d[i]-d[j])+Math.abs(d[i+1]-d[j+1])+Math.abs(d[i+2]-d[j+2]);}e[a]=s;}return e;};
  const fit=e=>{let best=null;for(let bs=26;bs<=40;bs+=.125)for(let ph=0;ph<bs;ph+=.5){let s=0,c=0;for(let k=ph;k<e.length;k+=bs){const x=Math.round(k);if(x>0&&x<e.length){s+=e[x];c++;}}const sc=s/c;if(!best||sc>best.sc)best={bs,ph,sc};}return best;};
  const gx=fit(edge(0)),gy=fit(edge(1)),cols=Math.floor((w-gx.ph)/gx.bs),rows=Math.floor((h-gy.ph)/gy.bs);
  const pix=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){const R=d[i*4],G=d[i*4+1],B=d[i*4+2];pix[i]=G-Math.max(R,B)>60?0:nearest(lab(R,G,B),pal)+1;}
  const out=[];
  for(let r=0;r<rows;r++){const row=[];for(let c=0;c<cols;c++){
    const x0=gx.ph+c*gx.bs,y0=gy.ph+r*gy.bs,cnt=new Map();
    for(let y=Math.round(y0+gy.bs*.2);y<y0+gy.bs*.8;y++)for(let x=Math.round(x0+gx.bs*.2);x<x0+gx.bs*.8;x++){const v=pix[y*w+x];cnt.set(v,(cnt.get(v)||0)+1);}
    let bv=0,bn=-1;for(const [v,n] of cnt)if(n>bn){bn=n;bv=v;}row.push(bv);
  }out.push(row);}
  return out;
}

// Native 32x32 world frames: front/back mirrored about column 15 with three
// wing beats; the side view keeps everything right of x=15 in rows 8-23.
function worldFrames(palette){
  const blank=()=>new Uint8Array(32*32);
  const bbox=g=>{let x0=1e9,x1=-1,y0=1e9,y1=-1;g.forEach((r,y)=>r.forEach((v,x)=>{if(v){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}));return {x0,x1,y0,y1};};
  const symmetric=(g,drop=[])=>{
    const b=bbox(g),keep=[];for(let x=b.x0;x<=b.x1;x++)if(!drop.includes(x))keep.push(x);
    const half=keep.slice(0,Math.ceil(keep.length/2));while(half.length<16)half.unshift(-1);const cols=half.slice(-16);
    const f=blank(),h=b.y1-b.y0+1,top=Math.max(0,Math.min(32-h,Math.round((32-h)/2)));
    for(let y=0;y<h&&top+y<32;y++)for(let i=0;i<16;i++){const sx=cols[i],v=sx<0?0:g[b.y0+y][sx];f[(top+y)*32+i]=v;f[(top+y)*32+30-i]=v;}
    return f;
  };
  const beat=(f,lift,from=6)=>{const o=blank();for(let y=0;y<32;y++)for(let x=0;x<31;x++){const d=Math.abs(x-15),s=d<from?0:Math.round(lift*Math.min(1,(d-from+1)/(15-from))),sy=y+s;o[y*32+x]=sy<32?f[sy*32+x]:0;}return o;};
  // Hand-finished face for the front view: the palette has no white, so the
  // generated eye highlights collapse. Two 2x2 eyes, cheeks, snout, nostrils.
  const FACE=[[22,12,'1aaaaa1'],[23,11,'19aaaaa91'],[24,11,'1a1cac1a1'],[25,11,'1a11a11a1'],[26,11,'19aaaaa91'],[27,12,'1bbbbb1'],[28,12,'1b7b7b1'],[29,13,'1bbb1'],[30,14,'111']];
  const face=f=>{for(const [y,x0,str] of FACE)for(let i=0;i<str.length;i++)f[y*32+x0+i]=parseInt(str[i],16);return f;};
  const front=gridSample('world-front.png',palette),back=gridSample('world-back.png',palette),left=gridSample('world-left.png',palette);
  const fb=bbox(back),F0=face(symmetric(front)),B0=symmetric(back,[fb.x0+4,fb.x0+8]);
  const frames={front0:F0,front1:beat(F0,2),front2:beat(F0,4),back0:B0,back1:beat(B0,2),back2:beat(B0,4)};
  const lb=bbox(left),L0=blank(),top=Math.round((32-(lb.y1-lb.y0+1))/2);
  for(let y=lb.y0;y<=lb.y1;y++)for(let x=lb.x0;x<=lb.x1;x++){const tx=x-lb.x0,ty=y-lb.y0+top;if(tx<32&&ty>=0&&ty<32)L0[ty*32+tx]=left[y][x];}
  for(let y=0;y<32;y++)for(let x=16;x<32;x++)if(L0[y*32+x]&&(y<8||y>23))throw Error('Side view leaves the stored right-half rows');
  const L1=L0.slice();for(let y=8;y<24;y++)for(let x=22;x<32;x++)L1[y*32+x]=y+1<24?L0[(y+1)*32+x]:0;
  frames.left0=L0;frames.left1=L1;
  // Readability on busy map terrain: a uniform darkest outline on every edge
  // pixel, and wing membranes one shade deeper than the lightest pink.
  for(const k of Object.keys(frames)){const f=frames[k],o=f.slice();for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=y*32+x;if(!f[i])continue;if(f[i]===12)o[i]=10;const t=(xx,yy)=>xx<0||yy<0||xx>=32||yy>=32||!f[yy*32+xx];if(t(x-1,y)||t(x+1,y)||t(x,y-1)||t(x,y+1))o[i]=1;}frames[k]=o;}
  return frames;
}

// First-person saddle view (256x96): rows from 40 down are fully opaque (no
// sky layer below the raster split) and the native OAM tiles stay empty.
function saddleView(palette){
  const W=256,H=96,palLab=palette.map(c=>lab(...c));
  const k=keyGreen(loadRGBA(source('saddle.png'))),px=resample(k,0,0,k.w,k.h,W,H);mirrorAverage(px,W,H);
  const zero=(x,y)=>{const half=x<128?x:255-x;return (y<8&&half<104)||(y<40&&half<32);};
  const idx=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(zero(x,y))continue;if(px[i*4+3]<.5&&y<40)continue;if(px[i*4+3]<.05&&y>=40)continue;idx[i]=nearest(lab(px[i*4],px[i*4+1],px[i*4+2]),palLab)+1;}
  for(let x=0;x<W;x++)for(let y=40;y<H;y++)if(!idx[y*W+x]){let v=0;for(let yy=y+1;yy<H&&!v;yy++){const c=idx[yy*W+x];if(c&&c>=6)v=c;}idx[y*W+x]=v||6;}
  const o=idx.slice();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!idx[i])continue;const t=(xx,yy)=>xx>=0&&yy>=0&&xx<W&&yy<H&&!idx[yy*W+xx];if(t(x-1,y)||t(x+1,y)||t(x,y-1)||t(x,y+1))o[i]=1;}
  return o;
}

export function convertDragonArt(base){
  const large=largeArt(base),world=worldFrames(large.palette),saddle=saddleView(large.palette);
  const hex=large.palette.map(c=>c.map(v=>v.toString(16).padStart(2,'0')).join(''));
  const img=(a,w,h)=>({width:w,height:h,rows:Array.from({length:h},(_,y)=>Array.from(a.slice(y*w,(y+1)*w),v=>v.toString(16)).join(''))});
  const art={palette:hex,folded:img(large.folded,112,160),winged:img(large.winged,240,160),
    world:Object.fromEntries(['front0','front1','front2','back0','back1','back2','left0','left1'].map(k=>[k,img(world[k],32,32)])),
    saddle:img(saddle,256,96)};
  return `// Generated by scripts/import-dragon-art.mjs from the image-generation sources
// in assets/imagegen/dragon (see its README); do not edit by hand.
// Indexed pixel art as rows of hex digits: 0 is transparent, 1-c index the
// twelve shared Dragon colors below (darkest first).
export const dragonArt = ${JSON.stringify(art,null,1)};
`;
}
