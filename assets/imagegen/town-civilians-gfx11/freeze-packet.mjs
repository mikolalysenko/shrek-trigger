import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const dir = import.meta.dirname, root = path.resolve(dir, '../../..');
const prefix = 'assets/imagegen/town-civilians-gfx11/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(dir, file)));
execFileSync(process.execPath, [prefix + 'write-handoff.mjs'], {cwd: root, stdio: 'pipe'});
const handoff = read('handoff.json');
handoff.status = 'Frozen inactive source and verification packet; parent-approved static model, palettes, gait contacts and role sheet';
fs.writeFileSync(path.join(dir, 'handoff.json'), JSON.stringify(handoff, null, 2) + '\n');
const proposal = read('integration-proposal.json');
proposal.status = 'Frozen inactive integration proposal; parent owns activation';
fs.writeFileSync(path.join(dir, 'integration-proposal.json'), JSON.stringify(proposal, null, 2) + '\n');
const top = [
  '.gitignore', 'README.md', 'audit-native.mjs', 'audit-event-uses.py', 'audit-assembly-capacity.mjs',
  'native-audit.json', 'current-event-audit.json', 'assembly-capacity-audit.json', 'design-proposal.json', 'native-role-notes.json',
  'source-base-v1.png', 'source-contacts-v2.png', 'prompt-base-v1.txt', 'prompt-contacts-v2.txt', 'provenance-base-v1.json', 'provenance-contacts-v2.json',
  'create-full-spec.mjs', 'derive-fragments.mjs', 'derived-cap-fragment-nearest.png', 'derived-cap-fragment-nearest.json',
  'import-spec.full-nearest.json', 'import-spec.draft.json', 'prepare-native.mjs', 'build-review.mjs',
  'private-overlay.mjs', 'native-proof-utils.mjs', 'verify-native.mjs', 'verify-motion.mjs', 'verify-scenes.mjs',
  'scene-resource-audit.json', 'reproduce-draft.mjs', 'reproduction.json', 'write-handoff.mjs', 'handoff.json', 'integration-proposal.json', 'freeze-packet.mjs',
];
const nativeFiles = ['preview-raster.json', 'preview-import.json', 'preview-native-indexed.png', 'native-frames.json', 'native-source-map.json', 'graphics.4bpp', 'graphics.ct-lz', 'assembly.bin', 'audit.json', 'family.json', 'palette9-1x.png', 'palette9-4x.png', 'palette133-1x.png', 'palette133-4x.png'].map(f => 'full-nearest/' + f);
const reviewFiles = ['contact-sheet-1x.png', 'contact-sheet.html', 'role-review.html', 'role-review.png', 'gait-contacts.html', 'gait-contacts.png', 'motion-review.html', 'ui-check.json'].map(f => 'review/' + f);
const proofFiles = ['native-verification/manifest.json', 'motion-verification/manifest.json', ...[0, 1, 13, 17].map(f => 'native-verification/npc22-' + f + '.png'), ...[1, 13].map(f => 'native-verification/npc89-' + f + '.png')];
const sceneNames = ['market-present', 'market-middle', 'inn-middle', 'medina-inn', 'court-trial', 'dream-home'];
const sceneFiles = [...sceneNames.map(n => 'scene-verification/' + n + '.json'), ...['market-present-arrival.png', 'market-middle-arrival.png', 'inn-middle-arrival.png', 'medina-inn-arrival.png', 'dream-home-arrival.png', 'dream-home-settled.png', 'court-trial-pierre-149.png', 'court-trial-pierre-152.png', 'court-trial-pierre-153.png', 'court-trial-prison-intake.png'].map(f => 'scene-verification/' + f)];
const selected = [...top, ...nativeFiles, ...reviewFiles, ...proofFiles, ...sceneFiles].sort();
if (new Set(selected).size !== selected.length) throw Error('Duplicate whitelist path');
const files = selected.map(file => {const bytes = fs.readFileSync(path.join(dir, file)); return {path: prefix + file, bytes: bytes.length, sha256: sha(bytes)};});
const dependencies = ['scripts/import-raster-art.mjs', 'engine/native-sprites.js', 'engine/sprites.js', 'engine/compression.js', 'scripts/native-sprite-view.mjs', 'engine/rom.js', 'engine/raster-art.js', 'engine/npc-graphics-streaming.js', 'engine/expanded-rom.js', 'scripts/core.mjs', 'engine/devtools.js', 'engine/automation.js', 'engine/hooks.js', 'engine/save.js', 'content/hooks.json', 'content/areas.js', 'content/native-preview.js', 'package-lock.json'].map(file => ({path: file, sha256: sha(fs.readFileSync(path.join(root, file)))}));
const manifest = {status: handoff.status, baselineSha256: handoff.baselineSha256, privateSha256: handoff.privateSha256, sourceNativeProof: handoff, files, dependencies, externalRomInputs: [{path: prefix + 'private/baseline-5606e43282e0.sfc', sha256: handoff.baselineSha256}, {path: '.local/chrono-trigger-usa.sfc', sha256: read('native-audit.json').originalSha256}], exclusions: ['ROMs and snapshots; superseded sampling trials; hidden-Truce17 diagnostic failure artifacts; redundant screenshots; initial unlabeled original review exports. These are not part of the minimal selected source packet.'], activation: false};
fs.writeFileSync(path.join(dir, 'freeze.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'reproducibility-files.txt'), [...files.map(f => f.path), prefix + 'freeze.json', prefix + 'reproducibility-files.txt'].join('\n') + '\n');
console.log(JSON.stringify({files: files.length, whitelist: files.length + 2, bytes: files.reduce((n, f) => n + f.bytes, 0), freezeSha256: sha(fs.readFileSync(path.join(dir, 'freeze.json'))), graphics: proposal.graphics, assembly: proposal.assembly}));
