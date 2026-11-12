import {guyFieriTiers,guyFieriColors} from '../content/guy-fieri.js';
import {rasterArt,rasterArtInfo} from './raster-art.js';
import {compileSpriteFrames,mergeSpriteBanks,assertUnusedSpriteSlot,assertUnusedPalette} from './native-sprites.js';
import {u16,put16,put24} from './rom.js';
import {snesColor} from './sprites.js';
import {compress} from './compression.js';
import {encode} from './text.js';

const P=(facing,pose,phase=0,x=0,y=0)=>({facing,pose,phase,x,y});
export function guyFieriFrameMap(tier){
  const count=guyFieriTiers[tier].frames,map=Array.from({length:count},(_,f)=>f<12?P(Math.floor(f/3),'walk',[1,0,2][f%3]):null);
  const write=(start,poses)=>poses.forEach((p,i)=>map[start+i]=p);
  if(tier===0)write(12,[P(1,'hit'),P(1,'cast'),P(1,'cast',1),P(1,'guard'),P(1,'point'),P(1,'raise'),P(0,'cast'),P(0,'jump',0,0,-10),P(1,'cast'),P(1,'jump',0,0,-10),P(2,'windup'),P(2,'attack',0,-5),P(3,'windup'),P(3,'attack',0,5)]);
  if(tier===1)write(12,[P(1,'hit'),P(1,'cast'),P(1,'cast',1)]);
  if(tier===2)write(12,[P(1,'hit'),P(0,'windup'),P(0,'attack'),P(0,'guard'),P(1,'windup'),P(1,'attack'),P(1,'guard'),P(2,'windup'),P(2,'attack',0,-5),P(2,'guard'),P(3,'windup'),P(3,'attack',0,5),P(3,'guard'),P(1,'sit'),P(0,'idle')]);
  if(tier===3)write(12,[P(1,'hit'),P(0,'windup'),P(0,'attack'),P(1,'windup'),P(1,'attack'),P(2,'windup'),P(2,'attack',0,-5),P(3,'windup'),P(3,'attack',0,5)]);
  if(tier===4){
    write(0,Array.from({length:9},(_,f)=>P([2,1,3][Math.floor(f/3)],'walk',[1,0,2][f%3])));
    write(9,[P(0,'cast',0,0,-8),P(0,'attack'),P(1,'cast',0,0,-8),P(1,'attack'),P(2,'cast',0,0,-8),P(2,'attack'),P(3,'cast',0,0,-8),P(3,'attack'),P(1,'hit'),P(1,'raise'),P(1,'down')]);
  }
  if(tier===5)write(12,[P(1,'raise'),P(1,'guard'),P(1,'raise',1),P(1,'hit'),P(0,'cast'),P(0,'tuck',0,0,-12),P(1,'cast'),P(1,'impact',0,0,5),P(2,'windup'),P(2,'attack',0,-8),P(3,'windup'),P(3,'attack',0,8)]);
  for(const role of map){
    if(tier===0&&['cast','point','raise','jump','windup','attack'].includes(role?.pose))role.pose='spatula-'+role.pose;
    if(tier===1&&role?.pose==='cast')role.pose='unarmed-cast';
  }
  if(map.some(p=>!p))throw Error('Unassigned Guy Fieri pose');return map;
}

// Small generated-palette effects add progression without drawing replacement
// anatomy. Their fixed edge tiles keep the complete six-form bank below the
// native ten-bit tile limit; the body is composited over them below.
function addTierEffects(tier,spec,out,width){
  const dot=(x,y,c)=>{if(x>=0&&x<width&&y>=0&&y<out.length/width)out[y*width+x]=c;};
  const cross=(x,y,c)=>{dot(x,y,8);dot(x-1,y,c);dot(x+1,y,c);dot(x,y-1,c);dot(x,y+1,c);};
  if(tier===1&&spec.pose==='unarmed-cast'){
    const drift=spec.phase?1:0;cross(3,4,6);cross(28,3+drift,6);dot(6,1,8);dot(25,7-drift,5);
  }
  if(tier===2&&spec.pose==='attack'){
    const left=spec.facing===3,x=left?3:28;
    for(let i=0;i<4;i++)dot(x+(left?1:-1)*(i%2),3+i*3,[5,6,8,6][i]);
    cross(left?6:25,5,6);
  }
  if(tier===5){
    const crown=[[1,7,5],[2,5,6],[3,3,6],[4,1,8],[5,4,5],[6,6,6]];
    for(const[x,y,c]of crown){dot(x,y,c);dot(31-x,y,c);}
    for(const[x,y,c]of[[1,25,5],[4,28,6],[2,23,8]]){dot(x,y,c);dot(31-x,y,c);}
    if(['cast','raise'].includes(spec.pose))for(const[x,y,c]of[[1,20,5],[3,17,6],[1,13,6],[4,10,8],[6,15,5]]){dot(x,y,c);dot(31-x,y,c);}
  }
}

// Entries 6 and 7 shade his hair and face and also draw his shirt flames. The diner
// and blue-inferno tiers recolor it cyan, which turned his face blue. Above
// the collar, every tier shades with
// his tan skin entries (2 and 3) instead, so all six tiers keep sharing one set of body
// tiles; the shirt keeps each tier's flames.
function warmHead(tier,body){
  let collar=32;
  // His sunglasses share the shirt's dark entry, so the collar is the first of
  // three consecutive rows with several shirt pixels.
  const shirtRow=y=>{let n=0;for(let x=0;x<32;x++)if(body[y*32+x]===8)n++;return n>=4;};
  for(let y=0;y<30;y++)if(shirtRow(y)&&shirtRow(y+1)&&shirtRow(y+2)){collar=y;break;}
  const out=body.slice();
  for(let i=0;i<collar*32;i++){if(out[i]===7)out[i]=3;else if(out[i]===6)out[i]=2;}
  return out;
}

export function guyFieriSprite(tier,spec){
  const {width,height}=guyFieriTiers[tier],source=rasterArt('guy-fieri',spec),out=new Uint8Array(width*height);
  if(!source||source.length!==1024)throw Error('Missing generated Guy Fieri body pose');
  const body=warmHead(tier,source);
  if(tier===3||tier===4){
    const key=tier===3?'guy-fieri-mantle':'guy-fieri-halo',effect=rasterArt(key,{pose:'aura',facing:1,phase:spec.phase});
    if(!effect||effect.length!==out.length)throw Error('Missing generated Guy Fieri effect pose');
    out.set(effect);
  }
  addTierEffects(tier,spec,out,width);
  const ox=(width-32)/2,oy=height-32;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(body[y*32+x])out[(oy+y)*width+ox+x]=body[y*32+x];
  if(out.some(v=>v>12))throw Error('Guy Fieri artwork exceeds twelve opaque colors');
  return out;
}

export function patchGuyFieri(base,allocate,add){
  const gfx=252;assertUnusedSpriteSlot(base,0,gfx);
  for(const key of ['guy-fieri','guy-fieri-mantle','guy-fieri-halo']){
    const art=rasterArtInfo(key);if(!art||art.palette.some((c,i)=>c!==guyFieriColors(0)[i])||art.palette.length!==12)throw Error('Guy Fieri source palette changed');
  }
  const maps=guyFieriTiers.map((_,i)=>guyFieriFrameMap(i)),compiled=guyFieriTiers.map((t,i)=>compileSpriteFrames(maps[i].map(p=>guyFieriSprite(i,p)),t));
  const merged=mergeSpriteBanks(compiled),pointer=(table,id,p,label)=>{const b=new Uint8Array(3);put24(b,0,0xc00000|p);add(table+id*3,b,label);};
  pointer(0x242000,gfx,allocate(compress(merged.graphics),'Guy Fieri shared graphics'),'Guy Fieri graphics pointer');
  for(let tier=0;tier<guyFieriTiers.length;tier++){
    const t=guyFieriTiers[tier],p=0x24f600+t.id*10,cells=(t.size&2?3:1)*(t.size&1?8:4);
    if((base[p+4]&3)!==t.size)throw Error('Guy Fieri native cell budget changed');assertUnusedSpriteSlot(base,1,t.asm);
    if(base[p+2]!==t.palette)assertUnusedPalette(base,t.palette);
    const assembly=merged.assemblies[tier];
    for(let f=0;f<t.frames;f++)for(let c=0;c<cells;c++){
      const o=f*cells*10+cells*8+c*2;assembly[o]=(assembly[o]+maps[tier][f].x)&255;assembly[o+1]=(assembly[o+1]+maps[tier][f].y)&255;
    }
    pointer(0x242300,t.asm,allocate(assembly,'Guy Fieri tier '+tier+' assembly'),'Guy Fieri tier '+tier+' assembly pointer');
    const palette=new Uint8Array(24);guyFieriColors(tier).forEach((c,i)=>put16(palette,i*2,snesColor(c)));
    add(0x240000+u16(base,0x242a00+t.palette*2),palette,'Guy Fieri tier '+tier+' palette');
    add(p,Uint8Array.of(gfx,t.asm,t.palette),'Guy Fieri tier '+tier+' header');
    add(0xc6500+t.id*11,encode('Guy Fieri',{length:11}),'Guy Fieri tier '+tier+' battle name');
  }
  return {gfx,tiles:merged.tiles,graphicsBytes:merged.graphics.length,extraWramBytes:0,extraVramBytes:0,tiers:guyFieriTiers.map((t,i)=>({...t,frameMap:maps[i]}))};
}
