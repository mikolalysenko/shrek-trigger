import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = import.meta.dirname, prefix = 'assets/imagegen/town-civilians-gfx125';
const read = file => JSON.parse(fs.readFileSync(path.join(dir, file)));
const audit = read('native-audit.json'), compiled = read('full-area/audit.json');
const native = read('native-verification/manifest.json'), motion = read('motion-verification/manifest.json');
const names = ['truce-inn', 'merchant-inn', 'marco', 'parade', 'dream-end-time'];
const scenes = names.map(name => ({name, data: read('scene-verification/' + name + '.json')}));
for (const {data} of scenes) assert.equal(data.status, 'Passed');
const observed = new Set(scenes.flatMap(s => s.data.observations.map(o => o.location)));
const parade = scenes.find(s => s.name === 'parade').data;
const paradeMatch = parade.shots.flatMap(s => s.nativeMatches).find(m => m.frame === 18);
assert.ok(paradeMatch); assert.equal(paradeMatch.objPaletteRow, 7);
assert.notDeepEqual(paradeMatch.cgramWords, audit.palettes.find(p => p.id === 133).words);
const proposal = {
  status: 'Frozen inactive integration proposal; parent owns activation', key: 'duloc-town-resident',
  sourceSpec: prefix + '/import-spec.draft.json', family: prefix + '/full-area/family.json',
  sourceContract: {width: 64, height: 64, indexedFrames: 20, sequence: 'native/1', sourceType: 'image-generation', nativeComposition: 'Full source mirrors/translations plus three original sweat pixels; the existing importer supports this composition. No new importer or runtime transform is required.'},
  headerOwners: audit.owners.map(h => ({kind: h.kind, id: h.id, originalHeader: h.header, proposedHeader: h.header})),
  pointerAliases: audit.ownership.map(o => ({field: o.field, id: o.id, aliases: o.pointerAliases, ownerCount: o.owners.length})),
  paletteIds: [135, 133], palettes: audit.palettes.map(p => ({id: p.id, offset: p.offset, bytes: p.bytes, sha256: p.sha256})), paletteWrites: 0,
  graphics: {gfx: 125, rawBytes: compiled.rawBytes, compressedBytes: compiled.compressedBytes, rawSha256: compiled.graphicsSha256, compressedSha256: compiled.compressedSha256, originalDecodedBytes: audit.graphics.rawBytes, originalCompressedBytes: audit.graphics.compressedBytes, rawStreamRequired: true, streamGuard: 'Explicit selected gfx125 ownership contract; ordinary guards for unrelated banks remain unchanged.', extraWramBytes: 0, extraVramBytes: 0, storedGrowthBeforeAlignment: compiled.rawBytes + compiled.compressedBytes - audit.graphics.compressedBytes},
  assembly: {asm: 188, exclusiveOwnersOnly: [14, 79], newAssemblyIds: [], frames: 20, cells: 4, bytes: compiled.assemblyBytes, sha256: compiled.assemblySha256, anchor: [0, 12], originalSignedXYBytesPreserved: 159, proposedCoordinateChanges: compiled.proposedCoordinateChanges, overlapFrames: [], originalPacketBytes: 800, reclaimableOnlyAfterAllOwnersUpdated: true, sharedAssembly7Unchanged: true},
  animation: {id: 7, programSha256: audit.animationProgram.sha256, durationSha256: audit.animationProgram.durationSha256, sharedOwnerCount: audit.animationProgram.sharedOwnerCount, changes: 0},
  permittedChanges: 'Only the gfx125 compressed/raw-stream pointers and the exclusive asm188 pointer/packet. All headers remain exact. No palettes, AA7, asm7, AI, stats, events, collision, title, audio or unrelated assets. Private assembly247 remains reserved for gfx11.',
  paradeColorLimitation: {location: 80, object: 35, npc: 79, frame: 18, intendedSourcePalette: 133, actualHardwareRow: 7, actualCgramWords: paradeMatch.cgramWords, intendedCgramWords: audit.palettes.find(p => p.id === 133).words, visiblePixelsAtRecordedActualColors: paradeMatch.visibleExact, occludedOrDifferentPixels: paradeMatch.occludedOrDifferent, scope: 'Inherited af338 row7 overwrite by another NPC; these source tiles/coordinates are exact, but intended palette133 colors are not retained in this scene. Root owns the independent scene fix. No color acceptance is inferred from upload acceptance.'},
  activation: false,
};
fs.writeFileSync(path.join(dir, 'integration-proposal.json'), JSON.stringify(proposal, null, 2) + '\n');
const handoff = {
  status: 'Frozen inactive source and verification packet; root approved static model, gait, roles, geometry and the bounded parade limitation', key: 'duloc-town-resident',
  baselineSha256: audit.baselineSha256, privateSha256: native.privateSha256,
  source: {tool: 'built-in image_gen__imagegen', generatedPNGs: 1, selectedSourcePoses: 16, prompt: prefix + '/prompt-base-v1.txt', source: prefix + '/source-base-v1.png', sourceSha256: read('provenance-base-v1.json').sourceSha256, sampling: 'AREA, shared32px standing reference. Uniform per-source corrections32/31,31/32,30/31,30/27,27/26 retain native role heights and all source pixels; no anisotropic distortion.', anatomyPaintedInCode: false, mirroredNativeSlots: [3,14,15,18], preservedOriginalRaster: {frame: 16, pixels: 3, paletteIndex: 2, provenance: prefix + '/original-sweat-raster.json'}, unreferencedKneelingFrame: {frame: 19, originalSourceIsNotBlank: true, selectedSource: 15, scope: 'Original source role preserved and isolated native upload verified; no AA7 list or target-scene direct AC19 consumer found.'}},
  native: {slots: 20, blankSlots: [], fragmentSlots: [], owners: audit.owners.map(o => [o.kind, o.id]), paletteIds: [135,133], paletteWrites: 0, rawBytes: compiled.rawBytes, compressedBytes: compiled.compressedBytes, assemblyBytes: compiled.assemblyBytes, graphicsSha256: compiled.graphicsSha256, compressedSha256: compiled.compressedSha256, assemblySha256: compiled.assemblySha256, targetUploads: native.targetUploads, targetExactCells: native.targetExactCells, targetExactOpaquePixels: native.targetExactOpaquePixels, sentinelUploads: native.sentinelUploads, sentinelExactOpaquePixels: native.sentinelExactOpaquePixels, sentinelOwners: [21,22,39], animationCases: motion.cases, animationTicks: motion.ticks, maximumDisplayDelay: motion.maxDelay, originalSignedXYBytesPreserved: 159, geometryChange: compiled.proposedCoordinateChanges, overlapFrames: []},
  sceneEvidence: scenes.map(({name, data}) => ({name, location: data.setup.id, setup: data.setup, nativeTicks: data.nativeTicks, result: data.result, heapMax: data.heapMax, objPaletteRows: [...new Set(data.shots.flatMap(s => s.nativeMatches.map(m => m.objPaletteRow)))], manifest: prefix + '/scene-verification/' + name + '.json'})),
  sceneCoverage: {auditedPrograms: audit.scenes.map(s => s.location), auditedLoadStatements: audit.scenes.reduce((n,s) => n + s.loadCount, 0), observedSourceLocations: [...observed].sort((a,b)=>a-b), untraversedPrograms: audit.scenes.filter(s => !observed.has(s.location)).map(s=>s.location), totalSceneTicks: scenes.reduce((n,s)=>n+s.data.nativeTicks,0), limitations: [
    'Diagnostic E0 entries and explicitly seeded prerequisite story flags are followed by original event/controller execution. No full natural approach, purchase/stay completion or complete ending is claimed.',
    'Parade80 frame18/dialogue56 proves original seating and actual tile/coordinate rendering. Its intended palette133 is overwritten on pinned af338; actual row7 colors and occlusion counts are recorded separately in the integration proposal and scene manifest.',
    'Frame19 is a genuine kneeling source, not a blank. It has isolated native proof but no observed original campaign action consumer.',
    'All23 target event packets remain byte-identical. The source scan attempted512 locations; eight unrelated invalid packets are retained as errors. All-branch source-bank unions are not measured simultaneous heap.',
    'The scene actors retain original dialogue. Naming, broader narrative edits, all remaining scene branches, production allocation and independent current-cartridge cores remain root work.',
  ]},
  reproduction: prefix + '/reproduction.json', proposal: prefix + '/integration-proposal.json', activeFilesChanged: false,
};
fs.writeFileSync(path.join(dir, 'handoff.json'), JSON.stringify(handoff, null, 2) + '\n');
const provenance = read('provenance-base-v1.json');
provenance.method = 'Pristine source PNG copied into workspace; connected-component extraction, uniform sampling and12-color quantization are mechanical. No anatomy painted in code.';
provenance.reviewStatus = 'Root approved all20 source-derived native roles, opposed contacts, AREA sampling, three original sweat pixels and one kneeling cell Y shift.40 target uploads and32 original animation cases passed. Five bounded original scenes passed; parade color collision is explicitly excluded from intended-color acceptance.';
provenance.evidence = {handoff: prefix + '/handoff.json', native: prefix + '/native-verification/manifest.json', timing: prefix + '/motion-verification/manifest.json'};
fs.writeFileSync(path.join(dir, 'provenance-base-v1.json'), JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({privateSha256: handoff.privateSha256, sceneTicks: handoff.sceneCoverage.totalSceneTicks, observedLocations: handoff.sceneCoverage.observedSourceLocations, storedGrowth: proposal.graphics.storedGrowthBeforeAlignment}));
