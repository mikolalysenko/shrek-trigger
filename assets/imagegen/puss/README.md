# Puss in Boots raster integration

The source PNGs were generated with the built-in `image_gen.imagegen` tool. Exact prompts and per-image provenance are retained beside every source. The original saved sheets were reused, then companion identity-preserving sheets supplied missing native roles. No paid API fallback was used, and no anatomy, facial feature, costume or weapon was drawn procedurally into an imported frame.

The active source mapping is `import-spec.json`. Reproduce the active raster module with:

```sh
node scripts/import-raster-art.mjs
```

The importer samples complete connected alpha silhouettes into 32×32 cells and the character’s existing 12-color SNES palette. Explicit sampling palettes separate material colors. Right-facing roles use complete mirrored left-facing source poses. All native animation frame numbers and timings remain unchanged.

`native-review-v2-6x.png` shows the extracted poses. `review-v2.html` is a fixed interactive review of every mapped native frame, backed by `review-v2-frames.png` and `review-v2.json`; every frame has source-file/cell attribution. `coverage.draft.json` records native frame counts and graphics costs. The source mapping is active. All native player uploads and the independent Snes9x/bsnes art checks pass on cartridge `510c664a4388139b566519894d3b91918d3f102c609526e69cd97e81aed5ff48`.

| Variant | Generated | Earlier art | Intentional blank | Native frames |
| --- | ---: | ---: | ---: | ---: |
| rapier | 245 | 0 | 0 | 245 |
| hatchet | 245 | 0 | 0 | 245 |

Combined raw graphics: 38,208 bytes; original allocation: 27,456 bytes. Native placement retains Puss at D3:0000, moves Donkey to D4 and repacks Fiona/Pinocchio in owned D4 space; every tile is retained.
The CT-compressed reference size is 25,942 bytes. Player graphics are streamed raw from ROM, so that compressed size is informational only.

## Mapping decisions

Rear draw progresses from saved rear idle to diagonal guard to raised weapon. Awakening power progresses from kneeling/crouching to raised weapon and battle guard, preserving visibly equipped weapon distinction. Rear blink reuses the rear idle because eyes are not visible from the back; this is a visually identical blink state, not an unrelated missing gesture.

Generated front/side kneeling and rear crouching poses cover the native low kneel/crouch states without changing native timing.

- Combat cells2 and3 both face left; together they provide opposite running contacts.
- Story cell1 is right-facing blink and cell3 is right-facing look-back; both are mirrored for left.

Source validation covers all native frames: dimensions are 32×32, every pixel index is at most 12, visible roles are nonblank, and intentional blank frame IDs remain transparent. A newly missing role must fail its coverage audit; it must not silently become idle.

The user’s recovered V.Smile reference in `assets/references/puss-vsmile/source-215812.png` was visually checked after the generated model was completed. It is reference material only and was not sampled into the native art.
