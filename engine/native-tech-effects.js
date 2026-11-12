import {nativeRoutine} from './asm.js';
import {put24} from './rom.js';
import {cartridgeDataAddress} from './expanded-rom.js';

export function patchNativeTechEffects(base,variants,allocate,add){
 if(new Set(variants.map(v=>v.tech)).size!==variants.length)throw Error('Duplicate native tech effect');
 for(const v of variants){
  if(!['4bpp','2bpp'].includes(v.format)||v.chunks<1||v.chunkFirst+v.chunks>256)throw Error('Invalid native effect graphics');
  if(![1,3].includes(v.assemblies.length))throw Error('Native effect needs one layout or three party layouts');
 }
 const long=(a,op,p)=>a.emit(op,p&255,p>>8&255,p>>16&255);
 const components=(a,v,destination)=>{
  if(!v.components?.length)return;
  for(const tech of v.techs??[v.tech]){a.emit(0xad,0xe3,0x9e,0xc9,tech);a.branch(0xf0,'checkComponents');}
  a.branch(0x80,'original');a.label('checkComponents');
  for(const tech of v.components){a.emit(0xad,0x93,0xae,0xc9,tech);a.branch(0xf0,destination);}
  a.branch(0x80,'original');
 };
 const active=(a,v)=>{
  const routed={39:[15,16]}[v.tech];
  if(routed){
   a.emit(0xad,0x93,0xae,0xc9,v.tech);a.branch(0xf0,'checkChunk');
   a.emit(0xad,0xe3,0x9e,0xc9,v.tech);a.branch(0xd0,'original');
   for(const tech of routed){a.emit(0xad,0x93,0xae,0xc9,tech);a.branch(0xf0,'checkChunk');}
   a.branch(0x80,'original');return;
  }
  // A variant marked `selected` applies only when its own tech was chosen
  // ($9EE3), not when another tech borrows its animation (Hot Sauce uses 23).
  if(v.selected){a.emit(0xad,0xe3,0x9e,0xc9,v.tech);a.branch(0xd0,'original');}
  for(const tech of v.techs??[v.tech]){a.emit(0xad,0x93,0xae,0xc9,tech);a.branch(0xf0,'checkChunk');}
  if(v.components?.length){a.branch(0x80,'components');a.label('components');components(a,v,'checkChunk');}else a.branch(0x80,'original');
 };
 const groups=new Map();
 for(const v of variants){
  const key=[v.tiles,v.chunkFirst,v.chunks,v.format,v.sourceAssembly,v.components?.join(','),!!v.selected].join(':');
  if(!groups.has(key))groups.set(key,{...v,techs:[]});groups.get(key).techs.push(v.tech);
 }
 let decode=cartridgeDataAddress(allocate(Uint8Array.of(0xa9,0xcf,0x85,0x55,0x5c,0x6c,0x13,0xcd),'Native tech graphics fallback'));
 let assembly=cartridgeDataAddress(allocate(Uint8Array.of(0x8e,0,3,0xa9,0xd1,0x8d,2,3,0x6b),'Native tech assembly fallback'));
  for(const v of [...groups.values()].reverse()){
  const tiles=cartridgeDataAddress(v.tiles),next=decode,code=nativeRoutine(a=>{
    a.emit(0x08);
    if(v.assemblies.length===3){a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0xb0,'original');}
    else{a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0x90,'actor');a.emit(0xc9,255);a.branch(0xd0,'original');a.label('actor');}
   a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,'original');active(a,v);a.label('checkChunk');
   a.emit(0xe0,v.chunkFirst,0);a.branch(0x90,'original');a.emit(0xe0,(v.chunkFirst+v.chunks)&255,(v.chunkFirst+v.chunks)>>8);a.branch(0xb0,'original');
   a.branch(0x80,'copy');a.label('original');a.emit(0x28);long(a,0x5c,next);
   a.label('copy');
   if(v.format==='4bpp')a.emit(0x8b,0xc2,0x20,0x8a,0x38,0xe9,v.chunkFirst,0,0xeb,0x0a,0x0a,0x18,0x69,tiles&255,tiles>>8&255,0xaa,0xa0,0,0x2d,0xa9,255,3,0x54,0x7e,tiles>>16,0xab);
   else{
    a.emit(0xc2,0x20,0x8a,0x38,0xe9,v.chunkFirst,0,0xeb,0x0a,0x18,0x69,tiles&255,tiles>>8&255,0xaa,0xa0,0,0,0xe2,0x20);
    a.label('pixels');long(a,0xbf,(tiles>>16)<<16);a.emit(0x99,0,0x2d,0xe8,0xc8,0x98,0x29,15);a.branch(0xd0,'pixels');
    a.label('clear');a.emit(0xa9,0,0x99,0,0x2d,0xc8,0x98,0x29,31);a.branch(0xd0,'clear');a.emit(0xc0,0,4);a.branch(0xd0,'pixels');
   }
   a.emit(0x64,0x67,0x28,0x7b,0x5c,0xc9,0x13,0xcd);
  });
  const address=allocate(code,v.name+' isolated native tile decoder');decode=cartridgeDataAddress(address);
  v.hooks.push({offset:0xd1368,address,bytes:code.length,label:v.name+' isolated effect graphics'});
   const nextAssembly=assembly,layout=nativeRoutine(a=>{
    a.emit(0x08);
    if(v.assemblies.length===3){a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0xb0,'original');}
    else{a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0x90,'actor');a.emit(0xc9,255);a.branch(0xd0,'original');a.label('actor');}
   a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,'original');
   for(const tech of(v.techs??[v.tech]))if(tech!==v.tech){a.emit(0xad,0x93,0xae,0xc9,tech);a.branch(0xf0,'checkAssembly');}
   const routed={39:[15,16]}[v.tech];
   if(routed){
    a.emit(0xad,0x93,0xae,0xc9,v.tech);a.branch(0xf0,'select');
    a.emit(0xad,0xe3,0x9e,0xc9,v.tech);a.branch(0xd0,'original');
    for(const tech of routed){a.emit(0xad,0x93,0xae,0xc9,tech);a.branch(0xf0,'select');}
    a.branch(0x80,'original');
   }else{
    if(v.selected){a.emit(0xad,0xe3,0x9e,0xc9,v.tech);a.branch(0xd0,'original');}
    a.emit(0xad,0x93,0xae,0xc9,v.tech);a.branch(0xd0,'original');
    a.label('checkAssembly');a.emit(0xe0,v.sourceAssembly&255,v.sourceAssembly>>8&255);a.branch(0xd0,'original');
   }
   if(v.components?.length){a.branch(0x80,'components');a.label('components');components(a,v,'checkAssembly');}
   a.branch(0x80,'select');a.label('original');a.emit(0x28);long(a,0x5c,nextAssembly);
   a.label('select');
   if(v.assemblies.length===3){a.emit(0xad,0x91,0xae,0xc9,1);a.branch(0xf0,'slot1');a.emit(0xc9,2);a.branch(0xf0,'slot2');}
   v.assemblies.forEach((p,slot)=>{const address=cartridgeDataAddress(p);a.label('slot'+slot);a.emit(0x28,0xa2,address&255,address>>8&255,0x8e,0,3,0xa9,address>>16,0x8d,2,3,0x6b);});
  });
  const layoutAddress=allocate(layout,v.name+' isolated native cell layout');assembly=cartridgeDataAddress(layoutAddress);
  v.hooks.push({offset:0x1486d,address:layoutAddress,bytes:layout.length,label:v.name+' private effect assembly'});
 }
 for(const[offset,expected,opcode,target,label]of[
  [0xd1368,[0xa9,0xcf,0x85,0x55],0x5c,decode,'Native tech effect graphics dispatcher'],
  [0x1486d,[0x8e,0,3,0xa9,0xd1,0x8d,2,3],0x22,assembly,'Native tech effect assembly dispatcher']
 ]){
  if(!expected.every((v,i)=>base[offset+i]===v))throw Error(label+' boundary changed');
  const call=new Uint8Array(expected.length).fill(0xea);call[0]=opcode;put24(call,1,target);add(offset,call,label);
 }
 return{techs:variants.map(v=>v.tech),decoder:decode&0x3fffff,assembly:assembly&0x3fffff,extraVramBytes:0,extraWramBytes:0};
}
