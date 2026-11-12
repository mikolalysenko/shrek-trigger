# Sir Sludge / Bog Baron — frozen inactive source candidate

This packet refines the established sewer toll trolls with three actual built-in `image_gen` PNGs. It changes no active module, registry, canonical ROM, dialogue, statistics, AI or music. Root owns activation and independent-core integration.

The selected art preserves the dented iron crown, heavy troll face, iron armor, torn cape and drain mace from `docs/future-wildlife.md`. The final import consumes 21 source poses and maps them to all 27 nonblank native slots; six right-facing slots mirror whole left-facing sources. Base v1 cells 2/5/8 repeated the leading foot and are unconsumed. The separate contact source corrects them without moving or painting anatomy. Prompts, exact input reference, PNG hashes and sampling details are in `provenance.json`.

## Native ownership and geometry

| Resource | Exact scope |
| --- | --- |
| Graphics / assembly | gfx82 / asm37, exclusive to enemies 4 and 238 |
| Owners | Sir Sludge enemy4, palette21; Bog Baron enemy238, palette22; no NPC header owners |
| Animation | Original animation29, four facings, 36 nonempty lists; unchanged frame and duration bytes |
| Reservation | Native size1, eight 16×16 cells, 1,024 VRAM bytes per frame; 27 × 80 = 2,160 assembly bytes |
| Shared scene uses | Sewer236, Sunken Desert160, ending montage94, Dream Project341 |

Both current 12-color palettes are preserved byte for byte. They are exclusive and unaliased; they are the established project ramps, not the original CT colors. No palette or header writes are required.

`family.draft.json` is the complete proposed family definition. Replace its group as a whole: do not retain the earlier group's `frameOffsets`. The build-only canvas is 128×144 with anchor `[0,64]`, giving native logical origin `[64,80]`; it does not enlarge the eight-cell hardware reservation. `geometry-proposal.json` retains every original and proposed signed cell origin.

The body is about 42 native pixels tall. The overhead mace extends to 54 px; crouches genuinely shorten the body. Gait contacts share a planted-foot baseline, with the established one-pixel passing offsets at 1/4/7/10. Using the original insect's varying foot bounds instead would create a false four-pixel crown bob. Action translations retain the original opaque center/bottom placement. Original insect gestures are explicitly adapted to the established troll and mace, including low reaction12, overhead threat14, impact17/20, and side arcs23/26.

All 26,626 unique indexed source pixels reconstruct through the emitted native assembly. Only frame14 overlaps: 382 canvas pixels, of which 328 are opaque, occur in exactly two cells. Every duplicate has the same sampled index. Native PPU checks pass for both palettes and all pixels; no clipped extremity or hidden different color is accepted. Other frames are disjoint.

## Exact cost and hashes

| Candidate resource | Bytes | SHA-256 |
| --- | ---: | --- |
| Raw gfx82 | 18,976 | `1db7373ca5fdc47c00d9ae1319830248d9b65e29092003f72a31794f116ff343` |
| CT-compressed gfx82 | 12,038 | `a59b28fb763d371ba4fd1a02e18b14e9d55a75171d0861dc69c2d17d1e4fe86b` |
| asm37 | 2,160 | `28046520bc327612a6156660d85540d6e44a474549ec3c87652feabb6e2d0401` |

Compressed graphics plus assembly total **14,198 bytes**: **+4,534** versus original CT (9,664), or **+9,376** versus the pinned earlier active art (4,822). Raw growth is +9,504 versus CT or +13,344 versus earlier art. Streaming also requires a separate 18,976-byte raw ROM allocation; the compressed-growth number does not include that extra copy. All 593 native tiles fit the 10-bit NPC tile index and the proven ≤32 KiB stream contract.

## Verification and bounded scene claims

Pinned baseline: commit `a8d9f5d`, SHA-256 `e4c95d0481930abd79320855dbc5a2f8f9f2c018ac2e881c91ee2456d846d001`. Final private candidate: `492317c7343a5c18d9eaa043a486a00b7778231962e4bdf8e8950b10fa224696`.

The private candidate uses the existing size1 native raw-stream path at **7D:0000**. Compressed graphics and assembly occupy separately checked unused lower-half mirror space at 7C. Both complete raw pointers are asserted in the native previews and real scene loads. ROM/checkpoint binaries are excluded from the source whitelist.

- **Native JS core:** 54/54 owner-frame uploads, 53,252 exact unique displayed-pixel checks, both palettes, all poses and overlapping slot14. Original headers, statistics, AI and animation bytes are asserted unchanged.
- **Native scheduler:** every one of 36 nonempty facing/mode lists executes for 240 ticks, **8,640 ticks** total. The original gait loops passing → B → A at 10/15/15 ticks. Mode9's real read-through into mode10 remains intact. No frame-by-frame injection is used.
- **Upper sewer236:** diagnostic entry at the southeast ladder, followed only by controllers. All three authored formations `[42,42]`, `[4]`, `[99,99,42,42]`, frog continuation, Sludge dialogue52–58, sword chest, bridge states2/0/2 and world exit498/story52 pass. All party members survive; Shrek finishes at1 HP. This does not claim the earlier entrance/lower-sewer route. Actual maximum graphics heap: **3,456 bytes**.
- **Desert160:** original mixed formation `[101,101,101,238]`, all three native Bog Baron field owners loaded, controller victory, `7F01AD & 4` and return to exploration pass. Party HP807/766/999. Actual maximum heap: **1,248 bytes**. This is one authored encounter, not a complete desert chapter route.
- **Ending94:** original montage draws Sir Sludge in native pose21 at full brightness and continues to95. Maximum heap12,416. This is the original segment after a diagnostic entry, not a complete ending playthrough.
- **Dream Project341:** original scene load and native acting pass, maximum heap17,984. Dialogue continuation is not claimed.

`current-co-loads.json` distinguishes the event's graphics-owner union from measured total runtime heap; common loader/party overhead is excluded from that union. Native battle overlap with the party and normal foreground/dialogue occlusion are preserved. Static appearance approval is separate from execution proof. Root and lead approved the final contacts, palettes, model and actions; source image generation is complete. Independent Snes9x/bsnes integrated proofs remain root-owned.

## Review

- `review/contact-sheet-1x.png`: both complete palette variants at actual size.
- `review/gait-contacts.png`: actual-size and enlarged opposite contacts, with exact original order.
- `review/role-review.html` and `review/motion-review.html`: labeled roles and all original timed lists.
- `review/overlap-review.png`: all eight frame14 cells and exact overlap contract.
- `native-verification/sir-sludge-14.png`: real native overhead pose.
- `scene-verification/desert-battle.png`, `sewer-dialogue-53.png`, `ending-original-sludge-draw-48.png`, `dream-entry.png`: actual authored scene appearance.

The brighter cloak on corrected contact B is a modest source-lighting variation within the unchanged palette. Tiny eyes, tusks and grille marks are constrained by native resolution. There are no procedural body fallbacks, fabricated source poses or unacknowledged blank substitutions.

## Reproduce without activation

From the repository root, with normal project dependencies:

```sh
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/sir-sludge/import-spec.draft.json
node assets/imagegen/sir-sludge/prepare-draft.mjs
node assets/imagegen/sir-sludge/compile-draft.mjs
node assets/imagegen/sir-sludge/verify-frozen.mjs
```

The supplied compiled artifacts and hashes reproduce without a ROM. For native evidence, supply the exact private baseline named in `baseline.json`; it is not distributed. The optional read-only audit also requires the original US ROM and original CTViewer event catalogue named in `audit-native.mjs`.

```sh
node assets/imagegen/sir-sludge/verify-native.mjs
node assets/imagegen/sir-sludge/verify-motion.mjs
node assets/imagegen/sir-sludge/verify-scenes.mjs sewer desert ending dream
```

These scripts write only this inactive package. Use `source-whitelist.txt` for the minimal source/evidence handoff. Exploratory previews, probe runs, intermediate logs and private ROMs are deliberately excluded. Do not run the importer without `--preview-spec` during this inactive phase.
