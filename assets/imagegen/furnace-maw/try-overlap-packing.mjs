import fs from'node:fs';import path from'node:path';
const d=import.meta.dirname,a=JSON.parse(fs.readFileSync(path.join(d,'draft/preview-raster.json'))),p=Uint8Array.from(a.frames[6],v=>parseInt(v,16)),pts=[];for(let i=0;i<p.length;i++)if(p[i])pts.push(i);
const candidates=[];for(let y=0;y<=80;y++)for(let x=0;x<=48;x++){const indices=pts.filter(i=>i%64>=x&&i%64<x+16&&(i/64|0)>=y&&(i/64|0)<y+16);if(indices.length)candidates.push({x,y,indices});}
const byPixel=Array.from({length:p.length},()=>[]);candidates.forEach((c,i)=>{for(const q of c.indices)byPixel[q].push(i)});
let states=[{mask:new Uint8Array(p.length),count:0,origins:[]}];
for(let depth=0;depth<12;depth++){
 const next=[];for(const s of states){const first=pts.find(i=>!s.mask[i]);if(first===undefined){console.log('found',s.origins);process.exit(0);}
 const choices=byPixel[first].map(i=>({i,gain:candidates[i].indices.reduce((n,q)=>n+!s.mask[q],0)})).sort((a,b)=>b.gain-a.gain).slice(0,16);
 for(const{ i,gain}of choices){const c=candidates[i],mask=s.mask.slice();for(const q of c.indices)mask[q]=1;next.push({mask,count:s.count+gain,origins:[...s.origins,[c.x,c.y]]});}
 }
 const seen=new Set();states=next.sort((a,b)=>b.count-a.count).filter(s=>{const key=Buffer.from(s.mask).toString('base64');if(seen.has(key))return false;seen.add(key);return true;}).slice(0,400);console.log(depth+1,states[0]?.count,pts.length,states.length);
 if(states[0]?.count===pts.length){fs.writeFileSync(path.join(d,'overlap-packing-candidate.json'),JSON.stringify(states[0].origins));console.log('found',states[0].origins);process.exit(0);}
}
