import {dorisTiers,dorisColors} from '../content/doris.js';
import {pixelCanvas} from './pixel-art.js';
import {compileSpriteFrames,mergeSpriteBanks,assertUnusedSpriteSlot,assertUnusedPalette} from './native-sprites.js';
import {u16,put16,put24} from './rom.js';
import {snesColor} from './sprites.js';
import {compress} from './compression.js';
import {encode} from './text.js';

const P=(facing,pose,phase=0,x=0,y=0)=>({facing,pose,phase,x,y});
export function dorisFrameMap(tier){
  const count=dorisTiers[tier].frames,map=Array.from({length:count},(_,f)=>f<12?P(Math.floor(f/3),'walk',[1,0,2][f%3]):null);
  const write=(start,poses)=>poses.forEach((p,i)=>map[start+i]=p);
  if(tier===0)write(12,[P(1,'hit'),P(1,'cast'),P(1,'cast',1),P(1,'guard'),P(1,'point'),P(1,'raise'),P(0,'cast'),P(0,'jump',0,0,-10),P(1,'cast'),P(1,'jump',0,0,-10),P(2,'windup'),P(2,'attack',0,-5),P(3,'windup'),P(3,'attack',0,5)]);
  if(tier===1)write(12,[P(1,'hit'),P(1,'cast'),P(1,'cast',1)]);
  if(tier===2)write(12,[P(1,'hit'),P(0,'windup'),P(0,'attack'),P(0,'guard'),P(1,'windup'),P(1,'attack'),P(1,'guard'),P(2,'windup'),P(2,'attack',0,-5),P(2,'guard'),P(3,'windup'),P(3,'attack',0,5),P(3,'guard'),P(1,'sit'),P(1,'down')]);
  if(tier===3)write(12,[P(1,'hit'),P(0,'windup'),P(0,'attack'),P(1,'windup'),P(1,'attack'),P(2,'windup'),P(2,'attack',0,-5),P(3,'windup'),P(3,'attack',0,5)]);
  if(tier===4){
    write(0,Array.from({length:9},(_,f)=>P([2,1,3][Math.floor(f/3)],'walk',[1,0,2][f%3])));
    write(9,[P(0,'cast',0,0,-8),P(0,'attack'),P(1,'cast',0,0,-8),P(1,'attack'),P(2,'cast',0,0,-8),P(2,'attack'),P(3,'cast',0,0,-8),P(3,'attack'),P(1,'hit'),P(1,'raise'),P(1,'down')]);
  }
  if(tier===5)write(12,[P(1,'raise'),P(1,'guard'),P(1,'raise',1),P(1,'hit'),P(0,'cast'),P(0,'jump',0,0,-12),P(1,'cast'),P(1,'jump',0,0,5),P(2,'windup'),P(2,'attack',0,-8),P(3,'windup'),P(3,'attack',0,8)]);
  if(map.some(p=>!p))throw Error('Unassigned Doris pose');return map;
}

export function dorisSprite(tier,spec){
  const {facing,pose,phase}=spec,{width,height}=dorisTiers[tier],c=pixelCanvas(32,32),{rect,oval,line,dot,polygon}=c;
  const side=facing>=2,back=facing===0,walk=pose==='walk',step=walk?phase-1:0,bob=walk&&phase===0?-1:0;
  const raised=['cast','raise','jump'].includes(pose),attack=pose==='attack',windup=pose==='windup';
  // Broad shoulders, swept black hair, strong brows and a pearl necklace keep
  // Doris recognizable under each lesson's different apron or cloak.
  rect(10,25,5,5-step,8);rect(20,25,5,5+step,8);rect(8,29-step,7,2,8);rect(20,29+step,7,2,8);
  polygon([[9,14],[24,14],[28,28],[5,28]],6);polygon([[12,16],[21,16],[24,27],[9,27]],7);line(8,27,25,27,5);
  if(tier<3){if(back){line(11,16,22,24,5);line(22,16,11,24,5);line(9,24,24,24,9);}else{rect(12,19,10,8,5);rect(14,19,6,1,9);rect(14,24,6,2,7);}}
  else {line(11,17,8,26,11);line(22,17,25,26,11);for(const[x,y]of[[12,21],[21,24],[16,26]]){dot(x,y,5);dot(x-1,y,9);dot(x+1,y,9);}}
  if(raised){line(10,17,5,10,3);oval(2,7,5,5,4);line(23,17,28,10,3);oval(26,7,5,5,4);}
  else if(attack){line(11,18,4,14,3);rect(1,12,5,4,4);line(23,17,27,22,3);oval(25,21,4,4,3);}
  else if(windup){line(10,17,7,11,3);oval(4,7,5,5,4);line(24,17,27,21,3);oval(25,20,4,5,3);}
  else if(pose==='guard'){line(8,18,15,21,3);line(25,18,18,21,3);rect(13,19,8,4,4);}
  else {rect(6,16+step,5,7,3);oval(5,21+step,5,5,4);rect(23,16-step,5,7,3);oval(24,21-step,5,5,4);}
  oval(9,3+bob,17,14,8);oval(10,6+bob,15,12,3);oval(12,7+bob,11,5,4);rect(8,7+bob,4,8,8);rect(24,7+bob,3,9,8);
  oval(9,0+bob,17,8,8);oval(11,1+bob,11,3,10);oval(14,0+bob,8,5,8);line(12,5+bob,22,4+bob,10);
  if(!back){
    if(side){rect(10,10+bob,5,2,11);dot(11,11+bob,9);dot(11,12+bob,1);rect(8,12+bob,4,3,4);line(10,15+bob,15,15+bob,12);}
    else{rect(11,10+bob,5,2,11);rect(19,10+bob,5,2,11);line(11,9+bob,15,9+bob,8);line(19,9+bob,23,9+bob,8);dot(13,11+bob,9);dot(21,11+bob,9);dot(13,12+bob,1);dot(21,12+bob,1);oval(15,12+bob,5,3,3);line(14,16+bob,21,16+bob,12);dot(20,15+bob,12);}
    for(const[x,y]of[[12,17],[14,18],[16,19],[18,19],[20,18],[22,17]])dot(x,y,9);
    dot(9,15+bob,5);dot(25,15+bob,5);
  }else{oval(9,5+bob,18,12,8);oval(14,5+bob,10,6,10);oval(15,6+bob,7,4,8);}
  // A spoon is sufficient for the first lesson; later lessons use a wand.
  const sx=attack?2:windup?5:28,sy=raised?0:windup?1:attack?1:17;
  if(tier===0){line(sx,sy+4,sx,sy+12,2);oval(sx-1,sy,4,6,5);line(sx,sy+1,sx,sy+4,2);}
  else if(tier>=2||raised){line(sx,sy+3,sx,Math.min(29,sy+13),11);rect(sx-2,sy+1,5,1,9);rect(sx,sy-1,1,5,5);}
  if(pose==='point'){line(8,18,2,16,3);rect(0,14,5,3,4);}
  if(pose==='hit'){line(12,11,15,12,1);line(19,12,22,11,1);rect(15,15,5,2,1);}
  let pixels=c.pixels;
  if(pose==='sit'){const out=new Uint8Array(1024);for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(pixels[y*32+x])out[Math.min(30,y+3)*32+x]=pixels[y*32+x];pixels=out;}
  if(pose==='down'){const out=new Uint8Array(1024);for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(pixels[y*32+x])out[(21+Math.floor(x/4))*32+31-y]=pixels[y*32+x];pixels=out;}
  if(facing===3){const out=new Uint8Array(1024);for(let y=0;y<32;y++)for(let x=0;x<32;x++)out[y*32+x]=pixels[y*32+31-x];pixels=out;}
  const out=pixelCanvas(width,height),ox=(width-32)/2,oy=height-32;
  // Larger native tiers spend their original cell budget on a magical mantle.
  if(tier===3){out.line(8,20,4,50,11);out.line(24,20,28,50,11);for(const[x,y]of[[8,20],[24,20],[3,40],[28,45]]){out.rect(x-2,y,5,1,9);out.rect(x,y-2,1,5,5);}}
  if(tier===4){out.oval(2,8,44,52,6);out.oval(4,10,40,48,0);out.oval(6,14,36,42,11);out.oval(7,15,34,40,0);for(const[x,y]of[[24,7],[5,30],[43,30],[12,48],[36,48]]){out.rect(x-2,y,5,1,5);out.rect(x,y-2,1,5,9);}}
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(pixels[y*32+x])out.dot(x+ox,y+oy,pixels[y*32+x]);
  const outlined=out.pixels.slice();for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(out.pixels[y*width+x])for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height&&!out.pixels[yy*width+xx])outlined[yy*width+xx]=1;}
  return outlined;
}

export function patchDoris(base,allocate,add){
  const gfx=252;assertUnusedSpriteSlot(base,0,gfx);
  const maps=dorisTiers.map((_,i)=>dorisFrameMap(i)),compiled=dorisTiers.map((t,i)=>compileSpriteFrames(maps[i].map(p=>dorisSprite(i,p)),t));
  const merged=mergeSpriteBanks(compiled),pointer=(table,id,p,label)=>{const b=new Uint8Array(3);put24(b,0,0xc00000|p);add(table+id*3,b,label);};
  pointer(0x242000,gfx,allocate(compress(merged.graphics),'Doris shared graphics'),'Doris graphics pointer');
  for(let tier=0;tier<dorisTiers.length;tier++){
    const t=dorisTiers[tier],p=0x24f600+t.id*10,cells=(t.size&2?3:1)*(t.size&1?8:4);
    if((base[p+4]&3)!==t.size)throw Error('Doris native cell budget changed');assertUnusedSpriteSlot(base,1,t.asm);
    if(base[p+2]!==t.palette)assertUnusedPalette(base,t.palette);
    const assembly=merged.assemblies[tier];
    for(let f=0;f<t.frames;f++)for(let c=0;c<cells;c++){
      const o=f*cells*10+cells*8+c*2;assembly[o]=(assembly[o]+maps[tier][f].x)&255;assembly[o+1]=(assembly[o+1]+maps[tier][f].y)&255;
    }
    pointer(0x242300,t.asm,allocate(assembly,'Doris tier '+tier+' assembly'),'Doris tier '+tier+' assembly pointer');
    const palette=new Uint8Array(24);dorisColors(tier).forEach((c,i)=>put16(palette,i*2,snesColor(c)));
    add(0x240000+u16(base,0x242a00+t.palette*2),palette,'Doris tier '+tier+' palette');
    add(p,Uint8Array.of(gfx,t.asm,t.palette),'Doris tier '+tier+' header');
    add(0xc6500+t.id*11,encode('Doris',{length:11}),'Doris tier '+tier+' battle name');
  }
  return {gfx,tiles:merged.tiles,graphicsBytes:merged.graphics.length,extraWramBytes:0,extraVramBytes:0,tiers:dorisTiers.map((t,i)=>({...t,frameMap:maps[i]}))};
}
