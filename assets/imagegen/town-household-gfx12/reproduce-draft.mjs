import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const dir = import.meta.dirname, root = path.resolve(dir, '../../..');
const sha = file => createHash('sha256').update(fs.readFileSync(path.join(dir, file))).digest('hex');
const outputs = [
  'import-spec.full-area.json', 'derived-hair-fragment-area.png', 'derived-hair-fragment-area.json',
  'full-area/preview-raster.json', 'full-area/preview-import.json', 'full-area/preview-native-indexed.png',
  'full-area/native-frames.json', 'full-area/native-source-map.json', 'full-area/graphics.4bpp',
  'full-area/graphics.ct-lz', 'full-area/assembly.bin', 'full-area/audit.json', 'full-area/family.json',
  'full-area/palette135-1x.png', 'full-area/palette135-4x.png', 'full-area/palette131-1x.png', 'full-area/palette131-4x.png',
];
const before = Object.fromEntries(outputs.map(file => [file, sha(file)]));
const run = (script, ...args) => execFileSync(process.execPath, [script, ...args], {cwd: root, stdio: 'pipe'});
run('assets/imagegen/town-household-gfx12/create-full-spec.mjs', 'area');
run('scripts/import-raster-art.mjs', '--preview-spec', 'assets/imagegen/town-household-gfx12/import-spec.full-area.json');
run('assets/imagegen/town-household-gfx12/derive-fragments.mjs', 'area');
run('scripts/import-raster-art.mjs', '--preview-spec', 'assets/imagegen/town-household-gfx12/import-spec.full-area.json');
run('assets/imagegen/town-household-gfx12/prepare-native.mjs', 'area');
for (const file of outputs) assert.equal(sha(file), before[file], file + ' exact native reproduction');
assert.deepEqual(fs.readFileSync(path.join(dir, 'import-spec.full-area.json')), fs.readFileSync(path.join(dir, 'import-spec.draft.json')));
fs.writeFileSync(path.join(dir, 'reproduction.json'), JSON.stringify({
  status: 'Selected source import, fragment derivation and native compilation reproduced byte for byte',
  outputs: outputs.map(file => ({file, sha256: before[file]})),
  sourceGenerationRerun: false,
  scope: 'Reuses the three preserved actual generated PNGs. No active catalogue, generated engine module or ROM build is written. Browser typography and native emulator proofs are separate evidence.',
}, null, 2) + '\n');
console.log(JSON.stringify({passed: outputs.length, activeWrites: 0}));
