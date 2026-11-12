import {put16,u16} from './rom.js';

const START=0xe0e96,END=0xe0f90,CONFIG=0xd45a6+7*7;
const sourceConfig=[7,32,36,45,7,7,255],throwConfig=[44,97,0,1,0,0,255];
const source=Uint8Array.from(('90809080a60e480f740fa60e480f740f'+
 '720d06322d8002f02020031d06370cd0a40402d930277a530098022c1b2cd136'+
 '0d2d8012a87a77031e3a362d8012281e390e8045e33000007216023f2d8012a0'+
 '7891c22b20e00172140240c22b2020017217023f2d8002e0c22b2060017215'+
 '024028c22b20a001270fa5a403021e391e3a2b78ff79ff1b2ca5720d02412012'+
 '7a400020027b40000632200436200180512d801230263202200a1e2a28da2404'+
 '2e010024028500d8040223508580d8060223518500d8080223528580d80a021e'+
 '24030605690020056a532b06033600730072000d430300ff411e02411f031a85'+
 'e0a80444411e04411f0500').match(/../g).map(v=>parseInt(v,16)));
const same=(rom,p,bytes)=>bytes.every((v,i)=>rom[p+i]===v);

// The source damage routine still computes four hits and their aggregate.
// Counter B synchronizes each body blow with the existing 50/51/52/53 damage
// displays. Only the fourth hit lifts the enemy; this is one continuous combo.
const strikes=[2,0x31,0x20,8,6,0x32,0x36,0x24,2,
 6,0x28,0x36,0x24,4,6,0x39,0x36,0x24,6];
const finishCaster=[0x72,0x16,6,0x3c,0x36,0x24,8,0x78,0x6b,
 0xd0,0xc4,0xe8,0xfc,0x20,6,0x72,0x15,6,0x39,0x36,
 0xc4,0,8,0x24,10,0x20,10,0xd1,0x0c,0x1e,0x2a,3,3,0x24,11,0x2e,1,0];
const liftCaster=[0x0b,2,6,0x12,0x13,0x12,0x28,0x72,0x0d,...strikes,...finishCaster];
// Original 7:1 caster/target point keeps Shrek visible in front of a large
// anchored body. Its target channel never changes position, height or scale.
const anchorCaster=[0x0b,2,6,0x12,0x24,0x72,0x0d,...strikes,...finishCaster];
const hits=[0x24,1,0x78,0x6c,3,5,0x50,0x36,
 0x24,3,0x78,0x6c,3,5,0x51,0x36,
 0x24,5,0x78,0x6c,3,5,0x52,0x36];
const liftTarget=[...hits,0x24,7,0xd9,0x30,3,5,0xd0,0xc4,0xf0,0xff,0x36,
 0xc4,0xd8,0xfc,0x24,9,0xc4,0,8,0x78,0x6c,0x85,0xc0,
 0xd8,10,3,15,0x36,0x53,0x2b,6,3,0xda,0xd1,0x36,0];
const anchorTarget=[...hits,0x24,7,0x36,0x24,9,0x78,0x6c,0x36,0x53,6,3,0x36,0];

export function fourLayerSlamScene(base){
 if(source.length!==END-START||!same(base,START,source)||u16(base,0xd5ef0+14)!==(START&65535)||u16(base,0xd5ef0+16)!==(END&65535))throw Error('Four Layer Slam source scene changed');
 const owned=p=>p>=(START&65535)&&p<(END&65535);
 for(let id=0;id<128;id++){
  const p=u16(base,0xd5ef0+id*2),header=0xe0000+p;
  if(id!==7&&owned(p))throw Error('Four Layer Slam scene has another header owner');
  let count=0;for(let byte=0;byte<4;byte++)for(let n=base[header+byte];n;n>>=1)count+=n&1;
  for(let slot=0;slot<count;slot++)if(id!==7&&owned(u16(base,header+4+slot*2)))throw Error('Four Layer Slam scene has another channel owner');
  if(owned(u16(base,0xe0000+id*2)))throw Error('Four Layer Slam scene is a shared subscript');
  if(id!==7&&base[0xd45a6+id*7]===7)throw Error('Four Layer Slam animation has another tech owner');
 }
 const bytes=[0x90,0,0x90,0,0,0,0,0,0,0,0,0];
 for(const[i,program]of[liftCaster,liftTarget,anchorCaster,anchorTarget].entries()){
  put16(bytes,4+i*2,(START&65535)+bytes.length);bytes.push(...program);
 }
 if(START+bytes.length>END)throw Error('Four Layer Slam exceeds its original scene');
 return Uint8Array.from(bytes);
}

export function patchFourLayerSlam(base,add,selector){
 if(!same(base,CONFIG,sourceConfig)||!same(base,0xd45a6+44*7,throwConfig))throw Error('Four Layer Slam source resources changed');
 if(selector?.offset!==0x14617||!selector.techs?.includes(7))throw Error('Four Layer Slam requires the native wrestling selector');
 for(const bank of[0x7430b,0x75b0d])for(const id of[0x6b,0x6c])if(!u16(base,bank+id*4))throw Error('Four Layer Slam resident sound is missing');
 const scene=fourLayerSlamScene(base);
 add(CONFIG,Uint8Array.of(7,...throwConfig.slice(1)),'Four Layer Slam resident animation resources');
 add(START,scene,'Four Layer Slam native body blows and finishing throw');
 return{tech:7,name:'Four Layer Slam',damage:'source Confuse: four hits and aggregate',targets:'source one enemy',mp:12,status:'unchanged',
  script:START,scriptBytes:scene.length,sourceScriptBytes:END-START,
  animation:'three body blows, one lift and finishing slam, native return; anchored target fallback',
  sound:{ids:[0x6c,0x6c,0x6c,0x6b,0x6c],extraSamples:0},hooks:[{...selector,sharedWithTech:4}],
  extraRomBytes:0,sharedClassifierGrowth:4,extraVramBytes:0,extraWramBytes:0};
}
