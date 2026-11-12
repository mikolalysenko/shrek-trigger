import {verse,chorus,place} from './music-all-star-phrases.js';

// "All Star Pendulum": the title cue under the pendulum and the Shrek Trigger
// logo (stock song 0x30), rewritten in place as an All Star mix. It keeps the
// cue's tempo, instruments and one-shot shape, so its bar-5 reveal lands on
// the stock cue's frame as the letters and the pendulum appear, and it keeps
// the stock cue's arc: a build in the dark, a bloom on the logo, then a long
// settle that is silent well before the logo fades.
//   bars 0-4   the stock woodblock clock; a music-box piano sings the verse's
//              first line ("Somebody once told me...") while the cue's
//              twinkling piano triplets fade in beneath it; under "...in the
//              shed" the stock timpani roll and a choir swell on A lead in;
//   bars 5-8   on the logo the choir takes the chorus ("Hey now, you're an
//              all star..."), the music box singing its first bars with it,
//              over strings, timpani, the twinkle and the stock cymbal, with a
//              second cymbal as TRIGGER swoops in;
//   bars 9-12  the music box alone sings "...all that glitters is gold, only
//              shooting stars break the mold" over soft choir chords and the
//              twinkle; it closes IV-I on D and fades with the clock ticking.
//
// Stock parts are read from the player's own ROM at build time (`stock`);
// none of the cartridge's note data is stored here.
export const titleAllStar={
  id:0x30,title:'All Star Pendulum',replaces:'title pendulum cue',
  source:{composition:'All Star — Smash Mouth (supplied MIDI) with the title pendulum cue (stock song 0x30)',arrangement:'Eight-voice native SNES mix using the stock cue\'s own instruments, tempo and timing'},
  arrange
};

const pc={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
const n=name=>{const m=/^([A-G]#?)(\d)$/.exec(name);return Number(m[2])*12+pc[m[1]];};
const bar=k=>k*192,ROLL=bar(4),REVEAL=bar(5),TRIGGER=bar(7),SETTLE=bar(9),CLOSE=bar(12)+72,END=bar(13);
// Strings, piano, choir, timpani, cymbal, woodblock: the stock slots.
const instruments=[44,19,58,9,39,59],STRINGS=44,PIANO=19,CHOIR=58,TIMPANI=9,CYMBAL=39,BLOCK=59;
// Chords per bar as [first, second]; the second enters at tick 72. Bars 1-3
// carry the verse (I-V, ii-IV), bar 4 holds V under "shed" and the roll, and
// the chorus (bars 5-12) closes IV-I on D.
const harmony=[null,['D','A'],['Em','G'],['D','A'],['A','A'],['D','G'],['A','G'],['D','G'],['A','G'],['D','G'],['A','G'],['D','C'],['G','D']];
// Per chord: the cue's piano triplet shape (top, middle, low, root, low,
// middle), where A is the stock cue's own A-sus4 figure so the melody's held
// D stays clear; the choir's upper and lower notes; the strings pad; and the
// timpani root.
const chords={
  D:{twinkle:['D6','A5','F#5','D5','F#5','A5'],high:'A5',low:'F#5',pad:'D5',timpani:'D3'},
  A:{twinkle:['A5','E5','D5','A4','D5','E5'],high:'A5',low:'E5',pad:'E5',timpani:'A2'},
  Em:{twinkle:['E6','B5','G5','E5','G5','B5']},
  G:{twinkle:['D6','B5','G5','D5','G5','B5'],high:'B5',low:'D5',pad:'D5',timpani:'G2'},
  C:{twinkle:['C6','G5','E5','C5','E5','G5'],high:'G5',low:'E5',pad:'E5',timpani:'C3'}
};
const chordAt=t=>{const[a,b]=harmony[Math.floor(t/192)];return chords[t%192<72?a:b];};
// One note per chord change between two bar lines; repeated notes are held.
function follow(key,from,to,sample,volume){
  const out=[];
  for(let t=from;t<to;t+=t%192?120:72){
    const p=n(chordAt(t)[key]),d=t%192?120:72,last=out.at(-1);
    if(last&&last[2]===p&&last[0]+last[1]===t)last[1]+=d;else out.push([t,d,p,sample,volume]);
  }
  return out;
}
// Notes from `from` on inherit a running fade instead of setting a volume.
const fading=(notes,from)=>notes.map(x=>x[0]>=from?[...x.slice(0,4),null]:x);

function arrange(stock){
  // The stock roll swells from silence into the logo: the cue sets volume 0
  // right before each swell, so that note carries it here.
  const roll=voice=>{const{notes,events}=stock(voice,{from:ROLL,to:REVEAL});
    return{notes:notes.map(([t,d,p,s,v])=>[t+ROLL,d,p,s,events.some(e=>e[0]===t&&e[1]===0xc5)?0:v]),events:events.map(([t,...e])=>[t+ROLL,...e])};};
  const[r6,r7]=[6,7].map(roll);
  const cymbal=stock(7,{from:REVEAL,to:REVEAL+384}).notes.map(([t,...x])=>[t+REVEAL,...x]),crash=cymbal[0][2];
  const fadeOut=[[bar(11),0xc5,192,30],[bar(12),0xc5,192,0]],close=[[CLOSE,0xc5,END-CLOSE,0]];

  // Music box: the verse line, two octaves up in D, fading in from the dark;
  // "shed" rings into the logo. It sings the chorus's first two bars with the
  // choir, then returns alone for the chorus's second half.
  const box=[
    ...place(verse,bar(1),20,{to:4,trim:{'3:24':168}}).filter(([t])=>t<bar(4)+144).map(([t,d,p],i)=>[t,d,p,PIANO,i?null:70]),
    ...place(chorus,REVEAL,20,{to:2}).map(x=>[...x,PIANO,88]),
    ...fading(place(chorus,REVEAL,20,{from:4}).map(x=>[...x,PIANO,127]),bar(12))
  ];
  // The cue's twinkling triplets, fading in from bar 1 as in the stock cue.
  const twinkle=[];
  for(let t=bar(1);t<END;t+=16)twinkle.push([t,16,n(chordAt(t).twinkle[t/16%6]),PIANO,t===bar(1)?20:null]);
  // The stock woodblock clock: a tick every half note and a faint echo an
  // eighth later. The echo voice carries the strings pad under the chorus.
  const clock=offset=>Array.from({length:END/96},(_,k)=>[k*96+offset,72,n('E5')]);
  const echo=clock(24).filter(([t])=>t<REVEAL||t>=bar(11)).map(x=>[...x,BLOCK,36]);

  return{form:true,once:true,title:titleAllStar.title,tempo:98,instruments,ticks:END,echo:{volume:20,feedback:80,filter:0},
    channels:[
      {name:'Music box',instrument:PIANO,volume:115,pan:64,expression:100,notes:box,events:[[bar(1),0xc5,192,95],[bar(2),0xc5,192,115],[bar(12),0xc5,192,0]]},
      {name:'Clock tick',instrument:BLOCK,volume:120,pan:54,expression:110,notes:clock(0),envelope:{[BLOCK]:[[0xe0,7]]}},
      {name:'Clock echo and strings',instrument:STRINGS,volume:66,pan:74,expression:100,
        notes:[...echo,...fading(follow('pad',REVEAL,bar(11),STRINGS,66),bar(10))],events:[[bar(10),0xc5,192,25]],
        envelope:{[BLOCK]:[[0xe0,7]],[STRINGS]:[[0xdd,9],[0xe0,7]]}},
      // The stock cue's pan sweep (CD 96 120) on its twinkle.
      {name:'Twinkling piano',instrument:PIANO,volume:64,pan:64,expression:80,notes:twinkle,envelope:{[PIANO]:[[0xcd,96,120]]},
        events:[[bar(2),0xc5,192,35],[bar(3),0xc5,192,48],[bar(4),0xc5,192,64],[bar(11),0xc5,192,30],[bar(12),0xc5,192,0]]},
      // The swell rises to the chorus's own level, so "Hey now" continues it.
      {name:'Choir: swell, chorus, upper chords',instrument:CHOIR,volume:127,pan:64,expression:127,
        notes:[[ROLL,192,n('E6'),CHOIR,0],...place(chorus,REVEAL,20,{to:4}).map(x=>[...x,CHOIR,null]),...fading(follow('high',SETTLE,END,CHOIR,56),bar(11))],
        events:[[ROLL,0xc5,192,127],...fadeOut],envelope:{[CHOIR]:[[0xe0,7]]}},
      {name:'Choir: swell, harmony, lower chords',instrument:CHOIR,volume:78,pan:78,expression:127,
        notes:[[ROLL,192,n('A5'),CHOIR,0],...follow('high',REVEAL,SETTLE,CHOIR,78),...fading(follow('low',SETTLE,END,CHOIR,50),bar(11))],
        events:[[ROLL,0xc5,192,78],...fadeOut],envelope:{[CHOIR]:[[0xe0,7]]}},
      {name:'Timpani',instrument:TIMPANI,volume:124,pan:64,expression:100,
        notes:[...r6.notes,...follow('timpani',REVEAL,SETTLE,TIMPANI,124),[CLOSE,END-CLOSE,n('D3'),TIMPANI,60]],events:[...r6.events,...close]},
      {name:'Timpani roll and cymbals',instrument:CYMBAL,volume:127,pan:64,expression:100,
        notes:[...r7.notes,...cymbal,[TRIGGER,384,crash,CYMBAL,95],[CLOSE,END-CLOSE,crash,CYMBAL,45]],events:[...r7.events,...close],envelope:{[CYMBAL]:[[0xe0,12]]}}
    ]};
}
