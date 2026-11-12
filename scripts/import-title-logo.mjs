import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

// Converts the user-supplied Shrek logo (transparent PNG, letters S H R E K
// left to right) into native title pixel art. The S and its ears sit in the
// stock clock dial; the other letters become 16x16 sprite letters. The source
// image stays private in .local; only the derived pixels are written.
const path=process.argv[2];
if(!path)throw Error('Usage: node scripts/import-title-logo.mjs /path/to/user-provided-logo.png');
const bytes=await readFile(path),sha256=createHash('sha256').update(bytes).digest('hex');
const {width:W,height:H,data}=PNG.sync.read(bytes);

// The letters are the five large opaque shapes, ordered left to right.
const label=new Int32Array(W*H).fill(-1),parts=[];
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(label[y*W+x]>=0||data[(y*W+x)*4+3]<128)continue;
  const part={id:parts.length,count:0,x0:x,x1:x,y0:y,y1:y},stack=[y*W+x];label[y*W+x]=part.id;
  while(stack.length){
    const p=stack.pop(),px=p%W,py=(p-px)/W;part.count++;
    part.x0=Math.min(part.x0,px);part.x1=Math.max(part.x1,px);part.y0=Math.min(part.y0,py);part.y1=Math.max(part.y1,py);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;
      const q=ny*W+nx;if(label[q]<0&&data[q*4+3]>=128){label[q]=part.id;stack.push(q);}
    }
  }
  parts.push(part);
}
const letters=parts.filter(p=>p.count>500).sort((a,b)=>a.x0-b.x0);
if(letters.length!==5)throw Error(`Expected the five letters of SHREK, found ${letters.length} large shapes`);
// Anti-aliased edge pixels belong to the nearest letter.
const owner=new Int32Array(W*H).fill(-1);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  let best=-1,distance=9;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;
    const l=label[ny*W+nx];if(l>=0&&dx*dx+dy*dy<distance){distance=dx*dx+dy*dy;best=l;}
  }
  owner[y*W+x]=best;
}

// Area-averages one letter into a w x h pixel canvas. The letter's source
// bounding-box origin lands at (ox,oy); sx and sy are the scales.
function resample(part,sx,sy,ox,oy,w,h){
  const acc=new Float64Array(w*h*4);
  for(let y=part.y0-2;y<=part.y1+2;y++)for(let x=part.x0-2;x<=part.x1+2;x++){
    if(x<0||y<0||x>=W||y>=H||owner[y*W+x]!==part.id)continue;
    const k=(y*W+x)*4,a=data[k+3]/255;if(!a)continue;
    const X0=(x-part.x0)*sx+ox,X1=X0+sx,Y0=(y-part.y0)*sy+oy,Y1=Y0+sy;
    for(let ty=Math.floor(Y0);ty<Y1;ty++){
      const vy=Math.min(Y1,ty+1)-Math.max(Y0,ty);if(vy<=0||ty<0||ty>=h)continue;
      for(let tx=Math.floor(X0);tx<X1;tx++){
        const vx=Math.min(X1,tx+1)-Math.max(X0,tx);if(vx<=0||tx<0||tx>=w)continue;
        const weight=vx*vy*a,o=(ty*w+tx)*4;
        acc[o]+=weight*data[k];acc[o+1]+=weight*data[k+1];acc[o+2]+=weight*data[k+2];acc[o+3]+=weight;
      }
    }
  }
  return acc;
}

// Layout in screen pixels. The S body is centred on the stock clock's pivot
// (62,73) and fills the dial, with its ears beside the XII. The other letters
// are at most two 16x16 cells wide (wider ones are narrowed slightly), sit
// above TRIGGER like the stock letters and stay clear of the pendulum's rod.
const [S,...rest]=letters,names=['H','R','E','K'];
const sBody={top:96,bottom:207,left:24},sHeight=46,sTop=50,sLeft=38;
const sScale=sHeight/(sBody.bottom-sBody.top);
const letterTop=47,letterHeight=27,firstLetter=86,maxWidth=32,letterBase=rest[0].y0;
const letterScale=letterHeight/(rest[0].y1+1-rest[0].y0);
const shapes=[];
{
  const ox=sLeft-(sBody.left-S.x0)*sScale,oy=sTop-(sBody.top-S.y0)*sScale,x=Math.floor(ox),y=Math.floor(oy);
  const w=Math.ceil((S.x1+1-S.x0)*sScale)+2,h=Math.ceil((S.y1+1-S.y0)*sScale)+2;
  shapes.push({name:'S',x,y,w,h,acc:resample(S,sScale,sScale,ox-x,oy-y,w,h)});
}
let cursor=firstLetter;
rest.forEach((part,i)=>{
  if(i)cursor+=Math.round((part.x0-rest[i-1].x1-1)*letterScale);
  const width=part.x1+1-part.x0,sx=Math.min(letterScale,maxWidth/width),w=Math.min(maxWidth,Math.ceil(width*sx));
  const oy=(part.y0-letterBase)*letterScale,h=Math.ceil(oy+(part.y1+1-part.y0)*letterScale)+1;
  shapes.push({name:names[i],x:cursor,y:letterTop,w,h,acc:resample(part,sx,letterScale,0,oy,w,h)});
  cursor+=Math.round(width*sx);
});

// One shared green ramp for every letter: k-means in a luminance-weighted
// RGB space, colours rounded to the SNES 15-bit grid.
const weight=[0.3,0.59,0.11],luma=c=>c[0]*weight[0]+c[1]*weight[1]+c[2]*weight[2];
const opaque=(shape,i)=>shape.acc[i*4+3]>=0.5;
const colorOf=(shape,i)=>[0,1,2].map(c=>shape.acc[i*4+c]/shape.acc[i*4+3]);
const samples=[];
for(const shape of shapes)for(let i=0;i<shape.w*shape.h;i++)if(opaque(shape,i))samples.push(colorOf(shape,i));
function kmeans(points,k){
  points=points.slice().sort((a,b)=>luma(a)-luma(b));
  let centres=Array.from({length:k},(_,i)=>points[Math.floor((i+0.5)*points.length/k)].slice());
  for(let iteration=0;iteration<60;iteration++){
    const sums=centres.map(()=>[0,0,0,0]);
    for(const p of points){
      let best=0,bd=Infinity;
      centres.forEach((c,j)=>{const d=weight.reduce((s,w,n)=>s+w*(p[n]-c[n])**2,0);if(d<bd){bd=d;best=j;}});
      const s=sums[best];s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];s[3]++;
    }
    centres=centres.map((c,j)=>sums[j][3]?sums[j].slice(0,3).map(v=>v/sums[j][3]):c);
  }
  return centres.sort((a,b)=>luma(a)-luma(b)).map(c=>c.map(v=>Math.min(248,Math.round(v/8)*8)));
}
const ramp=kmeans(samples,11);
const nearest=c=>{
  let best=0,bd=Infinity;
  ramp.forEach((r,j)=>{const d=weight.reduce((s,w,n)=>s+w*(c[n]-r[n])**2,0);if(d<bd){bd=d;best=j;}});
  return best;
};
const digits='123456789ab';
const art=shapes.map(shape=>{
  const rows=[];
  for(let y=0;y<shape.h;y++){let row='';for(let x=0;x<shape.w;x++){const i=y*shape.w+x;row+=opaque(shape,i)?digits[nearest(colorOf(shape,i))]:'.';}rows.push(row);}
  // Trim empty margins so the stored origin is the art's true top-left.
  const used=rows.map(r=>/[^.]/.test(r)),top=used.indexOf(true),bottom=used.lastIndexOf(true);
  const left=Math.min(...rows.filter(r=>/[^.]/.test(r)).map(r=>r.search(/[^.]/)));
  const right=Math.max(...rows.filter(r=>/[^.]/.test(r)).map(r=>r.length-1-[...r].reverse().join('').search(/[^.]/)));
  return {name:shape.name,x:shape.x+left,y:shape.y+top,rows:rows.slice(top,bottom+1).map(r=>r.slice(left,right+1))};
});
for(const a of art.slice(1))if(a.rows[0].length>maxWidth)throw Error(`${a.name} is wider than two 16x16 cells`);

const hex=c=>c.map(v=>v.toString(16).padStart(2,'0')).join('');
const logo={
  source:{file:path.split('/').pop(),sha256,width:W,height:H,providedBy:'user',use:'Shrek Trigger title logo'},
  layout:{dialPivot:[62,73],sHeight,letterHeight},ramp:ramp.map(hex),s:art[0],letters:art.slice(1)
};
await mkdir('.local/title',{recursive:true});
await writeFile('.local/title/shrek-logo-source.png',bytes);
await writeFile('content/title-logo.js',`// Derived from the logo image supplied by the user; see source metadata below.
// Pixel art in screen coordinates: '.' is transparent, 1-b index the ramp.
export const titleLogo = ${JSON.stringify(logo,null,1)};
`);
console.log(JSON.stringify({sha256,ramp:logo.ramp,s:{x:art[0].x,y:art[0].y,w:art[0].rows[0].length,h:art[0].rows.length},
  letters:art.slice(1).map(a=>({name:a.name,x:a.x,y:a.y,w:a.rows[0].length,h:a.rows.length}))}));
