Mire Golem / Iron Golem — frozen inactive source packet
====================================================

The approved model uses actual generated stone bodies, moss shoulders, articulated fists and directional airborne poses. It preserves gfx154 / asm147, all 32 native slots, eight 16×16 cells, full size byte 1, animation117, enemy163/palette194 and enemy164/palette195. Both current approved palette packets, original headers, AI, stats, events and animation lists are unchanged.

Five generated sheets supply 26 distinct source poses; exact source mirrors produce 32 distinct native images. `source-movement-v1.png` is retained only because it was the reference for the selected narrower v2 model. All six unchanged outputs have exact prompts and reference hashes. Slots12–20 reuse the original CT 14×4 indexed ground-shadow raster at its original coordinates. No body pixels or shadows were procedurally drawn.

`golem/native-raster.json` is the **composed, native-order 32-frame artifact**. Compile it with the eight cell origins and per-frame offsets from `golem/native-frame-map.draft.json`. The raw `preview-raster.json` contains 42 imported source cells; its raw native mapping alone omits native body positioning and the retained shadow. Do not register the raw body mapping as the finished actor. `prepare-draft.mjs` reproduces sampling, composition, exact tile reuse, native coordinates and the bank from source PNGs.

The bank is 18,656 decoded bytes (583 tiles), 14,778 compressed bytes and 2,560 assembly bytes. Compressed-plus-assembly growth is +7,648 bytes against original CT, or +12,290 against the immutable e136 earlier-art bank. Both differences are already even. Decoded growth is +9,376 / +13,920 bytes respectively. Root will explicitly select gfx154 for the existing native size-1 stream contract and place compressed data through the production allocator. Keep the original decoded-budget guard for unselected banks. No additional WRAM or VRAM is requested.

The 1× sheet is `golem/native-frames-1x.png`. Enlarged pages and `golem/motion.html` are review derivatives. `golem/walk-comparison.html` and its lossless 60 fps APNG compare original and new rear/front walking with fixed native origins and original 10/5/10/5 durations. New standing bodies are 57–58 pixels high versus the original 63–64. The passing pose moves the body top two pixels versus one originally; the original one-pixel foot-anchor motion is preserved. Root accepted this exact difference and the deeper compression silhouette. Body bottom and horizontal center are preserved, with at most half a pixel of integer center rounding. Every shadow pixel and its position is exact.

The private candidate is `a17c76dda82743f8ed542a897954ad4bd8a16861b6b863c55f4070c07eb993be`, built over immutable baseline `e13648757bbeee05dff8ff1cd0048b9cf60c13a24851c5625d7f3623adf06500`. Native proof covers 64 owner/pose uploads, 512 exact displayed cells and 67,144 exact opaque pixels. Original native action requests and timers pass 36 cases, 72 cycles and 1,560 video ticks. Four phase boundaries displayed the preceding complete pose for one extra video frame; all eight OAM cells and VRAM stayed coherent. The legacy bank showed no such delay over 480 walk ticks. Root accepted the bounded latency; **visible timing is not claimed identical**.

The original Lab 32 route passed four formations, 20 damage results, normal victories, the recorder chest and east exit 224→225. Actual maximum scene heap was 3,136 bytes. Separate scene312 initialization loaded four Iron Golem owners with palette195 and the selected source pointer, using 1,440 heap bytes. Static original-branch unions cover scenes213/224/312, with a maximum 3,136 streamed bytes and at least 29,632 bytes spare. Scene213 traversal, Iron Golem victory and independent-core execution remain integration checks. The Lab32 proof stops before the unrelated race.

Run from the repository root:

```
node assets/imagegen/mire-golems/prepare-draft.mjs
node assets/imagegen/mire-golems/review-draft.mjs
node assets/imagegen/mire-golems/compare-walk.mjs
node assets/imagegen/mire-golems/freeze-draft.mjs
```

`freeze.json` lists the minimal source/reproduction files separately from proof runners/manifests. Expanded captures, ROMs, state snapshots and timing traces remain under `.local/qa/mire-golems-native-proof/`. To reproduce the private candidate, that directory needs the immutable baseline ROM plus its manifest and patch records; `verify-native.mjs` checks their hashes and the native helper bytes. Then run `verify-timed-animation.mjs`, `verify-legacy-handoff.mjs` and `verify-scenes.mjs`. Existing repository dependencies, original ROM and read-only event reference are recorded in `handoff.json`. Private placement addresses are not production addresses. Root owns activation and production checks.
