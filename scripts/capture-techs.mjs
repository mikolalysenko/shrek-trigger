// Review tool: cast each requested technique in native combat and write a
// contact sheet of its animation.
//   node scripts/capture-techs.mjs 1-116 [--fixture=swamp-pack] [--out=dir]
//     [--rows=4] [--span=frames] [--from=frame] [--tag=suffix]
// Sheets sample every fourth frame, so they cannot show a 30 Hz blank; use
// scripts/scan-tech-blanking.mjs for that. Revival techniques need a fallen
// ally and are skipped with a message.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {build,bedroom} from '../tests/helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from '../tests/battle-controller.mjs';
import {u16} from '../engine/rom.js';
const args=process.argv.slice(2);const fixture=args.find(a=>a.startsWith('--fixture='))?.slice(10)??'swamp-pack';const out=args.find(a=>a.startsWith('--out='))?.slice(6)??'.local/qa/tech-sheets';
const ids=args.filter(a=>!a.startsWith('--')).flatMap(a=>{const[m,n]=a.split('-').map(Number);return n?Array.from({length:n-m+1},(_,i)=>m+i):[m];});
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json')),techs=JSON.parse(await readFile('content/techs.json'));
const parties=new Map();
for(const[list,party]of[
 [[57,58,59],[0,1,2]],[[60,61,62],[0,2,1]],[[63,64,65],[0,3,1]],[[66,67,68],[0,4,1]],[[69,70,71],[0,5,1]],
 [[72,73,74],[1,2,0]],[[75,76,77],[1,3,0]],[[78,79,81],[1,4,0]],[[80,82,83],[1,5,0]],
 [[84,85,86],[2,3,0]],[[87,88,89],[2,5,0]],[[90,91,93],[3,4,0]],[[92,94,95],[3,5,0]],[[96,97,98],[4,5,0]],[[99,100,101],[2,4,0]],
 [[102],[0,1,2]],[[103],[0,1,3]],[[104],[0,1,4]],[[105],[0,1,5]],[[106],[0,2,3]],[[107],[0,2,4]],[[108],[0,2,5]],
 [[109],[0,3,4]],[[110],[0,3,5]],[[111],[0,4,5]],[[112],[1,2,6]],[[113],[0,2,6]],[[114],[0,3,5]],[[115],[0,1,5]],[[116],[0,4,6]]
])for(const id of list)parties.set(id,party);
const buttons=new Map([[112,174],[113,175],[114,176],[115,177],[116,178]]);
await mkdir(out,{recursive:true});
for(const id of ids){
 try{
  const owner=Math.floor((id-1)/8),party=parties.get(id)??[owner,...[0,1,2,3].filter(x=>x!==owner).slice(0,2)];
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);
  if(buttons.has(id)){for(let slot=0;slot<3;slot++)s.ram[0x2600+party[slot]*80+0x2a]=buttons.get(id);runFrames(s,3,512);runFrames(s,120);runFrames(s,3,32);runFrames(s,180);s.ram[0x284d+id-102]|=0x80;}
  d.startCombat({fixture,unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  let cast=-1;h.on('battle.tech',x=>{if(cast<0&&(x.techId===id||id===24||id===39))cast=0;});
  await chooseNativeTech(io,b.rom,0,id);
  const frames=[];const grab=()=>{const px=new Uint8Array(512*480*4);s.setPixels(px);const small=new Uint8Array(256*224*4);for(let y=0;y<224;y++)for(let x=0;x<256;x++){const o=((y*2+16)*512+x*2)*4;small.set(px.subarray(o,o+4),(y*256+x)*4);}return small;};
  const span=+(args.find(a=>a.startsWith('--span='))?.slice(7)??(id>101?600:id>56?440:300));for(let f=0;f<2400&&cast<span;f++){s.runFrame();if(cast>=0){if(cast%4===0)frames.push(grab());cast++;}}
  if(!frames.length)throw Error('never cast');
  // trim trailing frames identical-ish to the last one
  const diff=(a,z)=>{let n=0;for(let i=0;i<a.length;i+=16)if(a[i]!==z[i]||a[i+1]!==z[i+1])n++;return n;};
  let last=frames.length-1;
  const cols=5,rows=+(args.find(a=>a.startsWith('--rows='))?.slice(7)??4),n=cols*rows,png=new PNG({width:256*cols,height:224*rows});
  for(let i=0;i<n;i++){const from=+(args.find(a=>a.startsWith('--from='))?.slice(7)??0)/4,src=frames[Math.min(last,Math.round(from+i*(last-from)/(n-1)))],cx=i%cols,cy=Math.floor(i/cols);for(let y=0;y<224;y++)png.data.set(src.subarray(y*1024,y*1024+1024),((cy*224+y)*256*cols+cx*256)*4);}
  await writeFile(`${out}/tech-${String(id).padStart(3,'0')}${args.find(a=>a.startsWith('--tag='))?.slice(6)??''}.png`,PNG.sync.write(png));
  const fatal=d.diagnostics().fatal;console.log(id,techs[id-1].name,'ok frames',last*4,fatal?'FATAL '+JSON.stringify(fatal):'');d.dispose();h.dispose();
 }catch(e){console.log(id,techs[id-1]?.name,'FAILED',e.message);}
}
