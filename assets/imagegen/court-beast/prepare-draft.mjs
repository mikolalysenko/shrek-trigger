import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {courtBeasts} from '../../../content/court-beasts.js';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {u16,put16} from '../../../engine/rom.js';
import {snesColor} from '../../../engine/sprites.js';
import {packCourtBeastCells} from './pack-cells.mjs';
const dir='assets/imagegen/court-beast',hash=b=>createHash('sha256').update(b).digest('hex');
export const nativeMap=[0,1,2,3,4,5,6,7,8,{frame:6,flip:true},{frame:7,flip:true},{frame:8,flip:true},18,19,20,21,9,10,11,22,27,28,29,23,24,15,30,17,{frame:15,flip:true},{frame:30,flip:true},{frame:17,flip:true}];
export function nativePixels(raster){return nativeMap.map(n=>{const id=typeof n==='number'?n:n.frame,p=Uint8Array.from(raster.frames[id],c=>parseInt(c,16));if(!n.flip)return p;return Uint8Array.from(p,(_,i)=>p[Math.floor(i/64)*64+63-i%64]);});}
export async function compileDraft({method='nearest',directory=dir}={}){
  const roles=JSON.parse(await readFile(dir+'/native-role-audit.json')),spec={key:'court-beast',sourceType:'image-generation',directory,width:64,height:64,palette:courtBeasts[0].colors,
    sheets:[['movement',34,[3,4,5]],['upright',40,[0,1,2]],['reactions',34,[7]],['compact-actions',40,[0,1,2]]].map(([name,nativeHeight,scaleCells])=>({file:dir+'/source-'+name+'-v1.png',columns:name==='compact-actions'?2:3,rows:name==='compact-actions'?2:3,nativeHeight,scaleCells,componentAlpha:128,componentSelection:'union',sample:{method,bottom:59},...(name==='compact-actions'?{overrides:{3:{scale:1.08}}}:{})})),
    sequences:{native:{1:nativeMap},walk:{0:[0,1,2,1],1:[3,4,5,4],2:[6,7,8,7],3:[{frame:6,flip:true},{frame:7,flip:true},{frame:8,flip:true},{frame:7,flip:true}]}},
    notes:{status:'Inactive source candidate; native integration and lead review are recorded separately.',source:'Four actual built-in imagegen source PNGs; no drawn anatomy or procedural pose fallback.',bodyScale:'34px movement reference and40px upright reference; original normal source was33–34px high and upright source39–42px high.',nativeContract:'31 original slots, shared gfx133/asm127, both palettes185/249 unchanged, animation99 unchanged, eight native cells. Use separate supplied frame map/geometry proposal.',staging:'64×64 transparent sampling canvas; group anchor [0,8] maps bottom59 to original foot baseline+3. Recorded Y offsets retain each native source bottom-pixel displacement. Side attacks retain±10 authored X displacement.',unusedSourceFrames:[12,13,14,16,25,26],mirrors:'Native9–11 and28–30 explicitly mirror complete left source sprites, matching original native directional pairs. No duplicate claimed as independent authored source.'}};
  await mkdir(directory,{recursive:true});await writeFile(directory+'/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');
  execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',directory+'/import-spec.draft.json'],{stdio:'pipe'});
  const raster=JSON.parse(await readFile(directory+'/preview-raster.json')),frames=nativePixels(raster),packing=packCourtBeastCells(frames),compiled=compileSpriteFrames(frames,{width:64,height:64,size:1,frameCellOrigins:packing.map(p=>p.origins)});
  const frameOffsets=roles.frames.map(f=>[f.frame>=25?(f.frame<28?10:-10):0,f.nativeBottomPixel-3]);
  for(let f=0;f<31;f++)for(let c=0;c<8;c++){const p=f*80+64+c*2;compiled.assembly[p]=(compiled.assembly[p]+frameOffsets[f][0])&255;compiled.assembly[p+1]=(compiled.assembly[p+1]+8+frameOffsets[f][1])&255;}
  assert.equal(compiled.assembly.length,2480);assert.ok(compiled.graphics.length<=32768);const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);
  // Decode every tile independently to prove that repacking changes neither
  // sampled source pixels nor source flips. Native XY is checked separately.
  for(let f=0;f<31;f++)for(let c=0;c<8;c++){
    const [ox,oy]=packing[f].origins[c],p=f*80+64+c*2;
    assert.equal((compiled.assembly[p]<<24)>>24,ox-32+frameOffsets[f][0]);assert.equal((compiled.assembly[p+1]<<24)>>24,oy-64+8+frameOffsets[f][1]);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){
      const word=u16(compiled.assembly,f*80+(y>>3)*32+c*4+(x>>3)*2),tx=word&16384?7-(x&7):x&7;let v=0;
      for(let bit=0;bit<4;bit++)v|=(compiled.graphics[(word&1023)*32+(bit>>1)*16+(y&7)*2+(bit&1)]>>(7-tx)&1)<<bit;
      assert.equal(v,frames[f][(oy+y)*64+ox+x],'Native tile exactly reproduces source frame '+f);
    }
  }
  const palettes=courtBeasts.map(a=>{const bytes=new Uint8Array(24);a.colors.forEach((c,i)=>put16(bytes,i*2,snesColor(c)));return{id:a.palette,key:a.key,colors:a.colors,bytes};});
  for(const [file,bytes]of [['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed],['assembly.bin',compiled.assembly],...palettes.map(p=>['palette-'+p.id+'.bin',p.bytes])])await writeFile(directory+'/'+file,bytes);
  const candidateBounds=frames.map(p=>{let x0=64,y0=64,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%64);x1=Math.max(x1,i%64);y0=Math.min(y0,i>>6);y1=Math.max(y1,i>>6);}return[x0,y0,x1-x0+1,y1-y0+1];});
  const mapping={status:'Inactive complete source mapping and geometry proposal',sourceFrames:31,usedAuthoredSourceFrames:25,nativeFrames:31,fullSourceMirrors:6,blankNativeFrames:0,width:64,height:64,size:1,cells:8,groupAnchor:[0,8],frameOffsets,
    frames:roles.frames.map((r,f)=>({...r,source:nativeMap[f],sampledBounds:candidateBounds[f],proposedNativeBounds:[candidateBounds[f][0]-32+frameOffsets[f][0],candidateBounds[f][1]-56+frameOffsets[f][1],...candidateBounds[f].slice(2)],kind:typeof nativeMap[f]==='number'?'source':'adapted-whole-source-mirror',sourcePixelSha256:hash(frames[f]),cellOrigins:packing[f].origins,occupiedCells:packing[f].occupied,tileRowPhase:packing[f].phase})),
    integration:'Retain original enemy headers, all31 slot IDs, both palette identities, animation99, AI and event timing. Use these eight-cell origins and assembly anchor/offsets. Proposed geometry differs from original Yakra cells and must pass native field/battle integration before activation.'};
  await writeFile(directory+'/native-frame-map.draft.json',JSON.stringify(mapping,null,2)+'\n');
  const audit={status:'Inactive exact source/4bpp/palette/assembly reproduction passed; emulator integration not performed',method,sourceFrames:31,usedAuthoredSourceFrames:25,nativeFrames:31,mirroredNativeFrames:6,uniqueNativePixels:new Set(frames.map(hash)).size,graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,tiles:compiled.tiles,assemblyBytes:2480,originalDecodedBytes:8512,originalCompressedBytes:6977,decodedDelta:compiled.graphics.length-8512,compressedDelta:packed.length-6977,underOriginalDecodedBudget:compiled.graphics.length<=8512,underNativeTileLimit:compiled.graphics.length<=32768,graphicsSha256:hash(compiled.graphics),compressedSha256:hash(packed),assemblySha256:hash(compiled.assembly),palettes:palettes.map(({bytes,...p})=>({...p,sha256:hash(bytes)})),maxOccupiedCells:Math.max(...packing.map(p=>p.occupied)),extraNativeCells:0,extraFrameIds:0,extraWramBytes:0,extraVramBytes:0,activation:false};
  await writeFile(directory+'/draft-audit.json',JSON.stringify(audit,null,2)+'\n');return audit;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){const method=process.argv.includes('--area')?'area':'nearest',i=process.argv.indexOf('--directory');console.log(JSON.stringify(await compileDraft({method,directory:i>=0?process.argv[i+1]:dir})));}
