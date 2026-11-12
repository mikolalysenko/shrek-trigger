// Finalize a read-only audit. Writes only this inactive report directory.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const dir='assets/raster/hench-family-audit-af3383746691';
const a=JSON.parse(await readFile(dir+'/native-audit.json'));
const roles=JSON.parse(await readFile(dir+'/role-audit.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const save=(name,value)=>writeFile(dir+'/'+name,JSON.stringify(value,null,2)+'\n');
assert.equal(a.baseline.sha256,'af338374669168012da0165d385209c5d3aa9789bb713ef488ef7dcb06e555a7');
assert.equal(sha(await readFile(a.baseline.path)),a.baseline.sha256);
assert.equal(sha(await readFile(a.original.path)),a.original.sha256);
assert.deepEqual(a.owners.map(o=>[o.kind,o.id]),[['enemy',5],['enemy',75]]);
assert.equal(roles.frames.length,37);
assert.equal(a.scenes.length,13);
assert.equal(a.scenes.reduce((n,s)=>n+s.loads.length,0),42);
assert.ok(a.scenes.every(s=>s.unresolvedLoadOffsets===0));
assert.equal(a.animation.lists.filter(l=>l.steps.length).length,36);
assert.equal(roles.exactSourceRelations.length,8);
assert.ok(roles.exactSourceRelations.every(r=>r.kind.startsWith('exact horizontal')&&r.xTransform==='x→-1−x'&&r.dy===0));

const cellPoints=roles.frames.flatMap(f=>f.cellOrigins.flatMap(([x,y])=>[[x,y],[x+15,y+15]]));
const xs=cellPoints.map(p=>p[0]),ys=cellPoints.map(p=>p[1]);
const overlap=roles.frames.map(f=>{
  const points=new Map();
  for(const [x,y] of f.cellOrigins)for(let dy=0;dy<16;dy++)for(let dx=0;dx<16;dx++){
    const k=[x+dx,y+dy].join(',');points.set(k,(points.get(k)||0)+1);
  }
  return{frame:f.frame,overlappingPositions:[...points.values()].filter(n=>n>1).length,maxDepth:Math.max(...points.values())};
}).filter(f=>f.maxDepth>1);
const detached=roles.frames.flatMap(f=>f.connectedComponents.filter(c=>c.pixels<=12).map(c=>({frame:f.frame,...c})));
const scenes=a.scenes.map(s=>({location:s.location,name:s.name,owners:[...new Set(s.loads.map(l=>l.currentId))],loadCount:s.loads.length,loadBodyOffsets:s.loads.map(l=>l.bodyOffset),legacyHeapUnionBytes:s.legacyHeapUnionBytes,with83StreamUnionBytes:s.with83StreamUnion,spareBytes:32768-s.legacyHeapUnionBytes,battleInstructionCount:s.battleCommands.length,allSelectedBattleInstructionsUnchanged:s.battleCommands.every(c=>c.unchangedInstruction)}));
const busiest=scenes.reduce((best,s)=>s.legacyHeapUnionBytes>best.legacyHeapUnionBytes?s:best,scenes[0]);
const proposal={
  status:'Awaiting root direction review; read-only audit complete; image generation not started',
  activation:false,generationStarted:false,baseline:a.baseline,original:a.original,
  identity:{
    workingDescription:'Ordinary stout hobgoblin townsfolk and hired fists',
    majorCastReassignment:false,
    nativeNamesUnchanged:['Hench','Hench'],
    sourceDirection:'Small pot-bellied fairy-tale hobgoblin with a broad blunt nose, heavy brow, readable ears, crooked soft work cap, belted patched tunic, rolled sleeves, broad bare fists and worn boots. Friendly idle expression must also support wary Medina residents; full directional wind-ups and body tumbles retain the original fighting roles.',
    paletteAssignment:'Use the exact original indexed palette: enemy 5 peach skin / purple clothing, enemy 75 gold skin / blue clothing, gray cap and trim in both. No palette writes.',
    distinctions:'No named film/celebrity replacement, new major faction, weapon, horns, swamp-imp waistcoat or leaf-eared rolling mount. Keep this model visibly separate from gfx86 swamp tricksters and named fortress enforcers.',
    designEvidence:[
      {path:'docs/game-design.md',context:'Generic villagers, guards, beasts and refugees fit their era and the Shrek world; medieval kingdoms include outlaw creatures and Farquaad fortress.'},
      {path:'content/medina-dialogue.js',locations:[31,35,36,39],context:'Medina refugees distrust royal strangers, but the inn and market also have peaceful hospitality/business branches.'},
      {path:'content/fortress-dialogue.js',locations:[166],context:'Horner describes contracted beasts; no new named Hench casting is established.'},
      {path:'content/medieval-dialogue.js',locations:[131,201,202],context:'Cathedral guards and disguised support staff; kitchen placement does not make all family instances chefs.'}
    ],
    leadInventory:'sprite_art_pass reports no accepted or in-progress gfx83 source and supports ordinary stout hobgoblin civilians/hired fists. The lead independently viewed original slots 12–17 and agreed with the common side recoil and rear/front wind-up/arm-arc interpretation; tumble-page labels remain this worker\'s inspection. Root approval of this specific direction is still pending.'
  },
  family:a.family,owners:a.owners,
  aliasContract:{graphics:[83],assembly:[38],palettes:{24:[24],23:[23]},frameProgram:[30],durationProgram:[30],externalOwners:[],npcHeaderOwners:[],friendlyEnemyHeaderUse:true},
  geometry:{
    nativeSlots:37,nonblankSlots:37,cellsPerSlot:4,totalOwnerPoseCases:74,totalOwnerCells:296,
    preserve:'All authored cell origins, cell order, overlaps and palette indices; never recenter the displaced strikes and tumbling bodies into one idle box.',
    nativeCellReservationExtentInclusive:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],
    exactMirrorPairs:roles.exactSourceRelations,minimumDistinctSourcePosesIfOnlyProvenMirrorsReused:29,
    forbiddenCollapse:'Rear/front contacts and tumble slots 25–30 are not exact duplicates. Recovery 21/24 is not an exact mirror. Keep distinct authored sources for these.',
    overlapFrames:overlap,
    retainedSourceEffectProposal:detached,
    detachedEffectLimit:'Only six isolated one-pixel index-4 motion flecks are identified. Long arm crescents belong to connected pose silhouettes and require actual generated/source-based art; no procedural anatomy.',
    optionalAuthoringCanvas:{width:96,height:64,sourceNativeOrigin:[48,48],groupAnchor:[0,16],cellOriginFormula:'[native x + 48, native y + 48]; compiler default [48,64] plus group anchor [0,16] restores the original native coordinates',status:'Proposal only; actual compiler output and coverage must be verified after source generation.'}
  },
  animation:{id:30,frameBytes:a.animation.frameBytes.length,durationBytes:a.animation.durationBytes.length,frameSha256:a.animation.frameSha256,durationSha256:a.animation.durationSha256,nonemptyFacingActionLists:36,ownerTimingCases:72,referencedFrames:a.animation.referencedFrames,unchanged:true,importantDurations:{walk:[20,10,20,10],strikeAction4:[16,4,32],strikeAction7:[10,4,10],tumblesActions8And9:[5,5,5]},playbackScope:'review/original-motion.html is source-list playback at 60 Hz, not native execution or proof of event/combat consumers.'},
  budgets:{
    originalCT:{graphics4bppBytes:8928,compressedGraphicsBytes:7491,assemblyBytes:1480,totalCompressedAndAssemblyBytes:8971},
    pinnedPublished:{graphics4bppBytes:8928,compressedGraphicsBytes:7491,assemblyBytes:1480,totalCompressedAndAssemblyBytes:8971,unchangedFromOriginal:true,streamPointer:0},
    target:'Preserve quality and all 37 slots. Prefer exact source/tile reuse within 8,928 decoded bytes; if the replacement exceeds the original guard, request an explicit gfx83 native-stream contract through root integration.',
    placement:'Ordinary compressed graphics allocation, using established extended ROM placement if needed. Keep the fixed 1,480-byte assembly and all owner/program/header contracts. Do not weaken the default decoded-budget guard or add WRAM/VRAM.',
    futureCost:'No generated bank exists yet, so replacement decoded/compressed deltas are not claimed.',
    nativeHeapBytes:32768,busiestAuditedScene:busiest,
    busiestSceneBanks:a.scenes.find(s=>s.location===202).banks.map(b=>({gfx:b.gfx,decodedBytes:b.decodedBytes,streamed:!!b.streamPointer})),
    caveat:'These are verified original-site, all-branch graphics unions on af338; they are conservative load inventories, not observed simultaneous residency. Kitchen spare capacity does not supersede the strict original 8,928-byte bank guard.'
  },
  sceneConsumers:scenes,
  laterProofPlan:[
    'After direction approval, generate one coherent actual source model, then all 29 distinct source poses and the eight verified mirrored counterparts. Submit native 1× and enlarged sheets before freeze.',
    'Compile exact 4bpp/palette/assembly reproduction; check all 74 owner/pose cases, 296 native displayed cells, cell anchoring and composited pixel maps with both unchanged palette ramps.',
    'Execute 72 owner/facing/action cases with unchanged AA30 requests/timers; distinguish native visible upload latency from animation timer equivalence.',
    'Reuse tests/medina-controller.mjs and scripts/independent-medina.mjs for peaceful and hostile inn/market behavior. Existing formations are [75,72,72] and [75,124]; preserve their real event/AI flow.',
    'Observe an original cathedral encounter, an enemy-5 fortress encounter and the kitchen load/interaction context. Do not convert audited load sites into claims of observed route coverage.'
  ],
  limitations:[...a.limitations,'No new source image, native private candidate, upload test or actual scene execution has been produced by this audit.','Object hints in native-audit.json are nearest-entry heuristics, not verified runtime event consumers.','Specific combat meaning/damage windows of actions 4/7/8/9 must be established by execution, not the pose labels.'],
  preservedScope:'No active content/engine/registry, gfx11/35/81 packet, title/music, canonical ROM or gallery changes.'
};
await save('proposal.json',proposal);

const sceneRows=scenes.map(s=>`| ${s.location} | ${s.name} | ${s.owners.join('/')} | ${s.loadCount} | ${s.legacyHeapUnionBytes.toLocaleString('en-US')} | ${s.with83StreamUnionBytes.toLocaleString('en-US')} |`).join('\n');
const text=`# Hench gfx83 — inactive ownership and source proposal

This read-only audit is pinned to published **af338374669168012da0165d385209c5d3aa9789bb713ef488ef7dcb06e555a7** (root commit 210099e). It compares the original USA ROM **06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9**. No image generation or replacement candidate has started. The specific source direction awaits root review.

Propose **ordinary stout hobgoblin townsfolk and hired fists**: broad blunt nose, readable ears, soft work cap, rounded patched tunic, rolled sleeves, large bare fists and boots. The same creature must read as a peaceful Medina resident and a cathedral/fortress combatant. Keep the two exact original ramps: peach/purple for enemy 5, gold/blue for enemy 75, with gray cap/trim. No named cameo, new major faction or weapon is needed. This model should remain distinct from the frozen blue swamp Imps/Rolys and the named enforcers.

The brief follows the generic fairy-tale residents/creatures in [game design](../../../docs/game-design.md), Medina's [refugee and peaceful-business dialogue](../../../content/medina-dialogue.js), [contracted fortress beasts](../../../content/fortress-dialogue.js), and [cathedral staff/guard context](../../../content/medieval-dialogue.js). No existing dedicated Hench casting or accepted source was found; the lead confirms none is held in its inventory. The lead supports this proposal and independently checked original slots 12–17. The tumble interpretation is this worker's inspection, not a second review.

## Ownership and unchanged bytes

| Owner | Native header | Palette |
| --- | --- | --- |
| Enemy 5, Hench | 83,38,24,30,0,0,240,16,16,65 | 24 |
| Enemy 75, Hench | 83,38,23,30,0,0,240,12,20,65 | 23 |

Both are enemy headers, including when used as friendly townsfolk. There are **no NPC header owners or unrelated pointer aliases** for gfx83, asm38, palette23/24 or AA30's frame/duration programs. All graphics, assembly, palettes, animation bytes and AI match original CT. Full size flag is 0: four 16×16 cells per slot. Native stats/reward hashes are recorded without alteration.

| Resource | Original CT | Published af338 |
| --- | ---: | ---: |
| Decoded 4bpp gfx83 | 8,928 | 8,928 |
| Compressed gfx83 | 7,491 | 7,491 |
| asm38, 37 × 40 bytes | 1,480 | 1,480 |
| Compressed graphics + assembly | 8,971 | 8,971 |

The bank is currently legacy loaded. Prefer source/tile reuse within 8,928 bytes; if necessary, root can select gfx83 for the proven four-cell stream path and allocate compressed art in extended ROM. Keep the strict default guard, 32 KiB heap, original cells and fixed assembly extent. No replacement byte estimate is asserted before generation. The kitchen's 1,440 spare bytes are not permission to bypass the original bank guard.

## Complete pose and timing audit

There are **37 nonblank, referenced native slots**. Slots 0–11 are four directional three-phase gaits; slot 12 is a common curled/side-tilted recoil. Slots 13–24 are directional wind-up, long-arm sweep and recovery triplets. Slots 25–36 are directional body tumbles, retaining face/cap/back orientation rather than a uniform ball.

AA30 has 160 frame bytes and 40 duration bytes. Its 36 nonempty facing/action lists give 72 later owner-specific timing cases. Walk uses **20/10/20/10** ticks; the same strike poses run at **16/4/32** in action 4 and **10/4/10** in action 7. Actions 8/9 use **5/5/5**. Actions 0/3/6 hold idle for 5/31/5 ticks, action 5 holds recoil12 for 5, and action 2 is empty. No damage-window or combat interpretation is inferred from this static audit.

Exactly eight full-raster pairs mirror about x = −0.5: 6/9, 7/10, 8/11, 19/22, 20/23, 31/34, 32/35 and 33/36. Those permit 29 distinct authored source poses for 37 slots. The rear/front gait contacts, tumble 25–30 and nearly mirrored recovery 21/24 are **not exact duplicates**. Preserve their distinctions.

Authored four-cell reservations span x **−34..33**, y **−42..2** across the family; do not force all poses into a centered 32×32 canvas. The long left/right arm sweep reaches x −34 / x 33. Cell overlap/order is meaningful in frames 1, 4, 13–15 and 25–30. Every frame's exact cell origins, visible bounds, pixels and components are in [role-audit.json](role-audit.json). Only six isolated one-pixel index-4 motion flecks are identified in 14/17/20/23. Long arm arcs need actual generated/source-based artwork; no procedural anatomy or fabricated effects.

Review [all 37 poses at 1×](review/original-native-1x.png), enlarged [gait0–5](review/original-frames-0-5-3x.png), [gait6–11](review/original-frames-6-11-3x.png), [recoil/strikes12–17](review/original-frames-12-17-3x.png), [strikes18–23](review/original-frames-18-23-3x.png), [tumbles24–29](review/original-frames-24-29-3x.png), [tumbles30–35](review/original-frames-30-35-3x.png), and [slot36](review/original-frames-36-36-3x.png). [Original motion playback](review/original-motion.html) reproduces source lists at 60 Hz; it is not emulator execution.

## Scene consumers and loading

42 original-site loads are verified in the current bytes across 13 locations. No selected original load site is unresolved. Newly inserted loads and all control-flow branches have not been exhaustively decoded. The following are all-branch graphics unions with existing stream exclusions, **not observed simultaneous residency**.

| Location | Original scene name | Owner | Loads | Legacy union | With gfx83 streamed |
| ---: | --- | --- | ---: | ---: | ---: |
${sceneRows}

The largest union is kitchen 202: gfx83 **8,928** + gfx87 **12,288** + gfx111 **10,112** = **31,328**, against 32,768. Explicit streaming of gfx83 would leave 22,400. Preserve all three resources and the kitchen dialogue; this is a context/load audit, not a completed gameplay proof.

Later native validation should cover 74 owner/pose uploads (296 cells), both exact palettes, 72 AA30 cases, peaceful and hostile Medina, a cathedral encounter and enemy 5's fortress encounter. Existing [Medina controller](../../../tests/medina-controller.mjs) and [independent runner](../../../scripts/independent-medina.mjs) provide native inn/market choreography; known formations are [75,72,72] and [75,124]. Keep real event/AI flow and verify display latency separately from timer equality. No such new-art execution is claimed here.

## Reproduction and limitations

Run from the repository root:

\`\`\`sh
node assets/raster/hench-family-audit-af3383746691/audit-native.mjs
node assets/raster/hench-family-audit-af3383746691/audit-roles.mjs
node assets/raster/hench-family-audit-af3383746691/finalize-audit.mjs
\`\`\`

The private baseline, source ROM, reference event JSON and CTViewer scene-name list are required; their fingerprints and code dependencies are recorded in [audit-manifest.json](audit-manifest.json). [native-audit.json](native-audit.json) contains exact ownership, source resource hashes, palettes, programs, geometry, source load offsets and unchanged selected battle instructions. [proposal.json](proposal.json) distinguishes the pending design and future proof plan from measured facts.

Event object hints use nearest function-entry heuristics; they are not runtime object proof. Static facing labels do not prove damage windows. This audit changes no active module, canonical ROM/gallery, title/music, or gfx11/35/81 packet. Actual image generation and a new inactive source directory remain subject to root's direction review.
`;
await writeFile(dir+'/README.md',text);
const list=async root=>{const out=[];for(const e of await readdir(root,{withFileTypes:true})){const path=root+'/'+e.name;if(e.isDirectory())out.push(...await list(path));else out.push(path);}return out;};
const files=(await list(dir)).filter(f=>!f.endsWith('/audit-manifest.json')).sort();
const record=async path=>{const bytes=await readFile(path);return{path,bytes:bytes.length,sha256:sha(bytes)};};
const external=[a.baseline.path,a.original.path,a.evidence.manifest.path,a.evidence.sourceEvents.path,'.local/reference/CTViewer/data/snes_na_scenes.txt','scripts/native-sprite-view.mjs','engine/native-sprites.js','engine/rom.js','engine/expanded-rom.js','engine/compression.js','engine/enemy-ai.js','engine/text.js','docs/game-design.md','content/medina-dialogue.js','content/fortress-dialogue.js','content/medieval-dialogue.js','tests/medina-controller.mjs','scripts/independent-medina.mjs'];
await save('audit-manifest.json',{status:proposal.status,activation:false,generationStarted:false,baseline:a.baseline,original:a.original,files:await Promise.all(files.map(record)),externalEvidence:await Promise.all(external.map(record)),reproduce:['node '+dir+'/audit-native.mjs','node '+dir+'/audit-roles.mjs','node '+dir+'/finalize-audit.mjs'],writesConfinedTo:dir});
console.log(JSON.stringify({status:proposal.status,owners:a.owners.map(o=>o.id),frames:37,sceneLoads:42,scenes:13,originalBudget:proposal.budgets.originalCT,maximumHeapUnion:busiest,overlapFrames:overlap,files:files.length},null,2));
