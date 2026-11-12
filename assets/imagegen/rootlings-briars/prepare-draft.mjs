import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {futureWildlife} from '../../../content/future-wildlife.js';
import {compileActorFamily} from '../../../engine/actor-families.js';
import {compress,decompress} from '../../../engine/compression.js';
import {put16} from '../../../engine/rom.js';
import {snesColor} from '../../../engine/sprites.js';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {packMachineCells as packCells} from './pack-cells.mjs';
const dir='assets/imagegen/rootlings-briars',hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(dir+'/'+p));
export const rootMap=[0,12,2,3,13,5,6,14,8,{frame:6,flip:true},{frame:14,flip:true},{frame:8,flip:true},9,10,15,10,15];
export const briarMap=[0,6,2,3,4,7];
const parse=r=>r.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16))),flip=p=>Uint8Array.from(p,(_,i)=>p[(i>>6)*64+63-i%64]);
const bounds=p=>{let x0=64,y0=64,x1=-1,y1=-1;for(let i=0;i<p.length;i++)if(p[i]){x0=Math.min(x0,i%64);x1=Math.max(x1,i%64);y0=Math.min(y0,i>>6);y1=Math.max(y1,i>>6);}return[x0,y0,x1-x0+1,y1-y0+1];};
function points(p,dx=0,dy=0){const out=[];for(let i=0;i<p.length;i++)if(p[i])out.push([i%64+dx,(i>>6)+dy,p[i]]);return out;}
function pointBounds(p){const x=Math.min(...p.map(v=>v[0])),y=Math.min(...p.map(v=>v[1]));return[x,y,Math.max(...p.map(v=>v[0]))-x+1,Math.max(...p.map(v=>v[1]))-y+1];}
function anchor(p,original){const b=bounds(p),dx=Math.round(original[0]+original[2]/2-b[0]-b[2]/2),dy=original[1]+original[3]-b[1]-b[3];return points(p,dx,dy);}
function compose(layers){const p=new Map();for(const layer of layers)for(const[x,y,k]of layer)p.set(x+','+y,[x,y,k]);return[...p.values()];}
function canvas(p){const b=pointBounds(p),translation=[32,2-b[1]],frame=new Uint8Array(4096);for(const[x,y,k]of p){const xx=x+translation[0],yy=y+translation[1];assert.ok(xx>=0&&xx<64&&yy>=0&&yy<64,'Composed native source fits the 64-pixel work canvas');frame[yy*64+xx]=k;}return{frame,translation,offset:[32-translation[0],64-translation[1]],bounds:b};}
async function importSources(key,actor,sheets,targetHeights){
 const spec={key,directory:dir+'/'+key,sourceType:'image-generation',width:64,height:64,palette:actor.colors,sheets,sequences:{source:{1:Array.from({length:targetHeights.flat().length},(_,i)=>i)}},notes:{status:'Inactive source extraction only; native-frame-map.draft.json and native-raster.json contain the complete authored native mapping. Do not activate this source-only spec as a native slot map.',unusedSourceFrames:key==='rootling'?[1,4,7,11]:key==='snap-briar'?[1,5]:[],pixels:'All anatomy, clothing, wood and leaves come from actual generated PNGs. Only nearest sampling, palette indexing, exact source mirrors and integer source-layer composition are used.'}};
 const run=async()=>{await writeFile(dir+'/'+key+'/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/'+key+'/import-spec.draft.json'],{stdio:'pipe'});return json(key+'/preview-raster.json');};
 await run();const first=await json(key+'/preview-import.json');for(let s=0;s<sheets.length;s++)spec.sheets[s].overrides=Object.fromEntries(first.sources[s].frames.map((f,i)=>[i,{scale:targetHeights[s][i]/(f.bounds[3]*first.sources[s].scale)}]));
 return{raster:await run(),spec};
}
export async function compileDraft(){
 const all=futureWildlife.filter(a=>a.gfx===89),resources=Object.fromEntries(await Promise.all(['rootling','snap-briar','briar-rider'].map(async k=>[k,await json(k+'/native-resource-audit.json')]))),base=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));
 const sheet=(file,columns,rows,nativeHeight)=>({file:dir+'/'+file,columns,rows,nativeHeight,scaleCells:[0],componentAlpha:128,componentSelection:'union',sample:{method:'nearest',bottom:61}});
 const imports={
  rootling:await importSources('rootling',all.find(a=>a.enemy===34),[sheet('rootling/source-v1.png',3,4,21),sheet('rootling/source-proportions-v2.png',2,2,21)],[[21,21,20,23,23,23,22,22,22,21,25,27],[21,23,22,27]]),
  'snap-briar':await importSources('snap-briar',all.find(a=>a.enemy===38),[sheet('snap-briar/source-v1.png',3,2,29),sheet('snap-briar/source-compact-v2.png',2,1,30)],[[29,30,28,28,28,32],[29,32]]),
  'briar-rider':await importSources('briar-rider',all.find(a=>a.enemy===175),[sheet('briar-rider/source-guard-v1.png',2,2,21),sheet('briar-rider/source-special-v1.png',3,2,38)],[[21,19,22,21],[38,48,47,37,37,37]])
 };
 const source=Object.fromEntries(Object.entries(imports).map(([k,v])=>[k,parse(v.raster)])),native={},maps={};
 native.rootling=rootMap.map((n,f)=>{const p=typeof n==='number'?source.rootling[n]:flip(source.rootling[n.frame]);return anchor(p,resources.rootling.originalFrames[f].bounds);});
 maps.rootling=rootMap.map((n,f)=>({frame:f,source:n,composition:'One sampled source; original center and lowest opaque pixel preserved.',originalBounds:resources.rootling.originalFrames[f].bounds}));
 native['snap-briar']=briarMap.map((n,f)=>anchor(source['snap-briar'][n],resources['snap-briar'].originalFrames[f].bounds));
 maps['snap-briar']=native['snap-briar'].map((p,f)=>({frame:f,source:briarMap[f],composition:'One sampled source; original center and lowest opaque pixel preserved.',originalBounds:resources['snap-briar'].originalFrames[f].bounds}));
 const guardBounds=[[-11,-35,18,21],[-10,-33,18,21],[-9,-35,18,21],[-10,-38,19,19],[-9,-37,19,19],[-8,-38,19,19],[-1,-34,15,22],[0,-33,15,22],[1,-34,15,22],[-14,-34,15,22],[-15,-33,15,22],[-16,-34,15,22],[-10,-47,20,21],[-9,-39,19,19],[-9,-41,19,19],[-9,-47,19,19],[-9,-49,19,19]];
 const riders=[],riderMap=[];
 for(let f=0;f<17;f++){
  const mountShift=[f>=6&&f<=8?-1:f>=9&&f<=11?1:0,f===12?2:f>=15?4:0],mount=native.rootling[f].map(([x,y,k])=>[x+mountShift[0],y+mountShift[1],k]),guardSource=f<3?0:f<6?1:f<12?2:f===12?3:1,guard=anchor(f>=9&&f<=11?flip(source['briar-rider'][guardSource]):source['briar-rider'][guardSource],guardBounds[f]);
  const order=f<3?['mount','guard']:['guard','mount'];riders.push(compose(order.map(k=>k==='mount'?mount:guard)));riderMap.push({frame:f,rootlingFrame:f,mountShift,guardSource,guardFlip:f>=9&&f<=11,guardBounds:guardBounds[f],order,composition:'Generated guard plus the exact sampled Rootling; source overlay order follows original mount visibility. No anatomy drawn or substituted.',originalBounds:resources['briar-rider'].originalFrames[f].bounds});
 }
 const shadowBounds={18:[-6,-20,13,4],19:[-6,12,13,4],21:[-22,-4,12,4],23:[10,-4,12,4]},originalBank=nativeSpriteBank(base,all.find(a=>a.enemy===175)),shadows=[];
 for(const[frameText,b]of Object.entries(shadowBounds)){const f=Number(frameText),cells=nativeSpriteCells(originalBank,f),p=new Uint8Array(b[2]*b[3]);for(const c of cells)for(let y=0;y<16;y++)for(let x=0;x<16;x++){const xx=c.x+x-b[0],yy=c.y+y-b[1],k=c.pixels[y*16+x];if(xx>=0&&xx<b[2]&&yy>=0&&yy<b[3]&&k){assert.equal(k,1,'Unchanged original shadow contains only index 1');p[yy*b[2]+xx]=k;}}const layer=[];for(let y=0;y<b[3];y++)for(let x=0;x<b[2];x++)if(p[y*b[2]+x])layer.push([b[0]+x,b[1]+y,1]);shadows.push({frame:f,bounds:b,pixels:[...p],opaquePixels:layer.length,pixelSha256:hash(p),layer});}
 for(let f=17;f<24;f++){
  const sourceIndex={17:4,18:5,19:6,20:7,21:8,22:9,23:8}[f],isFlip=f===23,p=isFlip?flip(source['briar-rider'][sourceIndex]):source['briar-rider'][sourceIndex],original=resources['briar-rider'].originalFrames[f].bounds,bodyBounds=f===18?[-12,-71,25,48]:f===19?[-11,-37,23,47]:f===21?[-28,-41,44,37]:f===23?[-16,-41,44,37]:original,body=anchor(p,bodyBounds),shadow=shadows.find(s=>s.frame===f);if(shadow){const occupied=new Set(body.map(p=>p[0]+','+p[1]));assert.ok(shadow.layer.every(p=>!occupied.has(p[0]+','+p[1])),'Source body and unchanged shadow do not overlap');}
  riders.push(compose([body,...(shadow?[shadow.layer]:[])]));riderMap.push({frame:f,source:{frame:sourceIndex,flip:isFlip},bodyBounds,shadowBounds:shadow?.bounds??null,composition:'Generated full mounted-action source, with unchanged original source shadow where present.',originalBounds:original});
 }
 native['briar-rider']=riders;maps['briar-rider']=riderMap;
 await writeFile(dir+'/briar-rider/original-shadows.json',JSON.stringify({sourceType:'original-ROM-raster',sourceRomSha256:hash(base),gfx:89,asm:50,frames:shadows.map(({layer,...s})=>s)},null,2)+'\n');
 const dictionary=new Set([Buffer.alloc(32).toString('hex')]),groups=[],framesByGroup={};
 for(const key of ['rootling','briar-rider','snap-briar']){const r=resources[key],canvases=native[key].map(canvas),frames=canvases.map(c=>c.frame),cells=r.assembly.cells,packing=packCells(frames,{diagnosticLimit:cells,dictionary});framesByGroup[key]=frames;
  groups.push({art:key,asm:r.asm,size:r.assembly.sizeByte,frames:frames.length,width:64,height:64,frameCellOrigins:packing.map(p=>p.origins),frameOffsets:canvases.map(c=>c.offset)});
  const roles=await json(key+'/native-role-audit.json'),map={status:'Inactive generated source/native composition and exact cell geometry',gfx:89,asm:r.asm,size:r.assembly.sizeByte,cells,nativeFrames:frames.length,width:64,height:64,frameOffsets:canvases.map(c=>c.offset),frames:canvases.map((c,f)=>({...roles.frames[f],...maps[key][f],nativeBounds:c.bounds,canvasTranslation:c.translation,sampledBounds:bounds(c.frame),cellOrigins:packing[f].origins,occupiedCells:packing[f].occupied,stripAxis:packing[f].stripAxis,sourcePixelSha256:hash(c.frame)})),integration:key==='briar-rider'?'Consume native-raster.json with every composed frame retained. Use these authored eight-cell origins and offsets; preserve asm50 original source reservation.':'Consume native-raster.json in native slot order, with these cell origins/offsets.'};
  await writeFile(dir+'/'+key+'/native-frame-map.draft.json',JSON.stringify(map,null,2)+'\n');
  await writeFile(dir+'/'+key+'/native-raster.json',JSON.stringify({...imports[key].raster,sequences:{native:{1:frames.map((_,f)=>f)}},frames:frames.map(p=>Array.from(p,v=>v.toString(16)).join('')),nativeComposition:{map:dir+'/'+key+'/native-frame-map.draft.json',compiler:dir+'/prepare-draft.mjs',...(key==='briar-rider'?{rootlingSource:dir+'/rootling/preview-raster.json',originalShadows:dir+'/briar-rider/original-shadows.json'}:{})}})+'\n');
 }
 const compiled=compileActorFamily({groups},(art,f)=>framesByGroup[art][f]),packed=compress(compiled.graphics);assert.deepEqual(decompress(packed,0).bytes,compiled.graphics);
 for(const g of compiled.groups){const map=await json(g.art+'/native-frame-map.draft.json');assert.equal(g.assembly.length,g.frames*g.cells*10);for(let f=0;f<g.frames;f++)for(const c of nativeSpriteCells({...compiled,assembly:g.assembly,cells:g.cells,frames:g.frames},f)){const[ox,oy]=g.frameCellOrigins[f][c.cell],off=g.frameOffsets[f];assert.equal(c.x,ox-32+off[0]);assert.equal(c.y,oy-64+off[1]);for(let y=0;y<16;y++)for(let x=0;x<16;x++)assert.equal(c.pixels[y*16+x],framesByGroup[g.art][f][(oy+y)*64+ox+x]);}await writeFile(dir+'/'+g.art+'/assembly.bin',g.assembly);}
 for(const[file,b]of[['graphics.4bpp',compiled.graphics],['graphics.ct-lz',packed]])await writeFile(dir+'/'+file,b);
 for(const palette of [32,33,36,37,38]){const a=all.find(a=>a.palette===palette),b=new Uint8Array(24);a.colors.forEach((c,i)=>put16(b,i*2,snesColor(c)));assert.equal(hash(b),Object.values(resources).flatMap(r=>r.actors).find(o=>o.palette===palette).preservedPaletteSha256);await writeFile(dir+'/palette-'+palette+'.bin',b);}
 const r=resources.rootling,assemblyBytes=compiled.groups.reduce((n,g)=>n+g.assembly.length,0),audit={status:'Inactive exact shared-bank compile passed',gfx:89,graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,assemblyBytes,tiles:compiled.tiles,graphicsSha256:hash(compiled.graphics),compressedSha256:hash(packed),groups:compiled.groups.map(g=>({key:g.art,asm:g.asm,size:g.size,cells:g.cells,frames:g.frames,assemblyBytes:g.assembly.length,assemblySha256:hash(g.assembly),uniqueNativeSourceImages:new Set(framesByGroup[g.art].map(hash)).size})),original:{...r.originalGraphics,rawDelta:compiled.graphics.length-r.originalGraphics.decodedBytes,compressedPlusAssemblyDelta:packed.length-r.originalGraphics.compressedBytes},current:{...r.currentBaseline,rawDelta:compiled.graphics.length-r.currentBaseline.graphics.decodedBytes,compressedPlusAssemblyDelta:packed.length-r.currentBaseline.graphics.compressedBytes},underOriginalDecodedBudget:compiled.graphics.length<=r.originalGraphics.decodedBytes,asm50SourceReservation:'Unchanged; original final source extent remains unproven and must never be reclaimed.',sourcePixelsNotDrawnOrClipped:true,activation:false};await writeFile(dir+'/draft-audit.json',JSON.stringify(audit,null,2)+'\n');await writeFile(dir+'/native-family-proposal.draft.json',JSON.stringify({gfx:89,groups,owners:all.map(({key,enemy,gfx,asm,palette,animation,size})=>({key,enemy,gfx,asm,palette,animation,size})),paletteWrites:false,sourceReservation: audit.asm50SourceReservation,activation:false},null,2)+'\n');return audit;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)console.log(JSON.stringify(await compileDraft()));
