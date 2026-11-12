import {u16,u24,fileOffset} from './rom.js';

// Reads stock AKAO4 songs from the base ROM so an arrangement can quote the
// cartridge's own parts at build time. No stock note data is stored in the
// repository. Only the opcodes used by the songs that are quoted are
// accepted; anything else stops the build instead of guessing.
// Boss Battle 2 (0x1D) adds its pan sweep (CD/CE), tempo fade (F1) and the
// one-time duration E8, which sets the length of the next note only.
const operands={0xc4:1,0xc5:2,0xc6:1,0xc7:2,0xc9:3,0xca:0,0xcd:2,0xce:0,0xd4:0,0xd6:1,0xd7:0,0xd8:0,0xd9:1,0xdc:1,0xdd:1,0xe0:1,0xe2:1,0xe3:0,0xe4:0,0xe5:0,0xe6:0,0xe8:1,0xeb:0,0xf0:1,0xf1:2,0xf2:1,0xf6:2,0xf7:2,0xf8:2,0xfa:3,0xfb:0,0xfc:0,0xfd:1};
const durations=[192,96,64,72,48,32,36,24,16,12,8,6,4,3];
export function fnv1a(bytes){let h=0x811c9dc5;for(const b of bytes)h=Math.imul(h^b,0x01000193)>>>0;return h;}
export function stockSong(base,id){
  const pointer=fileOffset(u24(base,0x70d18+id*3)),length=u16(base,pointer),seq=base.subarray(pointer+2,pointer+2+length);
  return{id,pointer,length,seq,signature:fnv1a(base.subarray(pointer,pointer+2+length)),origin:(u16(seq,0)-0x24)&0xffff,
    instruments:Array.from({length:16},(_,i)=>u16(base,0x70e11+id*32+i*2)),tracks:Array.from({length:8},(_,i)=>u16(seq,4+i*2))};
}
// Notes are [tick, ticks, pitch, sample, volume] relative to `from`, with the
// stock transposition applied. Kit notes use pitch 60+key and no sample.
// Events keep native volume fades and slurs. `branch` is the value of the
// driver's CPU-set conditional; the walk follows loops and jumps.
export function stockVoice(song,voice,{from=0,to,branch=0}){
  const seq=song.seq,at=a=>(a-song.origin)&0xffff,notes=[],events=[],stack=[];
  let p=at(song.tracks[voice]),t=0,octave=4,sample=null,volume=null,transpose=0,kit=false,once=null;
  for(let guard=0;guard<200000&&t<to;guard++){
    if(p>=seq.length)throw Error('Stock song '+song.id+' voice '+voice+' leaves its sequence');
    const op=seq[p++];
    if(op<0xc4){
      const pitch=Math.floor(op/14),d=once??durations[op%14];once=null;
      if(pitch===12){const n=notes.at(-1);if(n&&n.t+n.d===t)n.d+=d;}
      else if(pitch<12)notes.push({t,d,pitch:kit?60+pitch:octave*12+pitch+transpose,sample:kit?null:sample,volume});
      t+=d;continue;
    }
    if(!(op in operands))throw Error('Unsupported stock music command '+op.toString(16));
    const args=Array.from(seq.subarray(p,p+operands[op]));p+=operands[op];
    if(op===0xd6)octave=args[0];else if(op===0xd7)octave++;else if(op===0xd8)octave--;
    else if(op===0xd9)transpose=args[0]<<24>>24;
    else if(op===0xdc)sample=song.instruments[args[0]-0x20];
    else if(op===0xc4)volume=args[0];
    // Notes during a native fade inherit the fading volume (null) until the next c4.
    else if(op===0xc5){volume='fade';events.push({t,cmd:[op,...args]});}
    else if(op===0xe4||op===0xe5)events.push({t,cmd:[op]});
    else if(op===0xe8)once=args[0];
    else if(op===0xfb)kit=true;else if(op===0xfc)kit=false;
    else if(op===0xe2)stack.push({p,left:args[0]});
    else if(op===0xe3){const top=stack.at(-1);if(!top)throw Error('Unbalanced stock repeat');if(top.left-->0)p=top.p;else stack.pop();}
    else if(op===0xf6)p=at(args[0]|args[1]<<8);
    else if(op===0xfa){if(args[0]===branch)p=at(args[1]|args[2]<<8);}
    else if(op===0xeb)break;
  }
  const inside=x=>x.t>=from&&x.t<to;
  return{
    notes:notes.filter(inside).map(n=>[n.t-from,Math.min(n.d,to-n.t),n.pitch,n.sample??undefined,n.volume==='fade'?null:n.volume??undefined]),
    events:events.filter(inside).map(e=>[e.t-from,...e.cmd])
  };
}
