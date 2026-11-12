import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compileDraft,nativeMap} from './prepare-draft.mjs';
const dir='assets/imagegen/court-beast',sha=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(dir+'/'+p));
const before=await json('draft-audit.json');
for(const name of ['movement','upright','reactions','compact-actions']){
  const p=await json('provenance-'+name+'-v1.json');
  assert.equal(sha(await readFile(p.source)),p.sourceSha256,'Unmodified generated source '+name);
  assert.equal(sha(await readFile(p.prompt)),p.promptSha256,'Exact source prompt '+name);
  for(const r of p.references)assert.equal(sha(await readFile(r.file)),r.sha256,'Exact generation reference');
}
const after=await compileDraft();for(const key of ['graphicsSha256','compressedSha256','assemblySha256'])assert.equal(after[key],before[key],'Reproducible '+key);
const map=await json('native-frame-map.draft.json'),roles=await json('native-role-audit.json'),resources=await json('native-resource-audit.json'),review=await json('review-audit.json');
assert.equal(new Set(nativeMap.map(n=>typeof n==='number'?n:n.frame)).size,25);
for(const f of map.frames)assert.equal(f.proposedNativeBounds[1]+f.proposedNativeBounds[3]-1,f.nativeBottomPixel,'Original vertical bottom-pixel displacement '+f.frame);
assert.ok(review.sourceMirrors.every(m=>m.allTilesReused));
const sourceNames=['movement','upright','reactions','compact-actions'];
const minimalFiles=[...sourceNames.flatMap(n=>['source-'+n+'-v1.png','prompt-'+n+'-v1.txt','provenance-'+n+'-v1.json']),
  'import-spec.draft.json','preview-raster.json','preview-import.json','native-resource-audit.json','native-role-audit.json','native-frame-map.draft.json',
  'prepare-draft.mjs','pack-cells.mjs','inspect-native.mjs','review-draft.mjs','freeze-draft.mjs',
  'graphics.4bpp','graphics.ct-lz','assembly.bin','palette-185.bin','palette-249.bin','draft-audit.json','review-audit.json',
  'native-frames-1x.png','native-frames.html','motion.html'];
const files=[];for(const file of minimalFiles){const bytes=await readFile(dir+'/'+file);files.push({file:dir+'/'+file,bytes:bytes.length,sha256:sha(bytes)});}
const active=review.activeProceduralComparison,source=roles.capacity,aligned=n=>(n+1)&~1;
const memory={cells:8,sizeClass:1,frames:31,tiles:after.tiles,decodedBytes:after.graphicsBytes,compressedBytes:after.compressedBytes,assemblyBytes:2480,
  originalCT:{decodedBytes:source.originalDecodedBytes,compressedBytes:source.originalCompressedBytes,assemblyBytes:2480,decodedGrowth:after.graphicsBytes-source.originalDecodedBytes,compressedAndAssemblyPayloadGrowth:after.compressedBytes-source.originalCompressedBytes,alignedAllocationGrowth:aligned(after.compressedBytes)-aligned(source.originalCompressedBytes)},
  activeEarlierArt:{decodedBytes:active.decodedBytes,compressedBytes:active.compressedBytes,assemblyBytes:2480,decodedGrowth:after.graphicsBytes-active.decodedBytes,compressedAndAssemblyPayloadGrowth:after.compressedBytes-active.compressedBytes,alignedAllocationGrowth:aligned(after.compressedBytes)-aligned(active.compressedBytes)},
  streaming:{required:true,bank:133,extendedRawCopyBytes:after.graphicsBytes,ordinaryCompressedPointerRetained:true,nativeTileLimitBytes:32768,explicitFamilySelectionRequired:true,allOwners:[144,199],nativeFamilyProofPerformed:false},
  originalHalfCapacityFromRoot:{freeBytesBefore:43780,netFreeBytesAfterPayloadGrowth:43780-(after.compressedBytes-active.compressedBytes),netFreeBytesAfterTwoByteAllocationGrowth:43780-(aligned(after.compressedBytes)-aligned(active.compressedBytes)),scope:'Arithmetic projection only. Root must run its complete allocator; same-bank fragmentation and other simultaneous changes are not assumed.'},
  scenes:roles.scenes.map(s=>({location:s.location,allConditionalOriginalDecodedBytes:s.allConditionalOriginalBytes,legacyTotalWithCandidate:s.allConditionalOriginalBytes-source.originalDecodedBytes+after.graphicsBytes,legacyHeapCapacity:32768,overflow:Math.max(0,s.allConditionalOriginalBytes-source.originalDecodedBytes+after.graphicsBytes-32768)})),
  extraHardwareWramAllocation:0,extraHardwareVramAllocation:0,extraCells:0,extraFrameIds:0,
  caution:'Zero new hardware allocation does not mean legacy loading fits. Scene438 reaches38016 bytes in the conservative original-branch inventory; select/prove native ROM streaming before activation. No prospective streamed co-load exclusions were counted.'};
const handoff={status:'Frozen inactive source draft; root accepted the model and corrected native roles for integration',activation:false,
  sourceType:'built-in imagegen raster sources',sourceFiles:sourceNames.map(n=>dir+'/source-'+n+'-v1.png'),sourcePrompts:sourceNames.map(n=>dir+'/prompt-'+n+'-v1.txt'),
  ownership:{graphics:133,assembly:127,animation:99,actors:resources.actors.map(a=>({key:a.key,enemy:a.enemy,header:a.header,palette:a.palette,colors:a.approvedColors})),foreignOwners:[],pointerAliases:resources.ownership},
  sourceCoverage:{nativeFrames:31,uniqueNativeFrames:31,authoredSourcePosesUsed:25,wholeSourceMirroredFrames:[9,10,11,28,29,30],mirrorTilesEntirelyReused:true,proceduralFallbackFrames:0,blankFrames:0,unusedSourceFrames:[12,13,14,16,25,26]},
  geometry:{file:dir+'/native-frame-map.draft.json',width:64,height:64,cellCount:8,anchor:[0,8],nativeBottomDisplacementsExact:true,sideAttackXDisplacements:[10,-10],originalAnimationAndTimingRetained:true,originalHeaderSizeRetained:true,contactScaleOverride:{source:'source-compact-actions-v1.png',cell:3,scale:1.08,reason:'Match the original40px contact height and adjacent40px phases; still fits eight cells.'}},
  records:{graphicsSha256:after.graphicsSha256,compressedSha256:after.compressedSha256,assemblySha256:after.assemblySha256,palettes:after.palettes.map(p=>({id:p.id,sha256:p.sha256}))},memory,
  reproduction:{sourceHashesVerified:true,referenceHashesVerified:true,repeatCompilationExact:true,allNativeTilesDecodedBackToSource:true,commands:['node assets/imagegen/court-beast/prepare-draft.mjs','node assets/imagegen/court-beast/review-draft.mjs','node assets/imagegen/court-beast/freeze-draft.mjs'],normalBuildUsesNoDraft:true},
  review:{root:{accepted:true,scope:'All-frame1× atlas and enlarged10–19; model and corrected roles accepted for integration.'},author:{all31FramesAt1xAnd3x:true,bothPalettes:true,completeCellCoverage:true},contact:'native-frames.html',nativeSheet:'native-frames-1x.png',motion:'motion.html',motionScope:'Illustrative8fps pose loops, not emulated original animation timing.'},
  limitations:['Family-specific native field, battle, VRAM, independent-core and scene rendering proof remains outstanding. Size1 support is proven elsewhere, not by this inactive package.',
    'The generated beast uses a new silhouette and a repacked eight-cell layout; proposedNativeBounds and originalBounds are both retained for every slot. Original foot displacements and native actor/event anchors stay explicit.',
    'Slot19 is a distinct visible source pose but is unreferenced by the standard animation99 bytes. Its recovery label is descriptive, not proof of a particular mechanic.',
    'Six right-facing frames are documented complete-source mirrors. Broken-mask asymmetry mirrors with the rest of each sprite.',
    'The original procedural direction list reverses native slots6–11. Use the supplied explicit native sequence; do not map these through the old facing list.'],
  rootIntegration:['Import the selected source under key court-beast only; both enemy owners share the one bank. Keep import-spec.draft.json inactive until explicitly selected.',
    'Compile the31 entries of sequences.native[1] using the supplied frameCellOrigins, then add anchor[0,8] and each recorded frameOffset. Do not retain the earlier blanket+4 assembly adjustment.',
    'Retain gfx133, asm127, palette185/249, animation99, all headers, AI, battle mechanics and events. Preserve both exact palette binaries.',
    'Select gfx133 only through the guarded native4/8/12-cell ROM-streaming family contract, checking both size1 owners144/199. Preserve ordinary compressed graphics for native tools/readers.',
    'Verify all62 native frame/palette uploads and actual scenes198 and438, including transformation, priority/cell anchoring, native damage and victory, before publishing.'],
  minimalFiles:files,excludedWork:'Original-ROM inspection screenshots, failed/trial sampling directories and redundant preview PNGs are not required in the minimal frozen source package.'};
await writeFile(dir+'/handoff.json',JSON.stringify(handoff,null,2)+'\n');
await writeFile(dir+'/freeze.json',JSON.stringify({status:handoff.status,activation:false,files,records:handoff.records,memory,review:handoff.review,limitations:handoff.limitations},null,2)+'\n');
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),graphics:after.graphicsBytes,compressed:after.compressedBytes,assembly:2480,activePayloadGrowth:memory.activeEarlierArt.compressedAndAssemblyPayloadGrowth,activeAlignedGrowth:memory.activeEarlierArt.alignedAllocationGrowth,scene438:memory.scenes.find(s=>s.location===438)}));
