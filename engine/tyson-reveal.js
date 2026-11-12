import {tysonReveal} from '../content/tyson-reveal.js';
import {nativeRasterArt} from './raster-art.js';
import {compileActorFamily} from './actor-families.js';
import {spriteHeaders} from './native-sprites.js';
import {compress,decompress} from './compression.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {finalePalette} from './finale.js';
import {snesColor} from './sprites.js';

export function patchTysonReveal(base,allocate,add,priorRecords,{streamedGraphics=new Set()}={}){
 const a=tysonReveal,h=0x24f600+a.enemy*10,headers=spriteHeaders(base);
 if(![a.gfx,a.asm,a.palette,a.animation,a.size].every((v,i)=>base[h+i]===v))throw Error('Tyson reveal header changed');
 for(const field of [0,1])if(headers.some(h=>base[h.offset+field]===(field?a.asm:a.gfx)&&!(h.kind==='enemy'&&h.id===a.enemy)))throw Error('Tyson reveal resource has another owner');
 if(!streamedGraphics.has(a.gfx))throw Error('Tyson reveal requires the established native graphics stream');
 // The finale builder owns the shared palette; the reveal adds no color write.
 const p=0x240000+u16(base,0x242a00+a.palette*2),expected=new Uint8Array(24),actual=base.slice(p,p+24);
 finalePalette.forEach((c,i)=>put16(expected,i*2,snesColor(c)));
 for(const r of priorRecords)for(let i=Math.max(p,r.offset);i<Math.min(p+24,r.offset+r.bytes.length);i++)actual[i-p]=r.bytes[i-r.offset];
 if(!actual.every((v,i)=>v===expected[i]))throw Error('Tyson reveal requires the exact shared finale palette');
 const compiled=compileActorFamily({groups:[a]},(_,frame)=>nativeRasterArt(a.art,frame,a)),packed=compress(compiled.graphics),assembly=compiled.groups[0].assembly;
 const graphicsOffset=allocate(packed,'Tyson emergence graphics'),assemblyOffset=allocate(assembly,'Tyson emergence assembly');
 for(const[table,id,address,label]of[[0x242000,a.gfx,graphicsOffset,'graphics'],[0x242300,a.asm,assemblyOffset,'assembly']]){const pointer=new Uint8Array(3);put24(pointer,0,0xc00000|address);add(table+id*3,pointer,'Tyson emergence '+label+' pointer');}
 return {...a,graphicsOffset,graphicsBytes:compiled.graphics.length,sourceGraphicsBytes:decompress(base,fileOffset(u24(base,0x242000+a.gfx*3))).bytes.length,graphicsStorage:'direct-rom',assemblyOffset,assemblyBytes:assembly.length,cells:12,extraVramBytes:0,extraWramBytes:0};
}
