# Kilnback / Iron Kilnback — frozen inactive source draft

This package replaces all 28 native Kilnback poses with 19 genuinely generated source poses. Both existing twelve-color ramps are retained. It is inactive: there is no `import-spec.json`, registry change, production compiler change, or cartridge output in this package.

The character follows the existing Bakery design: a living armored furnace beast with paired chimney horns, curved iron plates, a terracotta kiln shell, an ember grille belly, and a single articulated masonry tail. The design basis is `docs/bakery.md`, `docs/game-design.md`, `docs/credits.md`, and the previous authored design in `engine/bakery-art.js`. The immutable ownership/palette snapshot is `source-family.json`. Original cartridge poses were inspected for their roles and geometry; their pixels are not sampled into this artwork.

## Sources and conversion

All generation used the built-in image tool. Exact prompts and full PNGs are retained. `source-base-v1.png` supplies nine gait poses. `source-actions-v2.png` supplies nine selected action poses. Its erroneous two-tail cell4 is explicitly excluded; `source-back-tremor-v1.png` supplies the correct single-tail pose. `source-actions-v1.png` is retained only as the actual edit input for v2 and is never sampled. `provenance.json` records this chain.

The final importer uses a consistent 50 px standing scale in a 64×64 canvas and uniform 0.75 horizontal sampling. Area sampling quantizes directly to the existing palette. Alpha 128 is used for the base/single-back source; alpha 192 separates the action sheet's faint connecting halo without painting a mask. The airborne source retains its separate charcoal shadow. The compact charged pose is lower because its knees, shoulders and hands are actually folded in the source. There is no procedural anatomy, outline expansion, or idle substitution.

At 1×, the chimneys, curved shell, belly fire and tail carry recognition; the small muzzle/eye details are necessarily simpler than the large source PNG. The art lead approved the base and the complete 50 px sheet, including the distinct three profile gait contacts and compact action scale.

## Native contract and exact costs

| Item | Candidate | Original |
| --- | ---: | ---: |
| Graphics 139, raw | 18,784 bytes /587 tiles | 10,528 bytes |
| Compressed graphics | 13,381 bytes | 8,623 bytes |
| Assembly 132 | 3,360 bytes | 3,360 bytes |
| Compressed graphics + assembly | 16,741 bytes | 11,983 bytes |
| Allocated compressed/assembly growth | 4,758 bytes | — |
| Raw-bank growth | 8,256 bytes | — |

Against the saved active earlier-art Kilnback, the bank grows from 4,832 raw and 2,195 compressed bytes. Its previous compressed+assembly total was 5,555 bytes, so the relevant current-build allocation increase is **11,186 bytes**. The table above separately reports growth against the original cartridge allocation.

The raw bank is below the32 KiB /1,024-tile streaming ceiling. There are exactly twelve 16×16 cells per pose, in the native three groups of four. Both owners retain their headers, animation 104, AI, statistics and native slot count: enemy 155 / palette 186 and enemy 156 / palette 187. The palettes are exclusive and unaliased. All 28 slots are visible; none is blank.

`native-roles.json` gives every source mapping and the original cell geometry. Native 12 is an airborne hop; 13 is overhead windup; 14 is the open-hand release/landing; 15 is a compact charged guard. Slots 16–27 retain the rapid directional tremor. Original exact mirror pairs are preserved, as are 24←8 and 27←11 reuse. The existing project `frameOffsets` are unchanged. The source-derived cell origins replace the old artwork's geometry explicitly in `draft/family.json`.

Twenty-six poses use nonoverlapping cells. Only 6 and 9 use overlap, with exactly twelve cells and unchanged native cell order. Their repeated coverage samples the same indexed source pixel, so the colors agree by construction and by the packed-pixel round trip. Each has 634 overlapping opaque pixel positions, verified in both palette variants through the original native OAM renderer. Maximum coverage is three cells. No tail, horn, claw or arm is clipped. `overlap-origins.json` binds the layout to the source frame hash; 9 uses the exact reflected origins.

The active generic compiler still rejects overlap. `compile-cells.mjs` is a private root-applicable proposal, not a production bypass. The suggested integration is to recognize `cellOverlapFrames:[6,9]` only with the explicit 28-frame `frameCellOrigins`; retain the default overlap rejection for all other frames/families, validate the declared frame list, and keep all bounds, coverage, twelve-color and tile-count checks. Because all cells sample one indexed frame, repeated source positions cannot contain different colors. Root can then compile the same geometry with the ordinary tile interner and select graphics 139 for the existing guarded streaming path.

## Verification and review

`native-verification/manifest.json` records 56 exact native tile uploads, 78,490 visible PPU pixel checks, all twelve CGRAM colors in both variants, and both overlap layouts. Captures wait at least 30 frames after settled DMA. The private overlay uses the saved 8 MiB cartridge2e2a574e… entirely in memory; its resulting hash is d1de85878ab85b619146e937991c37fa5a56e9b5c44c92a9aedca3585b52817c. The isolated field heap is 19,744 bytes. Cartridge bytes remain unchanged during the native run.

`motion-verification/manifest.json` records 1,650 original native animation ticks across 11 lists. The four gaits change every 15 ticks; the directional tremors change every 5 ticks; the overhead sequence 13→14→15 holds 15/5/25 ticks. These traces restore the original animation/timing pointers and use ordinary looping animation state. They do not inject individual poses each frame. The zero duration is a native list terminator; the trailing repeated frame after it is not an extra invented animation phase.

Review files:

- `review/contact-sheet-1x.png`: labeled native 0–27, both palette ramps.
- `draft/native-4x.png`: enlarged indexed art for cluster/geometry inspection.
- `review/overlap-layout.png`: source poses 6/9 beside numbered native cell overlays.
- `review/motion-strip-1x.png`: original ordered frame lists with frame/tick labels.
- `review/motion-review.html`: self-contained player with native1×/2×/4×, palette selection, pause and tick step.
- `review/motion-review.gif`: all multi-frame lists in both palettes; the GIF container rounds time to centiseconds, while HTML uses exact 60 Hz tick arithmetic.
- `native-verification/*native-frame-*.png`: settled actual native PPU captures, including 6/9 and the raised-arm Iron variant.

The original scene-union estimates are 24,160bytes at 289,18,944 at 304 and18,784 at 456. Using the actual frozen 2e2a574e saved-build resources gives 22,336 / 18,944 / 18,784 bytes. These are conservative all-branch load unions, not actual residency or battle proofs. Master Glaze and other ongoing art can change those totals; root must recompute them for the activation build.

Unfinished integration evidence is explicit: this package has not activated the raw streaming selector, run Snes9x/bsnes, or replayed the real Kilnback/Iron Kilnback greeting, lightning response, battle, reward or exit routes. The accepted private proof uses the compressed solo loader. Root retains those production/scene checks; no extra OAM cells or VRAM are proposed.

## Reproduce

From the repository root, with the user's validated original ROM and the existing saved proof cartridge available:

```sh
node assets/imagegen/kilnback/audit-native.mjs
node assets/imagegen/kilnback/prepare-draft.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/kilnback/import-spec.draft.json
node assets/imagegen/kilnback/compile-draft.mjs
node assets/imagegen/kilnback/verify-native.mjs
node assets/imagegen/kilnback/verify-motion.mjs
node assets/imagegen/kilnback/build-review.mjs
```

Review GIF creation needs the already available `ffmpeg`; other conversion uses the repository's `pngjs` and native compiler helpers. No API key is read. `reproducibility-files.txt` is the minimal frozen handoff, excluding unused scale trials, the diagnostic cover search, original extracted artwork and redundant captures. `freeze.json` binds every required file and the exact graphics, assembly, palette and mapping hashes. Run `node assets/imagegen/kilnback/verify-frozen.mjs` for a read-only hash, pack and evidence check.
