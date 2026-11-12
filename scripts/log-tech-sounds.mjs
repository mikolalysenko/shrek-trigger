// Review tool: cast each requested technique in native combat and log every
// command that reaches the sound driver (C7:0140, after the technique sound
// swaps: $1E00 = command, $1E01 = sound id, $1E02 = pan) as frames after the
// cast starts, and the largest screen-shake offset (pixels) it sets off.
//   node scripts/log-tech-sounds.mjs 1-116 [--fixture=swamp-pack] [--out=file.json]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build,bedroom} from '../tests/helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from '../tests/battle-controller.mjs';
import {u16} from '../engine/rom.js';
const args=process.argv.slice(2);const fixture=args.find(a=>a.startsWith('--fixture='))?.slice(10)??'swamp-pack';const out=args.find(a=>a.startsWith('--out='))?.slice(6)??'.local/qa/tech-sounds.json',log={};
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
for(const id of ids){
 try{
  const owner=Math.floor((id-1)/8),party=parties.get(id)??[owner,...[0,1,2,3].filter(x=>x!==owner).slice(0,2)];
  const s=await bedroom(b.rom),h=installHooks(s,[...specs,{name:'sound.command',address:0xc70140,expected:[...b.rom.slice(0x70140,0x70144)]}]),d=createDevTools(s,h);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);
  if(buttons.has(id)){for(let slot=0;slot<3;slot++)s.ram[0x2600+party[slot]*80+0x2a]=buttons.get(id);runFrames(s,3,512);runFrames(s,120);runFrames(s,3,32);runFrames(s,180);s.ram[0x284d+id-102]|=0x80;}
  d.startCombat({fixture,unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  let cast=-1;h.on('battle.tech',x=>{if(cast<0&&(x.techId===id||id===24||id===39))cast=0;});
  await chooseNativeTech(io,b.rom,0,id);
  let shake=0,shaken=0;const cues=[];h.on('sound.command',()=>{if(cast>=0)cues.push([cast,s.ram[0x1e00],s.ram[0x1e01],s.ram[0x1e02]]);});
  const span=+(args.find(a=>a.startsWith('--span='))?.slice(7)??(id>101?600:id>56?440:300));for(let f=0;f<2400&&cast<span;f++){s.runFrame();if(cast>=0){cast++;for(let p=0xcca4;p<0xccb0;p+=2){const v=s.ram[p]|s.ram[p+1]<<8;shake=Math.max(shake,Math.abs(v>32767?v-65536:v));if(v)shaken++;}}}
  if(cast<0)throw Error('never cast');
  log[id]={name:techs[id-1].name,source:techs[id-1].source,cues,shake};
  const fatal=d.diagnostics().fatal;console.log(id,techs[id-1].name,cues.map(c=>c[0]+':'+c.slice(1).map(v=>v.toString(16)).join('.')).join(' '),'shake',shake,fatal?'FATAL '+JSON.stringify(fatal):'');d.dispose();h.dispose();
 }catch(e){console.log(id,techs[id-1]?.name,'FAILED',e.message);}
}
await writeFile(out,JSON.stringify(log,null,1)+'\n');
