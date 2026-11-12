import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),read=p=>JSON.parse(fs.readFileSync(path.join(d,p))),sha=b=>createHash('sha256').update(b).digest('hex'),contract=read('background-contract.json'),asset=read('body-sample-v2/preview-raster.json'),source=Uint8Array.from(asset.frames[0],v=>parseInt(v,16)),out=new Uint8Array(128*176);
// Source-pixel resampling of complete mechanical regions only. No drawn pixels.
// The left side is authoritative because all native body tiles mirror it.
const regions=[
 {name:'Left suspension and tapered upper shoulder',source:[0,0,30,72],target:[0,0,22,72]},
 {name:'Left bellows forearm and complete pincer',source:[0,72,30,72],target:[0,72,30,72]},
 {name:'Central carved face, cupboard, keyhole and counterweight',source:[30,47,68,129],target:[32,48,64,128]},
 {name:'Paired central suspension cable',source:[54,0,20,47],target:[56,0,16,48]}
];
for(const r of regions){const[sx,sy,sw,sh]=r.source,[tx,ty,tw,th]=r.target;for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const xx=sx+Math.min(sw-1,Math.floor((x+.5)*sw/tw)),yy=sy+Math.min(sh-1,Math.floor((y+.5)*sh/th));out[(ty+y)*128+tx+x]=source[yy*128+xx];}}
for(let y=0;y<176;y++)for(let x=0;x<64;x++)out[y*128+127-x]=out[y*128+x];
// Four source cable tiles are repeated by the existing background dictionary.
// Copy each exact 16px source cable segment to the original repeated slots.
for(const x of[8,56])for(let y=16;y<48;y++)for(let xx=0;xx<8;xx++)out[y*128+x+xx]=out[(y%16)*128+x+xx];
for(let y=0;y<176;y++)for(let x=0;x<64;x++)out[y*128+127-x]=out[y*128+x];
const outside=[];for(let i=0;i<out.length;i++)if(out[i]&&contract.coverageHex[i]!=='1')outside.push([i%128,i/128|0,out[i]]);assert.deepEqual(outside,[],'All generated body pixels fit owned background cells');
const rgb=h=>[0,2,4].map(n=>{const v=parseInt(h.slice(n,n+2),16)>>3;return v<<3|v>>2;}),png=new PNG({width:128,height:176});out.forEach((v,i)=>{if(v)png.data.set([...rgb(asset.palette[v-1]),255],i*4);});const bytes=PNG.sync.write(png);fs.writeFileSync(path.join(d,'source-body-native-v2.png'),bytes);
const enlarged=new PNG({width:512,height:704});for(let y=0;y<704;y++)for(let x=0;x<512;x++){let i=((y>>2)*128+(x>>2))*4;enlarged.data.set(png.data[i+3]?png.data.subarray(i,i+4):[37,43,47,255],(y*512+x)*4);}fs.writeFileSync(path.join(d,'body-fitted-4x.png'),PNG.sync.write(enlarged));
const info={source:'source-body-v2.png',sourceSha256:sha(fs.readFileSync(path.join(d,'source-body-v2.png'))),sample:'body-sample-v2/preview-raster.json',sampleSha256:sha(fs.readFileSync(path.join(d,'body-sample-v2/preview-raster.json'))),method:'Recorded nearest resampling of complete generated mechanical regions, followed by exact whole left-half reflection and native cable tile repetition. No painted anatomy or invented pixels.',regions,nativeSize:[128,176],nativePixelSha256:sha(out),opaquePixels:out.filter(Boolean).length,opaquePixelsOutsideOwnedCells:outside.length,mirroredHalf:'left',repeatedCableSourceSegments:[{x:8,y:0,width:8,height:16},{x:56,y:0,width:8,height:16}],repeatTargetY:[0,16,32],note:'The native hardware requires all four cable tiles to repeat vertically and the body to mirror horizontally. The source upper service mechanism is narrowed as a complete region to fit the original stepped shoulder footprint; the face/cupboard keeps its full contents.'};fs.writeFileSync(path.join(d,'body-derivation.json'),JSON.stringify(info,null,2)+'\n');
const spec={key:'supply-keeper-body',sourceType:'image-generation',width:128,height:176,palette:asset.palette,directory:'assets/imagegen/supply-keeper/body-draft',sheets:[{file:'assets/imagegen/supply-keeper/source-body-native-v2.png',columns:1,rows:1,scaleCells:[0],nativeHeight:176,componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:175,alphaThreshold:128}}],sequences:{native:{1:[0]}},notes:{derivation:'assets/imagegen/supply-keeper/body-derivation.json',storage:'Original BG186 owned tiles, mirrored and repeated by unchanged maps123/20.',status:'Inactive source-derived draft; root owns activation.'}};fs.writeFileSync(path.join(d,'import-spec.body.draft.json'),JSON.stringify(spec,null,2)+'\n');console.log(JSON.stringify(info));
