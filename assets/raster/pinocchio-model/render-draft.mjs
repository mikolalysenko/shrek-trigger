import {readFile,writeFile,mkdir} from 'node:fs/promises';import {PNG} from 'pngjs';import {loadModel,render} from './render-model.mjs';import {poseModel} from './pose-model.mjs';import {recipe} from './pose-recipes.mjs';import {cast} from '../../../content/cast.js';import {validateRom} from '../../../engine/rom.js';import {frameAssignments} from '../../../engine/sprites.js';
const root=new URL('./',import.meta.url),base=await validateRom(await readFile(new URL('../../../.local/chrono-trigger-usa.sfc',root))),{map}=frameAssignments(base,3),model=await loadModel(),frames=[],lookup=new Map(),sequences={};
for(const [frame,m]of map.entries()){
 if(m.pose==='blank')continue;
 const key=`${m.pose}/${m.facing}/${m.phase}`;if(lookup.has(key)){frames[lookup.get(key)].nativeFrames.push(frame);continue;}
 const options=recipe(m.pose,m.phase),index=frames.length;
 frames.push({...m,nativeFrames:[frame],index,options,yaw:[180,0,-90,90][m.facing]});lookup.set(key,index);((sequences[m.pose]??={})[m.facing]??=[])[m.phase]=index;
}
const size=256,columns=8,rows=Math.ceil(frames.length/columns),atlas=new PNG({width:columns*size,height:rows*size});await mkdir(new URL('draft/',root),{recursive:true});
for(const frame of frames){
 const image=render(model,{width:size,height:size,yaw:frame.yaw,pose:poseModel(model,frame.options),scale:size/2.5,center:[0,.94,0]}),x0=(frame.index%columns)*size,y0=Math.floor(frame.index/columns)*size;
 let minX=size,minY=size,maxX=-1,maxY=-1;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(image.data[(y*size+x)*4+3]>=128){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 if(minX<1||minY<1||maxX>=size-1||maxY>=size-1)throw Error('Source projection clipped '+frame.pose+'/'+frame.facing+'/'+frame.phase);
 frame.sourceBounds=[minX,minY,maxX-minX+1,maxY-minY+1];frame.region=[x0,y0,size,size];
 for(let y=0;y<size;y++)image.data.copy(atlas.data,((y0+y)*atlas.width+x0)*4,y*size*4,(y+1)*size*4);
}
const standing=frames.filter(f=>f.pose==='idle'),heights=standing.map(f=>f.sourceBounds[3]).sort((a,b)=>a-b),reference=heights[Math.floor(heights.length/2)],overrides={};
for(const f of frames){const nativeWidth=f.sourceBounds[2]*30/reference*1.15,nativeHeight=f.sourceBounds[3]*30/reference,scale=Math.min(1,31.8/nativeWidth,31.8/nativeHeight);if(scale<1)overrides[f.index]={scale,note:'Uniform whole-model pose scale capped at32×32; source pixels and silhouette remain intact.'};}
await writeFile(new URL('draft/source-poses.png',root),PNG.sync.write(atlas));
const samplingPalette=JSON.parse(await readFile(new URL('sampling-palette.json',root))).palette;
const spec={key:'pinocchio',sourceType:'existing-game-model-render',directory:'assets/raster/pinocchio-model/draft',palette:cast[3].palette,samplingPalette,sheets:[{file:'assets/raster/pinocchio-model/draft/source-poses.png',regions:frames.map(f=>f.region),nativeHeight:30,scaleCells:standing.map(f=>f.index),componentSelection:'union',componentAlpha:128,sample:{method:'nearest',scaleX:1.15,bottom:31},overrides}],sequences,notes:{source:'Actual archived Shrek SuperSlam OBJ geometry and UV textures from FliQuaDv. No new body meshes or drawn sprite anatomy.',animation:'All joint recipes are authored locally. The archive supplies no skeleton or animation clips.',presentation:'Original head pieces scaled1.4 about the neck; whole projected silhouette widened1.15 for32×32 readability. This is a disclosed presentation adaptation, not an unchanged game-model claim.',status:'Inactive draft. Native role names are mapped to authored 3D poses; source and native semantic review pending.',blanks:'All62 original blank frame IDs retain transparent output.'}};
await writeFile(new URL('import-spec.draft.json',root),JSON.stringify(spec,null,2)+'\n');
await writeFile(new URL('draft/render-manifest.json',root),JSON.stringify({source:'source/pinocchio/pinocchio.obj',modelVertices:model.positions.length,modelTriangles:model.faces.length,gameAnimationClips:0,authoredSourceFrames:frames.length,nativeFrames:map.length,blankNativeFrames:map.flatMap((m,i)=>m.pose==='blank'?[i]:[]),projection:{elevation:12,width:size,height:size,scale:size/2.5,center:[0,.94,0]},frames},null,2)+'\n');
console.log(JSON.stringify({authoredSourceFrames:frames.length,nonblankNativeFrames:map.filter(m=>m.pose!=='blank').length,blanks:map.filter(m=>m.pose==='blank').length,overrides:Object.keys(overrides).length}));
