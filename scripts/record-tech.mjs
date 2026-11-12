// Review tool: cast a technique in native combat and record it as an MP4 with
// sound (the in-house emulator's picture and audio, muxed by ffmpeg).
//   node scripts/record-tech.mjs <id> [--out=dir] [--span=frames] [--fixture=swamp-pack] [--revive] [--fallen=<character id>]
// --revive starts with a fallen ally (Love & Life, True Kiss, Nine Lives).
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {build,bedroom} from '../tests/helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from '../tests/battle-controller.mjs';
import {u16} from '../engine/rom.js';
const args=process.argv.slice(2),opt=n=>args.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3);
const ids=args.filter(a=>!a.startsWith('--')).map(Number),out=opt('out')??'.local/qa/tech-clips',fixture=opt('fixture')??'swamp-pack',revive=args.includes('--revive');
const parties=new Map();
for(const[list,party]of[[[57,58,59],[0,1,2]],[[60,61,62],[0,2,1]],[[63,64,65],[0,3,1]],[[66,67,68],[0,4,1]],[[69,70,71],[0,5,1]],[[72,73,74],[1,2,0]],[[75,76,77],[1,3,0]],[[78,79,81],[1,4,0]],[[80,82,83],[1,5,0]],[[84,85,86],[2,3,0]],[[87,88,89],[2,5,0]],[[90,91,93],[3,4,0]],[[92,94,95],[3,5,0]],[[96,97,98],[4,5,0]],[[99,100,101],[2,4,0]],[[102],[0,1,2]],[[103],[0,1,3]],[[104],[0,1,4]],[[105],[0,1,5]],[[106],[0,2,3]],[[107],[0,2,4]],[[108],[0,2,5]],[[109],[0,3,4]],[[110],[0,3,5]],[[111],[0,4,5]],[[112],[1,2,6]],[[113],[0,2,6]],[[114],[0,3,5]],[[115],[0,1,5]],[[116],[0,4,6]]])for(const id of list)parties.set(id,party);
// The Button-gated triples need their Button equipped and the technique learned.
const buttons=new Map([[112,174],[113,175],[114,176],[115,177],[116,178]]);
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json')),techs=JSON.parse(await readFile('content/techs.json'));
await mkdir(out,{recursive:true});
const RATE=32040,N=534,W=256,H=224;
for(const id of ids){
 const owner=Math.floor((id-1)/8),party=parties.get(id)??[owner,...[0,1,2,3].filter(x=>x!==owner).slice(0,2)];
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
 d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);
 if(buttons.has(id)){for(let slot=0;slot<3;slot++)s.ram[0x2600+party[slot]*80+0x2a]=buttons.get(id);runFrames(s,3,512);runFrames(s,120);runFrames(s,3,32);runFrames(s,180);s.ram[0x284d+id-102]|=0x80;}
 // --fallen=<character id> starts with that party member down (for a reviver who is not Shrek).
 if(opt('fallen')!==undefined){const c=+opt('fallen');s.ram[0x2603+80*c]=0;s.ram[0x2604+80*c]=0;}
 d.startCombat({fixture,loadout:revive?'revival':'current',unlockTechs:true});runFrames(s,400);
 for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
 try{await chooseNativeTech(io,b.rom,0,id);}catch(e){console.log(id,techs[id-1].name,'FAILED',e.message);d.dispose();h.dispose();continue;}
 const span=+(opt('span')??(id>101?660:id>56?500:420)),video=Buffer.alloc(span*W*H*4),pcm=new Int16Array(span*N*2),l=new Float32Array(N),r=new Float32Array(N),px=new Uint8Array(512*480*4);
 // Drain the audio the menu taps left queued so the clip starts clean.
 for(let f=0;f<span;f++){
  s.runFrame();s.setSamples(l,r,N);s.setPixels(px);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=((y*2+16)*512+x*2)*4,t=(f*W*H+y*W+x)*4;video[t]=px[o];video[t+1]=px[o+1];video[t+2]=px[o+2];video[t+3]=255;}
  for(let i=0;i<N;i++){pcm[(f*N+i)*2]=Math.max(-32768,Math.min(32767,Math.round(l[i]*32767)));pcm[(f*N+i)*2+1]=Math.max(-32768,Math.min(32767,Math.round(r[i]*32767)));}
 }
 const base=`${out}/tech-${String(id).padStart(3,'0')}`,wav=Buffer.alloc(44+pcm.byteLength);
 wav.write('RIFF',0);wav.writeUInt32LE(36+pcm.byteLength,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(RATE,24);wav.writeUInt32LE(RATE*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.byteLength,40);Buffer.from(pcm.buffer).copy(wav,44);
 await writeFile(base+'.rgba',video);await writeFile(base+'.wav',wav);
 const ff=spawnSync('ffmpeg',['-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r','60','-i',base+'.rgba','-i',base+'.wav','-vf','scale=512:448:flags=neighbor','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',base+'.mp4']);
 await rm(base+'.rgba');await rm(base+'.wav');
 let peak=0;for(const v of pcm)peak=Math.max(peak,Math.abs(v));
 console.log(id,techs[id-1].name,ff.status===0?'recorded':'FFMPEG FAILED '+ff.stderr,base+'.mp4','audio peak',(peak/32767).toFixed(2));d.dispose();h.dispose();
}
