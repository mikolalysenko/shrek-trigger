# Bread Porters and Cinnamon Bakers — frozen inactive draft

This package replaces both 23-slot civilian banks with actual generated source art. Graphics 24 / assembly 12 belong only to Bread Porter NPCs 30 and 62; graphics 25 / assembly 13 belong only to Cinnamon Baker NPCs 31 and 63. There are no blank slots. All four variants keep their existing twelve-color village palettes, native animations and four-cell allocations. No active registry, engine, content or cartridge output is changed.

The design follows the existing Bakery documents and authored identities: living baked people protected by Mongo, rather than humans in costumes. The porter has a scored golden loaf head, teal work clothes, cream apron and wooden baker's peel. The baker has a round cinnamon-spiral head, teal dress and cream apron. `source-families.json` and `shared-village-owners.json` freeze the ownership and palette contracts.

## Source art and roles

All four full PNGs and prompts were produced with the built-in image-generation tool. The porter base establishes the material/style reference for the baker base. Each action source references its corresponding base model. `provenance.json` records every actual input, output path and hash. Original cartridge poses were decoded and viewed before generation; their pixels are not sampled into this art.

The porter uses twelve base poses and four selected action poses. Its total base scale is 29 px including the peel, with a 26 px unarmed standing-body calibration for actions. Back-facing base poses are reflected to keep the peel in the same anatomical hand as the front views. Original side and dance mirror pairs remain exact. Native slots 16/17 are the paired crouch, 18/19 the middle dance rise, 20/21 the raised-arm phase, and 22 the complete fallen body. The special sequence is unarmed, matching the original prop absence.

The baker uses fifteen base poses and two selected dance poses at a 29 px calibration. Each facing keeps its four walking contacts. Slots 20–22 retain the front dance and paired turns. The action sheets' standing calibration cells provide scale only, and empty cells are explicitly excluded. Area sampling uses alpha 128 and coverage 0.28. No native anatomy, outlines or facial pixels are drawn procedurally.

The lead approved both base models, complete native sheets and North Bakery recolors. Loaf scoring, peel, bun spiral, apron and limb separation remain readable in both ramps. Faces are deliberately simple at actual size. Baker action shading has a slightly warmer edge than the base source; the shared palette and model remain consistent. Every adjacent gait contact differs in both full-frame and lower-body pixels, recorded in each bank's `verification.json`.

## Palette and geometry contracts

Palette 123 also serves crumb children, the brioche elder, percussionists and onion-bread platters. Palette 124 also serves the North Bakery child. **Both complete palette records remain byte-for-byte unchanged**, including all twelve colors; the private proof writes no palette bytes. The new porter uses nine palette colors and the baker eleven, while all twelve CGRAM entries are checked for every owner.

Both banks use standard origins `[[0,0],[16,0],[0,16],[16,16]]`, no overlap and no additional cells or VRAM. Assembly is 920 bytes per family. Existing project offsets are unchanged, with no extra frame offset. Source-specific original cell positions and bounds remain documented in the native role files. No compiler geometry extension is required.

| Resource | Porter candidate | Baker candidate |
| --- | ---: | ---: |
| Raw graphics | 5,856 / 183 tiles | 7,008 / 219 tiles |
| Compressed graphics | 3,146 | 4,074 |
| Assembly | 920 | 920 |
| Compressed + assembly | 4,066 | 4,994 |
| Growth versus original CT | 905 | 1,679 |
| Growth versus active earlier art | **2,265** | **3,394** |

Original CT raw/compressed sizes are 2,752/2,241 and 2,560/2,395 bytes. Active earlier-art sizes are 2,048/881 and 1,664/680, checked directly from the unchanged source family. Combined compressed+assembly cost is **9,060 bytes**, a **5,659-byte increase** over active earlier art and 2,584 over original CT. Combined raw graphics are 12,864 bytes; each bank is well below the 32 KiB streaming ceiling. Root owns raw-stream selection and allocation.

## Native and motion evidence

The private overlay uses saved cartridge `2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066` entirely in memory. Its resulting hash is `f68b467ce635581fa6124b8c482af06190b20e26599a0b128a4e034678f43e79`. All **92 native frame uploads** and **39,608 opaque PPU pixels** pass through the actual NPC 30/62/31/63 loaders. Exact RGB comes from the expected palette at native brightness and coordinates. Captures wait at least 30 frames after settled DMA. Isolated heaps are 6,816 bytes for porter and 7,968 for baker. Cartridge bytes remain unchanged during execution.

The original animation and duration pointers run **3,600 exact ticks across 18 scenarios**, without per-frame pose injection. Both walking cycles hold each contact for ten ticks. The porter's dance is `16→21→19→17→20→18` with `12/16/8/12/16/8` ticks, and its fallen pose holds five ticks.

The baker has a real original list-boundary behavior: animation 22's final dance mode lacks a terminator inside its own declared span. The loader reads the following facing's idle, or the next animation's first byte for facing 3, for five ticks before the next zero duration loops. Thus the front dance is `20/21/22/1` for ten ticks each, followed by `2` for five ticks: **45 ticks**, not 40. Walk-and-dance modes have an **85-tick** cycle. The private proof preserves and hashes the original adjacent bytes and checks every facing. This behavior is shown in the review and freeze metadata; it is not silently trimmed or repaired.

Shared source uses include locations 7 and 95 as well as 275–280, 282, 292 and 430. Conservative saved-build all-branch unions are recorded in `current-co-loads.json`; location 282 totals 32,960 bytes, over 32 KiB if all branches were simultaneously resident. This is not actual residency evidence. Root must recompute current co-loads and select the validated streaming path or prove the complete scene allocation.

These are compressed solo field proofs. Actual feast/chapter/return routes, production raw streaming and Snes9x/bsnes runs remain root integration work. The existing main independent suite already includes Bakery villagers. Native event choreography, ownership, animation bytes and shared palette values are outside this art change.

## Review and reproduction

- `review/contact-sheet-1x.png`: all four variants, labeled native slots 0–22.
- `porter-draft/native-6x.png` and `baker-draft/native-6x.png`: enlarged native cluster review.
- `review/motion-strip-1x.png`: original frame/tick order, including the baker's boundary tail.
- `review/motion-review.html`: exact 60 Hz interactive player with palettes, native scale, pause and tick stepping.
- `review/motion-review.gif`: representative loops in both palettes; GIF centisecond timing and partial-cycle clip reset are explicit limitations.
- `review/actual-native-front-crops-6x.png`: enlarged actual PPU pixels, unchanged from the full-room captures.

From the repository root, with the user's validated original ROM, event extraction and saved proof cartridge available:

```sh
node assets/imagegen/bakery-civilians/audit-native.mjs
node assets/imagegen/bakery-civilians/prepare-draft.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-civilians/porter-import-spec.draft.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-civilians/baker-import-spec.draft.json
node assets/imagegen/bakery-civilians/compile-draft.mjs
node assets/imagegen/bakery-civilians/verify-native.mjs
node assets/imagegen/bakery-civilians/verify-motion.mjs
node assets/imagegen/bakery-civilians/build-review.mjs
node assets/imagegen/bakery-civilians/verify-frozen.mjs
```

`pngjs` and native compiler helpers come from the repository; GIF reproduction uses installed `ffmpeg`. The exact minimal commit whitelist is `reproducibility-files.txt`. Original extracted artwork, preliminary previews, diagnostics and redundant captures are excluded. The current importer scans one active spec per immediate package directory, so root can register these two named draft specs through catalogue entries or separate top-level spec directories. This package contains neither active registration. No API credentials are used.
