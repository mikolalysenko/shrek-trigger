Frozen inactive generated source packet for Thorn Pod / Sewer Pod and Lantern / Bog / Ember / Frost Bat. Root and the art lead approved the native sheets. No active registry, content, engine, canonical ROM, title or music is changed by this packet.

The two original imagegen PNGs, exact prompts and reference hashes are retained. Ten authored pod poses supply fourteen native slots through the original mirror and translated-duplicate relationships. Seven authored bat poses remain distinct, including raised claws and the darkened final face. Calibration duplicates in the source sheets are unused. There is no procedural anatomy or pixel painting.

| Family | Native owners | Graphics / assembly / animation | Frames / cells / full size byte | Decoded / compressed / assembly bytes |
| --- | --- | --- | --- | --- |
| Pods | enemies 41, 42 | 110 / 75 / 80 | 14 / 4 / 0 | 2,848 / 2,024 / 560 |
| Bats | enemies 82, 83, 213, 214 | 104 / 67 / 79 | 7 / 4 / 64 | 2,016 / 1,651 / 280 |

All six current approved palette packets remain byte-identical: pod palettes 100/101 and bat palettes 80–83. Original CT palette hashes are retained separately in the ownership audit. There are no other graphics, assembly, palette or animation owners or pointer aliases in these two families. Native headers, flying flag, AI, statistics, events and animation programs stay unchanged.

The staged 64×64 sampling canvas does not enlarge the native four-cell budget. Use each `native-frame-map.draft.json` with its exact cell origins, frame offsets and native sequence. Every slot preserves the original lowest opaque pixel and horizontal center within half a pixel. Pod frame 6 intentionally extends below the origin; bat frames retain their high flying offsets. New pod bounds differ from original CT by at most two pixels per dimension. Bat wingspan can be six pixels wider, while heights differ by at most two; all pixels fit four cells without clipping or opaque overlap. The fixed pod packing order improves exact tile reuse without changing pixels or native slot order.

Both graphics banks require explicit selection in the established ROM-streaming family contract: pods exceed their original decoded size by 128 bytes, bats by 64. Preserve the default decoded-size guard for all unselected banks. Streaming uses 4,864 extended ROM bytes and no extra WRAM or VRAM. Compressed packets and assembly together grow by 112 bytes against original CT, or 2,087 bytes against the e136 earlier-art baseline (2,088 after allocation alignment). Assembly sizes are unchanged. Root should allocate all production addresses normally; private proof addresses are evidence only.

`native-display-proof.json` records all 56 owner/pose combinations: 224 exact cells and 17,268 exact visible opaque pixels. `native-timing-proof.json` records 38 action/owner cases, 76 complete native cycles and 3,628 exact native ticks with matching VRAM uploads. The native AA scheduler crosses both identical flight rows for bat animation 0 before its terminator; animation 1 is the single-row equivalent. No timing list was changed to make the proof pass.

`native-scene-proof.json` executes the original quiet sewer route from scene 236 through 237, back through 236 and out to world 498. The existing entry fixture seeds chapter state; afterward, only controller input drives the route. The bat warning, two pod formations, native damage, victories, frog scenes, treasure and bridge checks pass. Actual field sprite heap use peaks at 10,592 bytes. All 17 original scene-load unions are audited separately; the conservative maximum is 20,128 bytes in scene 314, leaving 12,640 bytes of the original 32 KiB heap. Other palette variants have bounded display and timing proof, not a full route replay. Independent-core validation remains a production integration check.

The private proof baseline is `e13648757bbeee05dff8ff1cd0048b9cf60c13a24851c5625d7f3623adf06500`; candidate is `a7da90b56794cab5e5034f1598662bc6db42817384a5b7237b9879a70eeffd72`. Evidence stays under `.local/qa/future-sewer-creatures-native-proof`. No newer private actor streams are assumed in the scene audit.

Reproduce the imported pixels and exact 4bpp/compressed/assembly/palette outputs with:

```sh
node assets/imagegen/future-sewer-creatures/prepare-draft.mjs
node assets/imagegen/future-sewer-creatures/review-draft.mjs
node assets/imagegen/future-sewer-creatures/freeze-draft.mjs
```

The private native runner requires the immutable baseline ROM/manifest/record copies and original CT ROM named in `verify-native.mjs`. Run it before `verify-timed-animation.mjs` and `verify-sewer-scene.mjs`. Proof scripts and their manifests are listed separately from the minimum source reproduction set in `freeze.json`; expanded screenshots and traces are excluded.
