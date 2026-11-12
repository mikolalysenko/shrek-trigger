# Crumb Hunter / Kiln Hunter — frozen inactive source draft

This package supplies all 21 native Hunter slots from 16 generated source poses, shared by Crumb Hunter enemy 1, Kiln Hunter enemy 61 and field NPC 76. Both existing twelve-color palettes remain exact. It contains no active import spec, production edit or cartridge output.

The Bakery design is a compact crocodilian scavenger: broad muzzle, tooth necklace, brown leather pack, belt, loincloth, clawed hands and one tail. The design basis is `docs/bakery.md`, `docs/game-design.md`, `docs/credits.md`, `content/bakery-dialogue.js` and the authored identity in `engine/bakery-art.js`. Native actions use claws; the original poses do not show a separate held weapon. `source-family.json` freezes the existing family ownership, colors and offsets.

## Sources and native roles

The full built-in image-generation sources and exact prompts are retained. `source-base-v1.png` is the actual model/reference input for both subsequent calls. The final nine gait poses come from `source-base-v2.png`, a genuine source edit strengthening the eye sockets and mouth. Seven action poses come from `source-actions-v1.png`; its empty eighth cell is excluded. `provenance.json` records the source chain and hashes. Original cartridge artwork was decoded to inspect roles and geometry, and is not sampled into the replacement.

The selected conversion uses a consistent 28 px standing scale, uniform 0.85 horizontal sampling and a 32×32 indexed canvas. Area sampling maps directly to the existing palette. There is no procedural anatomy, native pixel painting or outline expansion. Ten of the twelve palette colors appear in these frames; all twelve hardware entries are retained and checked.

The native role audit corrects the earlier procedural facing inversion: slots 0–2 face away and 3–5 face forward. Slots 6–8 face left, and 9–11 are exact mirrored counterparts. Slots 12–15 retain directional hunched preparations; 16 retains the startled reaction and generated detached ivory impact marks. Slots 17–20 are distinct raised-arm, open-hand and forward-claw second phases. Original mirror pairs 9←6, 10←7, 11←8, 15←14 and 20←19 remain explicit. All 21 slots are visible; there are no blank or idle-substituted roles.

The art lead approved the full native sheet: the muzzle, single tail, necklace and pack read clearly, front/back directions are distinct, and the action poses remain recognizable. Eyes remain small at actual size. The fixed muted palette limits contrast, so silhouette and gesture carry more detail than the face at 1×.

## Native contract and cost

Graphics 79, assembly 34 and animation 26 have exactly three owners: enemy 1, enemy 61 and NPC 76. Enemy 1 and NPC 76 use palette 16; enemy 61 uses palette 17. Both palette records are exclusive and unaliased. The shared field owner also appears in alternate town and ending branches, beyond the Bakery theft.

The candidate keeps four nonoverlapping 16×16 cells at `[[0,0],[16,0],[0,16],[16,16]]`. Assembly remains 40 bytes per native slot. The existing project offset for frame 12 remains `[0,3]`; every other offset is `[0,0]`. No additional cell, VRAM, geometry field or compiler exception is required. Native headers, animation/duration bytes, AI, statistics and rewards are outside the art change.

| Resource | Candidate | Original CT | Active earlier art |
| --- | ---: | ---: | ---: |
| Raw graphics | 5,536 | 3,808 | 1,728 |
| Compressed graphics | 3,197 | 3,266 | 769 |
| Assembly | 840 | 840 | 840 |
| Compressed + assembly | 4,037 | 4,106 | 1,609 |
| Candidate allocation change | — | −69 | **+2,428** |

The raw bank has 173 tiles and is below the proven 32 KiB streaming ceiling. Raw growth is 1,728 bytes against original CT and 3,808 against the active earlier art. The active source family and compiled earlier-art hashes were checked against the snapshot during freezing. The relevant compressed/assembly planning figure is **+2,428 bytes**. If root chooses raw streaming, raw+assembly occupies 6,376 bytes in its respective pools; this is separate from the compressed comparison.

## Verification and limitations

`native-verification/manifest.json` records **63 exact native uploads**, covering all 21 slots for each of the three actual owners, plus **23,175 opaque PPU pixel checks**. Every opaque pixel equals its expected CGRAM color at native brightness and native coordinates; both twelve-color palette records match. Captures wait at least 30 frames after settled DMA. The actual `82 4C` field NPC loader is exercised, not only the enemy proxy. Isolated field heap use is 6,496 bytes.

The private compressed overlay is applied in memory to saved build `2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066`. Its exact resulting hash is `03843402e03dbf1b687b5f975facfa8dca42c1ad27a53c4d7a4f0b89c3ba00f1`. No ROM file, shared checkpoint or active source is written; cartridge bytes remain unchanged during execution.

`motion-verification/manifest.json` records **1,950 exact native ticks across 13 scenarios** through actual NPC 76: four gaits, the shared startled hold, four fast gestures and four slow gestures. The original animation/duration pointers are restored and ordinary looping state runs without injecting individual poses. Gait contacts hold 15/10/15/10 ticks; fast gesture pairs hold 5/5 and slow pairs 31/31. The shared startled pose holds 5 ticks. This proves those original lists, not original event or combat transitions.

Conservative event-load unions include locations 1, 2, 5, 12, 93, 252, 270, 273, 282, 287, 288, 298, 299, 302, 305, 378 and 430. The saved-build candidate unions at 5 and 282 are 35,872 and 32,960 bytes, exceeding a 32 KiB compressed-loader heap if every branch were resident together. These are all-branch upper bounds, not actual simultaneous residency. Root must select the proven four-cell streaming path for graphics 79 or establish actual scene residency, and recompute current co-loads at integration. The original family-size rejection remains unchanged in production.

This package does not claim the complete theft/chase, town/ending routes, battles, Snes9x/bsnes verification or candidate raw-stream execution. Those remain root integration checks. The existing independent NPC checker does not yet include Bakery owners; its actor selection must explicitly include both enemies and NPC 76 before it can certify them.

## Review and reproduction

- `review/contact-sheet-1x.png`: labeled native 0–20, Crumb palette 16 above Kiln palette 17.
- `draft/native-6x.png`: enlarged source-derived indexed sheet.
- `review/motion-strip-1x.png`: original ordered frame/tick lists.
- `review/motion-review.html`: self-contained exact 60 Hz player, palette selection, native 1×/2×/4×/6×, pause and tick step.
- `review/motion-review.gif`: both palettes in a short motion review. GIF timing rounds to centiseconds, and its last partial gait cycle resets at the clip boundary; the HTML has neither limitation.
- `native-verification/*native-frame-*.png`: settled actual native captures; the crop in `review/npc76-frame4-native-crop-6x.png` enlarges the actual NPC 76 capture without modifying its pixels.

From the repository root, using the user's validated original ROM, existing event extraction and saved proof cartridge:

```sh
node assets/imagegen/crumb-hunters/audit-native.mjs
node assets/imagegen/crumb-hunters/prepare-draft.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/crumb-hunters/import-spec.draft.json
node assets/imagegen/crumb-hunters/compile-draft.mjs
node assets/imagegen/crumb-hunters/verify-native.mjs
node assets/imagegen/crumb-hunters/verify-motion.mjs
node assets/imagegen/crumb-hunters/build-review.mjs
node assets/imagegen/crumb-hunters/verify-frozen.mjs
```

Conversion uses the repository's native compiler and `pngjs`; optional GIF reproduction uses installed `ffmpeg`. `reproducibility-files.txt` is the exact minimal commit whitelist. It excludes abandoned sampling trials, original extracted artwork and redundant diagnostic captures. `freeze.json` binds source, mapping, geometry, packed output, palettes and review evidence. `integration-proposal.json` is the root-applicable activation handoff. No API credentials are used.
