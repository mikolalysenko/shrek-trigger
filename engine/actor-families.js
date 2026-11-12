import {compileSpriteFrames,spriteHeaders,assertUnusedSpriteSlot} from './native-sprites.js';
import {internSpriteTile,snesColor} from './sprites.js';
import {compress,decompress} from './compression.js';
import {encode} from './text.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {cartridgeDataAddress} from './expanded-rom.js';

// Build-time sharing only. The cartridge still loads one native graphics bank
// and the existing assembly/animation IDs for each actor. Different assembly
// groups may share tiles without reserving any additional runtime memory.
export function compileActorFamily(family,draw){
  const tiles=[new Uint8Array(32)],indices=new Map([[Array(32).fill(0).join(','),0]]),groups=[];
  for(const group of family.groups){
    const frames=Array.from({length:group.frames},(_,f)=>draw(group.art,f)),c=compileSpriteFrames(frames,group),remap=[];
    for(let t=0;t<c.tiles;t++)remap.push(internSpriteTile(c.graphics.slice(t*32,(t+1)*32),tiles,indices));
    const cells=c.assembly.length/group.frames/10;
    for(let f=0;f<group.frames;f++){
      for(let i=0;i<cells*4;i++){
        const p=f*cells*10+i*2,t=u16(c.assembly,p);put16(c.assembly,p,remap[t&1023]^(t&0x4000));
      }
      for(let cell=0;cell<cells;cell++)for(let axis=0;axis<2;axis++)c.assembly[f*cells*10+cells*8+cell*2+axis]+=(group.anchor?.[axis]??0)+(group.frameOffsets?.[f]?.[axis]??0);
    }
    groups.push({...group,cells,assembly:c.assembly});
  }
  if(tiles.length>1024)throw Error('Actor family exceeds native tile indices');
  return {graphics:Uint8Array.from(tiles.flatMap(t=>Array.from(t))),tiles:tiles.length,groups};
}

export function patchActorFamilies(base,families,draw,allocate,add,priorRecords=[],{streamedGraphics=new Set(),allocateGraphics=allocate,allocateAssembly=allocate,compileFamily=compileActorFamily}={}){
  // Earlier builders can move an actor into private graphics, assembly and
  // palette slots (Guy Fieri does this). Read those actual emitted header writes
  // when checking shared ownership; an ignored-owner list would be unsafe.
  const changes=priorRecords.filter(r=>r.offset<0x250000&&r.offset+r.bytes.length>0x24f000);
  const headers=spriteHeaders(base).map(h=>{
    const values=base.slice(h.offset,h.offset+5);
    for(const r of changes){
      const lo=Math.max(h.offset,r.offset),hi=Math.min(h.offset+5,r.offset+r.bytes.length);
      for(let p=lo;p<hi;p++)values[p-h.offset]=r.bytes[p-r.offset];
    }
    return {...h,values};
  }),headerAt=new Map(headers.map(h=>[h.offset,h.values]));
  const actors=families.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a}))),result=[];
  const owns=(a,h)=>h.kind==='enemy'?a.enemy===h.id:h.kind==='npc'&&a.npcs?.includes(h.id);
  const pointer=(table,id,offset,label)=>{const p=new Uint8Array(3);put24(p,0,cartridgeDataAddress(offset));add(table+id*3,p,label);};
  for(const family of families){
    const members=actors.filter(a=>a.gfx===family.gfx);
    if(family.gfx<7||headers.some(h=>h.values[0]===family.gfx&&!members.some(a=>owns(a,h))))throw Error('Actor family graphics have another owner');
    for(const g of family.groups)if(headers.some(h=>h.values[1]===g.asm&&!members.some(a=>a.asm===g.asm&&owns(a,h))))throw Error('Actor family assembly has another owner');
    for(const a of members){
      if(a.enemy===undefined&&!a.npcs?.length)throw Error('Actor family member has no native header');
      if(a.sourceAsm!==undefined&&a.sourceAsm!==a.asm)assertUnusedSpriteSlot(base,1,a.asm);
      if(a.enemy!==undefined){
        const p=0x24f600+a.enemy*10;
        if(!Number.isInteger(a.enemy)||a.enemy<0||a.enemy>255||![a.gfx,a.sourceAsm??a.asm,a.sourcePalette??a.palette,a.animation,a.size].every((v,i)=>base[p+i]===v&&headerAt.get(p)?.[i]===v))throw Error('Actor family header changed: '+a.key);
        if(a.sourceAsm!==undefined&&a.sourceAsm!==a.asm)add(p+1,Uint8Array.of(a.asm),a.name+' private assembly selection');
        if(a.sourcePalette!==undefined&&a.sourcePalette!==a.palette)add(p+2,Uint8Array.of(a.palette),a.name+' palette selection');
      }
      for(const id of a.npcs??[]){
        const p=0x24f000+(id+7)*5;
        if(!Number.isInteger(id)||id<0||id>248||![a.gfx,a.sourceAsm??a.asm,a.sourcePalette??a.palette,a.npcAnimations?.[id]??a.animation,a.size].every((v,i)=>base[p+i]===v&&headerAt.get(p)?.[i]===v))throw Error('Actor family NPC header changed: '+a.key);
        if(a.sourceAsm!==undefined&&a.sourceAsm!==a.asm)add(p+1,Uint8Array.of(a.asm),a.name+' private assembly selection');
        if(a.sourcePalette!==undefined&&a.sourcePalette!==a.palette)add(p+2,Uint8Array.of(a.palette),a.name+' palette selection');
      }
    }
    const c=compileFamily(family,draw),source=decompress(base,fileOffset(u24(base,0x242000+family.gfx*3))).bytes;
    // Compound native actors can retain independent overlapping source cells.
    // A compiler override does not bypass ownership, geometry or tile limits.
    if(!(c.graphics instanceof Uint8Array)||!Number.isInteger(c.tiles)||c.graphics.length!==c.tiles*32||c.tiles<1||c.tiles>1024||c.groups.length!==family.groups.length)throw Error('Actor family compiler changed its native bank contract');
    for(let i=0;i<c.groups.length;i++){
      const g=c.groups[i],expected=family.groups[i],cells=((expected.size&2)?3:1)*((expected.size&1)?8:4);
      if(g.asm!==expected.asm||g.frames!==expected.frames||g.cells!==cells||!(g.assembly instanceof Uint8Array)||g.assembly.length!==g.frames*cells*10)throw Error('Actor family compiler changed its native assembly contract');
      for(let f=0;f<g.frames;f++)for(let t=0;t<cells*4;t++){const value=u16(g.assembly,f*cells*10+t*2);if(value&0xbc00||(value&1023)>=c.tiles)throw Error('Actor family compiler emitted an invalid native tile');}
    }
    const streamed=streamedGraphics.has(family.gfx);
    // Only a family selected for the guarded cartridge loader may grow past
    // its old decompressed allocation. Ownership is checked above and the
    // final placement rechecks every emitted header and the raw bank span.
    if(streamed&&members.some(a=>(a.size&3)===3))throw Error('Streamed actor family uses an unsupported native cell path');
    if(!streamed&&c.graphics.length>source.length)throw Error('Actor family exceeds its original decoded graphics budget');
    const graphicsOffset=allocateGraphics(compress(c.graphics),family.name+' compressed graphics',family.gfx);pointer(0x242000,family.gfx,graphicsOffset,family.name+' graphics pointer');
    for(const group of c.groups){
      const assemblyOffset=allocateAssembly(group.assembly,family.name+' assembly '+group.asm);pointer(0x242300,group.asm,assemblyOffset,family.name+' assembly pointer');
      for(const a of members.filter(a=>a.asm===group.asm)){
        if(a.enemy!==undefined)add(0xc6500+a.enemy*11,encode(a.short,{length:11}),a.name+' battle name');
        result.push({...a,graphicsOffset,graphicsBytes:c.graphics.length,sourceGraphicsBytes:source.length,graphicsStorage:streamed?'direct-rom':'decompressed-heap',tiles:c.tiles,assemblyOffset,assemblyBytes:group.assembly.length,cells:group.cells});
      }
    }
  }
  for(const palette of new Set(actors.map(a=>a.palette))){
    const owners=actors.filter(a=>a.palette===palette),a=owners[0],p=u16(base,0x242a00+palette*2);
    if(owners.some(o=>o.colors.length!==12||o.colors.some((v,i)=>v!==a.colors[i])))throw Error('Actor family palette must contain twelve consistent colors');
    const colors=new Uint8Array(24);a.colors.forEach((c,i)=>put16(colors,i*2,snesColor(c)));
    // Compatible artwork may deliberately retain a shared source color ramp.
    // No write means the other palette owners are unaffected. Any color
    // change still requires exclusive ownership and an unaliased pointer.
    if(colors.every((v,i)=>v===base[0x240000+p+i]))continue;
    if(headers.some(h=>h.values[2]===palette&&!owners.some(a=>owns(a,h))))throw Error('Actor family palette has another owner');
    for(let id=0;id<256;id++)if(id!==palette&&u16(base,0x242a00+id*2)===p)throw Error('Actor family palette pointer is aliased');
    add(0x240000+p,colors,a.name+' palette');
  }
  return {actors:result,extraVramBytes:0,extraWramBytes:0};
}
