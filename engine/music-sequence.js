import {put16} from './rom.js';

// Chrono Trigger's AKAO4 bytecode. A quarter note is 48 driver ticks. Each
// voice is monophonic; ties carry long notes without re-keying the DSP voice.
// The song stays below 2F00 so it cannot overwrite the resident SFX library.
export const musicDurations=[192,96,64,72,48,32,36,24,16,12,8,6,4,3];
const durationOrder=musicDurations.map((ticks,id)=>({ticks,id})).sort((a,b)=>b.ticks-a.ticks);
function durationBytes(pitch,ticks){
  if(!Number.isInteger(ticks)||ticks<0||ticks%3)throw Error('Music timing must use multiples of three SPC ticks');
  const out=[];let first=true;
  while(ticks){const d=durationOrder.find(d=>d.ticks<=ticks&&(ticks-d.ticks)%3===0);if(!d)throw Error('Unrepresentable note duration');out.push((first?pitch:pitch===13?13:12)*14+d.id);ticks-=d.ticks;first=false;}
  return out;
}
function packBars(bars,depth=0){
  const out=[],keys=bars.map(b=>b.join(','));
  for(let i=0;i<bars.length;){let best=null;
    if(depth<3)for(let span=1;span<=16&&i+span*2<=bars.length;span++){
      let count=1;while(count<256&&i+(count+1)*span<=bars.length&&Array.from({length:span},(_,j)=>keys[i+j]===keys[i+count*span+j]).every(Boolean))count++;
      if(count<2)continue;const size=bars.slice(i,i+span).reduce((s,b)=>s+b.length,0),gain=size*(count-1)-3;
      if(gain>0&&(!best||gain>best.gain))best={span,count,gain};
    }
    if(best){out.push(0xe2,best.count-1,...packBars(bars.slice(i,i+best.span),depth+1),0xe3);i+=best.span*best.count;}
    else{out.push(...bars[i]);i++;}
  }return out;
}
// Song forms written over a stock song keep its native shape: a pickup and
// introduction before the loop point, an optional finale reached through the
// driver's conditional jump (FA, armed by sound command $88) that ends with EB,
// or no loop at all for a one-shot cue that ends with EB, the stock
// instrument-slot order (so the song's own percussion-kit table stays valid),
// native kit voices (FB), per-note volume accents, per-sample envelope and
// vibrato commands, and any duration the native table can express. Octave,
// sample and volume carry across bars and are re-established only where
// control can enter: the voice start, the loop point and the finale. A known
// octave moves by one with the one-byte D7/D8. Notes may not cross those
// entry points.
const formCommands={0xd9:1,0xc5:2,0xc7:2,0xc9:3,0xca:0,0xcd:2,0xdd:1,0xde:1,0xdf:1,0xe0:1,0xe1:0,0xe4:0,0xe5:0,0xe6:0,0xe7:0};
const splits=[[]];
function durationPieces(ticks){
  if(!Number.isInteger(ticks)||ticks<=0||ticks>0xffff)throw Error('Unrepresentable note duration');
  for(let t=splits.length;t<=ticks;t++){let best=null;for(const d of musicDurations)if(d<=t&&splits[t-d]&&(!best||splits[t-d].length+1<best.length))best=[d,...splits[t-d]];splits.push(best);}
  if(!splits[ticks])throw Error('Unrepresentable note duration: '+ticks+' ticks');
  return[...splits[ticks]].sort((a,b)=>b-a);
}
const pieceBytes=(code,ticks)=>durationPieces(ticks).map((d,i)=>(i?(code===13?13:12):code)*14+musicDurations.indexOf(d));
const byte=n=>Number.isInteger(n)&&n>=0&&n<=255,seven=n=>Number.isInteger(n)&&n>=0&&n<=127;
function compileForm(score){
  const {tempo,instruments,pickup=0,loop=0,ticks,branch=null,echo={},once=false}=score,channels=score.channels??[];
  if(!channels.length||channels.length>8)throw Error('Music needs one to eight voices');
  // A one-shot cue (like the stock title cue) plays through and ends with EB.
  if(typeof once!=='boolean'||once&&(loop||branch))throw Error('A one-shot cue has no loop point or finale');
  if(!Number.isInteger(tempo)||tempo<1||tempo>255)throw Error('Music tempo outside native range');
  if(!Array.isArray(instruments)||!instruments.length||instruments.length>16||new Set(instruments).size!==instruments.length||instruments.some(i=>!Number.isInteger(i)||i<1||i>62))throw Error('Music needs one to sixteen distinct native instrument slots');
  const echoVolume=echo.volume??18,echoFeedback=echo.feedback??48,echoFilter=echo.filter??0;
  if(![echoVolume,echoFeedback,echoFilter].every(byte))throw Error('Invalid native echo settings');
  if(!Number.isInteger(pickup)||pickup<0||pickup>=192||!Number.isInteger(ticks)||ticks<=pickup||(ticks-pickup)%192)throw Error('Music needs a pickup and complete 4/4 bars');
  const grid=(start,end,origin)=>{const out=[start];for(let t=origin;t<end;t+=192)if(t>start)out.push(t);out.push(end);return[...new Set(out)];};
  const main=grid(0,ticks,pickup),onGrid=t=>main.includes(t);
  if(!onGrid(loop)||loop>=ticks)throw Error('Music loop point must start a bar');
  if(branch&&(!onGrid(branch.at)||branch.at<loop||branch.at>=ticks||!byte(branch.value)||!Number.isInteger(branch.ticks)||branch.ticks<=0||branch.ticks%192))throw Error('Music finale must start a bar inside the loop and last complete bars');
  // Sections: [start, end, entry point, timeline]. Control enters a section
  // with unknown state only at an entry point; otherwise it falls through.
  const sections=[[0,loop,true,'main'],[loop,branch?.at??ticks,true,'main'],...(branch?[[branch.at,ticks,false,'main'],[0,branch.ticks,true,'branch']]:[])];
  const tracks=[];
  for(const[voice,c]of channels.entries()){
    const label='voice '+voice+(c.name?' ('+c.name+')':''),perc=!!c.percussion,volume=c.volume??90;
    if(![volume,c.pan??64,c.expression??100].every(seven))throw Error('Music volume, pan and expression must be native seven-bit values in '+label);
    if(!perc&&!instruments.includes(c.instrument))throw Error('Music instrument outside the slot table in '+label);
    const lines={main:[...(c.notes??[])].sort((a,b)=>a[0]-b[0]),branch:[...(c.branch??[])].sort((a,b)=>a[0]-b[0])};
    const cues={main:[...(c.events??[])],branch:[...(c.branchEvents??[])]};
    if(!branch&&(lines.branch.length||cues.branch.length))throw Error('Music finale notes need a finale in '+label);
    const limits={main:[0,loop,branch?.at,ticks].filter(t=>t!==undefined),branch:[0,branch?.ticks??0]};
    for(const line of['main','branch']){
      const end=line==='main'?ticks:branch?.ticks??0;let prior=0;
      for(const n of lines[line]){
        const[t,d,p,sample,v]=n;
        if(!Number.isInteger(t)||t<prior||!Number.isInteger(d)||d<=0||t+d>end||!Number.isInteger(p)||p<12||p>107||(sample!==undefined&&sample!==null&&(perc||!instruments.includes(sample)))||(v!==undefined&&v!==null&&!seven(v)))throw Error('Invalid or overlapping notes in '+label);
        if(limits[line].some(b=>t<b&&t+d>b))throw Error('Music note crosses a loop or finale entry in '+label);
        durationPieces(d);prior=t+d;
      }
      for(const e of cues[line]){const[t,op,...args]=e;if(!Number.isInteger(t)||t<0||t>=end||!(op in formCommands)||args.length!==formCommands[op]||!args.every(byte))throw Error('Invalid native command in '+label);}
    }
    const dynamic=[...lines.main,...lines.branch].some(n=>n[4]!==undefined)||[...cues.main,...cues.branch].some(e=>e[1]===0xc5);
    const prefix=voice===0?[0xf0,tempo,0xf2,echoVolume,0xf7,0,echoFeedback,0xf8,0,echoFilter]:[];
    prefix.push(0xfd,c.expression??100,...(c.echo===false?[]:[0xd4]),0xc4,volume,0xc6,c.pan??64,...(perc?[0xfb]:[]));
    for(const cmd of c.setup??[]){if(!(cmd[0]in formCommands)||cmd.length!==formCommands[cmd[0]]+1||!cmd.every(byte))throw Error('Invalid native setup in '+label);prefix.push(...cmd);}
    for(const[sample,cmds]of Object.entries(c.envelope??{}))for(const cmd of cmds)if(!instruments.includes(Number(sample))||!(cmd[0]in formCommands)||cmd.length!==formCommands[cmd[0]]+1||!cmd.every(byte))throw Error('Invalid native envelope in '+label);
    let state={};
    const encodeBar=(line,a,b)=>{
      const out=[],ns=lines[line].filter(n=>n[0]<b&&n[0]+n[1]>a),evs=cues[line].filter(e=>e[0]>=a&&e[0]<b);
      const points=[...new Set([a,b,...evs.map(e=>e[0]),...ns.flatMap(n=>[Math.max(a,n[0]),Math.min(b,n[0]+n[1])])])].sort((x,y)=>x-y);
      for(let i=0;i+1<points.length;i++){
        const s=points[i],e=points[i+1];
        // A key-on first establishes its sample, envelope and volume, then any
        // command at the same tick (a fade starts from that volume), then the
        // octave and the note itself. A null volume inherits a running fade.
        const n=ns.find(n=>n[0]<=s&&n[0]+n[1]>s),key=n&&n[0]===s;
        if(key){
          const sample=perc?null:n[3]??c.instrument,v=n[4]===null?null:n[4]??volume;
          if(!perc&&sample!==state.sample){out.push(0xdc,0x20+instruments.indexOf(sample));for(const cmd of c.envelope?.[sample]??[])out.push(...cmd);state.sample=sample;}
          if(dynamic&&v!==null&&v!==state.volume){out.push(0xc4,v);state.volume=v;}
        }
        for(const[,op,...args]of evs.filter(ev=>ev[0]===s)){out.push(op,...args);if(op===0xc5)state.volume=args[1];}
        if(!n){out.push(...pieceBytes(13,e-s));continue;}
        if(!key){out.push(...pieceBytes(12,e-s));continue;}
        const octave=Math.floor(n[2]/12);
        if(octave!==state.octave){out.push(...(Math.abs(octave-state.octave)===1?[octave>state.octave?0xd7:0xd8]:[0xd6,octave]));state.octave=octave;}
        out.push(...pieceBytes(n[2]%12,e-s));
      }
      return out;
    };
    const bodies=sections.map(([start,end,entry,line])=>{
      // Only a real introduction (or a one-shot cue, which nothing jumps back
      // into) starts from the prefix's known volume.
      if(entry)state=line==='main'&&start===0&&(loop>0||once)?{volume}:{};
      if(end<=start)return[];
      const bounds=line==='main'?main.filter(t=>t>=start&&t<=end):grid(start,end,0),bars=[];
      for(let i=0;i+1<bounds.length;i++)bars.push(encodeBar(line,bounds[i],bounds[i+1]));
      return packBars(bars);
    });
    tracks.push({prefix,bodies,notes:lines.main.length+lines.branch.length});
  }
  const data=new Array(36).fill(0),starts=[],word=(at,v)=>{data[at]=v&255;data[at+1]=v>>8;};
  for(const t of tracks){
    starts.push(data.length);data.push(...t.prefix);
    const[intro,loopA,...rest]=t.bodies;
    data.push(...intro);const loopAt=data.length;data.push(...loopA);let jump=null;
    if(once){data.push(0xeb);continue;}
    if(branch){data.push(0xfa,branch.value,0,0);jump=data.length-2;data.push(...rest[0]);}
    data.push(0xf6,0,0);word(data.length-2,0x2000+loopAt);
    if(branch){word(jump,0x2000+data.length);data.push(...rest[1],0xeb);}
  }
  const end=data.length;if(end>=0xf00)throw Error(`Music sequence is ${end} bytes; native safe limit is 3839`);
  const seq=Uint8Array.from(data),packet=new Uint8Array(seq.length+2);put16(seq,0,0x2024);put16(seq,2,0x2000+end);
  for(let n=0;n<16;n++)put16(seq,4+n*2,0x2000+(starts[n%8]??end));
  put16(packet,0,seq.length);packet.set(seq,2);
  return{packet,instruments:[...instruments],voices:tracks.length,ticks,loop,once,branch:branch&&{...branch},tempo,bpm:tempo*60000/(252*256),bytes:seq.length,notes:tracks.map(t=>t.notes),starts};
}
export function compileMusic(score){
  if(score.form)return compileForm(score);
  if(!score.channels?.length||score.channels.length>8||!Number.isInteger(score.ticks)||score.ticks<=0||score.ticks%192)throw Error('Music needs one to eight voices and complete 4/4 bars');
  const tempo=Math.round(score.bpm*252*256/60000);if(!Number.isFinite(tempo)||tempo<1||tempo>255)throw Error('Music tempo outside native range');
  const instruments=[...new Set(score.channels.flatMap(c=>[c.instrument,...c.notes.map(n=>n[3]??c.instrument)]))];
  if(instruments.length>16||instruments.some(i=>!Number.isInteger(i)||i<1||i>62))throw Error('Music instrument bank exceeds the native sixteen slots');
  const tracks=[];
  for(const [channel,c]of score.channels.entries()){
    if(![c.volume??90,c.pan??64].every(n=>Number.isInteger(n)&&n>=0&&n<=127))throw Error('Music volume and pan must be native seven-bit values');
    const sorted=[...c.notes].sort((a,b)=>a[0]-b[0]);let priorEnd=0;
    for(const n of sorted){if(!n.slice(0,3).every(Number.isInteger)||n[0]<priorEnd||n[0]%3||n[1]<=0||n[1]%3||n[0]+n[1]>score.ticks||n[2]<12||n[2]>107)throw Error('Invalid or overlapping notes in voice '+channel);priorEnd=n[0]+n[1];}
    const prefix=channel===0?[0xf0,tempo,0xf2,18,0xf7,0,48,0xf8,0,0]:[];
    prefix.push(0xfd,100,0xd4,0xc4,c.volume??90,0xc6,c.pan??64);
    const bars=[];
    // Each bar establishes octave and program independently, making adjacent
    // repeated bars safe to compress with the driver's bounded repeat stack.
    for(let at=0;at<score.ticks;at+=192){
      const out=[];let cursor=at,octave=-1,instrument=-1;
      for(const n of sorted.filter(n=>n[0]<at+192&&n[0]+n[1]>at)){
        const start=Math.max(n[0],at),end=Math.min(n[0]+n[1],at+192),o=Math.floor(n[2]/12),inst=n[3]??c.instrument;
        if(start>cursor)out.push(...durationBytes(13,start-cursor));
        if(inst!==instrument){out.push(0xdc,0x20+instruments.indexOf(inst));instrument=inst;}
        if(o!==octave){out.push(0xd6,o);octave=o;}
        out.push(...durationBytes(n[0]<at?12:n[2]%12,end-start));cursor=end;
      }
      if(cursor<at+192)out.push(...durationBytes(13,at+192-cursor));bars.push(out);
    }
    const body=packBars(bars);
    tracks.push({prefix,body,notes:sorted.length});
  }
  const data=new Array(36).fill(0),starts=[];
  for(const t of tracks){starts.push(data.length);data.push(...t.prefix);const loop=data.length;data.push(...t.body,0xf6,(0x2000+loop)&255,(0x2000+loop)>>8);}
  const end=data.length;if(end>=0xf00)throw Error(`Music sequence is ${end} bytes; native safe limit is 3839`);
  const seq=Uint8Array.from(data),packet=new Uint8Array(seq.length+2);put16(seq,0,0x2024);put16(seq,2,0x2000+end);
  for(let n=0;n<16;n++)put16(seq,4+n*2,0x2000+(starts[n%8]??end));
  put16(packet,0,seq.length);packet.set(seq,2);
  return{packet,instruments,voices:tracks.length,ticks:score.ticks,tempo,bpm:tempo*60000/(252*256),bytes:seq.length,notes:tracks.map(t=>t.notes),starts};
}
