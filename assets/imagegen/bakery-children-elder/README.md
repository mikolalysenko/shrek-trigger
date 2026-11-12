# Crumb children and Brioche elder — inactive source packet

The two actual generated sheets replace all ordinary visible poses for the Bakery children and elder. The child remains a 22-pixel iced bun with berry buttons; the 29-pixel elder has a lobed brioche head, icing beard, teal robe and cane. Original native blanks and upper-head pieces remain explicit. There is no new generated pose standing in for either blank.

This package is inactive. Production wrappers, import registration, native streaming, whole-chapter tests and canonical outputs remain root-owned.

## Native contract

| Family | GFX / private ASM | Original shared ASM | NPC owners / palettes | Native slots | Animation |
| --- | --- | --- | --- | --- | --- |
| Crumb children | 20 / 245 | 11 | 32 / 123; 64 / 124 | 15, blank14 | 8 |
| Brioche elder | 15 / 246 | 7 | 33 / 123 | 19, blank16; head17/18 | 7 |

Every frame remains 32×32 with four nonoverlapping 16×16 cells, size0. Cell origins are `[0,0], [16,0], [0,16], [16,16]`, giving native OAM coordinates `[-16,-32], [0,-32], [-16,-16], [0,-16]`. There are no added frame offsets. This preserves the existing project private-assembly geometry. The original source cell offsets and pixel bounds are recorded per frame in the role maps and native audit; those original shared tables are not replaced or reclaimed.

Original ASM11 has 12 owners and ASM7 has 26 owners. Only the three named Bakery NPCs use private245/246. Both existing 12-color palette ramps123/124 remain byte-identical; elder has no palette124 owner. The wider palette ownership snapshot includes Porters, Bakers, musicians and the platter. The private proof performs no palette writes.

The child maps 11 generated poses to 14 visible slots with the original exact side mirrors. The elder maps 13 generated full poses to 16 full-body slots with the original exact mirrors. Elder17 is a pointwise crop of the sampled left idle: retain rows0–8 and make rows9–31 transparent. It has exactly56 opaque pixels, bounds `[10,3,14,6]`; elder18 is its exact horizontal mirror. `derived-elder-head-left.png` and `head-fragment-derivation.json` preserve the crop and every source hash. Reimporting this PNG is pointwise exact. No anatomy, outlines or extra colors are painted.

## Review and evidence

- `review/contact-sheet-1x.png`: all 49 owner/frame combinations, including child123, child124, elder123, blanks and fragments.
- `child-draft/native-6x.png`, `elder-draft/native-6x.png`: enlarged complete native sheets.
- `review/motion-strip-1x.png`: original frame/duration lists.
- `review/motion-review.html`: exact 60Hz tick player, selectable native scale and child palette. Elder stays123.
- `review/motion-review.gif`: all tested lists and both child palettes, 240ticks closing every cycle. GIF timing is quantized to centiseconds; use HTML and recorded traces for exact timing.
- `review/actual-native-front-crops-6x.png`: crops of actual settled PPU captures.

`native-verification/manifest.json` records **49 exact native frame uploads and 15,755 exact opaque PPU pixels** through actual NPC32/64/33 field loaders. It verifies both palette ramps in CGRAM, blank tile uploads, source fragments, unchanged shared source assemblies and unchanged cartridge memory. The test settles each preview frame before waiting another30frames. The private ROM is `10f681250945d48f139123e42d83fa04db59ddadb4d47a11cba9859bb6f58664`, derived from saved build `2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066`; no ROM file is written.

`motion-verification/manifest.json` records **2,160 native ticks across12 walk/special lists** using the unmodified animation and duration pointers. Child walks have10tick contacts and40tick cycles; elder walks have15tick contacts and60tick cycles. Blanks and head fragments hold15ticks. No boundary read-through occurs in these programs. These are normal looping animation-state checks, with no per-frame pose injection. All adjacent gait contacts change lower-body pixels.

The original-event scene unions cover locations91,95,276,277,279,292,306. Against the fixed saved build, all fit a conservative32KiB union; the largest is29,728bytes at91. This is a union over event branches, not a simultaneous residency or current production scene proof. Root must recalculate against the integration build, especially after the Porter/Baker batch. These private checks use compressed loading; production raw streaming and independent-core chapter/event coverage remain integration work.

## Cost and integration

| Family | Raw | Compressed | Assembly | Compressed + assembly | Growth vs active earlier art |
| --- | ---: | ---: | ---: | ---: | ---: |
| Child | 2,368 | 1,610 | 600 | 2,210 | +1,214 |
| Elder | 5,760 | 3,322 | 760 | 4,082 | +2,869 |
| Total | 8,128 | 4,932 | 1,360 | 6,292 | **+4,083** |

Both raw banks fit the proven≤32KiB streaming bound. Versus equivalent original resource sizes, compressed growth is+2,361bytes. An original-ROM integration must also retain the shared original assembly tables and allocate1,360private assembly bytes, making its net additional compressed/private-assembly footprint+3,721bytes. The existing project already owns private245/246, so+4,083bytes is the relevant current compressed-allocation growth. Raw growth over active earlier art is5,920bytes. `cost-baselines.json` records direct current-compiler baseline hashes and original cartridge sizes.

Root can register `child-import-spec.draft.json` as raster key `crumb-child` and `elder-import-spec.draft.json` as `brioche-elder`, consume `sequences.native[1]`, and retain all15/19slots. The existing `dissolve:11` mask represents the exact blank slots; preserve that entry rather than replacing it with idle. `integration-proposal.json` supplies full geometry, roles, exact hashes and guard requirements. The importer scans only its registered top-level specs; neither draft becomes active by being present here.

## Reproduce

From the repository root, with the user's validated original cartridge available locally:

```sh
node assets/imagegen/bakery-children-elder/audit-native.mjs
node assets/imagegen/bakery-children-elder/prepare-base.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-children-elder/child-base-spec.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-children-elder/elder-base-spec.json
node assets/imagegen/bakery-children-elder/derive-fragment.mjs
node assets/imagegen/bakery-children-elder/prepare-draft.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-children-elder/child-import-spec.draft.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-children-elder/elder-import-spec.draft.json
node assets/imagegen/bakery-children-elder/compile-draft.mjs
node assets/imagegen/bakery-children-elder/build-review.mjs
node assets/imagegen/bakery-children-elder/verify-frozen.mjs
```

`build-review.mjs` needs local FFmpeg. Native evidence can be reproduced separately with `verify-native.mjs`, then `verify-motion.mjs`; both require the saved QA cartridge named above and use only an in-memory overlay. No default importer run or canonical build is part of reproduction. The final manifest excludes extracted original-game review PNGs, redundant previews and unused captures.

The built-in imagegen tool produced both source PNGs from the saved prompts. The previous generated Baker/Porter PNGs were style references only; their paths and hashes are recorded in `provenance.json`. They are not sampled into the child or elder art and are not needed for deterministic conversion of the saved outputs. No API fallback was used. Fine faces remain simple at actual size; the icing, buttons, beard, robe and cane carry the identity. Static visual approval is separate from native execution evidence.
