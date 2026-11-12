import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const dir = import.meta.dirname, root = path.resolve(dir, '../../..');
const prefix = 'assets/imagegen/town-civilians-gfx125/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(dir, file)));
execFileSync(process.execPath, [prefix + 'write-handoff.mjs'], {cwd: root, stdio: 'pipe'});
const handoff = read('handoff.json');
const top = [
  '.gitignore', 'README.md', 'audit-native.mjs', 'extract-events.mjs', 'audit-event-uses.py', 'audit-dialogue.mjs',
  'native-audit.json', 'current-event-audit.json', 'dialogue-context-audit.json', 'scene-contexts.json', 'design-proposal.json', 'native-role-notes.json',
  'source-base-v1.png', 'prompt-base-v1.txt', 'provenance-base-v1.json',
  'create-spec.mjs', 'prepare-native.mjs', 'original-sweat-raster.json', 'import-spec.full-area.json', 'import-spec.composed-area.json', 'import-spec.draft.json', 'build-review.mjs',
  'private-overlay.mjs', 'native-proof-utils.mjs', 'verify-native.mjs', 'verify-motion.mjs', 'verify-scenes.mjs',
  'scene-resource-audit.json', 'reproduce-draft.mjs', 'reproduction.json', 'write-handoff.mjs', 'handoff.json', 'integration-proposal.json', 'freeze-packet.mjs', 'verify-freeze.mjs',
];
const nativeFiles = ['preview-raster.json', 'preview-import.json', 'preview-native-indexed.png', 'native-frames.json', 'native-source-map.json', 'native-composition.json', 'graphics.4bpp', 'graphics.ct-lz', 'assembly.bin', 'audit.json', 'family.json', 'palette135-1x.png', 'palette135-4x.png', 'palette133-1x.png', 'palette133-4x.png'].map(f => 'full-area/' + f);
const draftFiles = ['preview-raster.json', 'preview-import.json', 'preview-native-indexed.png'].map(f => 'draft-preview/' + f);
const reviewFiles = ['contact-sheet-1x.png', 'contact-sheet.html', 'role-review.html', 'role-review.png', 'gait-contacts.html', 'gait-contacts.png', 'motion-review.html', 'ui-check.json'].map(f => 'review/' + f);
const proofFiles = ['native-verification/manifest.json', 'motion-verification/manifest.json', ...[1,16,17,19].map(f => 'native-verification/npc14-' + f + '.png'), ...[1,18,19].map(f => 'native-verification/npc79-' + f + '.png')];
const scenes = ['truce-inn', 'merchant-inn', 'marco', 'parade', 'dream-end-time'];
const sceneFiles = [...scenes.map(n => 'scene-verification/' + n + '.json'), ...['truce-inn-interaction.png', 'merchant-inn-interaction.png', 'marco-dialogue-0.png', 'parade-arrival.png', 'parade-interaction.png', 'dream-end-time-dialogue-0.png'].map(f => 'scene-verification/' + f)];
const selected = [...top,...nativeFiles,...draftFiles,...reviewFiles,...proofFiles,...sceneFiles].sort();
if (new Set(selected).size !== selected.length) throw Error('Duplicate whitelist path');
const files = selected.map(file => {const bytes = fs.readFileSync(path.join(dir, file)); return {path: prefix + file, bytes: bytes.length, sha256: sha(bytes)};});
const deps = ['scripts/import-raster-art.mjs', 'engine/native-sprites.js', 'engine/sprites.js', 'engine/compression.js', 'scripts/native-sprite-view.mjs', 'engine/rom.js', 'engine/raster-art.js', 'engine/npc-graphics-streaming.js', 'engine/expanded-rom.js', 'scripts/core.mjs', 'engine/devtools.js', 'engine/automation.js', 'engine/hooks.js', 'engine/save.js', 'content/hooks.json', 'content/areas.js', 'content/native-preview.js', 'package-lock.json'];
const dependencies = deps.map(file => ({path: file, sha256: sha(fs.readFileSync(path.join(root,file)))}));
const auditDependencies = ['.local/reference/jot-current/sourcefiles/eventcommand.py','.local/reference/temporal-redux/sourcefiles/editorui/lookups.py'].map(file => ({path:file,sha256:sha(fs.readFileSync(path.join(root,file))),scope:'Optional original ownership/scene audit regeneration only; selected source compilation uses preserved audit JSON.'}));
const manifest = {status: handoff.status, baselineSha256: handoff.baselineSha256, privateSha256: handoff.privateSha256, sourceNativeProof: handoff, files, dependencies, auditDependencies, externalRomInputs: [{path: prefix + 'private/baseline-af3383746691.sfc', sha256: handoff.baselineSha256}, {path: '.local/chrono-trigger-usa.sfc', sha256: read('native-audit.json').originalSha256}], exclusions: ['ROMs and snapshots; superseded nearest samples; failed parade approaches before the correct original checkpoint; redundant screenshots; unlabeled original reference exports.'], activation:false};
fs.writeFileSync(path.join(dir,'freeze.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(dir,'reproducibility-files.txt'),[...files.map(f=>f.path),prefix+'freeze.json',prefix+'reproducibility-files.txt'].join('\n')+'\n');
console.log(JSON.stringify({files:files.length,whitelist:files.length+2,bytes:files.reduce((n,f)=>n+f.bytes,0),freezeSha256:sha(fs.readFileSync(path.join(dir,'freeze.json')))}));
