# Mongo raster integration

The source PNGs were generated with the built-in `image_gen.imagegen` tool. Exact prompts and per-image provenance are retained beside every source. The original saved sheets were reused, then companion identity-preserving sheets supplied missing native roles. No paid API fallback was used, and no anatomy, facial feature, costume or weapon was drawn procedurally into an imported frame.

The active source mapping is `import-spec.json`. Reproduce the active raster module with:

```sh
node scripts/import-raster-art.mjs
```

The importer samples complete connected alpha silhouettes into 32×32 cells and the character’s existing 12-color SNES palette. Explicit sampling palettes separate material colors. Right-facing roles use complete mirrored left-facing source poses. All native animation frame numbers and timings remain unchanged.

`native-review-v2-6x.png` shows the extracted poses. `review-v2.html` is a fixed interactive review of every mapped native frame, backed by `review-v2-frames.png` and `review-v2.json`; every frame has source-file/cell attribution. `coverage.draft.json` records native frame counts and graphics costs. The source mapping is active. All native player uploads and the independent Snes9x/bsnes art checks pass on cartridge `510c664a4388139b566519894d3b91918d3f102c609526e69cd97e81aed5ff48`.

| Variant | Generated | Earlier art | Intentional blank | Native frames |
| --- | ---: | ---: | ---: | ---: |
| cookie | 250 | 0 | 5 | 255 |

Combined raw graphics: 27,200 bytes; original allocation: 35,840 bytes. This bank fits its original allocation.
The CT-compressed reference size is 19,325 bytes. Player graphics are streamed raw from ROM, so that compressed size is informational only.

## Mapping decisions

Rear blink reuses rear idle because eyes are not visible from behind; every other visible action has a matching generated source silhouette.

Purple source gumdrops are mapped explicitly to existing palette indices6/7, so they remain distinct from baked cookie shading. Output retains the current native palette.

- Story cell11 is right-facing kiss despite the requested left direction; mirrored for left.
- Directions cell11 is right-facing laugh and is mirrored for left. Directions cells5,14,15 face front and are not used for left-facing roles; strict profile versions come from finishing cells12,13,14.

Source validation covers all native frames: dimensions are 32×32, every pixel index is at most 12, visible roles are nonblank, and intentional blank frame IDs remain transparent. A newly missing role must fail its coverage audit; it must not silently become idle.

## Private native verification

The complete candidate passed the focused native player-art tests: all 255 frame uploads match the indexed source through the native PC, static-frame and mirrored-tile paths. Ordinary field movement in all four directions, menu sprite loading, battle loading and a controller-selected ordinary attack also passed. Captures under `native-verification-v2/` use a 24-frame settle before static PPU screenshots. The capture manifest records private build SHA256 `1a6c3b7822a4b169b63a046cead4e8cd5c9c27a627e30b50f383e7ad2bf8d9c0`. The active generated registry was not modified for this private preload test.
