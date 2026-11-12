# Sugar Ward and Muffin Core

This is an inactive generated-raster replacement for the two remaining procedural final-formation targets. Root approved both **AREA** native sheets. Actual built-in imagegen supplied one three-pose crystal atlas and one three-pose living muffin atlas; all six native phases consume those recorded source pixels. The richer source PNGs are reduced to the unchanged twelve-color SNES palette and 32×32 canvas. No anatomy or material pixels are painted by code.

| Actor | Enemy | Graphics / assembly | Frames / cells | Raw | Compressed | Assembly |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| Sugar Ward | 237 | 237 / 223 | 3 / 4 | 1,120 | 751 | 120 |
| Muffin Core | 239 | 248 / 254 | 3 / 4 | 1,376 | 787 | 120 |

Together they add **896 decoded bytes and 836 compressed bytes** over the pinned earlier project art. Assembly size, OBJ reservations and fixed WRAM allocations do not grow. Every sampled pixel fits the original four nonoverlapping 16×16 cells, with their original signed coordinates `[-16,-32]`, `[0,-32]`, `[-16,-16]`, `[0,-16]`. Both source banks remain far below the 32 KiB tile-index limit.

The original cartridge shared graphics 237 / assembly 223 between enemies 237 and 239. The project already gives the core its private graphics 248 / assembly 254; keep that established split. Palette 233 is still shared with **Tyson 206 and enemy 11**. Every one of its twelve colors remains exact. Both protected actors' graphics, assemblies and pointer bytes remain unchanged in the private proof; Tyson is neither edited nor regenerated.

The original animation 189 loops `0,1,2,1` at ten ticks per phase, identically in all four facings. Native action lists retain frame 0. The artwork makes those existing slots a restrained crystal glow and muffin breath. It does **not** add a broken ward, new attack, revival state, target rule or effect. All original AI, stats, header flags and programs remain untouched. Native source events also reference these owners in location 475; this source packet's real formation proof is specifically location 479.

## Integration

- Sugar Ward raster key: `sugar-ward`; spec: `import-spec.ward.draft.json`.
- Muffin Core raster key: `muffin-core`; spec: `import-spec.core.draft.json`.
- Each uses pose `native`, facing 1, phase equal to native frame 0–2.
- Use ordinary `compileSpriteFrames` defaults: 32×32, size 0, four original cells.
- Exact source roles and ownership: `native-roles.json` and `native-audit.json`.
- Selected native bytes and audits: `ward-area/` and `core-area/`.

Root owns active registration, the `muffinSprite` wrapper, build-audit coverage, canonical output and gameplay integration. This packet changes none of them.

## Review and verification

`review/contact-sheet-1x.png` shows the actual six indexed frames; `review/comparison-3x.png` compares earlier project art, selected AREA, and NEAREST. `review/motion.html` offers native scale, integer zoom, pause and tick stepping using the original ten-tick loop. The source core retains its natural height change under a shared scale; no whole-frame translation or invented extra phase is used.

The private in-memory cartridge overlay passes all **six native frame uploads and 2,690 opaque framebuffer pixels**, with the exact shared palette. Both hover lists and the static action hold pass **3,840 original native ticks across 24 actor/facing/mode cases**. In the actual final arena, all six phases appear naturally alongside Tyson. Every observed frame matches the original cell coordinates, uploaded source pixels and palette 233; the complete formation and Tyson's frame-24 windup are captured. Peak observed heap is **17,472 of 32,768 bytes**. The captures preserve the original arena background; exterior disaster/shell/oven scenery is outside this task.

The pinned proof baseline is `2e2a574e5b11…`; the private candidate is `bc5f67801d9d…`. No ROM file is written. Native evidence uses a proven unused expanded mirror for these small private resources. Its assembly pointers are `$7D02F0` and `$7D0690`, and the scene proof explicitly resolves them through the ExHiROM map. This distinguishes an earlier diagnostic reader's lower-mirror assumption from the actual native loader, which passes.

Defeat, revival, complete victory/branch testing, current-canonical residency and independent-core integration are **not** claimed by the source-art proof. Root will run those against the activated batch. Actor 11 remains a protected shared palette owner, not a new sprite deliverable.

## Reproduce

Run `node assets/imagegen/finale-ward-core/reproduce-draft.mjs`.

This reruns source extraction, exact palette quantization, tile packing, complete 4bpp round trips, semantic metadata and review exports. It neither calls imagegen nor modifies active registrations. The freeze manifest checks every listed derived file byte for byte. Separate native proof scripts require the pinned local baseline and record their exact fingerprint. Original cartridge rip previews remain under ignored `private/` and are excluded from the minimal manifest.
