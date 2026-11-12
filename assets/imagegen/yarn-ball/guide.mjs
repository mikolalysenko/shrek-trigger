// Draws the layout guide and edit mask (1536x1024 = the 192x128 BG3 canvas
// at 8x) for the yarn ball inside the native frog map's footprint: the
// left-half cells mirrored about x=96.
// usage: node assets/imagegen/yarn-ball/guide.mjs [outDir=sources]
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {yarnBallCells} from './convert.mjs';

const require=createRequire(import.meta.url);
const {PNG}=require('pngjs');
const W=192,H=128,cell=(x,y)=>yarnBallCells[y>>4].includes(x<96?x>>4:(191-x)>>4);
// Ball: centre (96,56), radius 54 (rows 0-6). Loose end: a 5px strand from the
// ball's lower left trailing down to the ground in row 7 (avoids row 6 col 2).
const strand=[[64,96],[58,106],[52,113],[44,118],[36,120]];
const segDist=(px,py,[ax,ay],[bx,by])=>{const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));return Math.hypot(px-ax-t*dx,py-ay-t*dy);};
const c=new Uint8Array(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const lx=x<96?x+.5:191-x+.5,ly=y+.5,ball=Math.hypot(lx-96,ly-56)<=54;
  let s=false;for(let i=0;i+1<strand.length;i++)if(segDist(lx,ly,strand[i],strand[i+1])<=2.6)s=true;
  if(ball||s)c[y*W+x]=1;
}
for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(c[y*W+x]&&!cell(x,y))throw Error('guide leaves the native cells at '+x+','+y);
const S=8,guide=new PNG({width:W*S,height:H*S}),mask=new PNG({width:W*S,height:H*S});
for(let y=0;y<H*S;y++)for(let x=0;x<W*S;x++){
  const cx=Math.floor(x/S),cy=Math.floor(y/S),i=(y*W*S+x)*4;
  guide.data.set(c[cy*W+cx]?[64,64,64,255]:[0,255,0,255],i);
  // The mask opens the shape plus a 2-pixel margin for the outline.
  let open=0;for(let dy=-2;dy<=2&&!open;dy++)for(let dx=-2;dx<=2&&!open;dx++){const xx=cx+dx,yy=cy+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&c[yy*W+xx])open=1;}
  mask.data.set([0,0,0,open?0:255],i);
}
const out=new URL((process.argv[2]??'sources').replace(/\/?$/,'/'),new URL('./',import.meta.url));
writeFileSync(new URL('guide-yarn.png',out),PNG.sync.write(guide));writeFileSync(new URL('mask-yarn.png',out),PNG.sync.write(mask));
