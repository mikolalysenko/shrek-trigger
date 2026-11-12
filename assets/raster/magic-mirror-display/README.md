# Magic Mirror screen overlays

This inactive draft replaces the art shared by **Display enemy 183** and **computer-screen NPC 127**. These are 32×16 overlays for the existing map consoles. The console bodies remain map artwork. The source is the same authentic Shrek (Xbox) Magic Mirror mesh and textures used by the separate [main/trim draft](../magic-mirror-model/README.md).

Review the [eight native frame slots at 5×](draft/native-5x.png), [rendered source cells](source-frames.png), and [three screens in the native mainframe scene](native-verification/mainframe-native.png). The sprite-art lead approved the pale face, gold frame and distinct scan phases at native size on October 31, 2026.

## Source and frame roles

[Provenance](provenance.json) links the unchanged [model archive](../magic-mirror-model/source-362695.zip), original file hashes, [Models Resource page](https://models.spriters-resource.com/xbox/shrek/asset/362695/page-1/) and usage terms. The archive credits BillyGaming964 and supplies no rig or animation clips. This is a ripped game asset without a permissive license; original game/character rights and the host’s terms remain applicable.

`render-draft.mjs` projects the actual mesh, UVs and diffuse textures into the original screen viewport. The three active phases rotate copies of the original head and eye vertices by −8°, 0° and +8°. Those small glances are locally authored poses. Boot and scan phases hide portions of the same source render; static B reflects static A horizontally. No replacement geometry, painted face or generated bitmap is used.

| Native frame | Retained role | Source adaptation |
| --- | --- | --- |
| 0 | Boot spark | Central 5×3 sampled area |
| 1 | Horizontal boot sweep | One sampled row |
| 2–3 | Alternating static | Scan masks and a horizontal reflection |
| 4–6 | Active screen phases | Three small source-head turns |
| 7 | Blank | Completely transparent native frame |

All seven nonblank rasters have distinct hashes. The compiler preserves every original cell coordinate, including the overlapping spark cells and all blank-frame coordinates. Four native 16×16 cells remain reserved; only the original two screen cells contain opaque pixels. Native frame IDs and both animation programs remain unchanged.

## Ownership and exact cost

| Resource | Original | Draft |
| --- | --- | --- |
| Shared GFX 168 | 960 raw / 457 compressed bytes | **960 raw / 509 compressed bytes**, 30 tiles |
| ASM 161 | Eight frames × 40 bytes | **320 bytes**, same coordinates |
| Palette 144 | Private to these two headers | Twelve replacement colors; remaining entries retained |
| Enemy animation 143 | 112 bytes | Unchanged |
| NPC animation 115 | 80 bytes | Unchanged |
| Enemy AI 183 | 24 bytes | Unchanged |

The compressed packet is **52 bytes larger than its original slot** and must be relocated. `compileDisplayDraft()` deliberately returns assembly/palette records without an unsafe in-place graphics write. The integrating allocator must place `draft/graphics.ct-lz` and update the GFX 168 pointer at `0x242000 + 168*3`.

The private proof packs the 1,363-byte main Mirror packet and this 509-byte packet inside the original 1,938-byte Mother Brain graphics span: **1,872 bytes used, 66 spare**. Its Display packet starts at file offset **2,211,071**. The original Display packet remains untouched. This is one proven allocation option; the active allocator owns final placement. There is no additional WRAM, VRAM, cell, frame or palette slot.

[verification.json](draft/verification.json) records original addresses, headers, animation/AI hashes, all source frame hashes and the complete scene inventory. It proves every assembled pixel, validates source archive/raster hashes, and checks that the three resources and palette pointer have no unrelated header owner.

## Native evidence and scene limits

The [native manifest](native-verification/manifest.json) records a private original-ROM overlay with SHA256 `93d18731e6c989bca76af47a925cfaddb629779469dfe363d875171458ec491d`.

- **16 solo native frame uploads:** all eight frames as enemy 183 and all eight as NPC 127. VRAM matches the compiled tiles, every nonblank source pixel matches the PPU output, and frame 7 remains blank. The palette is checked separately. Captures settle for 32 frames.
- **Location 268 staging:** a temporary diagnostic event uses the original map background, three enemy slots and coordinates. All pixels of active frames 4/5/6 appear at native screen origins `[64,67]`, `[144,51]`, `[224,67]`. The party is clear of the Mirror.
- **Compound Mirror relationship:** its two layers use the original shared position and the original priority values. Both layers’ full tile uploads match in each staged priority state. With post-reveal `8E22`, all **2,570 opaque pixels in the upper 80 rows** match; the default map foreground partly covers the lower 16 rows. With pre-reveal `8E00`, the map hides the Mirror. Both screenshots are retained. The separate Mirror proof already verifies its complete 2,808-pixel image in an unobstructed native room.

This staging does **not** execute the original reveal, tilemap changes, color effects or combat event flow. Full location 268 choreography remains integration QA. Do not change accepted source pixels to compensate for a diagnostic map state.

NPC 127 also appears in locations **218, 228, 229, 230, 234, 235, 241, 248, 256, 259, 439 and 476**. They share this same overlay resource, so activation affects those screens too. Their original event commands and animation ownership remain intact; per-scene story/visibility review remains pending. No dialogue, AI or map console art is altered.

## Reproduction

From the repository root, with the existing local original ROM and the archived model directory:

```sh
node assets/raster/magic-mirror-display/render-draft.mjs
node scripts/import-raster-art.mjs --preview-spec assets/raster/magic-mirror-display/import-spec.draft.json
node assets/raster/magic-mirror-display/compile-draft.mjs
node assets/raster/magic-mirror-display/verify-native.mjs
```

The first three commands write only this draft’s files. The native proof builds an in-memory overlay, starts a fresh game, and writes review captures; it never writes a cartridge, registry or shared checkpoint. [freeze.json](freeze.json) records byte-for-byte reproduction and the exact source, conversion and proof files. There is no active `import-spec.json` in this directory. Active build registration, allocator placement, independent-core checks and real scene choreography are parent-controlled next steps.
