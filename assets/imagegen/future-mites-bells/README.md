# Future Mites and Bells — inactive generated raster packet

Two unchanged image-generation PNGs provide the cleaning Mites and floating Watch/Alarm Bells. The designs use worn brass, enamel service faces, winding mechanisms and cleaning brushes from the abandoned fairy-tale attraction setting. Native sampling, palette indexing, tile packing and signed cell geometry are reproducible; no character pixels were drawn procedurally or repainted after generation.

Mites keep gfx 96, assembly 55, animation 40, enemies 84–86 and current palettes 48/49/50. All nine slots remain. Original duplicate pairs 2/4 and 6/7 use the same source images; slot 6 is retained even though the standard animation lists do not reference it. The generated source distinguishes tall contact, low crouch, alternate broad contacts, charge arcs and the narrow telescoping extension. It replaces the earlier procedural extension's splayed legs with the original narrow role. The four directional animation blocks still use their identical original lists.

Mite sampling is nearest-neighbor with recorded horizontal factor 0.90 to fit the immutable four-cell coverage. The resulting silhouettes are shorter than CT by 2–7 pixels depending on pose; their original lowest opaque pixel and horizontal center remain fixed within half a pixel. Exact original/proposed bounds are recorded. The extension uses the same head and brush identity, with two close lower rods in phase 8. This is a new cleaning-toy silhouette, not a claim of matching the original robot's opaque outline.

Bells keep gfx 197, assembly 165, animation 155 and enemies 207/208 sharing current palette 201. All five generated variants retain the original eye shutter and status-light distinctions, which the earlier one-image procedural model omitted. Every new silhouette is 31×30 pixels. The original floating anchor `[0,-10]` and frame offsets `[[0,0],[0,-1],[0,-2],[0,1],[0,2]]` remain exact. Their bottom pixels match CT; the new bell is two pixels wider and one pixel shorter. No additional image movement is baked into the source sampling.

Both families remain size class 0 with four 16×16 cells. The 64×64 staging canvas does not change their native reservation. Current palette packets remain byte-identical; the audit separately records CT's original palettes for provenance. All headers, animation programs, timing lists, AI, statistics and event choreography remain unchanged in the private candidate.

The Mite bank is 2,272 decoded / 1,589 compressed / 360 assembly bytes. Bells are 2,240 / 1,397 / 200. Both exceed their original individual decoded allowances (1,856 and 640), so activation requires explicit gfx 96 and 197 selection through the existing strict native streaming family contract. Default rejection for unselected families remains appropriate. Together the streamed copies use 4,512 extended ROM bytes with no extra WRAM or VRAM. Combined compressed plus assembly growth is 1,231 bytes versus CT, or 2,015 versus active earlier art; aligned deltas are 1,232 and 2,016.

Root approved the complete native Mite sheet and all five enlarged Bell variants. `native-display-proof.json` records a private e13648757bbe-based candidate with all 37 owner/pose combinations, 148 exact native cells and 14,050 exact opaque framebuffer pixels. The existing native streaming helpers remain unchanged; each isolated preview uses 960 decoded heap bytes. Six Mite motion loops in each of three palettes and three Bell loops render all documented original-list states and tick durations. Static frame display and source motion review do not prove original encounter transitions.

The conservative union of all 16 original event load sets peaks at location 217: 10,944 decoded bytes with these banks loaded conventionally, or 8,672 with gfx 96/197 streamed. The audit uses only actual e136 streaming exclusions and deliberately does not assume the newer private Usher stream. Full connected routes, compound Storekeeper battle choreography, damage/victory and independent-core compatibility remain root-owned integration checks.

Reproduce source/native artifacts with:

```sh
node assets/imagegen/future-mites-bells/prepare-draft.mjs
node assets/imagegen/future-mites-bells/review-draft.mjs
node assets/imagegen/future-mites-bells/verify-motion.mjs
node assets/imagegen/future-mites-bells/freeze-draft.mjs
```

The private native runner consumes immutable `baseline.sfc`, `baseline-manifest.json` and `baseline-records.json` under `.local/qa/future-mites-bells-native-proof/`; fingerprints are recorded. `freeze.json` lists the minimal source files, while native screenshots, candidate/baseline ROMs, checkpoints, motion screenshots and expanded review pages remain separate evidence. No active imports, module edits or canonical publication are included.
