# Giant Fairy Godmother — frozen inactive art

This packet replaces only the giant Queen Zeal head and hands with actual generated Fairy Godmother art. The accepted story NPC, original transformation, backgrounds, mechanics and effects remain unchanged. Root owns activation.

| Resource | Native owners | Frames / cells | Decoded | Compressed | Assembly |
| --- | --- | --- | ---: | ---: | ---: |
| Head gfx161 / asm153 / palette205 | Enemy176, size130, AA177 | 2 / 12 | 2,112 | 1,413 | 240 |
| Hands gfx162 / asm154 / palette206 | Enemy177 AA179; enemy178 AA178; size1 | 20 / 8 | 4,416 | 2,908 | 1,600 |

Together, compressed graphics and assembly use **195 fewer bytes** than both original CT and the pinned earlier-art baseline. The head exceeds its original 1,248-byte decoded ceiling, so gfx161 requires the explicit native stream contract. The hands remain under their original 4,992-byte ceiling and use ordinary loading. The actual compound scene uses **4,544 / 32,768 heap bytes**, including NPC150's original effect bank; no extra WRAM, VRAM or cells are required.

The four unchanged generated source PNGs and their prompts are recorded in `provenance.json`. The initial broad wrist and finger streak were corrected with new image generation; no anatomy was drawn procedurally. Source color calibration maps generated peach onto the accepted silver/peach/blue hardware ramp. Only exclusive palettes205/206 are proposed for recoloring. Story palette88 and unrelated palettes remain unchanged. The two original shadow-only hand rasters retain their exact indexed pixels.

`face/` and `hands/` contain source extraction specs, composed native rasters, authored frame maps, exact 4bpp/compressed/assembly/palette outputs and extraction records. The source-order import specs are **not direct activation specs**. Use each native map's full `group`, including width, height, anchor and per-frame cell origins. Preserve all header flags, especially head size130, and the original assembly extents. AA177 is shared with unrelated enemies 111/203/215; every animation pointer, frame and duration byte stays unchanged.

All native top and lowest-pixel anchors match the original. The head is 45px wide versus the old 63px crown, with the same 53px height. The widest pointing hand grows by 8px; other width changes are explicit in `geometry-and-roles.json`. Original opposite-hand mirroring and the 107px translated fingertip phases are preserved.

Root and the art lead approved the native sheets and actual compound formation. `review/contact-labelled-1x.png` labels every pose. `review/motion.html` compares original/new source frames using the original AA lists and durations. It can be opened locally; it contains its own images.

The private candidate is `26b57a045e8b5f1af1db32d91c1212079629d8ad44c21899d9da4cb1fafa6f08`, based on pinned `fdb8865eda88fcf8e9aea35de50c688b38a131da48ca73e5c72d42c36b66f2a6`. It is not a current production build. Native evidence covers 42 owner/pose uploads, 344 cells, 29,489 fully visible pixels, 92 original animation cases, 184 cycles and 3,520 ticks, with zero measured steady request/display delay.

Original scene107 ran its transformation and full formation, including both NPC150 effects. All 3,415 opaque boss pixels match the native layers and palettes at the original priorities and positions. Normal controller attacks exercised both hand counters and the head's original AI, defeated the 20,000 HP head, exited battle with all party members alive, and restored the unchanged story Godmother NPC. See `scene-review/battle-ready.png` and `scene-review/combat-end.png`.

Hand slots 3,6–9,13,16–19 have exact **static native coverage only**. They are absent from AA178/179 and were not observed in this fight; no timing was invented. Scenes102–106 were resource-audited but not replayed as complete routes. Independent emulator and final production-placement acceptance remain root integration checks.

Reproduce and verify from the repository root:

```sh
node assets/imagegen/godmother-giant/verify-frozen.mjs --rebuild
```

The original user-supplied CT ROM is required for the retained shadow pixels. `freeze.json` lists the minimal reproducible packet separately from review/native-proof files. `native-proof-manifest.json` fingerprints the expanded private evidence. No active registry, compiler, canonical ROM, gallery, title or music file is changed by this packet.
