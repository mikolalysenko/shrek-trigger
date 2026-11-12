import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {PNG} from 'pngjs';

// Reproduce source-pixel-only pose permutations from a recorded manifest.
// This performs no painting, interpolation, palette changes or anatomy edits.
const [manifestPath,option]=process.argv.slice(2);
if(!manifestPath||option&&!['--check'].includes(option)||process.argv.length>4)throw Error('Usage: derive-raster-poses.mjs manifest.json [--check]');
const root=resolve(import.meta.dirname,'..'),manifest=JSON.parse(await readFile(resolve(root,manifestPath))),hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await readFile(resolve(root,manifest.source));
if(hash(bytes)!==manifest.sourceSha256)throw Error('Source image hash changed');
const source=PNG.sync.read(bytes),poses=manifest.derivations,keys=new Set(manifest.chromaKey.map(c=>parseInt(c,16)));
const width=Math.max(...poses.map(p=>p.outputRegion[0]+p.outputRegion[2])),height=Math.max(...poses.map(p=>p.outputRegion[1]+p.outputRegion[3])),output=new PNG({width,height}),occupied=new Uint8Array(width*height),counts=[];
for(const pose of poses){
  const [sx,sy,w,h]=pose.sourceBounds,[rx,ry,rw,rh]=pose.outputRegion,q=pose.quarterTurns;
  if(![sx,sy,w,h,rx,ry,rw,rh,q].every(Number.isInteger)||sx<0||sy<0||w<1||h<1||sx+w>source.width||sy+h>source.height||q<0||q>3)throw Error('Invalid source crop or rotation');
  const tw=q%2?h:w,th=q%2?w:h;
  if(tw>rw||th>rh)throw Error('Derived source pose would be clipped');
  const ox=rx+Math.floor((rw-tw)/2),oy=ry+Math.floor((rh-th)/2);let opaque=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=((sy+y)*source.width+sx+x)*4,color=source.data[i]<<16|source.data[i+1]<<8|source.data[i+2];
    if(keys.has(color)||!source.data[i+3])continue;
    let xx=x,yy=y;
    if(q===1){xx=h-1-y;yy=x;}else if(q===2){xx=w-1-x;yy=h-1-y;}else if(q===3){xx=y;yy=w-1-x;}
    const p=(oy+yy)*width+ox+xx;if(occupied[p])throw Error('Derived source poses overlap');occupied[p]=1;
    output.data.set(source.data.subarray(i,i+4),p*4);opaque++;
  }
  counts.push({name:pose.name,opaqueSourcePixels:opaque});
}
const result=PNG.sync.write(output);
if(option==='--check'){
  const existing=await readFile(resolve(root,manifest.derived)),actual=PNG.sync.read(existing);
  if(actual.width!==width||actual.height!==height||!actual.data.equals(output.data))throw Error('Derived PNG is not the exact recorded source-pixel permutation');
  if(hash(existing)!==manifest.derivedSha256)throw Error('Derived image hash changed');
}else{
  if(manifest.derivedSha256&&hash(result)!==manifest.derivedSha256)throw Error('Reproduced derived PNG hash differs from recorded source');
  await writeFile(resolve(root,manifest.derived),result);
}
console.log(JSON.stringify({poses:poses.length,sourceSha256:hash(bytes),derivedSha256:hash(result),exactRgbaPermutation:true,counts},null,2));
