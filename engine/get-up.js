import {u16} from './rom.js';
import {encodeDialogue,dialogueLength} from './text.js';

const START=0xe0e12,END=0xe0e34,HEADER=0xe0e02,CONFIG=0xd45a6+6*7;
const sourceHeader=[144,224,128,0,18,14,52,14,57,14,92,14,122,14,133,9];
const sourceCaster=[114,13,2,36,32,120,6,29,32,20,120,137,2,16,61,3,52,27,54,32,200,54,36,2,52,26,6,29,80,32,20,46,1,0];
const same=(rom,p,bytes)=>bytes.every((v,i)=>rom[p+i]===v);

export function getUpScene(base){
 if(u16(base,0xd5ef0+12)!==(HEADER&65535)||!same(base,HEADER,sourceHeader)||!same(base,START,sourceCaster))throw Error('Get Up source scene changed');
 const owned=p=>p>=(START&65535)&&p<(END&65535);
 for(let id=0;id<128;id++){
  const p=u16(base,0xd5ef0+id*2),header=0xe0000+p;
  if(id!==6&&owned(p))throw Error('Get Up caster has another header owner');
  let count=0;for(let byte=0;byte<4;byte++)for(let v=base[header+byte];v;v>>=1)count+=v&1;
  for(let slot=0;slot<count;slot++)if(id!==6&&owned(u16(base,header+4+slot*2)))throw Error('Get Up caster has another channel owner');
  if(owned(u16(base,0xe0000+id*2)))throw Error('Get Up caster is a shared subscript');
  if(id!==6&&base[0xd45a6+id*7]===6)throw Error('Get Up animation has another tech owner');
 }
 // Keep Life's complete timing, effect counters, target revival and cleanup.
 // Only the caster's facing, closed-eye inhale, mouth loop and cue change.
 const scene=Uint8Array.from(sourceCaster);
 scene[1]=0x15;scene[2]=3;scene[3]=0x21;scene[11]=0xc5;scene[13]=0x1a;
 return scene;
}

export function patchGetUp(base,add){
 if(!same(base,CONFIG,[6,225,2,27,6,6,29]))throw Error('Get Up source resources changed');
 const scene=getUpScene(base),description='Wake fallen ally',pointer=u16(base,0xc3a09+12),address=0xc0000+pointer,help=encodeDialogue(description+'{null}',base);
 if(address!==0xc3b52||help.length>dialogueLength(base,address))throw Error('Get Up help slot changed');
 for(let id=0;id<128;id++)if(id!==6&&u16(base,0xc3a09+id*2)===pointer)throw Error('Get Up help slot is shared');
 for(const bank of[0x7430b,0x75b0d])if(!u16(base,bank+0xc5*4))throw Error('Get Up resident roar is missing');
 add(START,scene,'Get Up native wake-up roar and mouth animation');
 add(address,help,'Get Up native revival help');
 return{tech:6,name:'Love & Life',description,healing:'source Life',targets:'source fallen ally',mp:'source Life',status:'source revival',script:START,scriptBytes:scene.length,sourceScriptBytes:END-START,changedCasterBytes:5,graphics:'existing native Life revival effect',sound:{ids:[0xc5,0xad],extraSamples:0},hooks:[],extraRomBytes:0,extraVramBytes:0,extraWramBytes:0,animation:'native closed-eye inhale, ogre wake-up roar, mouth loop and original revival effect'};
}
