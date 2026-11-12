import {dulocTank,dulocTankColors,tankBodyCells} from '../content/duloc-tank.js';
import {dulocTankSprite} from './duloc-tank-art.js';
import {compileSpriteFrames,spriteHeaders} from './native-sprites.js';
import {compress} from './compression.js';
import {encode} from './text.js';
import {u16,put16,put24} from './rom.js';
import {snesColor} from './sprites.js';
import {cartridgeDataAddress} from './expanded-rom.js';
export function patchDulocTank(base,allocate,add,{allocateGraphics=allocate}={}){
  const headers=spriteHeaders(base),ids=dulocTank.map(a=>a.enemy),result=[];
  for(const a of dulocTank){
    const h=0x24f600+a.enemy*10;
    if(![a.gfx,a.asm,a.palette,a.animation,a.size].every((v,i)=>base[h+i]===v))throw Error('Duloc Tank header signature changed');
    for(const[field,id]of[[0,a.gfx],[1,a.asm]])if(headers.some(h=>base[h.offset+field]===id&&(h.kind!=='enemy'||h.id!==a.enemy)))throw Error('Duloc Tank bank is shared');
    const compiled=compileSpriteFrames(Array.from({length:a.frames},(_,f)=>dulocTankSprite(a.key,f)),{...a,cellOrigins:a.enemy===147?tankBodyCells:undefined}),cells=compiled.assembly.length/a.frames/10;
    for(let f=0;f<a.frames;f++)for(let c=0;c<cells;c++){
      const p=f*cells*10+cells*8+c*2;compiled.assembly[p]+=a.anchor[0];compiled.assembly[p+1]+=a.anchor[1];
    }
    const g=allocateGraphics(compress(compiled.graphics),a.name+' compressed graphics',a.gfx),s=allocate(compiled.assembly,a.name+' native frames');
    for(const[table,id,offset,label]of[[0x242000,a.gfx,g,'graphics'],[0x242300,a.asm,s,'assembly']]){
      const pointer=new Uint8Array(3);put24(pointer,0,label==='graphics'?cartridgeDataAddress(offset):0xc00000|offset);add(table+id*3,pointer,a.name+' '+label+' pointer');
    }
    add(0xc6500+a.enemy*11,encode(a.short,{length:11}),a.name+' battle name');
    result.push({...a,cells,graphicsBytes:compiled.graphics.length,assemblyBytes:compiled.assembly.length,graphicsOffset:g,assemblyOffset:s,tiles:compiled.tiles});
  }
  const palette=184,p=u16(base,0x242a00+palette*2);
  if(headers.some(h=>base[h.offset+2]===palette&&(h.kind!=='enemy'||!ids.includes(h.id))))throw Error('Duloc Tank palette has another owner');
  for(let id=0;id<256;id++)if(id!==palette&&u16(base,0x242a00+id*2)===p)throw Error('Duloc Tank palette pointer is aliased');
  const colors=new Uint8Array(24);dulocTankColors.forEach((c,i)=>put16(colors,i*2,snesColor(c)));add(0x240000+p,colors,'Duloc Tank shared palette');
  return {actors:result,extraVramBytes:0,extraWramBytes:0};
}
