import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const dir = import.meta.dirname, root = path.resolve(dir, '../../..');
const sha = file => createHash('sha256').update(fs.readFileSync(path.join(dir, file))).digest('hex');
const outputs = [
  'import-spec.full-nearest.json', 'derived-cap-fragment-nearest.png', 'derived-cap-fragment-nearest.json',
  'full-nearest/preview-raster.json', 'full-nearest/preview-import.json', 'full-nearest/preview-native-indexed.png',
  'full-nearest/native-frames.json', 'full-nearest/native-source-map.json', 'full-nearest/graphics.4bpp',
  'full-nearest/graphics.ct-lz', 'full-nearest/assembly.bin', 'full-nearest/audit.json', 'full-nearest/family.json',
  'full-nearest/palette9-1x.png', 'full-nearest/palette9-4x.png', 'full-nearest/palette133-1x.png', 'full-nearest/palette133-4x.png',
];
const before = Object.fromEntries(outputs.map(file => [file, sha(file)]));
const run = (script, ...args) => execFileSync(process.execPath, [script, ...args], {cwd: root, stdio: 'pipe'});
run('assets/imagegen/town-civilians-gfx11/create-full-spec.mjs', 'nearest');
run('scripts/import-raster-art.mjs', '--preview-spec', 'assets/imagegen/town-civilians-gfx11/import-spec.full-nearest.json');
run('assets/imagegen/town-civilians-gfx11/derive-fragments.mjs', 'nearest');
run('scripts/import-raster-art.mjs', '--preview-spec', 'assets/imagegen/town-civilians-gfx11/import-spec.full-nearest.json');
run('assets/imagegen/town-civilians-gfx11/prepare-native.mjs', 'nearest');
for (const file of outputs) assert.equal(sha(file), before[file], file + ' exact native reproduction');
assert.deepEqual(fs.readFileSync(path.join(dir, 'import-spec.full-nearest.json')), fs.readFileSync(path.join(dir, 'import-spec.draft.json')));
fs.writeFileSync(path.join(dir, 'reproduction.json'), JSON.stringify({
  status: 'Selected source import, fragment derivation and native compilation reproduced byte for byte',
  outputs: outputs.map(file => ({file, sha256: before[file]})),
  sourceGenerationRerun: false,
  scope: 'Reuses the two preserved actual generated PNGs. No active catalogue, generated engine module or ROM build is written. Browser typography and native emulator proofs are separate evidence.',
}, null, 2) + '\n');
console.log(JSON.stringify({passed: outputs.length, activeWrites: 0}));
