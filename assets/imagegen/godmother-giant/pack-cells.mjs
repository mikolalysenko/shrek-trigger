import assert from 'node:assert/strict';
import {tile4bpp} from '../../../engine/sprites.js';

// This draft-only pass changes cell boundaries, never indexed source pixels.
// Exact horizontal tile mirrors are the only native-supported reuse transform.
const reverse=Uint8Array.from({length:256},(_,v)=>{v=(v>>1&0x55)|(v&0x55)<<1;v=(v>>2&0x33)|(v&0x33)<<2;return(v>>4)|(v&15)<<4;});
function tileKey(tile){const a=Buffer.from(tile).toString('hex'),b=Buffer.from(Uint8Array.from(tile,v=>reverse[v])).toString('hex');return a<b?a:b;}
function keys(p,origins,width){const out=new Set();for(const[x,y]of origins)for(let yy=0;yy<16;yy+=8)for(let xx=0;xx<16;xx+=8)out.add(tileKey(tile4bpp(p,width,x+xx,y+yy)));return out;}
function pad(origins,limit,width,height){const out=origins.map(p=>p.slice());for(let y=0;y<=height-16&&out.length<limit;y++)for(let x=0;x<=width-16&&out.length<limit;x++)if(!out.some(([xx,yy])=>y<yy+16&&yy<y+16&&x<xx+16&&xx<x+16))out.push([x,y]);assert.equal(out.length,limit);return out;}
export function packMachineCells(frames,{diagnosticLimit=4,width=64,height=64,dictionary=new Set([Buffer.alloc(32).toString('hex')])}={}){
  return frames.map((p,index)=>{
    let best;
    // Try horizontal and vertical strips. Only cell boundaries move: the
    // source image is never rotated, transposed, redrawn or clipped.
    for(const transposed of [false,true]){
    assert.equal(p.length,width*height);const qw=transposed?height:width,qh=transposed?width:height,q=transposed?Uint8Array.from(p,(_,i)=>p[(i%qw)*width+Math.floor(i/qw)]):p;
    for(let phase=0;phase<16;phase++){
    const bands=[];
    const lastY=phase+Math.floor((qh-16-phase)/16)*16;
    if(q.some((v,i)=>v&&(Math.floor(i/qw)<phase||Math.floor(i/qw)>=lastY+16)))continue;
    for(let y=phase;y+16<=qh;y+=16){
      let min=qw,max=-1;for(let yy=y;yy<y+16;yy++)for(let x=0;x<qw;x++)if(q[yy*qw+x]){min=Math.min(min,x);max=Math.max(max,x);}
      if(max<0)continue;
      const options=[];
      for(let n=Math.ceil((max-min+1)/16);n<=Math.min(diagnosticLimit,Math.ceil((max-min+1)/16)+1);n++)for(let x=Math.max(0,max+1-n*16);x<=Math.min(min,qw-n*16);x++){
        const origins=Array.from({length:n},(_,i)=>[x+i*16,y]),k=keys(p,transposed?origins.map(([x,y])=>[y,x]):origins,width);
        options.push({n,origins,keys:k,cost:[...k].filter(k=>!dictionary.has(k)).length});
      }
      bands.push(options);
    }
    let states=new Map([[0,{cost:0,origins:[]}]]);
    for(const options of bands){const next=new Map();for(const[used,s]of states)for(const o of options){const n=used+o.n;if(n>diagnosticLimit)continue;const cost=s.cost+o.cost;if(!next.has(n)||cost<next.get(n).cost)next.set(n,{cost,origins:[...s.origins,...o.origins]});}states=next;}
    const winner=[...states.entries()].sort((a,b)=>a[1].cost-b[1].cost||a[0]-b[0])[0];
    if(winner){const origins=transposed?winner[1].origins.map(([x,y])=>[y,x]):winner[1].origins,cost=[...keys(p,origins,width)].filter(k=>!dictionary.has(k)).length;if(!best||cost<best.cost||cost===best.cost&&winner[0]<best.occupied)best={cost,origins,occupied:winner[0],phase,stripAxis:transposed?'x':'y'};}
    }
    }
    assert.ok(best,'Machine exceeds '+diagnosticLimit+' cells at native frame '+index);const origins=pad(best.origins,diagnosticLimit,width,height);for(const k of keys(p,origins,width))dictionary.add(k);
    return{origins,occupied:best.occupied,phase:best.phase,stripAxis:best.stripAxis};
  });
}
