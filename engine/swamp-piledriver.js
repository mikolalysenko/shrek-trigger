import {nativeRoutine} from './asm.js';
import {put16,put24,u16} from './rom.js';

const START=0xe0bb2,END=0xe0c87,NEXT=0xe0c94,CONFIG=0xd45a6+4*7;
const sourceConfig=[4,214,0,39,4,4,255],throwConfig=[44,97,0,1,0,0,255];
const sourceHeader=[0x90,0x80,0x90,0x80,0xc2,0x0b,0x13,0x0c,0x1f,0x0c,0x3c,0x0c,0x87,0x0c,0x8c,0x0c];
const matches=(base,p,bytes)=>bytes.every((v,i)=>base[p+i]===v);

// Native animation channels share counter B. The target first rises into
// Shrek's hands, then both actors jump. Only Shrek cycles through the four
// original rising-strike directions; no extra sprite or effect tiles load.
const rotation=[0x72,0x16,6,0x39,0x20,4,0x72,0x15,6,0x39,0x20,4,
 0x72,0x17,6,0x39,0x20,4,0x72,0x14,6,0x39,0x20,4];
const approach=[0x0b,2,6,0x12,0x13,0x12,0x28,0x72,0x14,6,0x39];
const returnHome=counter=>[0xd1,0x0c,0x1e,0x2a,3,3,0x24,counter,0x2e,1,0];
const liftCaster=[...approach,0x36,0x24,2,0xd0,0x78,0x6b,0xc4,0xe0,0xfc,0x36,
 ...rotation,0x72,0x15,6,0x39,0x36,0xc4,0,8,6,3,0x24,5,0x20,10,...returnHome(6)];
const liftTarget=[0x24,1,0xd9,0x30,3,5,0xd0,0xc4,0xf0,0xff,0x36,
 0xc4,0xd0,0xfc,0x24,3,0x24,4,0xc4,0,8,0x78,0x6c,
 0x85,0xc0,0x80,0x45,0x83,0x20,0,0,0xd8,10,3,15,0x36,
 0x20,10,0x1e,0,0x80,0x51,0xda,0xd1,0x36,0];
// Anchored enemies never receive movement/height commands. The native hit
// subscript still displays the already computed Spincut damage or miss.
// Large fixed/background bodies can occlude a caster standing at their root.
// Use the native 7:1 caster/target point for this ground-slam variant; its impact still
// belongs to the original anchored target, which never moves or shrinks.
const anchorApproach=[0x0b,2,6,0x12,0x24,0x72,0x14,6,0x39];
const anchorCaster=[...anchorApproach,0xd0,0x78,0x6b,0xc4,0xe0,0xfc,...rotation,
 0x72,0x15,6,0x39,0xc4,0,8,6,3,0x36,0x20,10,...returnHome(2)];
const anchorTarget=[0x24,1,0x78,0x6c,0x80,0x45,0x83,0x20,0,0,0x1e,0,0x80,0x51,0x36,0];

export function swampPiledriverScene(base){
 // CE:0C87 is shared by source animation packages 25, 27 and 30. Preserve
 // that fragment and the rest of the tail through the next header at 0C94.
 if(u16(base,0xd5ef0+8)!==(START&65535)||u16(base,0xd5ef0+10)!==(NEXT&65535)||!matches(base,START,sourceHeader))throw Error('Swamp Piledriver source scene changed');
 const owned=p=>p>=(START&65535)&&p<(END&65535);
 for(let id=0;id<128;id++){
  const p=u16(base,0xd5ef0+id*2),header=0xe0000+p;
  if(id!==4&&owned(p))throw Error('Swamp Piledriver scene has another header owner');
  let count=0;for(let i=0;i<4;i++)for(let n=base[header+i];n;n>>=1)count+=n&1;
  for(let slot=0;slot<count;slot++)if(id!==4&&owned(u16(base,header+4+slot*2)))throw Error('Swamp Piledriver scene has another channel owner');
  if(owned(u16(base,0xe0000+id*2)))throw Error('Swamp Piledriver scene is a shared subscript');
  if(id!==4&&base[0xd45a6+id*7]===4)throw Error('Swamp Piledriver animation has another tech owner');
 }
 const bytes=[0x90,0,0x90,0,0,0,0,0,0,0,0,0];
 for(const[i,program]of[liftCaster,liftTarget,anchorCaster,anchorTarget].entries()){
  put16(bytes,4+i*2,(START&65535)+bytes.length);bytes.push(...program);
 }
 if(START+bytes.length>END)throw Error('Swamp Piledriver exceeds its original scene');
 return Uint8Array.from(bytes);
}

export function piledriverTargetAnchored(category,size){return!!((category&0x62)||(size&0xfe));}

export function patchSwampPiledriver(base,allocate,add){
 if(!matches(base,CONFIG,sourceConfig)||!matches(base,0xd45a6+44*7,throwConfig))throw Error('Swamp Piledriver source resources changed');
 const offset=0x14617,expected=[0xbf,0xf0,0x5e,0xcd];
 if(!matches(base,offset,expected))throw Error('Swamp Piledriver native selection boundary changed');
 const code=nativeRoutine(a=>{
  // Entry M=0, X=0, DB=7E. Keep X/P and leave the original LDA result and
  // flags intact. Only A0B3, the existing alternate-scene selector, changes.
  a.emit(0x08,0xda,0xe2,0x20,0xad,0x91,0xae,0xc9,3);a.branch(0xb0,'done');
  a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,'done');
  // Both wrestling techs use the same native selector. Other actions retain
  // the source alternate-scene flag, including its original miss handling.
  a.emit(0xad,0x93,0xae,0xc9,4);a.branch(0xf0,'classify');
  a.emit(0xc9,7);a.branch(0xd0,'done');a.label('classify');
  a.emit(0xad,0xcc,0xae,0xc9,3);a.branch(0x90,'anchor');a.emit(0xc9,11);a.branch(0xb0,'anchor');
  // Source work-record category: flying or either immovable boss tier.
  a.emit(0xc2,0x20,0x29,0xff,0,0xeb,0x4a,0xaa,0xe2,0x20,0xbd,0x46,0x5e,0x29,0x62);a.branch(0xd0,'anchor');
  // Read the current cartridge header, including replacement sprite sizes.
  // Four/eight-cell regular actors may lift; larger/special layouts anchor.
  a.emit(0xbd,0x2d,0x5e,0xc2,0x20,0x29,0xff,0,0x0a,0x48,0x0a,0x0a,0x18,0x63,1,0xaa,0x68,0xe2,0x20,0xbf,4,0xf6,0xe4,0x29,0xfe);a.branch(0xf0,'done');
  a.label('anchor');a.emit(0xc2,0x20,0xa9,0x40,0,0x8d,0xb3,0xa0);
  a.label('done');a.emit(0xc2,0x20,0xfa,0x28,0xbf,0xf0,0x5e,0xcd,0x6b);
 });
 const address=allocate(code,'Native wrestling target classifier (techs 4 and 7)'),call=Uint8Array.of(0x22,0,0,0);put24(call,1,address|0xc00000);
 add(offset,call,'Native wrestling scene selection');
 const scene=swampPiledriverScene(base);
 add(CONFIG,Uint8Array.of(4,...throwConfig.slice(1)),'Swamp Piledriver resident animation resources');
 add(START,scene,'Swamp Piledriver native lift and anchored choreography');
 return{tech:4,name:'Swamp Piledriver',damage:'source Spincut',targets:'source one enemy',mp:'source Spincut',status:'unchanged',script:START,scriptBytes:scene.length,sourceScriptBytes:END-START,
  animation:'grab, paired jump, Shrek somersault, slam and native return; anchored target fallback',
  anchored:'native category & 0x62, sprite size & 0xFE, or original miss branch',
  sound:{ids:[0x6b,0x6c],extraSamples:0},hooks:[{offset,address,bytes:code.length,label:'native target classifier',techs:[4,7]}],extraRomBytes:code.length,extraVramBytes:0,extraWramBytes:0};
}
