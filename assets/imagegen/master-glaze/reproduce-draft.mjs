import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {compileGlazeDraft} from './compile-draft.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),freeze=JSON.parse(fs.readFileSync(path.join(d,'freeze.json'))),sha=b=>createHash('sha256').update(b).digest('hex');
for(const file of freeze.inputs)assert.equal(sha(fs.readFileSync(path.join(root,file.path))),file.sha256,'Frozen input '+file.path);
function run(file,args=[]){const r=spawnSync(process.execPath,[file,...args],{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout||'Reproduction command failed');process.stdout.write(r.stdout);}
run('assets/imagegen/master-glaze/reproduce-references.mjs',['--check']);
run('scripts/import-raster-art.mjs',['--preview-spec','assets/imagegen/master-glaze/import-spec.draft.json']);
const c=compileGlazeDraft();for(const[key,value]of Object.entries(freeze.native))assert.deepEqual(c.report[key],value,'Native frozen output '+key);
run('assets/imagegen/master-glaze/compile-draft.mjs');run('assets/imagegen/master-glaze/review-draft.mjs');
for(const file of freeze.derivedArtifacts)assert.equal(sha(fs.readFileSync(path.join(root,file.path))),file.sha256,'Derived artifact '+file.path);
console.log(JSON.stringify({frozenInputs:freeze.inputs.length,derivedArtifacts:freeze.derivedArtifacts.length,nativeFrameRoundTrips:20,sourceImages:4,sourcePoses:17,activeRegistryWritten:false,romWritten:false}));
