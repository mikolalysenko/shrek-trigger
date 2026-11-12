import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const dir='assets/imagegen/frog-guards',hash=b=>createHash('sha256').update(b).digest('hex'),freeze=JSON.parse(await readFile(dir+'/freeze.json'));
for(const r of[...freeze.minimalFiles,...freeze.reviewAndProofFiles,...freeze.dependencies])assert.equal(hash(await readFile(r.file)),r.sha256,'Frozen file '+r.file);
if(process.argv.includes('--rebuild')){execFileSync(process.execPath,[dir+'/prepare-draft.mjs'],{stdio:'pipe'});for(const r of freeze.minimalFiles)assert.equal(hash(await readFile(r.file)),r.sha256,'Exact source reproduction '+r.file);}
console.log(JSON.stringify({status:'passed',activation:false,minimalFiles:freeze.minimalFiles.length,reviewAndProofFiles:freeze.reviewAndProofFiles.length,reproduced:process.argv.includes('--rebuild'),candidate:freeze.candidateSha256}));
