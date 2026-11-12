// Freeze the inactive packet; all paths are this package or its private QA output.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const dir='assets/imagegen/woodland-bats';
const out='.local/qa/woodland-bats-native-proof';
const json=async path=>JSON.parse(await readFile(path));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(file,value)=>writeFile(dir+'/'+file,JSON.stringify(value,null,2)+'\n');
const record=async file=>{const bytes=await readFile(file);return{file,bytes:bytes.length,sha256:sha(bytes)};};
const audit=await json(dir+'/native-audit.json');
const draft=await json(dir+'/draft-audit.json');
const geometry=await json(dir+'/geometry-audit.json');
const family=await json(dir+'/native-family-proposal.draft.json');
const candidate=await json(out+'/candidate.json');
const display=await json(dir+'/native-display-proof.json');
const timing=await json(dir+'/native-timing-proof.json');
const scene=await json(dir+'/native-scene-proof.json');
const flight=await json(dir+'/native-flight-proof.json');

for(const proof of [display,timing,scene,flight]){
  assert.equal(proof.status,'passed');
  assert.equal(proof.candidateSha256,candidate.candidateSha256);
  assert.equal(proof.baselineSha256,audit.baseline.sha256);
}
assert.equal(sha(await readFile(out+'/candidate.sfc')),candidate.candidateSha256);
assert.equal(draft.graphicsSha256,candidate.records.find(r=>r.label==='NPC 103 direct-ROM graphics').sha256);
assert.equal(candidate.nativeHelpersUnchanged,true);
assert.equal(candidate.originalHeadersAiStatsNamesEventsUnchanged,true);
assert.equal(candidate.AA47Unchanged,true);
assert.equal(candidate.palettesWritten,false);
assert.deepEqual(geometry.uncovered,[]);
assert.ok(geometry.frames.every(f=>f.lowestPixelUnchanged));
assert.deepEqual(family.sourceGeometryDifferences.map(f=>f.frame),[5,6]);

const limits=[
  'This approval and proof apply to the exact frozen source and private ROM fingerprint. Final production allocation and independent-core validation remain root-owned.',
  'Folded poses 5/6 are sampled 17 px wide instead of 19 px. Their center, height, lowest pixels and original four-cell coordinates/order remain unchanged; every other visible bound matches the original.',
  'Slot 7 is fully authored and statically uploaded for all three owners, but AA47 references only slots 0–6 and no original timing consumer for slot 7 was observed.',
  'Three encounters were executed after reversible diagnostic entry with development party resources and story 3. This is not full campaign traversal or ordinary-level balance validation.',
  'The two Magic Cave patrols match baseline state for 899 ticks each after a one-video-frame startup phase alignment. This route/request comparison does not assert universally identical field or battle display latency.',
  'Zero display delay was observed in isolated AA47 tests and six battle layer samples. Original map/party overlap obscures some actual-scene final pixels; complete cells and all unobstructed opaque pixels are proved separately in 24 isolated poses.',
  'Scene-load unions combine verified conditional loads. Five audited locations were not executed; these inventories are not proofs of every simultaneous resident set.'
];
await save('visual-review.json',{
  status:'All eight static native poses approved in both original palette ramps',activation:false,
  reviewers:[
    {by:'/root',scope:'Both enlarged native sheets: model and all pose distinctions approved; retain the two 19→17 px fitting normalizations.'},
    {by:'/root/sprite_art_pass',scope:'Complete 1× sheet and both enlarged pages: pale muzzle, ear tips, folded membranes, three wing positions, asymmetric recoil and inverted versus low upright poses approved. Slot 7 timing remains unobserved.'}
  ],
  selectedGraphicsSha256:draft.graphicsSha256,sourceGeometryDifferences:family.sourceGeometryDifferences,paletteWrites:[],
  actualSceneInspection:{by:'/root/prophet_art_continuation',scope:'Inspected all three battle-ready images: organic bat model and both palette identities remain readable with the original battle anchors and map/party layering. This is a bounded worker inspection, not independent-core approval.'},
  limits:'Static pixel/role approval is distinct from native execution, scene scope and final production integration.'
});

const battleLayers=scene.phases.flatMap(p=>(p.battleLayers??[]).map(l=>({
  phase:p.key,location:p.location,enemy:l.enemy,slot:l.slot,requestedFrame:l.requestedFrame,displayedFrame:l.frame,
  requestedOrigin:l.requestedOrigin,displayedOrigin:l.origin,delayVideoFrames:l.displayDelayVideoFrames,
  exactFinalPixels:l.exactFinalPalettePixels,occludedOrNonRawPixels:l.finalPixelsNotRawPaletteMatch
})));
for(const motion of scene.motions){
  const bytes=await readFile(out+'/'+motion.file);
  assert.equal(sha(bytes),motion.sha256);
  let frames=null;
  for(let at=8;at<bytes.length;){
    const length=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8);
    if(type==='acTL')frames=bytes.readUInt32BE(at+8);
    at+=length+12;
  }
  assert.equal(frames,motion.videoTicks,'Native APNG frame count: '+motion.file);
}
for(const trace of flight.traces)assert.equal(sha(await readFile(trace.file)),trace.sha256);
await save('motion-review.json',{
  status:'Original-list timing, original encounter motion and original flying-route comparison passed',
  candidateSha256:candidate.candidateSha256,
  nativeTiming:{cases:timing.cases,cycles:timing.cycles,scoredTicks:timing.ticks,startupTicks:timing.startupTicks,maximumRequestDisplayDelay:timing.maximumRequestDisplayDelay,fieldDelayTicks:timing.delayedVideoTicks,startupDelayTicks:timing.startupDelayTicks,programBytesUnchanged:true},
  nativeSceneCaptures:scene.motions,battleLayers,flyingRouteComparison:flight.results,
  flyingPhaseInterpretation:'Candidate tick 0 equals baseline tick 1 for both native Vamp patrols, including world XY, frame, timer, phase and mode. This is a one-video-frame startup phase offset; no frame/timer change was made.',
  sourceListReview:'review/motion-original-vs-new.html compares unchanged lists at 60 Hz; it is source playback, not emulator evidence.',
  staticOnlySlots:[7],limits
});

const observed=scene.phases.map(p=>({phase:p.key,location:p.location,bytes:p.maxObservedFieldHeapBytes[p.location],nativeFamilyPresent:p.loads.length>0}));
await save('scene-budget-audit.json',{
  baseline:audit.baseline,originalDecodedCeiling:1760,newDecodedBytes:3008,explicitStreamRequired:[103],
  runtimeHeapLimit:32768,extraWramBytes:0,extraVramBytes:0,defaultUnselectedGuardUnchanged:true,
  scenes:audit.scenes.map(s=>({location:s.location,name:s.name,verifiedFamilyLoads:s.loads,allVerifiedLoads:s.allVerifiedLoads,banks:s.banks,originalLegacyUnion:s.legacyHeapUnionBytes,unapprovedNewLegacyUnion:s.legacyHeapUnionBytes+1248,selectedStreamUnion:s.with103StreamUnion,selectedStreamSpareTo32768:32768-s.with103StreamUnion,unresolvedLoadOffsets:s.unresolvedLoadOffsets,scope:s.scope})),
  observedNativeSceneHeaps:observed,
  streamReason:'Every audited all-branch union stays below 32 KiB, but the replacement exceeds this bank’s original decoded ceiling. Select gfx103 explicitly; keep rejection for unselected oversized banks.',limits
});

const privateFiles=[out+'/candidate.json',out+'/candidate.sfc',out+'/bedroom.json',out+'/baseline-bedroom.json'];
for(const sub of ['display','timing'])for(const file of (await readdir(out+'/'+sub)).sort())privateFiles.push(out+'/'+sub+'/'+file);
for(const phase of scene.phases)privateFiles.push(out+'/scene-proof-'+phase.key+'.json');
for(const shot of scene.screenshots)privateFiles.push(out+'/'+shot.file);
for(const motion of scene.motions)privateFiles.push(out+'/'+motion.file);
for(const trace of flight.traces)privateFiles.push(trace.file);
const privateArtifacts=[];
for(const file of [...new Set(privateFiles)])privateArtifacts.push(await record(file));
await save('native-proof-manifest.json',{
  status:'Frozen bounded private native evidence',activation:false,baseline:audit.baseline,
  candidate:{path:out+'/candidate.sfc',sha256:candidate.candidateSha256},core:'repository native65816/PPU',
  familyDisplay:display.nativeFamily,
  timing:{cases:timing.cases,cycles:timing.cycles,ticks:timing.ticks,startupTicks:timing.startupTicks,fieldDelayTicks:timing.delayedVideoTicks,startupDelayTicks:timing.startupDelayTicks},
  authoredScenePhases:scene.phases.map(p=>({key:p.key,location:p.location,formation:p.formation,positiveDamageResults:p.positiveDamageResults,cartridgeUnchanged:p.cartridgeUnchanged,exactUndo:p.exactUndo})),
  battleLayers,flyingRouteComparison:flight.results,staticOnlySlots:[7],privateArtifacts,
  proofReproduce:['node '+dir+'/build-private.mjs','node '+dir+'/verify-native.mjs','node '+dir+'/verify-timing.mjs','node '+dir+'/verify-scenes.mjs','node '+dir+'/verify-flight.mjs'],limits
});

await save('handoff.json',{
  status:'Frozen approved inactive woodland and cave bats',activation:false,key:'woodland-bats',gfx:103,asm:66,palettes:[78,79],animation:47,
  sizeClass:0,fullOwnerSizeFlags:{80:192,81:192,115:224},cells:4,frames:8,owners:audit.owners,aliases:family.aliases,npcHeaderOwners:[],
  sourceSpec:'import-spec.draft.json',geometry:'native-frame-map.draft.json',family:'native-family-proposal.draft.json',
  compiler:'compile-native.js:compileWoodlandBats(art,geometry)',
  mandatoryIntegration:[
    'Explicitly select gfx103 in the existing native stream contract; retain default original decoded rejection for unselected banks. This private candidate used the existing native helper without extra WRAM/VRAM.',
    'Use all eight already-composed native raster slots once. Preserve canvas 64×80, source origin [32,64], group anchor [0,16], all per-frame cell origins/order and overlap frames 4/5/6/7. Apply the anchor once.',
    'Preserve every header byte of enemies 80/81/115, including full size flags C0/C0/E0. Preserve both palette78/79 records, all AA47 frame/duration bytes, AI, stats, names and events. No palette writes.',
    'All emitted gfx103/asm66/AA47 owners remain exactly enemies 80,81,115. No NPC header owners or external graphics, assembly, program or palette aliases were found on the pinned baseline.',
    'Reclaimable original spans are compressed gfx103: 1,281 bytes at 1,507,328, and asm66: 320 bytes at 1,924,824. Root owns allocator/reclamation wiring and must recheck its current build.',
    'Use extended compressed storage and raw stream placement as appropriate. Do not load 3,008 decoded bytes under the original 1,760-byte bank contract.'
  ],
  reclamationProposal:[{kind:'graphics',id:103,offset:1507328,bytes:1281},{kind:'assembly',id:66,offset:1924824,bytes:320}],
  costs:{...draft,rawStreamBytes:3008,totalCompressedRawAssemblyBytes:5553,totalRomGrowthVsOriginalAndAf338:3952},
  baseline:audit.baseline,candidate:{path:out+'/candidate.sfc',sha256:candidate.candidateSha256},
  proof:'native-proof-manifest.json',review:'visual-review.json',limitations:limits
});

const minimal=[
  'source-v1.png','prompts/source-v1.txt','provenance.json','import-spec.draft.json','native-raster.json',
  'native-frame-map.draft.json','native-family-proposal.draft.json','native-audit.json','native-role-audit.json',
  'compile-native.js','prepare-draft.mjs','graphics.4bpp','graphics.ct-lz','assembly.bin','palette-78.bin','palette-79.bin','draft-audit.json'
];
const review=[
  'README.md','handoff.json','visual-review.json','geometry-audit.json','scene-budget-audit.json','motion-review.json',
  'native-display-proof.json','native-timing-proof.json','native-scene-proof.json','native-flight-proof.json','native-proof-manifest.json',
  'audit-native.mjs','audit-roles.mjs','record-draft.mjs','review-draft.mjs','build-private.mjs','private-preview.mjs','native-proof-utils.mjs',
  'verify-native.mjs','verify-timing.mjs','verify-scenes.mjs','verify-flight.mjs','freeze-draft.mjs','verify-frozen.mjs'
];
for(const file of (await readdir(dir+'/review')).sort())review.push('review/'+file);
const minimalReproductionFiles=[],reviewAndProofFiles=[];
for(const file of minimal)minimalReproductionFiles.push(await record(dir+'/'+file));
for(const file of review)reviewAndProofFiles.push(await record(dir+'/'+file));
await save('freeze.json',{
  status:'Frozen inactive generated woodland and cave bats',activation:false,baseline:audit.baseline,original:audit.original,
  nativeCandidate:{path:out+'/candidate.sfc',sha256:candidate.candidateSha256},minimalReproductionFiles,reviewAndProofFiles,
  minimalBytes:minimalReproductionFiles.reduce((n,r)=>n+r.bytes,0),
  reproduce:['node scripts/import-raster-art.mjs --preview-spec '+dir+'/import-spec.draft.json','compileWoodlandBats(nativeRaster,nativeFrameMap)','node '+dir+'/verify-frozen.mjs --sources --proof'],limits
});
console.log(JSON.stringify({candidate:candidate.candidateSha256,minimalFiles:minimalReproductionFiles.length,reviewProofFiles:reviewAndProofFiles.length,privateArtifacts:privateArtifacts.length,freezeSha256:sha(await readFile(dir+'/freeze.json'))}));
