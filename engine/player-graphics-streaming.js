import {nativeRoutine} from './asm.js';

// At C0:E6B6: M=8, X=16, DP is the native field page, DB is unchanged.
// X=source address, Y=destination in7F, DP CD:CF=source pointer, D0=destination,
// C5=the caller's saved Y. The standard D2/D3/D4/7F paths already branched away.
// The generic path preserves X, DB, DP and stack depth, then reuses the native
// epilogue to advance the WRAM port32bytes and restore Y. It allocates no RAM.
export function playerGraphicsStreamingCode(){
  return nativeRoutine(a=>{
    a.emit(0xc9,1);a.branch(0xd0,'generic'); // original dispatch leaves D5-D4=1
    a.emit(0x8b,0xa9,0x7f,0x48,0x5c,0xba,0xe6,0xc0); // original fast D5 path
    a.label('generic');
    a.emit(0xda,0xc2,0x20,0x8a,0x38,0xe5,0xcd,0xa8,0xa6,0xd0);
    for(let word=0;word<16;word++)a.emit(0xb7,0xcd,0x9f,word*2,0,0x7f,0xc8,0xc8);
    a.emit(0xa4,0xd0,0xfa,0x5c,0x2e,0xe7,0xc0);
  });
}

export function patchPlayerGraphicsStreaming(base,allocate,add){
  const offset=0xe6b6,expected=[0x8b,0xa9,0x7f,0x48];
  if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Player tile copier boundary changed');
  const bytes=playerGraphicsStreamingCode(),address=allocate(bytes,'player extended-bank tile copier');
  add(offset,Uint8Array.of(0x5c,address&255,address>>8&255,0xc0|address>>16),'player extended-bank tile copier entry');
  return{entry:offset,address,bytes:bytes.length,extraWramBytes:0,extraVramBytes:0};
}
