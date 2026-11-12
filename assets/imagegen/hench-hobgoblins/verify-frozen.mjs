import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {compileHenchHobgoblins,henchPalettes} from './compile-native.js';
import {u16} from '../../../engine/rom.js';
const dir='assets/imagegen/hench-hobgoblins',json=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),freeze=await json(dir+'/freeze.json');
for(const record of [...freeze.minimalReproductionFiles,...freeze.reviewAndProofFiles]){
 const b=await readFile(record.file);assert.equal(b.length,record.bytes,record.file);assert.equal(sha(b),record.sha256,record.file);
}
const art=await json(dir+'/native-raster.json'),geometry=await json(dir+'/native-frame-map.draft.json'),compiled=compileHenchHobgoblins(art,geometry);
for(const [k,file] of [['graphics','graphics.4bpp'],['compressed','graphics.ct-lz'],['assembly','assembly.bin']])assert.deepEqual(compiled[k],new Uint8Array(await readFile(dir+'/'+file)),file);
const audit=await json(dir+'/native-audit.json');
for(const palette of henchPalettes){const b=await readFile(dir+'/palette-'+palette.id+'.bin');assert.equal(b.length,24);assert.deepEqual(Array.from({length:12},(_,i)=>u16(b,i*2)),palette.words);assert.equal(sha(b),audit.palettes.find(p=>p.id===palette.id).sha256);}
if(process.argv.includes('--sources')){
 execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
 assert.deepEqual(await json(dir+'/preview-raster.json'),art,'Ordinary importer reproduces the complete composed37-slot raster');
 const provenance=await json(dir+'/provenance.json');
 for(const source of provenance.sources){const b=await readFile(source.file);assert.equal(sha(b),source.sha256);assert.equal(sha(await readFile(source.generatedPath)),source.sha256,'Unmodified original imagegen output');assert.equal(sha(await readFile(source.prompt)),source.promptSha256);}
 for(const source of provenance.references)assert.equal(sha(await readFile(source.file)),source.sha256,'Generation reference');
}
if(process.argv.includes('--proof')){
 const proof=await json(dir+'/native-proof-manifest.json');
 for(const record of proof.privateArtifacts){const b=await readFile(record.file);assert.equal(b.length,record.bytes,record.file);assert.equal(sha(b),record.sha256,record.file);}
 for(const file of ['native-display-proof.json','native-timing-proof.json','native-scene-proof.json']){const p=await json(dir+'/'+file);assert.equal(p.status,'passed');assert.equal(p.baselineSha256,freeze.baseline.sha256);assert.equal(p.candidateSha256,freeze.nativeCandidate.sha256);}
}
console.log(JSON.stringify({status:'passed',minimalFiles:freeze.minimalReproductionFiles.length,reviewProofFiles:freeze.reviewAndProofFiles.length,sourceReproduction:process.argv.includes('--sources'),privateProof:process.argv.includes('--proof'),graphicsBytes:compiled.graphics.length,compressedBytes:compiled.compressed.length,assemblyBytes:compiled.assembly.length,unchangedPaletteBytes:48}));
