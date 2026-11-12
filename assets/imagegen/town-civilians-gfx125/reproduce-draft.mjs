import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const dir = import.meta.dirname, root = path.resolve(dir, '../../..');
const prefix = 'assets/imagegen/town-civilians-gfx125/';
const sha = file => createHash('sha256').update(fs.readFileSync(path.join(dir, file))).digest('hex');
const outputs = [
  'import-spec.full-area.json', 'import-spec.composed-area.json', 'original-sweat-raster.json',
  ...['preview-raster.json', 'preview-import.json', 'preview-native-indexed.png',
    'native-frames.json', 'native-source-map.json', 'native-composition.json', 'graphics.4bpp',
    'graphics.ct-lz', 'assembly.bin', 'audit.json', 'family.json',
    'palette135-1x.png', 'palette135-4x.png', 'palette133-1x.png', 'palette133-4x.png'].map(f => 'full-area/' + f),
  ...['preview-raster.json', 'preview-import.json', 'preview-native-indexed.png'].map(f => 'draft-preview/' + f),
];
const before = Object.fromEntries(outputs.map(file => [file, sha(file)]));
const run = (script, ...args) => execFileSync(process.execPath, [script, ...args], {cwd: root, stdio: 'pipe'});
run(prefix + 'create-spec.mjs', 'area');
run('scripts/import-raster-art.mjs', '--preview-spec', prefix + 'import-spec.full-area.json');
run(prefix + 'prepare-native.mjs', 'area');
assert.deepEqual(fs.readFileSync(path.join(dir, 'import-spec.composed-area.json')), fs.readFileSync(path.join(dir, 'import-spec.draft.json')));
run('scripts/import-raster-art.mjs', '--preview-spec', prefix + 'import-spec.draft.json');
for (const file of outputs) assert.equal(sha(file), before[file], file + ' exact source reproduction');
const runtime = JSON.parse(fs.readFileSync(path.join(dir, 'draft-preview/preview-raster.json')));
const frames = JSON.parse(fs.readFileSync(path.join(dir, 'full-area/native-frames.json')));
assert.deepEqual(runtime.frames, frames, 'All20 runtime imported frames equal native compiler inputs');
fs.writeFileSync(path.join(dir, 'reproduction.json'), JSON.stringify({
  status: 'Selected source import, original effect composition and native compilation reproduced byte for byte',
  outputs: outputs.map(file => ({file, sha256: before[file]})),
  nativeImagesMatched: 20, sourceGenerationRerun: false,
  scope: 'Reuses one preserved actual generated PNG and three preserved original sweat pixels. No active catalogue, generated engine module or ROM build is written. Browser review and emulator proofs are separate evidence.',
}, null, 2) + '\n');
console.log(JSON.stringify({passed: outputs.length, runtimeFrames: 20, activeWrites: 0}));
