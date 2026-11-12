import {courtBeasts,courtBeastGeometry} from '../content/court-beasts.js';
import {courtBeastFrames,courtBeastSprite} from './court-beast-art.js';
import {compileSpriteFrames,spriteHeaders} from './native-sprites.js';
import {compress,decompress} from './compression.js';
import {encode} from './text.js';
import {u16,u24,fileOffset,put16,put24} from './rom.js';
import {snesColor} from './sprites.js';
import {cartridgeDataAddress} from './expanded-rom.js';
export function patchCourtBeasts(base,allocate,add,{streamedGraphics=new Set(),allocateGraphics=allocate}={}){
  const actor=courtBeasts[0],headers=spriteHeaders(base),ids=courtBeasts.map(a=>a.enemy);
  for(const[field,value]of[[0,actor.gfx],[1,actor.asm]])if(headers.some(h=>base[h.offset+field]===value&&(h.kind!=='enemy'||!ids.includes(h.id))))throw Error('Court beast bank has an unexpected owner');
  if(courtBeastFrames.length!==31)throw Error('Court beast frame map changed');
  const compiled=compileSpriteFrames(courtBeastFrames.map(courtBeastSprite),actor),streamed=streamedGraphics.has(actor.gfx);
  const source=decompress(base,fileOffset(u24(base,0x242000+actor.gfx*3))).bytes;
  if(!streamed&&compiled.graphics.length>source.length)throw Error('Court beast exceeds its original decoded graphics budget');
  for(let f=0;f<31;f++)for(let c=0;c<8;c++)for(let axis=0;axis<2;axis++)compiled.assembly[f*80+64+c*2+axis]+=(courtBeastGeometry.anchor?.[axis]??0)+(courtBeastGeometry.frameOffsets?.[f]?.[axis]??0);
  const g=allocateGraphics(compress(compiled.graphics),'court beasts compressed graphics',actor.gfx),a=allocate(compiled.assembly,'court beasts native frames');
  for(const[table,id,offset,label]of[[0x242000,actor.gfx,g,'graphics'],[0x242300,actor.asm,a,'assembly']]){
    const p=new Uint8Array(3);put24(p,0,cartridgeDataAddress(offset));add(table+id*3,p,'court beasts '+label+' pointer');
  }
  for(const b of courtBeasts){
    const p=0x24f600+b.enemy*10;
    if(![b.gfx,b.asm,b.palette,b.animation,b.size].every((v,i)=>base[p+i]===v))throw Error('Court beast header signature mismatch');
    if(headers.some(h=>base[h.offset+2]===b.palette&&(h.kind!=='enemy'||h.id!==b.enemy)))throw Error('Court beast palette is shared');
    const pal=u16(base,0x242a00+b.palette*2);
    for(let id=0;id<256;id++)if(id!==b.palette&&u16(base,0x242a00+id*2)===pal)throw Error('Court beast palette pointer is aliased');
    const colors=new Uint8Array(24);b.colors.forEach((c,i)=>put16(colors,i*2,snesColor(c)));add(0x240000+pal,colors,b.name+' palette');
    add(0xc6500+b.enemy*11,encode(b.short,{length:11}),b.name+' battle name');
  }
  return {actors:courtBeasts,frameMap:courtBeastFrames,graphicsBytes:compiled.graphics.length,sourceGraphicsBytes:source.length,graphicsStorage:streamed?'direct-rom':'decompressed-heap',assemblyBytes:compiled.assembly.length,tiles:compiled.tiles,graphicsOffset:g,assemblyOffset:a,cells:8,extraVramBytes:0,extraWramBytes:0};
}
