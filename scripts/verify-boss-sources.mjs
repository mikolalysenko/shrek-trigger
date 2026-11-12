import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {generatedRasterArt} from '../engine/generated-raster-art.js';

const root=path.resolve(import.meta.dirname,'..'),manifest=JSON.parse(await readFile(path.join(root,'assets/imagegen/boss-art-manifest.json')));
const output=path.join(root,'.local/qa/boss-source-reproduction');
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const item of manifest.files){
  const bytes=await readFile(path.join(root,item.path));
  assert.equal(bytes.length,item.bytes,item.path+' length');assert.equal(sha(bytes),item.sha256,item.path+' source hash');
}
const actors=[];
for(const file of manifest.specs){
  const spec=JSON.parse(await readFile(path.join(root,file)));
  spec.directory=path.join(output,spec.key);await mkdir(spec.directory,{recursive:true});
  const specFile=path.join(spec.directory,'spec.json');await writeFile(specFile,JSON.stringify(spec));
  const processResult=spawnSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',specFile],{cwd:root,encoding:'utf8'});
  assert.equal(processResult.status,0,spec.key+' import failed: '+processResult.stderr);
  const raster=JSON.parse(await readFile(path.join(spec.directory,'preview-raster.json')));
  assert.deepEqual(raster,generatedRasterArt[spec.key],spec.key+' active source samples and role sequences');
  actors.push({key:spec.key,frames:raster.frames.length,passed:true});
}
await writeFile(path.join(output,'report.json'),JSON.stringify({passed:true,files:manifest.files.length,actors,scope:'Saved generated PNGs, quantization and active raster registry only; native assembly and runtime are checked separately.'},null,2)+'\n');
console.log(JSON.stringify({passed:true,files:manifest.files.length,actors:actors.length,output}));
