import {nativeRoutine} from './asm.js';
import {put24} from './rom.js';
import {yarnBallGraphics,yarnBallGlint,yarnBallTech,yarnBallBackground} from './yarn-ball.js';
import {EFFECT_HOOKS_BLOCK,cartridgeDataAddress} from './expanded-rom.js';

const long=(a,op,p)=>a.emit(op,p&255,p>>8&255,p>>16&255);
function selected(a,fail){
 a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0xb0,fail);
 a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,fail);
 a.emit(0xad,0x93,0xae,0xc9,yarnBallTech);a.branch(0xd0,fail);
 a.emit(0xad,0xa2,0xcc,0xc9,yarnBallBackground);a.branch(0xd0,fail);
 a.emit(0xad,0xa3,0xcc);a.branch(0xd0,fail);
}
function copyChunk(a,offset){
 const tiles=cartridgeDataAddress(offset);
 a.emit(0x8b,0x5a,0xc2,0x20,0x29,255,0,0xeb,0x0a,0x0a,0x18,0x69,tiles&255,tiles>>8&255,0xaa,0xa0,0,0x2d,0xa9,255,3,0x54,0x7e,tiles>>16,0x7b,0x7a,0xab);
}

// Yarn Bomb retains Frog Squash's complete scene, damage, targeting and
// low-HP formula. Only its private background tiles, palette and glint change.
export function patchYarnBomb(base,add){
 const yarn=yarnBallGraphics(),glint=yarnBallGlint(),glintAddress=EFFECT_HOOKS_BLOCK+0x280,tileAddress=EFFECT_HOOKS_BLOCK+0x400,hooks=[];
 let next=EFFECT_HOOKS_BLOCK;
 add(tileAddress,yarn.graphics,'Yarn Bomb native background tiles');
 add(glintAddress,glint,'Yarn Bomb glint color math');
 function install(offset,expected,code,label,{jump=false}={}){
  if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Yarn Bomb boundary changed: '+label);
  const address=next;next+=code.length;if(next>glintAddress)throw Error('Yarn Bomb hooks exceed their reserved block');
  add(address,code,label+' routine');
  const call=new Uint8Array(expected.length).fill(0xea);call[0]=jump?0x5c:0x22;put24(call,1,cartridgeDataAddress(address));add(offset,call,label);
  hooks.push({offset,address,bytes:code.length,label});
 }
 install(0xd0fa9,[0xad,0xce,0xca,0x0a,0xaa],nativeRoutine(a=>{
  a.emit(0x08);selected(a,'original');a.emit(0xad,0xce,0xca,0xc9,4);a.branch(0xb0,'original');copyChunk(a,tileAddress);
  a.label('original');a.emit(0x28,0xad,0xce,0xca,0x0a,0xaa,0x6b);
 }),'Yarn Bomb isolated background upload');
 install(0xd1004,[0x7b,0xa8,0xad,0x95,0xca],nativeRoutine(a=>{
  a.emit(0x08);selected(a,'original');
  a.emit(0xc2,0x20);yarn.palette.forEach((c,i)=>{a.emit(0xa9,c&255,c>>8);for(const p of[0x2032,0x2232])a.emit(0x8d,(p+i*2)&255,(p+i*2)>>8);});
  a.emit(0xe2,0x20,0xa9,255,0x8d,0x95,0xca);
  a.label('original');a.emit(0x28,0x7b,0xa8,0xad,0x95,0xca,0x6b);
 }),'Yarn Bomb isolated palette');
 install(0xd2d5e,[0xe2,0x10,0x7b,0xaa,0xa8],nativeRoutine(a=>{
  selected(a,'native');a.emit(0xc2,0x10,0xa2,0,0);
  a.label('line');a.emit(0xa5,0x45,0x9d,0x06,0xbb);long(a,0xbf,cartridgeDataAddress(glintAddress+2));a.emit(0x9d,0x07,0xbb,0xe8,0xe8,0xe8,0xe8,0xe0,0x80,0x01);a.branch(0xd0,'line');
  a.emit(0x64,0x49,0x7b,0xa9,0x20,0xa2,0xfe,0x00,0xa0,0x80,0x00,0xc0,0x80,0x00,0xb8,0x5c,0xc8,0x2d,0xcd);
  a.label('native');a.emit(0xe2,0x10,0x7b,0xaa,0xa8,0x5c,0x63,0x2d,0xcd);
 }),'Yarn Bomb glint color math',{jump:true});
 return{tech:40,name:'Yarn Bomb',tiles:tileAddress,glint:glintAddress,hooks,damage:'source Frog Squash',targets:'source all enemies',mp:'source Frog Squash',extraVramBytes:0,extraWramBytes:0};
}
