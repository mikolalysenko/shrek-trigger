import{readFile,writeFile,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{readMidi}from'../engine/midi.js';
import{compileMusic}from'../engine/music-sequence.js';
const path=process.argv[2];if(!path)throw Error('Usage: node scripts/import-all-star.mjs /path/to/user-provided.mid');
const bytes=await readFile(path),midi=readMidi(bytes),sha256=createHash('sha256').update(bytes).digest('hex');
if(midi.tracks.length!==12||midi.ppq!==192)throw Error('This arranger expects the supplied twelve-track All Star MIDI');
const q=t=>Math.round(t/midi.ppq*16)*3,ticks=Math.ceil(q(midi.ticks)/192)*192;
function mono(tracks,{select='top',transpose=0,ceiling=107,predicate=()=>true,instrument}={}){
  const groups=new Map();for(const ti of tracks)for(const n of midi.tracks[ti].notes.filter(predicate)){const at=q(n.at);if(!groups.has(at))groups.set(at,[]);groups.get(at).push(n);}
  const events=[...groups].sort((a,b)=>a[0]-b[0]),out=[];
  for(let i=0;i<events.length;i++){
    const[at,notes]=events[i];notes.sort((a,b)=>a.pitch-b.pitch);const n=notes[select==='low'?0:select==='alternate'?i%notes.length:notes.length-1];
    const end=Math.min(ticks,q(n.at+n.duration),events[i+1]?.[0]??ticks),length=Math.max(3,end-at);
    if(at+length>ticks)continue;let pitch=n.pitch+transpose;while(pitch>ceiling)pitch-=12;
    const v=[at,length,pitch];if(instrument){const[program,note]=instrument(n);v.push(program);v[2]=note;}out.push(v);
  }return out;
}
const score={title:'All Star · Swamp arrangement',source:{file:'SMASH MOUTH.All star.mid',sha256,providedBy:'user',composition:'All Star — Smash Mouth',adaptation:'Six-voice native SNES arrangement using Chrono Trigger instruments'},bpm:108,ticks,channels:[
 {name:'Wind flute melody',instrument:23,volume:102,pan:64,notes:mono([1],{transpose:12})},
 {name:'Harp countermelody',instrument:24,volume:72,pan:40,notes:mono([3,5,8,9],{transpose:12,ceiling:84})},
 {name:'Guitar rhythm',instrument:17,volume:65,pan:36,notes:mono([2],{select:'alternate',transpose:12})},
 {name:'Electric bass',instrument:25,volume:95,pan:64,notes:mono([4],{select:'low'})},
 {name:'Kick and snare',instrument:5,volume:78,pan:64,notes:mono([6,7],{predicate:n=>[35,36,38,40].includes(n.pitch),instrument:n=>[n.pitch===35||n.pitch===36?5:37,n.pitch===35||n.pitch===36?72:75]})},
 {name:'Hi-hat',instrument:7,volume:45,pan:96,notes:mono([6,7],{predicate:n=>[42,44,46].includes(n.pitch),instrument:()=>[7,76]})}
]};
// The MIDI starts with three silent beats before a one-beat pickup. Join
// that pickup to the final chord's first three beats for a complete 4/4
// loop. Every note onset is retained; only the four final sustained notes
// are shortened at the join. No compiler or sound-driver change is needed.
const pickup=144,end=ticks-48;
for(const channel of score.channels)channel.notes=channel.notes.map(([at,length,pitch,...rest])=>{
  if(at<pickup||at>=end)throw Error('The supplied MIDI pickup or ending has changed');
  return[at-pickup,Math.min(length,end-at),pitch,...rest];
});
score.ticks=end-pickup;score.source.originalBeats=ticks/48;
score.source.loop={pickupTicks:pickup,sourceEndTick:end,beats:score.ticks/48};
const compiled=compileMusic(score);await mkdir('.local/music',{recursive:true});await writeFile('.local/music/all-star-source.mid',bytes);
await writeFile('content/music-all-star.js','// Derived from the MIDI supplied by the user; see source metadata below.\nexport const allStar = '+JSON.stringify(score)+';\n');
console.log(JSON.stringify({sha256,beats:score.ticks/48,sourceBeats:ticks/48,voices:compiled.voices,bytes:compiled.bytes,instruments:compiled.instruments,notes:compiled.notes}));
