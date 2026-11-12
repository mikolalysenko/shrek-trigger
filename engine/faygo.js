import {faygoActors,faygoItems} from '../content/faygo.js';
import {faygoPickups} from '../content/faygo-pickups.js';
import {sourceDialogueEvents} from '../content/dialogue-ownership.js';
import {faygoBottle} from './faygo-art.js';
import {compileSpriteFrames,assertUnusedSpriteSlot,assertUnusedPalette} from './native-sprites.js';
import {nativeRoutine} from './asm.js';
import {compress,decompress} from './compression.js';
import {put16,put24,u16} from './rom.js';
import {snesColor} from './sprites.js';
import {encodeDialogue,dialogueLength} from './text.js';
import {rasterArtInfo} from './raster-art.js';

export function patchFaygo(base,allocate,add,priorRecords){
  const gfx=229,asm=216;
  assertUnusedSpriteSlot(base,0,gfx);assertUnusedSpriteSlot(base,1,asm);
  const paletteOffsets=faygoActors.map(a=>0x240000+u16(base,0x242a00+a.palette*2));
  for(const p of[0x242000+gfx*3,0x242300+asm*3,...paletteOffsets])if(priorRecords.some(r=>p>=r.offset&&p<r.offset+r.bytes.length))throw Error('Faygo private resource is already claimed');
  // Conservative scan also rejects incidental 82/id byte pairs: no source
  // event may load these previously unreferenced NPC headers.
  for(const[,p]of sourceDialogueEvents){
    if(p===0x3afaa0)continue;
    const e=decompress(base,p).bytes;
    for(let i=1+e[0]*32;i<e.length-1;i++)if(e[i]===0x82&&faygoActors.some(a=>a.npc===e[i+1]))throw Error('Faygo NPC slot has an event owner');
  }
  for(const[location,object,item,p,load,award]of faygoPickups){
    const e=decompress(base,p).bytes;
    if(object>=e[0]||e[load+1]!==0x82||e[load+2]!==112||e[award+1]!==0xca||e[award+2]!==item)throw Error('Faygo pickup source changed: '+location+':'+object);
  }
  const art=compileSpriteFrames(Array.from({length:5},()=>faygoBottle()));
  if(art.graphics.length>160)throw Error('Faygo bottle exceeds the original sparkle graphics budget');
  const graphicsOffset=allocate(compress(art.graphics),'Faygo shared bottle graphics'),assemblyOffset=allocate(art.assembly,'Faygo bottle frames');
  const pointer=(table,id,p,label)=>{const b=new Uint8Array(3);put24(b,0,p|0xc00000);add(table+id*3,b,label);};
  pointer(0x242000,gfx,graphicsOffset,'Faygo graphics pointer');pointer(0x242300,asm,assemblyOffset,'Faygo assembly pointer');
  for(const a of faygoActors){
    assertUnusedPalette(base,a.palette);const colors=new Uint8Array(24);a.colors.forEach((c,i)=>put16(colors,i*2,snesColor(c)));
    add(0x240000+u16(base,0x242a00+a.palette*2),colors,a.name+' bottle palette');
    const p=0x24f000+(a.npc+7)*5;
    if(![28,17,133,11,0].every((v,i)=>base[p+i]===v))throw Error('Faygo reserved NPC header changed');
    add(p,Uint8Array.of(gfx,asm,a.palette,139,0),a.name+' private bottle actor');
  }
  const descriptions=[];
  if(u16(base,0x2f318)!==0x2eb1||base[0x2f31e]!==0xcc)throw Error('Faygo item help table changed');
  for(const item of faygoItems){
    const p=0xc0000+u16(base,0xc2eb1+item.id*2),bytes=encodeDialogue(item.description+'{null}',base);
    if(bytes.length>dialogueLength(base,p))throw Error('Faygo item help exceeds source slot');
    for(let id=0;id<242;id++)if(id!==item.id&&u16(base,0xc2eb1+id*2)===(p&65535))throw Error('Faygo item help has another owner');
    add(p,bytes,item.name+' native stat description');descriptions.push({item:item.id,offset:p,bytes:bytes.length});
  }
  const table=new Uint8Array(faygoPickups.length*4);
  faygoPickups.forEach(([loc,obj,item],i)=>{put16(table,i*4,loc);table[i*4+2]=obj*2;table[i*4+3]=faygoActors.find(a=>a.id===item).npc;});
  const tableAddress=allocate(table,'Faygo native pickup selectors'),long=(a,op,p)=>a.emit(op,p&255,p>>8&255,(p>>16)|0xc0);
  const code=nativeRoutine(a=>{
    // The field VM has DP=$0100, DB=$00, M=8 and X=16. Preserve the hidden
    // high accumulator byte as well as the script index and arithmetic flags.
    a.emit(0x08,0xc2,0x20,0x48,0xda,0x5a,0xe2,0x20,0xa6,0x6d,0xbd,1,0x11,0xc9,112);a.branch(0xd0,'done');
    a.emit(0xa2,0,0);a.label('entry');a.emit(0xc2,0x20);long(a,0xbf,tableAddress);a.emit(0xcd,0,1);a.branch(0xd0,'next');
    a.emit(0xe2,0x20);long(a,0xbf,tableAddress+2);a.emit(0xc5,0x6d);a.branch(0xd0,'next');
    long(a,0xbf,tableAddress+3);a.emit(0xa4,0x6d,0x99,1,0x11,0x8d,2,0x42);a.branch(0x80,'done');
    a.label('next');a.emit(0xe8,0xe8,0xe8,0xe8,0xe0,table.length&255,table.length>>8);a.branch(0xd0,'entry');
    a.label('done');a.emit(0x7a,0xfa,0xc2,0x20,0x68,0x28,0xa9,5,0x8d,3,0x42,0x6b);
  });
  const offset=0x4595,expected=[0xa9,5,0x8d,3,0x42];if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Faygo NPC loader boundary changed');
  const address=allocate(code,'Faygo native pickup selector'),call=Uint8Array.of(0x22,0,0,0,0xea);put24(call,1,address|0xc00000);add(offset,call,'Faygo native pickup selection');
  return{items:faygoItems,actors:faygoActors,graphicsOffset,graphicsBytes:art.graphics.length,assemblyOffset,assemblyBytes:art.assembly.length,descriptions,pickups:faygoPickups.map(([location,object,item])=>({location,object,item})),table:tableAddress,hook:{offset,address,bytes:code.length},rasterCoverage:{rasterFrames:faygoActors.length*5,proceduralFrames:0,blankFrames:0,sources:rasterArtInfo('faygo-orange').provenance},extraVramBytes:0,extraWramBytes:0};
}
