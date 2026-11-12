# Enchanted pots and beetles — inactive source packet

This packet replaces the earlier procedural bodies with five saved image-generation sheets. It is **inactive**: there is no active import specification, engine change, canonical ROM, gallery update or live-server write in this package. Root owns production integration and independent-core checks.

The clay pots have a shared terracotta body, hollow handles and root feet, with plain, mushroom-cap and ember variants. The beetles have slate shell plates, brass anatomy, antennae and separate membrane wings. Small faces remain secondary to their object-scale silhouettes. Both root and the lead art agent approved every native palette sheet; the lead also approved the actual forest and conveyor captures.

## Native ownership and geometry

| Bank | Assembly | Original owners | Palette | Slots |
| --- | --- | --- | --- | --- |
| 112 | 79 | Cracked Pot 91, Clay Pot 92, Moss Urn 98 | 111, 108, 109 | 8 |
| 112 | 78 | Spore Pot 93, Thorn Spore 94 | 109, 110 | 8 |
| 112 | 77 | Ember Pot 95, Spell Pot 97 | 107, 109 | 8 |
| 92 | 49 | Scrap Beetle 140, Briar Beetle 141 | 111, 41 | 29 |

These are the complete graphics and assembly owners; there are no NPC owners or aliased pointers. Palette 111 is shared across the two banks. Palette 109 is shared across three pot owners. All six existing twelve-color ramps remain byte-identical, and no palette write is needed.

All 53 unique slots use the original four 16×16 cells. `family.draft.json` provides a 64×96 **logical sampling canvas**, anchor `[0,24]`, and each original cell position translated by `[32,72]` into that canvas. Remove the old `frameOffsets` when applying this geometry. Every one of the original 424 signed XY bytes is preserved. The larger canvas allocates no extra VRAM or WRAM.

Several original cell rectangles overlap. The candidate samples each overlapping cell from the same source image, and all 1,161 duplicated opaque pixels agree. Reassembling with original OAM priority reproduces every source pixel, with no clipped extremity. `compiled/verification.json` lists the exact overlapping frames.

Pot slots 4/5 retain the original translated reuse of slot 1. Ember slots 6/7 retain their reversed low-pose order. Native beetle opposite rear/front contacts, right profiles and open-shell sway use the original mirror relationships. Beetle 26/27 remain identical.

Beetle animation 144 only references slots 0–20. Original slots 21–28 contain fragmentary, unreferenced arrangements. Their full native positions are retained, with explicitly declared whole-source tumble/recoil adaptations. They are **not claimed to be observed original story actions**. The entire beetle native sequence is conservatively tagged `adapted`; `native-roles.json` distinguishes these eight slots from the observed source-backed roles.

The only imported original raster is the exact 29-pixel ground shadow in flight slots 17–20. Its 9×5 bounds, source ROM hash and indices are recorded in `beetle-native-shadows.json`; `beetle-native-composition.json` combines it with the generated bodies without overlap. No original beetle anatomy is retained.

## Source and reproducibility

Five actual `image_gen.imagegen` calls produced 36 source figures; 34 are used. The saved PNGs, exact prompts, reference-image relationships and hashes are in `source-provenance.json`. Two unused beetle base cells are superseded by the original exact mirror relationship, rather than silently counted as additional native poses. No anatomy was painted or procedurally reconstructed. Quantization, alpha sampling, translation, reflection and native cell packing are deterministic.

The four root-applicable specs are:

- `cracked-pot-import-spec.draft.json`
- `spore-pot-import-spec.draft.json`
- `ember-pot-import-spec.draft.json`
- `beetle-import-spec.draft.json`

They use existing raster keys, width 64, height 96, and `native/1` sequences of 8/8/8/29 entries. Root should register them in distinct active catalogue entries/directories and set each active output directory outside this frozen draft. Keep the source and composition paths as recorded. `integration-handoff.json` contains the complete geometry, owner, palette and hash handoff.

Run from the repository root:

```sh
node assets/imagegen/enchanted-pots-beetles/verify-frozen.mjs
```

This checks the whitelist and hashes, reimports all four recorded sources with the shared preview importer, recompiles both exact 4bpp banks, proves all cell coverage and original XY bytes, checks the original shadow, and compares the saved proof totals. It does not rebuild a canonical ROM. `prepare-draft.mjs` reproduces the mapping/geometry proposals from the frozen audit and original private ROM; `compile-draft.mjs` emits the private binary/reference sheets; `build-review.mjs` emits the native contact sheet and timed-list viewer.

## Size and production placement

| Resource | Candidate | Original CT | Active earlier art | Growth vs active |
| --- | ---: | ---: | ---: | ---: |
| Pot raw graphics | 7,840 | 4,096 | 3,264 | 4,576 |
| Pot compressed + assembly | 6,345 | 3,550 | 2,572 | 3,773 |
| Beetle raw graphics | 6,144 | 3,648 | 3,648 | 2,496 |
| Beetle compressed + assembly | 4,389 | 4,035 | 3,005 | 1,384 |
| Combined compressed + assembly | **10,734** | **7,585** | **5,577** | **5,157** |

Combined compressed/assembly growth is 3,149 bytes versus original CT and 5,157 versus the fixed active earlier-art baseline. Assembly sizes remain 320 + 320 + 320 + 1,160 = 2,120 bytes. Both raw banks are below the proven 32 KiB streaming bound.

Both banks were unstreamed in the fixed baseline, so activation needs **13,984 new raw-stream mirror bytes**, in addition to compressed storage. The 7,072 raw-size growth is only a comparison to earlier decoded art, not the new mirror allocation. Root reported 6,158 reclaimed original bytes before this handoff; other queued art may require the existing extended compressed-storage path. This packet does not change any allocator or capacity guard.

## Native and actual-scene evidence

The private fixed baseline is `cb2983da9aeaa3516e34e6017a05c4a62a87cbbeead40640282272adfd4d71c5`. The private candidate is `25848a5b60b210d9b599dc0f0847085f724a125dfd3549a04dfa9142bdd34df7`. The overlay changes only the two compressed pointers, four assembly pointers, two entries in the existing raw-stream table, owned private mirrored data, and checksums. Headers, palettes, AI and animation programs remain unchanged.

- **114 native owner-frame uploads**, 41,225 exact displayed pixels; all captures settle for at least 30 frames after the native preview command.
- **112 original direction/mode list executions**, 26,880 exact native scheduler ticks. Every nonempty list runs for 240 ticks in each of the four assemblies. Five recolor owners share those programs and receive separate static uploads.
- Original Guardia Forest pot and beetle fights, both banks loaded in the real location: 23,424-byte peak sprite heap.
- Original Lab 16 mixed formation `[91,91,91,39]`: 9,088-byte peak heap; battle and return passed.
- Original Arris beetle fight: 1,984-byte peak heap.
- Original conveyor patrol, four-beetle battle, event recovery, story value 60 and restored controller movement: 1,248-byte peak heap.
- An additional **explicit diagnostic** pairs Cracked Pot 91 with Scrap Beetle 140 to verify simultaneous palette 111. It is not an original encounter. Original scenes use those two owners separately.

These six scenarios total 17,717 native ticks: 15,152 in the five original encounters and 2,565 in the diagnostic. Scene reports record actual actor loads, raw graphics pointers, palette pointers, formation, controller taps and normal return. `current-co-loads.json` also records conservative all-branch unions for all 14 original location uses; these are not asserted to be simultaneous formations.

Re-run the private native checks, with the saved baseline available, using:

```sh
node assets/imagegen/enchanted-pots-beetles/verify-native.mjs
node assets/imagegen/enchanted-pots-beetles/verify-motion.mjs
node assets/imagegen/enchanted-pots-beetles/verify-scenes.mjs
```

The scoped scene proof is not a whole-chapter traversal. An initial attempt to reuse the full Lab 16 route helper became blocked after an unrelated first encounter at waypoint `(232,791)`. No native tile or palette failure occurred; the final proof enters the actual pot/Briar region and completes that original encounter. Other original locations remain for root's integrated chapter checks. These are JS native-core results; Snes9x and bsnes verification remains root-owned after activation.

Review `review/contact-sheet-1x.png`, the nine labeled variant sheets, `review/motion-review.html`, and the selected actual scene captures. The static/timed-list browser review and the native scheduler execution are separate evidence.
