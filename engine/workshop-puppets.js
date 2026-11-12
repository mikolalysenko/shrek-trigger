import {workshopPuppet as a} from '../content/workshop-puppets.js';
import {spriteHeaders} from './native-sprites.js';
import {snesColor} from './sprites.js';
import {encode} from './text.js';
import {u16,put16} from './rom.js';
export function patchWorkshopPuppets(base,add){
  const p=0x24f600+a.enemy*10;
  if(![a.gfx,a.asm,a.palette,a.animation,a.size].every((v,i)=>base[p+i]===v))throw Error('Workshop puppet header signature mismatch');
  if(spriteHeaders(base).some(h=>base[h.offset+2]===a.palette&&(h.kind!=='enemy'||h.id!==a.enemy)))throw Error('Workshop puppet palette is shared');
  const pal=u16(base,0x242a00+a.palette*2);
  for(let id=0;id<256;id++)if(id!==a.palette&&u16(base,0x242a00+id*2)===pal)throw Error('Workshop puppet palette pointer is aliased');
  const colors=new Uint8Array(24);a.colors.forEach((c,i)=>put16(colors,i*2,snesColor(c)));
  add(0x240000+pal,colors,'Workshop puppet wooden uniform palette');
  add(0xc6500+a.enemy*11,encode(a.short,{length:11}),'Workshop puppet battle name');
  return{enemy:a.enemy,sharedPlayer:3,frames:a.frames,palette:a.palette,graphicsBytesAdded:0,assemblyBytesAdded:0,extraVramBytes:0,extraWramBytes:0};
}
