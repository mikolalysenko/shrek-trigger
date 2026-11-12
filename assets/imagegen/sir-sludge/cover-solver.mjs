// Diagnostic exact silhouette cover. No source pixels are changed.
// Native16×16 cells may overlap only when their shared source samples agree.
const hexPop=Uint8Array.from({length:16},(_,n)=>n.toString(2).replaceAll('0','').length);
const pop=n=>{let c=0;for(const ch of n.toString(16))c+=hexPop[parseInt(ch,16)];return c;};
const rowBound=n=>{let c=0;for(let x=0;x<64;x++)if(n&(1n<<BigInt(x))){c++;x+=15;}return c;};
export function solveCover(p,{limit=12,maxNodes=200000}={}){
 const initial=Array.from({length:64},(_,y)=>{let n=0n;for(let x=0;x<64;x++)if(p[y*64+x])n|=1n<<BigInt(x);return n;}),memo=new Map();let nodes=0;
 function search(rows,left){if(++nodes>maxNodes)return null;const y=rows.findIndex(r=>r);if(y<0)return[];if(!left)return null;const bounds=rows.map(rowBound);let lb=0;for(let phase=0;phase<16;phase++){let n=0;for(let j=phase;j<64;j+=16)n+=bounds[j];lb=Math.max(lb,n);}if(lb>left)return null;
  const key=rows.map(r=>r.toString(16)).join(',');if((memo.get(key)??-1)>=left)return null;memo.set(key,left);
  let firstX=0;while(!(rows[y]&(1n<<BigInt(firstX))))firstX++;const cy=Math.min(y,48),options=[];
  for(let x=Math.max(0,firstX-15);x<=Math.min(firstX,48);x++){const mask=65535n<<BigInt(x),after=rows.slice();let area=0;for(let yy=cy;yy<cy+16;yy++){const covered=after[yy]&mask;area+=pop(covered);after[yy]&=~mask;}const signature=after.map(r=>r.toString(16)).join(',');if(!options.some(o=>o.signature===signature))options.push({x,after,area,signature});}
  options.sort((a,b)=>b.area-a.area||b.x-a.x);for(const o of options){const result=search(o.after,left-1);if(result)return[[o.x,cy],...result];}return null;
 }
 const origins=search(initial,limit);return{origins,nodes,memo:memo.size};
}
