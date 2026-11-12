import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {compileFortressJugglers,jugglerPalette} from './compile-native.js';
import {composeJugglerArt} from './compose-native.js';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {u16} from '../../../engine/rom.js';
const dir='assets/imagegen/fortress-jugglers',json=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),freeze=await json(dir+'/freeze.json');
for(const r of [...freeze.minimalReproductionFiles,...freeze.reviewAndProofFiles]){const b=await readFile(r.file);assert.equal(b.length,r.bytes,r.file);assert.equal(sha(b),r.sha256,r.file);}
const art=await json(dir+'/native-raster.json'),geometry=await json(dir+'/native-frame-map.draft.json'),compiled=compileFortressJugglers(art,geometry);
for(const[key,file]of[['graphics','graphics.4bpp'],['compressed','graphics.ct-lz'],['assembly','assembly.bin']])assert.deepEqual(compiled[key],new Uint8Array(await readFile(dir+'/'+file)),file);
const audit=await json(dir+'/native-audit.json'),pal=await readFile(dir+'/palette-40.bin');assert.equal(pal.length,24);assert.deepEqual(Array.from({length:12},(_,i)=>u16(pal,i*2)),jugglerPalette.words);assert.equal(sha(pal),audit.palettes[0].sha256);
const effects=await json(dir+'/original-effects.draft.json');assert.equal(sha(Buffer.from(JSON.stringify(effects.frames))),effects.pixelRecordSha256);assert.equal(effects.frames.reduce((n,f)=>n+f.points.length,0),363);
if(process.argv.includes('--sources')){
 execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/import-spec.draft.json'],{stdio:'pipe'});
 const source=await json(dir+'/preview-raster.json'),map=await json(dir+'/native-composition.json');assert.deepEqual(composeJugglerArt(source,map,effects),art,'Ordinary source importer plus explicit source-effect composition reproduces all nine slots');
 const provenance=await json(dir+'/provenance.json');for(const source of provenance.sources){assert.equal(sha(await readFile(source.file)),source.sha256);assert.equal(sha(await readFile(source.prompt)),source.promptSha256);let original;try{original=await readFile(source.generatedPath);}catch(e){if(e.code!=='ENOENT')throw e;}if(original)assert.equal(sha(original),source.sha256,'Unmodified imagegen output');}
 const original=new Uint8Array(await readFile(audit.original.path));assert.equal(sha(original),audit.original.sha256);const bank=nativeSpriteBank(original,{gfx:91,asm:48,palette:40,size:0,frames:9});
 for(const effect of effects.frames){const points=new Map();for(const c of nativeSpriteCells(bank,effect.frame))for(let i=0;i<256;i++)if(c.pixels[i]){const key=(c.x+i%16)+','+(c.y+(i>>4));if(!points.has(key))points.set(key,c.pixels[i]);}for(const[x,y,k]of effect.points)assert.equal(points.get(x+','+y),k,'Every retained effect pixel is original');}
}
if(process.argv.includes('--proof')){
 const proof=await json(dir+'/native-proof-manifest.json');for(const r of proof.privateArtifacts){const b=await readFile(r.file);assert.equal(b.length,r.bytes,r.file);assert.equal(sha(b),r.sha256,r.file);}
 for(const file of ['native-display-proof.json','native-timing-proof.json','native-scene-proof.json']){const p=await json(dir+'/'+file);assert.equal(p.status,'passed');assert.equal(p.baselineSha256,freeze.baseline.sha256);assert.equal(p.candidateSha256,freeze.nativeCandidate.sha256);}
}
console.log(JSON.stringify({status:'passed',minimalFiles:freeze.minimalReproductionFiles.length,reviewProofFiles:freeze.reviewAndProofFiles.length,sourceReproduction:process.argv.includes('--sources'),privateProof:process.argv.includes('--proof'),graphicsBytes:compiled.graphics.length,compressedBytes:compiled.compressed.length,assemblyBytes:compiled.assembly.length,unchangedPaletteBytes:24,exactOriginalEffectPixels:363}));
