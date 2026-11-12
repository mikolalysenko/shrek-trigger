import assert from 'node:assert/strict';
import {tile4bpp} from '../../../engine/sprites.js';
const W=64,H=96,N=12,reverse=Uint8Array.from({length:256},(_,v)=>{v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;return(v>>4)|(v&15)<<4;});
const key=t=>{const a=Buffer.from(t).toString('hex'),b=Buffer.from(Uint8Array.from(t,v=>reverse[v])).toString('hex');return a<b?a:b;};
function keys(p,origins){const s=new Set();for(const[x,y]of origins)for(let yy=0;yy<16;yy+=8)for(let xx=0;xx<16;xx+=8)s.add(key(tile4bpp(p,W,x+xx,y+yy)));return s;}
function pad(origins){const out=origins.map(p=>p.slice());for(let y=0;y<=H-16&&out.length<N;y++)for(let x=0;x<=W-16&&out.length<N;x++)if(!out.some(([xx,yy])=>y<yy+16&&yy<y+16&&x<xx+16&&xx<x+16))out.push([x,y]);assert.equal(out.length,N);return out;}
// Source pixels stay fixed. Only the twelve existing16×16 native cell origins
// are selected; neither overlap nor clipping is permitted.
export function packHeadCells(frames){const dictionary=new Set([Buffer.alloc(32).toString('hex')]);return frames.map((p,f)=>{
 let best;for(let phase=0;phase<16;phase++){
  const lastY=phase+Math.floor((H-16-phase)/16)*16;if(p.some((v,i)=>v&&((i/W|0)<phase||(i/W|0)>=lastY+16)))continue;
  const bands=[];for(let y=phase;y+16<=H;y+=16){let min=W,max=-1;for(let yy=y;yy<y+16;yy++)for(let x=0;x<W;x++)if(p[yy*W+x]){min=Math.min(min,x);max=Math.max(max,x);}if(max<0)continue;
   const options=[];for(let n=Math.ceil((max-min+1)/16);n<=Math.min(4,Math.ceil((max-min+1)/16)+1);n++)for(let x=Math.max(0,max+1-n*16);x<=Math.min(min,W-n*16);x++){const origins=Array.from({length:n},(_,i)=>[x+i*16,y]);options.push({n,origins,cost:[...keys(p,origins)].filter(k=>!dictionary.has(k)).length});}bands.push(options);
  }
  let states=new Map([[0,{cost:0,origins:[]}]]);for(const options of bands){const next=new Map();for(const[used,s]of states)for(const o of options){const n=used+o.n;if(n>N)continue;const cost=s.cost+o.cost;if(!next.has(n)||cost<next.get(n).cost)next.set(n,{cost,origins:[...s.origins,...o.origins]});}states=next;}
  const winner=[...states.entries()].sort((a,b)=>a[1].cost-b[1].cost||a[0]-b[0])[0];if(winner){const cost=[...keys(p,winner[1].origins)].filter(k=>!dictionary.has(k)).length;if(!best||cost<best.cost||cost===best.cost&&winner[0]<best.occupied)best={cost,origins:winner[1].origins,occupied:winner[0],phase};}
 }
 assert.ok(best,'Furnace head frame'+f+' exceeds twelve cells');const origins=pad(best.origins);for(const k of keys(p,origins))dictionary.add(k);return{origins,occupied:best.occupied,phase:best.phase};
});}
