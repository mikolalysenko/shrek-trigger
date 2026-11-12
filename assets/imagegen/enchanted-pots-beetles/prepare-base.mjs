import{readFile,writeFile,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{PNG}from'pngjs';
const dir='assets/imagegen/enchanted-pots-beetles',families=JSON.parse(await readFile(dir+'/source-families.json')),hash=b=>createHash('sha256').update(b).digest('hex');
const palette=families[0].actors.find(a=>a.palette===111).colors,ember=families[0].actors.find(a=>a.palette===107).colors;
const sources=[['plain-pot','cracked-pot',24,3,2,6],['spore-pot','spore-pot',26,3,2,6],['ember-pot','ember-pot',27,3,2,6],['beetle-base','beetle',24,3,3,9]],manifest=[];
for(const[name,key,h,columns,rows,count]of sources){
 await mkdir(dir+'/'+key+'-base',{recursive:true});
 const file=dir+'/'+name+'-source-v1.png',spec={key:key+'-draft',sourceType:'image-generation',width:64,height:96,palette:key==='ember-pot'?ember:palette,directory:dir+'/'+key+'-base',sheets:[{file,columns,rows,nativeHeight:h,scaleCells:[0,1,2],componentSelection:'union',componentAlpha:128,sample:{method:'area',bottom:74,alphaThreshold:128,coverageThreshold:.28}}],sequences:{native:{1:Array.from({length:count},(_,i)=>i)}},notes:{status:'Inactive base model preview; all source roles not yet mapped',originalNativeCells:4}};
 await writeFile(dir+'/'+key+'-base-import-spec.preview.json',JSON.stringify(spec,null,2)+'\n');execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/'+key+'-base-import-spec.preview.json']);
 const a=JSON.parse(await readFile(dir+'/'+key+'-base/preview-raster.json')),rgb=a.palette.map(c=>[0,2,4].map(i=>{const v=parseInt(c.slice(i,i+2),16)>>3;return v<<3|v>>2;}));
 for(const scale of[1,6]){const im=new PNG({width:count*48*scale,height:48*scale});a.frames.forEach((s,f)=>{for(let y=32;y<80;y++)for(let x=8;x<56;x++){const v=parseInt(s[y*64+x],16);if(v)for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)im.data.set([...rgb[v-1],255],(((y-32)*scale+dy)*im.width+(f*48+x-8)*scale+dx)*4);}});await writeFile(dir+'/review/'+key+'-base-'+scale+'x.png',PNG.sync.write(im));}
 const p=PNG.sync.read(await readFile(file)),prompt=dir+'/'+name+'-source-v1-prompt.txt';manifest.push({file,sha256:hash(await readFile(file)),dimensions:[p.width,p.height],prompt, promptSha256:hash(await readFile(prompt)),tool:'image_gen.imagegen',transparentBackground:true,reference:name==='spore-pot'||name==='ember-pot'?dir+'/plain-pot-source-v1.png':null,sourceType:'Actual generated raster; no procedural anatomy or retouching',nativeSampling:'Deterministic area/alpha sampling through the shared importer',status:'Source saved; native review pending'});
}
await writeFile(dir+'/source-provenance.json',JSON.stringify({status:'Inactive actual image-generated sources',sources:manifest},null,2)+'\n');
console.log(JSON.stringify(manifest.map(s=>({file:s.file,sha256:s.sha256}))));
