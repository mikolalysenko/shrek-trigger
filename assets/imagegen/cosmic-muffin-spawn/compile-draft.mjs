import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {compress,decompress} from '../../../engine/compression.js';
const d=import.meta.dirname;
export const sha=b=>createHash('sha256').update(b).digest('hex');
const rgb=h=>[0,2,4].map(n=>parseInt(h.slice(n,n+2),16));
export function render(pixels,width,height,palette,scale=1) {
  const p=new PNG({width:width*scale,height:height*scale});
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++) {
    const v=pixels[(y/scale|0)*width+(x/scale|0)];
    p.data.set(v?[...rgb(palette[v-1]),255]:[32,42,48,255],(y*p.width+x)*4);
  }
  return PNG.sync.write(p);
}
export function compileDraft({headMethod='area'}={}) {
  const audit=JSON.parse(fs.readFileSync(path.join(d,'native-audit.json'))),out=[];
  for(const key of ['shell','head']) {
    const source=audit.banks.find(b=>b.key===key),method=key==='shell'?'area':headMethod;
    const art=JSON.parse(fs.readFileSync(path.join(d,`${key}-${method}/preview-raster.json`)));
    const width=art.width,height=art.height,origin=key==='shell'?[64,88]:[16,32];
    const anchor=[width/2-origin[0],height-origin[1]];
    const frames=art.frames.map(p=>Uint8Array.from(p,v=>parseInt(v,16)));
    if(key==='shell')frames.push(new Uint8Array(width*height));
    const xy=source.rows.map(row=>row.cells.map(c=>[c.x+origin[0],c.y+origin[1]]));
    if(key==='shell'){xy[0][6]=[80,32];xy[0][12]=[0,64];}
    const native=compileSpriteFrames(frames,{width,height,size:key==='shell'?3:0,frameCellOrigins:xy});
    for(let f=0;f<2;f++)for(let c=0;c<source.cells;c++)for(let axis=0;axis<2;axis++)
      native.assembly[f*source.cells*10+source.cells*8+c*2+axis]+=anchor[axis];
    const c={...native,key,method,width,height,origin,anchor,frames,cells:source.cells};
    const packed=compress(c.graphics);assert.deepEqual(decompress(packed,0).bytes,c.graphics);
    const proof=[];
    for(let f=0;f<2;f++) {
      const recon=new Uint8Array(width*height),cells=nativeSpriteCells({...c,frames:2},f);
      for(const cell of cells)for(let i=0;i<256;i++) {
        const v=cell.pixels[i];if(!v)continue;
        const x=cell.x+(i&15)+origin[0],y=cell.y+(i>>4)+origin[1],idx=y*width+x;
        assert(x>=0&&x<width&&y>=0&&y<height);assert(!recon[idx]);recon[idx]=v;
      }
      assert.deepEqual(recon,frames[f]);
      proof.push({frame:f,opaquePixels:recon.reduce((n,v)=>n+!!v,0),pixelsSha256:sha(recon),cellXY:cells.map(c=>[c.x,c.y])});
    }
    out.push({...c,compressed:packed,audit:{key,method,gfx:source.gfx,asm:source.asm,owners:source.owners.map(o=>o.id),palette:208,paletteUnchanged:true,frames:2,cells:source.cells,rawBytes:c.graphics.length,originalRawBytes:source.graphics.rawBytes,rawGrowth:c.graphics.length-source.graphics.rawBytes,compressedBytes:packed.length,originalCompressedBytes:source.graphics.compressedBytes,compressedGrowth:packed.length-source.graphics.compressedBytes,assemblyBytes:c.assembly.length,assemblySha256:sha(c.assembly),graphicsSha256:sha(c.graphics),compressedSha256:sha(packed),nativePixelRoundTrips:proof,cellChanges:key==='shell'?[{frame:0,cell:6,old:[-16,-72],next:[16,-56]},{frame:0,cell:12,old:[-32,-72],next:[-64,-24]}]:[],blankFrames:key==='shell'?[1]:[],anchor,width,height,frameCellOrigins:xy}});
  }
  return {candidates:out,palette:audit.palette.hex,audit};
}
if(process.argv[1]===new URL(import.meta.url).pathname) {
  for(const headMethod of process.argv.includes('--compare')?['area','nearest']:['area']) {
    const c=compileDraft({headMethod}),review=path.join(d,'review');fs.mkdirSync(review,{recursive:true});
    for(const a of c.candidates) {
      if(a.key==='shell'&&headMethod!=='area')continue;
      const dir=path.join(d,a.key==='shell'?'shell-draft':`head-${headMethod}-draft`);fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,'graphics.4bpp'),a.graphics);fs.writeFileSync(path.join(dir,'graphics.ct-lz'),a.compressed);fs.writeFileSync(path.join(dir,'assembly.bin'),a.assembly);fs.writeFileSync(path.join(dir,'audit.json'),JSON.stringify(a.audit,null,2)+'\n');
      const pixels=new Uint8Array(a.width*2*a.height);
      for(let f=0;f<2;f++)for(let y=0;y<a.height;y++)pixels.set(a.frames[f].subarray(y*a.width,(y+1)*a.width),y*a.width*2+f*a.width);
      for(const scale of [1,4])fs.writeFileSync(path.join(review,`${a.key}-${a.method}-${scale}x.png`),render(pixels,a.width*2,a.height,c.palette,scale));
      console.log(a.audit.key,a.audit.method,a.audit.rawBytes,a.audit.compressedBytes);
    }
    const shell=c.candidates[0],head=c.candidates[1],compound=new Uint8Array(128*2*96);
    for(let f=0;f<2;f++)for(const a of [shell,head]) {
      const src=a.frames[a.key==='shell'?0:f],off=[64-a.origin[0],88-a.origin[1]];
      for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++) {
        const v=src[y*a.width+x],xx=x+off[0],yy=y+off[1];if(!v)continue;
        assert(xx>=0&&xx<128&&yy>=0&&yy<96);compound[yy*256+f*128+xx]=v;
      }
    }
    for(const scale of [1,4])fs.writeFileSync(path.join(review,`compound-${headMethod}-${scale}x.png`),render(compound,256,96,c.palette,scale));
  }
}
