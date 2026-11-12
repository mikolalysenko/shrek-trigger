// Original composition for the Hatchet Carnival guardians (Violent J and
// Shaggy 2 Dope, then the Great Milenko). It is not an arrangement or a
// transcription of any Insane Clown Posse recording.
//
// A one-bar "hatchet" hook (lower-neighbour turn, leap, lower-neighbour turn)
// is answered by a music-box harp over a low pipe-organ line cliche, moved up
// to the Neapolitan (Eb) and resolved by diminished harp ripples. Channel
// volume is fixed, so dynamics come from orchestration: a sparse opening
// phrase, a fuller answer, a stop bar, a driving 3+3+2 middle and a doubled
// final statement. Every pitch stays inside the range already used with the
// same native Chrono Trigger instrument in the existing scores.
const channels=[
 {name:'Calliope lead (rock organ)',instrument:52,volume:88,pan:64,notes:[]},
 {name:'Pipe organ line',instrument:22,volume:58,pan:48,notes:[]},
 {name:'Guitar offbeats',instrument:30,volume:48,pan:34,notes:[]},
 {name:'Electric bass',instrument:25,volume:100,pan:64,notes:[]},
 {name:'Kick, snare and hat',instrument:5,volume:84,pan:64,notes:[]},
 {name:'Music-box harp',instrument:24,volume:78,pan:92,notes:[]}
];
// Each voice lists sixteen bars of [tick-in-bar, duration, pitch, instrument?].
const put=(voice,bars)=>bars.forEach((bar,n)=>{for(const [t,d,p,i]of bar)channels[voice].notes.push([n*192+t,d,p,...(i?[i]:[])]);});

// Hook: X, X-1, X, held leap to Y, Y-1, Y. Short notes are slightly detached.
const hook=(x,y,c=y-1,d=y)=>[[0,18,x],[24,18,x-1],[48,24,x],[72,72,y],[144,18,c],[168,24,d]];
// Turn over A7 (E F E C#), leading back to D.
const turn=(o=0)=>[[0,72,76+o],[72,24,77+o],[96,48,76+o],[144,48,73+o]];
const tresillo=(a,b,c)=>[[0,72,a],[72,72,b],[144,48,c]];
put(0,[
 hook(74,81),[],hook(74,82),turn(),
 hook(74,81),[],hook(75,82),[[0,144,81]],
 tresillo(82,81,79),tresillo(77,76,74),tresillo(79,77,75),[[0,72,76],[72,72,77],[144,24,76],[168,24,73]],
 hook(74,81),hook(74,82),hook(75,82,79,76),turn()
]);

// Low organ: D C# C B Bb A line cliche, then a rising answer to the lead.
const held=(...ps)=>ps.map((p,n)=>[n*192/ps.length,192/ps.length,p]);
put(1,[
 held(50,49),held(48,47),held(46),held(45),
 held(50,49),held(48,47),held(46),held(45),
 held(50),held(53),held(55),held(57,55),
 held(53),held(53),held(55),held(52)
]);

// Offbeat "pah" chops; sustained sixths beneath the lead in the middle.
const chops=(lo,hi,times=[24,72,120,168])=>times.map((t,n)=>[t,12,n%2?hi:lo]);
put(2,[
 chops(53,57,[72,168]),chops(53,57,[72,168]),chops(53,58,[72,168]),chops(55,61),
 chops(53,57),chops(53,57),chops(55,58),[[0,24,61]],
 [[0,144,62],[144,48,58]],[[0,144,57],[144,48,53]],[[0,144,58],[144,48,55]],[[0,144,61],[144,48,55]],
 chops(53,57),chops(53,58),chops(55,58),chops(55,61)
]);

// Oom-pah quarters with chromatic approaches; 3+3+2 octave pairs in the middle.
const oom=(...ps)=>ps.map((p,n)=>[n*48,36,p]);
const pairs=(lo,hi,last=hi)=>[[0,24,lo],[24,24,hi],[72,24,lo],[96,24,hi],[144,24,lo],[168,24,last]];
put(3,[
 oom(38,33,38,33),oom(38,33,38,35),oom(34,41,38,34),oom(33,40,33,37),
 oom(38,33,38,33),oom(38,33,35,38),oom(39,34,39,34),[[0,72,33],[144,24,45],[168,24,33]],
 pairs(34,46),pairs(33,45),pairs(39,51),pairs(33,45,37),
 oom(38,33,38,33),oom(34,41,34,41),oom(39,34,37,40),oom(33,40,33,37)
]);

// One restrained percussion voice: kick, light snare, hard snare, closed hat.
const K=[72,5],S=[75,37],H=[75,6],C=[76,7];
const kit=(...hits)=>hits.map(([t,d,[p,i]])=>[t,d,p,i]);
const march=[[0,24,K],[48,24,S],[96,24,K],[144,24,S]];
const driveBeat=[[0,24,K],[48,24,H],[72,24,K],[96,24,K],[144,24,H],[168,24,C]];
const pushBeat=[[0,24,K],[48,24,H],[96,24,K],[120,24,K],[144,24,H],[168,24,C]];
put(4,[
 kit(...march),kit(...march),kit(...march),kit(...march,[168,24,S]),
 kit(...march,[168,24,C]),kit(...march,[168,24,C]),kit(...march,[168,24,C]),kit([0,48,K],[120,24,H],[144,24,H],[168,24,H]),
 kit(...driveBeat),kit(...driveBeat),kit(...driveBeat),kit([0,24,K],[48,24,H],[72,24,K],[96,24,K],[120,24,H],[144,24,H],[168,24,H]),
 kit(...pushBeat),kit(...pushBeat),kit(...pushBeat),kit([0,24,K],[48,24,H],[72,24,K],[96,24,H],[120,24,H],[144,12,H],[156,12,H],[168,12,H],[180,12,H])
]);

// Music-box answers, diminished ripples, 3+3+2 broken chords, then doubling.
const answer=(x,a,b)=>[[0,24,81],[24,24,80],[48,24,81],[72,72,x],[144,24,a],[168,24,b]];
const ripple=ps=>ps.map((p,n)=>[n*24,24,p]);
const broken=(a,b,c)=>[0,1,2,3,4,5,6,7].map(n=>[n*24,24,[a,b,c][n%3]]);
put(5,[
 [],answer(77,76,74),[],[...ripple([57,61,64,67]),[96,96,70]],
 [],answer(74,77,79),[],ripple([61,64,67,70,73,76,79,82]),
 broken(62,67,70),broken(62,65,69),broken(63,67,70),broken(61,64,69),
 hook(62,69),hook(62,70),hook(63,70,67,64),turn(-12)
]);

export const carnivalMusic={title:'Hatchet Carnival',bpm:112,ticks:16*192,channels,source:{composition:'Original Shrek Trigger composition',arrangement:'Native SNES calliope and pipe organs, harp, guitar, bass and drums'}};
