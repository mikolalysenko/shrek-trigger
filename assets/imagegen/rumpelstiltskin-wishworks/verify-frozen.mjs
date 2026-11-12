import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PNG} from 'pngjs';
import {compileDraft,dir,hash} from './compile-draft.mjs';

const freeze=JSON.parse(await readFile(dir+'/freeze.json')),list=await readFile(dir+'/reproducibility-files.txt'),names=list.toString().trim().split('\n');
assert.equal(hash(list),freeze.whitelistSha256);assert.equal(names.length,freeze.whitelistFiles);
assert.deepEqual(names.filter(p=>!['freeze.json','reproducibility-files.txt'].includes(p)).sort(),freeze.files.map(f=>f.path).sort());
async function checkFiles(){for(const f of freeze.files){const b=await readFile(dir+'/'+f.path);assert.equal(b.length,f.bytes,f.path+' bytes');assert.equal(hash(b),f.sha256,f.path+' hash');}}
await checkFiles();
execFileSync(process.execPath,[dir+'/prepare-draft.mjs']);
for(const key of['rumpelstiltskin','wishworks-golems'])execFileSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',dir+'/'+key+'-import-spec.draft.json']);
await checkFiles();
const c=await compileDraft();
for(const b of c.compiled){assert.equal(hash(b.graphics),freeze.banks.find(f=>f.gfx===b.family.gfx).graphicsSha256);assert.deepEqual(new Uint8Array(await readFile(dir+'/compiled/gfx'+b.family.gfx+'.4bpp')),b.graphics);assert.deepEqual(new Uint8Array(await readFile(dir+'/compiled/gfx'+b.family.gfx+'.ct-lz')),b.compressed);for(const g of b.groups)assert.deepEqual(new Uint8Array(await readFile(dir+'/compiled/asm'+g.asm+'.bin')),g.assembly);}
for(const p of c.palettes)assert.deepEqual(new Uint8Array(await readFile(dir+'/compiled/palette'+p.id+'.bin')),p.bytes);
const provenance=JSON.parse(await readFile(dir+'/provenance.json'));assert.equal(provenance.generations.length,5);
for(const s of provenance.generations){assert.equal(hash(await readFile(s.file)),s.sha256);assert.equal(hash(await readFile(s.prompt)),s.promptSha256);if(s.reference)assert.equal(hash(await readFile(s.reference)),s.referenceSha256);}
const crop=JSON.parse(await readFile(dir+'/references/rumpel-left-contact-A.json')),raw=await readFile(crop.source),source=PNG.sync.read(raw),derived=PNG.sync.read(await readFile(dir+'/references/rumpel-left-contact-A.png')),[x,y,w,h]=crop.crop,border=crop.transparentBorder;
assert.equal(hash(raw),crop.sourceSha256);assert.equal(derived.width,w+2*border);assert.equal(derived.height,h+2*border);
for(let yy=0;yy<derived.height;yy++)for(let xx=0;xx<derived.width;xx++){const i=(yy*derived.width+xx)*4;if(xx<border||yy<border||xx>=w+border||yy>=h+border)assert.equal(derived.data[i+3],0);else assert.deepEqual(derived.data.subarray(i,i+4),source.data.subarray(((y+yy-border)*source.width+x+xx-border)*4,((y+yy-border)*source.width+x+xx-border)*4+4));}
const native=JSON.parse(await readFile(dir+'/native-verification/manifest.json')),motion=JSON.parse(await readFile(dir+'/motion-verification/manifest.json')),scenes=JSON.parse(await readFile(dir+'/scene-verification/manifest.json')),history=JSON.parse(await readFile(dir+'/proof-history.json'));
assert.equal(native.privateRomSha256,freeze.privateRomSha256);assert.equal(native.nativeFrameUploads,72);assert.equal(native.opaquePixelChecks,35738);assert.equal(native.proofs.length,72);assert.equal(native.proofs.reduce((n,p)=>n+p.opaquePixelChecks,0),35738);
assert.equal(motion.privateRomSha256,freeze.privateRomSha256);assert.equal(motion.nativeTimedTicks,16320);assert.equal(motion.listExecutions,68);assert.equal(motion.scenarios.reduce((n,s)=>n+s.observedTicks,0),16320);
assert.equal(scenes.privateRomSha256,freeze.privateRomSha256);assert.equal(scenes.nativeTicks,31995);assert.equal(scenes.scenarios.length,4);
for(const s of scenes.scenarios){const p=JSON.parse(await readFile(dir+'/scene-verification/'+s.report));assert.equal(p.status,'Passed');assert.equal(p.privateRomSha256,freeze.privateRomSha256);assert.equal(p.nativeTicks,s.nativeTicks);assert.ok(p.heapMax<=32768);assert.ok(p.survivingParty.some(p=>p.hp>0));assert.ok(p.cartridgeUnchanged);if(p.checkpoint.finalStory)assert.equal(p.returnStory,p.checkpoint.finalStory);else assert.equal(p.returnD2,p.name==='blackbird-wing'?1:8);}
assert.equal(history.final.privateRomSha256,freeze.privateRomSha256);assert.notEqual(history.superseded.privateRomSha256,freeze.privateRomSha256);
console.log(JSON.stringify({status:'Frozen inactive source packet reproduced',files:freeze.files.length,selectedSourcePngs:5,uniqueNativeSlots:36,allOwnerSlots:72,originalSignedXYBytes:416,banks:c.compiled.map(b=>({gfx:b.family.gfx,rawBytes:b.graphics.length,sha256:hash(b.graphics)})),recordedNativeUploads:72,recordedExactPpuPixels:35738,recordedNativeTimedTicks:16320,recordedAuthoredEncounterTicks:31995,activation:false}));
