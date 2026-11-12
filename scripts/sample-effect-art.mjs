// Samples a generated effect sheet (one sprite per grid cell) into 32x32
// native palette indices. Dark background and glow fall away; a one-pixel
// outline is restored around the lit body.
//   node scripts/sample-effect-art.mjs src.png cols rows artWidth threshold '{"1":"rrggbb",...}' preview.png out.json
import {PNG} from 'pngjs';import fs from 'node:fs';
// usage: sample.mjs src.png cols rows artWidth threshold paletteJSON outPreview.png outJSON
const [src,cols,rows,artW,thr,palJ,prev,outJ]=process.argv.slice(2);const img=PNG.sync.read(fs.readFileSync(src));
const pal=JSON.parse(palJ);// {index:'rrggbb'}
const entries=Object.entries(pal).map(([i,h])=>[+i,parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]);
const N=+(process.env.SIZE||32),W=img.width/cols,H=img.height/rows,px=(x,y)=>{const i=(y*img.width+x)*4;return[img.data[i],img.data[i+1],img.data[i+2]];};
const V=([r,g,b])=>Math.max(r,g,b);
// KEY=magenta treats the flat #FF00FF background as empty; otherwise dark pixels are.
// KEY=alpha is for a sheet generated with a transparent background.
const magenta=process.env.KEY==='magenta',alpha=process.env.KEY==='alpha';
const emptyColor=c=>magenta?(c[0]>170&&c[2]>170&&c[1]<110):V(c)<+thr,emptyAt=(x,y)=>alpha?(x<0||y<0||x>=img.width||y>=img.height||img.data[(y*img.width+x)*4+3]<128):emptyColor(px(x,y));const sprites=[];
for(let cy=0;cy<rows;cy++)for(let cx=0;cx<cols;cx++){
 let x0=1e9,y0=1e9,x1=-1,y1=-1;for(let y=Math.floor(cy*H);y<(cy+1)*H;y++)for(let x=Math.floor(cx*W);x<(cx+1)*W;x++)if(!emptyAt(x,y)){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const scale=(process.env.FIT==="max"?Math.max(x1-x0+1,y1-y0+1):(x1-x0+1))/ +artW,ox=(x0+x1)/2-N/2*scale,oy=(y0+y1)/2-N/2*scale,out=new Array(N*N).fill(0);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const sx=Math.round(ox+(x+.5)*scale),sy=Math.round(oy+(y+.5)*scale);if(sx<cx*W||sx>=(cx+1)*W||sy<cy*H||sy>=(cy+1)*H)continue;
  // median of a small block around the center
  const samples=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!emptyAt(sx+dx,sy+dy))samples.push(px(sx+dx,sy+dy));const solid=samples;if(solid.length<5)continue;solid.sort((a,b)=>V(a)-V(b));const c=solid[Math.floor(solid.length/2)];let best=0,bd=1e9;for(const[i,r,g,b]of entries){const d=(r-c[0])**2*.3+(g-c[1])**2*.59+(b-c[2])**2*.11;if(d<bd){bd=d;best=i;}}out[y*N+x]=best;}
 // Halo cleanup: dark entries (outline colors) survive only beside a lit pixel;
 // then every lit pixel on the edge gets a one-pixel outline.
 const dark=new Set((process.env.DARK||'3,7').split(',').map(Number)),outline=+(process.env.OUTLINE||7);
 const lit=i=>out[i]&&!dark.has(out[i]);const nb=(x,y)=>[[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>a>=0&&b>=0&&a<N&&b<N).map(([a,b])=>b*N+a);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(out[i]&&dark.has(out[i])&&!nb(x,y).some(lit))out[i]=0;}
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(!out[i]&&nb(x,y).some(lit))out[i]=outline;}
 sprites.push(out);}
const P=new PNG({width:N*8*sprites.length,height:N*8});P.data.fill(80);
sprites.forEach((s,k)=>{for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=s[y*N+x];const e=entries.find(e=>e[0]===v);for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){const i=((y*8+yy)*P.width+k*N*8+x*8+xx)*4;if(e){P.data[i]=e[1];P.data[i+1]=e[2];P.data[i+2]=e[3];}else{P.data[i]=P.data[i+1]=P.data[i+2]=((x+y)&1)?60:90;}P.data[i+3]=255;}}});
fs.writeFileSync(prev,PNG.sync.write(P));fs.writeFileSync(outJ,JSON.stringify(sprites.map(s=>s.map(v=>v.toString(16)).join(''))));
