import {u16} from './rom.js';
import {townsfolk} from '../content/townsfolk.js';

export const fairTownkeepers={location:5,event:27,fromNpc:22,toNpc:89,objects:[16,24,25],operands:[2134,2383,2417],extraWramBytes:0,extraVramBytes:0};

// The fair's five automatic OBJ rows are occupied by three racer palettes,
// the shared civilian palette133 and the Muffin Man's new palette139.
// Use the existing same-art palette133 merchant variant in this scene. Its
// event object still owns the original conversation, shop and viewport tests.
export function fairTownkeeperEvent(event,location){
 if(location!==fairTownkeepers.location)return event;
 const a=townsfolk.find(a=>a.npcs?.includes(22)),b=townsfolk.find(a=>a.npcs?.includes(89));
 if(!a||!b||a.palette!==9||b.palette!==133||!['gfx','asm','animation','size','art','frames'].every(k=>a[k]===b[k]))throw Error('Fair townkeeper variant is no longer compatible');
 if(event[0]!==29||event.length!==2570||![2132,2381,2415].every((entry,i)=>u16(event,1+fairTownkeepers.objects[i]*32)===entry)||!fairTownkeepers.operands.every(p=>event[p-1]===0x82&&event[p]===22))throw Error('Fair townkeeper load signature changed');
 const out=event.slice();for(const p of fairTownkeepers.operands)out[p]=89;return out;
}
