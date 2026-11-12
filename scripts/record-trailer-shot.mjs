// Teaser trailer footage: jump to a devtools area and record it.
//   node scripts/record-trailer-shot.mjs <area index>[:party a,b,c] ... [--frames=720] [--warm=200] [--walk] [--out=.local/trailer/shots]
import {mkdir} from 'node:fs/promises';
import {build,bedroom} from '../tests/helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
import {record} from './trailer-lib.mjs';
const args=process.argv.slice(2),opt=(n,d)=>args.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3)??d;
const out=opt('out','.local/trailer/shots'),frames=+opt('frames',720),warm=+opt('warm',200),walk=args.includes('--walk');
await mkdir(out,{recursive:true});
const b=await build(),specs=JSON.parse(await (await import('node:fs/promises')).readFile('content/hooks.json'));
const dirs=[128,32,64,16];
for(const a of args.filter(a=>!a.startsWith('--'))){
  const[i,p]=a.split(':'),area=areas[+i],s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  try{
    d.jump({...area,...(p?{party:p.split(',').map(Number)}:{})});runFrames(s,warm);
    // A taps advance dialogue; with --walk the leader also wanders.
    await record(s,`${out}/area-${String(i).padStart(3,'0')}`,frames,f=>(f%70<3?256:0)|(walk&&f%70>=10?dirs[Math.floor(f/70)%4]:0));
    console.log(i,area.name,'recorded');
  }catch(e){console.log(i,area.name,'FAILED',e.message);}
  d.dispose();h.dispose();
}
