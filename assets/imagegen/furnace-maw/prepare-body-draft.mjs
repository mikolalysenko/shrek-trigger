import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(path.join(d,p))),write=(p,o)=>fs.writeFileSync(path.join(d,p),JSON.stringify(o,null,2)+'\n');
const sampled=read('body-sample-0.95/preview-raster.json'),pixels=Uint8Array.from(sampled.frames[0],c=>parseInt(c,16)),before=sha(pixels),image=new PNG({width:112,height:152});
// The native BG metatiles reuse the left body with hardware horizontal flips.
// Preserve that contract by reflecting exact sampled source pixels. No anatomy
// is constructed and no opaque source pixel is erased to fit a footprint.
for(let y=0;y<152;y++)for(let x=56;x<112;x++)pixels[y*112+x]=pixels[y*112+111-x];
const colors=sampled.palette.map(c=>[0,2,4].map(n=>{const v=parseInt(c.slice(n,n+2),16)>>3;return v<<3|v>>2;}));
pixels.forEach((v,i)=>{if(v)image.data.set([...colors[v-1],255],i*4);});
const bytes=PNG.sync.write(image);fs.writeFileSync(path.join(d,'source-body-native-v1.png'),bytes);
const contract=read('background-contract.json');assert.equal(pixels.filter((v,i)=>v&&contract.body.coverageHex[i]==='0').length,0);
write('body-derivation.json',{sourceType:'image-generation',source:'source-body-v1.png',sourceSha256:sha(fs.readFileSync(path.join(d,'source-body-v1.png'))),samplingSpec:'body-spec-0.95.json',samplingAudit:'body-sample-0.95/preview-import.json',sampledPixelSha256:before,operation:'Reflect every sampled left-half pixel into the right half, matching the original native horizontal BG tile reuse.',output:'source-body-native-v1.png',outputSha256:sha(bytes),nativePixelSha256:sha(pixels),width:112,height:152,opaquePixels:pixels.filter(Boolean).length,opaquePixelsOutsideOriginalOwnedCells:0,hardwarePaletteChanged:false,reasonForScaleX:'A consistent0.95 horizontal source sampling scale is the widest tested value that preserves all native source pixels within the original owned body cells and the repeated buried edge tile. Scale1 has8 opaque pixels outside the owned map cells.'});
write('import-spec.body.draft.json',{key:'furnace-maw-body',sourceType:'image-generation',width:112,height:152,palette:sampled.palette,directory:'assets/imagegen/furnace-maw/body-draft',sheets:[{file:'assets/imagegen/furnace-maw/source-body-native-v1.png',columns:1,rows:1,scaleCells:[0],nativeHeight:144,componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:143,alphaThreshold:128}}],sequences:{native:{1:[0]}},notes:{derivation:'assets/imagegen/furnace-maw/body-derivation.json',originalGeneratedSource:'assets/imagegen/furnace-maw/source-body-v1.png',storage:'Stationary BG190 body plus BG171 edge tiles; not an OBJ frame.',status:'Inactive draft, exact native source-pixel mirror. Root owns activation.'}});
console.log(JSON.stringify({source:'source-body-native-v1.png',opaquePixels:pixels.filter(Boolean).length,outsideOwnedCells:0}));
