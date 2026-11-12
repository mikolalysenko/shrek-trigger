import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {PNG} from 'pngjs';
import {nativeSpriteBank,nativeSpriteCells} from './native-sprite-view.mjs';
import {rasterArt,rasterArtInfo} from '../engine/raster-art.js';

// Pose guides for the Wolf, Blind Mouse and young Donkey source sheets. Each guide
// lays existing frames out in the grid the prompt asks for, enlarged with
// nearest-neighbor on the flat key color, so the image model keeps the pose
// order, facing and scale. Nothing here is cartridge art.
//  - The Wolf and the Mouse: the stock frames their event objects used, read from the
//    owner's ROM. These guides contain original game pixels, so they are
//    written under .local/ (ignored) and only their hashes are recorded.
//  - Young Donkey: the party Donkey's own imported frames (project art),
//    written beside the prompt.
const root=path.resolve(import.meta.dirname,'..');
const KEY=[255,0,255];
function sheet(frames,{columns,rows,width=1536,height=1024,scale}){
  const png=new PNG({width,height}),cw=width/columns,ch=height/rows;
  for(let p=0;p<width*height;p++)png.data.set([...KEY,255],p*4);
  frames.forEach(({pixels,palette,size=32},i)=>{
    const ox=Math.round((i%columns)*cw+(cw-size*scale)/2),oy=Math.round(Math.floor(i/columns)*ch+(ch-size*scale)/2);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=pixels[y*size+x];if(!v)continue;const c=palette[v-1];
      for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++)png.data.set([...c,255],((oy+y*scale+sy)*width+ox+x*scale+sx)*4);
    }
  });
  return PNG.sync.write(png);
}
function stockFrames(rom,npc,count,ids){
  const h=0x24f000+(npc+7)*5,[gfx,asm,palette,,size]=rom.slice(h,h+5),bank=nativeSpriteBank(rom,{gfx,asm,palette,size,frames:count});
  return ids.map(id=>{
    const pixels=new Uint8Array(1024);
    for(const c of nativeSpriteCells(bank,id))for(let i=0;i<256;i++)if(c.pixels[i]){const x=16+c.x+(i&15),y=32+c.y+(i>>4);if(x>=0&&x<32&&y>=0&&y<32)pixels[y*32+x]=c.pixels[i];}
    return {pixels,palette:bank.palette};
  });
}
const rom=new Uint8Array(await readFile(path.join(root,'.local/chrono-trigger-usa.sfc')));
const local=path.join(root,'.local/qa/donkey-family/reference');await mkdir(local,{recursive:true});
// Stock townswoman (NPC 213): the sixteen cells of assets/imagegen/wolf/prompt-base-v1.txt.
await writeFile(path.join(local,'wolf-pose-guide-v1.png'),sheet(stockFrames(rom,213,21,[0,1,2,19,4,6,8,10,12,13,16,17,18,5,9,2]),{columns:4,rows:4,scale:7}));
// Stock tradesman (NPC 39): prompt-base-v1 (twelve cells) and prompt-actions-v1 (eight cells).
await writeFile(path.join(local,'mouse-base-pose-guide-v1.png'),sheet(stockFrames(rom,39,31,[0,1,2,28,4,6,8,10,12,13,29,30]),{columns:4,rows:3,scale:9}));
await writeFile(path.join(local,'mouse-actions-pose-guide-v1.png'),sheet(stockFrames(rom,39,31,[16,17,18,19,22,23,26,1]),{columns:4,rows:2,scale:10}));
// Party Donkey: rear, front and left idles, then both walking contacts of each.
const hex=c=>[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)),palette=rasterArtInfo('donkey').palette.map(hex);
const donkey=[[0,'idle',0],[1,'idle',0],[2,'idle',0],[0,'walk',1],[0,'walk',3],[1,'walk',1],[1,'walk',3],[2,'walk',1],[2,'walk',3]].map(([facing,pose,phase])=>({pixels:rasterArt('donkey',{facing,pose,phase}),palette}));
await writeFile(path.join(root,'assets/imagegen/young-donkey/reference-donkey-v1.png'),sheet(donkey,{columns:3,rows:3,width:1024,height:1024,scale:9}));
// The Mouse's accepted base sheet flattened onto the key color (the API returned
// real alpha): the character reference for his actions sheet.
try{
  const base=PNG.sync.read(await readFile(path.join(root,'assets/imagegen/blind-mouse/source-base-v1.png')));
  for(let p=0;p<base.width*base.height;p++){const a=base.data[p*4+3]/255;for(let c=0;c<3;c++)base.data[p*4+c]=Math.round(base.data[p*4+c]*a+KEY[c]*(1-a));base.data[p*4+3]=255;}
  await writeFile(path.join(root,'assets/imagegen/blind-mouse/reference-base-on-key-v1.png'),PNG.sync.write(base));
}catch(error){if(error.code!=='ENOENT')throw error;}
console.log('wrote pose guides');
