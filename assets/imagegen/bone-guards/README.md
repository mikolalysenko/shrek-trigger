This is an inactive, generated-source packet for the four Enchanted Bone Guards. It replaces the earlier procedural model with an ivory skeleton, ragged palette-colored cap/tabard and short poleaxe. The two raw PNGs were made with the built-in imagegen tool; their saved prompts, reference roles and SHA-256 provenance are beside them. No anatomy or pose was drawn procedurally after generation.

`handoff.json` is the integration record. `freeze.json` lists the minimal source/reproduction files separately from expanded proof. Only `import-spec.draft.json` exists. No active content, engine, registry, title, music, canonical cartridge or gallery was changed.

The native contract is gfx108 / asm71 / animation85, 24 slots and four16x16 cells. The sampled64x64 canvas is staging space, not a larger native sprite reservation. Fifteen authored poses provide eight explicit whole-source mirrors; original slots13/14 are intentionally identical. All original bottom-pixel positions and horizontal silhouette centers are retained within half a pixel. Every original/proposed bound and exact cell origin is recorded in `native-frame-map.draft.json`.

All four palettes91–94 remain byte-identical. The original and current enemy47 header shares palette92 with enemy45; the existing content comment naming91 is inaccurate. Palette indexing, including Moss Guard's yellow bones, is preserved rather than approximated by recoloring.

The compiled bank is4,960 decoded bytes,4,047 compressed bytes and960 assembly bytes. Against original CT this saves544 decoded bytes and adds304 compressed-plus-assembly bytes. Against canonical baseline511e120ca47aa4f9c61371d4ecd264d0b1848061a649ee16b162cfe3f6bb109c, it adds2,624 decoded bytes and2,660 compressed-plus-assembly bytes. Both aligned ROM deltas are the same. The ordinary original decoded-size guard passes, and this family needs no raw-stream exception.

Reproduce the exact bank from the repository root with:

```sh
node assets/imagegen/bone-guards/prepare-draft.mjs
node assets/imagegen/bone-guards/review-draft.mjs
```

The scripts require the repository's existing Node dependencies and the licensed original ROM at `.local/chrono-trigger-usa.sfc`. The original audit renderer additionally reads the existing original-event inventory at `.local/reference/events.json`; compilation uses the frozen audit and does not need that inventory. Re-running the scene audit or private native proof requires the recorded immutable current baseline and matching `dist/manifest.json` / `dist/patch-records.json`.

The separate native proof checks all96 pose/palette combinations through ordinary compressed loading:384 displayed cells and33,148 opaque framebuffer pixels. The source motion page renders all nine review loops in all four palettes, with original gait order and duration values. Lead review approved the complete native sheet, action silhouettes and the two small sampling normalizations. The private candidate and expanded screenshots stay under `.local/qa/bone-guards-native-proof/`.

Full encounter transitions, original battle choreography and independent-core validation remain integration checks. Source17/18 have taller opaque poleaxe silhouettes than CT, but preserve the original lower contact/center, fit four cells and pass exact native display. The current conditional scene-load audit has a maximum30,144-byte union in scene71, leaving2,624 bytes within the32KiB heap; it is not a measured whole-scene residency claim.
