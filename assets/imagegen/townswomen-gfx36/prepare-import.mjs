import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const dir='assets/imagegen/townswomen-gfx36',audit=JSON.parse(await readFile(dir+'/native-audit.json')),labels=JSON.parse(await readFile(dir+'/native-role-notes.json')).labels;
await mkdir(dir+'/draft',{recursive:true});
const sheets=[
 {file:dir+'/base-face-apron-v2.png',columns:3,rows:5,nativeHeight:31,scaleCells:[0,1,2],cells:[0,2,11,12],componentAlpha:96,sample:{method:'area',bottom:39}},
 {file:dir+'/gait-source-v3.png',columns:3,rows:2,nativeHeight:31,scaleCells:[1,4],cells:[0,1,2],componentAlpha:96,sample:{method:'area',bottom:39}},
 {file:dir+'/front-face-source-v4.png',columns:1,rows:1,nativeHeight:31,scaleCells:[0],componentAlpha:96,sample:{method:'area',bottom:39}},
 {file:dir+'/actions-source-v1.png',columns:3,rows:3,nativeHeight:31,scaleCells:[7],cells:[0,2,4,5,6,8],componentAlpha:96,componentSelection:'union',sample:{method:'area',bottom:39}},
 {file:dir+'/front-passing-source-v2.png',columns:1,rows:1,nativeHeight:30,scaleCells:[0],componentAlpha:96,sample:{method:'nearest',scaleX:1.04,bottom:39}}
];
const flip=frame=>({frame,flip:true}),sequence=[0,7,1,flip(1),4,5,6,flip(5),8,14,9,flip(14),2,3,flip(2),flip(3),10,11,13,12,flip(12)];
const spec={key:'townswomen-gfx36',directory:dir+'/draft',width:64,height:48,palette:audit.palettes[0].colors,sourceType:'image-generation',sheets,sequences:{native:{1:sequence}}};
async function run(){await writeFile(dir+'/draft/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/draft/import-spec.draft.json'],{stdio:'pipe'});return JSON.parse(await readFile(dir+'/draft/preview-import.json'));}
const first=await run();
// Whole-pose scaling only, preserving original contact/passing height and foot baseline.
// Passing source uses nearest +4% width normalization (one native pixel,14px total)
// to preserve both genuine source eyes. Every other selected source uses AREA.
const targets=[{0:31,2:31,11:30,12:30},{0:31,1:30,2:31},{0:31},{0:31,2:31,4:32,5:32,7:31,8:32},{0:30}];
for(let s=0;s<sheets.length;s++){sheets[s].overrides={};for(const[cell,target]of Object.entries(targets[s])){const h=first.sources[s].frames[+cell].bounds[3];sheets[s].overrides[cell]={scale:target/(h*first.sources[s].scale)};}}
await run();
const asset=JSON.parse(await readFile(dir+'/draft/preview-raster.json')),bounds=f=>{let x0=64,y0=48,x1=-1,y1=-1;for(let i=0;i<f.length;i++)if(f[i]!=='0'){const x=i%64,y=Math.floor(i/64);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return[x0,y0,x1-x0+1,y1-y0+1];};
// Preserve native visible horizontal center and foot bottom with whole-raster translations.
const selections=sequence.map((n,frame)=>{const entry=typeof n==='number'?{frame:n}:{...n},b=bounds(asset.frames[entry.frame]),original=audit.frames[frame].opaqueBounds,centre=b[0]+(b[2]-1)/2,mirrored=entry.flip?63-centre:centre,dx=Math.round(32+original[0]+(original[2]-1)/2-mirrored),dy=40+original[1]+original[3]-1-(b[1]+b[3]-1);return{...entry,...(dx?{dx}:{}),...(dy?{dy}:{})};});
// Preserve exact original whole-raster mirror relationships, including the asymmetric seated pair.
for(const [left,right,dx,dy]of[[2,3,0,0],[9,11,0,0],[12,14,0,0],[13,15,0,0],[19,20,1,-1]]){const a=selections[left];selections[right]={frame:a.frame,flip:true,...((- (a.dx??0)+dx)?{dx:-(a.dx??0)+dx}:{}),...(((a.dy??0)+dy)?{dy:(a.dy??0)+dy}:{})};}
spec.sequences.native[1]=selections;await run();
await writeFile(dir+'/native-role-map.json',JSON.stringify({status:'Inactive candidate source map; final gait/action/native review pending',baselineSha256:audit.baseline.sha256,uniqueSampledFrames:asset.frames.length,nativeFrames:21,blankFrames:[],sourcePoseTransforms:'Only whole-raster mirrors, integer translations and recorded sampling scale; no anatomy/effects painted procedurally',frames:selections.map((source,frame)=>({frame,label:labels[frame],source,originalOpaqueBounds:audit.frames[frame].opaqueBounds}))},null,2)+'\n');
console.log(JSON.stringify({sources:sheets.length,sourceCells:asset.frames.length,nativeRoles:selections.length,selections}));
