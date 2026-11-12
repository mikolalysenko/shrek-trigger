import {compileSpriteFrames} from './native-sprites.js';
import {compress} from './compression.js';
import {snesColor} from './sprites.js';
import {u16,put16,put24} from './rom.js';
import {encode} from './text.js';
import {nativeRoutine} from './asm.js';
import {rasterArtInfo,nativeRasterArt} from './raster-art.js';
import {tysonLinework,tysonLineworkSprite} from './tyson-linework.js';

// All three enemies share the existing twelve-color palette and retain the
// native formation's OBJ cell budgets. Tyson uses a supplied raster sheet.
export const finalePalette=['211b22','593426','975535','ce8c55','751b30','cf3541','f3dfba','252735','4b5272','e3b65c','f5c783','fff5d2'];
// Sampled from the user's Punch-Out!! sprite sheet. Tyson-only line-aware
// sampling preserves source ink and facial highlights at native resolution.
// The 45-entry sequence retains the charge hook at frame24 and upload path.
export function tysonSprite(pose='guard',phase=0) {
  return tysonLineworkSprite(pose,phase);
}
export function tysonNativeSprite(frame) {
  if(!Number.isInteger(frame)||frame<0||frame>=45)throw Error('Tyson frame outside native assembly');
  return tysonSprite('native',frame);
}
export function muffinSprite(ward=false,phase=0) {
 return nativeRasterArt(ward?'sugar-ward':'muffin-core',phase,{width:32,height:32,frames:3});
}

export function patchFinaleGraphics(base,allocate,add) {
  const audits=[];
  const ptr=(where,address,label)=>{const b=new Uint8Array(3);put24(b,0,0xc00000|address);add(where,b,label);};
  const make=(id,frames,options,gfx,asm,label)=>{
    const compiled=compileSpriteFrames(frames,options),packed=compress(compiled.graphics);
    ptr(0x242000+gfx*3,allocate(packed,label+' graphics'),label+' graphics pointer');
    ptr(0x242300+asm*3,allocate(compiled.assembly,label+' frame assembly'),label+' assembly pointer');
    add(0x24f600+id*10,Uint8Array.of(gfx,asm),label+' sprite selection');
    const raster=id===0xce?tysonLinework:rasterArtInfo(id===0xed?'sugar-ward':'muffin-core');
    audits.push({id,name:label,frames:frames.length,tiles:compiled.tiles,graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,nativeCells:options.size===2?12:4,rasterCoverage:{rasterFrames:raster?frames.length:0,proceduralFrames:raster?0:frames.length,blankFrames:0,sources:raster?.provenance??[]},artSource:raster?.sourceType??'procedural'});
  };
  const frames=Array.from({length:45},(_,i)=>tysonNativeSprite(i));
  make(0xce,frames,{width:48,height:64,size:2},214,208,'Mike Tyson');
  // Resolve the charge pose at the common native frame-upload boundary,
  // including direct-frame and healing animations. Replay the displaced
  // LDA/CMP with the selected frame, preserving X/Y, DB and unrelated flags.
  const pose=nativeRoutine(a=>{
    a.emit(0x08,0xe0,3,0);a.branch(0xd0,'original');
    a.emit(0xad,0x02,0xaf,0xc9,0xce);a.branch(0xd0,'original');
    a.emit(0xad,0xe4,0x5f);a.branch(0xf0,'original');a.emit(0xc9,4);a.branch(0xb0,'original');
    a.emit(0x28,0xa9,24,0x8d,0x7b,0x96,0xdd,7,0x99,0x6b);
    a.label('original');a.emit(0x28,0xad,0x7b,0x96,0xdd,7,0x99,0x6b);
  });
  const poseAddress=allocate(pose,'native Tyson charge pose handler'),call=new Uint8Array(6);call.set([0x22,0,0,0,0xea,0xea]);put24(call,1,0xc00000|poseAddress);
  if(![0xad,0x7b,0x96,0xdd,7,0x99].every((v,i)=>base[0x11c5d+i]===v))throw Error('Unexpected native frame-upload boundary');
  add(0x11c5d,call,'Tyson charge pose frame upload');
  // The center is static between actions, and each action clears animation
  // work. Request a single native frame update when the cached pose disagrees
  // with the AI phase. A one-shot cannot hold the script's animation wait open.
  const idleFrames=u16(base,0x242600+166*2)+12,idleTimes=u16(base,0x242800+166*2)+12;
  const wake=nativeRoutine(a=>{
    a.emit(0x08,0xad,0x02,0xaf,0xc9,0xce);a.branch(0xd0,'done');
    a.emit(0xad,0xe4,0x5f);a.branch(0xf0,'guard');a.emit(0xc9,4);a.branch(0xb0,'guard');
    a.emit(0xad,0x0a,0x99,0xc9,24);a.branch(0xf0,'done');a.branch(0x80,'start');
    a.label('guard');a.emit(0xad,0x0a,0x99,0xc9,24);a.branch(0xd0,'done');
    a.label('start');a.emit(0xa9,1,0x8d,0x27,0xa1,0x8d,0x53,0xa1,0x9c,0x32,0xa1,0x9c,0x3d,0xa1);
    a.emit(0xc2,0x20,0xa9,idleFrames&255,idleFrames>>8,0x8d,0xee,0xa1,0xa9,idleTimes&255,idleTimes>>8,0x8d,0x04,0xa2,0xe2,0x20);
    // Replay the entire displaced timer loop: its back-edge originally
    // targeted the middle of the overwritten entry instructions.
    a.label('done');a.emit(0x28,0x7b,0xaa);
    a.label('timer');a.emit(0xbd,0x2f,0xa1);a.branch(0xf0,'next');a.emit(0xde,0x2f,0xa1);
    a.label('next');a.emit(0xe8,0xe0,11,0);a.branch(0xd0,'timer');a.emit(0x5c,0x4a,0x42,0xc1);
  });
  const wakeAddress=allocate(wake,'native Tyson pose refresh'),wakeCall=new Uint8Array(5);wakeCall[0]=0x5c;put24(wakeCall,1,0xc00000|wakeAddress);wakeCall[4]=0xea;
  if(![0x7b,0xaa,0xbd,0x2f,0xa1].every((v,i)=>base[0x1423a+i]===v))throw Error('Unexpected native animation tick');
  add(0x1423a,wakeCall,'native charge pose refresh at animation tick');
  make(0xed,[0,1,2].map(p=>muffinSprite(true,p)),{},237,223,'Sugar Ward');
  // Avoid FF: native graphics-cache entries use it as the empty sentinel.
  const coreGfx=248,coreAsm=254;
  for(let i=0;i<263;i++)if(base[0x24f000+i*5]===coreGfx||base[0x24f001+i*5]===coreAsm)throw Error('Finale sprite slot is occupied');
  for(let i=0;i<256;i++)if(base[0x24f600+i*10]===coreGfx||base[0x24f601+i*10]===coreAsm)throw Error('Finale enemy sprite slot is occupied');
  make(0xef,[0,1,2].map(p=>muffinSprite(false,p)),{},coreGfx,coreAsm,'Muffin Core');
  const pal=new Uint8Array(24);finalePalette.forEach((hex,i)=>put16(pal,i*2,snesColor(hex)));
  add(0x240000+u16(base,0x242a00+233*2),pal,'final formation shared palette');
  for(const[id,name]of [[0xce,'Mike Tyson'],[0xed,'Sugar Ward'],[0xef,'Muffin Core']])add(0xc6500+id*11,encode(name,{length:11}),'final enemy name '+id);
  return audits;
}
