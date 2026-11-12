import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir=import.meta.dirname,root=path.resolve(dir,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'freeze.json')));
for(const f of manifest.files){const b=fs.readFileSync(path.join(root,f.path));assert.equal(b.length,f.bytes,f.path+' length');assert.equal(sha(b),f.sha256,f.path+' hash');}
if(process.argv.includes('--reproduce'))execFileSync(process.execPath,['assets/imagegen/town-household-gfx12/reproduce-draft.mjs'],{cwd:root,stdio:'inherit'});
if(process.argv.includes('--dependencies'))for(const f of manifest.dependencies)assert.equal(sha(fs.readFileSync(path.join(root,f.path))),f.sha256,f.path+' recorded dependency');
console.log(JSON.stringify({files:manifest.files.length,freezeSha256:sha(fs.readFileSync(path.join(dir,'freeze.json'))),activeWrites:0}));
