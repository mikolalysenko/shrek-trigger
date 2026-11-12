import {u16,u24,fileOffset} from './rom.js';
import {decompress} from './compression.js';

// Native scene maps: six-byte header, byte-per-metatile layers, then RLE
// three-byte properties. The first two property bits extend metatile IDs.
// Keep all original collision and scrolling bytes when changing artwork.
export function sceneMap(rom,id) {
  const bytes=decompress(rom,fileOffset(u24(rom,0x361e00+id*3))).bytes,layers=[],properties=[];let p=6;
  for(let i=0;i<3;i++) {
    if(i===2&&!(bytes[1]&128))break;
    const size=i===2?bytes[1]&15:bytes[0]>>(i*4)&15,width=16*(1+(size&3)),height=16*(1+(size>>2));
    layers.push({width,height,tiles:bytes.slice(p,p+width*height)});p+=width*height;
  }
  const width=Math.max(layers[0].width,layers[1].width),height=Math.max(layers[0].height,layers[1].height);
  while(p<bytes.length){const a=bytes[p++],b=bytes[p++],c=bytes[p++],count=a&128?(bytes[p++]||256):1;for(let n=0;n<count;n++)properties.push([a&127,b,c]);}
  if(properties.length<width*height)throw Error('Incomplete scene properties '+id);
  for(let l=0;l<2;l++)layers[l].tiles=Uint16Array.from(layers[l].tiles,(n,i)=>n|((properties[Math.floor(i/layers[l].width)*width+i%layers[l].width][0]>>l&1)<<8));
  return {bytes,layers,width,height,properties};
}

export function sceneCells(rom,mapId,tileset) {
  const map=sceneMap(rom,mapId),assembly=decompress(rom,fileOffset(u24(rom,0x362100+tileset*3))).bytes,cells=[];
  for(let l=0;l<2;l++) {
    const layer=map.layers[l];
    for(let i=0;i<layer.tiles.length;i++)for(let c=0;c<4;c++){
      const index=layer.tiles[i]*8+c*2;
      cells.push({x:i%layer.width*16+(c%2)*8,y:Math.floor(i/layer.width)*16+(c>>1)*8,word:u16(assembly,index),index,layer:l});
    }
  }
  return cells;
}
