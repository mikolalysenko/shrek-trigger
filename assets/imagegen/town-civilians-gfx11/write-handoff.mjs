import fs from 'node:fs';
import path from 'node:path';

const dir = import.meta.dirname, prefix = 'assets/imagegen/town-civilians-gfx11';
const read = file => JSON.parse(fs.readFileSync(path.join(dir, file)));
const audit = read('native-audit.json'), compiled = read('full-nearest/audit.json');
const native = read('native-verification/manifest.json'), motion = read('motion-verification/manifest.json');
const names = ['market-present', 'market-middle', 'inn-middle', 'medina-inn', 'court-trial', 'dream-home'];
const scenes = names.map(name => ({name, data: read('scene-verification/' + name + '.json')}));
const sourceLocations = new Set(scenes.flatMap(s => s.data.observations.map(o => o.location)));
const proposal = {
  status: 'Inactive integration proposal; parent owns activation', key: 'duloc-town-keeper',
  sourceSpec: prefix + '/import-spec.draft.json', family: prefix + '/full-nearest/family.json',
  headerOwners: audit.owners.map(h => ({kind: h.kind, id: h.id, originalHeader: h.header, proposedHeader: h.header.map((v, i) => i === 1 ? 247 : v)})),
  pointerAliases: audit.ownership.map(o => ({field: o.field, id: o.id, aliases: o.pointerAliases, ownerCount: o.owners.length})),
  paletteIds: [9, 133], palettes: audit.palettes.map(p => ({id: p.id, sha256: p.sha256})), paletteWrites: 0,
  graphics: {gfx: 11, rawBytes: compiled.rawBytes, compressedBytes: compiled.compressedBytes, rawSha256: compiled.graphicsSha256, compressedSha256: compiled.compressedSha256, originalDecodedBytes: audit.graphics.rawBytes, originalCompressedBytes: audit.graphics.compressedBytes, rawStreamRequired: true, streamGuard: 'Explicit selected gfx11 ownership contract; ordinary guards for unrelated banks remain unchanged.', extraWramBytes: 0, extraVramBytes: 0, storedGrowthBeforeAlignment: compiled.rawBytes + compiled.compressedBytes - audit.graphics.compressedBytes + compiled.assemblyBytes},
  assembly: {asm: 247, originalSharedAssembly: 7, reservedOwnersOnly: [22, 49, 89], frames: 19, cells: 4, bytes: compiled.assemblyBytes, sha256: compiled.assemblySha256, anchor: [0, 12], originalSignedXYBytesPreserved: 152, cellOverlapFrames: [], originalAssemblyReclaimable: false, condition: 'Parent repeats current slot247 owner/pointer/claim checks before production allocation. Original asm7 pointer and760-byte packet remain exact for22 unrelated owners.'},
  animation: {id: 7, programSha256: audit.animationProgram.sha256, durationSha256: audit.animationProgram.durationSha256, sharedOwnerCount: audit.animationProgram.sharedOwnerCount, changes: 0},
  permittedChanges: 'GFX11 graphics pointer and scoped raw-stream pointer; one new assembly247 pointer and packet; only NPC22/49/89 assembly header fields7→247. No palettes, AA7, original asm7, AI, stats, events, collision, title, audio or unrelated assets.',
  activation: false,
};
fs.writeFileSync(path.join(dir, 'integration-proposal.json'), JSON.stringify(proposal, null, 2) + '\n');
const handoff = {
  status: 'Inactive completed source and verification packet; root owns final integration', key: 'duloc-town-keeper',
  baselineSha256: audit.baselineSha256, privateSha256: native.privateSha256,
  source: {tool: 'built-in image_gen__imagegen', generatedPNGs: 2, selectedSourcePoses: 9, sourceDerivedCapFragment: 1, prompts: ['prompt-base-v1.txt', 'prompt-contacts-v2.txt'].map(f => prefix + '/' + f), selectedCells: {'source-base-v1.png': [0, 1, 2, 3, 5, 7], 'source-contacts-v2.png': [0, 1, 2]}, sampling: 'Nearest. Shared32px base reference and31px correction reference. Complete source scale corrections32/33,32/34,31/33 preserve original gait heights and four-cell cover; no anisotropic distortion.', anatomyPaintedInCode: false, derivedFragment: 'Pointwise upper-eight-row crop of the sampled generated left idle; mirrored intact for18. Explicit empty mask preserves16.'},
  native: {slots: 19, blankSlots: [16], capFragmentSlots: [17, 18], owners: audit.owners.map(o => [o.kind, o.id]), paletteIds: [9, 133], paletteWrites: 0, originalAssembly7Changed: false, privateAssembly: 247, rawBytes: compiled.rawBytes, compressedBytes: compiled.compressedBytes, assemblyBytes: compiled.assemblyBytes, graphicsSha256: compiled.graphicsSha256, compressedSha256: compiled.compressedSha256, assemblySha256: compiled.assemblySha256, exactUploads: native.uploads, exactNonblankFrameCellCoordinates: native.exactCells, blankTileUploads: 3, exactOpaquePixels: native.exactOpaquePixels, animationCases: motion.cases, animationTicks: motion.ticks, maximumDisplayDelay: motion.maxDelay, originalSignedXYBytesPreserved: 152, overlapFrames: []},
  sceneEvidence: scenes.map(({name, data}) => ({name, location: data.setup.id, nativeTicks: data.nativeTicks, result: data.result, heapMax: data.heapMax, objPaletteRows: [...new Set(data.shots.flatMap(s => s.nativeMatches.map(m => m.objPaletteRow)))], manifest: prefix + '/scene-verification/' + name + '.json'})),
  sceneCoverage: {auditedPrograms: audit.scenes.map(s => s.location), auditedLoadStatements: audit.scenes.reduce((n, s) => n + s.loadCount, 0), observedSourceLocations: [...sourceLocations].sort((a, b) => a - b), untraversedPrograms: audit.scenes.filter(s => !sourceLocations.has(s.location)).map(s => s.location), totalSceneTicks: scenes.reduce((n, s) => n + s.data.nativeTicks, 0), limitations: [
    'Scene runs use diagnostic entry/checkpoint setup, followed by original event/controller execution. Natural campaign approach and full endings are not claimed.',
    'Shop/inn runs prove original loading, visible art, anchors, actual CGRAM rows and bounded input only; no purchase or paid-stay completion is claimed.',
    'The helpful trial completes its original Pierre dialogue, flashbacks, verdict and prison intake. Counter, dialogue-window and party occlusion remain original and are reported separately from exact isolated tile/coordinate proof.',
    'Initial direct Truce Market17 entry loaded NPC22 but left it hidden at native frame255; no visible-art claim is made for that branch. Porre Market54 supplies the present-day NPC22 scene proof.',
    'All25 target event packets remain byte-identical. All-branch actor-bank unions are not simultaneous heap measurements; the six actual cases measure their own heap.',
    'Full production allocation, current-cartridge independent cores and active campaign regression remain parent integration work.',
  ]},
  reproduction: prefix + '/reproduction.json', proposal: prefix + '/integration-proposal.json', activeFilesChanged: false,
};
fs.writeFileSync(path.join(dir, 'handoff.json'), JSON.stringify(handoff, null, 2) + '\n');
console.log(JSON.stringify({privateSha256: handoff.privateSha256, sceneTicks: handoff.sceneCoverage.totalSceneTicks, observedSourceLocations: handoff.sceneCoverage.observedSourceLocations, storedGrowth: proposal.graphics.storedGrowthBeforeAlignment}));
