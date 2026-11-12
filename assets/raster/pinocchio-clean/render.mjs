// Cel-shaded native render of Pinocchio's archived Shrek SuperSlam mesh.
//
// The earlier fixed-grid pass point-sampled the textured model straight into
// 32x32 pixels, which left noisy, outline-free sprites. This pass keeps the
// same mesh, authored poses, projections and native roles
// (../pinocchio-model), but draws each pose the way Chrono Trigger sprites are
// drawn: every texel is classified into a flat material color, each native
// pixel takes the majority material of an 8x8 supersampled block, lighting
// picks one of two or three tones, thin limbs and the nose are thickened, and
// a 1-pixel outline is drawn around the figure (black beside dark colors, the
// dark accent beside lit ones) plus black contours where one part overlaps
// another. Palette entries 1 and 12 hold only that outline and line work, the
// two entries the battle engine recolors for statuses.
//
// node assets/raster/pinocchio-clean/render.mjs   (writes content/pinocchio-clean-art.js and review/)
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {loadModel,rotate,V} from '../pinocchio-model/render-model.mjs';
import {poseModel} from '../pinocchio-model/pose-model.mjs';

const require=createRequire(import.meta.url);
const {PNG}=require('pngjs');
const here=new URL('./',import.meta.url),repo=new URL('../../../',import.meta.url);
const read=path=>readFileSync(new URL(path,repo));

// 1 outline, 2 white, 3-5 wood, 6-7 gold, 8 cloth shade, 9-10 blue, 11 red, 12 accent outline.
export const PALETTE=['291820','f8f8f0','f0b474','c8804a','8c4c2c','f8d048','c08c28','b8c0d0','3c90bc','244a78','c8383a','412039'];
const OUT=1,ACC=12;
const CLASSES={
  wood:{base:[205,140,90],tones:[3,4,5]},
  hair:{base:[75,45,28],tones:[5,5,5]},
  gold:{base:[235,185,40],tones:[6,6,7]},
  white:{base:[235,238,240],tones:[2,2,8]},
  navy:{base:[35,45,80],tones:[10,10,10]},
  blue:{base:[40,120,160],tones:[9,9,10]},
  red:{base:[170,30,30],tones:[11,11,11]},
  black:{base:[10,10,15],tones:[1,1,1]},
  iris:{base:[40,140,230],tones:[10,10,10]},
  leaf:{base:[70,120,40],tones:[7,7,7]},
  grey:{base:[150,155,160],tones:[8,8,8]},
};
// Materials each texture may produce, so a shadowed texel never changes material.
const ALLOWED={
  'hair.png':['hair'],'mouth.png':['wood','hair'],'head.png':['wood','hair','black','red'],'nose.png':['wood'],
  'body.png':['white','navy','blue','gold','grey','red','wood'],'pelvis.png':['blue','wood','gold','navy'],
  'shoes.png':['red','white','grey'],'arms.png':['wood','white','blue'],'forearm.png':['wood'],
  'legs.png':['blue','wood'],'eyes.png':['white','iris','black'],'hat.png':['gold','blue','wood','white','iris','black'],'leaf.png':['leaf'],
};
// Upper arms, forearms, hands, legs, shoes and the nose, thickened in raster space.
const THIN=new Set(['Mesh_0281.rip','Mesh_0284.rip','Mesh_0287.rip','Mesh_0288.rip','Mesh_0290.rip','Mesh_0293.rip','Mesh_0299.rip']);
const LIGHT=V.norm([-.45,.75,.55]); // screen upper-left, toward the viewer
// The leaf sprouting from the nose has no green in a twelve-color party
// palette and reads as a stray blob over the eye at native size; it is left out.
const HIDDEN=new Set(['Mesh_0301.rip']);

const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
const lab=([r,g,b])=>{const R=lin(r),G=lin(g),B=lin(b),f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;const X=f((R*.4124+G*.3576+B*.1805)/.95047),Y=f(R*.2126+G*.7152+B*.0722),Z=f((R*.0193+G*.1192+B*.9505)/1.08883);return[116*Y-16,500*(X-Y),200*(Y-Z)];};
const rgb=hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
const names=Object.keys(CLASSES),id=Object.fromEntries(names.map((k,i)=>[k,i])),classLab=names.map(k=>lab(CLASSES[k].base));
const lit=PALETTE.map(h=>lab(rgb(h))[0]>55);

function classifier(model){
  const cache=new Map();
  return (mat,texel)=>{const key=mat.file+':'+texel;let c=cache.get(key);if(c!==undefined)return c;
    const d=mat.image.data,L=lab([d[texel],d[texel+1],d[texel+2]]);let best=-1,bd=Infinity;
    for(const k of ALLOWED[mat.file]??names){const q=classLab[id[k]],e=(L[0]-q[0])**2+(L[1]-q[1])**2+(L[2]-q[2])**2;if(e<bd){bd=e;best=id[k];}}
    cache.set(key,best);return best;};
}

// Renders one pose to width x height palette indices.
export function renderCel(model,classify,{width,height,F=8,yaw,elevation,scale,aspect=1,center,offset=[0,0],options,thicken=3,coverage=.3,contour=.08}){
  const W=width*F,H=height*F,yawRad=yaw*Math.PI/180,elevRad=elevation*Math.PI/180;
  const pose=poseModel(model,options),posed=model.positions.map((p,i)=>pose(p,i));
  const camera=p=>rotate(rotate(V.sub(p,center),'y',yawRad),'x',elevRad);
  const project=q=>[W/2+q[0]*scale*F*aspect+offset[0]*F,H/2-q[1]*scale*F+offset[1]*F,q[2]];
  const depth=new Float64Array(W*H).fill(-Infinity),cls=new Int8Array(W*H).fill(-1),shade=new Float32Array(W*H),part=new Int16Array(W*H).fill(-1);
  for(const face of model.faces){
    if(HIDDEN.has(face.object))continue;
    const cam=face.indices.map(([v])=>camera(posed[v])),p=cam.map(project),uv=face.indices.map(([,t])=>model.uvs[t]),mat=model.materials[face.material],tex=mat.image;
    let n=V.norm(V.cross(V.sub(cam[1],cam[0]),V.sub(cam[2],cam[0])));if(n[2]<0)n=V.mul(n,-1);
    const lambert=Math.max(0,V.dot(n,LIGHT)),area=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);if(Math.abs(area)<1e-9)continue;
    const loX=Math.max(0,Math.floor(Math.min(p[0][0],p[1][0],p[2][0]))),hiX=Math.min(W-1,Math.ceil(Math.max(p[0][0],p[1][0],p[2][0])));
    const loY=Math.max(0,Math.floor(Math.min(p[0][1],p[1][1],p[2][1]))),hiY=Math.min(H-1,Math.ceil(Math.max(p[0][1],p[1][1],p[2][1])));
    const pi=model.objects.indexOf(face.object);
    for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){
      const xx=x+.5,yy=y+.5,w1=((xx-p[0][0])*(p[2][1]-p[0][1])-(yy-p[0][1])*(p[2][0]-p[0][0]))/area,w2=((p[1][0]-p[0][0])*(yy-p[0][1])-(p[1][1]-p[0][1])*(xx-p[0][0]))/area,w0=1-w1-w2;
      if(w0<-1e-6||w1<-1e-6||w2<-1e-6)continue;
      const z=w0*p[0][2]+w1*p[1][2]+w2*p[2][2],o=y*W+x;if(z<depth[o])continue;
      const u=w0*uv[0][0]+w1*uv[1][0]+w2*uv[2][0],v=w0*uv[0][1]+w1*uv[1][1]+w2*uv[2][1];
      const tx=Math.min(tex.width-1,Math.max(0,Math.floor((u-Math.floor(u))*tex.width))),ty=Math.min(tex.height-1,Math.max(0,Math.floor((1-(v-Math.floor(v)))*tex.height)));
      const at=(ty*tex.width+tx)*4;if(tex.data[at+3]<128)continue;
      depth[o]=z;cls[o]=classify(mat,at);shade[o]=lambert;part[o]=pi;
    }
  }
  if(thicken){
    const d0=depth.slice(),c0=cls.slice(),s0=shade.slice(),p0=part.slice(),r2=thicken*thicken;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=y*W+x;if(p0[o]<0||!THIN.has(model.objects[p0[o]]))continue;
      for(let dy=-thicken;dy<=thicken;dy++)for(let dx=-thicken;dx<=thicken;dx++){if(dx*dx+dy*dy>r2)continue;const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const q=Y*W+X;
        if(depth[q]<d0[o]){depth[q]=d0[o];cls[q]=c0[o];shade[q]=s0[o];part[q]=p0[o];}}}
  }
  const px=new Uint8Array(width*height),zs=new Float64Array(width*height),parts=new Int16Array(width*height).fill(-1);
  for(let Y=0;Y<height;Y++)for(let X=0;X<width;X++){
    const count=new Array(names.length).fill(0),sum=new Array(names.length).fill(0),partCount=new Map();let covered=0,zsum=0;
    for(let y=0;y<F;y++)for(let x=0;x<F;x++){const o=(Y*F+y)*W+X*F+x;if(cls[o]<0)continue;covered++;count[cls[o]]++;sum[cls[o]]+=shade[o];zsum+=depth[o];partCount.set(part[o],(partCount.get(part[o])??0)+1);}
    if(covered<coverage*F*F)continue;
    let best=0;for(let k=1;k<names.length;k++)if(count[k]>count[best])best=k;
    if(count[id.black]>=F*F*.18)best=id.black; // pupils and brows survive downsampling
    const s=sum[best]/count[best],tones=CLASSES[names[best]].tones;
    px[Y*width+X]=tones[s>.5?0:s>.25?1:2];zs[Y*width+X]=zsum/covered;
    let top=-1,tc=-1;for(const [k,c]of partCount)if(c>tc||(c===tc&&k<top)){top=k;tc=c;}parts[Y*width+X]=top;
  }
  const out=px.slice(),N=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;
    if(!px[i]){let dark=false,any=false;for(const [dx,dy]of N){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=width||Y>=height)continue;const v=px[Y*width+X];if(!v)continue;any=true;if(!lit[v-1])dark=true;}
      if(any)out[i]=dark?OUT:ACC;continue;}
    if(x===0||y===0||x===width-1||y===height-1){out[i]=lit[px[i]-1]?ACC:OUT;continue;}
    for(const [dx,dy]of N){const j=(y+dy)*width+x+dx;if(px[j]&&parts[j]!==parts[i]&&zs[j]-zs[i]>contour){out[i]=OUT;break;}}
  }
  // Outline that fills an enclosed gap (between the legs, under an arm) is
  // black: the accent stays on the silhouette.
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;if(out[i]===ACC&&N.every(([dx,dy])=>out[(y+dy)*width+x+dx]))out[i]=OUT;}
  return out;
}

const hexFrame=px=>Array.from(px,v=>v.toString(16)).join('');
const sha=buf=>createHash('sha256').update(buf).digest('hex');

export async function renderPinocchioClean(){
  const model=await loadModel(),classify=classifier(model);
  const manifest=JSON.parse(read('assets/raster/pinocchio-model/draft-fixed-grid/render-manifest.json'));
  const spec=JSON.parse(read('assets/raster/pinocchio-model/import-spec.json'));
  const frames=manifest.frames.map(f=>renderCel(model,classify,{width:32,height:32,yaw:f.yaw,options:f.options,...f.projection}));
  // Portrait: the earlier portrait camera (render-portrait.mjs), refit so the
  // head and shoulders span 46 rows ending on row 47, as the importer placed it.
  const camera={yaw:-12,elevation:3,center:[0,1.37,0],options:{headYaw:0,headPitch:0,headScale:1}};
  const probe=renderCel(model,classify,{width:48,height:48,F:4,scale:550/8,thicken:0,...camera});
  let top=48;for(let y=0;y<48;y++)if(probe.slice(y*48,y*48+48).some(Boolean)){top=y;break;}
  const scale=550/8*46/(48-top),fit=renderCel(model,classify,{width:48,height:48,F:4,scale,thicken:0,...camera});
  let ftop=48,bottom=-1,left=48,right=-1;for(let y=0;y<48;y++)for(let x=0;x<48;x++)if(fit[y*48+x]){ftop=Math.min(ftop,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
  const portrait=renderCel(model,classify,{width:48,height:48,scale,thicken:0,offset:[Math.round(23.5-(left+right)/2),47-bottom],...camera});
  const sources=['pinocchio.obj','pinocchio.mtl',...Object.values(model.materials).map(m=>m.file).filter((v,i,a)=>a.indexOf(v)===i).sort()]
    .map(f=>({file:'assets/raster/pinocchio-model/source/pinocchio/'+f,sha256:sha(read('assets/raster/pinocchio-model/source/pinocchio/'+f)),sourceType:'existing-game-model'}));
  const provenance=[...sources,{file:'assets/raster/pinocchio-model/draft-fixed-grid/render-manifest.json',sha256:sha(read('assets/raster/pinocchio-model/draft-fixed-grid/render-manifest.json')),sourceType:'authored-pose-manifest'}];
  const reason=(pose,facing)=>`Cel-shaded render of the actual Shrek SuperSlam mesh in the locally authored ${pose} pose${facing==='3'?'; complete left render mirrored for right-facing native use':''}. The archive contains no animation clips.`;
  const semanticRoles=Object.fromEntries(Object.entries(spec.semanticRoles).map(([pose,dirs])=>[pose,Object.fromEntries(Object.entries(dirs).map(([facing,role])=>[facing,{...role,reason:reason(pose,facing)}]))]));
  const art={
    pinocchio:{width:32,height:32,sourceType:'existing-game-model-cel-render',palette:PALETTE,sequences:spec.sequences,frames:frames.map(hexFrame),provenance,semanticRoles},
    'pinocchio-portrait':{width:48,height:48,sourceType:'existing-game-model-cel-render',palette:PALETTE,sequences:{idle:{1:[0]}},frames:[hexFrame(portrait)],provenance:sources},
  };
  const text=`// Generated by assets/raster/pinocchio-clean/render.mjs from the archived model,
// its authored poses and native roles; do not edit by hand. Cel-shaded
// Pinocchio sprites (190 frames) and portrait in the party outline convention.
export const pinocchioCleanArt = ${JSON.stringify(art)};
`;
  return {text,art,frames,portrait,manifest};
}

// Review sheets: all frames, the earlier and new selected poses, the portrait.
function sheet(images,{width,height,columns,scale,palette=PALETTE,background=[200,200,200]}){
  const rows=Math.ceil(images.length/columns),png=new PNG({width:columns*(width+2)*scale,height:rows*(height+2)*scale});
  for(let i=0;i<png.data.length;i+=4)png.data.set([...background,255],i);
  images.forEach((px,n)=>{if(!px)return;const pal=Array.isArray(px.palette)?px.palette:palette,pixels=px.pixels??px,ox=(n%columns)*(width+2)+1,oy=Math.floor(n/columns)*(height+2)+1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const v=pixels[y*width+x];if(!v)continue;const c=rgb(pal[v-1]);
      for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)png.data.set([...c,255],(((oy+y)*scale+yy)*png.width+(ox+x)*scale+xx)*4);}});
  return PNG.sync.write(png);
}

if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
  const {text,frames,portrait,manifest}=await renderPinocchioClean();
  writeFileSync(new URL('content/pinocchio-clean-art.js',repo),text);
  mkdirSync(new URL('review/',here),{recursive:true});
  writeFileSync(new URL('review/native-all-frames-2x.png',here),sheet(frames,{width:32,height:32,columns:16,scale:2}));
  const order=JSON.parse(read('assets/raster/pinocchio-model/draft/semantic-review-order.json'));
  const picks=order.map(o=>manifest.frames.findIndex(f=>f.pose===o.pose&&f.facing===o.facing&&f.phase===o.phase));
  const {generatedRasterArt}=await import('../../../engine/generated-raster-art.js');
  const old=generatedRasterArt.pinocchio,before=picks.map(i=>({pixels:Uint8Array.from(old.frames[i],c=>parseInt(c,16)),palette:old.palette}));
  writeFileSync(new URL('review/before-after-4x.png',here),sheet([...before,...picks.map(i=>frames[i])],{width:32,height:32,columns:picks.length,scale:4}));
  const oldPortrait=generatedRasterArt['pinocchio-portrait'];
  writeFileSync(new URL('review/portrait-before-after-6x.png',here),sheet([{pixels:Uint8Array.from(oldPortrait.frames[0],c=>parseInt(c,16)),palette:oldPortrait.palette},portrait],{width:48,height:48,columns:2,scale:6}));
  const {workshopPuppet}=await import('../../../content/workshop-puppets.js');
  writeFileSync(new URL('review/workshop-puppet-4x.png',here),sheet(picks.slice(0,12).map(i=>({pixels:frames[i],palette:workshopPuppet.colors})),{width:32,height:32,columns:12,scale:4}));
  console.log(JSON.stringify({frames:frames.length,manifestFrames:manifest.frames.length,bytes:text.length}));
}
