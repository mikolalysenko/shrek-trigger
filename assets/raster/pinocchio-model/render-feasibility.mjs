import {loadModel,render,savePng} from './render-model.mjs';import {poseModel,feasibilityPoses} from './pose-model.mjs';import {PNG} from 'pngjs';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {cast} from '../../../content/cast.js';
const model=await loadModel(),out=new PNG({width:1024,height:1024});await mkdir(new URL('feasibility/',import.meta.url),{recursive:true});
const frames=[];
for(const [row,pose]of feasibilityPoses.entries())for(const [column,[name,yaw]]of [['front',0],['back',180],['left',-90],['right',90]].entries()){
 const image=render(model,{yaw,pose:poseModel(model,{headScale:1.4,...pose.options}),scale:256/2.15,center:[0,.94,0]});
 const file=`feasibility/${pose.name}-${name}.png`;await savePng(file,image);frames.push({cell:row*4+column,pose:pose.name,facing:name,yaw,options:pose.options,file});
 for(let y=0;y<256;y++)image.data.copy(out.data,((row*256+y)*1024+column*256)*4,y*256*4,(y+1)*256*4);
}
await savePng('feasibility/source-contact.png',out);
const samplingPalette=JSON.parse(await readFile(new URL('sampling-palette.json',import.meta.url))).palette;
const spec={samplingPalette,key:'pinocchio-model-feasibility',sourceType:'existing-game-model-render',directory:'assets/raster/pinocchio-model/feasibility',palette:cast[3].palette,sheets:[{file:'assets/raster/pinocchio-model/feasibility/source-contact.png',columns:4,rows:4,nativeHeight:30,scaleCells:[0,1,2,3],componentSelection:'union',componentAlpha:128,sample:{method:'nearest',scaleX:1.15,bottom:31}}],sequences:{idle:{1:[0],0:[1],2:[2],3:[3]},walk:{1:[4,8],0:[5,9],2:[6,10],3:[7,11]},punch:{1:[12],0:[13],2:[14],3:[15]}}};
await writeFile(new URL('import-spec.feasibility.draft.json',import.meta.url),JSON.stringify(spec,null,2)+'\n');await writeFile(new URL('feasibility/render-poses.json',import.meta.url),JSON.stringify({source:'FliQuaDv / Shrek SuperSlam static OBJ',animationSource:'None supplied. Joint rotations below authored locally on original mesh.',width:256,height:256,elevation:12,presentation:{headScale:1.4,screenAspect:1.15},frames},null,2)+'\n');
