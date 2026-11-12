import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {u24,fileOffset,validateRom} from '../../../engine/rom.js';
import {compress,decompress} from '../../../engine/compression.js';
import {tile4bpp} from '../../../engine/sprites.js';
import {compileFurnaceBackground} from '../../../engine/furnace-background.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(path.join(d,p)));
export async function compileBodyDraft(){
 const base=await validateRom(fs.readFileSync(path.join(root,'.local/chrono-trigger-usa.sfc'))),native=read('native-audit.json'),contract=read('background-contract.json'),asset=read('body-draft/preview-raster.json'),derive=read('body-derivation.json'),pixels=Uint8Array.from(asset.frames[0],c=>parseInt(c,16));
 assert.equal(sha(base),native.sourceRomSha256);assert.equal(sha(pixels),derive.nativePixelSha256,'The derived native PNG imports without any changed pixel.');assert.deepEqual(asset.palette,native.family.actors[0].colors);const guarded=compileFurnaceBackground(base);
 assert.equal(guarded.cells.length,215);assert.equal(guarded.edges.length,32);assert.deepEqual(guarded.tiles,contract.body.ownedTiles);assert.deepEqual(guarded.edgeTiles,contract.edges.ownedTiles);
 const banks=[];for(const[id,cells,tileBase,originY,owned]of[[190,guarded.cells,640,32,guarded.tiles],[171,guarded.edges,896,544,guarded.edgeTiles]]){
  const original=decompress(base,fileOffset(u24(base,0x362220+id*3))),graphics=original.bytes.slice(),seen=new Map();let checks=0;
  for(const c of cells){const x=c.x-72,y=c.y-originY,p=new Uint8Array(64);for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++)p[yy*8+(c.word&0x4000?7-xx:xx)]=pixels[(y+yy)*112+x+xx];
   const tile=(c.word&1023)-tileBase,bytes=tile4bpp(p,8,0,0);if(seen.has(tile))assert.deepEqual(bytes,seen.get(tile),'Repeated native BG tile'+id+':'+tile);seen.set(tile,bytes);graphics.set(bytes,tile*32);checks+=64;
  }
  for(let tile=0;tile<graphics.length/32;tile++)if(!owned.includes(tile))assert.deepEqual(graphics.slice(tile*32,tile*32+32),original.bytes.slice(tile*32,tile*32+32),'Unowned architecture tile'+id+':'+tile);
  const compressed=compress(graphics);assert.deepEqual(decompress(compressed,0).bytes,graphics);banks.push({id,graphics,compressed,report:{id,rawBytes:graphics.length,compressedBytes:compressed.length,originalCompressedBytes:original.length,compressedGrowth:compressed.length-original.length,ownedTiles:owned,unownedTilesPreserved:graphics.length/32-owned.length,mapCells:cells.length,exactCellPixelChecks:checks,graphicsSha256:sha(graphics),compressedSha256:sha(compressed)}});
 }
 return{base,asset,pixels,banks,report:{status:'Inactive generated stationary body, exact source-derived left/right mirror and owned tile reuse validated.',width:112,height:152,paletteGroups:contract.paletteGroups,bodyMapOrigin:[72,32],buriedEdgeMapOrigin:[72,544],banks:banks.map(b=>b.report),rawGrowth:0,extraVramBytes:0,extraWramBytes:0,unownedArchitectureBytesChanged:0,opaquePixelsOutsideOwnedCells:0,derivation:derive}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){const c=await compileBodyDraft();for(const b of c.banks){fs.writeFileSync(path.join(d,'body-draft','bg'+b.id+'.4bpp'),b.graphics);fs.writeFileSync(path.join(d,'body-draft','bg'+b.id+'.ct-lz'),b.compressed);}fs.writeFileSync(path.join(d,'body-draft-audit.json'),JSON.stringify(c.report,null,2)+'\n');console.log(JSON.stringify(c.report.banks.map(b=>({id:b.id,raw:b.rawBytes,compressed:b.compressedBytes,growth:b.compressedGrowth,owned:b.ownedTiles.length,unowned:b.unownedTilesPreserved}))));}
