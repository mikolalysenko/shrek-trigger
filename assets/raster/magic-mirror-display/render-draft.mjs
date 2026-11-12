// Source-based console overlays: actual Magic Mirror mesh/UVs, cropped to the
// original screen viewport. Boot/static phases only hide these sampled pixels.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {loadModel,render} from '../magic-mirror-model/render-model.mjs';
const root=new URL('./',import.meta.url),model=await loadModel(),palette=JSON.parse(await readFile(new URL('../magic-mirror-model/import-spec.draft.json',root))).palette;
const headVertices=new Set(),headNormals=new Set();for(const f of model.faces)if(['Head','Eyes'].includes(f.object))for(const[v,,n]of f.ids){headVertices.add(v);headNormals.add(n);}
const yaw=(p,a)=>[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
function posed(degrees){const angle=degrees*Math.PI/180,pivot=[0,.02,.06];return{...model,positions:model.positions.map((p,i)=>headVertices.has(i)?yaw(p.map((v,a)=>v-pivot[a]),angle).map((v,a)=>v+pivot[a]):p),normals:model.normals.map((n,i)=>headNormals.has(i)?yaw(n,angle):n)};}
const active=[-8,0,8].map(degrees=>render(posed(degrees),{width:384,height:192,scale:300,center:[0,.02,0]}));
const cells=7,width=512,height=320,atlas=new PNG({width:width*cells,height}),recipes=[
 {frame:0,role:'power-on spark',source:1,mask:'Only central 5×3 native pixels remain visible.'},
 {frame:1,role:'power-on horizontal sweep',source:1,mask:'Only native row 8 remains visible.'},
 {frame:2,role:'static A',source:1,mask:'Only even rows inside the central 16-pixel screen region remain visible.'},
 {frame:3,role:'static B',source:1,mask:'Horizontal reflection of static A using the same real projected source pixels; native tile flips can share the scan pattern.'},
 {frame:4,role:'active projection A',source:0,headYawDegrees:-8},
 {frame:5,role:'active projection B',source:1,headYawDegrees:0},
 {frame:6,role:'active projection C',source:2,headYawDegrees:8}
 ],overrides={};
for(const f of recipes){const image=active[f.source],cx=f.frame*width+64,cy=64;let minX=384,minY=192,maxX=-1,maxY=-1;for(let y=0;y<192;y++)for(let x=0;x<384;x++){
 const nx=x/12|0,ny=y/12|0,visible=f.frame===0?nx>=14&&nx<19&&ny>=6&&ny<9:f.frame===1?ny===8:f.frame<4?nx>=8&&nx<24&&ny%2===0:true,p=(y*384+(f.frame===3?383-x:x))*4;if(!visible||image.data[p+3]<128)continue;
 image.data.copy(atlas.data,((cy+y)*atlas.width+cx+x)*4,p,p+4);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
 }const sw=Math.round((maxX-minX+1)/12),sh=Math.round((maxY-minY+1)/12),nativeX=Math.round(minX/12),nativeY=Math.round(minY/12);overrides[f.frame]={dx:nativeX-Math.floor((32-sw)/2),bottom:nativeY+sh-1};f.sourceBounds=[minX,minY,maxX-minX+1,maxY-minY+1];}
await writeFile(new URL('source-frames.png',root),PNG.sync.write(atlas));await mkdir(new URL('draft/',root),{recursive:true});
const spec={key:'magic-mirror-display',sourceType:'existing-game-model-render',width:32,height:16,palette,directory:'assets/raster/magic-mirror-display/draft',sheets:[{file:'assets/raster/magic-mirror-display/source-frames.png',columns:7,rows:1,nativeHeight:16,scaleCells:[5],componentSelection:'union',componentAlpha:128,sample:{method:'nearest'},overrides}],sequences:{native:{1:[0,1,2,3,4,5,6]}},semanticRoles:{native:{1:{kind:'adapted',reason:'Actual archived Magic Mirror mesh and textures, cropped into the existing 32×16 display viewport. Authored small head turns supply active phases; visibility masks supply original boot/static roles. Native frame 7 is explicitly blank.'}}},notes:{source:'../magic-mirror-model/provenance.json',hardware:'Original four native cells and eight assembly frames; only the original two upper screen cells carry opaque pixels. Original cell coordinates preserved in compilation.',nativeBlankFrame:7,animation:'NPC 127 program 115 and enemy 183 program 143 remain unchanged.',sharedScenes:[218,228,229,230,234,235,241,248,256,259,268,439,476],status:'Inactive source draft; compile and native proof status are recorded separately in the draft and native-verification manifests.'}};
await writeFile(new URL('import-spec.draft.json',root),JSON.stringify(spec,null,2)+'\n');await writeFile(new URL('source-recipes.json',root),JSON.stringify({sourceModel:'assets/raster/magic-mirror-model/source/Magic Mirror/MagicMirror.obj',projection:{sourceWidth:384,sourceHeight:192,scale:300,center:[0,.02,0],nativeWidth:32,nativeHeight:16},originalGameAnimationClips:0,recipes,nativeBlankFrame:7},null,2)+'\n');
console.log(JSON.stringify({frames:7,blankFrame:7,source:'source-frames.png'}));
