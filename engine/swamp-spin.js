import {nativeRoutine} from './asm.js';
import {put24,put16,u16} from './rom.js';
import {encodeDialogue,dialogueLength} from './text.js';
import {compress,decompress} from './compression.js';
import {fartGraphics} from './swamp-spin-art.js';
import {sourceDialogueEvents} from '../content/dialogue-ownership.js';

// Cyclone's component record is also used by combination techs. Adapt only
// the live record for single tech 01, after the ordinary property copy. Its
// power, formula, targets, MP and all combo component records stay native.
export const fartTechs=[1,60,64];
export function patchSwampSpin(base,allocate,add,effects){
  const hooks=[];
  const description='Gas attack / 25% poison',desc=0xc0000+u16(base,0xc3a0b),help=encodeDialogue(description+'{null}',base);
  if(desc!==0xc3b0e||help.length>dialogueLength(base,desc))throw Error('Fart help slot changed');
  for(let i=0;i<128;i++)if(i!==1&&u16(base,0xc3a09+i*2)===(desc&65535))throw Error('Fart help slot is shared');
  add(desc,help,'Fart native tech description');
  function install(offset,expected,code,label){
    if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Fart boundary changed: '+label);
    const address=allocate(code,label+' routine'),call=new Uint8Array(expected.length).fill(0xea);call[0]=0x22;put24(call,1,address|0xc00000);add(offset,call,label);
    hooks.push({offset,address,bytes:code.length,label});
  }
  // FE marks this private probability operand. It is never written to a
  // shared effect table; validate that no source damage record uses it.
  for(const[start,count]of[[0xc213f,69],[0xc7ac9,256]])for(let i=0;i<count;i++){
    const p=start+i*12;if(base[p]===3&&base[p+1]===0xfe&&base[p+2]===0x40)throw Error('Fart status marker is already used');
  }
  install(0x1d5fd,[0xad,0xc7,0xb2,0xaa],nativeRoutine(a=>{
    a.emit(0x08,0xae,0xc3,0xb2,0xe0,0x0b,0x00);a.branch(0xd0,'nineLives');
    a.emit(0xa9,0xfe,0x8d,0xe7,0xae,0xa9,0x40,0x8d,0xe8,0xae);
    a.emit(0xad,0xed,0xae,0x09,0x04,0x8d,0xed,0xae);a.longBranch('original');
    a.label('nineLives');a.emit(0xad,0xe3,0x9e,0xc9,24);a.branch(0xf0,'hotCheck');a.emit(0xc9,39);a.branch(0xf0,'nineCheck');a.emit(0xc9,35);a.branch(0xf0,'milk35');a.emit(0xc9,38);a.branch(0xf0,'milk38');a.branch(0x80,'unrouted');
    a.label('hotCheck');a.emit(0xe0,0xfd,0x00);a.branch(0xf0,'hotRouted');a.longBranch('unrouted');
    a.label('hotRouted');for(let i=0;i<12;i++)a.emit(0xaf,(0x225f+i)&255,(0x225f+i)>>8,0xcc,0x8d,(0xaee6+i)&255,(0xaee6+i)>>8);a.longBranch('routedCost');
    a.label('nineCheck');a.emit(0xe0,0xb0,0x00);a.branch(0xd0,'checkCure');a.longBranch('routedCost');a.label('checkCure');a.emit(0xe0,0xa5,0x00);a.branch(0xd0,'unrouted');a.longBranch('routedCost');
    a.label('milk35');a.emit(0xe0,0x81,0x01);a.branch(0xd0,'unrouted');a.longBranch('routedCost');
    a.label('milk38');a.emit(0xe0,0xa2,0x01);a.branch(0xd0,'unrouted');a.longBranch('routedCost');
    a.label('unrouted');a.emit(0xe0,0xad,0x01);a.branch(0xf0,'selectProperties');a.longBranch('original');a.label('selectProperties');
    a.emit(0xad,0x2d,0xa6,0xc9,3);a.branch(0x90,'validTarget');a.longBranch('original');a.label('validTarget');
    a.emit(0xc2,0x20,0x29,255,0,0x0a,0x0a,0x0a,0x0a,0x0a,0x0a,0x0a,0xaa,0xbd,0x30,0x5e,0xe2,0x20);a.branch(0xf0,'copyLife');a.longBranch('original');a.label('copyLife');
    for(let i=0;i<12;i++)a.emit(0xaf,(0x21ff+i)&255,(0x21ff+i)>>8,0xcc,0x8d,(0xaee6+i)&255,(0xaee6+i)>>8);
    a.longBranch('original');
    a.label('routedCost');a.emit(0xad,0xe3,0x9e,0x85,0x0e,0xa9,5,0x85,0x10,0x64,0x11,0xc9,24);a.branch(0xf0,'hotCost');a.emit(0xc9,35);a.branch(0xd0,'milk2Cost');a.emit(0xa9,2,0x85,0x10);a.branch(0x80,'actorInit');
    a.label('hotCost');a.emit(0xa9,20,0x85,0x10);a.branch(0x80,'actorInit');
    a.label('milk2Cost');a.emit(0xc9,38);a.branch(0xd0,'actorInit');a.emit(0xa9,8,0x85,0x10);
    a.label('actorInit');a.emit(0xa2,0,0,0xa0,0,0);
    a.label('actorLoop');a.emit(0xa5,0x0e,0xc9,24);a.branch(0xf0,'hotScan');a.emit(0xc9,39);a.branch(0xf0,'nineScan');a.emit(0xbd,0xf4,0x93,0xc5,0x0e);a.branch(0xd0,'nextActor');a.branch(0x80,'checkActor');
    a.label('hotScan');a.emit(0xbd,0xf4,0x93,0xc9,23);a.branch(0xd0,'nextActor');a.branch(0x80,'checkActor');
    a.label('nineScan');a.emit(0xbd,0xf4,0x93,0xc9,16);a.branch(0xf0,'checkActor');a.emit(0xc9,15);a.branch(0xd0,'nextActor');
    a.label('checkActor');a.emit(0xbd,0xf5,0x93,0x29,0x40);a.branch(0xf0,'actorFound');
    a.label('nextActor');a.emit(0x8a,0x18,0x69,7,0xaa,0xc8,0xc0,3,0);a.branch(0xd0,'actorLoop');a.longBranch('original');
    a.label('actorFound');a.emit(0xb9,0x80,0x29,0xc2,0x20,0x29,255,0,0x0a,0x0a,0x0a,0x0a,0x85,0x0e,0x0a,0x0a,0x18,0x65,0x0e,0xaa,0xbd,0x2a,0x26,0x29,255,0,0xc9,0xa2,0);a.branch(0xf0,'halfCost');a.emit(0xc9,0xa3,0);a.branch(0xf0,'quarterCost');a.emit(0xa5,0x10);a.branch(0x80,'storeCost');
    a.label('halfCost');a.emit(0xa5,0x10,0x4a);a.branch(0x80,'storeCost');
    a.label('quarterCost');a.emit(0xa5,0x10,0x4a,0x69,0,0,0x4a,0x69,0,0);
    a.label('storeCost');a.emit(0x85,0x0e,0x98,0x29,255,0,0x0a,0x0a,0x0a,0x0a,0x0a,0x0a,0x0a,0xaa,0xbd,0x34,0x5e,0x38,0xe5,0x0e,0x9d,0x34,0x5e,0xe2,0x20);
    a.label('original');a.emit(0x28,0xad,0xc7,0xb2,0xaa,0x6b);
  }),'Fart poison and Nine Lives native properties');
  install(0x1e976,[0x7b,0xaa,0xa9,0x64],nativeRoutine(a=>{
    a.emit(0x08,0xa5,0x16,0xc9,0xfe);a.branch(0xd0,'original');
    a.emit(0xa5,0x18,0xc9,0x40);a.branch(0xd0,'original');
    // The original comparison is inclusive. A zero threshold against the
    // native RNG modulo four gives exactly 64 successes / 256 RNG states.
    // The stock modulo-100 roll would bias a nominal 25% toward 29.3%.
    a.emit(0x64,0x16,0x28,0x7b,0xaa,0xa9,0x04,0x6b);
    a.label('original');a.emit(0x28,0x7b,0xaa,0xa9,0x64,0x6b);
  }),'Fart native quarter-chance roll');
  // Three full rotations in the original sixteen animation ticks. The
  // 1/1/2 cadence is exact at 60 Hz; simply rounding 4/3 to one tick would
  // make it four times faster. Keep the original movement and effect clocks.
  // The raster model turns through front/right/back/left physical-strike
  // poses. Source frame127 is a thinking gesture, not a turning stance.
  const frames=allocate(Uint8Array.from([...Array.from({length:12},(_,i)=>[129,131,128,130][i%4]),255]),'Fart rotation frames');
  const durations=allocate(Uint8Array.from([1,1,2,1,1,2,1,1,2,1,1,2,0]),'Fart rotation durations');
  const long=(a,opcode,p)=>a.emit(opcode,p&255,p>>8&255,p>>16&255);
  const guard=a=>{
    a.emit(0x08,0xad,0x91,0xae,0xc9,3);a.branch(0xb0,'original');
    a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,'original');
    a.emit(0xad,0x93,0xae,0xc9,1);a.branch(0xd0,'original');
    a.emit(0xc2,0x20,0xb9,0xfe,0xa1,0xc9,0xcc,0xa8);a.branch(0xd0,'original');
    a.emit(0xb9,0xe8,0xa1,0xc9,0xcc,0x30);a.branch(0xd0,'original');
  };
  const original=a=>{a.label('original');a.emit(0x28,0x7b,0xbf,0,0,0xe4,0x6b);};
  install(0x142d0,[0xbf,0,0,0xe4],nativeRoutine(a=>{
    guard(a);a.emit(0x28,0x7b);long(a,0xbf,(durations|0xc00000)-0xa8cc);a.emit(0x6b);original(a);
  }),'Fart triple rotation clock');
  install(0x14300,[0xbf,0,0,0xe4],nativeRoutine(a=>{
    guard(a);a.emit(0x28,0xda,0xa6,0x80,0x7b,0xbd,0x3a,0xa1,0xaa);long(a,0xbf,frames|0xc00000);a.emit(0xfa,0x09,0,0x6b);
    // Puss's dedicated actor frame belongs only to his live Charm action.
    // Other characters, enemy actions and combination components use stock art.
    a.label('original');a.emit(0x28,0xad,0x91,0xae,0xc9,3);a.branch(0xb0,'stock');
    a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,'stock');a.emit(0xad,0x93,0xae,0xc9,36);a.branch(0xf0,'bigEyes');a.emit(0xc9,81);a.branch(0xd0,'stock');a.label('bigEyes');
    a.emit(0xda,0xad,0x91,0xae,0xaa,0xbd,0xff,0xae,0xc9,4);a.branch(0xd0,'stockPopped');
    a.emit(0xfa,0xa9,226,0x09,0,0x6b);
    a.label('stockPopped');a.emit(0xfa);a.label('stock');a.emit(0x7b,0xbf,0,0,0xe4,0x6b);
  }),'Fart rotation frames and Puss Charm big eyes');
  install(0x1430a,[0xa9,2,0x8d,0x12,0xa0],nativeRoutine(a=>{
    a.emit(0x08,0xc2,0x20,0x48,0xe2,0x20,0xda,0xad,0x91,0xae,0xc9,3);a.branch(0xb0,'original');
    a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,'original');
    a.emit(0xad,0x93,0xae,0xc9,1);a.branch(0xd0,'original');
    a.emit(0x7b,0xad,0x79,0x96,0x0a,0xaa,0xc2,0x20,0xbd,0xfe,0xa1,0xc9,0xcc,0xa8);a.branch(0xd0,'original');
    a.emit(0xbd,0xe8,0xa1,0xc9,0xcc,0x30);a.branch(0xd0,'original');
    a.emit(0xfa,0xc2,0x20,0x68,0x28,0xa9,1,0x8d,0x12,0xa0,0x6b);
    a.label('original');a.emit(0xfa,0xc2,0x20,0x68,0x28,0xa9,2,0x8d,0x12,0xa0,0x6b);
  }),'Fart per-frame sprite scheduling');
  const gfx=fartGraphics(),tiles=allocate(gfx.tiles,'Fart gas cloud tiles');
  const active=a=>{
    a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0xb0,'original');
    a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,'original');
    // Fart, and the combinations that spin Shrek through the same wind effect.
    a.emit(0xad,0x93,0xae);for(const t of fartTechs.slice(0,-1)){a.emit(0xc9,t);a.branch(0xf0,'gassy');}a.emit(0xc9,fartTechs.at(-1));a.branch(0xd0,'original');a.label('gassy');
  };
  const sourceFramePointer=0x110000+u16(base,0x1100a0),assembly=decompress(base,sourceFramePointer).bytes;
  if(sourceFramePointer!==0x11268e||assembly.length!==52)throw Error('Fart source effect layout changed');
  // Reuse Shrek's green colors in whichever native party palette owns him.
  // No palette is overwritten, so a third party member keeps all its colors.
  const assemblies=Array.from({length:3},(_,slot)=>{
    const data=assembly.slice();for(let frame=0;frame<4;frame++)for(let cell=0;cell<4;cell++)data[frame*13+4+cell*2]|=(5+slot)*2;
    return allocate(compress(data),'Fart native cloud cell layout slot '+slot);
  });
  effects.push({tech:1,name:'Fart',chunkFirst:218,chunks:2,format:'4bpp',tiles,sourceAssembly:sourceFramePointer&65535,assemblies,hooks});
  // Flaming Fart (Fire Whirl) decodes the same wind chunks: it gets the gas too.
  // (Mega Fart, Max Cyclone, already has its own effect art; it shares the buzz.)
  for(const[tech,name]of[[60,'Flaming Fart']])effects.push({tech,name,chunkFirst:218,chunks:2,format:'4bpp',tiles,sourceAssembly:sourceFramePointer&65535,assemblies,hooks:[]});
  // A twelve-byte falling buzz fits the verified padding in both native
  // sound banks. It uses a resident sample and ends at the source stop cue.
  const soundId=253,sound=Uint8Array.of(0xdc,4,0xd6,2,0xc8,6,0xf8,0xe2,0,7,0xe3,0xeb),soundPointer=0x46f4;
  for(const[,p]of sourceDialogueEvents){if(p===0x3afaa0)continue;const e=decompress(base,p).bytes;for(let i=1+e[0]*32;i<e.length-1;i++)if(e[i]===0xe8&&e[i+1]===soundId)throw Error('Fart sound slot has an event owner');}
  for(let p=0xe0000;p<0xea954-1;p++)if(base[p]===0x78&&base[p+1]===soundId)throw Error('Fart sound slot has an animation owner');
  for(const block of[0x7430b,0x75b0d]){
    if(u16(base,block+soundId*4)||u16(base,block+soundId*4+2)||!base.slice(block+0x17f4,block+0x1800).every(v=>v===255))throw Error('Fart sound padding is occupied');
    const ptr=new Uint8Array(2);put16(ptr,0,soundPointer);add(block+soundId*4,ptr,'Fart native sound pointer');add(block+0x17f4,sound,'Fart native falling buzz');
  }
  install(0x1619f,[0xb7,0xe6,0x8d,1,0x1e],nativeRoutine(a=>{
    a.emit(0x08,0xb7,0xe6,0xc9,0x91);a.branch(0xd0,'original');active(a);
    a.emit(0x28,0xa9,soundId,0x8d,1,0x1e,0x6b);
    a.label('original');a.emit(0x28,0xb7,0xe6,0x8d,1,0x1e,0x6b);
  }),'Fart isolated native sound');
  return{tech:1,name:'Fart',description,poisonChance:0.25,poisonBit:0x40,poisonImmunity:'native',damage:'source Cyclone',mp:'source Cyclone',combos:'unchanged',rotation:{frames,durations,cycles:3,ticks:16},graphics:{tiles,palette:'native Shrek party palette',assemblies,bytes:gfx.tiles.length,cells:4},sound:{id:soundId,spcAddress:soundPointer,bytes:sound.length,extraSamples:0},hooks,extraVramBytes:0,extraWramBytes:0,animation:'native triple-speed rotation, gas clouds and falling buzz'};
}
