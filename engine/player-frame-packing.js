import {nativeRoutine} from './asm.js';
import {u24,put24} from './rom.js';

// Share only byte-identical40-byte layouts. Original frame IDs, animation
// scripts, timing and cached frames remain unchanged. Equipment variants can
// use one map when compilation proves identical logical frame groupings.
export function packPlayerFrames(frames,{compact=true}={}){
  if(!frames.length||frames.length%40||frames.length>256*40)throw Error('Invalid player frame table');
  const frameMap=[],unique=[],seen=new Map();
  for(let p=0;p<frames.length;p+=40){
    const bytes=frames.slice(p,p+40),key=bytes.join(',');let id=compact?seen.get(key):undefined;
    if(id===undefined){id=unique.length;unique.push(bytes);seen.set(key,id);}frameMap.push(id);
  }
  return{bytes:Uint8Array.from(unique.flatMap(b=>Array.from(b))),frameMap,uniqueFrames:unique.length,sourceBytes:frames.length};
}

export function patchPlayerFramePacking(base,characters,allocate,add,{menuAssemblyAliases=[]}={}){
  const maps=new Uint8Array(7*256),actors=characters.filter(c=>c.assembly.bytes<c.assembly.sourceBytes);
  const pointers=actors.map(c=>({id:c.id,address:c.assembly.address??u24(base,0x242300+c.id*3)}));
  for(const alias of menuAssemblyAliases){
    if(!actors.some(c=>c.id===alias.id)||!Number.isInteger(alias.address)||alias.address<0xc00000||alias.address>0xffffff)throw Error('Invalid player frame assembly alias');
    if([...pointers,...menuAssemblyAliases.filter(p=>p!==alias)].some(p=>p.address===alias.address))throw Error('Player frame assembly alias overlaps another pointer');
  }
  for(const c of characters)maps.set(c.assembly.frameMap,c.id*256);
  const table=allocate(maps,'native player frame indices'),long=[table&255,table>>8&255,0xc0|table>>16],hooks=[];
  const enter=a=>a.emit(0x08,0xc2,0x30,0x48,0xda,0x5a);
  const leave=a=>a.emit(0xc2,0x30,0x7a,0xfa,0x68,0x28);
  const install=(offset,expected,bytes,label,existingAddress)=>{
    if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Player frame boundary changed: '+label);
    const address=existingAddress??allocate(bytes,label+' routine'),call=new Uint8Array(expected.length).fill(0xea);
    call[0]=0x22;put24(call,1,address|0xc00000);add(offset,call,label);
    hooks.push({offset,address,bytes:bytes.length,label});
    return address;
  };
  function remapFrame({bank,pointer,frame,battle=false,menu=false}){
    return nativeRoutine(a=>{
      enter(a);
      const finish=()=>{leave(a);if(battle)a.emit(0xa5,0xa5);a.emit(0x6b);};
      const store=()=>a.emit(...(battle?[0x85,0xa5]:[0x8f,2,0x42,0]));
      const original=()=>{a.emit(0xe2,0x20,...frame);store();finish();};
      if(battle){
        a.emit(0xad,0x79,0x96,0x29,255,0,0xc9,11,0);a.branch(0x90,'valid');original();a.label('valid');
        a.emit(0xaa,0xbf,0x2d,0xf9,0xcc,0x29,255,0,0xaa);
      }
      for(const [index,c]of [...pointers,...(menu?menuAssemblyAliases:[])].entries()){
        const source=c.address,next='next'+index;
        a.emit(...bank,0x29,255,0,0xc9,source>>16,0);a.branch(0xd0,next);
        a.emit(...pointer,0xc9,source&255,source>>8&255);a.branch(0xd0,next);
        a.emit(...frame,0x29,255,0,0x09,0,c.id,0xaa,0xe2,0x20,0xbf,...long);store();finish();a.label(next);
      }
      original();
    });
  }
  const field=remapFrame({bank:[0xbd,0,0x13],pointer:[0xbd,0x80,0x13],frame:[0xbd,1,0x0f]});
  const fieldAddress=install(0xcc22,[0xbd,1,0x0f,0x8d,2,0x42],field,'shared player field frames');
  // The alternate OAM builder reads the same layout's coordinates without
  // uploading its tiles. It needs the identical logical-to-stored mapping.
  install(0xcdca,[0xbd,1,0x0f,0x8d,2,0x42],field,'shared player field coordinates',fieldAddress);
  install(0x2f707,[0x8f,2,0x42,0],remapFrame({bank:[0xa5,9],pointer:[0xa5,7],frame:[0xa5,3],menu:true}),'shared player menu frames');
  // Enemies such as the workshop puppets also use a player assembly. Match
  // that loaded pointer, not the active-party ID, before remapping the frame.
  if(!Array.from({length:11},(_,i)=>i*3).every((v,i)=>base[0xcf92d+i]===v))throw Error('Native battler pointer strides changed');
  const battle=remapFrame({bank:[0xbd,0x7a,0x1c],pointer:[0xbd,0x78,0x1c],frame:[0xad,0x7b,0x96],battle:true});
  install(0x11c7a,[0xad,0x7b,0x96,0x85,0xa5],battle,'shared player battle frames');
  return{table,tableBytes:maps.length,hooks,actors:actors.map(c=>c.id),menuAssemblyAliases,
    savedAssemblyBytes:actors.reduce((n,c)=>n+c.assembly.sourceBytes-c.assembly.bytes,0),extraVramBytes:0,extraWramBytes:0};
}
