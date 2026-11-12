import {cast} from '../content/cast.js';
import {caretaker} from '../content/caretaker.js';
import {supportingCast} from '../content/supporting-cast.js';
import {u16,u24,fileOffset} from './rom.js';
import {decompress} from './compression.js';
import {nativeEventCount} from '../content/dialogue-ownership.js';

export const paradePalettes={location:80,event:84,changes:[
 {object:38,npc:0,offset:3103,from:7,to:4},
 {object:41,npc:215,offset:3193,from:7,to:0}
],extraWramBytes:0,extraVramBytes:0};

export function paradeEventSource(base){
 const {event,location}=paradePalettes;
 if(u16(base,0x360008+location*14)!==event)throw Error('Parade event ownership changed');
 const offset=fileOffset(u24(base,0x3cf9f0+event*3)),aliases=[];
 for(let id=0;id<nativeEventCount;id++)if(fileOffset(u24(base,0x3cf9f0+id*3))===offset)aliases.push(id);
 if(aliases.length!==1||aliases[0]!==event)throw Error('Parade event packet is shared');
 const source=decompress(base,offset);paradePaletteEvent(source.bytes,location);
 return {eventId:event,location,offset,length:source.length,bytes:source.bytes};
}

// The original parade forces almost every civilian into OBJ row7. The mother
// and the Muffin Man now have different colors, so their original row writes
// recolor the whole crowd. Row4 has no owner in this event. Fixed PC0 owns
// row0, and the mother's replacement (now the empty-house actor, which the
// parade removes when the room loads) uses exactly the same twelve colors.
export function paradePaletteEvent(event,location){
 if(location!==paradePalettes.location)return event;
 const muffin=supportingCast.find(a=>a.key==='muffin-man');
 if(caretaker.palette!==138||!caretaker.npcs.includes(215)||caretaker.colors.length!==12||!caretaker.colors.every((c,i)=>c===cast[0].palette[i])||muffin?.palette!==139||!muffin.npcs.includes(0))throw Error('Parade replacement palette ownership changed');
 const signatures=[[1715,[0x57,0x33,0]],[3100,[0x82,0,0x33,7]],[3190,[0x82,215,0x33,7]]];
 if(event.length!==3225||event[0]!==42||u16(event,1+2*32)!==1714||u16(event,1+38*32)!==3099||u16(event,1+41*32)!==3189||!signatures.every(([p,bytes])=>bytes.every((v,i)=>event[p+i]===v)))throw Error('Parade palette command signature changed');
 const out=event.slice();
 for(const c of paradePalettes.changes)out[c.offset]=c.to;
 return out;
}
