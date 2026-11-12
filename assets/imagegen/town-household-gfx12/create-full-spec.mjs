import fs from 'node:fs';
import path from 'node:path';
const dir=import.meta.dirname,prefix='assets/imagegen/town-household-gfx12',audit=JSON.parse(fs.readFileSync(path.join(dir,'native-audit.json'))),method=process.argv[2]??'area';
if(!['area','nearest'].includes(method))throw Error('Use area or nearest');
const spec={key:'duloc-household-resident',sourceType:'image-generation',directory:`${prefix}/full-${method}`,width:64,height:64,palette:audit.palettes.find(p=>p.id===135).colors,sheets:[
  {file:`${prefix}/source-base-v1.png`,columns:4,rows:4,cells:[1,2,4,5,13],nativeHeight:30,scaleCells:[0,1,2,3],componentAlpha:128,sample:{method,bottom:51,alphaThreshold:128},overrides:{4:{scale:30/31},5:{scale:30/31},13:{scale:29/30}}},
  {file:`${prefix}/source-face-v2.png`,columns:4,rows:4,cells:[0,8,9],nativeHeight:30,scaleCells:[0,1,2,3],componentAlpha:128,sample:{method,bottom:51,alphaThreshold:128}},
  {file:`${prefix}/source-left-contact-b-v3.png`,columns:1,rows:1,nativeHeight:29,scaleCells:[0],componentAlpha:128,sample:{method,bottom:51,alphaThreshold:128}},
],sequences:{native:{1:[0,5,1,{frame:1,flip:true},2,3,{frame:2,flip:true},{frame:3,flip:true},6,7,{frame:6,flip:true},{frame:7,flip:true},4,8,{frame:4,flip:true},{frame:8,flip:true},{frame:0,dissolve:11},1,{frame:1,flip:true}]}}};
fs.writeFileSync(path.join(dir,`import-spec.full-${method}.json`),JSON.stringify(spec,null,2)+'\n');
