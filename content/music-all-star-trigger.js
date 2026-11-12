import {verse,chorus,bridge,hook,place} from './music-all-star-phrases.js';

// "All Star Trigger": the All Star melody set inside Chrono Trigger's own
// main theme, written over stock song 0x18 in place. The song keeps the stock
// form exactly, so the title, attract and story cues that start it, arm its
// finale with sound command $88 or wait for it to end behave as before:
//   pickup (48 ticks) + 8-bar introduction, then a 16-bar loop whose last bar
//   tests the driver condition; when armed, a 25-bar finale ends the song.
// The introduction is the stock rising string line moved into A major. The
// loop sets the All Star verse and chorus on the stock lead with vibrato,
// with the stock main-theme melody (an octave down, in A major) answering it
// in the strings, over the stock snare march, timpani rhythm and bass. The
// finale turns the stock quiet section into the All Star bridge over harp,
// brings back the instrumental hook, builds with the stock snare crescendo
// and sends the chorus an octave higher before a plagal close in A.
//
// Stock parts are read from the player's own ROM at build time (`stock`);
// none of the cartridge's note data is stored here.
export const chronoTriggerAllStar={
  id:0x18,title:'All Star Trigger',replaces:'Chrono Trigger',
  source:{composition:'All Star — Smash Mouth (supplied MIDI) with Chrono Trigger (stock song 0x18)',arrangement:'Six-voice native SNES mashup using the stock song\'s own instruments and form'},
  arrange
};

const pc={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
const n=name=>{const m=/^([A-G]#?)(\d)$/.exec(name);return Number(m[2])*12+pc[m[1]];};
const PICKUP=48,bar=k=>PICKUP+k*192,LOOP=bar(8),FINALE=bar(23),END=bar(24),FINALE_BARS=25;
// Lead, strings, bass, harp, timpani, snare, cymbal, shaker: the stock slots.
const instruments=[18,44,25,24,9,37,39,31],LEAD=18,STRINGS=44,BASS=25,HARP=24,TIMPANI=9;

// Chords per bar as [first, second]; the second chord enters on the "and"
// of beat two (tick 72), the push the stock timpani and string rhythms use.
const verseChords=[['A','E'],['Bm','D']],chorusChords=[['A','D'],['E','D'],['A','D'],['E','D'],['A','D'],['E','D'],['A','G'],['D','D']];
const chords={A:{root:'A',fifth:'E',top:'E5',mid:'C#5',pad:'C#5',low:'A4'},E:{root:'E',fifth:'B',top:'E5',mid:'B4',pad:'B4',low:'G#4'},Bm:{root:'B',fifth:'F#',top:'F#5',mid:'D5',pad:'D5',low:'B4'},
  D:{root:'D',fifth:'A',top:'F#5',mid:'D5',pad:'D5',low:'A4'},G:{root:'G',fifth:'D',top:'D5',mid:'B4',pad:'B4',low:'B4'},'F#m':{root:'F#',fifth:'C#'}};
const timpani={A:'A2',B:'B2','C#':'C#3',D:'D3',E:'E3','F#':'F#3',G:'G2'},bass={A:'A4',B:'B3','C#':'C#4',D:'D4',E:'E4','F#':'F#4',G:'G4'};
const low={A:'A3',D:'D4',E:'E4',G:'G3'};
const harpArp={A:['A4','E5','C#5','E5','A5','E5','C#5','E5'],Bm:['B4','F#5','D5','F#5','B5','F#5','D5','F#5'],E:['B4','E5','G#5','E5','B5','E5','G#5','E5'],D:['A4','F#5','D5','F#5','A5','F#5','D5','F#5']};
const chordAt=(table,start,t)=>{const k=Math.floor((t-start)/192),pair=table[k%table.length];return(t-start)%192<72?pair[0]:pair[1];};
const nextChord=(table,start,t)=>table[(Math.floor((t-start)/192)+1)%table.length][0];
const shift=(notes,dt)=>notes.map(([t,...r])=>[t+dt,...r]);
const sample=(notes,s,volume)=>notes.map(([t,d,p,,v])=>[t,d,p,s,volume??v]);
// Moves stock notes into A major: G and C become G-sharp and C-sharp.
const major=notes=>notes.map(([t,d,p,...r])=>[t,d,p+([0,7].includes(p%12)?1:0),...r]);
const each=(start,count,fn)=>Array.from({length:count},(_,k)=>fn(start+k*192,k)).flat();

function arrange(stock){
  const quote=(voice,from,to,opts={})=>stock(voice,{from,to,...opts});
  const v0=[],v1=[],v2=[],v3=[],v5=[],b0=[],b1=[],b2=[],b3=[],b5=[];

  // Introduction: the stock rising line (strings) and its harmony moved to
  // A major as A - F#m7 - Dmaj7 - E9sus/E, then the lead's "Some-" pickup.
  v0.push(...major(quote(0,0,bar(7)+144).notes),[bar(7)+144,48,n('A5'),LEAD,110]);
  const intro=['A','A','F#m','F#m','D','D','E','E'];
  v1.push(...each(bar(0),8,(t,k)=>[[0,24],[48,24],[72,24],[120,24],[144,48]].map(([o,d])=>[t+o,d,n(bass[chords[intro[k]].root])])));
  v2.push([bar(0),384,n('E5'),STRINGS,80],[bar(2),384,n('E5'),STRINGS,80],[bar(4),384,n('A5'),STRINGS,80],[bar(6),192,n('F#5'),STRINGS,80],[bar(7),144,n('G#5'),STRINGS,80],[bar(7)+144,48,n('E5'),STRINGS,80]);
  v3.push([bar(0),384,n('C#5'),STRINGS,60],[bar(2),384,n('C#5'),STRINGS,60],[bar(4),384,n('C#5'),STRINGS,60],[bar(6),384,n('D5'),STRINGS,60]);
  // Stock timpani rhythm; pitches follow the new roots (fifth on the last
  // eighth of each chord's first bar, as the stock part does).
  v5.push(...quote(5,0,PICKUP).notes.map(([t,d,p])=>[t,d,p,TIMPANI]));
  v5.push(...quote(5,PICKUP,LOOP).notes.map(([t,d],i)=>{const t0=t+PICKUP,k=Math.floor((t0-PICKUP)/192),c=chords[intro[k]];return[t0,d,n(timpani[(t0-PICKUP)%192>=168&&k%2===0?c.fifth:c.root]),TIMPANI];}));

  // Loop, verse: All Star verse on the stock lead; the stock main-theme
  // melody answers an octave lower in the strings; string stabs, bass and
  // timpani keep the stock theme's rhythms on the All Star chords.
  v0.push(...place(verse,LOOP,15,{from:0}).map(x=>[...x,LEAD,110]));
  v2.push(...sample(major(shift(quote(0,LOOP,bar(16)).notes,LOOP)).map(([t,d,p,...r])=>[t,d,p-12,...r]),STRINGS,90));
  v3.push(...each(LOOP,8,(t,k)=>k%2?[[t,16,n('D5')],[t+72,16,n('A4')],[t+168,16,n('C#5')]]:[[t,16,n('C#5')],[t+72,16,n('B4')],[t+168,16,n('D5')]]).map(x=>[...x,STRINGS,100]));
  v1.push(...each(LOOP,8,(t,k)=>{const[a,b]=verseChords[k%2];return[[0,24,a],[48,24,a],[72,24,b],[120,24,b],[144,48,b]].map(([o,d,c])=>[t+o,d,n(bass[chords[c].root])]);}));
  // Chorus: the All Star chorus over sustained strings and a driving bass.
  v0.push(...place(chorus,bar(16),15,{trim:{'7:24':120}}).map(x=>[...x,LEAD,110]),[bar(23)+144,48,n('A5'),LEAD,110]);
  v2.push(...each(bar(16),8,(t,k)=>{const[a,b]=chorusChords[k];return a===b?[[t,192,n(chords[a].top)]]:[[t,72,n(chords[a].top)],[t+72,120,n(chords[b].top)]];}).map(x=>[...x,STRINGS,100]));
  v3.push(...each(bar(16),8,(t,k)=>{const[a,b]=chorusChords[k];return a===b?[[t,192,n(chords[a].low)]]:[[t,72,n(chords[a].mid)],[t+72,120,n(chords[b].mid)]];}).map(x=>[...x,STRINGS,100]));
  v1.push(...each(bar(16),8,(t,k)=>Array.from({length:8},(_,e)=>[t+e*24,24,n(bass[chords[chorusChords[k][e<3?0:1]].root])])));
  const loopChords=[...verseChords,...verseChords,...verseChords,...verseChords,...chorusChords];
  v5.push(...quote(5,LOOP,END).notes.map(([t,d])=>{const t0=t+LOOP,o=(t0-LOOP)%192;return[t0,d,n(timpani[chords[o>=168?nextChord(loopChords,LOOP,t0):chordAt(loopChords,LOOP,t0)].root]),TIMPANI];}));

  // Finale, entered from the loop's last bar when the CPU arms it.
  // Bar 0: the chorus's last word, the stock rising figure and stabs.
  b0.push(...place(chorus,-7*192,15,{from:7,to:8,trim:{'7:24':120}}).map(x=>[...x,LEAD,110]));
  b2.push(...quote(0,FINALE+96,END,{branch:1}).notes.map(([t,d,p,s,v])=>[t+96,d,p,s,v]));
  b3.push(...quote(3,FINALE+96,END,{branch:1}).notes.map(([t,d,p,s,v])=>[t+96,d,p,s,v]));
  b1.push(...[[0,24],[48,24],[72,24],[120,24],[144,48]].map(([o,d])=>[o,d,n('D4')]));
  b5.push(...quote(5,FINALE,END,{branch:1}).notes.map(([t,d])=>[t,d,n(t<168?'D3':'A2'),TIMPANI]));
  // Bars 1-8: the All Star bridge on soft strings over 8th-note harp.
  const quiet=['A','Bm','A','E','A','D','A','D'];
  b0.push(...place(bridge,192,15).map(x=>[...x,STRINGS,90]));
  b5.push(...each(192,8,(t,k)=>harpArp[quiet[k]].map((p,e)=>[t+e*24,24,n(p),HARP,110])));
  b1.push(...each(192,8,(t,k)=>k===7?[[t,96,n('D4')],[t+96,96,n('E4')]]:[[t,192,n(bass[chords[quiet[k]].root].replace('B3','B4'))]]));
  b2.push(...each(192,8,(t,k)=>[[t,192,n(chords[quiet[k]].pad),STRINGS,70]]));
  b3.push(...each(192,8,(t,k)=>[[t,192,n(chords[quiet[k]].low),STRINGS,60]]));
  // Bars 9-12: the instrumental hook on the lead; harp and pads continue.
  const hookChords=[['A','D'],['E','D']];
  b0.push(...[9,11].flatMap(k=>place(hook,k*192,-9)).map(x=>[...x,LEAD,100]));
  b5.push(...each(9*192,4,(t,k)=>Array.from({length:8},(_,e)=>[t+e*24,24,n(harpArp[hookChords[k%2][e<3?0:1]][e]),HARP,110])));
  b1.push(...each(9*192,4,(t,k)=>[[t,72,n(bass[chords[hookChords[k%2][0]].root])],[t+72,120,n(bass[chords[hookChords[k%2][1]].root])]]));
  b2.push(...each(9*192,4,(t,k)=>[[t,72,n(chords[hookChords[k%2][0]].top),STRINGS,90],[t+72,120,n(chords[hookChords[k%2][1]].top),STRINGS,90]]));
  b3.push(...each(9*192,4,(t,k)=>[[t,72,n(chords[hookChords[k%2][0]].mid),STRINGS,90],[t+72,120,n(chords[hookChords[k%2][1]].mid),STRINGS,90]]));
  // Bars 13-14: IV - V under the stock snare crescendo; the lead climbs.
  b0.push([13*192,96,n('F#6'),LEAD,110],...['A5','B5','C#6','D6','E6','F#6','G#6','A6'].map((p,e)=>[13*192+96+e*12,12,n(p),LEAD,110]),
    [14*192,72,n('B6'),LEAD,110],[14*192+72,24,n('A6'),LEAD,110],[14*192+96,48,n('G#6'),LEAD,110],[14*192+144,48,n('B6'),LEAD,110]);
  b5.push(...harpArp.D.map((p,e)=>[13*192+e*24,24,n(p),HARP,110]),...Array.from({length:16},(_,e)=>[14*192+e*12,12,n('E3'),TIMPANI,Math.round(50+e*77/15)]));
  b1.push([13*192,192,n('D4')],[14*192,192,n('E4')]);
  b2.push([13*192,192,n('A5'),STRINGS,100],[14*192,192,n('B5'),STRINGS,100]);
  b3.push([13*192,192,n('D5'),STRINGS,100],[14*192,192,n('E5'),STRINGS,100]);
  // Bars 15-22: the chorus an octave higher over the stock climax rhythms.
  b0.push(...place(chorus,15*192,27,{trim:{'7:24':312}}).map(x=>[...x,LEAD,110]),[23*192+144,48,n('G#6'),LEAD,110],[24*192,192,n('A6'),LEAD,110]);
  const climax=t=>{const o=(t-15*192)%192,[a,b]=chorusChords[Math.floor((t-15*192)/192)];return{chord:o<72?a:b,first:o<72,late:o>=144};};
  b1.push(...each(15*192,8,(t,k)=>{const[a,b]=chorusChords[k],ra=n(low[chords[a].root]),rb=n(low[chords[b].root]);return[[t,36,ra],[t+36,36,ra+7],[t+72,24,rb+12],[t+96,72,rb],[t+168,24,rb+7]];}));
  b3.push(...quote(3,FINALE+15*192,FINALE+23*192,{branch:1}).notes.map(([t,d])=>{const t0=t+15*192;return[t0,d,n(chords[climax(t0).chord].mid),STRINGS,100];}));
  b2.push(...each(15*192,8,(t,k)=>{const[a,b]=chorusChords[k];return[[t,72,n(chords[a].top)],[t+72,96,n(chords[b].top)],[t+168,12,n(chords[b].top)],[t+180,12,n(chords[b].top)]].map(x=>[...x,STRINGS,100]);}));
  b5.push(...quote(5,FINALE+15*192,FINALE+23*192,{branch:1}).notes.map(([t,d])=>{const t0=t+15*192,c=climax(t0);return[t0,d,n(timpani[c.late&&!c.first?chords[c.chord].fifth:chords[c.chord].root]),TIMPANI];}));
  // Bar 23: the stock sixteenth-note push on E; bar 24: the final A chord.
  const push=quote(5,FINALE+23*192,FINALE+24*192,{branch:1}).notes;
  b5.push(...push.map(([t,d])=>[t+23*192,d,n('E3'),TIMPANI]),[24*192,192,n('A2'),TIMPANI]);
  b1.push(...push.map(([t,d])=>[t+23*192,Math.min(d,12),n('E4')]),[24*192,24,n('A3')]);
  b2.push(...push.map(([t,d])=>[t+23*192,Math.min(d,12),n('B5'),STRINGS,100]),[24*192,192,n('C#6'),STRINGS,100]);
  b3.push(...push.map(([t,d])=>[t+23*192,Math.min(d,12),n('E5'),STRINGS,100]),[24*192,192,n('A5'),STRINGS,100]);

  // The stock kit voice tests its condition one bar later, so its last
  // loop hit is shortened to end where this song's finale may begin.
  const drums=quote(4,0,END),drumFinale=quote(4,FINALE,FINALE+FINALE_BARS*192,{branch:1});
  drums.notes=drums.notes.map(([t,d,...r])=>[t,t<FINALE&&t+d>FINALE?FINALE-t:d,...r]);
  return{form:true,title:chronoTriggerAllStar.title,tempo:130,instruments,pickup:PICKUP,loop:LOOP,ticks:END,
    branch:{at:FINALE,value:1,ticks:FINALE_BARS*192},echo:{volume:20,feedback:90,filter:0},
    channels:[
      {name:'Lead and rising strings',instrument:LEAD,volume:110,pan:64,expression:100,notes:v0,branch:b0,
        envelope:{[LEAD]:[[0xc9,48,16,211],[0xe0,7]],[STRINGS]:[[0xc9,12,24,199],[0xdd,10],[0xe0,4]]}},
      {name:'Electric bass',instrument:BASS,volume:110,pan:64,expression:90,notes:v1,branch:b1},
      {name:'Strings: stock theme counter-melody',instrument:STRINGS,volume:100,pan:48,expression:70,notes:v2,branch:b2,envelope:{[STRINGS]:[[0xdd,10]]}},
      {name:'Strings: stabs and pads',instrument:STRINGS,volume:100,pan:88,expression:60,notes:v3,branch:b3,envelope:{[STRINGS]:[[0xdd,10]]}},
      {name:'Stock snare march (kit)',percussion:true,volume:10,pan:80,expression:80,setup:[[0xd9,1],[0xe6]],notes:drums.notes,events:drums.events,branch:drumFinale.notes,branchEvents:drumFinale.events},
      {name:'Timpani and harp',instrument:TIMPANI,volume:127,pan:64,expression:127,notes:v5,branch:b5}
    ]};
}
