import {readFile,writeFile,mkdir,readdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {PNG} from 'pngjs';

// Build-time raster importer. Every opaque native pixel is sampled from a
// recorded source PNG. This does not draw anatomy, clothes or facial marks.
// Sources and extraction decisions stay in the catalogue for reproducibility.
const root=resolve(import.meta.dirname,'..');
const args=process.argv.slice(2),previewSpec=args[0]==='--preview-spec'?args[1]:null;
if(args.length&&(!previewSpec||args.length!==2))throw Error('Usage: import-raster-art.mjs [--preview-spec path]');
const catalogue=previewSpec?{actors:[JSON.parse(await readFile(resolve(root,previewSpec),'utf8'))]}:JSON.parse(await readFile(resolve(root,'assets/imagegen/catalog.json'),'utf8'));
for(const parent of previewSpec?[]:['assets/imagegen','assets/raster']){
  let directories;try{directories=await readdir(resolve(root,parent),{withFileTypes:true});}catch(error){if(error.code==='ENOENT')continue;throw error;}
  for(const directory of directories.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0))if(directory.isDirectory()){
    try{catalogue.actors.push(JSON.parse(await readFile(resolve(root,parent,directory.name,'import-spec.json'),'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
  }
}
if(new Set(catalogue.actors.map(a=>a.key)).size!==catalogue.actors.length)throw Error('Duplicate raster actor key');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const rgb=hex=>[0,1,2].map(i=>{const v=parseInt(hex.slice(i*2,i*2+2),16)>>3;return(v<<3)|(v>>2);});
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const lab=([r,g,b])=>{r=linear(r);g=linear(g);b=linear(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];};
function components(image,threshold=32){
  const {width:w,height:h,data}=image,seen=new Uint8Array(w*h),out=[];
  for(let start=0;start<w*h;start++)if(!seen[start]&&data[start*4+3]>=threshold){
    const todo=[start];seen[start]=1;let x0=w,y0=h,x1=0,y1=0,sx=0,sy=0;
    for(let i=0;i<todo.length;i++){
      const p=todo[i],x=p%w,y=Math.floor(p/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);sx+=x;sy+=y;
      for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const xx=x+dx,yy=y+dy,q=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!seen[q]&&data[q*4+3]>=threshold){seen[q]=1;todo.push(q);}}
    }
    if(todo.length>=8)out.push({bounds:[x0,y0,x1-x0+1,y1-y0+1],centre:[sx/todo.length,sy/todo.length],area:todo.length,pixels:todo});
  }
  return out;
}
function sample(image,component,scale,palette,{width=32,height=32,bottom=height-2,dx=0,scaleX=1,alphaThreshold=96,coverageThreshold=.28,method='area'}={}){
  if(!Number.isFinite(scaleX)||scaleX<=0)throw Error('Raster horizontal scale must be positive');
  const [x0,y0,w,h]=component.bounds,sw=Math.max(1,Math.round(w*scale*scaleX)),sh=Math.max(1,Math.round(h*scale));
  if(sw>width||sh>height)throw Error(`Raster pose exceeds native cell after scaling (${sw}×${sh} in ${width}×${height})`);
  const ox=Math.floor((width-sw)/2)+dx,oy=bottom-sh+1;
  if(ox<0||ox+sw>width||oy<0||oy+sh>height)throw Error('Raster pose anchor clips native frame');
  const mask=new Set(component.pixels),colors=palette.map(rgb),labs=colors.map(lab),cache=new Map(),pixels=new Uint8Array(width*height);
  const nearest=(r,g,b)=>{const key=r<<16|g<<8|b;if(cache.has(key))return cache.get(key);const c=lab([r,g,b]);let best=0,distance=Infinity;labs.forEach((p,i)=>{const d=(c[0]-p[0])**2+(c[1]-p[1])**2+(c[2]-p[2])**2;if(d<distance){distance=d;best=i;}});cache.set(key,best);return best;};
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const ax=x0+x*w/sw,bx=x0+(x+1)*w/sw,ay=y0+y*h/sh,by=y0+(y+1)*h/sh,votes=new Float64Array(12);let opacity=0;
    if(method==='nearest'){
      const xx=Math.min(image.width-1,Math.floor((ax+bx)/2)),yy=Math.min(image.height-1,Math.floor((ay+by)/2)),p=yy*image.width+xx;
      if(mask.has(p)&&image.data[p*4+3]>=alphaThreshold)pixels[(oy+y)*width+ox+x]=nearest(...image.data.subarray(p*4,p*4+3))+1;
      continue;
    }
    if(method!=='area')throw Error('Unknown raster sampling method '+method);
    for(let yy=Math.floor(ay);yy<Math.ceil(by);yy++)for(let xx=Math.floor(ax);xx<Math.ceil(bx);xx++){
      const p=yy*image.width+xx,a=image.data[p*4+3];if(!mask.has(p)||a<alphaThreshold)continue;
      const area=(Math.min(bx,xx+1)-Math.max(ax,xx))*(Math.min(by,yy+1)-Math.max(ay,yy)),weight=area*a/255;
      opacity+=weight;votes[nearest(...image.data.subarray(p*4,p*4+3))]+=weight;
    }
    if(opacity/((bx-ax)*(by-ay))>=coverageThreshold){let best=0;for(let i=1;i<12;i++)if(votes[i]>votes[best])best=i;pixels[(oy+y)*width+ox+x]=best+1;}
  }
  if(!pixels.some(Boolean))throw Error('Imported raster frame is blank');
  return pixels;
}
// Newer image models return an opaque sheet on a flat key color. Flood-fill
// from the sheet's edges through pixels close to the key (and the key-hued
// fringe a resampler blends into the outline), so a figure's own colors are
// never cleared even when they resemble the key. Returns the cleared count.
function maskBackground(image,{key,tolerance=96,fringe=2}){
  const {width:w,height:h,data}=image,k=[0,2,4].map(i=>parseInt(key.slice(i,i+2),16));
  const near=p=>Math.hypot(data[p*4]-k[0],data[p*4+1]-k[1],data[p*4+2]-k[2])<=tolerance;
  // Key-hued: the channels the key saturates clearly exceed the one it lacks.
  const hi=[0,1,2].filter(c=>k[c]>=128),lo=[0,1,2].filter(c=>k[c]<128);
  const hued=p=>Math.min(...hi.map(c=>data[p*4+c]))-Math.max(...lo.map(c=>data[p*4+c]))>=48;
  const clear=new Uint8Array(w*h),todo=[];
  for(let x=0;x<w;x++)for(const y of[0,h-1])if(near(y*w+x)){clear[y*w+x]=1;todo.push(y*w+x);}
  for(let y=0;y<h;y++)for(const x of[0,w-1])if(near(y*w+x)&&!clear[y*w+x]){clear[y*w+x]=1;todo.push(y*w+x);}
  for(let i=0;i<todo.length;i++){const p=todo[i],x=p%w,y=(p-x)/w;
    for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,q=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!clear[q]&&near(q)){clear[q]=1;todo.push(q);}}}
  for(let pass=0;pass<fringe;pass++){const edge=[];
    for(let p=0;p<w*h;p++)if(!clear[p]&&hued(p)){const x=p%w,y=(p-x)/w;if([[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy])=>{const xx=x+dx,yy=y+dy;return xx>=0&&xx<w&&yy>=0&&yy<h&&clear[yy*w+xx];}))edge.push(p);}
    for(const p of edge)clear[p]=1;}
  let n=0;for(let p=0;p<w*h;p++)if(clear[p]){data[p*4+3]=0;n++;}
  return n;
}
const actors={},audit=[];
for(const actor of catalogue.actors){
  if(actor.palette.length!==12)throw Error(actor.key+' needs twelve colors');
  const samplingPalette=actor.samplingPalette??actor.palette;
  if(samplingPalette.length!==12||samplingPalette.some(c=>!/^([0-9a-f]{6})$/i.test(c)))throw Error(actor.key+' has an invalid sampling palette');
  const width=actor.width??32,height=actor.height??32;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width%8||height%8)throw Error(actor.key+' needs whole native tile dimensions');
  const frames=[],sources=[];
  for(const sheet of actor.sheets){
    const bytes=await readFile(resolve(root,sheet.file)),image=PNG.sync.read(bytes),keys=(sheet.chromaKey??[]).map(c=>parseInt(c,16));
    if(keys.length)for(let p=0;p<image.data.length;p+=4)if(keys.includes(image.data[p]<<16|image.data[p+1]<<8|image.data[p+2]))image.data[p+3]=0;
    const masked=sheet.backgroundMask?maskBackground(image,sheet.backgroundMask):null;
    const groups=components(image,sheet.componentAlpha??32),cells=[];
    const regions=sheet.regions??Array.from({length:sheet.columns*sheet.rows},(_,cell)=>[(cell%sheet.columns)*image.width/sheet.columns,Math.floor(cell/sheet.columns)*image.height/sheet.rows,image.width/sheet.columns,image.height/sheet.rows]);
    for(const [cell,[x,y,w,h]]of regions.entries()){
      const matches=groups.filter(c=>c.centre[0]>=x&&c.centre[0]<x+w&&c.centre[1]>=y&&c.centre[1]<y+h).sort((a,b)=>b.area-a.area);
      if(!matches[0])throw Error(`${sheet.file}: no connected figure in cell${cell}`);
      if(sheet.componentSelection==='union'){
        const x0=Math.min(...matches.map(c=>c.bounds[0])),y0=Math.min(...matches.map(c=>c.bounds[1])),x1=Math.max(...matches.map(c=>c.bounds[0]+c.bounds[2])),y1=Math.max(...matches.map(c=>c.bounds[1]+c.bounds[3]));
        cells.push({bounds:[x0,y0,x1-x0,y1-y0],area:matches.reduce((n,c)=>n+c.area,0),pixels:matches.flatMap(c=>c.pixels)});
      }else cells.push(matches[0]);
    }
    const heights=(sheet.scaleCells??[0,1,2,3]).map(i=>cells[i].bounds[3]).sort((a,b)=>a-b),referenceHeight=heights[Math.floor(heights.length/2)];
    const scale=(sheet.nativeHeight??28)/referenceHeight;
    for(const cell of sheet.cells??Array.from({length:cells.length},(_,i)=>i)){
      const options={...sheet.sample,...sheet.overrides?.[cell]};
      try{frames.push(sample(image,cells[cell],scale*(options.scale??1),samplingPalette,{...options,width,height}));}
      catch(error){throw Error(`${actor.key}: ${sheet.file} cell${cell}: ${error.message}`);}
    }
    sources.push({file:sheet.file,sha256:hash(bytes),sourceType:actor.sourceType??'image-generation',dimensions:[image.width,image.height],scale,chromaKey:sheet.chromaKey??[],...(masked?{backgroundMask:{...sheet.backgroundMask,maskedPixels:masked}}:{}),regions:sheet.regions,sample:sheet.sample??{},overrides:sheet.overrides??{},frames:cells.map((c,cell)=>({cell,bounds:c.bounds,componentPixels:c.area}))});
  }
  // Some native poses combine a sampled body with an unchanged source-ROM
  // shadow. Compose only recorded indices and integer translations at import
  // time; the cartridge still contains ordinary tiles and assembly records.
  const originalRasterComponents=[];
  if(actor.nativeComposition){
    const {map:mapFile,overlay:overlayFile}=actor.nativeComposition;
    const map=JSON.parse(await readFile(resolve(root,mapFile))),overlayBytes=await readFile(resolve(root,overlayFile)),overlay=JSON.parse(overlayBytes);
    const composed=map.map((entry,frame)=>{
      const source=typeof entry.source==='number'?{frame:entry.source}:entry.source,body=frames[source.frame],pixels=new Uint8Array(width*height);
      if(entry.frame!==frame||!body)throw Error(actor.key+' invalid native composition source');
      const [sx,sy]=entry.sourceBounds,[bx,by]=entry.bodyBounds,[tx,ty]=entry.translation,dx=bx+tx-sx,dy=by+ty-sy;
      if(![dx,dy,tx,ty].every(Number.isInteger))throw Error(actor.key+' noninteger composition offset');
      const place=(x,y,k)=>{if(!Number.isInteger(k)||k<0||k>12)throw Error(actor.key+' invalid composition color');if(!k)return;if(x<0||x>=width||y<0||y>=height)throw Error(actor.key+' native composition clips source pixels');const p=y*width+x;if(pixels[p])throw Error(actor.key+' native composition overlaps source pixels');pixels[p]=k;};
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)place((source.flip?width-1-x:x)+dx,y+dy,body[y*width+x]);
      const shadow=overlay.frames.find(s=>s.frame===frame);
      if(!!shadow!==!!entry.shadowBounds)throw Error(actor.key+' native shadow selection changed');
      if(shadow){
        if(shadow.pixels.length!==overlay.width*overlay.height||JSON.stringify(shadow.bounds)!==JSON.stringify(entry.shadowBounds))throw Error(actor.key+' native shadow dimensions changed');
        for(let y=0;y<overlay.height;y++)for(let x=0;x<overlay.width;x++)place(shadow.bounds[0]+tx+x,shadow.bounds[1]+ty+y,shadow.pixels[y*overlay.width+x]);
      }
      return pixels;
    });
    frames.splice(0,frames.length,...composed);
    originalRasterComponents.push({file:overlayFile,sha256:hash(overlayBytes),sourceType:'original-ROM-raster'});
  }
  // Breathing frames derived from one sampled pose: the rows above a waist
  // line move by one pixel (the waist row repeats or drops), so the legs and
  // feet stay exactly fixed. Only recorded integer row translations are used.
  for(const shift of actor.rowShifts??[]){
    const {frame,from,above,dy}=shift,source=frames[from];
    if(!source||!Number.isInteger(frame)||!Number.isInteger(above)||above<2||above>=height||![-1,1].includes(dy))throw Error(actor.key+' invalid row shift');
    const out=source.slice();
    if(dy<0)for(let y=0;y<above-1;y++)out.set(source.subarray((y+1)*width,(y+2)*width),y*width);
    else for(let y=above-1;y>0;y--)out.set(source.subarray((y-1)*width,y*width),y*width);
    if(dy>0)out.fill(0,0,width);
    frames[frame]=out;
  }
  // Native slots defined as mirrors of a sampled pose (a spin that reverses
  // through the same silhouettes, or a flip) copy it with a recorded axis.
  for(const flip of actor.flips??[]){
    const {frame,from,axis}=flip,source=frames[from];
    if(!source||!Number.isInteger(frame)||!['x','y'].includes(axis))throw Error(actor.key+' invalid flip');
    const out=new Uint8Array(width*height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)out[y*width+x]=axis==='x'?source[y*width+width-1-x]:source[(height-1-y)*width+x];
    frames[frame]=out;
  }
  for(const [pose,directions]of Object.entries(actor.sequences))for(const[facing,sequence]of Object.entries(directions)){
    if(!Array.isArray(sequence)||!sequence.length)throw Error(`${actor.key} ${pose}/${facing}: empty raster sequence`);
    for(const n of sequence){
      const index=typeof n==='number'?n:n.frame;
      if(!Number.isInteger(index)||!frames[index])throw Error(`${actor.key} ${pose}/${facing}: missing raster frame${index}`);
      if(n.dissolve!==undefined&&(!Number.isInteger(n.dissolve)||n.dissolve<0||n.dissolve>11))throw Error(`${actor.key} ${pose}/${facing}: invalid dissolve threshold`);
    }
    if(actor.semanticRoles){
      const role=actor.semanticRoles[pose]?.[facing];
      if(!role||!['source','adapted','fallback'].includes(role.kind)||typeof role.reason!=='string'||!role.reason.trim())throw Error(`${actor.key} ${pose}/${facing}: missing semantic role explanation`);
    }
  }
  const semanticMetadata={...(actor.semanticRoles?{semanticRoles:actor.semanticRoles}:{}),...(originalRasterComponents.length?{originalRasterComponents}:{}),...(actor.rowShifts?{rowShifts:actor.rowShifts}:{}),...(actor.flips?{flips:actor.flips}:{})};
  actors[actor.key]={width,height,sourceType:actor.sourceType??'image-generation',palette:actor.palette,sequences:actor.sequences,frames:frames.map(p=>Array.from(p,v=>v.toString(16)).join('')),provenance:sources.map(s=>({file:s.file,sha256:s.sha256,sourceType:s.sourceType})),...semanticMetadata};
  const atlas=new PNG({width:Math.min(8,frames.length)*width,height:Math.ceil(frames.length/8)*height});
  frames.forEach((frame,i)=>frame.forEach((value,p)=>{if(value)atlas.data.set([...rgb(actor.palette[value-1]),255],(((Math.floor(i/8)*height+Math.floor(p/width))*atlas.width)+(i%8)*width+p%width)*4);}));
  const directory=resolve(root,actor.directory??`assets/imagegen/${actor.key}`),prefix=previewSpec?'preview-':'';await mkdir(directory,{recursive:true});await writeFile(resolve(directory,prefix+'native-indexed.png'),PNG.sync.write(atlas));
  const report={key:actor.key,frames:frames.length,width,height,opaqueColors:12,palette:actor.palette,samplingPalette,sources,sequences:actor.sequences,...semanticMetadata};await writeFile(resolve(directory,prefix+'import.json'),JSON.stringify(report,null,2)+'\n');audit.push(report);
  if(previewSpec)await writeFile(resolve(directory,'preview-raster.json'),JSON.stringify(actors[actor.key])+'\n');
}
if(!previewSpec){
const {composeRootlingArt}=await import('./import-rootling-art.mjs');
await composeRootlingArt(actors,audit,catalogue.actors,root);
const {composeGodmotherGiantArt}=await import('./import-godmother-giant-art.mjs');
await composeGodmotherGiantArt(actors,audit,catalogue.actors,root);
const {composeFrogGuardArt}=await import('./import-frog-guard-art.mjs');
await composeFrogGuardArt(actors,audit,catalogue.actors,root);
const {composeFortressJugglerArt}=await import('./import-fortress-juggler-art.mjs');
await composeFortressJugglerArt(actors,audit,catalogue.actors,root);
const {composeSwampImpArt}=await import('./import-swamp-imp-art.mjs');
await composeSwampImpArt(actors,root);
const output=resolve(root,'engine/generated-raster-art.js');await mkdir(dirname(output),{recursive:true});
const temporary=output+'.'+process.pid+'.tmp';
await writeFile(temporary,'// Generated by scripts/import-raster-art.mjs from the recorded source PNGs.\n// Do not draw or edit pixels here; update a source atlas and re-import.\nexport const generatedRasterArt = '+JSON.stringify(actors)+';\n');await rename(temporary,output);
await import('./import-cosmic-muffin-art.mjs');
}
console.log(JSON.stringify(audit.map(a=>({key:a.key,frames:a.frames,sources:a.sources.length})),null,2));
