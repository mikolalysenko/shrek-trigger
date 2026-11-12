# Future Ushers — inactive generated raster packet

Tin, Brass and Iron Ushers are worn ticket-service machines from an abandoned fairy-tale attraction. The shared model has a chipped smiling service mask, flat usher cap, ragged coat, winding key, mechanical limbs and a small ticket. Four unchanged image-generation PNGs supply the anatomy and effects. No character pixels were drawn procedurally or painted after generation.

The packet preserves gfx 97, assembly 56, all 25 native slots and four 16×16 cells per slot. Enemies 137/138/139 retain palettes 51/52/53. NPC 170 shares Brass palette 52 and the same graphics/assembly, but keeps animation 41; Brass enemy 138 keeps animation 159. Those two original programs differ at the front/rear reaction selections. All frame lists, duration lists, headers, AI, statistics and current palette packets remain unchanged.

`native-frame-map.draft.json` specifies exact cell origins and signed frame offsets. The 64×64 canvas is a sampling workspace; the native reservation is still four cells. Every frame retains the original lowest opaque pixel and horizontal center within half a pixel. Native 13 retains its raised bottom at −4, native 17 bottom 0, and the side-service pairs retain their authored lateral shifts. New silhouettes differ in width and upper extent; all original and proposed bounds remain visible in the audit.

Twenty generated source poses plus five whole-source mirrors produce 25 distinct native images. Source indices 11, 14 and 21 are unused: the first starburst exceeded four-cell coverage, and the other two are scale references. The replacement starburst was actually generated with shorter rays at unchanged body scale. Extraction uses recorded nearest sampling, alpha threshold 128 and the current Brass palette as the index reference. Tin and Iron reinterpret the same indices with their unchanged packets.

The bank is 8,032 decoded bytes, 6,287 compressed bytes and 1,000 assembly bytes. It exceeds original CT's 6,144-byte decoded bank by 1,888 bytes. Production must select gfx 97 through the existing guarded native streaming contract; the private proof does not relax the default guard. Compared with CT, compressed plus assembly growth is 1,323 bytes (1,324 after 2-byte alignment). Compared with the active earlier art on baseline 511e120ca47a, growth is 4,749 bytes (4,750 aligned). The streamed copy costs 8,032 extended ROM bytes and uses no extra WRAM or VRAM.

Root and the art lead approved the complete native sheet. `native-display-proof.json` separately records all 100 native owner/pose combinations: three enemy owners plus native NPC 170 initialization, 400 exact displayed cells and 49,660 exact opaque framebuffer pixels. That private candidate is based on published e13648757bbe; it uses unchanged production streaming helpers. Its isolated preview heap stays at 960 bytes. The ten-loop motion review renders every documented pose in all three ramps; it preserves original walk, charge and gesture timing values, while the rear shock/reaction pairing is only a review juxtaposition.

`scene-budget-audit.json` inventories all 15 original event load unions using emitted baseline headers. The largest is location 93: 29,056 decoded bytes with the candidate bank loaded conventionally, or 21,024 with gfx 97 streamed. These conservative unions and isolated display checks do not establish complete route, battle, damage/victory, independent-core or native encounter-transition behavior. Root owns activation and connected-route verification.

Reproduce the sampled bank and review with:

```sh
node assets/imagegen/future-ushers/prepare-draft.mjs
node assets/imagegen/future-ushers/review-draft.mjs
node assets/imagegen/future-ushers/verify-motion.mjs
node assets/imagegen/future-ushers/freeze-draft.mjs
```

The native runner reads the immutable private `baseline.sfc`, `baseline-manifest.json` and `baseline-records.json` in `.local/qa/future-ushers-native-proof/`. Their fingerprints are recorded; it writes only a private candidate and evidence. Expanded native screenshots, baseline/candidate ROMs, checkpoints and the motion screenshots are excluded from the minimal source list. `freeze.json` is the exact minimal source whitelist; `handoff.json` is the integration contract. No active imports or registry entry is included.
