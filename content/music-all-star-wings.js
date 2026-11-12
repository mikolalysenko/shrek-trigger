import {verse,chorus,place} from './music-all-star-phrases.js';

// "All Star · Wings arrangement": All Star and the stock flight theme, Wings
// that Cross Time, sharing one 32-bar loop, written over stock song 0x13 in
// place. The stock four-bar introduction now turns to C minor and F so that
// the All Star verse and chorus (in B-flat, the theme's own register) enter
// on the stock lead, over the flight theme's syncopated piano, guitar riff,
// staccato bass and drums. The second half is the flight theme's own melody
// and accompaniment, whose last phrase is re-harmonised on F to lead back to
// "Some-body". Six voices: the stock kick, snare and hi-hat parts share one
// native kit voice, leaving two voices for sound effects.
//
// Stock parts are read from the player's own ROM at build time (`stock`);
// none of the cartridge's note data is stored here.
export const wingsAllStar={
  id:0x13,title:'All Star · Wings arrangement',replaces:'Wings that Cross Time',
  source:{composition:'All Star — Smash Mouth (supplied MIDI) with Wings that Cross Time (stock song 0x13)',arrangement:'Six-voice native SNES mashup using the stock song\'s own instruments'},
  arrange
};

const pc={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
const n=name=>{const m=/^([A-G]#?)(\d)$/.exec(name);return Number(m[2])*12+pc[m[1]];};
const bar=k=>k*192,LOOP=bar(4),THEME=bar(20),TURN=bar(34),END=bar(36);
// Lead, bright piano, guitar, bass, open hat, closed hat, snare, kick.
const instruments=[18,28,17,51,8,7,6,5],LEAD=18,PIANO=28,GUITAR=17,BASS=51;
// Two-voice piano voicings, the guitar's rocking pair and the bass root.
// No A or E naturals: the All Star melody leans on B-flat and E-flat.
// The guitar rocks on F and G as a pedal (5-6, 1-9, 11-5, 9-3) until the
// chorus's flat-seven chord.
const chords={Bb:{up:'F5',lo:'D5',riff:['F5','G5'],bass:'A#5'},F:{up:'F5',lo:'C5',riff:['F5','G5'],bass:'F5'},Cm:{up:'G5',lo:'C5',riff:['F5','G5'],bass:'C6'},
  Eb:{up:'G5',lo:'A#4',riff:['F5','G5'],bass:'D#6'},Ab:{up:'D#5',lo:'C5',riff:['D#5','F5'],bass:'G#5'}};
// The second chord of each bar enters on the "and" of beat two (tick 72).
const verseChords=[['Bb','F'],['Cm','Eb']],chorusChords=[['Bb','Eb'],['F','Eb'],['Bb','Eb'],['F','Eb'],['Bb','Eb'],['F','Eb'],['Bb','Ab'],['Eb','Eb']];
const each=(start,count,fn)=>Array.from({length:count},(_,k)=>fn(start+k*192,k)).flat();
const shift=(notes,dt)=>notes.map(([t,...r])=>[t+dt,...r]);

// One kit voice from the stock kick/snare and hi-hat voices: a drum hit
// takes the place of a hat at the same tick and every hit lasts until the
// next. Hats keep their accents scaled by their stock expression (60).
function kit(stock,from,to){
  const hits=[...stock(6,{from,to}).notes.map(x=>[x,0]),...stock(7,{from,to}).notes.map(x=>[x,1])].sort((a,b)=>a[0][0]-b[0][0]||a[1]-b[1]),out=[];
  for(const[[t,d,p,,v],hat]of hits)if(out.at(-1)?.[0]!==t)out.push([t,d,p,undefined,hat?Math.round((v??80)*60/127):v??127]);
  out.forEach((x,i)=>{x[1]=Math.min(x[1],(out[i+1]?.[0]??to-from)-x[0]);});
  return out;
}

function arrange(stock){
  const quote=(voice,from,to)=>stock(voice,{from,to}).notes;
  const lead=[],up=[],lo=[],guitar=[],bass=[],events=[];
  // Introduction: two stock bars, then C minor and F under the held G.
  lead.push(...quote(0,0,bar(3)+144),[bar(3)+144,48,n('A#5'),LEAD,85]);
  up.push(...quote(1,0,bar(3)),[bar(3),192,n('F5'),PIANO,70]);
  lo.push(...quote(2,0,bar(3)),[bar(3),192,n('C5'),PIANO,62]);
  bass.push(...quote(5,0,bar(2)),...shift(quote(5,bar(2),LOOP),bar(2)).map(([t,d,,s,v])=>[t,d,n(t<bar(3)?'C6':'F5'),s,v]));

  // All Star verse and chorus over the flight theme's accompaniment.
  const section=(start,table,count)=>{
    for(let k=0;k<count;k++){
      const t=start+k*192,[a,b]=table[k%table.length],x=chords[a],y=chords[b];
      up.push([t,36,n(x.up)],[t+36,36,n(x.up)],[t+72,120,n(y.up)]);
      lo.push([t,36,n(x.lo)],[t+36,36,n(x.lo)],[t+72,120,n(y.lo)]);
      guitar.push([t+24,24,n(x.riff[0])],[t+48,48,n(x.riff[1])],[t+96,12,n(y.riff[1])],[t+108,24,n(y.riff[0])],[t+132,84,n(y.riff[1])]);
      for(let e=0;e<8;e++)bass.push([t+e*24,12,n((e<3?x:y).bass)]);
    }
  };
  lead.push(...place(verse,LOOP,16,{from:0}).map(x=>[...x,LEAD,85]));
  section(LOOP,verseChords,8);
  lead.push(...place(chorus,bar(12),16).map(x=>[...x,LEAD,85]));
  section(bar(12),chorusChords,8);

  // The flight theme itself: fourteen stock bars of every pitched part.
  const theme=(voice,list)=>list.push(...shift(quote(voice,bar(4),bar(17)+(voice===0?168:192)),THEME));
  theme(0,lead);theme(1,up);theme(2,lo);theme(4,guitar);theme(5,bass);
  events.push(...shift(stock(0,{from:bar(4),to:bar(17)+168}).events,THEME));
  // Its last phrase ends over F (the stock D chord would clash with the
  // returning pickup), then "Some-" leads back into the verse.
  lead.push([bar(33)+168,360,n('D6'),LEAD,80],[bar(35)+144,48,n('A#5'),LEAD,85]);
  for(const t of[TURN,TURN+192]){
    up.push([t,192,n('F5')]);lo.push([t,192,n('C5')]);
    guitar.push([t+24,24,n('F5')],[t+48,48,n('G5')],[t+96,12,n('G5')],[t+108,24,n('F5')],[t+132,t===TURN?84:60,n('G5')]);
    for(let e=0;e<8;e++)bass.push([t+e*24,12,n('F5')]);
  }
  // Stock drum bars 0-19 play once through the introduction, verse and
  // chorus; bars 4-19 return under the flight theme.
  const drums=[...kit(stock,0,LOOP),...shift(kit(stock,LOOP,THEME),LOOP),...shift(kit(stock,LOOP,THEME),THEME)];
  return{form:true,title:wingsAllStar.title,tempo:137,instruments,loop:LOOP,ticks:END,echo:{volume:20,feedback:70,filter:0},
    channels:[
      {name:'Lead (piano introduction)',instrument:LEAD,volume:85,pan:64,expression:100,notes:lead,events,envelope:{[LEAD]:[[0xc9,48,16,211]]}},
      {name:'Bright piano, upper',instrument:PIANO,volume:70,pan:44,expression:100,notes:up},
      {name:'Bright piano, lower',instrument:PIANO,volume:62,pan:84,expression:100,notes:lo},
      {name:'Guitar riff',instrument:GUITAR,volume:60,pan:20,expression:100,notes:guitar},
      {name:'Staccato bass',instrument:BASS,volume:115,pan:64,expression:120,notes:bass},
      {name:'Stock kick, snare and hi-hat (kit)',percussion:true,volume:127,pan:64,expression:127,notes:drums}
    ]};
}
