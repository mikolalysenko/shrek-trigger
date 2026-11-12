import {donkeyFamily,donkeyFamilyRooms} from '../content/donkey-family.js';
import {rasterArt,rasterArtInfo} from './raster-art.js';
import {u16} from './rom.js';

// The Wolf, the Blind Mouse and young Donkey (content/donkey-family.js). Their pixels are the
// imported generated rasters; this module only maps native frame slots to
// them, checks the source rows they stand in for, and repoints their rooms.
const SPARE=[28,17,133,11,0]; // the row every never-loaded NPC id holds

export function donkeyFamilyFrames(actor){
  const info=rasterArtInfo(actor.key);
  if(!info||info.width!==32||info.height!==32)throw Error(actor.name+' has no imported 32x32 raster');
  if(actor.frameMap.length!==actor.frames)throw Error(actor.name+' frame map does not match its native program');
  return actor.frameMap.map((role,frame)=>{
    const pixels=rasterArt(actor.key,role);
    if(!pixels)throw Error(`${actor.name} frame ${frame} has no imported pose ${role.pose}/${role.facing}`);
    if(role.pose!=='blank'&&!pixels.some(Boolean))throw Error(`${actor.name} frame ${frame} is blank`);
    return pixels;
  });
}

// Tenants of the empty-house actor's graphics bank (engine/native-sprites.js).
export function donkeyFamilyTenants(base){
  return donkeyFamily.map(actor=>{
    const source=base.subarray(0x24f000+(actor.sourceNpc+7)*5,0x24f000+(actor.sourceNpc+7)*5+5),own=base.subarray(0x24f000+(actor.npc+7)*5,0x24f000+(actor.npc+7)*5+5);
    if(source[0]!==actor.source.gfx||source[1]!==actor.source.asm||source[2]!==actor.source.palette||source[4]&3)throw Error(actor.name+' source actor changed');
    if(!SPARE.every((v,i)=>own[i]===v))throw Error(`NPC ${actor.npc} is not a spare actor row`);
    const info=rasterArtInfo(actor.key);
    let colors=info.palette;
    if(actor.stockPalette){
      // Drawn in the source actor's shared palette, which is not rewritten.
      const p=0x240000+u16(base,0x242a00+actor.palette*2),stock=Array.from({length:12},(_,i)=>{const c=u16(base,p+i*2);return[0,5,10].map(s=>{const v=c>>s&31;return(v<<3|v>>2).toString(16).padStart(2,'0');}).join('');});
      if(actor.palette!==actor.source.palette||stock.join()!==info.palette.join())throw Error(actor.name+' art is not indexed in stock palette '+actor.palette);
      colors=null;
    }
    return {actor,frames:donkeyFamilyFrames(actor),colors,label:actor.name,row:[source[3],source[4]],provenance:info.provenance};
  });
}

export const donkeyFamilyLocations=Object.keys(donkeyFamilyRooms).map(Number);

// Same-length edits: each room's Load NPC operand, inside the actor's own
// object, names the private row. No pointer, flag, branch or object moves.
export function donkeyFamilyEvent(event,location){
  const room=donkeyFamilyRooms[location];if(!room)return event;
  if(event.length!==room.length||event[0]!==room.objects)throw Error('Donkey family event '+location+' changed size');
  const out=event.slice();let edits=0;
  for(const actor of donkeyFamily){
    const offset=actor.rooms[location];if(offset===undefined)continue;
    // The load is the first command of one object's initialization.
    const object=Array.from({length:room.objects},(_,o)=>u16(event,1+o*32)).indexOf(offset-1);
    if(object<0||event[offset]!==0x82||event[offset+1]!==actor.sourceNpc)throw Error(`Donkey family event ${location} signature changed at ${offset}`);
    out[offset+1]=actor.npc;edits++;
  }
  if(!edits)throw Error('Donkey family event '+location+' has no actor');
  return out;
}
