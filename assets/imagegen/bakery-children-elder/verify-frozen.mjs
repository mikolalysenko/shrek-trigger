import{readFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import assert from'node:assert/strict';
import{compileChildrenElderDrafts}from'./compile-draft.mjs';
const root=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex'),freeze=JSON.parse(await readFile(new URL('freeze.json',root))),manifest=await readFile(new URL(freeze.manifest,root));
assert.equal(hash(manifest),freeze.manifestSha256);assert.equal(manifest.toString().trim().split('\n').length,freeze.manifestFiles);
for(const f of freeze.requiredArtifacts){const b=await readFile(new URL(f.path,root));assert.equal(b.length,f.bytes,f.path+' size');assert.equal(hash(b),f.sha256,f.path+' hash');}
const candidates=await compileChildrenElderDrafts();
for(const[index,c]of candidates.entries()){
 const expected=freeze.families.find(f=>f.key===c.key).compiled;
 assert.equal(hash(c.graphics),expected.graphicsSha256);assert.equal(hash(c.compressed),expected.compressedSha256);assert.equal(hash(c.assembly),expected.assemblySha256);
 for(const p of c.palettes)assert.equal(hash(p.bytes),expected.paletteSha256[p.palette]);
 assert.equal(c.frames.length,index?19:15);assert.deepEqual(c.cellOrigins,[[0,0],[16,0],[0,16],[16,16]]);assert.ok(c.frames[index?16:14].every(v=>v===0));
 if(index){const crop=c.frames[2].slice();crop.fill(0,9*32);assert.deepEqual(c.frames[17],crop);assert.equal(crop.filter(Boolean).length,56);assert.deepEqual(c.frames[18],Uint8Array.from(crop,(_,i)=>crop[(i/32|0)*32+31-i%32]));}
}
const n=JSON.parse(await readFile(new URL('native-verification/manifest.json',root))),m=JSON.parse(await readFile(new URL('motion-verification/manifest.json',root)));
assert.equal(n.nativeFrameUploads,49);assert.equal(n.opaquePixelChecks,15755);assert.deepEqual(n.actualNpcLoads,[32,64,33]);assert.ok(n.paletteBytesUnchanged&&n.cartridgeUnchanged&&n.exactPaletteRgb&&n.originalSharedAssemblyTablesUnchanged);assert.equal(n.paletteChecks.length,3);
let ticks=0;for(const s of m.scenarios)for(const r of s.rawTicks){let t=r.tick%s.period,frame;for(const e of s.list){frame=e.frame;if(t<e.ticks)break;t-=e.ticks;}assert.equal(r.frame,frame,s.actor+'/'+s.key+' native timing');ticks++;}
assert.equal(ticks,2160);assert.equal(m.scenarios.length,12);assert.equal(n.privateRomSha256,m.privateRomSha256);assert.ok(m.cartridgeUnchanged);assert.ok(m.sourcePrograms.every(p=>p.readThrough===null));
const fragment=JSON.parse(await readFile(new URL('head-fragment-derivation.json',root)));assert.equal(fragment.opaquePixels,56);assert.deepEqual(fragment.crop,[0,0,32,9]);assert.equal(hash(await readFile(new URL(fragment.derivedPng,root))),fragment.derivedPngSha256);
console.log(JSON.stringify({status:'Frozen source, native banks, shared palettes, blanks, crop and timing evidence verified',manifestFiles:freeze.manifestFiles,hashedArtifacts:freeze.requiredArtifacts.length,candidates:candidates.map(c=>({key:c.key,raw:c.graphics.length,compressed:c.compressed.length,assembly:c.assembly.length})),nativeUploads:n.nativeFrameUploads,nativePixels:n.opaquePixelChecks,nativeTimedTicks:ticks,upperHeadPixels:56}));
