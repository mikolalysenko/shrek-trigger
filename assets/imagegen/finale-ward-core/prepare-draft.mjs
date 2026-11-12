import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {u16} from '../../../engine/rom.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),dir='assets/imagegen/finale-ward-core',read=p=>JSON.parse(fs.readFileSync(path.join(d,p))),write=(p,v)=>fs.writeFileSync(path.join(d,p),JSON.stringify(v,null,2)+'\n'),sha=b=>createHash('sha256').update(b).digest('hex'),actors=read('source-actors.json');
function color(h){return[0,2,4].map(n=>{let v=parseInt(h.slice(n,n+2),16)>>3;return v<<3|v>>2;});}
function render(frames,palette,scale){const png=new PNG({width:frames.length*32*scale,height:32*scale});for(let i=0;i<png.data.length;i+=4)png.data.set([37,43,47,255],i);frames.forEach((p,f)=>p.forEach((v,i)=>{if(v)for(let y=0;y<scale;y++)for(let x=0;x<scale;x++)png.data.set([...color(palette[v-1]),255],(((i>>5)*scale+y)*png.width+(f*32+(i&31))*scale+x)*4);}));return PNG.sync.write(png);}
const results=[];
for(const actor of actors)for(const method of ['area','nearest']){
 const part=actor.key==='sugar-ward'?'ward':'core',folder=part+'-'+method,nativeHeight=part==='ward'?28:26,bottom=part==='ward'?28:29,spec={key:actor.key,sourceType:'image-generation',directory:dir+'/'+folder,width:32,height:32,palette:actor.colors,sheets:[{file:dir+'/source-'+part+'-v1.png',columns:3,rows:1,scaleCells:[0,1,2],nativeHeight,componentAlpha:128,componentSelection:'union',sample:{method,bottom,alphaThreshold:128}}],sequences:{native:{1:[0,1,2]}},notes:{status:'Inactive source candidate. Native animation189 and all mechanics unchanged.',roles:['resting hover','middle pulse','peak pulse'],originalNativeOrder:[0,1,2,1],frameTicks:10,paletteUnchanged:true,sourcePixelsOnly:true}};
 fs.mkdirSync(path.join(d,folder),{recursive:true});write(folder+'/import-spec.draft.json',spec);execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/'+folder+'/import-spec.draft.json'],{cwd:root,stdio:'pipe'});
 const a=read(folder+'/preview-raster.json'),frames=a.frames.map(h=>Uint8Array.from(h,c=>parseInt(c,16))),c=compileSpriteFrames(frames),compressed=compress(c.graphics);assert.deepEqual(decompress(compressed,0).bytes,c.graphics);assert.equal(c.assembly.length,120);assert.ok(c.graphics.length<=32768);assert.equal(new Set(frames.map(sha)).size,3,'All three source phases remain visibly distinct');
 for(let f=0;f<3;f++){const p=new Uint8Array(1024);for(let cell=0;cell<4;cell++){assert.equal(c.assembly[f*40+32+cell*2],(cell%2*16-16)&255);assert.equal(c.assembly[f*40+33+cell*2],(Math.floor(cell/2)*16-32)&255);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const word=u16(c.assembly,f*40+(y>>3)*16+cell*4+(x>>3)*2),xx=word&16384?7-(x&7):x&7,yy=word&32768?7-(y&7):y&7;let v=0;for(let b=0;b<4;b++)v|=(c.graphics[(word&1023)*32+(b>>1)*16+yy*2+(b&1)]>>(7-xx)&1)<<b;p[(Math.floor(cell/2)*16+y)*32+cell%2*16+x]=v;}}assert.deepEqual(p,frames[f],'Complete source4bpp round trip');}
 for(const [file,bytes]of [['graphics.4bpp',c.graphics],['graphics.ct-lz',compressed],['assembly.bin',c.assembly],['native-1x.png',render(frames,actor.colors,1)],['native-6x.png',render(frames,actor.colors,6)]])fs.writeFileSync(path.join(d,folder,file),bytes);
 const audit={key:actor.key,method,nativeHeight,bottom,frames:frames.map((p,f)=>{const pts=Array.from(p,(v,i)=>v?[i%32,i>>5]:null).filter(Boolean);return{frame:f,opaquePixels:pts.length,bounds:[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0]))+1,Math.max(...pts.map(p=>p[1]))+1],pixelSha256:sha(p),colors:[...new Set(p)].sort((a,b)=>a-b)};}),rawBytes:c.graphics.length,compressedBytes:compressed.length,assemblyBytes:c.assembly.length,graphicsSha256:sha(c.graphics),compressedSha256:sha(compressed),assemblySha256:sha(c.assembly),cells:4,blankFrames:[],proceduralFrames:0,extraVramBytes:0,extraFixedWramBytes:0,exactPalette:true};write(folder+'/draft-audit.json',audit);results.push(audit);
}
write('sampling-audit.json',results);console.log(JSON.stringify(results.map(a=>({key:a.key,method:a.method,raw:a.rawBytes,compressed:a.compressedBytes,frames:a.frames.map(f=>f.bounds)}))));
