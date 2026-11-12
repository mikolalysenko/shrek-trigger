// Exact source-pixel packing into the existing twelve native 16×16 cells.
import{tile4bpp}from'../../../engine/sprites.js';
const width=64,height=64;
const rev=b=>{b=(b&0x55)<<1|(b>>1&0x55);b=(b&0x33)<<2|(b>>2&0x33);return(b&15)<<4|b>>4;};
const tileKey=t=>{const a=Buffer.from(t).toString('hex'),b=Buffer.from(Uint8Array.from(t,v=>rev(v))).toString('hex');return a<b?a:b;};
export function placeCells(frames,explicit={}){
 const seen=new Set([tileKey(new Uint8Array(32))]),origins=[],summary=[];
 for(const [frame,p] of frames.entries()){
  let best=null;
  if(explicit[frame]){const selected=explicit[frame],keys=new Set();for(const[x,y]of selected)for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)keys.add(tileKey(tile4bpp(p,width,x+xx*8,y+yy*8)));const fresh=[...keys].filter(k=>!seen.has(k));best={selected,keys,fresh,score:-1,phase:null,occupied:selected.length};}
  else
  for(let py=0;py<16;py++){
   if(p.some((v,i)=>v&&((i/width|0)<py||(i/width|0)>=py+Math.floor((height-py)/16)*16)))continue;
   let states=[{selected:[],grid:[],score:0,phases:[]}];
   for(let y=py;y+16<=height;y+=16){
    const options=[];
    for(let px=0;px<16;px++){
     const grid=[],occupied=[],covered=new Uint8Array(width);
     for(let x=px;x+16<=width;x+=16){let opaque=0;for(let xx=x;xx<x+16;xx++){covered[xx]=1;for(let yy=y;yy<y+16;yy++)opaque+=!!p[yy*width+xx];}const cell=[x,y];grid.push(cell);if(opaque)occupied.push(cell);}
     let missing=false;for(let yy=y;yy<y+16;yy++)for(let x=0;x<width;x++)if(p[yy*width+x]&&!covered[x])missing=true;if(missing)continue;
     const keys=new Set();for(const[x,cy]of occupied)for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)keys.add(tileKey(tile4bpp(p,width,x+xx*8,cy+yy*8)));
     const fresh=[...keys].filter(k=>!seen.has(k));options.push({selected:occupied,grid,score:fresh.length*10000+occupied.length*100+px,phase:[px,y]});
    }
    const next=new Map();for(const a of states)for(const b of options){const n=a.selected.length+b.selected.length;if(n>12)continue;const c={selected:[...a.selected,...b.selected],grid:[...a.grid,...b.grid],score:a.score+b.score,phases:[...a.phases,b.phase]};if(!next.has(n)||c.score<next.get(n).score)next.set(n,c);}states=[...next.values()];
   }
   for(const state of states){const selected=state.selected.slice(),occupied=selected.length;for(const cell of state.grid)if(selected.length<12&&!selected.includes(cell))selected.push(cell);if(selected.length!==12)continue;
    const keys=new Set();for(const[x,y]of selected)for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)keys.add(tileKey(tile4bpp(p,width,x+xx*8,y+yy*8)));
    const fresh=[...keys].filter(k=>!seen.has(k)),score=fresh.length*10000+occupied*100+py;
    if(!best||score<best.score)best={selected,keys,fresh,score,phase:state.phases,occupied};
   }
  }
  if(!best)throw Error('No twelve-cell grid covers complete source pixels at native frame '+frame);
  for(const k of best.keys)seen.add(k);origins.push(best.selected);summary.push({frame,phase:best.phase,occupiedCells:best.occupied,newTiles:best.fresh.length,cumulativeTiles:seen.size});
 }
 return{origins,summary,tiles:seen.size};
}
