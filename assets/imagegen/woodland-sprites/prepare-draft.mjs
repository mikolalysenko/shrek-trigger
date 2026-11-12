import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';

const dir='assets/imagegen/woodland-sprites',json=async f=>JSON.parse(await readFile(dir+'/'+f)),sha=b=>createHash('sha256').update(b).digest('hex'),save=(f,v)=>writeFile(dir+'/'+f,JSON.stringify(v,null,2)+'\n');
export const nativeMap=[0,1,{frame:0,flip:true},2,3,{frame:2,flip:true},6,7,8,{frame:6,flip:true},{frame:7,flip:true},{frame:8,flip:true},4,5,{frame:5,flip:true}];
function bounds(p){let x0=64,y0=64,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%64);y0=Math.min(y0,i>>6);x1=Math.max(x1,i%64);y1=Math.max(y1,i>>6);}return[x0,y0,x1-x0+1,y1-y0+1];}
function originalComponents(bank,frame){
 const p=new Map();for(const c of nativeSpriteCells(bank,frame))for(let i=0;i<256;i++)if(c.pixels[i]){const k=[c.x+i%16,c.y+(i>>4)].join(',');if(!p.has(k))p.set(k,c.pixels[i]);}
 const seen=new Set(),out=[];for(const k of p.keys())if(!seen.has(k)){const todo=[k];seen.add(k);for(let n=0;n<todo.length;n++){const[x,y]=todo[n].split(',').map(Number);for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){const q=[x+xx,y+yy].join(',');if(p.has(q)&&!seen.has(q)){seen.add(q);todo.push(q);}}}const pts=todo.map(k=>[...k.split(',').map(Number),p.get(k)]),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);out.push({bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1],pixels:pts});}return out.sort((a,b)=>b.pixels.length-a.pixels.length);
}
export async function compileDraft(){
 const resource=await json('native-resource-audit.json'),roles=await json('native-role-audit.json'),rom=new Uint8Array(await readFile(resource.original.path));assert.equal(sha(rom),resource.original.sha256);
 const old=nativeSpriteBank(rom,{gfx:81,asm:36,palette:19,size:0,frames:15});
 const spec=await json('import-spec.draft.json');delete spec.nativeComposition;spec.sequences={native:{1:nativeMap}};
 // Whole-source sampling: normalize the same model to original native heights.
 // One-pixel width normalization keeps passing poses in the original 31px span.
 spec.sheets[0].overrides={0:{scaleX:31/(334*28/308)},1:{scale:26/(265*28/308),scaleX:31/(326*26/265)},2:{scale:28/(302*28/308)},3:{scale:26/(274*28/308),scaleX:31/(341*26/274)},7:{scale:23/(307*28/308)},8:{scale:27/(299*28/308)}};
 spec.sheets[1].overrides={0:{scaleX:22/(502*29/631)},1:{scale:28/(595*29/631),scaleX:20/(437*28/595)}};
 spec.notes={status:'Inactive exact source/geometry proposal; root static review approved',native:'15 native slots, four cells, size0. Palette19 and shared AA28 unchanged.',sampling:'Nearest sampling of generated sources, whole-source mirrors only where verified in original. Front/rear/pass width normalizations are at most one native pixel. Profile widths22/20 versus original18; spinning width27 versus23. No procedural anatomy.',sourceOmissions:{'source-v1.png':[4,5,6],'source-profile-v2.png':[2]},originalEffects:'Twelve detached original single-pixel motion dots retained at exact native coordinates in slots12–14.'};
 await save('import-spec.draft.json',spec);execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
 const raster=await json('preview-raster.json'),source=raster.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16))),frames=[],geometry=[],overlays=[];
 for(let f=0;f<15;f++){
  const n=nativeMap[f],s=typeof n==='number'?{frame:n}:n,raw=source[s.frame],p=s.flip?Uint8Array.from(raw,(_,i)=>raw[(i>>6)*64+63-i%64]):raw,from=bounds(p),cs=originalComponents(old,f),body=cs[0].bounds,effects=f>=12?cs.slice(1).flatMap(c=>c.pixels):[];
  assert.ok(cs.slice(1).every(c=>f>=12&&c.pixels.length===1),'Only audited one-pixel effects may be reused');
  const targetX=Math.round(body[0]+body[2]/2-from[2]/2),targetY=body[1]+body[3]-from[3],dx=targetX+32-from[0],dy=targetY+64-from[1],out=new Uint8Array(4096),effectOverlaps=[];
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(p[y*64+x]){const xx=x+dx,yy=y+dy;assert.ok(xx>=0&&xx<64&&yy>=0&&yy<64);out[yy*64+xx]=p[y*64+x];}
  for(const[x,y,k]of effects){const i=(y+64)*64+x+32;if(out[i])effectOverlaps.push({x,y,bodyIndex:out[i],effectIndex:k});out[i]=k;}
  if(effects.length)overlays.push({frame:f,sourceType:'original-ROM-raster',points:effects,bodyOverlap:effectOverlaps});
  const b=bounds(out),originalOrigins=resource.geometry.frames[f].cellOrigins,origins=originalOrigins.map(([x,y])=>[x+32,y+64]);
  // Retain exact native cell order and Y. Translate the whole cell grid only
  // where the generated spinning curl is wider than the original silhouette.
  const left=Math.min(...origins.map(p=>p[0])),right=Math.max(...origins.map(p=>p[0]+16)),shift=Math.min(0,b[0]-left)+Math.max(0,b[0]+b[2]-right);
  for(const p of origins)p[0]+=shift;
  frames.push(out);geometry.push({frame:f,role:roles.frames[f].role,source:s,sourceBounds:from,translation:[dx,dy],originalBodyBounds:body,originalBounds:resource.geometry.frames[f].bounds,bodyBounds:[targetX,targetY,from[2],from[3]],nativeBounds:[b[0]-32,b[1]-64,...b.slice(2)],originalCellOrigins:originalOrigins,cellOrigins:origins,cellGridTranslation:[shift,0],effects:effects.length,effectOverlaps,sourcePixelSha256:sha(out)});
 }
 const overlapFrames=[1,4],compiled=compileSpriteFrames(frames,{width:64,height:64,size:0,frameCellOrigins:geometry.map(f=>f.cellOrigins),cellOverlapFrames:overlapFrames});
 for(let f=0;f<15;f++){
  const rendered=new Uint8Array(4096);for(const c of nativeSpriteCells({...compiled,cells:4,frames:15},f))for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=c.pixels[y*16+x],i=(c.y+64+y)*64+c.x+32+x;if(k&&!rendered[i])rendered[i]=k;}
  assert.deepEqual(rendered,frames[f],'Every native cell must exactly reproduce the composed source');
 }
 for(const[a,b,k]of[[0,2,-2],[3,5,-2],[6,9,-1],[7,10,-1],[8,11,-1],[13,14,-2]]){
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const xx=k-(x-32)+32;if(xx>=0&&xx<64)assert.equal(frames[a][y*64+x],frames[b][y*64+xx],`Original native mirror ${a}/${b}`);}
 }
 const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);assert.equal(compiled.assembly.length,600);
 for(const[file,b]of[['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed],['assembly.bin',compiled.assembly],['palette-19.bin',rom.slice(resource.palette.offset,resource.palette.offset+24)]])await writeFile(dir+'/'+file,b);
 const overlay={source:resource.original,graphics:resource.resources.graphics.original,assembly:resource.resources.assembly,width:64,height:64,frames:overlays.map(o=>{const p=new Uint8Array(4096);for(const[x,y,k]of o.points)p[(y+64)*64+x+32]=k;return{frame:o.frame,bounds:[0,0,64,64],pixels:[...p],nativePoints:o.points};}),scope:'Only 12 isolated source motion dots; no original body pixels.'};
 await save('original-effects.json',overlay);
 await save('native-composition.json',geometry.map(g=>({frame:g.frame,source:g.source,sourceBounds:g.sourceBounds,bodyBounds:[g.bodyBounds[0]+32,g.bodyBounds[1]+64,...g.bodyBounds.slice(2)],translation:[0,0],shadowBounds:g.effects?[0,0,64,64]:null})));
 spec.nativeComposition={map:dir+'/native-composition.json',overlay:dir+'/original-effects.json'};spec.sequences={native:{1:Array.from({length:15},(_,i)=>i)}};await save('import-spec.draft.json',spec);
 execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});const composed=await json('preview-raster.json');assert.deepEqual(composed.frames,frames.map(p=>Array.from(p,k=>k.toString(16)).join('')),'Standard preview importer reproduces all15 composed native frames');await save('native-raster.json',composed);
 await save('native-frame-map.draft.json',{status:'Inactive native geometry proposal, root static review approved',width:64,height:64,size:0,cells:4,nativeFrames:15,authoredSourcePoses:9,nativeMap,anchor:[0,0],frameOffsets:Array.from({length:15},()=>[0,0]),cellOverlapFrames:overlapFrames,frames:geometry});
 await save('native-family-proposal.draft.json',{status:'Inactive proposed actor family; activation remains root-owned',key:'woodland-sprites',gfx:81,owners:resource.owners,groups:[{art:'woodland-sprites',asm:36,palette:19,animation:28,size:0,width:64,height:64,frames:15,anchor:[0,0],frameOffsets:Array.from({length:15},()=>[0,0]),frameCellOrigins:geometry.map(g=>g.cellOrigins),cellOverlapFrames:overlapFrames}],exactPalettePreservation:resource.palette,originalDecodedCeiling:3104,explicitStreamRequired:compiled.graphics.length>3104,allOwnerGuard:'Exactly NPC77 and enemy3 own gfx81/asm36/palette19. Guy225 owns AA28 only and must remain unchanged.',integration:'Use composed native frames0–14 once, authored cell origins and overlap frames1/4. Keep native headers, AI, names, event packets, AA28 frames/durations and palette19 bytes unchanged.'});
 const rawDelta=compiled.graphics.length-3104,packedDelta=packed.length-1735,audit={status:'Inactive exact source compile passed',activation:false,tiles:compiled.tiles,decodedBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes:600,compressedPlusAssemblyBytes:packed.length+600,graphicsSha256:sha(compiled.graphics),compressedSha256:sha(packed),assemblySha256:sha(compiled.assembly),paletteSha256:sha(await readFile(dir+'/palette-19.bin')),nativeFrames:15,authoredSourcePoses:9,uniqueNativeImages:new Set(frames.map(sha)).size,originalComparison:{decodedBytes:3104,compressedBytes:1735,assemblyBytes:600,decodedDelta:rawDelta,compressedPlusAssemblyDelta:packedDelta},published5018Comparison:{decodedBytes:3104,compressedBytes:1735,assemblyBytes:600,decodedDelta:rawDelta,compressedPlusAssemblyDelta:packedDelta},withinOriginalDecodedCeiling:rawDelta<=0,streamingRequired:rawDelta>0,originalCellGeometryChanges:geometry.filter(g=>g.cellGridTranslation.some(Boolean)).map(g=>({frame:g.frame,delta:g.cellGridTranslation})),effectBodyOverlaps:overlays.flatMap(f=>f.bodyOverlap.map(p=>({frame:f.frame,...p}))),fourCellCoverage:true,exactNativeMirrors:true,noSourcePixelsClipped:true};
 await save('draft-audit.json',audit);return audit;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)console.log(JSON.stringify(await compileDraft(),null,2));
