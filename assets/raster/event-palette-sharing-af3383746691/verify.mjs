import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const dir=import.meta.dirname,root=path.resolve(dir,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(path.join(dir,f)));
const freeze=read('freeze.json'),fair=read('fair5-report.json'),report=read('report.json');
for(const f of freeze.files){const bytes=fs.readFileSync(path.join(root,f.path));assert.equal(bytes.length,f.bytes,f.path);assert.equal(sha(bytes),f.sha256,f.path);}
if(process.argv.includes('--dependencies'))for(const f of freeze.dependencies)assert.equal(sha(fs.readFileSync(path.join(root,f.path))),f.sha256,f.path);
for(const i of freeze.inputs)assert.equal(sha(fs.readFileSync(path.join(root,i.path))),i.sha256,i.path);
assert.equal(fair.cases.original.allocationFailures.length,0);
assert.equal(fair.cases.current.allocationFailures.length,1);
assert.equal(fair.cases.current.allocationFailures[0].object,16);
assert.equal(fair.cases.current.allocationFailures[0].pc,0xc072b2);
assert.equal(fair.cases.original.pixelRecheck.intendedColorPixels,342);
assert.equal(fair.cases.current.pixelRecheck.actualColorPixels,342);
assert.equal(fair.cases.current.pixelRecheck.intendedColorPixels,0);
assert.deepEqual(fair.checkpoints.map(c=>c.object),[16,24,25]);
for(const c of fair.checkpoints)for(const a of Object.values(c.observed)){
  assert.ok(a.displayed.actualColorPixels>0);
  assert.equal(a.displayed.tiles.length,4);
  assert.deepEqual(a.displayed.tiles.map(t=>t+a.displayed.spriteBase-a.displayed.actorTileSlot).sort((a,b)=>a-b),[0,2,4,6]);
  if(c.object!==16){assert.equal(a.colorExact,true);assert.equal(a.allocationFailures,0);}
}
assert.equal(report.allNativeCases.length,24);
assert.equal(report.allNativeCases.reduce((n,c)=>n+c.ticks,0),37984);
assert.equal(report.explicitAssignments.newIncompatibleExplicitPairsOutside80,0);
for(const c of report.allNativeCases){const j=read(c.manifest);assert.equal(j.fatal,null);assert.equal(j.romSha256,freeze.inputs.find(i=>i.name===j.version).sha256);for(const f of j.frames)for(const a of f.actors)if(a.displayed)assert.equal(a.displayed.actorTileSlot,a.tileSlot);}
const whitelist=fs.readFileSync(path.join(dir,'reproducibility-files.txt'),'utf8').trim().split('\n');
assert.equal(whitelist.length,freeze.files.length+2);assert.ok(whitelist.every(p=>!p.includes('/private/')));
console.log(JSON.stringify({ok:true,files:freeze.files.length,inputs:freeze.inputs.length,nativeCases:24,nativeTicks:37984,actorSpecificFairCheckpoints:3,activeWrites:0}));
