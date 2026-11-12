import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {compileWoodlandBats,batPalettes} from './compile-native.js';
import {u16} from '../../../engine/rom.js';

const dir='assets/imagegen/woodland-bats';
const json=async path=>JSON.parse(await readFile(path));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=await json(dir+'/freeze.json');
for(const record of [...freeze.minimalReproductionFiles,...freeze.reviewAndProofFiles]){
  const bytes=await readFile(record.file);
  assert.equal(bytes.length,record.bytes,record.file);
  assert.equal(sha(bytes),record.sha256,record.file);
}
const art=await json(dir+'/native-raster.json');
const geometry=await json(dir+'/native-frame-map.draft.json');
const compiled=compileWoodlandBats(art,geometry);
for(const [key,file] of [['graphics','graphics.4bpp'],['compressed','graphics.ct-lz'],['assembly','assembly.bin']]){
  assert.deepEqual(compiled[key],new Uint8Array(await readFile(dir+'/'+file)),file);
}
const audit=await json(dir+'/native-audit.json');
for(const palette of batPalettes){
  const bytes=await readFile(dir+'/palette-'+palette.id+'.bin');
  assert.equal(bytes.length,24);
  assert.deepEqual(Array.from({length:12},(_,i)=>u16(bytes,i*2)),palette.words);
  assert.equal(sha(bytes),audit.palettes.find(p=>p.id===palette.id).sha256);
}
if(process.argv.includes('--sources')){
  execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
  assert.deepEqual(await json(dir+'/preview-raster.json'),art,'Ordinary importer reproduces all eight native source slots');
  const provenance=await json(dir+'/provenance.json');
  for(const source of provenance.sources){
    assert.equal(sha(await readFile(source.file)),source.sha256);
    assert.equal(sha(await readFile(source.prompt)),source.promptSha256);
    // The frozen local PNG is sufficient for reproduction. If the original tool
    // cache remains available, also prove that the retained source is unmodified.
    let original;
    try{original=await readFile(source.generatedPath);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(original)assert.equal(sha(original),source.sha256,'Unmodified imagegen output');
  }
}
if(process.argv.includes('--proof')){
  const proof=await json(dir+'/native-proof-manifest.json');
  for(const record of proof.privateArtifacts){
    const bytes=await readFile(record.file);
    assert.equal(bytes.length,record.bytes,record.file);
    assert.equal(sha(bytes),record.sha256,record.file);
  }
  for(const file of ['native-display-proof.json','native-timing-proof.json','native-scene-proof.json','native-flight-proof.json']){
    const proof=await json(dir+'/'+file);
    assert.equal(proof.status,'passed');
    assert.equal(proof.baselineSha256,freeze.baseline.sha256);
    assert.equal(proof.candidateSha256,freeze.nativeCandidate.sha256);
  }
}
console.log(JSON.stringify({status:'passed',minimalFiles:freeze.minimalReproductionFiles.length,reviewProofFiles:freeze.reviewAndProofFiles.length,sourceReproduction:process.argv.includes('--sources'),privateProof:process.argv.includes('--proof'),graphicsBytes:compiled.graphics.length,compressedBytes:compiled.compressed.length,assemblyBytes:compiled.assembly.length,unchangedPaletteBytes:48}));
