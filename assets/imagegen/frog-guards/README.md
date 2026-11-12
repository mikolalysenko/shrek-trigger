Inactive generated Frog Guard / Pond Page / Squire packet. Root owns activation; no active registry, engine, canonical ROM, title or music is changed here.

The family preserves enemies 76/77/78/79/145, gfx 98, asm 57, all 26 original four-cell slots, full size 0, exact current palettes 54/55/56 and original AA 84/94. Enemy 224 is genuinely relocated to Guy Fieri gfx 252/asm 232/palette 7; its shared AA 94 remains untouched. No palette write is proposed.

Three unchanged generated PNGs supply all anatomy. The source-only import spec samples 20 poses; action-source cell 7 is superseded by the dedicated long downward tongue source. Exact original mirror pairs produce the 26 native images. Original index 1 bottom masks are reused beneath the generated body at their original coordinates. In slot 21, extraction stops at Y = 3 to exclude the old tongue-outline rails. Generated anatomy occludes 0–24 mask pixels by pose, explicitly recorded. No anatomy, clothing, tongue, shadow or ripple is drawn procedurally.

The source sampling keeps every original body height and lowest body pixel. Profile contact width is 22–23 px versus the original 12–14 px; inflation width is 28/32 px versus 23/27 px; horizontal extended tongue width is 28 px versus 24 px. Original/new source motion uses aligned native origins and unchanged durations. The long downward tongue preserves the original 23×40 bounds. Root and the art lead approved these adaptations.

Reproduce the selected source and native bytes:

```sh
node assets/imagegen/frog-guards/prepare-draft.mjs
node assets/imagegen/frog-guards/verify-frozen.mjs --rebuild
```

The compiler uses the recorded source-shadow JSON and does not need a ROM to reproduce pixels. `audit-native.mjs` and `audit-roles.mjs` separately verify original ownership/roles and regenerate the shadow extraction from the user's original CT ROM. `native-raster.json` is the complete composed native sequence; `import-spec.draft.json` alone is source extraction and must not be activated as the native map. Use `native-frame-map.draft.json` for cell origins, frame offsets and source layers.

The frozen bank is 5,504 decoded bytes / 3,730 compressed bytes, with 1,040 assembly bytes. Compressed-plus-assembly growth is +1,182 versus original CT and +2,210 versus pinned f338 earlier art. An explicit gfx 98 native stream is required because the decoded size exceeds the original 3,488-byte guard. The raw stream separately costs 5,504 extended-ROM bytes; ordinary guards for other banks remain strict. No extra WRAM or VRAM is needed.

The private proof is pinned to f33843436880bf0b7988308e2d684065c8ef6c715641cfc0d3038232f1f8ca15, candidate 56631fca731b7a2412ffe9d47e6436b1fb320814a8ed031777ed807de8d872cb. It covers 130 exact owner/pose uploads, 520 displayed cells and 39,075 opaque pixels. The two original programs passed 140 cases, 280 cycles and 13,704 video ticks with zero measured steady request/display delay.

The original sewer route 236→237→236→498 passes both authored frog scenes, all eight surrounding encounters and native exit flags. A separate original scene 140 encounter uses formation [76,29,76,76], proves three frog field/export/battle pointers and 700 exact visible frog pixels, then normal damage and native victory. QA entry fixtures supply chapter state or a test loadout before entry; controller input drives each route afterward. Independent-core execution, final production placement, remaining frog variant encounters and full forest traversal are integration checks. Source event-load unions do not establish mandatory campaign appearances.

`handoff.json` gives the integration contract. `freeze.json` lists minimal reproducible sources separately from review/native evidence. `native-proof-manifest.json` fingerprints private evidence without adding ROMs or machine snapshots to the source package.
