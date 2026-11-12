import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const d=import.meta.dirname,root=path.resolve(d,'../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const freeze=JSON.parse(fs.readFileSync(path.join(d,'freeze.json')));
function verify(){for(const r of[...freeze.files,...freeze.sourceDependencies]){const bytes=fs.readFileSync(path.join(root,r.path));assert.equal(bytes.length,r.bytes,r.path+' byte count');assert.equal(sha(bytes),r.sha256,r.path+' SHA256');}}
verify();
for(const args of[
  ['scripts/import-raster-art.mjs','--preview-spec','assets/raster/tyson-reveal/import-approved-source.draft.json'],
  ['scripts/import-raster-art.mjs','--preview-spec','assets/raster/tyson-reveal/import-spec.draft.json'],
  ['assets/raster/tyson-reveal/prepare-draft.mjs'],
  ['assets/raster/tyson-reveal/export-review.mjs'],
])execFileSync(process.execPath,args,{cwd:root,stdio:'pipe'});
verify();
const map=JSON.parse(fs.readFileSync(path.join(d,'draft-frame-map.json'))),raster=JSON.parse(fs.readFileSync(path.join(d,'imported/preview-raster.json')));
for(const[f,s]of raster.frames.entries())assert.equal(sha(Uint8Array.from(s,c=>parseInt(c,16))),map[f].canvasPixelSha256);
console.log(JSON.stringify({status:'Frozen Tyson reveal source/art/review reproduced byte-for-byte',files:freeze.files.length,nativeFrames:raster.frames.length,sourceDependencies:freeze.sourceDependencies.length,canonicalOrActiveWrites:0}));
