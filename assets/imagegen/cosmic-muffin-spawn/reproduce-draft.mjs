import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {sha} from './compile-draft.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),freeze=JSON.parse(fs.readFileSync(path.join(d,'freeze.json')));
for(const a of freeze.files)assert.equal(sha(fs.readFileSync(path.join(root,a.file))),a.sha256,'Frozen source/proof '+a.file);
for(const args of [['scripts/import-raster-art.mjs','--preview-spec','assets/imagegen/cosmic-muffin-spawn/shell-area-import-spec.draft.json'],['scripts/import-raster-art.mjs','--preview-spec','assets/imagegen/cosmic-muffin-spawn/head-area-import-spec.draft.json'],['assets/imagegen/cosmic-muffin-spawn/compile-draft.mjs'],['assets/imagegen/cosmic-muffin-spawn/prepare-handoff.mjs']]){
 const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(r.status)throw Error(r.stderr||r.stdout);}
for(const a of freeze.files)assert.equal(sha(fs.readFileSync(path.join(root,a.file))),a.sha256,'Reproduced source/proof '+a.file);
console.log(JSON.stringify({status:'passed',sourceAndProofFiles:freeze.files.length,registryOrCanonicalWrites:false,selectedRasterAndNativeBytes:'All frozen artifacts match byte for byte after source import and compilation.'}));
