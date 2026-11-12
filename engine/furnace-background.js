import {furnaceBody} from './bakery-art.js';
import {furnaceColors,buriedFurnaceColors} from '../content/bakery-actors.js';
import {sceneCells} from './scene-map.js';
import {compress,decompress} from './compression.js';
import {snesColor,tile4bpp} from './sprites.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';

const bodyTiles=new Set([5,6,7]);
const palettes=[{id:76,locations:[301,458],slots:[5,6,7],colors:furnaceColors},{id:79,locations:[197],slots:[6,7],colors:buriedFurnaceColors}];
export function compileFurnaceBackground(base){
 const source=decompress(base,fileOffset(u24(base,0x362220+190*3))).bytes,
  edgeSource=decompress(base,fileOffset(u24(base,0x362220+171*3))).bytes;
 if(source.length!==4096||edgeSource.length!==512)throw Error('Furnace background graphics length changed');
 for(const[id,owners]of[[190,[41,52]],[171,[52]]])for(let ts=0;ts<64;ts++){
  if(base.slice(0x361c00+ts*8,0x361c00+(ts+1)*8).includes(id)!==owners.includes(ts))throw Error('Furnace background graphics ownership changed');
 }
 for(const[ts,locations]of[[41,[261,298,301,458]],[52,[197]]])for(let loc=0;loc<512;loc++)if((base[0x360001+loc*14]===ts)!==locations.includes(loc))throw Error('Furnace tileset ownership changed');
 const all=sceneCells(base,158,41),cells=all.filter(c=>c.layer===0&&bodyTiles.has(c.word>>10&7)&&(c.word&1023)>=640&&(c.word&1023)<768),
  rust=sceneCells(base,41,52),edges=rust.filter(c=>c.layer===0&&(c.word&1023)>=896&&(c.word&1023)<912&&[6,7].includes(c.word>>10&7)),
  pixels=furnaceBody(),coverage=new Uint8Array(pixels.length),tiles=new Map(),edgeTiles=new Map(),graphics=source.slice(),edgeGraphics=edgeSource.slice();
 if(cells.length!==215||edges.length!==32)throw Error('Furnace body map footprint changed');
 const compile=(list,tileBase,originY,target,used,cover)=>{
  for(const c of list){
   const x=c.x-72,y=c.y-originY;
   if(x<0||y<0||x+8>112||y+8>152||c.word&0x8000)throw Error('Unexpected furnace body cell');
   const p=new Uint8Array(64);for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){
    const index=(y+yy)*112+x+xx;if(cover)coverage[index]=1;p[yy*8+(c.word&0x4000?7-xx:xx)]=pixels[index];
   }
   const tile=(c.word&1023)-tileBase,bytes=tile4bpp(p,8,0,0),previous=used.get(tile);
   if(previous&&!previous.every((v,i)=>v===bytes[i]))throw Error('Furnace body breaks shared tile '+tile);
   used.set(tile,bytes);target.set(bytes,tile*32);
  }
 };
 compile(cells,640,32,graphics,tiles,true);compile(edges,896,544,edgeGraphics,edgeTiles,false);
 const outside=[];for(let i=0;i<pixels.length;i++)if(pixels[i]&&!coverage[i])outside.push([i%112,i/112|0]);
 if(outside.length)throw Error('Furnace body pixels outside native cells: '+JSON.stringify(outside.slice(0,12))+' ('+outside.length+')');
 // The lair exterior uses four stone tiles in this otherwise creature-owned
 // bank. Floor and arch pieces in the keep are also left byte-for-byte intact.
 for(const[map,ts,first]of[[154,41,640],[158,41,640]])for(const c of sceneCells(base,map,ts)){
  const t=(c.word&1023)-first;if(t>=0&&t<128&&(map===154||!bodyTiles.has(c.word>>10&7))&&tiles.has(t))throw Error('Furnace body overwrites shared architecture');
 }
 for(const[preset,map,ts,first]of[[palettes[0],158,41,640],[palettes[1],41,52,768]]){
  for(let loc=0;loc<512;loc++)if((base[0x360003+loc*14]===preset.id)!==preset.locations.includes(loc))throw Error('Furnace background palette ownership changed');
  for(const c of sceneCells(base,map,ts))if(preset.slots.includes(c.word>>10&7)){
   const t=c.word&1023;if(t!==256&&!(t>=first&&t<first+128)&&!(ts===52&&t>=896&&t<912))throw Error('Furnace palette affects another object');
  }
 }
 return {graphics,edgeGraphics,cells,edges,tiles:[...tiles.keys()].sort((a,b)=>a-b),edgeTiles:[...edgeTiles.keys()].sort((a,b)=>a-b)};
}

export function patchFurnaceBackground(base,allocate,add){
 const c=compileFurnaceBackground(base),resources=[];
 for(const[id,bytes]of[[190,c.graphics],[171,c.edgeGraphics]]){
  const offset=allocate(compress(bytes),'Furnace body graphics '+id),pointer=new Uint8Array(3);put24(pointer,0,0xc00000|offset);
  add(0x362220+id*3,pointer,'Furnace body graphics pointer '+id);resources.push({id,offset,graphicsBytes:bytes.length});
 }
 for(const p of palettes){
  const bytes=new Uint8Array(30);[...p.colors,p.colors[1],p.colors[5],p.colors[4]].forEach((color,i)=>put16(bytes,i*2,snesColor(color)));
  for(const slot of p.slots)add(0x3624c0+p.id*210+(slot-1)*30,bytes,'Furnace body palette '+p.id+':'+slot);
 }
 return {resources,locations:[301,458,197],cells:c.cells.length,edgeCells:c.edges.length,tiles:c.tiles,edgeTiles:c.edgeTiles,width:112,height:152,extraVramBytes:0,extraWramBytes:0};
}
