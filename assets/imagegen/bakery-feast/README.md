# Bakery feast — inactive generated-source packet

Bread Drummer, Bun Percussionist and Onion Bread Platter now have actual generated raster sources. The scored-loaf musician plays a narrow upright drum; the spiral-bun musician plays a wide horizontal log. Each has two distinct opposite beater contacts. The platter has real level, tilted, underside and eaten views. Root and the sprite lead approved the native models, strike phases and platter placement.

This package is inactive. Production registration, wrappers, raw streaming, independent-core verification, the full contest and canonical outputs remain root-owned.

## Native ownership and geometry

| Art | GFX / ASM | NPC | Animation | Slots | Original source palette | Project palette |
| --- | --- | --- | --- | ---: | ---: | ---: |
| Bread Drummer | 52 / 94 | 122 | 63 | 2 | 174 | 123 |
| Bun Percussionist | 53 / 95 | 123 | 63 | 2 | 174 | 123 |
| Onion Bread Platter | 191 / 187 | 94 | 150 | 8 | 5 | 123 |

All three banks and assembly tables have exactly the named owner. No IDs or native header choices change. Each frame keeps four nonoverlapping16×16cells in a32×32canvas, size0, with standard cell origins `[0,0], [16,0], [0,16], [16,16]`. The musician geometry has no extra offset.

The platter keeps the existing project anchor `[0,8]` and per-frame offsets: frame2 `[0,-9]`, 3 `[0,-28]`, 4 `[0,-14]`, 5 `[0,-30]`, 6/7 `[0,-5]`. Its eight native entries map to source indices `[0,0,1,2,1,2,3,3]`: full0/1, tilted2/4, underside3/5 and eaten6/7. All repetition is exact, with no mirrored or invented source frames. The original source6/7 were lowered level copies; the existing project's eaten-state adaptation is intentionally retained. Original source cell offsets and bounds are recorded separately in the native role maps.

Palette123 keeps its exact12colors and every existing Bakery owner. Palette124 is also unchanged. Source palette174 still belongs to unrelated props, and source palette5 still belongs to Mongo/its related original owners. The private proof writes no palette bytes and asserts all four relevant palette allocations remain unchanged.

## Original roles and execution evidence

Both musicians use animation63, with `[0:15, 1:15]` in all four facings. Its duration allocation contains a fifth padding byte; the whole allocation remains untouched. Platter animation150 uses `[2:15, 3:15]` for mode0 and `[4:15, 5:15]` for mode1 in all facings. All cycles are30ticks. Static level/eaten atlas entries are not presented as additional native timed lists.

The original event280 audit records exact functions for musician objects16–19 and platter objects20–21. All six original loads remain in place. Plate actors start hidden. Original event functions select static frame operands0/1/3 and animation0; all eight source slots remain available, including the existing project eaten pair, without claiming every slot appears in every event branch.

- **12 exact native frame uploads and4,220 exact opaque PPU pixels**, through the actual NPC122/123/94 loaders. Every platter anchor is checked in displayed screen coordinates.
- **2,400 native ticks across16 mode/facing lists**, using original animation and duration pointers and no per-frame pose injection.
- Original scene280 loads all six owned instances with an **8,608-byte field heap** on the fixed proof build. Welcome closure and the unobstructed scene views use ordinary controller input after checkpoint setup. `scene-verification/manifest.json` records the observed scene animation states. Full contest and morning transition are not claimed.

The fixed source build is `2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066`; the in-memory candidate ROM is `ce30ec27afdb4115d613446f0b8fa4f9e5c92bbcde2f6f58958629449ee44731`. No ROM file is written. Native captures settle the requested frame before another30frames. This private proof uses compressed loading; each raw bank also fits the proven32KiB bound for root's scoped production stream selection.

Musician story uses include locations7,91,280,306,339; platter appears at280. Conservative saved-build scene unions fit32KiB, with the largest25,888bytes at91. Those unions are not current production residency proofs. Root must recalculate against the integration build and verify the actual chapter/contest and other shared scenes.

## Review

`review/contact-sheet-1x.png` labels every native slot. `review/platter-anchors-1x.png` shows the exact relative heights. `review/motion-strip-1x.png` shows original frame/tick pairs with placement. `review/motion-review.html` provides a native-scale player with facing selection; `motion-review.gif` repeats four exact30tickcycles, with labeled level/eaten still previews. GIF timestamps round to centiseconds; the HTML and trace manifest use60Hz tick arithmetic. `review/actual-native-crops-6x.png` contains actual PPU crops. Unobstructed original scene captures are under `scene-verification/`.

No actor pixels are procedurally painted, and no outline expansion is applied. Area sampling preserves the generated shapes within the native palette. Fine faces and lacing simplify at1×; scoring, spiral, vest, stick contact and instrument shape carry identity.

## Cost

| Art | Raw | Compressed | Assembly | Comp. + asm. | Growth vs active earlier art |
| --- | ---: | ---: | ---: | ---: | ---: |
| Drummer | 928 | 581 | 80 | 661 | +352 |
| Percussionist | 928 | 604 | 80 | 684 | +304 |
| Platter | 1,024 | 654 | 320 | 974 | +399 |
| Total | 2,880 | 1,839 | 480 | 2,319 | **+1,055** |

Growth versus equivalent original resources is284compressed bytes and992raw bytes; raw growth versus current earlier art is1,504bytes. Exact original and directly compiled current baseline hashes are in `cost-baselines.json`. Assembly sizes do not grow. `integration-proposal.json` gives root the specs, geometry, hashes, preserved palette ownership and raw-stream guard proposal.

## Reproduce

From the repository root, with the user's validated original cartridge available locally:

```sh
node assets/imagegen/bakery-feast/audit-native.mjs
node assets/imagegen/bakery-feast/audit-feast-event.mjs
node assets/imagegen/bakery-feast/prepare-draft.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-feast/drummer-import-spec.draft.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-feast/percussionist-import-spec.draft.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/bakery-feast/platter-import-spec.draft.json
node assets/imagegen/bakery-feast/compile-draft.mjs
node assets/imagegen/bakery-feast/build-review.mjs
node assets/imagegen/bakery-feast/verify-frozen.mjs
```

`build-review.mjs` requires local FFmpeg. Optional execution reproduction is `verify-native.mjs`, then `verify-motion.mjs` and `verify-scene.mjs`; these require the fixed saved QA cartridge. The saved generation outputs and exact prompts are sufficient for deterministic conversion. The previous Porter/Baker PNGs were generation style references only; their paths and hashes are in `provenance.json`, and they are not sampled into these outputs. The built-in imagegen tool was used without an API fallback. No default importer, active registry update or canonical build belongs to this reproduction workflow.
