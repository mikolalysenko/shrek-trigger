import {u16} from './rom.js';
import {elementHelp} from '../content/elements.js';

const CONFIG=0xd45a6+3*7,START=0xe0a64,END=0xe0bb2;
const sourceConfig=[3,241,0,34,3,3,69];
const sourceHeader=[0x90,0xfc,0x80,0,0x7a,0x0a,0xa1,0x0a,0xa8,0x0a,0xdd,0x0a,0x0d,0x0b,0x44,0x0b,0x7a,0x0b,0x96,0x0b,0x85,9];
const waveConfig=[18,201,205,21,18,18,7];
const waveCaster=[0x3d,9,0x72,0x15,3,0x21,0x34,0x1b,0x78,0x92,2,0x39,0x20,100,0x34,0x1a,0x20,10,3,0x1a,3,0x1a,6,3,0x2e,1,0];
const matches=(base,p,bytes)=>bytes.every((v,i)=>base[p+i]===v);

// Keep this single-tech scene in Lightning's original, exclusively owned
// program. Hypno Wave supplies existing shockwave art and native BG cleanup;
// its shared script and the sleep/status records are never changed or used.
export function ogreRoarScene(base){
  if(u16(base,0xd5ef0+6)!==(START&65535)||u16(base,0xd5ef0+8)!==(END&65535)||!matches(base,START,sourceHeader))throw Error('Ogre Roar source scene changed');
  const owned=p=>p>=(START&65535)&&p<(END&65535);
  for(let id=0;id<128;id++){
    const p=u16(base,0xd5ef0+id*2),header=0xe0000+p;
    if(id!==3&&owned(p))throw Error('Ogre Roar scene has another header owner');
    let count=0;for(let byte=0;byte<4;byte++)for(let n=base[header+byte];n;n>>=1)count+=n&1;
    for(let slot=0;slot<count;slot++)if(id!==3&&owned(u16(base,header+4+slot*2)))throw Error('Ogre Roar scene has another channel owner');
    if(owned(u16(base,0xe0000+id*2)))throw Error('Ogre Roar scene is a shared subscript');
    if(id!==3&&base[0xd45a6+id*7]===3)throw Error('Ogre Roar animation has another tech owner');
  }
  if(!matches(base,0xd45a6+18*7,waveConfig)||!matches(base,0xe154a,[0x80,0,0x80,0,0x52,0x15,0x85,9])||!matches(base,0xe1552,waveCaster))throw Error('Ogre Roar source shockwave scene changed');
  // Native facing/close-eye windup, roar, then the existing two-frame open
  // mouth sequence. Counter B releases only the selected enemy's hit script.
  // Var1B starts the shared background; var1A requests its ordinary cleanup.
  const caster=[0x3d,9,0x72,0x15,3,0x21,0x34,0x1b,0x78,0xc5,2,0x1a,0x20,100,0x36,0x34,0x1a,0x20,10,3,0x1a,3,0x1a,6,3,0x50,0x2e,1,0];
  const casterPointer=(START&65535)+10,targetPointer=casterPointer+caster.length;
  const scene=Uint8Array.from([0x90,0,0x80,0,casterPointer&255,casterPointer>>8,targetPointer&255,targetPointer>>8,0x85,9,...caster,0x24,1,0x1e,6,0]);
  if(START+scene.length>END)throw Error('Ogre Roar exceeds its original scene');
  return scene;
}

export function patchOgreRoar(base,add){
  if(!matches(base,CONFIG,sourceConfig))throw Error('Ogre Roar source animation changed');
  const scene=ogreRoarScene(base),description='Air roar on foe';
  // The existing elemental-help pass owns this string and validates its
  // source, capacity and pointer boundaries. Keep a single patch owner.
  if(!elementHelp.some(h=>h.kind==='tech'&&h.id===3&&h.address===0xc3b2b&&h.text===description))throw Error('Ogre Roar elemental help changed');
  for(const bank of[0x7430b,0x75b0d])if(!u16(base,bank+0xc5*4))throw Error('Ogre Roar resident sound is missing');
  add(CONFIG,Uint8Array.of(3,...waveConfig.slice(1)),'Ogre Roar native shockwave resources');
  add(START,scene,'Ogre Roar native caster and target choreography');
  return{tech:3,name:'Ogre Roar',description,damage:'source Lightning',element:'Air',targets:'source one enemy',mp:'source Lightning',status:'unchanged',script:START,scriptBytes:scene.length,sourceScriptBytes:END-START,graphics:'existing native Hypno Wave shockwaves',sound:{id:0xc5,extraSamples:0},hooks:[],extraRomBytes:0,extraVramBytes:0,extraWramBytes:0,animation:'native open-mouth roar, expanding shockwaves and selected-target hit reaction'};
}
