import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{PNG}from'pngjs';
import{decompress,compress}from'../../../engine/compression.js';import{u24,fileOffset}from'../../../engine/rom.js';
import{sampleMeteor}from'./sample-meteor.mjs';import{render,sha}from'./sample-world.mjs';
const d=import.meta.dirname;
export function compileMeteor(){
 const base=fs.readFileSync(path.resolve(d,'../../../.local/chrono-trigger-usa.sfc'));assert.equal(sha(base),'06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9');
 const offset=fileOffset(u24(base,0x3e002d)),old=decompress(base,offset),r=sampleMeteor(base,{targetWidth:48,bottom:49,method:'area'}),graphics=old.bytes.slice(),changedTiles=new Set();assert.deepEqual(r.audit.outsideNativeCoverage,[]);
 for(let ty=0;ty<7;ty++)for(let tx=0;tx<6;tx++){const t=r.map[ty*64+tx];if(!t)continue;assert(!changedTiles.has(t),'Original native map unexpectedly shares a nonblank texture tile');changedTiles.add(t);for(let y=0;y<8;y++)for(let x=0;x<8;x+=2){const v=r.pixels[(ty*8+y)*48+tx*8+x],w=r.pixels[(ty*8+y)*48+tx*8+x+1];graphics[t*32+y*4+x/2]=v|w<<4;}}
 const decoded=new Uint8Array(48*56);for(let y=0;y<56;y++)for(let x=0;x<48;x++){const t=r.map[(y>>3)*64+(x>>3)],v=graphics[t*32+(y&7)*4+((x&7)>>1)];decoded[y*48+x]=(x&1)?v>>4:v&15;}
 assert.deepEqual(decoded,r.pixels);for(const t of[0,36])assert.deepEqual(graphics.subarray(t*32,t*32+32),old.bytes.subarray(t*32,t*32+32));
 const compressed=compress(graphics);assert.deepEqual(decompress(compressed,0).bytes,graphics);
 const audit={...r.audit,sourceRomSha256:sha(base),resource:0x0d,pointerOffset:0x3e002d,originalOffset:offset,encoding:'Row-major packed 4bpp, low nibble first; native Mode7 loader expands to 8bpp.',rawBytes:graphics.length,rawGrowth:0,compressedBytes:compressed.length,originalCompressedBytes:old.length,compressedGrowth:compressed.length-old.length,graphicsSha256:sha(graphics),compressedSha256:sha(compressed),changedTiles:[...changedTiles].sort((a,b)=>a-b),preservedTiles:[0,36],map:{resource:0x0e,pointerOffset:0x3e0030,originalOffset:0x3e4acc,rawBytes:r.map.length,bytesChanged:0,sha256:sha(r.map)},nativeTransformsAndCodeUnchanged:true,starsAndPlanetUnchanged:true};
 return{graphics,compressed,pixels:decoded,palette:r.palette,map:r.map,audit};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const c=compileMeteor(),o=path.join(d,'meteor');fs.mkdirSync(o,{recursive:true});fs.writeFileSync(path.join(o,'meteor.packed4bpp'),c.graphics);fs.writeFileSync(path.join(o,'meteor.ct-lz'),c.compressed);for(const scale of[1,6])fs.writeFileSync(path.join(o,`native-${scale}x.png`),PNG.sync.write(render(c.pixels,48,56,c.palette,scale)));fs.writeFileSync(path.join(o,'audit.json'),JSON.stringify(c.audit,null,2)+'\n');console.log(c.audit);}
