import {nativeRoutine} from './asm.js';
import {put24,u16} from './rom.js';
import {encodeDialogue,dialogueLength} from './text.js';

export const NINE_LIVES_TECH=39;
export const LIFE_II_PROPERTY=0xcc21ff;

export function patchNineLives(base,allocate,add){
 const target=0xc1acd+(39-1)*2,description='Heal or revive ally',pointer=u16(base,0xc3a09+39*2),helpAddress=0xc0000+pointer,help=encodeDialogue(description+'{null}',base);
 if(help.length>dialogueLength(base,helpAddress))throw Error('Nine Lives help slot changed');
 for(let id=0;id<128;id++)if(id!==39&&u16(base,0xc3a09+id*2)===pointer)throw Error('Nine Lives help slot is shared');
 add(target,Uint8Array.of(0x83,0),'Nine Lives unified living and fallen ally target');
 add(helpAddress,help,'Nine Lives native help');
 const hooks=[],offset=0x10dbb,expected=[0x8d,0xe4,0x9e,0xbd,0x82,0x1a];
 if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Nine Lives target boundary changed');
 const code=nativeRoutine(a=>{
  a.emit(0x8d,0xe4,0x9e,0xbd,0x82,0x1a,0x48,0xda);
  a.emit(0xad,0xe3,0x9e,0xc9,39);a.branch(0xd0,'done');
  a.emit(0xad,0x30,0x5e,0x0d,0x31,0x5e);a.branch(0xf0,'done');
  a.emit(0xad,0xb0,0x5e,0x0d,0xb1,0x5e);a.branch(0xf0,'done');
  a.emit(0xad,0x30,0x5f,0x0d,0x31,0x5f);a.branch(0xf0,'done');
  a.emit(0xa9,128,0x8d,0xe4,0x9e);
  a.label('done');a.emit(0xfa,0x68,0x6b);
 });
 const address=allocate(code,'Nine Lives living/fallen target selector'),call=Uint8Array.of(0x22,0,0,0,0xea,0xea);put24(call,1,address|0xc00000);add(offset,call,'Nine Lives native target-mode selection');hooks.push({offset,address,bytes:code.length});
 const routeOffset=0x1170e,routeExpected=[0xa5,0x84,0x9d,0xf4,0x93];
 if(!routeExpected.every((v,i)=>base[routeOffset+i]===v))throw Error('Nine Lives command-queue boundary changed');
 const routeCode=nativeRoutine(a=>{
  // Farquaad's Some May Die (tech 56, queued from party slot X = slot*7):
  // "a sacrifice I am willing to make" leaves each other ally with 1 HP.
  // $80 is the command class: $20 for a technique. Attacks and items reuse $84.
  a.emit(0xa5,0x80,0x29,0x20);a.branch(0xf0,'original');
  a.emit(0xa5,0x84,0xc9,56);a.branch(0xd0,'nineLives');a.emit(0xe0,21,0);a.branch(0xb0,'nineLives');
  a.emit(0x08,0xc2,0x20);
  for(let slot=0;slot<3;slot++){const hp=0x5e30+slot*128;a.emit(0xe0,slot*7,0);a.branch(0xf0,'spared'+slot);a.emit(0xad,hp&255,hp>>8,0xc9,2,0);a.branch(0x90,'spared'+slot);a.emit(0xa9,1,0,0x8d,hp&255,hp>>8);a.label('spared'+slot);}
  a.emit(0x28);a.branch(0x80,'original');
  a.label('nineLives');a.emit(0xa5,0x84,0xc9,39);a.branch(0xd0,'original');
  a.emit(0xad,0x2d,0xa6,0xc9,3);a.branch(0xb0,'original');
  a.emit(0xda,0xc2,0x20,0x29,255,0,0x0a,0x0a,0x0a,0x0a,0x0a,0x0a,0x0a,0xaa,0xbd,0x30,0x5e,0xe2,0x20);a.branch(0xf0,'fallen');
  a.emit(0xfa,0xa9,15);a.branch(0x80,'store');
  a.label('fallen');a.emit(0xfa,0xa9,16);
  a.label('store');a.emit(0x9d,0xf4,0x93,0x6b);
  a.label('original');a.emit(0xa5,0x84,0x9d,0xf4,0x93,0x6b);
 });
 const routeAddress=allocate(routeCode,'Nine Lives native command-queue routing'),routeCall=Uint8Array.of(0x22,0,0,0,0xea);put24(routeCall,1,routeAddress|0xc00000);add(routeOffset,routeCall,'Nine Lives native command-queue routing hook');hooks.push({offset:routeOffset,address:routeAddress,bytes:routeCode.length});
 return{tech:39,name:'Nine Lives',description,living:'source Cure II',fallen:'source Life II',target:'one living or fallen ally',mp:'source Cure II',scene:'source Cure II / Life II by target',hooks,extraVramBytes:0,extraWramBytes:0};
}
