import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const dir='assets/imagegen/town-tradesmen',audit=JSON.parse(await readFile('assets/raster/town-npc35-audit/native-audit.json')),labels=JSON.parse(await readFile('assets/raster/town-npc35-audit/native-role-notes.json')).labels;
await mkdir(dir+'/draft',{recursive:true});
const sheets=[
 {file:dir+'/base-face-source-v2.png',columns:3,rows:5,nativeHeight:32,scaleCells:[0,1,2],cells:[0,1,2,7,8,9,10,11],componentAlpha:96,sample:{method:'area',bottom:39}},
 {file:dir+'/gait-source-v2.png',columns:3,rows:2,nativeHeight:32,scaleCells:[0,2],cells:[0,1,2,3],componentAlpha:96,sample:{method:'area',bottom:39}},
 {file:dir+'/actions-source-v1.png',columns:3,rows:4,nativeHeight:32,scaleCells:[11],cells:[0,1,2,3,4,5,6,7,9,10],componentAlpha:96,sample:{method:'area',bottom:39}},
 {file:dir+'/profile-contact-source-v3.png',columns:1,rows:1,nativeHeight:31,scaleCells:[0],componentAlpha:96,sample:{method:'area',bottom:39}}
];
const flip=frame=>({frame,flip:true}),sequence=[0,1,2,flip(2),8,9,10,11,3,4,5,6,7,22,flip(7),flip(22),12,13,15,16,flip(15),flip(16),17,18,flip(17),flip(18),14,flip(14),19,20,21];
const spec={key:'town-tradesmen',directory:dir+'/draft',width:64,height:48,palette:audit.palettes[0].colors,sourceType:'image-generation',sheets,sequences:{native:{1:sequence}}};
async function run(){await writeFile(dir+'/draft/import-spec.draft.json',JSON.stringify(spec,null,2)+'\n');execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/draft/import-spec.draft.json'],{stdio:'pipe'});return JSON.parse(await readFile(dir+'/draft/preview-import.json'));}
const first=await run();
// Whole-pose scale normalization only. No pixel anatomy or costume drawing.
const targets=[{0:32,1:32,2:32,7:32,8:32,9:32,10:32,11:31},{0:32,1:31,2:32,3:31},{0:32},{}];
for(let s=0;s<sheets.length;s++){sheets[s].overrides={};for(const[cell,target]of Object.entries(targets[s])){const h=first.sources[s].frames[+cell].bounds[3];sheets[s].overrides[cell]={scale:target/(h*first.sources[s].scale)};}}
await run();
const asset=JSON.parse(await readFile(dir+'/draft/preview-raster.json')),bounds=f=>{let x0=64,y0=48,x1=-1,y1=-1;for(let i=0;i<f.length;i++)if(f[i]!=='0'){const x=i%64,y=Math.floor(i/64);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return[x0,y0,x1-x0+1,y1-y0+1];};
// Retain the original displayed horizontal center and foot/prop bottom using
// explicit whole-source integer translations; pixel shape is untouched.
const selections=sequence.map((n,frame)=>{const entry=typeof n==='number'?{frame:n}:{...n},b=bounds(asset.frames[entry.frame]),original=audit.frames[frame].opaqueBounds,centre=b[0]+(b[2]-1)/2,mirrored=entry.flip?63-centre:centre,dx=Math.round(32+original[0]+(original[2]-1)/2-mirrored),dy=40+original[1]+original[3]-1-(b[1]+b[3]-1);return{...entry,...(dx?{dx}:{}),...(dy?{dy}:{})};});
spec.sequences.native[1]=selections;await run();
await writeFile(dir+'/native-role-map.json',JSON.stringify({status:'Inactive complete generated source map',baselineSha256:audit.baseline.sha256,uniqueSampledFrames:23,nativeFrames:31,blankFrames:[],sourcePoseTransforms:'Only whole raster mirrors, integer translations and recorded sampling scale; no anatomy painted or procedural silhouettes',frames:selections.map((source,frame)=>({frame,label:labels[frame],source,originalOpaqueBounds:audit.frames[frame].opaqueBounds}))},null,2)+'\n');
console.log(JSON.stringify({sources:4,sourceCells:23,nativeRoles:selections.length,selections}));
