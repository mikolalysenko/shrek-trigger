# Pinocchio: authentic model sprites

> **Superseded for the active cartridge.** The sprites and portrait are now the cel-shaded renders in [../pinocchio-clean](../pinocchio-clean/README.md). They use the same mesh, authored poses, projections and native roles, but flat materials, thickened limbs and a Chrono Trigger outline. The fixed-grid renders below remain the reproducible earlier selection.

The frozen fixed-grid sprites are active through [import-spec.json](import-spec.json), with the matching [48×48 portrait](../pinocchio-portrait/import-spec.json). They cover all **194 visible native roles**, preserve **62 original blank frames**, and use the existing twelve hardware colors. The original draft specs remain the reproducible source selections.

The real Shrek SuperSlam cutscene mesh is a viable coherent source for front, back, side, gait, combat and story poses. The first four columns of the native gallery are front, left, right and back idle. The tall wooden body, long nose, gold hat, blue clothing and hinged mouth remain recognizable at 32×32. The mesh has one static face; locally authored eye-region and mouth-panel transforms approximate blink/laugh expressions, with less expression range than a dedicated facial rig.

## Review

- [All 256 native frames, 2×](draft-fixed-grid/native-all-frames-2x.png), ordered by native frame ID, sixteen frames per row.
- [Selected acting/combat poses, 4×](draft-fixed-grid/semantic-review-4x.png), with [pose order](draft/semantic-review-order.json).
- [Identical poses in the workshop costume palette](draft-fixed-grid/workshop-costume-review-4x.png).
- [Native 48×48 portrait, 6×](portrait/native-6x.png) and [original rendered portrait](portrait/source.png).
- [Interactive frame/source review](review.html), generated for local review; its controls have not been browser-tested.
- [Every pose and projection transform](draft-fixed-grid/render-manifest.json), [source geometry inventory](mesh-inventory.json), and [local verification](draft-fixed-grid/verification.json).

The parent art reviewer approved the fixed-grid sheet and the actual native field, workshop, menu and battle captures. The [native manifest](native-verification-draft-fixed-grid/manifest.json) verifies **256 PC uploads plus 256 workshop uploads**, portrait tiles and palette, and an ordinary battle attack. Representative PPU captures settle for 24 frames; frame uploads use the native settled-frame helper.

## Source and actual animation provenance

The [Models Resource asset page](https://models.spriters-resource.com/pc_computer/shreksuperslam/asset/322817/) credits **FliQuaDv**, submitted January 31, 2021, under Shrek SuperSlam (PC / Computer), Cutscene Models. Its ordinary Download Asset link supplied the unchanged [source archive](source-322817.zip). [Provenance](provenance.json) records the observed link, acquisition method, archive hash and every extracted file hash.

The archive contains **one OBJ, one MTL and thirteen PNG textures**: 1,693 vertices, 2,691 triangles, 15 objects and 16 materials. It supplies **no skeleton, skin weights or animation clips**. All recorded gait, action and acting poses are newly authored transforms of the actual mesh. No replacement anatomy, primitive body geometry, generated image or drawn sprite marks are used.

The model renderer reads original face indices, UVs and texture pixels. The local pose adapter rotates the existing joint pieces, curls the original finger pieces, contracts the actual eye region for blinking, and rotates the original mouth panel. The sprite presentation scales the original head pieces 1.4× around the neck and widens the orthographic projection 1.15× for readability. The portrait retains the original head scale. Original-proportion [source](feasibility/source-contact-original-proportions.png) and [native](feasibility/native-original-proportions-4x.png) comparisons are retained.

The selected candidate uses a fixed native projection grid. Integer corrections preserve pixel phase between poses. When a whole pose exceeds the native frame, its complete silhouette receives a recorded uniform scale adjustment; poses are not cropped or replaced. A 4× nearest replication of those rendered pixels forms the source atlas so the importer preserves even one-pixel disconnected details. Sampling at 1/4 with explicit anchors reconstructs the original 32×32 grid. Right-facing native roles mirror complete left-facing renders; genuine right camera renders remain in the source inventory.

No license file or permissive license was supplied. The host's [terms](https://models.spriters-resource.com/page/tou/), updated March 31, 2025, allow use where legally permitted/unpublished noncommercial work and restrict commercial use and redistribution. This archive is a ripped game asset, not public-domain art. Origin credit and the original game/character rights remain applicable; the precise observed terms summary is in provenance.json.

## Exact cost and checks

| Candidate | Raw player graphics | Packed frame assembly | Native roles |
| --- | ---: | ---: | ---: |
| Fixed grid, mirrored right — selected |30,912 bytes /966 tiles |7,280 bytes /182 layouts |194 +62 blanks |
| Per-pose crop, mirrored right |33,024 bytes |7,280 bytes |194 +62 blanks |
| Per-pose crop, four genuine camera directions |44,064 bytes |7,280 bytes |194 +62 blanks |

Player graphics stream raw from ROM. The selected candidate’s 14,722-byte CT-compressed measurement is informational and is not its allocation cost. Original Pinocchio source capacity is 32,448 bytes. The selected native index range is 0–965, including the required blank tile zero. Native frame IDs, counts, geometry and timing are unchanged; only byte-identical 40-byte layouts are shared.

The portrait is exactly 48×48, 36 native 4bpp tiles and **1,152 bytes**, fitting its existing slot without allocation growth. Its source pixels pass through the raster portrait loader unchanged. Both sprite and portrait retain the exact existing 12-color Pinocchio palette. Source sampling anchors only choose among those existing colors.

The local proof checks every archived source hash, importer source hash, all 190 source alpha masks, all 256 native frames, all 262,144 decoded packed pixels, the 62 exact blank IDs, assembly coordinates, valid tile masks and palette indices. It separately validates the workshop enemy's private palette signature and its zero-additional-graphics/assembly sharing of Pinocchio. The subsequent native proof verifies all 256 workshop uploads and its palette.

The active cartridge uses the parent’s 8 MiB ExHiROM placement support (capacity commit `29a6c65`). The source pixels and native roles were retained intact. Native and independent-core evidence refers to ROM SHA256:

`2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066`

The [independent report](../../../.local/qa/party-art-2e2a574e5b11/report.json) passed **Snes9x 1.63 1bcc369** with all 1,988 party uploads and 256 workshop uploads, and **bsnes 115** with 96 representative party uploads and 11 workshop uploads. Both cores verified all seven portraits. The full regression completed 226 of 227 checks; its remaining workshop driver used a fixed eight-frame delay and stopped before the frame-126 DMA. The bounded native-cache wait fixes that driver, and all 256 workshop uploads pass on rerun. The 42-file staged source manifest independently reproduces the exact ROM above. See `.local/qa/pinocchio-full-regression.txt`, `pinocchio-workshop-regression-fixed.txt` and `pinocchio-staged-reproduction.json`.

Selected full-frame pixel SHA256:

`2e0d8583e7784aaeb4abb1d05ed28c43833ec345a1616853152a6e388adf96c5`

## Reproduction and native proof

From the repository root, with the existing local base ROM:

```sh
node assets/raster/pinocchio-model/render-draft.mjs
node assets/raster/pinocchio-model/render-fixed-grid.mjs
node scripts/import-raster-art.mjs --preview-spec assets/raster/pinocchio-model/import-spec.fixed-grid.draft.json
node assets/raster/pinocchio-model/render-portrait.mjs
node scripts/import-raster-art.mjs --preview-spec assets/raster/pinocchio-model/import-spec.portrait.draft.json
node assets/raster/pinocchio-model/verify-draft.mjs
node assets/raster/pinocchio-model/build-review.mjs
```

The fixed-grid source, spec, manifest and imported raster were regenerated and compared byte for byte. [freeze.json](freeze.json) records the selected assets and derivation hashes. Verification only injects the draft into the current Node process; it does not publish the generated registry or write a cartridge.

To repeat the same frozen selection in a private in-memory build:

```sh
node .local/qa/pinocchio-model/verify-native.mjs draft-fixed-grid
```

It checks 256 exact native PC uploads, 256 workshop uploads, menu portrait tiles and colors, and an ordinary battle attack. Representative final PPU captures settle for 24 frames. Outputs go under `native-verification-draft-fixed-grid/`; it does not write the canonical ROM. The saved manifest records the successful run above. Current active independent-core coverage is `npm run test:party-art-cores`.

The minimal commit input list is [reproducibility-files.txt](reproducibility-files.txt). It excludes earlier candidate raster directories. The small `import-spec.mirrored.draft.json` is retained only because the frozen fixed-grid renderer reads its sequence mapping as a derivation input; it is not an active artwork selection. Historical local review HTML still describes the pre-activation state; this README, freeze and activation provenance are the current status.
