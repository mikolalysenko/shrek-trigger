import {fireballSource,hook,bass,strumTop,strumInner,chop,hookDrums,fillDrums,place} from './music-fireball-phrases.js';

// "Fireball · Boss Battle 2": the Mr. Worldwide superboss theme. A native
// Chrono Trigger rearrangement of "Fireball" (Pitbull, from the MIDI the user
// supplied) with Boss Battle 2 (stock song 0x1D) mixed in. It is compiled
// into the unused stock song slot 0x4F, so Boss Battle 2 itself is unchanged.
//
// It follows the file's own shape: the trumpet riff, a build, the one-hit stop
// where Pitbull shouts "Fireball!" (file bar 17), then the drop (file bar 18
// on), where trumpet, tenor sax and brass play the riff in unison over a
// four-on-the-floor beat. Fireball's F-major vamp (F to E-flat) moves down a
// minor third into Boss Battle 2's D minor (D minor to C); the riff and the
// bass riff have no third, so they fit as they are. Tempo 136 (the driver's
// tempo byte is beats per minute) pushes the file's 123 for the fight.
//   pickup     Boss Battle 2's own brass "da-DA" over a timpani roll.
//   bars 0-3   the trumpet riff in octaves over the strummed vamp and a
//              four-on-the-floor kick; the bass riff enters in bar 2.
//   bars 4-6   the build: the tenor-sax chop on brass, a D pedal in the
//              bass, a rising string tremolo and a snare roll, then the
//              file's own tom fill on timpani under a brass run.
//   bar 7      FIRE-BALL: two full-band D minor hits, then silence where the
//              shout goes, and a timpani-and-snare pickup.
//   bars 8-15  the drop: the riff in octaves, the bass riff, a sixteenth-note
//              string ostinato on the vamp's own voicing, and the file's
//              kick, hats and timbales with a snare backbeat added.
//   bars 16-23 Boss Battle 2's second statement (melody and bass quoted from
//              the ROM; its pads become the ostinato) with the riff
//              answering on brass, moved to each bar's root, and Boss Battle
//              2's own brass harmony; timpani on the downbeats.
//   bars 24-26 Boss Battle 2's turnaround, its melody in octaves, into the
//              tom fill.
//   bar 27     FIRE-BALL again.
//   bars 28-31 the drop again, with Boss Battle 2's opening melody as a
//              string counter-melody; a snare roll leads back to bar 0.
//
// Boss Battle 2's parts are read from the player's own ROM at build time
// (`stock`); none of the cartridge's note data is stored here.
export const fireballBossBattle={
  id:0x4f,title:'Fireball · Boss Battle 2',quotes:0x1d,
  source:{composition:'Fireball — Pitbull (supplied MIDI) with Boss Battle 2 (stock song 0x1D)',sha256:fireballSource.sha256,arrangement:'Six-voice native SNES mashup using Boss Battle 2\'s instruments plus five native percussion samples'},
  arrange
};

const PICKUP=96,bar=k=>PICKUP+k*192,LOOP=bar(0),END=bar(32);
// Bars counted from the loop point.
export const fireballForm={intro:0,build:4,stops:[7,27],drop:8,boss:16,turnaround:24,reprise:28,bars:32};
export const fireballTempo=136;
// Boss Battle 2's slots first (brass, strings, bass, harp, flute), then kick,
// snare, hi-hat, crash cymbal and timpani.
export const fireballInstruments=[55,44,25,24,23,5,37,7,39,9];
const BRASS=55,STRINGS=44,BASS=25,KICK=5,SNARE=37,HAT=7,CRASH=39,TIMPANI=9;
// F major down a minor third into D minor: the major third becomes minor.
export const toBossKey=p=>{const q=p-3;return q%12===6?q-1:q;};
const shift=(notes,dt)=>notes.map(([t,...r])=>[t+dt,...r]);
const octave=(notes,k)=>notes.map(([t,d,p,...r])=>[t,d,p+12*k,...r]);
const as=(notes,sample,volume)=>notes.map(([t,d,p])=>[t,d,p,sample,volume]);
// The file's articulations are very short; a struck SNES sample needs a
// little more length. Never past the next onset.
function legato(notes,min){
  return notes.map((n,i)=>{const next=notes[i+1]?.[0]??Infinity;return[n[0],Math.max(n[1],Math.min(min,next-n[0])),...n.slice(2)];});
}
// The riff moved to another root (semitones from D) and octave.
const hookAt=(start,root=0,up=0)=>legato(place(hook,start,0,p=>toBossKey(p)+root+12*up),18);

// The vamp's chord at each strum: its top and inner voices name the root (a
// fourth apart the top is the root, a major third apart the inner voice is).
export const vampChords=strumTop.notes.map(([b,t,,top],i)=>{
  const[ib,it,,inner]=strumInner.notes[i];if(ib!==b||it!==t)throw Error('Fireball strum voices out of step');
  const T=toBossKey(top),I=toBossKey(inner),gap=((T-I)%12+12)%12;
  if(![0,4,5].includes(gap))throw Error('Unexpected Fireball strum voicing');
  return{at:b*192+t,root:(gap===4?I:T)%12,other:(gap===0?T+7:gap===4?T:I)%12};
});
const vampAt=offset=>{const o=(offset%384+384)%384;let c=vampChords[0];for(const v of vampChords)if(v.at<=o)c=v;return c;};
// Sixteenths on the strum's own voicing: root, upper note, root an octave up,
// upper note, with the root between C4 and B4.
export function vampOstinato(from,to,volume){
  const out=[];
  for(let t=from;t<to;t+=12){
    const{root,other}=vampAt(t-from),low=60+root,high=low+((other-root)%12+12)%12;
    out.push([t,12,[low,high,low+12,high][(t-from)/12%4],STRINGS,volume]);
  }
  return out;
}
// Boss Battle 2's harmony at a tick: the pitch classes its pads (voices 3, 4
// and 7) sound, with its bass when fewer than two pads sound, folded into
// C4-B4 and sorted.
export const fold=pcs=>[...new Set(pcs.map(p=>60+(p%12+12)%12))].sort((a,b)=>a-b);
const sounding=(notes,t)=>notes.filter(([s,d])=>s<=t&&t<s+d).map(n=>n[2]);
export function bossHarmony(pads,bassLine){
  let last=null;
  return t=>{let pcs=pads.flatMap(p=>sounding(p,t));if(pcs.length<2)pcs=pcs.concat(sounding(bassLine,t));const c=fold(pcs);if(c.length)last=c;if(!last)throw Error('No Boss Battle 2 harmony at '+t);return last;};
}
// Sixteenths on those chord tones: lowest, highest, middle, highest.
function padOstinato(from,to,chordAt,volume){
  const out=[];
  for(let t=from;t<to;t+=12){const c=chordAt(t),i=(t-from)/12%4;out.push([t,12,c.length>2?[c[0],c[2],c[1],c[2]][i]:c[i%2?c.length-1:0],STRINGS,volume]);}
  return out;
}
// Timpani between F1 and E2.
const timpaniPitch=pc=>29+((pc-5)%12+12)%12;
// Durations run to the next onset, capped per hit.
const settle=(hits,end)=>hits.sort((a,b)=>a[0]-b[0]).map(([t,cap,...r],i)=>[t,Math.min(cap,(hits[i+1]?.[0]??end)-t),...r]);
const roll=(from,to,step,v0,v1,pitch=75)=>{const n=(to-from)/step;return Array.from({length:n},(_,i)=>[from+i*step,step,pitch,SNARE,Math.round(v0+(v1-v0)*i/Math.max(1,n-1))]);};
// One bar of the drop's groove from the file (bar 18 on): the kick (36) on
// every beat, closed hats (42) on the offbeats and timbales (65) between,
// plus a snare backbeat on two and four. `src` picks the file's first or
// second groove bar. A fill replaces the second half with a snare roll; the
// kick voice can take a timpani on the downbeat.
function groove(at,src,{crash=false,fill=false,backbeat=true,timbales=true,timpani=null}={}){
  const kick=[],hits=new Map(),add=(t,hit)=>{if(!hits.has(t))hits.set(t,hit);};
  for(const[b,t,key]of hookDrums.notes)if(b===src&&key===36&&!kick.some(n=>n[0]===at+t))kick.push([at+t,24,72,KICK,112]);
  if(timpani!==null&&kick[0]?.[0]===at)kick[0]=[at,24,timpani,TIMPANI,108];
  if(crash)add(0,[48,72,CRASH,108]);
  if(backbeat)for(const t of[48,144])add(t,[24,75,SNARE,104]);
  for(const[b,t,key]of hookDrums.notes)if(b===src&&key===42&&!(crash&&t<48))add(t,[18,76,HAT,84]);
  if(timbales)for(const[b,t,key]of hookDrums.notes)if(b===src&&key===65&&!(crash&&t<48))add(t,[12,84,SNARE,52]);
  let kit=[...hits].map(([t,[cap,...r]])=>[at+t,cap,...r]);
  if(fill)kit=kit.filter(n=>n[0]<at+96).concat(roll(at+96,at+192,12,84,120));
  return{kick,kit:settle(kit,at+192)};
}
// The file's tom fill into the stop (file bar 16, second half) on timpani:
// low tom (45) D2, high floor tom (43) A1, low floor tom (41) F1.
const TOMS={45:38,43:33,41:29};
function tomFill(at){
  const hits=new Map();
  for(const[b,t,key]of fillDrums.notes)if(b===0&&t>=96&&key in TOMS&&(!hits.has(t)||TOMS[key]>hits.get(t)))hits.set(t,TOMS[key]);
  return settle([...hits].map(([t,p])=>[at+t,48,p,TIMPANI,120]),at+192);
}

function arrange(stock){
  const quote=(voice,from,to)=>stock(voice,{from,to}).notes;
  const lead=[],low=[],str=[],horn=[],kick=[],kit=[];
  const beat=(g)=>{kick.push(...g.kick);kit.push(...g.kit);};

  // Pickup: Boss Battle 2's brass "da-DA" over a timpani roll on A.
  lead.push(...as(quote(0,0,PICKUP),BRASS,104));
  for(let i=0;i<8;i++)kick.push([i*12,12,33,TIMPANI,56+i*8]);
  kit.push(...roll(48,PICKUP,12,64,100));

  // Bars 0-3: the trumpet riff in octaves over the strummed vamp.
  for(const k of[0,2]){
    lead.push(...as(hookAt(bar(k),0,1),BRASS,106));
    horn.push(...as(hookAt(bar(k)),BRASS,96));
    str.push(...as(octave(place(strumTop,bar(k),0,toBossKey),1),STRINGS,84));
  }
  low.push(...as(place(bass,bar(2),24,toBossKey),BASS,108));
  for(let k=0;k<4;k++)beat(groove(bar(k),k%2,{crash:k===0,backbeat:k>=2,timbales:false,fill:k===3,timpani:k===0?38:null}));

  // Bars 4-6: the build.
  const B=bar(4),STOP=bar(7);
  lead.push(...as(legato(octave(place(chop,B,0,toBossKey),1),9).filter(n=>n[0]<STOP),BRASS,100));
  for(let t=B;t<STOP;t+=24)low.push([t,24,(t-B)/24%2?62:50,BASS,t<bar(5)?96:110]);
  for(let k=0;k<6;k++)for(let t=0;t<96;t+=12)str.push([B+k*96+t,12,57+k,STRINGS,52+k*12]);
  horn.push(...[57,58,60,62,64,65,67,69].map((p,i)=>[bar(6)+96+i*12,12,p,BRASS,80+i*6]));
  for(let k=0;k<2;k++)for(let t=0;t<192;t+=48)kick.push([bar(4+k)+t,24,72,KICK,104]);
  for(let t=0;t<96;t+=24)kick.push([bar(6)+t,24,72,KICK,108+t/12]);
  kick.push(...tomFill(bar(6)));
  kit.push([B,24,72,CRASH,100],...roll(B+24,bar(5),24,56,80),...roll(bar(5),bar(6),12,80,100),...roll(bar(6),bar(6)+144,12,100,118),...roll(bar(6)+144,STOP,6,118,124,77));

  // FIRE-BALL: two full-band hits, silence for the shout, then a pickup.
  const stop=at=>{
    lead.push([at,42,74,BRASS,120],[at+48,30,74,BRASS,120]);
    horn.push([at,42,69,BRASS,108],[at+48,30,69,BRASS,108]);
    str.push([at,42,65,STRINGS,104],[at+48,30,62,STRINGS,104]);
    low.push([at,42,50,BASS,112],[at+48,30,50,BASS,112]);
    kick.push([at,45,38,TIMPANI,112],[at+48,48,38,TIMPANI,112],[at+168,12,33,TIMPANI,100],[at+180,12,38,TIMPANI,116]);
    kit.push([at,96,72,CRASH,112],...roll(at+168,at+192,6,84,108));
  };
  stop(STOP);

  // Bars 8-15: the drop.
  const D=bar(8);
  for(let k=0;k<8;k+=2){
    lead.push(...as(hookAt(D+k*192,0,1),BRASS,110));
    horn.push(...as(hookAt(D+k*192),BRASS,94));
    low.push(...as(place(bass,D+k*192,24,toBossKey),BASS,112));
  }
  str.push(...vampOstinato(D,bar(16),76));
  for(let k=0;k<8;k++)beat(groove(D+k*192,k%2,{crash:k%4===0,fill:k===7}));

  // Bars 16-23: Boss Battle 2's second statement (stock 1632-3168).
  const S=1632,C=bar(16),bossBass=shift(quote(5,S,S+1536),C),pads=[3,4,7].map(v=>shift(quote(v,S,S+1536),C)),bossChord=bossHarmony(pads,bossBass);
  lead.push(...as(shift(quote(0,S,S+1536),C),BRASS,108));
  low.push(...as(bossBass,BASS,112));
  str.push(...padOstinato(C,C+1536,bossChord,74));
  // The riff answers an octave up on D, a fourth down on G for the G minor
  // bars, and on D again; Boss Battle 2's own brass harmony fills bars 20-21.
  for(const[k,root]of[[0,0],[2,-7],[6,0]])horn.push(...as(hookAt(C+k*192,root,1),BRASS,96));
  horn.push(...as(shift(quote(1,S+768,S+1152),C+768),BRASS,92));
  const rootAt=t=>sounding(bossBass,t)[0]??bossChord(t)[0];
  for(let k=0;k<8;k++)beat(groove(C+k*192,k%2,{crash:k%4===0,fill:k===7,timpani:timpaniPitch(rootAt(C+k*192))}));

  // Bars 24-26: Boss Battle 2's turnaround (stock 3936-4512).
  const T=bar(24),U=3936,L=576,turnBass=shift(quote(5,U,U+L),T);
  lead.push(...as(shift(quote(0,U,U+L),T),BRASS,108));
  horn.push(...as(shift(quote(1,U,U+L),T),BRASS,96));
  low.push(...as(turnBass,BASS,112));
  str.push(...padOstinato(T,T+L,bossHarmony([3,4,7].map(v=>shift(quote(v,U,U+L),T)),turnBass),74));
  for(let k=0;k<2;k++)beat(groove(T+k*192,k%2,{crash:k===0}));
  for(let t=0;t<96;t+=24)kick.push([bar(26)+t,24,72,KICK,108+t/12]);
  kick.push(...tomFill(bar(26)));
  kit.push(...roll(bar(26),bar(26)+144,12,84,118),...roll(bar(26)+144,bar(27),6,118,124,77));
  stop(bar(27));

  // Bars 28-31: the drop again, with Boss Battle 2's opening melody (stock
  // 96-864) as a string counter-melody.
  const R=bar(28);
  for(const k of[0,2]){
    lead.push(...as(hookAt(R+k*192,0,1),BRASS,110));
    low.push(...as(place(bass,R+k*192,24,toBossKey),BASS,112));
  }
  horn.push(...as(shift(quote(0,96,864),R),STRINGS,88));
  str.push(...vampOstinato(R,END,76));
  for(let k=0;k<4;k++)beat(groove(R+k*192,k%2,{crash:k===0,fill:k===3}));

  return{form:true,title:fireballBossBattle.title,tempo:fireballTempo,instruments:fireballInstruments,pickup:PICKUP,loop:LOOP,ticks:END,echo:{volume:14,feedback:40,filter:0},
    channels:[
      {name:'Trumpet lead: the riff, the chop and Boss Battle 2\'s melody',instrument:BRASS,volume:118,pan:64,expression:100,notes:lead,envelope:{[BRASS]:[[0xc9,12,24,197]]}},
      {name:'Electric bass',instrument:BASS,volume:116,pan:64,expression:100,notes:low,echo:false},
      {name:'Strings: strums, riser and sixteenth-note ostinato',instrument:STRINGS,volume:96,pan:40,expression:90,notes:str,envelope:{[STRINGS]:[[0xdd,12],[0xe0,12]]}},
      {name:'Brass section: riff octave, run, answers and counter-melody',instrument:BRASS,volume:108,pan:88,expression:96,notes:horn},
      {name:'Kick and timpani',instrument:KICK,volume:120,pan:64,expression:90,notes:kick,echo:false},
      {name:'Snare, hi-hat, timbales and crash',instrument:SNARE,volume:108,pan:72,expression:94,notes:kit,echo:false}
    ]};
}
