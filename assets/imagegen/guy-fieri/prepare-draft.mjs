import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const dir=import.meta.dirname,root=path.resolve(dir,'../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
export const guyPalette=['121319','a35d38','da9365','ffc38b','ffe4a5','d14316','ff9b24','303039','f6f0d7','66656b','bf8730','a7afb6'];
export function sourceComponents(file,minArea=1000){
 const bytes=fs.readFileSync(path.join(dir,file)),im=PNG.sync.read(bytes),seen=new Uint8Array(im.width*im.height),groups=[];
 for(let p=0;p<seen.length;p++)if(!seen[p]&&im.data[p*4+3]>=128){
  const todo=[p];seen[p]=1;let x0=im.width,y0=im.height,x1=0,y1=0,sx=0,sy=0;
  for(let k=0;k<todo.length;k++){const q=todo[k],x=q%im.width,y=Math.floor(q/im.width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);sx+=x;sy+=y;
   for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const xx=x+dx,yy=y+dy,n=yy*im.width+xx;if(xx>=0&&xx<im.width&&yy>=0&&yy<im.height&&!seen[n]&&im.data[n*4+3]>=128){seen[n]=1;todo.push(n);}}
  }
  if(todo.length>=minArea)groups.push({bounds:[x0,y0,x1-x0+1,y1-y0+1],area:todo.length,centre:[sx/todo.length,sy/todo.length],touchesEdge:x0===0||y0===0||x1===im.width-1||y1===im.height-1});
 }
 groups.sort((a,b)=>Math.floor(a.centre[1]/(im.height/4))-Math.floor(b.centre[1]/(im.height/4))||a.centre[0]-b.centre[0]);
 return {file:'assets/imagegen/guy-fieri/'+file,sha256:sha(bytes),dimensions:[im.width,im.height],threshold:128,components:groups.map((g,id)=>({id,...g}))};
}
export function recordSource(stem,observations,refs=[]){
 const source='source-'+stem+'.png',prompt='prompt-'+stem+'.txt',components=sourceComponents(source);fs.writeFileSync(path.join(dir,source.replace('.png','-components.json')),JSON.stringify(components,null,2)+'\n');
 const record={sourceType:'image-generation',tool:'built-in image_gen__imagegen',created:'2026-10-31',prompt,promptSha256:sha(fs.readFileSync(path.join(dir,prompt))),source,sourceSha256:components.sha256,dimensions:components.dimensions,transparentBackground:true,inputReferences:refs.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),observations,status:'Inactive source; native sampling and role review pending'};
 fs.writeFileSync(path.join(dir,'provenance-'+stem+'.json'),JSON.stringify(record,null,2)+'\n');return components;
}
const base=recordSource('base-v1',['Exactly16 complete source figures.','Clear stocky Guy identity; native32×32/12color reduction required.','Walking contact pairs repeat the same lead foot; targeted source corrections pending.']);
const actions=recordSource('actions-v1',['Sixteen action figures; proper front/back/side anticipation and strikes, empty-hand guards/casts and spatula raises.','Rightward strike cell7 reaches the source edge and needs a compact correction before acceptance.'],['assets/imagegen/guy-fieri/source-base-v1.png']);
const motion=recordSource('motion-v1',['Twelve complete figures. Cell0 supplies the opposite frontal foot contact. Rear/side gait cells1–3 do not provide a clearly opposite stride and are excluded.','Rear jump cell4 has utensil in the opposite hand and is mirrored as a complete source; rear tuck6 and front impact7 retain the correct orientations.','Side casts8/9 face RIGHT/LEFT respectively, opposite the requested order; mapping follows observed facing. Cell10 is a right-facing backswing rather than a left strike and is excluded. Cell11 is a compact right strike.'],['assets/imagegen/guy-fieri/source-base-v1.png']);
const effects=recordSource('effects-v1',['Four logical generated effects: two narrow mantles followed by two wider halos. The flame tips include detached alpha components, so explicit quadrant regions and component UNION preserve each complete effect.','Sampling preserves actual flame pixels; aspect fit into original32×64 and48×64 reservations is recorded in separate specs.']);
recordSource('contact-v1',['Rejected: repeats the original left-facing arm/contact construction. Not consumed by any native role.'],['assets/imagegen/guy-fieri/reference-left-contact.png']);
const contact=recordSource('contact-v2',['Accepted distinct left walk pose: foreground forearm crosses the flame shirt, unlike the base contact. The leg silhouette remains similar, so this is not claimed as two perfectly opposing sole contacts. Right profile uses a whole-source mirror.'],['assets/imagegen/guy-fieri/reference-left-contact.png']);
fs.writeFileSync(path.join(dir,'palettes.draft.json'),JSON.stringify({key:'guy-fieri',status:'Inactive palette proposal; root owns native palette write and ownership checks',roles:{1:'outline/glasses',2:'skin shadow',3:'skin midtone',4:'skin light',5:'blond highlight',6:'shirt flame red',7:'shirt flame amber',8:'charcoal cloth',9:'white highlight',10:'gray cloth/goatee',11:'blond shadow',12:'metal highlight'},palettes:Array.from({length:6},()=>guyPalette),notes:['All six initial palettes preserve the same recognizable hair, skin, shirt and glasses. Lesson-specific differences are the native pose/tier sizes and generated aura silhouettes, not accidental hair recoloring.']},null,2)+'\n');
fs.mkdirSync(path.join(dir,'base-preview'),{recursive:true});
const spec={key:'guy-fieri-base',directory:'assets/imagegen/guy-fieri/base-preview',sourceType:'image-generation',palette:guyPalette,sheets:[{file:base.file,regions:base.components.map(c=>c.bounds),componentAlpha:128,nativeHeight:31,scaleCells:[0,1,2,3],sample:{method:'area',bottom:31},overrides:{15:{scaleX:.96}}}],sequences:{native:{1:Array.from({length:16},(_,i)=>i)}}};
fs.writeFileSync(path.join(dir,'base-preview/import-spec.draft.json'),JSON.stringify(spec,null,2)+'\n');
const sheet=(m,nativeHeight,scaleCells,sample={},overrides={})=>({file:m.file,regions:m.components.map(c=>c.bounds),componentAlpha:128,nativeHeight,scaleCells,sample:{method:'area',bottom:31,...sample},overrides});
const bodySheets=[sheet(base,31,[0,1,2,3],{}, {15:{scaleX:.96}}),sheet(actions,31,[0,2,8,11]),sheet(motion,31,[0,1,2,3]),sheet(contact,31,[0])];
// Bound the complete source horizontally when its arm/utensil span is wider
// than32px. Height and all source pixels are preserved; no limb is drawn/cut.
for(let s=0;s<bodySheets.length;s++){const desc=bodySheets[s],m=[base,actions,motion,contact][s],hs=desc.scaleCells.map(i=>m.components[i].bounds[3]).sort((a,b)=>a-b),scale=desc.nativeHeight/hs[Math.floor(hs.length/2)];m.components.forEach((c,i)=>{const w=Math.round(c.bounds[2]*scale),h=Math.round(c.bounds[3]*scale);if(w>32)desc.overrides[i]={...desc.overrides[i],scaleX:32/w*.995};if(h>32)desc.overrides[i]={...desc.overrides[i],scale:32/h*.995};});}
const seq={idle:{0:[1],1:[0],2:[2],3:[3]},walk:{0:[1,6,{frame:6,flip:true}],1:[0,4,32],2:[2,8,44],3:[3,{frame:8,flip:true},{frame:44,flip:true}]},hit:{1:[12]},guard:{0:[24],1:[13],2:[25],3:[26]},windup:{0:[16],1:[18],2:[20],3:[22]},attack:{0:[17],1:[19],2:[21],3:[43]},cast:{0:[16],1:[18,31],2:[41],3:[40]},'unarmed-cast':{1:[27,28]},sit:{1:[14]},down:{1:[15]},point:{1:[29]},raise:{1:[30,31]},jump:{0:[{frame:36,flip:true}],1:[37]},tuck:{0:[38]},impact:{1:[39]}};
for(const p of ['cast','point','raise','jump','windup','attack'])seq['spoon-'+p]=structuredClone(seq[p]);
const body={key:'guy-fieri',directory:'assets/imagegen/guy-fieri/body',sourceType:'image-generation',palette:guyPalette,sheets:bodySheets,sequences:seq,notes:['Inactive complete source mapping. spoon-* role aliases mean the same generated metal spatula, preserving native tier0 gestures without a duplicate utensil bank.','The rear opposite step and both right-profile contacts are whole-source mirrors. The side second pose changes arm crossing but is not claimed to have a clearly opposing sole contact.']};
fs.mkdirSync(path.join(dir,'body'),{recursive:true});fs.writeFileSync(path.join(dir,'body/import-spec.draft.json'),JSON.stringify(body,null,2)+'\n');
const effectGroups=sourceComponents('source-effects-v1.png',8),effectRegions=[[0,0,633,580],[633,0,633,580],[0,580,633,662],[633,580,633,662]];
const unions=effectRegions.map(([x,y,w,h])=>{const c=effectGroups.components.filter(c=>c.centre[0]>=x&&c.centre[0]<x+w&&c.centre[1]>=y&&c.centre[1]<y+h),x0=Math.min(...c.map(c=>c.bounds[0])),y0=Math.min(...c.map(c=>c.bounds[1])),x1=Math.max(...c.map(c=>c.bounds[0]+c.bounds[2])),y1=Math.max(...c.map(c=>c.bounds[1]+c.bounds[3]));return{bounds:[x0,y0,x1-x0,y1-y0],components:c.map(c=>c.id),opaquePixels:c.reduce((n,c)=>n+c.area,0)};});
fs.writeFileSync(path.join(dir,'effect-regions.json'),JSON.stringify({regions:effectRegions,unions,selection:'Union of every alpha>=128 connected component with at least8pixels whose centre lies in its explicit source quadrant.'},null,2)+'\n');
for(const[key,width,cells]of[['guy-fieri-mantle',32,[0,1]],['guy-fieri-halo',48,[2,3]]]){
 const h=62,regions=cells.map(i=>effectRegions[i]),bounds=cells.map(i=>unions[i].bounds),overrides={};const href=bounds.map(b=>b[3]).sort((a,b)=>a-b)[1],scale=h/href;
 bounds.forEach((b,i)=>{const w=Math.round(b[2]*scale),ph=Math.round(b[3]*scale);overrides[i]={scaleX:Math.min(1,(width-2)/w)};if(ph>63)overrides[i].scale=63/ph*.995;});
 const e={key,directory:'assets/imagegen/guy-fieri/'+key,sourceType:'image-generation',width,height:64,palette:guyPalette,sheets:[{file:effects.file,regions,componentAlpha:128,componentSelection:'union',nativeHeight:h,scaleCells:[0,1],sample:{method:'area',bottom:63},overrides}],sequences:{aura:{1:[0,1]}}};fs.mkdirSync(path.join(dir,key),{recursive:true});fs.writeFileSync(path.join(dir,key,'import-spec.draft.json'),JSON.stringify(e,null,2)+'\n');
}
const native=JSON.parse(fs.readFileSync(path.join(root,'assets/imagegen/doris/native-roles.draft.json')));native.key='guy-fieri';native.sourcePolicy='Every visible Guy body/effect pixel is sampled from recorded generated PNGs; whole-source mirrors, palette quantization, documented full-source span fits and transparent composition only.';native.aliases={'spoon-*':'Metal grilling spatula source poses. Native semantics and IDs remain the verified Doris/Spekkio contract.'};fs.writeFileSync(path.join(dir,'native-roles.draft.json'),JSON.stringify(native,null,2)+'\n');
console.log(JSON.stringify({base:base.components.length,actions:actions.components.length,sourceEdgeWarnings:actions.components.filter(c=>c.touchesEdge)}));
