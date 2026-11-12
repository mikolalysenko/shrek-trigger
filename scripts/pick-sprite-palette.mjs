import {readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';

// Picks a twelve-color native palette from generated source sheets: a
// deterministic k-means over their fully opaque pixels (farthest-point
// seeding from the darkest color, Lloyd passes in Oklab), snapped to SNES
// 15-bit and sorted darkest first, as native palettes expect. It measures
// generated pixels and prints the result for an import-spec; it draws nothing.
// With --clusters N it lists N clusters (and their pixel counts) to choose
// twelve from by role.
//   node scripts/pick-sprite-palette.mjs [--clusters N] assets/imagegen/wolf/source-base-v1.png [...]
const args=process.argv.slice(2),at=args.indexOf('--clusters'),K=at<0?12:+args.splice(at,2)[1],files=args;
if(!files.length||!Number.isInteger(K)||K<2)throw Error('Usage: pick-sprite-palette.mjs [--clusters N] source.png [...]');
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const lab=([r,g,b])=>{r=linear(r);g=linear(g);b=linear(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];};
// Histogram at SNES precision keeps the clustering exact and fast.
const counts=new Map();
for(const file of files){const im=PNG.sync.read(await readFile(file));for(let p=0;p<im.data.length;p+=4)if(im.data[p+3]>=250){const k=(im.data[p]>>3)<<10|(im.data[p+1]>>3)<<5|im.data[p+2]>>3;counts.set(k,(counts.get(k)??0)+1);}}
const snap=k=>[k>>10&31,k>>5&31,k&31].map(v=>v<<3|v>>2);
const samples=[...counts].sort((a,b)=>a[0]-b[0]).map(([k,n])=>({rgb:snap(k),lab:lab(snap(k)),n}));
const d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
let centers=[samples.reduce((a,b)=>b.lab[0]<a.lab[0]?b:a).lab];
while(centers.length<K){let best=null,score=-1;for(const s of samples){const v=Math.min(...centers.map(c=>d2(c,s.lab)))*Math.sqrt(s.n);if(v>score){score=v;best=s;}}centers.push(best.lab);}
let members;
for(let pass=0;pass<40;pass++){
  members=centers.map(()=>[]);
  for(const s of samples){let k=0,best=Infinity;centers.forEach((c,i)=>{const v=d2(c,s.lab);if(v<best){best=v;k=i;}});members[k].push(s);}
  centers=centers.map((c,i)=>{const m=members[i],n=m.reduce((t,s)=>t+s.n,0);return n?[0,1,2].map(j=>m.reduce((t,s)=>t+s.lab[j]*s.n,0)/n):c;});
}
// Each palette entry is its cluster's weighted mean color, snapped to 15-bit.
const palette=members.map(m=>{const n=m.reduce((t,s)=>t+s.n,0);return{n,rgb:[0,1,2].map(j=>{const v=Math.round(m.reduce((t,s)=>t+s.rgb[j]*s.n,0)/n/255*31);return v<<3|v>>2;})};})
  .sort((a,b)=>lab(a.rgb)[0]-lab(b.rgb)[0]);
console.log(JSON.stringify(palette.map(p=>p.rgb.map(v=>v.toString(16).padStart(2,'0')).join(''))));
console.error(palette.map(p=>p.rgb.map(v=>v.toString(16).padStart(2,'0')).join('')+' '+p.n).join('\n'));
