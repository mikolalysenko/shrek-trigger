import {carnivalCast,carnivalColors,carnivalFields,hatchetProps} from '../content/carnival.js';
import {carnivalFrameMap,carnivalFieldMap,clownSprite,milenkoSprite,hatchetSprite} from './carnival-art.js';
import {compileSpriteFrames,mergeSpriteBanks,assertUnusedSpriteSlot,assertUnusedPalette,spriteHeaders} from './native-sprites.js';
import {u16,put16,put24} from './rom.js';
import {compress} from './compression.js';
import {encode,encodeDialogue} from './text.js';
import {snesColor} from './sprites.js';
import {rasterArtInfo} from './raster-art.js';

export function patchCarnival(base,allocate,add){
  const pointer=(table,id,address,label)=>{const p=new Uint8Array(3);put24(p,0,0xc00000|address);add(table+id*3,p,label);};
  assertUnusedSpriteSlot(base,0,253);for(const id of[238,239,240,241,242])assertUnusedSpriteSlot(base,1,id);assertUnusedPalette(base,170);
  const headers=spriteHeaders(base),audit=[];
  function install(actor,frames,map,shared,skipGraphics=false){
    const p=actor.enemy===undefined?0x24f000+(actor.npc+7)*5:0x24f600+actor.enemy*10;
    if((base[p+4]&3)!==(actor.size??0))throw Error('Carnival native cell budget changed');
    const compiled=shared??compileSpriteFrames(frames,actor),cells=compiled.assembly.length/frames.length/10;
    if(map)for(let f=0;f<frames.length;f++)for(let c=0;c<cells;c++){
      const o=f*cells*10+cells*8+c*2;compiled.assembly[o]=(compiled.assembly[o]+map[f].x)&255;compiled.assembly[o+1]=(compiled.assembly[o+1]+map[f].y)&255;
    }
    if(!skipGraphics)pointer(0x242000,actor.gfx,allocate(compress(compiled.graphics),actor.name+' graphics'),actor.name+' graphics pointer');
    pointer(0x242300,actor.asm,allocate(compiled.assembly,actor.name+' frames'),actor.name+' assembly pointer');
    add(p,Uint8Array.from([actor.gfx,actor.asm,actor.palette,...(actor.animation===undefined?[]:[actor.animation,0])]),actor.name+' sprite header');
    if(actor.enemy!==undefined)add(0xc6500+actor.enemy*11,encode(actor.short,{length:11}),actor.name+' battle name');
    const raster=rasterArtInfo(actor.art??actor.key);
    audit.push({...actor,tiles:compiled.tiles,graphicsBytes:compiled.graphics.length,assemblyBytes:compiled.assembly.length,frameMap:map??[],rasterCoverage:{rasterFrames:raster?frames.length:0,proceduralFrames:raster?0:frames.length,blankFrames:0,sources:raster?.provenance??[]},native:true});
  }
  for(const actor of carnivalCast){
    if(headers.some(h=>base[h.offset+2]===actor.palette&&(h.kind!=='enemy'||h.id!==actor.enemy)))throw Error('Carnival enemy palette is shared');
    const map=carnivalFrameMap(actor.key);if(map.length!==actor.frames)throw Error('Carnival frame count changed');
    const frames=map.map(p=>actor.key==='great-milenko'?milenkoSprite(p):clownSprite(actor.key,p)),field=carnivalFields.find(f=>f.art===actor.key);
    if(field){
      const p=0x24f000+(field.npc+7)*5;if(![28,17,133,11,0].every((v,i)=>base[p+i]===v))throw Error('Carnival spare NPC header signature mismatch');
      const fm=carnivalFieldMap(),ff=fm.map(p=>clownSprite(actor.key,p)),merged=mergeSpriteBanks([compileSpriteFrames(frames,actor),compileSpriteFrames(ff)]);
      install(actor,frames,map,{...merged,assembly:merged.assemblies[0]});
      install(field,ff,fm,{...merged,assembly:merged.assemblies[1]},true);
    }else install(actor,frames,map);
  }
  for(const prop of hatchetProps)install(prop,Array.from({length:prop.frames},(_,f)=>hatchetSprite(prop.key,f)));
  for(const [key,id]of[...carnivalCast.map(a=>[a.key,a.palette]),['hatchet',170]]){
    const colors=new Uint8Array(24);carnivalColors[key].forEach((c,i)=>put16(colors,i*2,snesColor(c)));add(0x240000+u16(base,0x242a00+id*2),colors,key+' private palette');
  }
  // The Hero Badge retains its original special-case weapon check. Its help
  // text must use the new name too; this shorter string fits the owned slot.
  const desc=0xc0000+u16(base,0xc2eb1+179*2),text=encodeDialogue('Ups critical hit rate of Hatchet{null}',base);
  let end=desc;while(base[end])end++;if(text.length>end-desc+1)throw Error('Hatchet badge description exceeds original slot');
  add(desc,text,'Hero Badge hatchet description');
  return {actors:audit,extraVramBytes:0,extraWramBytes:0,stats:'preserved',quest:'native two-stage fight, restoration and awakening'};
}

export function carnivalEvent(event,location){
  const changes={
    151:[[0x594,0x82,46,216],[0x5fe,0x82,46,217],[0x768,0x82,46,216],[0x7d5,0x82,46,217]],
    119:[[2230,0x82,46,53],[2284,0x82,41,54]],
    401:[[1694,0x83,151,152]]
  }[location];
  if(!changes)return event;
  const out=event.slice();
  // Four local child actors represent the two guardians before/after combat.
  // Clone their headers; ordinary children elsewhere keep their own artwork.
  for(const [position,opcode,original,replacement]of changes){
    const p=position+1;if(out[p]!==opcode||out[p+1]!==original)throw Error('Hatchet quest actor signature mismatch');out[p+1]=replacement;
  }
  return out;
}
