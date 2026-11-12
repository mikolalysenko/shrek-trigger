import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileActorFamily} from '../../../engine/actor-families.js';
import {compress,decompress} from '../../../engine/compression.js';
import {u16,put16} from '../../../engine/rom.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {packMachineCells as packCells} from './pack-cells.mjs';
const dir='assets/imagegen/swamp-imps',hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(dir+'/'+p));
export const impMap=[0,1,{frame:0,flip:true},2,3,4,5,6,7,{frame:5,flip:true},{frame:6,flip:true},{frame:7,flip:true},8,9,10,11,12,12,13,13,14,15,15,{frame:14,flip:true},16,16,17,18];
export const rolyMap=[0,1,{frame:0,flip:true},2,3,{frame:2,flip:true},4,5,{frame:6,flip:true},{frame:4,flip:true},{frame:5,flip:true},6,7,9,8,10,11,11,9,10,12,13,14,{frame:12,flip:true},{frame:13,flip:true},{frame:14,flip:true}];
const parse=r=>r.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16))),flip=p=>Uint8Array.from(p,(_,i)=>p[(i>>6)*64+63-i%64]);
const bounds=p=>{if(!p.length)return null;const x=Math.min(...p.map(v=>v[0])),y=Math.min(...p.map(v=>v[1]));return[x,y,Math.max(...p.map(v=>v[0]))-x+1,Math.max(...p.map(v=>v[1]))-y+1];};
function points(p){const out=[];for(let i=0;i<p.length;i++)if(p[i])out.push([i%64,i>>6,p[i]]);return out;}
function anchor(p,original){const source=points(p),b=bounds(source),dx=Math.round(original[0]+original[2]/2-b[0]-b[2]/2),dy=original[1]+original[3]-b[1]-b[3];return source.map(([x,y,k])=>[x+dx,y+dy,k]);}
function compose(layers){const p=new Map();for(const layer of layers)for(const[x,y,k]of layer)p.set(x+','+y,[x,y,k]);return[...p.values()];}
function canvas(p){const b=bounds(p),translation=[32,b?2-b[1]:2],frame=new Uint8Array(4096);for(const[x,y,k]of p){const xx=x+translation[0],yy=y+translation[1];assert.ok(xx>=0&&xx<64&&yy>=0&&yy<64,'Native source fits the work canvas');frame[yy*64+xx]=k;}return{frame,translation,offset:[32-translation[0],64-translation[1]],bounds:b};}
async function importSources(key,palette,sheets,heights){
 const spec={key:'swamp-'+key,directory:dir+'/'+key,sourceType:'image-generation',width:64,height:64,palette,sheets,sequences:{source:{1:Array.from({length:heights.flat().length},(_,i)=>i)}},notes:{activation:false,status:'Inactive source extraction only; native-cell-raster.json and native-frame-map.draft.json are the complete native composition.',pixels:'Only actual generated PNG pixels, nearest sampling and exact unchanged palette indexing. No procedural anatomy.',sourceDirectionCorrection:key==='roly'?'Base source6 faces right; mirrored for left native8, unmirrored for right native11.':null}};
 const run=async()=>{await writeFile(dir+'/'+key+'/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/'+key+'/import-spec.draft.json'],{stdio:'pipe'});return json(key+'/preview-raster.json');};
 await run();const first=await json(key+'/preview-import.json');for(let s=0;s<sheets.length;s++)spec.sheets[s].overrides=Object.fromEntries(first.sources[s].frames.map((f,i)=>[i,{scale:heights[s][i]/(f.bounds[3]*first.sources[s].scale)}]));
 return{raster:await run(),spec};
}
export async function compileDraft(){
 const r=await json('native-resource-audit.json'),roles=await json('native-role-audit.json'),components=await json('source-native-components.json'),pal=id=>r.palettes.find(p=>p.id===id).current.colors;
 const sheet=(file,columns,rows)=>({file:dir+'/'+file,columns,rows,nativeHeight:24,scaleCells:[0],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:61,alphaThreshold:128}});
 const imports={imp:await importSources('imp',pal(67),[sheet('source-imp-base-v1.png',3,3),sheet('source-imp-actions-v1.png',2,5),sheet('source-rider-turn-v1.png',1,1)],[[0,1,3,4,5,6,7,8,12].map(f=>components.imp[f].bodyBounds[3]),[13,14,15,17,19,20,22,25,26,27].map(f=>components.imp[f].bodyBounds[3]),[23]]),roly:await importSources('roly',pal(63),[sheet('source-roly-base-v1.png',3,3),sheet('source-roly-roll-v1.png',3,2)],[[0,1,3,4,6,7,8,12,14].map(f=>components.roly[f].bodyBounds[3]),[13,15,16,20,21,22].map(f=>components.roly[f].bodyBounds[3])])};
 const source=Object.fromEntries(Object.entries(imports).map(([k,v])=>[k,parse(v.raster)])),native={},body={},maps={};
 for(const[key,mapping]of[['imp',impMap],['roly',rolyMap]]){
  body[key]=mapping.map((n,f)=>anchor(typeof n==='number'?source[key][n]:flip(source[key][n.frame]),components[key][f].bodyBounds));
  native[key]=body[key].map((p,f)=>compose([p,components[key][f].effects]));
  maps[key]=native[key].map((p,f)=>({frame:f,source:mapping[f],originalBodyBounds:components[key][f].bodyBounds,sampledBodyBounds:bounds(body[key][f]),originalBounds:components[key][f].originalBounds,nativeBounds:bounds(p),sourceEffects:components[key][f].effects.length,sourceEffectOrder:'Native original indices on top of sampled body; detached shadows retain exact coordinates.',bodyBottomPreserved:bounds(body[key][f])[1]+bounds(body[key][f])[3]-1===components[key][f].bodyBottom}));
 }
 // Three additional four-cell sources support the original compound actor.
 // No new source is invented for a reused Imp or Roly pose.
 native.extra=[body.roly[12],anchor(flip(source.imp[19]),components.rider[15].impBounds),native.imp[19].filter(p=>p[1]<=-9)];
 const dictionary=new Set([Buffer.alloc(32).toString('hex')]),groups=[],canvases={},packing={};
 for(const key of['imp','roly','extra']){canvases[key]=native[key].map(canvas);packing[key]=packCells(canvases[key].map(c=>c.frame),{dictionary});groups.push({art:key,asm:key==='imp'?43:key==='roly'?63:null,size:0,frames:native[key].length,width:64,height:64,frameCellOrigins:packing[key].map(p=>p.origins),frameOffsets:canvases[key].map(c=>c.offset)});}
 const compiled=compileActorFamily({groups},(key,f)=>canvases[key][f].frame),byKey=Object.fromEntries(compiled.groups.map(g=>[g.art,g])),assembly=new Uint8Array(29*80),riderLayers=[];
 const copyLayer=(sourceKey,sourceFrame,shift,destinationFrame,startCell)=>{
  const a=byKey[sourceKey].assembly;
  for(let c=0;c<4;c++)for(let row=0;row<2;row++)for(let col=0;col<2;col++)put16(assembly,destinationFrame*80+row*32+(c+startCell)*4+col*2,u16(a,sourceFrame*40+row*16+c*4+col*2));
  for(let c=0;c<4;c++)for(let axis=0;axis<2;axis++)assembly[destinationFrame*80+64+(c+startCell)*2+axis]=(a[sourceFrame*40+32+c*2+axis]+shift[axis])&255;
 };
 for(const c of components.rider){const f=c.frame,impKey=f===15||f===28?'extra':'imp',impFrame=f===15?1:f===28?2:c.impSourceFrame,impShift=f===15?[0,0]:c.impShift,mountKey=f===12?'extra':'roly',mountFrame=f===12?0:c.mountSourceFrame,impFirst=c.priorityOrder[0]==='imp';
  copyLayer(impKey,impFrame,impShift,f,impFirst?0:4);
  if(mountFrame!==null)copyLayer(mountKey,mountFrame,c.mountShift,f,impFirst?4:0);else c.originalMountCellOrigins.forEach(([x,y],i)=>assembly.set([x&255,y&255],f*80+64+(i+4)*2));
  const ip=native[impKey][impFrame].map(([x,y,k])=>[x+impShift[0],y+impShift[1],k]),mp=mountFrame===null?[]:native[mountKey][mountFrame].map(([x,y,k])=>[x+c.mountShift[0],y+c.mountShift[1],k]),display=compose(impFirst?[mp,ip]:[ip,mp]);
  riderLayers.push({frame:f,imp:{key:impKey,frame:impFrame,shift:impShift},mount:mountFrame===null?null:{key:mountKey,frame:mountFrame,shift:c.mountShift},priorityOrder:c.priorityOrder,impBounds:bounds(ip),mountBounds:bounds(mp),nativeBounds:bounds(display),display});
 }
 const emitted=[byKey.imp,byKey.roly,{art:'rider',asm:65,size:1,frames:29,cells:8,assembly}],cellRaster={status:'Inactive exact per-cell source; runtime uses original four/eight-cell budgets',activation:false,gfx:86,format:'Each cell contains256hex palette indices, with signed native x/y; earlier cells win overlap.',groups:[]};
 for(const g of emitted){const frames=[];for(let f=0;f<g.frames;f++){
   const cs=nativeSpriteCells({...compiled,assembly:g.assembly,cells:g.cells,frames:g.frames},f),actual=new Map();for(const c of cs)for(let i=0;i<256;i++)if(c.pixels[i]){const key=(c.x+i%16)+','+(c.y+(i>>4));if(!actual.has(key))actual.set(key,c.pixels[i]);}
   const expected=new Map((g.art==='rider'?riderLayers[f].display:native[g.art][f]).map(([x,y,k])=>[x+','+y,k]));assert.equal(actual.size,expected.size);for(const[k,v]of expected)assert.equal(actual.get(k),v,'Exact composed native pixels '+g.art+f+' '+k);
   frames.push({frame:f,role:roles.groups.find(q=>q.key===g.art).frames[f].role,cells:cs.map(c=>({x:c.x,y:c.y,pixels:Array.from(c.pixels,k=>k.toString(16)).join('')})),displayedPixels:actual.size,displayedBounds:bounds([...actual].map(([k,v])=>[...k.split(',').map(Number),v]))});
  }
  cellRaster.groups.push({key:g.art,asm:g.asm,size:g.size,cells:g.cells,frames});await writeFile(dir+'/'+g.art+'/assembly.bin',g.assembly);
  const map={status:'Inactive exact source and native geometry',gfx:86,asm:g.asm,size:g.size,cells:g.cells,nativeFrames:g.frames,frames:frames.map((frame,f)=>({...frame,cells:frame.cells.map(({x,y})=>[x,y]),...(g.art==='rider'?Object.fromEntries(Object.entries(riderLayers[f]).filter(([k])=>k!=='display')):maps[g.art][f])})),integration:g.art==='rider'?'Preserve the independent four-cell source layers and their priority order. Flat composed pictures alone omit hidden source pixels. Use native-cell-raster.json or reproduce this exact source-cell concatenation.':'Use native-raster.json with the authored cells and frame offsets.'};
  if(g.art!=='rider'){Object.assign(map,{width:64,height:64,frameOffsets:canvases[g.art].map(c=>c.offset)});map.frames.forEach((m,f)=>Object.assign(m,{cellOrigins:packing[g.art][f].origins,occupiedCells:packing[g.art][f].occupied,canvasTranslation:canvases[g.art][f].translation}));await writeFile(dir+'/'+g.art+'/native-raster.json',JSON.stringify({...imports[g.art].raster,frames:canvases[g.art].map(c=>Array.from(c.frame,k=>k.toString(16)).join('')),sequences:{native:{1:frames.map((_,f)=>f)}}})+'\n');}
  await writeFile(dir+'/'+g.art+'/native-frame-map.draft.json',JSON.stringify(map,null,2)+'\n');
 }
 await writeFile(dir+'/native-cell-raster.json',JSON.stringify(cellRaster)+'\n');
 const packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);assert.ok(compiled.graphics.length<=32768);for(const[file,bytes]of[['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed]])await writeFile(dir+'/'+file,bytes);
 for(const p of r.palettes){const bytes=new Uint8Array(24);p.current.words.forEach((w,i)=>put16(bytes,i*2,w));assert.equal(hash(bytes),p.current.sha256);await writeFile(dir+'/palette-'+p.id+'.bin',bytes);}
 const assemblyBytes=emitted.reduce((n,g)=>n+g.assembly.length,0),result={status:'Inactive exact source-cell compile passed',activation:false,gfx:86,graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes,tiles:compiled.tiles,graphicsSha256:hash(compiled.graphics),compressedSha256:hash(packed),groups:emitted.map(g=>({key:g.art,asm:g.asm,size:g.size,cells:g.cells,frames:g.frames,assemblyBytes:g.assembly.length,assemblySha256:hash(g.assembly)})),original:{...r.graphics.original,decodedDelta:compiled.graphics.length-r.graphics.original.decodedBytes,compressedPlusAssemblyDelta:packed.length+assemblyBytes-r.graphics.original.compressedBytes-4480},current:{baselineSha256:r.baselineSha256,...r.graphics.current,decodedDelta:compiled.graphics.length-r.graphics.current.decodedBytes,compressedPlusAssemblyDelta:packed.length+assemblyBytes-r.graphics.current.compressedBytes-4480},underOriginalDecodedBudget:compiled.graphics.length<=r.graphics.original.decodedBytes,paletteWrites:false,impAndMountBodyBottomsPreserved:[...maps.imp,...maps.roly].every(f=>f.bodyBottomPreserved),sourceCellComposition:'Mounted slots reuse complete generated Imp/Roly cells, native priority ordering and component translations. Additional sampled turn body, dot-free recoil mount, and authored crop in rider28 are explicit.',nativeProofFiles:['native-display-proof.json','native-timing-proof.json','native-scene-proof.json']};
 await writeFile(dir+'/draft-audit.json',JSON.stringify(result,null,2)+'\n');await writeFile(dir+'/native-family-proposal.draft.json',JSON.stringify({activation:false,gfx:86,owners:r.owners.map(o=>({kind:o.kind,id:o.id,header:o.header})),groups:result.groups,paletteWrites:false,sourceCells:dir+'/native-cell-raster.json',recipe:dir+'/compile-native-cells.js',sourceSamplingRecipe:dir+'/prepare-draft.mjs',originalCellComposition:dir+'/source-native-components.json',integration:'Reproduce the per-cell native raster and source sharing exactly; original OAM order matters. Root owns guarded loader/allocator integration.'},null,2)+'\n');return result;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)console.log(JSON.stringify(await compileDraft()));
