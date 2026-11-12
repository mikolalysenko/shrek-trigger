# Palace Hexer — frozen inactive source packet

Root approved Palace Hexer as Fairy Godmother's court minion under the full-cast art pass. This replaces the original Mage's appearance with a compact crooked-cap spell-worker, while preserving the original mechanics. Root owns activation and the consolidated design log. Nothing in this directory is an active import spec.

Enemy **59** exclusively owns **graphics 90, assembly 47, palette 39, animation 92**. There are no NPC owners or pointer aliases. All **28 nonblank slots**, all **four native cells**, and all **224 original signed XY bytes** are retained. Statistics, AI, header bytes, animation bytes and authored event packets are unchanged in the private proof. The padded 64×64 build canvas adds no native cells, VRAM or WRAM; its origin is `[32,40]` and anchor `[0,24]`.

Four actual built-in imagegen PNGs provide 22 selected source poses. The final walking contacts have visibly opposed arms and boots; the rear cap bend stays fixed. The original walk order is A/P/B/P at 10 ticks each, including the original two-pixel passing-foot placement. The three-beat casts retain 15/5/31 ticks and distinct rear overhead, front low and lateral arcs. Whole-source mirrors supply the opposite profiles and correct source cap orientation, as recorded per slot. No anatomy, effects or face marks are painted in code.

The side release uses 94% horizontal sampling width to fit all of its arc into the original cells. Reaction-sheet alpha threshold 128 excludes the source's low-opacity ambient glow while retaining its body and separate impact components. The body is about 27–28 native pixels tall, with genuinely shorter crouches. Eyebrows, fingers and facial marks are limited by that footprint. Original one-pixel cell overlaps occur in slots 1, 4 and 12–15: all 141 repeated opaque pixels agree, and native reconstruction covers every selected source pixel.

| Resource | Original CT / pinned active | Candidate | Growth |
| --- | ---: | ---: | ---: |
| Raw graphics | 5,824 | 9,440 | +3,616 |
| Compressed graphics | 5,359 | 6,009 | +650 |
| Assembly | 1,120 | 1,120 | 0 |
| Compressed + assembly | 6,479 | 7,129 | +650 |

The private proof selects the existing size-0 raw-stream path for graphics 90, using a separate **9,440-byte** ROM stream below the 32 KiB family limit. This raw allocation is additional to the compressed packet and assembly; production pointer/table overhead is root-owned. A larger legacy decompressed allocation was not tested. Palette 39's exact 24 bytes and all twelve colors are unchanged.

The pinned published cartridge is `21abd2c3bb7bf8e2b7116433753701a4f375a9c8eb39c399ba6666ff824fb361`. The exact private candidate is `7969140b436eb39bcfced1aa46fae5fa12f46e32260a36388ad2ec1cea7c1f7a`. Private cartridges are excluded from the source whitelist.

The JS native core passed **28 exact tile uploads**, **10,184 PPU pixel comparisons**, and **28 original nonempty animation lists over 6,720 ticks**. Original OAM coordinates and duplicate overlap colors are checked independently of that upload proof. The recorded native screenshots are settled after pending DMA.

The scene evidence has these limits:

- Piazza 405: the original random-trigger formation `[59,82,82]` was defeated with 35 controller attack iterations. Native progression bit `7F0163 & 16` was set and exploration returned; party HP was 999/999/999.
- Lift: native exit 410→411, original `[214,82,82,214,59]` encounter, 54 controller attack iterations, original switch and native DF at body 793 reached 416. Party HP was 886/999/999. Later waves and full palace completion are not claimed.
- Ending: original 398→416→399 transitions ran. Both Hexer resource owners loaded the correct stream and palette, but they remain hidden in this branch. This is hidden resource-sharing evidence, not visible Hexer acting or complete-ending acceptance.
- Side Rooms 406, Forward Area 407 and Grand Stairwell 409: original initialization and opening staging were checked. The Side Rooms encounter starts automatically at the chosen checkpoint; its opening was observed, without claiming victory. These runs do not prove the complete local encounters or connected chapter.

All six locations with Mage loads were checked. Maximum measured heap was **18,624 bytes** in Grand Stairwell. `current-co-loads.json` separately records the all-branch graphics unions; they exclude common-loader overhead and are not simultaneous-runtime bounds. No event, enemy, pose or HP writes occur after the initial diagnostic checkpoint and endgame kit. Independent-core integration remains root-owned.

Root and sprite-art lead approved the final model, opposed gait, directional casts, and actual Piazza/lift appearance. See `review/contact-sheet-1x.png`, `review/native-6x.png`, `review/gait-contacts.png`, `review/role-review.html` and `review/motion-review.html`. Offline motion playback is separate from the native scheduler evidence.

Reproduce the source conversion and verify the freeze from the repository root:

```sh
node assets/imagegen/palace-hexer/prepare-draft.mjs
node assets/imagegen/palace-hexer/compile-draft.mjs
node assets/imagegen/palace-hexer/verify-frozen.mjs
```

With the pinned private baseline present, rerun native evidence using `verify-native.mjs`, `verify-motion.mjs`, and `verify-scenes.mjs` in this directory. `audit-co-loads.mjs` verifies the unchanged authored packets and budget inventory. `build-review.mjs` recreates the review pages. `source-whitelist.txt` is the exact minimal reproducibility handoff; `freeze.json` hashes every included source, derivation and proof artifact.
