# Magic Mirror: authentic model draft

This inactive draft renders the actual **Shrek (Xbox) Magic Mirror** model into a **48×96, twelve-color compound sprite**. It replaces the original Mother Brain main and companion artwork within their existing graphics, frame and hardware-cell budgets. No active catalogue, engine module or canonical ROM is changed.

Review the [native image at 4×](draft/native-4x.png), [combined/main/trim comparison](draft/compound-review-4x.png), and [original rendered source](source-front.png). The silver face, ornate oval gold frame and dark mirror surface come from the game mesh and textures. The face remains entirely on the main layer.

## Source and derivation

The [Models Resource asset](https://models.spriters-resource.com/xbox/shrek/asset/362695/page-1/) credits **BillyGaming964**, submitted April 30, 2025. The unchanged [archive](source-362695.zip) contains one OBJ, one MTL and six PNG textures: 999 vertices, 1,852 triangles, 992 normals and four material/object groups. It contains no rig or animation clips.

The page's observed public Download URL was opened normally in Chrome. [Provenance](provenance.json) records acquisition, archive/file hashes and usage terms. No account, CAPTCHA solving or agreement acceptance was involved. The archive is a ripped game asset, without a permissive license or license file; the host's [terms](https://models.spriters-resource.com/page/tou/) and original game/character rights apply.

`render-model.mjs` uses the original mesh, UVs, vertex normals and diffuse textures. Its lighting and exposure are locally selected. The original specular/normal maps are archived but not applied. No replacement geometry, painted facial features or image generation is used. The generic importer samples the rendered raster into the recorded twelve-color palette. The original boss supplies one visible frame and one intentional blank per layer, so this draft does not invent extra animation slots or relabel a blank as a facial pose.

## Native ownership and exact budget

| Resource | Original | Draft |
| --- | --- | --- |
| Shared graphics, GFX 213 | 2,048 raw / 1,938 compressed bytes | **2,016 raw / 1,363 compressed bytes**, 63 tiles |
| Main, enemy 190 / ASM 206 | 12 cells, 2 frames, 240 assembly bytes | Same |
| Companion, enemy 191 / ASM 207 | 8 cells, 2 frames, 160 assembly bytes | Same |
| Palette 232 | Private to these two enemies | Twelve replacement colors; original remaining entries retained |
| Animation 173, AI, headers | Original | Unchanged |

The main layer uses a 32-pixel-wide center strip, with twelve 16×16 cells. Eight companion cells supply the outer frame trim. Transparent padding prevents duplicate opaque pixels where the reservations overlap. Their union contains every source pixel. Both layers retain the original visible/blank frame IDs; the original blank-frame coordinates are retained byte for byte. The visible cell coordinates change within the original compound footprint. There is no additional WRAM, VRAM, hardware cell or frame ID.

The selected source pixel SHA256 is:

`59350c40f01e65ca8664af63230f3d3e37700215ee44719583706227c33a2883`

`compile-draft.mjs` verifies source hashes, resource ownership and palette aliases, the original enemy-header signatures, exact assembly lengths, every packed pixel, both blank frames and complete source coverage. [verification.json](draft/verification.json) records the original resource addresses, exact costs, AI hashes and geometry.

## Scene dependencies and remaining work

Location **268**, the original Geno Dome mainframe, loads enemy 190 and its companion 191 at the same position command `[141, 2560, 1776]`. Their event load offsets are 3,839 and 3,872. The existing scripted reveal, color effects and combat behavior still need review with the full project build.

The three **Display enemies (183)** use separate GFX 168, ASM 161, palette 144 and animation 143: eight frames, four cells, 960 raw bytes. Their resources also belong to NPC 127. Those screens are **explicitly uncovered** by this draft. Replacing them requires their own source and shared-owner review. The original boss name and workshop dialogue remain integration/story work; no behavior or dialogue is changed here.

## Reproduction

From the repository root:

```sh
node assets/raster/magic-mirror-model/render-model.mjs
node scripts/import-raster-art.mjs --preview-spec assets/raster/magic-mirror-model/import-spec.draft.json
node assets/raster/magic-mirror-model/compile-draft.mjs
```

The compiler writes only draft graphics, assemblies, palette and review artifacts in this directory. The exact original compressed slot can hold the proposed packet, and the two original assembly slots can hold the proposed tables, so this art does not need the expanded-cartridge allocator.

Private native proof uses an in-memory art overlay on the original ROM:

```sh
node .local/qa/magic-mirror/verify-native.mjs
```

It verifies both frames of both native layers, their palette and the combined native PPU output. It uses native field loading and a temporary diagnostic event, with 48 settled frames before captures. It never writes a ROM or shared checkpoint. The proof's exact scope and status are recorded in `native-verification/manifest.json` when successful. This is separate from full-project integration, independent-core validation and the real boss choreography.
