import {cosmicMuffinRaster} from './generated-cosmic-muffin-art.js';
import {cosmicMuffinActors,cosmicMuffinColors,cosmicMuffinEnemyIds,cosmicMuffinSpawnFamilies} from '../content/cosmic-muffin.js';
import {nativeRasterArt} from './raster-art.js';
import {sceneCells} from './scene-map.js';
import {spriteHeaders} from './native-sprites.js';
import {compress,decompress} from './compression.js';
import {tile4bpp,snesColor} from './sprites.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {cartridgeDataAddress} from './expanded-rom.js';
import {encode} from './text.js';

const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const require=(condition,message)=>{if(!condition)throw Error('Cosmic Muffin: '+message);};
const pixels=key=>Uint8Array.from(cosmicMuffinRaster[key].pixels,v=>parseInt(v,16));
export function cosmicMuffinSpawnSprite(key,frame){
 const group=cosmicMuffinSpawnFamilies.find(f=>f.key===key)?.groups[0];
 require(group,'unknown offspring art');return nativeRasterArt(key,frame,group);
}

export function compileCosmicMuffinMouth(base){
 const headers=spriteHeaders(base),owners=headers.filter(h=>base[h.offset]===163||base[h.offset+1]===155);
 require(owners.length===cosmicMuffinActors.length,'mouth ownership changed');
 for(const h of owners){const a=cosmicMuffinActors.find(a=>h.kind==='enemy'?a.enemy===h.id:a.npc===h.id);require(a&&equal(base.subarray(h.offset,h.offset+5),[a.gfx,a.asm,a.palette,a.animation,a.size]),'mouth header changed');}
 const source=fileOffset(u24(base,0x242300+155*3)),assembly=base.slice(source,source+560),tiles=[new Uint8Array(32)],ids=new Map([[Array(32).fill(0).join(','),0]]),frames=[];
 for(let f=0;f<7;f++){
  const frame=nativeRasterArt('cosmic-muffin-mouth',f,{width:64,height:64,frames:7}),coverage=new Uint8Array(4096);frames.push(frame);
  for(let c=0;c<8;c++){
   let x=assembly[f*80+64+c*2],y=assembly[f*80+65+c*2];if(x>127)x-=256;if(y>127)y-=256;
   const cell=new Uint8Array(256);
   for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){const sx=x+32+xx,sy=y+48+yy;if(sx>=0&&sx<64&&sy>=0&&sy<64){cell[yy*16+xx]=frame[sy*64+sx];coverage[sy*64+sx]=1;}}
   for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){
    const tile=tile4bpp(cell,16,xx*8,yy*8),key=Array.from(tile).join(',');let id=ids.get(key);if(id===undefined){id=tiles.length;tiles.push(tile);ids.set(key,id);}put16(assembly,f*80+yy*32+c*4+xx*2,id);
   }
  }
  require(!frame.some((v,i)=>v&&!coverage[i]),'mouth source clips native cells');
 }
 const graphics=Uint8Array.from(tiles.flatMap(t=>Array.from(t)));
 require(graphics.length<=32768,'mouth tile bank exceeds native indices');
 return {graphics,assembly,frames};
}

export function compileCosmicMuffinBackground(base){
 const body=pixels('body');require(body.length===256*144,'body dimensions changed');
 const banks=[193,194,128].map((id,i)=>{const source=decompress(base,fileOffset(u24(base,0x362220+id*3))).bytes;require(source.length===[4096,4096,1536][i],'background size changed');return{id,source,graphics:source.slice()};});
 const pages=new Map(banks.map((b,i)=>[i+4,b])),used=new Map(),coverage=new Uint8Array(body.length),all=sceneCells(base,34,29);
 const cells=all.filter(c=>c.layer===0&&c.x<256&&c.y<144&&(c.word>>10&7)===7&&(c.word&1023)!==256);
 const holes=all.filter(c=>c.layer===0&&c.x>=256&&c.x<320&&c.y>=256&&c.y<304);
 function cell(c,ox,oy){
  const tile=c.word&1023,bank=pages.get(tile>>7);if(!bank){require(tile===256,'unknown body tile page');return;}
  const p=new Uint8Array(64);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const sx=c.x-ox+x,sy=c.y-oy+y;require(sx>=0&&sx<256&&sy>=0&&sy<144,'body map origin changed');p[(c.word&0x8000?7-y:y)*8+(c.word&0x4000?7-x:x)]=body[sy*256+sx];coverage[sy*256+sx]=1;}
  const bytes=tile4bpp(p,8,0,0);require(!used.has(tile)||equal(used.get(tile),bytes),'body breaks a mirrored tile alias');used.set(tile,bytes);bank.graphics.set(bytes,(tile&127)*32);
 }
 cells.forEach(c=>cell(c,0,0));holes.forEach(c=>cell(c,160,160));
 require(!body.some((v,i)=>v&&!coverage[i]),'body source clips its native map');
 for(const t of[21,22,23,24])require(equal(banks[2].graphics.subarray(t*32,t*32+32),banks[2].source.subarray(t*32,t*32+32)),'shared vortex edge changed');
 for(let ts=0;ts<64;ts++)for(const id of[193,194,128])require(base.subarray(0x361c00+ts*8,0x361c00+(ts+1)*8).includes(id)===(ts===29),'background graphics ownership changed');
 for(let loc=0;loc<512;loc++){const p=0x360000+loc*14;require((base[p+1]===29)===[422,423,466,467].includes(loc),'tileset ownership changed');require((base[p+3]===61)===[422,423,466,467].includes(loc),'background palette ownership changed');}
 for(const map of[33,34,47])for(const c of sceneCells(base,map,29)){const t=c.word&1023;if(used.has(t))require((c.word>>10&7)===7,'body tile has a foreign palette owner');if((c.word>>10&7)===7&&!pages.has(t>>7))require(t===256,'body palette recolors architecture');}
 return {banks,cells:cells.length,postDefeatCells:holes.length,modifiedTiles:[...used.keys()].sort((a,b)=>a-b)};
}

export function compileCosmicMuffinWorld(base){
 const p=pixels('world'),source=decompress(base,fileOffset(u24(base,0x6fdf6))).bytes,graphics=source.slice(),changed=new Set();require(source.length===8192&&p.length===64*41,'world dimensions changed');
 const body=new Uint8Array(64*32),front=new Uint8Array(32*32);
 for(let y=0;y<32;y++){body.set(p.subarray((y+9)*64,(y+10)*64),y*64);front.set(p.subarray(y*64+16,y*64+48),y*32);}
 function cell(data,w,x,y,tile){for(let ty=0;ty<2;ty++)for(let tx=0;tx<2;tx++){const t=tile+ty*16+tx;graphics.set(tile4bpp(data,w,x+tx*8,y+ty*8),t*32);changed.add(t);}}
 for(let y=0;y<2;y++)for(let x=0;x<4;x++)cell(body,64,x*16,y*16,y*8+x*2);
 for(let y=0;y<2;y++)for(let x=0;x<2;x++)cell(front,32,x*16,y*16,96+x*4+y*2);
 const compound=new Uint8Array(p.length);for(let y=0;y<32;y++)compound.set(body.subarray(y*64,(y+1)*64),(y+9)*64);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(front[y*32+x])compound[y*64+x+16]=front[y*32+x];require(equal(compound,p),'world components fail to reconstruct source');
 return {graphics,changedTiles:[...changed].sort((a,b)=>a-b)};
}

export function compileCosmicMuffinMeteor(base){
 const p=pixels('meteor'),source=decompress(base,fileOffset(u24(base,0x3e002d))).bytes,map=decompress(base,fileOffset(u24(base,0x3e0030))).bytes,graphics=source.slice(),used=new Set();require(source.length===1248&&map.length===448&&p.length===48*56,'meteor dimensions changed');
 for(let ty=0;ty<7;ty++)for(let tx=0;tx<6;tx++){const t=map[ty*64+tx];if(!t)continue;require(!used.has(t),'meteor map shares nonblank tiles');used.add(t);for(let y=0;y<8;y++)for(let x=0;x<8;x+=2)graphics[t*32+y*4+x/2]=p[(ty*8+y)*48+tx*8+x]|p[(ty*8+y)*48+tx*8+x+1]<<4;}
 for(let y=0;y<56;y++)for(let x=0;x<48;x++){const t=map[(y>>3)*64+(x>>3)],v=graphics[t*32+(y&7)*4+((x&7)>>1)];require(((x&1)?v>>4:v&15)===p[y*48+x],'meteor low-nibble texture mismatch');}
 for(const t of[0,36])require(equal(graphics.subarray(t*32,t*32+32),source.subarray(t*32,t*32+32)),'reserved meteor tile changed');
 return {graphics,changedTiles:[...used].sort((a,b)=>a-b)};
}

export function patchCosmicMuffin(base,allocate,add,{streamedGraphics=new Set(),allocateGraphics=allocate}={}){
 const mouth=compileCosmicMuffinMouth(base),background=compileCosmicMuffinBackground(base),world=compileCosmicMuffinWorld(base),meteor=compileCosmicMuffinMeteor(base);
 const old=decompress(base,fileOffset(u24(base,0x242000+163*3))).bytes;require(streamedGraphics.has(163)||mouth.graphics.length<=old.length,'mouth needs the existing native graphics stream');
 function packet(pointer,bytes,label,gfx){const packed=compress(bytes),offset=gfx===undefined?allocate(packed,label):allocateGraphics(packed,label,gfx),p=new Uint8Array(3);put24(p,0,cartridgeDataAddress(offset));add(pointer,p,label+' pointer');return{pointer,offset,rawBytes:bytes.length,compressedBytes:packed.length};}
 const mouthPacket=packet(0x242000+163*3,mouth.graphics,'Cosmic Muffin mouth graphics',163),assembly=allocate(mouth.assembly,'Cosmic Muffin mouth assembly'),ap=new Uint8Array(3);put24(ap,0,cartridgeDataAddress(assembly));add(0x242300+155*3,ap,'Cosmic Muffin mouth assembly pointer');
 const colors=new Uint8Array(24);cosmicMuffinColors.forEach((c,i)=>put16(colors,i*2,snesColor(c)));
 const pal=u16(base,0x242a00+207*2);for(let i=0;i<256;i++)require(i===207||u16(base,0x242a00+i*2)!==pal,'mouth palette has a pointer alias');
 for(const h of spriteHeaders(base))if(base[h.offset+2]===207)require(h.kind==='enemy'&&cosmicMuffinEnemyIds.includes(h.id),'mouth palette has another owner');add(0x240000+pal,colors,'Cosmic Muffin mouth palette');
 for(const id of cosmicMuffinEnemyIds)add(0xc6500+id*11,encode('The Muffin',{length:11}),'Cosmic Muffin battle name '+id);
 const bgs=background.banks.map(b=>({id:b.id,...packet(0x362220+b.id*3,b.graphics,'Cosmic Muffin background '+b.id)}));
 const bgPalette=new Uint8Array(30);cosmicMuffinRaster.body.palette.forEach((c,i)=>put16(bgPalette,i*2,snesColor(c)));add(0x3624c0+61*210+6*30,bgPalette,'Cosmic Muffin background palette 61:7');
 return {mouth:{...mouthPacket,assembly,frames:7,cells:8,owners:cosmicMuffinActors.length},background:{packets:bgs,cells:background.cells,postDefeatCells:background.postDefeatCells,modifiedTiles:background.modifiedTiles},world:{...packet(0x6fdf6,world.graphics,'Cosmic Muffin overworld graphics'),changedTiles:world.changedTiles},meteor:{...packet(0x3e002d,meteor.graphics,'Cosmic Muffin meteor texture'),changedTiles:meteor.changedTiles},extraVramBytes:0,extraWramBytes:0};
}
