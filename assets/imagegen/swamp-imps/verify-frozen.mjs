import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileSwampImpCells} from './compile-native-cells.js';
import {compress,decompress} from '../../../engine/compression.js';
const dir='assets/imagegen/swamp-imps',hash=b=>createHash('sha256').update(b).digest('hex'),read=async f=>JSON.parse(await readFile(dir+'/'+f)),freeze=await read('freeze.json');
if(process.argv.includes('--sources'))execFileSync(process.execPath,[dir+'/prepare-draft.mjs'],{stdio:'pipe'});
const check=async record=>{const b=await readFile(record.file);assert.equal(b.length,record.bytes,record.file+' length');assert.equal(hash(b),record.sha256,record.file+' SHA256');};
for(const record of[...freeze.minimalFiles,...freeze.reviewAndProofFiles])await check(record);
const compiled=compileSwampImpCells(await read('native-cell-raster.json')),graphics=await readFile(dir+'/graphics.4bpp'),packed=await readFile(dir+'/graphics.ct-lz');
assert.deepEqual(Buffer.from(compiled.graphics),graphics);assert.deepEqual(Buffer.from(compress(compiled.graphics)),packed);assert.deepEqual(Buffer.from(decompress(packed,0).bytes),graphics);
for(const g of compiled.groups)assert.deepEqual(Buffer.from(g.assembly),await readFile(dir+'/'+g.key+'/assembly.bin'));
const resources=await read('native-resource-audit.json');
for(const palette of resources.palettes){const bytes=await readFile(dir+'/palette-'+palette.id+'.bin');assert.equal(bytes.length,24);assert.equal(hash(bytes),palette.current.sha256);palette.current.words.forEach((word,i)=>assert.equal(bytes.readUInt16LE(i*2),word));}
// Pure cell compilation is independent of active actor registries. Full PNG
// regeneration additionally checks the exact importer/compiler dependencies.
for(const record of freeze.dependencies.filter(r=>process.argv.includes('--sources')||r.file==='engine/compression.js'))await check(record);
let proofFiles=0;
if(process.argv.includes('--proof')){const proof=await read('native-proof-manifest.json');for(const record of proof.files){await check(record);proofFiles++;}}
console.log(JSON.stringify({passed:true,minimalFiles:freeze.minimalFiles.length,reviewAndProofFiles:freeze.reviewAndProofFiles.length,privateProofFiles:proofFiles,pngSourcesRecompiled:process.argv.includes('--sources'),graphicsBytes:graphics.length,compressedBytes:packed.length,assemblyBytes:compiled.groups.reduce((n,g)=>n+g.assembly.length,0),graphicsSha256:hash(graphics),candidateSha256:freeze.candidateSha256}));
