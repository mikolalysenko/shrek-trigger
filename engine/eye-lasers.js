import {nativeRoutine} from './asm.js';
import {put24,u16} from './rom.js';
import {compress,decompress} from './compression.js';
import {encodeDialogue,dialogueLength} from './text.js';
import {eyeLaserGraphics} from './eye-lasers-art.js';

export function patchEyeLasers(base,allocate,add,effects){
  const hooks=[],config=0xd45a6+2*7,description='Eye lasers';
  if(![2,232,236,33,2,2,255].every((v,i)=>base[config+i]===v))throw Error('Eye Lasers source animation changed');
  const desc=0xc0000+u16(base,0xc3a0d),help=encodeDialogue(description+'{null}',base);
  if(desc!==0xc3b21||help.length>dialogueLength(base,desc))throw Error('Eye Lasers help slot changed');
  for(let i=0;i<128;i++)if(i!==2&&u16(base,0xc3a09+i*2)===(desc&65535))throw Error('Eye Lasers help slot is shared');
  add(desc,help,'Eye Lasers native help');
  // Reuse the cartridge's fire color cycle. Its four groups occupy only the
  // reserved effect palette. No party or enemy palette is replaced.
  if(u16(base,0xd692c+17*2)!==0xef3b||![6,0,6,1,6,2,6,3].every((v,i)=>base[0xdef3b+i]===v))throw Error('Eye Lasers native color ramp changed');
  add(config+4,Uint8Array.of(17),'Eye Lasers warm native colors');
  add(config+2,Uint8Array.of(0),'Eye Lasers omit unused second graphics upload');
  for(const offset of[0xe09bd,0xe09c2]){
    if(base[offset]!==0x32)throw Error('Eye Lasers caster script changed');
    add(offset,Uint8Array.of(0x10),'Eye Lasers focus pose');
  }
  const gfx=eyeLaserGraphics(),tiles=allocate(gfx.packed,'Eye Lasers two-plane tiles');
  const sourceAssembly=0x110000+u16(base,0x110060+33*2);
  if(sourceAssembly!==0x1126c4||decompress(base,sourceAssembly).bytes.length!==131)throw Error('Eye Lasers source cell layout changed');
  const assembly=allocate(compress(gfx.assembly),'Eye Lasers native cell layout');
  effects.push({tech:2,name:'Eye Lasers',chunkFirst:232,chunks:4,format:'2bpp',tiles,sourceAssembly:sourceAssembly&65535,assemblies:[assembly],hooks});
  const active=a=>{
    a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0xb0,'original');
    a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,'original');
    a.emit(0xad,0x93,0xae,0xc9,2);a.branch(0xd0,'original');
  };
  const install=(offset,expected,code,label)=>{
    if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Eye Lasers boundary changed: '+label);
    const address=allocate(code,label+' routine'),call=new Uint8Array(expected.length).fill(0xea);call[0]=0x22;put24(call,1,address|0xc00000);add(offset,call,label);hooks.push({offset,address,bytes:code.length,label});
  };
  // Bind the SAME short flame animation to every native secondary target.
  // The engine draws it before each target's body, avoiding both hidden
  // flames and extra animation slots. A3DF is reset by normal action setup.
  install(0x1608b,[0x9d,0xdf,0xa3,0xa9,2],nativeRoutine(a=>{
    a.emit(0x9d,0xdf,0xa3,0x08);active(a);a.emit(0xad,0xb6,0xa2,0xc9,5);a.branch(0xd0,'original');
    a.emit(0xda,0x5a,0xa0,0,0,0x7b);a.label('target');a.emit(0xb9,0x18,0xa0,0xc9,3);a.branch(0x90,'done');a.emit(0xc9,11);a.branch(0xb0,'done');
    a.emit(0xaa,0xa9,0x85,0x9d,0x16,0xa4,0xc8,0xc0,7,0);a.branch(0xd0,'target');
    a.label('done');a.emit(0x7a,0xfa);a.label('original');a.emit(0x28,0xa9,2,0x6b);
  }),'Eye Lasers target flame bindings');
  // At this boundary X still identifies the parent (effect*11+battler).
  // Re-anchor only the shared flame's existing visual coordinates. Neither
  // the target's real position nor the line/damage target list is modified.
  install(0xfeef0,[0xbd,0xdf,0xa3,0x29,7],nativeRoutine(a=>{
    a.emit(0x08);active(a);a.emit(0xe0,55,0);a.branch(0x90,'original');a.emit(0xe0,66,0);a.branch(0xb0,'original');
    a.emit(0xda,0xc2,0x20,0x8a,0x38,0xe9,55,0,0xaa,0x7b,0xe2,0x20);
    a.emit(0xbd,0x0c,0x1d,0x8d,0x4a,0xa2,0x9c,0x4b,0xa2,0xbd,0x23,0x1d,0x8d,0x5a,0xa2,0x9c,0x5b,0xa2,0xfa);
    a.label('original');a.emit(0x28,0xbd,0xdf,0xa3,0x29,7,0x6b);
  }),'Eye Lasers native flame parent');
  install(0xfef1b,[0xbd,0xc0,0xa2,0x29,0x3f],nativeRoutine(a=>{
    a.emit(0x08);active(a);a.emit(0xe0,6,0);a.branch(0x90,'adapt');
    a.label('original');a.emit(0x28,0xbd,0xc0,0xa2,0x29,0x3f,0x6b);
    a.label('adapt');a.emit(0xe0,5,0);a.branch(0xf0,'flame');
    a.emit(0xc2,0x20,0xb9,0x40,0xa2,0x38,0xe9,8,0,0x85,0xcc,0xb9,0x50,0xa2,0x38,0xe9,33,0,0x85,0xce,0x7b,0xe2,0x20,0xda,0xad,0x91,0xae,0xaa);
    a.emit(0xbd,0xdb,0x96,0xc9,2);a.branch(0xf0,'left');a.emit(0xc9,3);a.branch(0xf0,'right');a.branch(0x80,'angle');
    a.label('left');a.emit(0xc2,0x20,0xa5,0xcc,0x38,0xe9,4,0,0x85,0xcc);a.branch(0x80,'angle');
    a.label('right');a.emit(0xc2,0x20,0xa5,0xcc,0x18,0x69,3,0,0x85,0xcc);
    a.label('angle');a.emit(0x7b,0xe2,0x20,0xbd,0xaa,0xa5,0x18,0x69,8,0x4a,0x4a,0x4a,0x4a,0xfa,0x28,0x29,0x3f,0x6b);
    a.label('flame');a.emit(0xc2,0x20,0xb9,0x40,0xa2,0x38,0xe9,8,0,0x85,0xcc,0xb9,0x50,0xa2,0x38,0xe9,16,0,0x85,0xce,0x7b,0xe2,0x20,0xbd,0xc0,0xa2,0x29,31,0x18,0x69,11,0x28,0x29,0x3f,0x6b);
  }),'Eye Lasers directional native cells');
  return{tech:2,name:'Eye Lasers',description,damage:'source Slash',element:'Air',targets:'source line',mp:'source Slash',status:'unchanged',graphics:{tiles,storedBytes:gfx.packed.length,decodedBytes:gfx.tiles.length,assembly,angles:16,flames:4,cellsPerEffect:1,palette:'native fire effect ramp'},hooks,extraVramBytes:0,extraWramBytes:0,animation:'native paired beams and per-target flame flashes'};
}
