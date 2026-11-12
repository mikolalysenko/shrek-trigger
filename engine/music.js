import {allStar} from '../content/music-all-star.js';
import {carnivalMusic} from '../content/music-carnival.js';
import {chronoTriggerAllStar} from '../content/music-all-star-trigger.js';
import {wingsAllStar} from '../content/music-all-star-wings.js';
import {titleAllStar} from '../content/music-all-star-title.js';
import {fireballBossBattle} from '../content/music-fireball.js';
import {compileMusic} from './music-sequence.js';
import {stockSong,stockVoice} from './music-stock.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {decompress} from './compression.js';
import {sourceDialogueEvents} from '../content/dialogue-ownership.js';

export const musicEventEdits={
  1:[[0x268,0x1e,82]],
  2:[[0x371,0x1e,82],[0x671,0x1e,82],[0x941,0x1e,82]],
  151:[[0x8b7,0x29,81],[0x958,0x4e,81]]
};
export function musicEvent(event,location){
  const edits=musicEventEdits[location];if(!edits)return event;const out=event.slice();
  for(const[pc,source,target]of edits){if(out[pc+1]!==0xea||out[pc+2]!==source)throw Error('Native music event signature changed');out[pc+2]=target;}
  return out;
}
// Stock songs rewritten in place: Chrono Trigger (title, attract and story
// cues), Wings that Cross Time (flight) and the one-shot title cue under the
// pendulum and logo. Each keeps its pointer, its instrument slots and its
// percussion kit, so every caller, sample upload and kit entry is untouched.
// The signatures pin the expected originals.
export const stockMusicReplacements=[
  {arrangement:chronoTriggerAllStar,signature:0x7cb831ff,length:2829},
  {arrangement:wingsAllStar,signature:0x37b23ee0,length:2513},
  {arrangement:titleAllStar,signature:0x79bfd8bc,length:651}
];
export function arrangeStockMusic(base,{arrangement,signature,length}){
  const song=stockSong(base,arrangement.id);
  if(song.signature!==signature||song.length!==length)throw Error('Stock song '+arrangement.replaces+' changed');
  const score=arrangement.arrange((voice,options)=>stockVoice(song,voice,options));
  if(song.instruments.some((sample,i)=>sample!==(score.instruments[i]??0)))throw Error(score.title+' must keep the stock instrument slots');
  const compiled=compileMusic(score);
  if(compiled.packet.length>song.length+2)throw Error(score.title+' exceeds the stock song it replaces');
  return{song,score,compiled};
}
// The Mr. Worldwide superboss theme: Fireball mixed with Boss Battle 2,
// compiled into stock slot 0x4F. That slot holds a two-bar one-shot fanfare
// that no location, event or code immediate plays (checked below); Boss
// Battle 2 itself keeps its own slot and bytes. The superboss event starts
// it with a native EA command before its battle.
export const worldwideSong=0x4f;
export const worldwideMusic={arrangement:fireballBossBattle,quotes:{id:0x1d,signature:0x0558445f,length:936}};
export function arrangeWorldwideMusic(base){
  const{arrangement,quotes}=worldwideMusic,quoted=stockSong(base,quotes.id);
  if(quoted.signature!==quotes.signature||quoted.length!==quotes.length)throw Error('Stock song Boss Battle 2 changed');
  const score=arrangement.arrange((voice,options)=>stockVoice(quoted,voice,options));
  const stock=quoted.instruments.filter(Boolean);
  if(stock.some((sample,i)=>score.instruments[i]!==sample))throw Error(score.title+' must keep Boss Battle 2\'s instrument slots first');
  const compiled=compileMusic(score);
  if(compiled.voices>6)throw Error(score.title+' must leave two voices to battle effects');
  return{quoted,score,compiled};
}
// A song slot is spare only if no location plays it, no event sends EA with
// it and no code sends it as an immediate song request (LDA #id; STA $1E01).
function assertSpareSongSlot(base,id){
  for(let loc=0;loc<512;loc++)if(base[0x360000+loc*14]===id)throw Error('Music slot is used by a location');
  for(const[,pointer]of sourceDialogueEvents){
    if(pointer===0x3afaa0)continue; // Empty end-bank sentinel, not bytecode.
    const e=decompress(base,pointer).bytes;
    for(let p=1+e[0]*32;p<e.length-1;p++)if(e[p]===0xea&&e[p+1]===id)throw Error('Music slot is referenced by an event');
  }
  for(let p=0;p+5<=base.length;p++)if(base[p]===0xa9&&base[p+1]===id&&(base[p+2]===0x8d||base[p+2]===0x8f)&&base[p+3]===0x01&&base[p+4]===0x1e)throw Error('Music slot is requested by native code');
}
function writeSongSlot(base,allocate,add,id,compiled,title){
  const address=allocate(compiled.packet,title+' native music sequence'),ptr=new Uint8Array(3);put24(ptr,0,0xc00000|address);
  add(0x70d18+id*3,ptr,title+' music pointer');
  const instruments=new Uint8Array(32);compiled.instruments.forEach((v,i)=>put16(instruments,i*2,v));
  add(0x70e11+id*32,instruments,title+' native instruments');
  add(0x71871+id*36,new Uint8Array(36),title+' explicit percussion voices');
  const sampleBytes=compiled.instruments.reduce((n,i)=>n+u16(base,fileOffset(u24(base,0x70aea+(i-1)*3))),0);
  if(sampleBytes>0x9000)throw Error('Music samples exceed conservative SPC RAM budget');
  return{address,sampleBytes};
}
export function patchMusic(base,allocate,add){
  if(base[0x70ae9]!==83)throw Error('Native music table count changed');
  const tracks=[];
  for(const[id,score]of[[81,carnivalMusic],[82,allStar]]){
    // These two stock songs have no location or EA event references. Never
    // assume a song is unused because its title sounds like a spare slot.
    assertSpareSongSlot(base,id);
    const compiled=compileMusic(score),{address,sampleBytes}=writeSongSlot(base,allocate,add,id,compiled,score.title);
    tracks.push({id,title:score.title,source:score.source,address,bytes:compiled.bytes,voices:compiled.voices,instruments:compiled.instruments,sampleBytes,bpm:compiled.bpm,beats:score.ticks/48,native:true});
  }
  for(const replacement of stockMusicReplacements){
    const{song,score,compiled}=arrangeStockMusic(base,replacement),bytes=new Uint8Array(song.length+2);
    bytes.set(compiled.packet);add(song.pointer,bytes,score.title+' native music sequence in place of '+replacement.arrangement.replaces);
    const sampleBytes=compiled.instruments.reduce((n,i)=>n+u16(base,fileOffset(u24(base,0x70aea+(i-1)*3))),0);
    if(sampleBytes>0x9000)throw Error('Music samples exceed conservative SPC RAM budget');
    tracks.push({id:replacement.arrangement.id,title:score.title,replaces:replacement.arrangement.replaces,source:replacement.arrangement.source,address:song.pointer,bytes:compiled.bytes,capacity:song.length,
      voices:compiled.voices,instruments:compiled.instruments,sampleBytes,bpm:compiled.bpm,beats:score.ticks/48,loopBeats:score.once?0:(score.ticks-score.loop)/48,finaleBeats:score.branch?score.branch.ticks/48:0,once:!!score.once,inPlace:true,native:true});
  }
  {
    assertSpareSongSlot(base,worldwideSong);
    const{score,compiled}=arrangeWorldwideMusic(base),{address,sampleBytes}=writeSongSlot(base,allocate,add,worldwideSong,compiled,score.title);
    tracks.push({id:worldwideSong,title:score.title,source:worldwideMusic.arrangement.source,quotes:worldwideMusic.quotes.id,address,bytes:compiled.bytes,voices:compiled.voices,instruments:compiled.instruments,sampleBytes,bpm:compiled.bpm,tempo:compiled.tempo,beats:score.ticks/48,loopBeats:(score.ticks-score.loop)/48,superboss:true,native:true});
  }
  if(base[0x36000e]!==0x1e)throw Error('Swamp kitchen music signature changed');
  add(0x36000e,Uint8Array.of(82),'swamp kitchen All Star music');
  return{tracks,events:musicEventEdits,opening:'All Star Trigger replaces the stock Chrono Trigger theme in place',flight:'All Star · Wings arrangement replaces Wings that Cross Time in place',superboss:'Fireball · Boss Battle 2 in spare slot 0x4F',pendulum:'All Star Pendulum replaces the one-shot title cue under the pendulum and logo in place',morning:'original one-shot wake-up cue preserved',extraSamples:0,extraSpcRam:0};
}
