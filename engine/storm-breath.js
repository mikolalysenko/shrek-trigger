import {u16} from './rom.js';
import {encodeDialogue,dialogueLength} from './text.js';

const START=0xe0cb0,END=0xe0cdd,HEADER=0xe0c94,CONFIG=0xd45a6+5*7;
const sourceCaster=[2,38,12,48,30,128,48,31,128,208,217,48,39,153,2,26,114,21,6,29,32,20,54,120,124,3,16,36,2,52,27,120,123,34,27,0,30,45,218,40,36,3,46,1,0];
const sourceHeader=[152,255,128,0,176,12,221,12,234,12,243,12,25,13,57,13,90,13,124,13,157,13,191,13,224,13,133,9];
const same=(rom,p,bytes)=>bytes.every((v,i)=>rom[p+i]===v);

export function stormBreathScene(base){
 if(u16(base,0xd5ef0+10)!==(HEADER&65535)||!same(base,HEADER,sourceHeader)||!same(base,START,sourceCaster))throw Error('Storm Breath source scene changed');
 // Royal Gale and other scenes share the later effect/target channels. Only
 // Shrek's 45-byte caster prefix is owned here; their addresses stay exact.
 const owned=p=>p>=(START&65535)&&p<(END&65535);
 for(let id=0;id<128;id++){
  const p=u16(base,0xd5ef0+id*2),header=0xe0000+p;
  if(id!==5&&owned(p))throw Error('Storm Breath caster has another header owner');
  let count=0;for(let byte=0;byte<4;byte++)for(let n=base[header+byte];n;n>>=1)count+=n&1;
  for(let slot=0;slot<count;slot++)if(id!==5&&owned(u16(base,header+4+slot*2)))throw Error('Storm Breath caster has another channel owner');
  if(owned(u16(base,0xe0000+id*2)))throw Error('Storm Breath caster is a shared subscript');
  if(id!==5&&base[0xd45a6+id*7]===5)throw Error('Storm Breath animation has another tech owner');
 }
 return Uint8Array.from([
  0x3d,9,0x72,0x15,0x03,0x21,0x20,12, // Face the scene and inhale.
  0x78,0xc5,0x02,0x1a,0x36, // Roar with looping mouth poses; release sparks.
  0x24,2,0x34,0x1b,0x78,0x7b, // Original spark completion starts the storm.
  0x22,0x1b,0,0x03,0x1a, // Wait for the original background cleanup.
  0x24,3,0x2e,1,0 // Preserve target-channel completion and ordinary return.
 ]);
}

export function patchStormBreath(base,add){
 if(!same(base,CONFIG,[5,241,0,34,5,3,2]))throw Error('Storm Breath source resources changed');
 const scene=stormBreathScene(base);if(START+scene.length>END)throw Error('Storm Breath exceeds its exclusive caster prefix');
 const description='Air storm on all',pointer=u16(base,0xc3a09+10),address=0xc0000+pointer,help=encodeDialogue(description+'{null}',base);
 if(address!==0xc3b43||help.length>dialogueLength(base,address))throw Error('Storm Breath help slot changed');
 for(let id=0;id<128;id++)if(id!==5&&u16(base,0xc3a09+id*2)===pointer)throw Error('Storm Breath help slot is shared');
 for(const bank of[0x7430b,0x75b0d])for(const id of[0xc5,0x7b])if(!u16(base,bank+id*4))throw Error('Storm Breath resident sound is missing');
 add(START,scene,'Storm Breath native planted roar and storm choreography');
 add(address,help,'Storm Breath native Air help');
 return{tech:5,name:'Storm Breath',description,damage:'source Lightning II',element:'Air',targets:'source all enemies',mp:'source Lightning II',status:'unchanged',script:START,scriptBytes:scene.length,sourceScriptBytes:END-START,graphics:'existing native Lightning II sparks and storm',sound:{ids:[0xc5,0x7b],extraSamples:0},hooks:[],extraRomBytes:0,extraVramBytes:0,extraWramBytes:0,animation:'native planted inhale and roar, mouth phases, sparks, storm and original cleanup'};
}
