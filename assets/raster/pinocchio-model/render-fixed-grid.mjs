// Fixed native projection of the same real mesh and authored joint recipes.
// Source pixels are replicated 4x only to preserve tiny disconnected model
// details in the generic importer's component inventory. No pixel is painted.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {loadModel,render,rotate,V} from './render-model.mjs';
import {poseModel} from './pose-model.mjs';
const root=new URL('./',import.meta.url),manifest=JSON.parse(await readFile(new URL('draft/render-manifest.json',root))),spec=JSON.parse(await readFile(new URL('import-spec.mirrored.draft.json',root))),model=await loadModel();
const directory='draft-fixed-grid',size=32,factor=4,cell=size*factor,columns=8,atlas=new PNG({width:columns*cell,height:Math.ceil(manifest.frames.length/columns)*cell}),referenceScale=16,center=[0,.94,0],aspect=1.15,elevation=12;
await mkdir(new URL(directory+'/',root),{recursive:true});
const frames=[],overrides={},grounded=new Set(['kneel','down','offline','wake','repair','bow','tackle']);
for(const original of manifest.frames){
 const frame=structuredClone(original),pose=poseModel(model,frame.options),vertices=model.positions.map(pose),camera=vertices.map(p=>rotate(rotate(V.sub(p,center),'y',frame.yaw*Math.PI/180),'x',elevation*Math.PI/180));
 const minX=Math.min(...camera.map(p=>p[0]*aspect)),maxX=Math.max(...camera.map(p=>p[0]*aspect)),minY=Math.min(...camera.map(p=>p[1])),maxY=Math.max(...camera.map(p=>p[1]));
 const scale=Math.min(referenceScale,30/(maxX-minX),30/(maxY-minY));
 const left=16+minX*scale,right=16+maxX*scale,top=16-maxY*scale,bottom=16-minY*scale;
 // Integer correction leaves the original pixel phase unchanged. Only poses
 // exceeding the native silhouette budget receive a whole-model scale change.
 let dx=0,dy=grounded.has(frame.pose)?Math.floor(31.5-bottom):0;
 if(left<.5)dx=Math.ceil(.5-left);if(right+dx>31.5)dx-=Math.ceil(right+dx-31.5);
 if(top+dy<.5)dy+=Math.ceil(.5-top-dy);if(bottom+dy>31.5)dy-=Math.ceil(bottom+dy-31.5);
 const image=render(model,{width:size,height:size,yaw:frame.yaw,elevation,scale,aspect,center,pose,offset:[dx,dy]}),x0=frame.index%columns*cell,y0=Math.floor(frame.index/columns)*cell;
 let bx=size,by=size,ex=-1,ey=-1;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(image.data[(y*size+x)*4+3]>=128){bx=Math.min(bx,x);by=Math.min(by,y);ex=Math.max(ex,x);ey=Math.max(ey,y);for(let yy=0;yy<factor;yy++)for(let xx=0;xx<factor;xx++)image.data.copy(atlas.data,((y0+y*factor+yy)*atlas.width+x0+x*factor+xx)*4,(y*size+x)*4,(y*size+x+1)*4);}
 if(ex<bx)throw Error('Empty fixed-grid pose '+frame.index);
 frame.region=[x0,y0,cell,cell];frame.sourceBounds=[bx*factor,by*factor,(ex-bx+1)*factor,(ey-by+1)*factor];frame.projection={scale,aspect,center,offset:[dx,dy],elevation};
 // With source sampling scale1/4, these anchors exactly reconstruct the
 // renderer's32x32 native grid instead of normalizing each alpha bounding box.
 overrides[frame.index]={bottom:ey,dx:bx-Math.floor((32-(ex-bx+1))/2)};frames.push(frame);
}
const sourceFile=`assets/raster/pinocchio-model/${directory}/source-poses.png`;
await writeFile(new URL(directory+'/source-poses.png',root),PNG.sync.write(atlas));
const idle=frames.find(f=>f.pose==='idle'&&f.facing===1);
spec.directory=`assets/raster/pinocchio-model/${directory}`;
spec.sheets=[{file:sourceFile,regions:frames.map(f=>f.region),nativeHeight:idle.sourceBounds[3]/factor,scaleCells:[idle.index],componentSelection:'union',componentAlpha:128,sample:{method:'nearest',scaleX:1},overrides}];
spec.notes={...spec.notes,presentation:'Real game geometry/UVs; original head pieces scaled1.4 at the neck; orthographic projection horizontally widened1.15. Fixed32x32 projection and integer anchors stabilize model texture pixels across poses. Source atlas is exact4x nearest replication of native textured render pixels.',status:'Inactive fixed-grid draft;194 authored model roles and62 preserved native blanks. No recovered game animation clips.'};
spec.semanticRoles=Object.fromEntries(Object.entries(spec.sequences).map(([pose,directions])=>[pose,Object.fromEntries(Object.keys(directions).map(facing=>[facing,{kind:'adapted',reason:`Actual Shrek SuperSlam mesh and UV textures in a locally authored ${pose} pose${facing==='3'?'; complete left render mirrored for right-facing native use':''}. The archive contains no animation clips.`}]))]));
await writeFile(new URL('import-spec.fixed-grid.draft.json',root),JSON.stringify(spec,null,2)+'\n');
await writeFile(new URL(directory+'/render-manifest.json',root),JSON.stringify({...manifest,projection:{width:32,height:32,referenceScale,aspect,center,elevation,sourceReplication:factor},frames},null,2)+'\n');
console.log(JSON.stringify({sourceFrames:frames.length,scaledPoses:frames.filter(f=>f.projection.scale<referenceScale).length,sourceFile}));
