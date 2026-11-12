import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),freeze=JSON.parse(fs.readFileSync(path.join(d,'freeze.json')));
for(const a of freeze.files)assert.equal(sha(fs.readFileSync(path.join(root,a.path))),a.sha256,'Frozen input '+a.path);
for(const [script,args]of[['scripts/import-raster-art.mjs',['--preview-spec','assets/imagegen/native-guards/import-spec.draft.json']],['assets/imagegen/native-guards/prepare-native.mjs',[]],['assets/imagegen/native-guards/build-review.mjs',[]]])execFileSync(process.execPath,[script,...args],{cwd:root,stdio:'inherit'});
for(const a of freeze.files)assert.equal(sha(fs.readFileSync(path.join(root,a.path))),a.sha256,'Exact reproduced artifact '+a.path);
console.log(JSON.stringify({status:'All selected frozen files reproduce byte for byte',files:freeze.files.length,activeFilesChanged:false}));
