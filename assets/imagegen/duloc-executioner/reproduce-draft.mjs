import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),freeze=JSON.parse(fs.readFileSync(path.join(d,'freeze.json')));
for(const f of freeze.files)assert.equal(sha(fs.readFileSync(path.join(root,f.path))),f.sha256,'Frozen file '+f.path);
const p='assets/imagegen/duloc-executioner/';
for(const[script,args]of[[p+'create-spec.mjs',[]],['scripts/import-raster-art.mjs',['--preview-spec',p+'import-spec.draft.json']],[p+'derive-fragment.mjs',[]],['scripts/import-raster-art.mjs',['--preview-spec',p+'import-spec.draft.json']],[p+'prepare-native.mjs',[]],['scripts/import-raster-art.mjs',['--preview-spec',p+'import-spec.draft.json']],[p+'build-review.mjs',[]]])execFileSync(process.execPath,[script,...args],{cwd:root,stdio:'inherit'});
for(const f of freeze.files)assert.equal(sha(fs.readFileSync(path.join(root,f.path))),f.sha256,'Exact source reproduction '+f.path);
console.log(JSON.stringify({status:'All selected frozen files reproduce byte for byte',files:freeze.files.length,activeWrites:false}));
