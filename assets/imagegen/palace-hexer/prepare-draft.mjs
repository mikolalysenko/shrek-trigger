import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const dir='assets/imagegen/palace-hexer',audit=JSON.parse(await readFile(dir+'/native-audit.json'));
await mkdir(dir+'/draft',{recursive:true});
const sheets=[
 {file:dir+'/base-source-v1.png',columns:3,rows:3,cells:[1,3,4,6,7],nativeHeight:28,scaleCells:[0,1,2,3,4,5,6,7,8],sample:{method:'area',bottom:39}},
 {file:dir+'/gait-source-v2.png',columns:3,rows:1,cells:[1,2],nativeHeight:28,scaleCells:[0,1,2],sample:{method:'area',bottom:39}},
 {file:dir+'/casts-source-v1.png',columns:3,rows:3,nativeHeight:28,scaleCells:[0,3,6],componentSelection:'union',sample:{method:'area',bottom:39},overrides:{7:{scaleX:.94}}},
 {file:dir+'/reactions-source-v1.png',columns:3,rows:2,nativeHeight:28,scaleCells:[4,5],componentSelection:'union',componentAlpha:128,sample:{method:'area',alphaThreshold:128,bottom:39}}
];
const labels=['Rear contact A','Rear passing','Rear contact B','Front contact A','Front passing','Front contact B','Left contact A','Left passing','Left contact B','Right contact A','Right passing','Right contact B','Backward hit reaction','Compact gather','Raised-hand threat','Forward hit reaction','Rear windup','Rear overhead release','Rear recovery','Front windup','Front low release','Front recovery','Left windup','Left release','Left recovery','Right windup','Right release','Right recovery'];
const refs=[20,0,21,1,2,5,3,4,6,{frame:3,flip:true},{frame:4,flip:true},{frame:6,flip:true},16,{frame:17,flip:true},{frame:18,flip:true},{frame:19,flip:true},7,8,{frame:9,flip:true},10,11,12,13,14,15,{frame:13,flip:true},{frame:14,flip:true},{frame:15,flip:true}].map(e=>typeof e==='number'?{frame:e}:e);
const spec={key:'palace-hexer',directory:dir+'/draft',width:64,height:64,palette:audit.palette.colors,sourceType:'image-generation',sheets,sequences:{native:{1:refs}}};
async function importSpec(){await writeFile(dir+'/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');const r=spawnSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
await importSpec();
const asset=JSON.parse(await readFile(dir+'/draft/preview-raster.json'));
function points(entry){return [...asset.frames[entry.frame]].flatMap((k,i)=>k==='0'?[]:[[entry.flip?63-(i%64):i%64,Math.floor(i/64),parseInt(k,16)]]);}
const frames=[],overlapFrames=[];
for(let f=0;f<28;f++){
 const native=audit.frames[f],origins=native.cellOrigins.map(([x,y])=>[32+x,40+y]),mask=new Uint8Array(4096);for(const[x,y]of origins)for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++)mask[(y+yy)*64+x+xx]++;
 if(mask.some(n=>n>1))overlapFrames.push(f);
 const p=points(refs[f]),xs=p.map(p=>p[0]),ys=p.map(p=>p[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1];
 const bottom=native.bounds[1]+native.bounds[3]-1+40,targetX=f<12?32:native.bounds[0]+(native.bounds[2]-1)/2+32,prefer=[Math.round(targetX-(bounds[0]+(bounds[2]-1)/2)),bottom-(bounds[1]+bounds[3]-1)];
 const fits=[];for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++)if(p.every(([x,y])=>x+dx>=0&&x+dx<64&&y+dy>=0&&y+dy<64&&mask[(y+dy)*64+x+dx]))fits.push({dx,dy,score:2*Math.abs(dy-prefer[1])+Math.abs(dx-prefer[0])});fits.sort((a,b)=>a.score-b.score||Math.abs(a.dx)-Math.abs(b.dx));assert.ok(fits.length,'Original four-cell footprint must cover all source pixels in frame '+f);const fit=fits[0];refs[f]={...refs[f],dx:fit.dx,dy:fit.dy};
 frames.push({frame:f,role:labels[f],source:refs[f],sourceBounds:bounds,translatedBounds:[bounds[0]+fit.dx-32,bounds[1]+fit.dy-40,bounds[2],bounds[3]],originalOpaqueBounds:native.bounds,originalSignedCellOrigins:native.cellOrigins,signedCellOrigins:native.cellOrigins,cellOrigins:origins,sourcePixels:p.length,overlappingCanvasPixels:mask.filter(n=>n>1).length,placementReason:'Original cell XY retained; whole source placed near the original occupied center and exact lowest opaque pixel. No source pixel is clipped.'});
}
spec.sequences.native[1]=refs;await importSpec();
const family={key:'palace-hexers',name:'Palace Hexer court minions',gfx:90,groups:[{asm:47,size:0,frames:28,width:64,height:64,art:'palace-hexer',anchor:[0,24],frameCellOrigins:frames.map(f=>f.cellOrigins),cellOverlapFrames:overlapFrames}],actors:[{key:'palace-hexer',name:'Palace Hexer',short:'Hexer',enemy:59,asm:47,palette:39,animation:92,colors:audit.palette.colors}]};
await writeFile(dir+'/family.draft.json',JSON.stringify(family,null,2)+'\n');
await writeFile(dir+'/geometry-proposal.json',JSON.stringify({status:'Inactive exact original geometry proposal',canvas:[64,64],origin:[32,40],anchor:[0,24],nativeCells:4,originalSignedXYUnchanged:true,extraVramBytes:0,frames,overlapFrames,sourceSamplingNotes:['Only actual generated source PNG samples are used. No anatomy, facial marks, hands or arcs are painted in code.','Side release source is sampled at 94% horizontal width to retain its complete arc within the original four-cell footprint; vertical/body scale is unchanged.','Reaction sheet threshold128 excludes the generated low-opacity ambient glow; all opaque body and impact components are retained.','Whole-frame mirror fixes front/recovery cap direction and provides opposite profiles. Those transforms are explicit source adaptations.']},null,2)+'\n');
await writeFile(dir+'/native-role-notes.json',JSON.stringify({labels,sourcePoses:22,nativeSlots:28,blankFrames:[],gait:{nativeOrder:['A','P','B','P'],ticks:[10,10,10,10],correctedSourceCells:{rear:'reactions-source-v1 cells4/5',frontB:'gait-source-v2 cell1',leftB:'gait-source-v2 cell2'},retainedOriginalContactBottoms:frames.slice(0,12).map(f=>({frame:f.frame,bottom:f.translatedBounds[1]+f.translatedBounds[3]-1})),note:'Contacts are actual opposed generated limbs; right direction is a documented whole-source mirror. Original two-pixel passing-foot placement is retained.'},casting:{back:[16,17,18],front:[19,20,21],left:[22,23,24],right:[25,26,27],ticks:[15,5,31],note:'Distinct rear overhead, frontal low and lateral crescents are generated source pixels; the right sequence mirrors left.'},scope:'Static semantic source mapping only; native scheduler execution and real authored encounter proof are separate.'},null,2)+'\n');
console.log(JSON.stringify({sourcePoses:22,nativeSlots:28,overlapFrames,placements:frames.map(f=>({frame:f.frame,bounds:f.translatedBounds,source:f.source}))}));
