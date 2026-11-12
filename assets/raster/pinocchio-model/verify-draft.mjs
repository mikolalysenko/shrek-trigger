// Inactive asset proof. Compiles draft pixels in memory, never builds/writes a
// cartridge and never changes the active registry. Run in a fresh Node process.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {generatedRasterArt} from '../../../engine/generated-raster-art.js';
import {makeCharacterRecords,sprite,tile4bpp,snesColor} from '../../../engine/sprites.js';
import {portrait,portraitArtInfo} from '../../../engine/portraits.js';
import {compress} from '../../../engine/compression.js';
import {patchWorkshopPuppets} from '../../../engine/workshop-puppets.js';
import {workshopPuppet} from '../../../content/workshop-puppets.js';
import {cast} from '../../../content/cast.js';
import {u16,validateRom} from '../../../engine/rom.js';
const root=new URL('./',import.meta.url),directory=process.argv[2]??'draft-fixed-grid',hash=b=>createHash('sha256').update(b).digest('hex');
assert.ok(['draft','draft-mirrored','draft-fixed-grid'].includes(directory));
const provenance=JSON.parse(await readFile(new URL('provenance.json',root))),asset=JSON.parse(await readFile(new URL(directory+'/preview-raster.json',root))),face=JSON.parse(await readFile(new URL('portrait/preview-raster.json',root))),base=await validateRom(await readFile(new URL('../../../.local/chrono-trigger-usa.sfc',root)));
assert.equal(hash(await readFile(new URL(provenance.archive.file,root))),provenance.archive.sha256);
for(const source of provenance.contents.files)assert.equal(hash(await readFile(new URL(source.file,root))),source.sha256,source.file);
for(const source of [...asset.provenance,...face.provenance])assert.equal(hash(await readFile(new URL('../../../'+source.file,root))),source.sha256,source.file);
assert.deepEqual(asset.palette,cast[3].palette);assert.deepEqual(face.palette,cast[3].palette);
if(directory==='draft-fixed-grid'){
 const source=PNG.sync.read(await readFile(new URL(directory+'/source-poses.png',root))),manifest=JSON.parse(await readFile(new URL(directory+'/render-manifest.json',root)));
 for(const frame of manifest.frames)for(let y=0;y<32;y++)for(let x=0;x<32;x++)assert.equal(asset.frames[frame.index][y*32+x]!=='0',source.data[((frame.region[1]+y*4+2)*source.width+frame.region[0]+x*4+2)*4+3]>=128,`source alpha frame${frame.index} pixel${x},${y}`);
}
generatedRasterArt.pinocchio=asset;generatedRasterArt['pinocchio-portrait']=face;
const {records,audit}=makeCharacterRecords(base,3,{allowGrowth:true}),gfx=records[0].bytes,assembly=records[1].bytes,pixels=[],pixelHash=createHash('sha256');let mirroredTiles=0,maxTile=0;
assert.equal(audit.frameCount,256);assert.equal(audit.provisionalFrames,0);assert.equal(audit.rasterCoverage.rasterFrames,194);assert.equal(audit.rasterCoverage.blankFrames,62);assert.equal(audit.rasterCoverage.proceduralFrames,0);
for(let frame=0;frame<256;frame++){
 const m=audit.map[frame],p=sprite(3,m.facing,m.pose,m.phase);pixels.push(p);pixelHash.update(p);
 assert.equal(p.length,1024);assert.ok(p.every(v=>v<=12));assert.equal(p.some(Boolean),m.pose!=='blank');
 const start=audit.assembly.frameMap[frame]*40;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const cell=(y>>4)*2+(x>>4),word=u16(assembly,start+(y>>3&1)*16+cell*4+(x>>3&1)*2),tile=word&2047,tx=word&0x4000?7-(x&7):x&7;
  assert.equal(word&0xb800,0);assert.ok(tile*32<gfx.length);maxTile=Math.max(maxTile,tile);if(word&0x4000)mirroredTiles++;
  let actual=0;for(let bit=0;bit<4;bit++)actual|=(gfx[tile*32+(bit>>1)*16+(y&7)*2+(bit&1)]>>(7-tx)&1)<<bit;
  assert.equal(actual,p[y*32+x],`native assembly frame${frame} pixel${x},${y}`);
 }
 assert.deepEqual(Array.from(assembly.slice(start+32,start+40)),[240,224,0,224,240,240,0,240]);
}
const portraitPixels=portrait(3),portraitTiles=[];assert.equal(portraitPixels.length,2304);assert.deepEqual(portraitPixels,Uint8Array.from(face.frames[0],c=>parseInt(c,16)));
for(let y=0;y<48;y+=8)for(let x=0;x<48;x+=8)portraitTiles.push(...tile4bpp(portraitPixels,48,x,y));assert.equal(portraitTiles.length,1152);
const workshopRecords=[],workshopAudit=patchWorkshopPuppets(base,(offset,bytes,label)=>workshopRecords.push({offset,bytes,label})),workshopPalette=workshopRecords.find(r=>r.label.includes('palette'));
assert.deepEqual(Array.from({length:12},(_,i)=>u16(workshopPalette.bytes,i*2)),workshopPuppet.colors.map(snesColor));assert.equal(workshopAudit.sharedPlayer,3);assert.equal(workshopAudit.graphicsBytesAdded,0);assert.equal(workshopAudit.assemblyBytesAdded,0);
const rgb=palette=>palette.map(s=>[0,2,4].map(i=>{const v=parseInt(s.slice(i,i+2),16)>>3;return v<<3|v>>2;}));
function atlas(list,palette,columns,scale){const image=new PNG({width:columns*32*scale,height:Math.ceil(list.length/columns)*32*scale}),colors=rgb(palette);list.forEach((p,i)=>p.forEach((v,j)=>{if(v)for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)image.data.set([...colors[v-1],255],(((i/columns|0)*32*scale+(j/32|0)*scale+dy)*image.width+i%columns*32*scale+j%32*scale+dx)*4);}));return PNG.sync.write(image);}
await writeFile(new URL(directory+'/native-all-frames-2x.png',root),atlas(pixels,asset.palette,16,2));
const selected=JSON.parse(await readFile(new URL('draft/semantic-review-order.json',root))).map(m=>m.nativeFrames[0]);
await writeFile(new URL(directory+'/semantic-review-4x.png',root),atlas(selected.map(i=>pixels[i]),asset.palette,8,4));
await writeFile(new URL(directory+'/workshop-costume-review-4x.png',root),atlas(selected.map(i=>pixels[i]),workshopPuppet.colors,8,4));
await writeFile(new URL('portrait/preview-tiles.4bpp',root),Uint8Array.from(portraitTiles));
const report={status:'Local source/native conversion and packed-tile proof passed; emulator uploads still pending native bank placement',directory,archiveSha256:provenance.archive.sha256,sourceGeometryFilesVerified:provenance.contents.files.length,sourceType:asset.sourceType,nativeFrames:256,modelFrames:194,blankFrames:62,earlierFrames:0,rawGraphicsBytes:gfx.length,originalGraphicsCapacity:audit.capacity,tiles:gfx.length/32,maxTile,informationalCtCompressedBytes:compress(gfx).length,assembly:audit.assembly,decodedPixelsVerified:256*1024,mirroredPixelsVerified:mirroredTiles,pixelSha256:pixelHash.digest('hex'),graphicsSha256:hash(gfx),assemblySha256:hash(assembly),portrait:{width:48,height:48,bytes:portraitTiles.length,pixelsSha256:hash(portraitPixels),tilesSha256:hash(Uint8Array.from(portraitTiles)),artInfo:portraitArtInfo(3)},workshop:{...workshopAudit,colors:workshopPuppet.colors,paletteWords:workshopPuppet.colors.map(snesColor),privatePaletteVerified:true,emulatorPaletteUploadVerified:false},provenance:asset.provenance};
await writeFile(new URL(directory+'/verification.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({directory,status:report.status,rawGraphicsBytes:report.rawGraphicsBytes,assemblyBytes:report.assembly.bytes,tiles:report.tiles,framesVerified:256,modelFrames:194,blankFrames:62,portraitBytes:1152,privateWorkshopPalette:true,pixelSha256:report.pixelSha256}));
