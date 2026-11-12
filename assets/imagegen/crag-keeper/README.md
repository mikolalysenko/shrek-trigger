# Crag Keeper / Crag Echo — frozen inactive draft

The two selected image-generated sheets cover **all 27 visible native slots**, using 18 complete source poses and exact mirrored direction pairs. There are no blank slots or fallback drawings. Both existing twelve-color ramps remain intact: slate stone and green moss for Crag Keeper, lavender stone and blue-gray moss for Crag Echo.

Review the [actual-size sheet](draft/native-1x.png), [enlarged Keeper sheet](draft/native-4x.png), [Echo sheet](draft/echo-native-4x.png), and settled native [standing](native-verification/crag-keeper-native-frame-3.png), [roaring](native-verification/crag-keeper-native-frame-21.png), [leaning collapse](native-verification/crag-keeper-native-frame-26.png), and [Echo](native-verification/crag-echo-native-frame-3.png) captures. Root and the sprite-art lead approved the model and native gestures. The action sheet has modestly brighter stone highlights; the shared slate ramp, anatomy, moss beard/brows, short horns, heavy fists and purple/gold waist detail preserve continuity at native size.

This remains an **inactive** handoff. No active `import-spec.json`, shared registry, production engine, canonical ROM or music files were changed by this task. Root owns activation and the native raw-streaming selection.

## Actual sources and role audit

Selected inputs are `source-base-v2.png` and `source-actions-v2.png`. All four generation results, exact prompts, input-image relationships, source hashes and alpha checks are recorded in [provenance.json](provenance.json). Base v1's open-arm windup and several actions v1 gestures were too broad for eight native cells. The built-in image editor compacted their elbow/foot placement while retaining the same model; those v1 files remain only as provenance inputs and are never sampled.

The importer samples real alpha-connected source pixels into the existing twelve colors. Standing height is about **44 native pixels** in a 64×64 working canvas, with uniform horizontal sampling of 0.85 across both sheets. Actions cell 6 uses a uniform 0.97 pose scale, approximately one native pixel, to fit the immutable cell reservation; its reflected partner is identical. No body parts, facial marks, weapons or replacement pixels were painted procedurally. Narrower/shorter conversion trials were rejected and are excluded from the handoff manifest.

[The full role map](native-roles.json) preserves four-direction gait, guard, preparation, roar/release, recoil and collapse. It corrects two earlier simplifications: native frame **13 faces back** with raised arms, and frame **26 is a leaning diagonal collapse**, not a flattened rock pile. Exact original mirror relationships are retained for 2←0, 5←3, 9–11←6–8, 18←16, 19←17, 24←22 and 25←23.

[native-audit.json](native-audit.json) records the original resource ownership, all original cell coordinates and bounds, animation bytes and AI hashes. `legacy-frame-descriptors.json` and `source-family.json` freeze the earlier project's metadata as historical input so later production wrapper edits cannot silently alter this derivation. The earlier descriptors are not used as authoritative pose meanings.

## Native dimensions and costs

| Resource | Original | Candidate |
|---|---:|---:|
| GFX 140 decoded bank | 8,832 bytes | **14,176 bytes / 443 tiles** |
| Compressed packet | 7,976 bytes | **11,372 bytes** |
| ASM 134 | 27 × 80 = 2,160 bytes | **2,160 bytes** |
| Per-frame native reservation | Eight 16×16 cells, size 1 | Same eight cells |
| Palette 188 / 189 | Twelve opaque colors each | Same project ramps, 24 bytes each |

Graphics and assembly have exactly two owners: enemies **169 and 200**. Palette 188 belongs only to 169; palette 189 belongs only to 200; neither pointer aliases another palette. Animation **102**, its 144 bytes, both original enemy headers, AI and battle data remain unchanged by the art overlay.

[draft/family.json](draft/family.json) supplies the exact proposed per-frame cell geometry. The original project frame-offset table is preserved byte for byte. The old single `cellOrigins` layout must be replaced with these `frameCellOrigins`; source silhouettes cannot safely use the earlier procedural arrangement. All eight cells are nonoverlapping, all opaque source pixels are covered, and all **110,592 canvas pixels** reconstruct exactly from native tile words. Each frame still uploads 1,024 bytes into its existing native reservation. No new WRAM/VRAM slot or palette slot is introduced.

Graphics SHA-256: `969b00e031603f01a0fb7574904e321ecd88e85256a8efefb9604e81e3f268c1`.
Assembly SHA-256: `0b5310f3968bb28d4e9e82e65d05f4366cc1eda6844e3927f010b05350ef670d`.

## Verified scope and integration limits

The private native proof passed **54 exact uploads**, 27 for each palette variant, and all **61,504 opaque PPU pixel checks**. Both complete twelve-color palettes match actual CGRAM exactly. It checked the native tile words, every visible pixel, each frame's placement and absence of native halts. Captures settle for at least 30 additional frames after native frame selection. The two isolated previews each used **15,136 bytes** of the existing 32 KiB sprite heap.

The proof overlays a saved cartridge only in memory and writes neither a ROM nor a checkpoint. Input: `.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc`, SHA-256 `2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066`. Private overlay: `a1a33c973d237d42dc8cd6aef0d54bdf217bd537e2ddd227ccb6d1ab7d540a57`. Compressed packet and assembly occupy checked unused lower-half mirror spans at `0x7D0000` and `0x7D2C70`. These private offsets are not production allocation requirements.

The default non-streamed family-size guard still rejects growth beyond the original 8,832-byte bank. The candidate itself is safely below the ten-bit native tile limit and 32 KiB raw-bank limit. Root will select GFX 140 for the separately proven native streaming path.

| Original event location | Candidate decoded union on saved input | 32 KiB margin |
|---|---:|---:|
| 47 | 34,624 | **1,856 over** |
| 316 | 15,072 | 17,696 spare |
| 319 | 30,624 | 2,144 spare |
| 324 | 25,408 | 7,360 spare |
| 348 | 14,176 | 18,592 spare |

These conservative unions use every original load branch with actual saved-build headers. They do not prove simultaneous residency. The cave location 47 exceeds the union budget, so no unsafe full-cave compressed test was attempted. The exact banks are listed in [draft/current-co-loads.json](draft/current-co-loads.json). Actual cave/battle behavior, late-game Echo scenes, source-stable raw streaming and independent emulator frame proofs remain root-owned integration checks. The isolated proof is not a claim that those scenes have passed.

## Reproduction

Run from the repository root with the legally supplied original ROM and saved input build already present:

```sh
node assets/imagegen/crag-keeper/audit-native.mjs
node assets/imagegen/crag-keeper/prepare-draft.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/crag-keeper/import-spec.draft.json
node assets/imagegen/crag-keeper/compile-draft.mjs
node assets/imagegen/crag-keeper/verify-native.mjs
```

The original sprite extraction is written only under `.local/qa/crag-keeper/`. The preview importer does not alter the shared registry. Generated source images are retained immutable inputs; generation itself is not bit-reproducible. Import and native packing are deterministic. [freeze.json](freeze.json) hashes the handoff, and [reproducibility-files.txt](reproducibility-files.txt) is the minimal source/derivation/review manifest. Extra sampling trials and redundant screenshots are not required.
