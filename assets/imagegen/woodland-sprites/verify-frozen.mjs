import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {compileWoodlandSprite} from './compile-native.js';
const dir='assets/imagegen/woodland-sprites',json=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),freeze=await json(dir+'/freeze.json');
for(const record of[...freeze.minimalReproductionFiles,...freeze.reviewAndProofFiles]){const b=await readFile(record.file);assert.equal(b.length,record.bytes,record.file);assert.equal(sha(b),record.sha256,record.file);}
const art=await json(dir+'/native-raster.json'),geometry=await json(dir+'/native-frame-map.draft.json'),compiled=compileWoodlandSprite(art,geometry);
for(const[k,file]of[['graphics','graphics.4bpp'],['compressed','graphics.ct-lz'],['assembly','assembly.bin'],['palette','palette-19.bin']])assert.deepEqual(compiled[k],new Uint8Array(await readFile(dir+'/'+file)),file);
if(process.argv.includes('--sources')){
 execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});const fresh=await json(dir+'/preview-raster.json');assert.deepEqual(fresh,art,'Ordinary importer reproduces composed15-slot raster');
 const provenance=await json(dir+'/provenance.json');for(const source of provenance.sourceFiles){const b=await readFile(dir+'/'+source.file);assert.equal(sha(b),source.sha256);assert.equal(sha(await readFile(source.generatedPath)),source.sha256,'Unmodified original imagegen output');}
}
if(process.argv.includes('--proof')){
 const proof=await json(dir+'/native-proof-manifest.json');for(const record of proof.privateArtifacts){const b=await readFile(record.file);assert.equal(b.length,record.bytes,record.file);assert.equal(sha(b),record.sha256,record.file);}
 for(const file of['native-display-proof.json','native-timing-proof.json','native-scene-proof.json']){const p=await json(dir+'/'+file);assert.equal(p.status,'passed');assert.equal(p.baselineSha256,freeze.baseline.sha256);assert.equal(p.candidateSha256,freeze.nativeCandidate.sha256);}
}
console.log(JSON.stringify({status:'passed',minimalFiles:freeze.minimalReproductionFiles.length,reviewProofFiles:freeze.reviewAndProofFiles.length,sourceReproduction:process.argv.includes('--sources'),privateProof:process.argv.includes('--proof'),graphicsBytes:compiled.graphics.length,compressedBytes:compiled.compressed.length,assemblyBytes:compiled.assembly.length,paletteBytes:compiled.palette.length}));
