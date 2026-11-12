import {u16,u24,put24,fileOffset} from './rom.js';
import {compress,decompress} from './compression.js';
import {tile4bpp} from './sprites.js';
import {skyDrakeWorld} from './sky-drake-art.js';
import {rasterArtInfo} from './raster-art.js';

export function compileSkyDrakeWorld(base){
 // World sprite bank 10 belongs exclusively to prehistory. Other worlds,
 // Dragon's separate vehicle bank and the rider graphics remain independent.
 const owners=[];
 for(let world=0;world<8;world++){
  const p=0x60000+u16(base,0x6fd00+world*2);
  for(let slot=0;slot<4;slot++)if(base[p+12+slot]===10)owners.push([world,slot]);
 }
 if(JSON.stringify(owners)!=='[[3,0]]')throw Error('Sky-drake world graphics ownership changed');
 const graphics=decompress(base,fileOffset(u24(base,0x6fe0e))).bytes;
 if(graphics.length!==4096)throw Error('Sky-drake world bank size changed');
 const tiles=[];
 function copy(p,sx,sy,w,h,dx,dy){
  for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=8){const t=((dy+y)/8*16+(dx+x)/8);graphics.set(tile4bpp(p,32,sx+x,sy+y),t*32);tiles.push(t);}
 }
 for(let f=0;f<3;f++){
  copy(skyDrakeWorld('front',f),0,0,16,32,80+f*16,0);
  const p=skyDrakeWorld('back',f);copy(p,0,0,16,16,f*32,32);copy(p,0,16,16,16,f*32+16,32);
 }
 for(let f=0;f<2;f++)copy(skyDrakeWorld('left',f),0,0,32,32,f*32,0);
 const low=skyDrakeWorld('left',2);copy(low,0,8,16,16,64,0);copy(low,16,8,16,16,64,16);
 return{graphics,tiles:[...new Set(tiles)].sort((a,b)=>a-b),poses:9,palette:'native shared mount colors 8–15'};
}

export function patchSkyDrakeWorld(base,allocate,add){
 const c=compileSkyDrakeWorld(base),p=allocate(compress(c.graphics),'Sky-drake world graphics'),ptr=new Uint8Array(3);put24(ptr,0,0xc00000|p);add(0x6fe0e,ptr,'Sky-drake world graphics pointer');
 return{poses:c.poses,tiles:c.tiles,graphicsBytes:c.graphics.length,graphicsOffset:p,rasterCoverage:{rasterFrames:9,proceduralFrames:0,blankFrames:0,sources:rasterArtInfo('sky-drake-world').provenance},extraVramBytes:0,extraWramBytes:0};
}
