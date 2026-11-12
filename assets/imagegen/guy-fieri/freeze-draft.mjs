import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileGuyDraft,guyTiers} from './compile-draft.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),prefix='assets/imagegen/guy-fieri/',load=p=>JSON.parse(fs.readFileSync(path.join(d,p))),sha=b=>createHash('sha256').update(b).digest('hex');
const audit=load('draft-audit.json'),{merged,packed,nativeAssemblies}=compileGuyDraft();
const importSpecs=['body/import-spec.draft.json','guy-fieri-mantle/import-spec.draft.json','guy-fieri-halo/import-spec.draft.json'].map(p=>prefix+p);
const handoff={
 key:'guy-fieri',status:'Frozen inactive generated-source replacement for all six training tiers; root owns activation and native emulator integration',
 importSpecs:{body:importSpecs[0],mantle:importSpecs[1],halo:importSpecs[2]},rasterKeys:['guy-fieri','guy-fieri-mantle','guy-fieri-halo'],
 nativeMaps:prefix+'native-roles.draft.json',nativeContract:prefix+'native-contract.json',palettes:prefix+'palettes.draft.json',rendererReference:prefix+'compile-draft.mjs',
 composition:'Tiers0/1/2/5 use the32×32 body. Tier3 layers it at0,32 over32×64 mantle. Tier4 layers it at8,32 over48×64 halo. Effect phase equals native role.phase modulo2. Only actual source sampling, recorded whole-source mirrors and transparent composition are used.',
 coverage:{nativeSlots:133,consumedBodySourceDrawings:35,sourceEffectDrawings:4,missingRoles:[],proceduralNativeSlots:0,limitations:audit.limitations},
 budgets:{sharedTiles:merged.tiles,tileLimit:1024,rawGraphicsBytes:merged.graphics.length,compressedGraphicsBytes:packed.length,assemblyBytes:merged.assemblies.reduce((n,a)=>n+a.length,0),previousRawBytes:29056,previousCompressedBytes:19370,rawDelta:merged.graphics.length-29056,compressedDelta:packed.length-19370,extraWramBytes:0,extraVramBytes:0,nativeCellBudgets:[4,4,4,8,12,4]},
 capacity:{requiresExistingRawStreamForGfx252:true,decodedBankBelow32768:true,ordinaryDecompressionUnionBytes:33024,roomPropsOnlyBytes:3072,rootConfirmedCurrentProductionStreams252:true,actualCandidateSceneValidationPending:true},
 verification:{all133Native4bppReconstructionsPassed:true,compressionRoundTripPassed:true,allSixNativePosePagesVisuallyReviewed:true,sourceFacingAndAliasesReviewed:true,originalNativeFrameListsAndOffsetsPreserved:true,reviewClockHz:6,nativeEmulatorUpload:'Pending activation; no candidate emulator or end-to-end practice claim'},
 nativeAssemblyHashesAfterAuthoredXY:nativeAssemblies.map((a,tier)=>({tier,owner:guyTiers[tier].id,asm:guyTiers[tier].asm,bytes:a.length,sha256:sha(a)})),
 review:{allFrames:prefix+'native-frames.html',motion:prefix+'motion.html',walkContacts:prefix+'walk-contact-strip.png',walkProof:prefix+'walk-contact-audit.json',baseNative:prefix+'base-preview/preview-native-indexed.png',largeHalo:prefix+'native-tier4.png'},
 reproduction:'node '+prefix+'reproduce-draft.mjs',noActiveWrites:true,canonicalRomWritten:false
};
fs.writeFileSync(path.join(d,'handoff.json'),JSON.stringify(handoff,null,2)+'\n');
const stems=['base-v1','actions-v1','motion-v1','contact-v2','effects-v1'];
const paths=[...stems.flatMap(s=>['source-'+s+'.png','prompt-'+s+'.txt','provenance-'+s+'.json','source-'+s+'-components.json']),
 'reference-left-contact.png','reference-left-contact.provenance.json',
 'body/import-spec.draft.json','guy-fieri-mantle/import-spec.draft.json','guy-fieri-halo/import-spec.draft.json',
 'palettes.draft.json','native-contract.json','native-roles.draft.json','native-animation-programs.json','native-animation-audit.json','effect-regions.json','source-roles.json','walk-contact-audit.json',
 'compile-draft.mjs','review-motion.mjs','reproduce-draft.mjs','freeze-draft.mjs','README.md','handoff.json'].map(p=>prefix+p);
const files=paths.map(p=>{const bytes=fs.readFileSync(path.join(root,p));return{path:p,bytes:bytes.length,sha256:sha(bytes)};});
const freeze={key:'guy-fieri',status:'Frozen inactive selected source and native-format evidence',files,importSpecs,dependencies:['scripts/import-raster-art.mjs','engine/native-sprites.js','engine/compression.js','engine/sprites.js','node_modules/pngjs','node_modules/@playwright/test'],native:{frames:133,tiles:merged.tiles,rawBytes:merged.graphics.length,compressedBytes:packed.length,graphicsSha256:sha(merged.graphics),compressedSha256:sha(packed),assemblySha256:merged.assemblies.map(sha),offsetAssemblySha256:nativeAssemblies.map(sha)},unproven:['Actual candidate emulator upload and original practice-scene integration remain root work after activation.'],excludedHistoricalSources:['source-contact-v1.png'],activeRegistryWritten:false};
fs.writeFileSync(path.join(d,'freeze.json'),JSON.stringify(freeze,null,2)+'\n');
fs.writeFileSync(path.join(d,'reproducibility-files.txt'),[...paths,prefix+'freeze.json',prefix+'reproducibility-files.txt'].join('\n')+'\n');
console.log(JSON.stringify({files:files.length,sourceBytes:files.reduce((n,f)=>n+f.bytes,0),native:freeze.native},null,2));
