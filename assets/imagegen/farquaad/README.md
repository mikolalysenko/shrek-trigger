# Lord Farquaad raster integration

The source PNGs were generated with the built-in `image_gen.imagegen` tool. Exact prompts and per-image provenance are retained beside every source. The original saved sheets were reused, then companion identity-preserving sheets supplied missing native roles. No paid API fallback was used, and no anatomy, facial feature, costume or weapon was drawn procedurally into an imported frame.

The active source mapping is `import-spec.json`. Reproduce the active raster module with:

```sh
node scripts/import-raster-art.mjs
```

The importer samples complete connected alpha silhouettes into 32×32 cells and the character’s existing 12-color SNES palette. Explicit sampling palettes separate material colors. Right-facing roles use complete mirrored left-facing source poses. All native animation frame numbers and timings remain unchanged.

`native-review-v2-6x.png` shows the extracted poses. `review-v2.html` is a fixed interactive review of every mapped native frame, backed by `review-v2-frames.png` and `review-v2.json`; every frame has source-file/cell attribution. `coverage.draft.json` records native frame counts and graphics costs. The source mapping is active. All native player uploads and the independent Snes9x/bsnes art checks pass on cartridge `510c664a4388139b566519894d3b91918d3f102c609526e69cd97e81aed5ff48`.

| Variant | Generated | Earlier art | Intentional blank | Native frames |
| --- | ---: | ---: | ---: | ---: |
| royal | 253 | 0 | 1 | 254 |

Combined raw graphics: 26,400 bytes; original allocation: 29,376 bytes. This bank fits its original allocation.
The CT-compressed reference size is 19,696 bytes. Player graphics are streamed raw from ROM, so that compressed size is informational only.

## Mapping decisions

Rear draw progresses from source rear idle to actual polearm guard and wind-up. Rear swing uses generated wind-up, full follow-through and guard. Rear blink reuses rear idle because the eyes are hidden from behind; side blink visibly closes its eye while retaining the generated folded-arm stance.

Side casting, big-cast and casting-walk share the generated profile casting step with the forward boot planted; rear casting now uses the separate raised-hands rear source. Native timing is unchanged.

- Base cell12 battle guard faces right and is mirrored for left. Story cell15 looks right and is mirrored for the opposite look phase.
- Directions cell13 rear look faces right; mirrored for the left-head-turn phase.

Source validation covers all native frames: dimensions are 32×32, every pixel index is at most 12, visible roles are nonblank, and intentional blank frame IDs remain transparent. A newly missing role must fail its coverage audit; it must not silently become idle.

## Private native verification

The complete candidate passed the focused native player-art tests: all 254 frame uploads match the indexed source through the native PC, static-frame and mirrored-tile paths. Ordinary field movement in all four directions, menu sprite loading, battle loading and a controller-selected ordinary attack also passed. Captures under `native-verification-v2/` use a 24-frame settle before static PPU screenshots. The capture manifest records private build SHA256 `1a6c3b7822a4b169b63a046cead4e8cd5c9c27a627e30b50f383e7ad2bf8d9c0`. The active generated registry was not modified for this private preload test.
