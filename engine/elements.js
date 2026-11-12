import {elements,elementHelp} from '../content/elements.js';
import {pixelCanvas} from './pixel-art.js';
import {tile4bpp,snesColor} from './sprites.js';
import {u16,put16} from './rom.js';
import {encodeDialogue,dialogueLength} from './text.js';

const glyphs={
 A:['0110','1001','1001','1111','1001','1001','1001'],
 I:['1111','0110','0110','0110','0110','0110','1111'],
 R:['1110','1001','1001','1110','1010','1001','1001'],
 D:['1110','1001','1001','1001','1001','1001','1110'],
 T:['1111','0110','0110','0110','0110','0110','0110']
};
export const elementBadgePalettes={
 Air:['000000','12282d','20414a','30606a','467f86','62999d','82b8ba','a8d9d4','d6f2e0','31535c','507985','72a1ae','97c4ca','bbdfdf','f7ffed','172f36'],
 Dirt:['000000','241d21','3d2925','57392b','704c32','8b653d','aa8451','d0ae74','f1d8a0','3c322b','585342','73775a','999b73','bdbe8e','fff0c2','32252a']
};
export function elementBadge(name){
 if(!elementBadgePalettes[name])throw Error('Unknown replacement element badge');
 const c=pixelCanvas(48,16);
 if(name==='Air'){
  for(const[y,len]of[[3,12],[7,9],[12,14]]){c.line(0,y,len,y,4);c.line(2,y+1,len+2,y+1,7);c.dot(len+2,y,8);c.line(47,y,47-len,y,3);c.line(46,y+1,45-len,y+1,6);}
 }else{
  c.polygon([[0,12],[4,8],[9,10],[13,6],[19,9],[26,7],[33,10],[40,6],[47,11],[47,15],[0,15]],3);
  c.line(0,14,47,14,5);for(const[x,y]of[[4,11],[10,14],[36,13],[43,10],[29,15]]){c.dot(x,y,7);c.dot(x+1,y,6);}
 }
 const text=name.toUpperCase(),ink=pixelCanvas(48,16),left=(48-(text.length*10-2))/2;
 [...text].forEach((letter,i)=>glyphs[letter].forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')ink.rect(left+i*10+x*2,1+y*2,2,2,y<2?14:y<4?8:7);})));
 for(let y=0;y<16;y++)for(let x=0;x<48;x++)if(ink.pixels[y*48+x])for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]])c.dot(x+dx,y+dy,1);
 ink.pixels.forEach((v,i)=>{if(v)c.pixels[i]=v;});return c.pixels;
}
export function elementBadgeTiles(name){
 const pixels=elementBadge(name),out=[];
 for(let y=0;y<16;y+=8)for(let x=0;x<48;x+=8)out.push(...tile4bpp(pixels,48,x,y));
 return Uint8Array.from(out);
}
export function patchElements(base,add){
 if(![0,4,6,8,4,8,2].every((v,i)=>base[0x2a2c6+i]===v))throw Error('Native character element mapping changed');
 if(![0xa2,0xe4,0xd5].every((v,i)=>base[0x296ee+i]===v))throw Error('Native status badge loader changed');
 const badges=[];
 for(const[name,index,palette]of[['Air',0,0xcd64],['Dirt',1,0xcd84]]){
  if(u16(base,0x3fce88+index*2)!==0x1900+index*12||u16(base,0x3fce92+index*2)!==palette)throw Error('Native element badge ownership changed');
  const offset=0x3fd5e4+index*384,tiles=elementBadgeTiles(name),colors=new Uint8Array(32);
  elementBadgePalettes[name].forEach((hex,i)=>put16(colors,i*2,snesColor(hex)));
  add(offset,tiles,name+' native status badge');add(0x3f0000+palette,colors,name+' native status palette');
  badges.push({name,offset,bytes:tiles.length,palette:0x3f0000+palette,tiles:12,width:48,height:16});
 }
 const pointers=[...Array.from({length:242},(_,i)=>0xc0000+u16(base,0xc2eb1+i*2)),...Array.from({length:130},(_,i)=>0xc0000+u16(base,0xc3a09+i*2))];
 for(const h of elementHelp){
  const table=h.kind==='item'?0xc2eb1:0xc3a09;
  if(0xc0000+u16(base,table+h.id*2)!==h.address)throw Error('Element help pointer changed');
  const old=encodeDialogue(h.source+'{null}',base),bytes=encodeDialogue(h.text+'{null}',base),capacity=dialogueLength(base,h.address);
  if(old.length!==capacity||!old.every((v,i)=>base[h.address+i]===v))throw Error('Element help source changed: '+h.id);
  if(bytes.length>capacity||pointers.some(p=>p>h.address&&p<h.address+capacity))throw Error('Element help overlaps another native string');
  add(h.address,bytes,h.kind+' '+h.id+' elemental help');
 }
 return{types:elements,badges,help:elementHelp,extraVramBytes:0,extraWramBytes:0,allocatedBytes:0,mechanics:'native elemental damage, resistance, MP, combos and progression unchanged',native:true};
}
