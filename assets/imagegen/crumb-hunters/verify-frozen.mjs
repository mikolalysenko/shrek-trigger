import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compileHunterDraft} from './compile-draft.mjs';

const root=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex'),freeze=JSON.parse(await readFile(new URL('freeze.json',root)));
const manifest=await readFile(new URL(freeze.manifest,root));
assert.equal(hash(manifest),freeze.manifestSha256,'Exact reproducibility whitelist');
assert.equal(manifest.toString().trim().split('\n').length,freeze.manifestFiles);
for(const f of freeze.requiredArtifacts){const b=await readFile(new URL(f.path,root));assert.equal(b.length,f.bytes,f.path+' size');assert.equal(hash(b),f.sha256,f.path+' hash');}
const c=await compileHunterDraft();
assert.equal(hash(c.graphics),freeze.compiled.graphicsSha256);
assert.equal(hash(c.compressed),freeze.compiled.compressedSha256);
assert.equal(hash(c.assembly),freeze.compiled.assemblySha256);
for(const p of c.palettes)assert.equal(hash(p.bytes),freeze.compiled.paletteSha256[p.palette]);
assert.equal(c.frames.length,21);
assert.deepEqual(c.cellOrigins,[[0,0],[16,0],[0,16],[16,16]]);
assert.deepEqual(c.family.groups[0].frameOffsets,{12:[0,3]});
assert.equal(c.graphics.length,5536);
assert.equal(c.compressed.length,3197);
assert.equal(c.assembly.length,840);
const n=JSON.parse(await readFile(new URL('native-verification/manifest.json',root))),m=JSON.parse(await readFile(new URL('motion-verification/manifest.json',root)));
assert.equal(n.nativeFrameUploads,63);assert.equal(n.npc76Loads,1);assert.equal(n.opaquePixelChecks,23175);assert.ok(n.cartridgeUnchanged);assert.equal(n.paletteChecks.length,3);
let ticks=0;
for(const s of m.scenarios)for(const r of s.rawTicks){let t=r.tick%s.list.reduce((n,e)=>n+e.ticks,0),frame;for(const e of s.list){frame=e.frame;if(t<e.ticks)break;t-=e.ticks;}assert.equal(r.frame,frame,s.key+' native timing');ticks++;}
assert.equal(ticks,1950);assert.equal(m.scenarios.length,13);assert.equal(m.actualMotionOwner.id,76);assert.equal(n.privateRomSha256,m.privateRomSha256);assert.ok(m.cartridgeUnchanged);
console.log(JSON.stringify({frozenArtifacts:freeze.requiredArtifacts.length,manifestFiles:freeze.manifestFiles,raw:c.graphics.length,compressed:c.compressed.length,assembly:c.assembly.length,nativeUploads:n.nativeFrameUploads,nativePixels:n.opaquePixelChecks,nativeTimedTicks:ticks,status:'Frozen source, geometry, packed output and private evidence verified'}));
