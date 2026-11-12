import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {decompress,compress} from '../../../engine/compression.js';
import {tile4bpp} from '../../../engine/sprites.js';
import {sampleWorld,render,sha} from './sample-world.mjs';
const d=import.meta.dirname;
export function compileDraft(){
 const base=fs.readFileSync(path.resolve(d,'../../../.local/chrono-trigger-usa.sfc'));
 assert.equal(sha(base),'06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9');
 const source=decompress(base,0x5b798),r=sampleWorld(base,{targetWidth:64,method:'area'}),graphics=source.bytes.slice(),body=new Uint8Array(64*32),front=new Uint8Array(32*32),changedTiles=new Set();
 assert.deepEqual(r.audit.outsideNativeCoverage,[]);
 for(let y=0;y<32;y++)body.set(r.pixels.subarray((y+9)*64,(y+10)*64),y*64);
 for(let y=0;y<32;y++)front.set(r.pixels.subarray(y*64+16,y*64+48),y*32);
 const putCell=(pixels,width,x,y,tile)=>{for(let ty=0;ty<2;ty++)for(let tx=0;tx<2;tx++){const t=tile+ty*16+tx;graphics.set(tile4bpp(pixels,width,x+tx*8,y+ty*8),t*32);changedTiles.add(t);}};
 for(let y=0;y<2;y++)for(let x=0;x<4;x++)putCell(body,64,x*16,y*16,y*8+x*2);
 for(let y=0;y<2;y++)for(let x=0;x<2;x++)putCell(front,32,x*16,y*16,96+x*4+y*2);
 const composite=body.reduce((a,v,i)=>(a[(Math.floor(i/64)+9)*64+i%64]=v,a),new Uint8Array(64*41));
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(front[y*32+x])composite[y*64+x+16]=front[y*32+x];
 assert.deepEqual(composite,r.pixels,'Native compound placement must reconstruct every sampled source pixel');
 for(let t=0;t<256;t++)if(!changedTiles.has(t))assert.deepEqual(graphics.subarray(t*32,t*32+32),source.bytes.subarray(t*32,t*32+32),'Unrelated world tile '+t);
 const compressed=compress(graphics);assert.deepEqual(decompress(compressed,0).bytes,graphics);
 const audit={...r.audit,sourceRomSha256:sha(base),graphicsResource:2,pointerOffset:0x6fdf6,originalOffset:0x5b798,rawBytes:graphics.length,rawGrowth:0,compressedBytes:compressed.length,originalCompressedBytes:source.length,compressedGrowth:compressed.length-source.length,graphicsSha256:sha(graphics),compressedSha256:sha(compressed),changedTiles:[...changedTiles].sort((a,b)=>a-b),untouchedTiles:256-changedTiles.size,paletteUnchanged:true,assemblies:[{pointer:0xc3f269,cells:8,component:'base',sourceCrop:[0,9,64,32],nativeOffset:[-32,0]},{pointer:0xc3f2dc,cells:4,component:'rising-front',sourceCrop:[16,0,32,32],nativeOffset:[-16,-16]}],restingFrontRelativeToBase:[16,-9],restingCompound:[64,41],assemblyBytesChanged:0,nativeProgramsChanged:0};
 return {graphics,compressed,body,front,compound:composite,palette:r.palette,audit};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const c=compileDraft(),o=path.join(d,'draft');fs.mkdirSync(o,{recursive:true});fs.writeFileSync(path.join(o,'world.4bpp'),c.graphics);fs.writeFileSync(path.join(o,'world.ct-lz'),c.compressed);for(const[name,pixels,w,h]of[['body',c.body,64,32],['front',c.front,32,32],['compound',c.compound,64,41]])for(const scale of[1,6])fs.writeFileSync(path.join(o,`${name}-${scale}x.png`),PNG.sync.write(render(pixels,w,h,c.palette,scale)));fs.writeFileSync(path.join(o,'audit.json'),JSON.stringify(c.audit,null,2)+'\n');console.log(c.audit);}
