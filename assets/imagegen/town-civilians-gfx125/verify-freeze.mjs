import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const dir = import.meta.dirname, root = path.resolve(dir,'../../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir,'freeze.json')));
for (const f of manifest.files) {
  const data = fs.readFileSync(path.join(root,f.path));
  assert.equal(data.length,f.bytes,f.path+' byte count');
  assert.equal(sha(data),f.sha256,f.path+' frozen hash');
}
const currentDependencyDifferences = manifest.dependencies.flatMap(f=>sha(fs.readFileSync(path.join(root,f.path)))===f.sha256?[]:[f.path]);
console.log(JSON.stringify({frozenFilesVerified:manifest.files.length,currentDependencyDifferences,activation:false}));
