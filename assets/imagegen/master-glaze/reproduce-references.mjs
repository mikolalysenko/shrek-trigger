import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const d=import.meta.dirname,a=JSON.parse(fs.readFileSync(path.join(d,'reference-derivations.json'))),sha=b=>createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync(path.join(d,a.source));assert.equal(sha(bytes),a.sourceSha256);
const src=PNG.sync.read(bytes);
for(const r of a.references){
 const[x,y,w,h]=r.bounds,pad=r.padding,q=new PNG({width:w+pad*2,height:h+pad*2});for(let i=0;i<q.data.length;i+=4)q.data.set([...a.background,255],i);
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const p=((y+yy)*src.width+x+xx)*4,o=((yy+pad)*q.width+xx+pad)*4,alpha=src.data[p+3]/255;for(let k=0;k<3;k++)q.data[o+k]=Math.round(src.data[p+k]*alpha+a.background[k]*(1-alpha));}
 const output=PNG.sync.write(q);assert.equal(sha(output),r.sha256,r.file+' exact reference reproduction');
 if(!process.argv.includes('--check'))fs.writeFileSync(path.join(d,r.file),output);
}
console.log(JSON.stringify({referenceComposites:3,exactPngHashes:true,sourcePixelsUnchanged:true}));
