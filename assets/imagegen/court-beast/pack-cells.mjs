import assert from 'node:assert/strict';
import {tile4bpp} from '../../../engine/sprites.js';

// This draft-only pass changes cell boundaries, never indexed source pixels.
// Exact horizontal tile mirrors are the only native-supported reuse transform.
const reverse=Uint8Array.from({length:256},(_,v)=>{v=(v>>1&0x55)|(v&0x55)<<1;v=(v>>2&0x33)|(v&0x33)<<2;return(v>>4)|(v&15)<<4;});
function tileKey(tile){const a=Buffer.from(tile).toString('hex'),b=Buffer.from(Uint8Array.from(tile,v=>reverse[v])).toString('hex');return a<b?a:b;}
function keys(p,origins){const out=new Set();for(const[x,y]of origins)for(let yy=0;yy<16;yy+=8)for(let xx=0;xx<16;xx+=8)out.add(tileKey(tile4bpp(p,64,x+xx,y+yy)));return out;}
function pad(origins){const out=origins.map(p=>p.slice());for(let y=0;y<=48&&out.length<8;y++)for(let x=0;x<=48&&out.length<8;x++)if(!out.some(([xx,yy])=>y<yy+16&&yy<y+16&&x<xx+16&&xx<x+16))out.push([x,y]);assert.equal(out.length,8);return out;}
export function packCourtBeastCells(frames){
  const dictionary=new Set([Buffer.alloc(32).toString('hex')]);
  return frames.map(p=>{
    let best;
    for(let phase=0;phase<16;phase++){
    const bands=[];
    const lastY=phase+Math.floor((48-phase)/16)*16;
    if(p.some((v,i)=>v&&(Math.floor(i/64)<phase||Math.floor(i/64)>=lastY+16)))continue;
    for(let y=phase;y+16<=64;y+=16){
      let min=64,max=-1;for(let yy=y;yy<y+16;yy++)for(let x=0;x<64;x++)if(p[yy*64+x]){min=Math.min(min,x);max=Math.max(max,x);}
      if(max<0)continue;
      const options=[];
      for(let n=Math.ceil((max-min+1)/16);n<=Math.min(4,Math.ceil((max-min+1)/16)+1);n++)for(let x=Math.max(0,max+1-n*16);x<=Math.min(min,64-n*16);x++){
        const origins=Array.from({length:n},(_,i)=>[x+i*16,y]),k=keys(p,origins);
        options.push({n,origins,keys:k,cost:[...k].filter(k=>!dictionary.has(k)).length});
      }
      bands.push(options);
    }
    let states=new Map([[0,{cost:0,origins:[]}]]);
    for(const options of bands){const next=new Map();for(const[used,s]of states)for(const o of options){const n=used+o.n;if(n>8)continue;const cost=s.cost+o.cost;if(!next.has(n)||cost<next.get(n).cost)next.set(n,{cost,origins:[...s.origins,...o.origins]});}states=next;}
    const winner=[...states.entries()].sort((a,b)=>a[1].cost-b[1].cost||a[0]-b[0])[0];
    if(winner){const cost=[...keys(p,winner[1].origins)].filter(k=>!dictionary.has(k)).length;if(!best||cost<best.cost||cost===best.cost&&winner[0]<best.occupied)best={cost,origins:winner[1].origins,occupied:winner[0],phase};}
    }
    assert.ok(best,'Court Beast exceeds eight cells');const origins=pad(best.origins);for(const k of keys(p,origins))dictionary.add(k);
    return{origins,occupied:best.occupied,phase:best.phase};
  });
}
