import {nativeRoutine} from './asm.js';
import {put24} from './rom.js';
import {cartridgeDataAddress} from './expanded-rom.js';
import {soundSwaps,impacts} from '../content/tech-juice.js';

// One hook on the sound driver's play entry (JSL C7:0004 -> JMP C7:0140).
// For a sound effect sent from the battle program (callers in banks C1/CD):
//  1. while a party technique is active ($AE91 < 3, $AE92 = 2, $AE93 = id),
//     replace the cue per content/tech-juice.js soundSwaps;
//  2. start the native screen shake (the $7E:CCB0 block the battle NMI
//     consumes at CD:0B51) for sounds listed in impacts. The shake decays to
//     zero by itself, as the original scripted shakes with end amplitude 0 do.
// A field event's frog croak becomes a cat meow (Frog is Puss in Boots).
// Registers, flags and the data bank are preserved; the driver then runs as
// in the original.
// Field sound effects in the stock event bank (CTViewer sound list).
export const FROG_CROAK=0x6e,CAT_MEOW=0x4e;
export function techJuiceTables(){
 const swaps=[],shakes=[];
 for(const[tech,from,to]of soundSwaps){if(!(tech>0&&tech<=116)||!from||!to)throw Error('Invalid sound swap');swaps.push(tech,from,to);}
 for(const[sound,amplitude,decay,both]of impacts){if(!sound||amplitude<1||amplitude>15||decay<1||decay>127)throw Error('Invalid impact');shakes.push(sound,amplitude,decay|(both?0x80:0));}
 if(new Set(impacts.map(i=>i[0])).size!==impacts.length)throw Error('Duplicate impact sound');
 return{swaps:Uint8Array.from([...swaps,0]),shakes:Uint8Array.from([...shakes,0])};
}

export function patchTechJuice(base,allocate,add,allocateData=allocate){
 const entry=0x70004,expected=[0x4c,0x40,0x01,0xea];
 if(!expected.every((v,i)=>base[entry+i]===v))throw Error('Sound driver entry changed');
 const tables=techJuiceTables(),swaps=cartridgeDataAddress(allocateData(tables.swaps,'Technique sound swaps')),shakes=cartridgeDataAddress(allocateData(tables.shakes,'Impact shake table'));
 const long=(a,op,p)=>a.emit(op,p&255,p>>8&255,p>>16&255);
 const code=nativeRoutine(a=>{
  a.emit(0x08,0xe2,0x20,0x48);                       // PHP; SEP #$20; PHA
  a.emit(0xa3,5,0xc9,0xc1);a.branch(0xf0,'battle');a.emit(0xc9,0xcd);a.branch(0xf0,'battle'); // caller bank
  // Field events (opcode E8, JSL at C0:3C26): Puss meows where Frog croaked.
  a.emit(0xc9,0xc0);a.branch(0xd0,'done');a.emit(0xa3,3,0xc9,0x29);a.branch(0xd0,'done');a.emit(0xa3,4,0xc9,0x3c);a.branch(0xd0,'done');
  long(a,0xaf,0x7e1e01);a.emit(0xc9,FROG_CROAK);a.branch(0xd0,'done');a.emit(0xa9,CAT_MEOW);long(a,0x8f,0x7e1e01);
  a.label('done');a.emit(0x68,0x28);long(a,0x5c,0xc70140); // PLA; PLP; JML driver
  a.label('battle');long(a,0xaf,0x7e1e00);a.emit(0x29,0xfe,0xc9,0x18);a.branch(0xd0,'done');
  // Sound $3F is empty in both banks; sending it would still cut a sound
  // that is playing. A cue recast to it is dropped: clear the mailbox as the
  // driver does and return to the caller.
  long(a,0xaf,0x7e1e01);a.emit(0xc9,0x3f);a.branch(0xd0,'play');a.emit(0xa9,0);long(a,0x8f,0x7e1e00);a.emit(0x68,0x28,0x6b);
  a.label('play');
  a.emit(0xc2,0x10,0xda);                            // REP #$10; PHX
  long(a,0xaf,0x7eae91);a.emit(0xc9,3);a.branch(0xb0,'shake');
  long(a,0xaf,0x7eae92);a.emit(0xc9,2);a.branch(0xd0,'shake');
  a.emit(0xa2,0,0);
  a.label('swap');long(a,0xbf,swaps);a.branch(0xf0,'shake');long(a,0xcf,0x7eae93);a.branch(0xd0,'nextSwap');
  long(a,0xbf,swaps+1);long(a,0xcf,0x7e1e01);a.branch(0xd0,'nextSwap');
  long(a,0xbf,swaps+2);long(a,0x8f,0x7e1e01);a.branch(0x80,'shake');
  a.label('nextSwap');a.emit(0xe8,0xe8,0xe8);a.branch(0x80,'swap');
  a.label('shake');a.emit(0xa2,0,0);
  a.label('impact');long(a,0xbf,shakes);a.branch(0xf0,'none');long(a,0xcf,0x7e1e01);a.branch(0xf0,'hit');
  a.emit(0xe8,0xe8,0xe8);a.branch(0x80,'impact');
  a.label('none');a.emit(0xfa);a.longBranch('done');
  a.label('hit');
  long(a,0xbf,shakes+1);long(a,0x8f,0x7eccb6);        // amplitude
  a.emit(0xa9,0);long(a,0x8f,0x7eccb7);long(a,0x8f,0x7eccb4);long(a,0x8f,0x7eccb2);
  long(a,0xbf,shakes+2);a.emit(0x29,0x7f);long(a,0x8f,0x7eccb5);
  a.emit(0xa9,1);long(a,0x8f,0x7eccb3);
  long(a,0xbf,shakes+2);a.branch(0x10,'horizontal'); // bit 7: both axes
  long(a,0xbf,shakes+1);a.emit(0x4a,0x1a);long(a,0x8f,0x7eccbe); // vertical amplitude = half, at least 1
  a.emit(0xa9,0);long(a,0x8f,0x7eccbf);long(a,0x8f,0x7eccbc);long(a,0x8f,0x7eccba);
  long(a,0xbf,shakes+2);a.emit(0x29,0x7f);long(a,0x8f,0x7eccbd);
  a.emit(0xa9,1);long(a,0x8f,0x7eccbb);long(a,0x8f,0x7eccb8);
  a.emit(0xa9,0xfc);a.branch(0x80,'mask');
  a.label('horizontal');a.emit(0xa9,0xa8);
  a.label('mask');long(a,0x0f,0x7eccc0);long(a,0x8f,0x7eccc0); // ORA the layers already shaking
  a.emit(0xa9,1);long(a,0x8f,0x7eccb0);
  a.emit(0xfa);a.longBranch('done');                 // PLX
 });
 const address=allocate(code,'Battle sound and impact hook'),call=new Uint8Array(4);call[0]=0x5c;put24(call,1,cartridgeDataAddress(address));
 add(entry,call,'Battle sound and impact hook entry');
 return{entry,address,bytes:code.length,swaps:soundSwaps.length,impacts:impacts.length,tables:{swaps:swaps,shakes:shakes},extraVramBytes:0,extraWramBytes:0};
}
