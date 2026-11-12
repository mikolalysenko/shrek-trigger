# Bone Warden and Warden Echo

This is an inactive, source-generated replacement for the two native skeleton boss layers. Root approved the **area-sampled** appearance after reviewing every upper/lower slot and both palette variants. No production engine, content, registry, music, title or cartridge file is changed by this packet.

The artwork comes from seven preserved built-in imagegen outputs. The first two establish one coherent skeleton model; three sheets provide upper movement, upper actions and lower actions; two targeted source edits correct the extended frontal fingers and four lower-body poses. The importer selects **23 authored source poses**, with eight explicit complete-source mirrors, for all **31 native slots**. There are no procedural anatomy pixels, invented blank slots, missing poses or cropped fingertips. The old compound and accepted Bone Guard sheet were identity/style references only.

## Native contract

| Layer | Owners | Graphics / assembly | Frames / cells | Decoded | Compressed | Assembly |
| --- | --- | --- | --- | ---: | ---: | ---: |
| Legs | 179 / 181 | 170 / 163 | 10 / 12 | 7,712 | 5,597 | 1,200 |
| Crown and palms | 180 / 182 | 171 / 164 | 21 / 8 | 11,840 | 8,631 | 1,680 |

Original size flags, animation 127/128, durations, enemy AI, stats, palette IDs 203/204 and their twelve opaque colors are unchanged. Both layers use a 64×64 transparent staging canvas with explicit cell origins and signed per-frame offsets. **Use the complete emitted family geometry**, not the old procedural offsets. The crown root remains 32 pixels above the leg root on the bridge and 39 pixels above it in the original three-part Echo encounter. The Echo spacing is verified against the unchanged baseline; enemy 58 remains its separate native core. The waist lock belongs only to the leg layer; upper sources contain no pelvis or leg pixels.

Only crown frames **9, 18 and 20** use overlapping cells. Every overlap repeats the identical indexed source pixel. All other crown frames and every leg frame are nonoverlapping. The general compiler overlap guard stays enabled; omitting the explicit three-frame allowlist is asserted to fail. The native proof verifies the resulting uploads and rendered pixels, including these shared areas.

Each bank stays below the original 1,024-tile / 32 KiB addressing limit. Combined decoded art grows by 10,144 bytes over the original cartridge or 12,544 bytes over the pinned earlier project art. Compressed storage grows by 10,769 bytes over that earlier project, with no assembly-size growth and no additional OBJ cells or fixed memory reservation. The private bridge route uses 30,592 of the existing 32,768-byte field heap. **Production should retain its normal decoded-size guard and explicitly select the proven native streaming contract for graphics 170/171**, or supply equivalent complete-scene residency evidence; this packet does not bypass any guard.

## Integration and review

- Crown raster key: `warden`; spec: `import-spec.crown.draft.json`.
- Leg raster key: `warden-legs`; spec: `import-spec.legs.draft.json`.
- Both use `native`, facing 1, phase equal to the original frame ID.
- Geometry: `upper-draft-area/family.json` and `legs-draft-area/family.json`.
- Semantic mapping and source substitutions: `native-roles.json`.
- Every compound pose: `compound-area-1x.png`, `compound-area-3x.png`, and the corresponding Echo files.
- Comparison: `full-sampling-comparison.png` has **AREA top, NEAREST bottom**.
- `motion.html` replays the original list timing with palette/scale controls; it is an indexed review, not an emulator capture.

The native tests use a private in-memory overlay of the pinned local `2e2a574e…` cartridge. No ROM is exported or modified on disk. All 62 owner/frame uploads and 62,044 opaque framebuffer pixels pass, with both exact palettes. Animation 127/128 passes 7,560 tick-for-tick samples across 42 original direction/mode cases. The normal bridge controller passes its choices, two skirmishes, the original two-part fight, story 90 and the world exit; 191 matched compound observations preserve the root attachment, and a complete 1,832-pixel compound frame has zero mismatches. The direct OAM proof accounts for the SNES OBJ pipeline's next-scanline display.

The Echo scene proof covers original location 161's reveal and three-part formation. Its source cells and native roots retain the original 39-pixel spacing, separately verified against the unchanged baseline. The two exact compound captures and both native palette ramps have zero source-pixel mismatches. Its unchanged third core, enemy 58, is outside this artwork packet. A full forest-restoration quest completion and final canonical/independent-core integration are not claimed here.

## Reproduce

`node assets/imagegen/bone-warden/reproduce-draft.mjs`

This reruns source extraction, palette quantization, cell packing, exact 4bpp round trips and review exports. It never calls imagegen or writes active registrations. The frozen manifest checks all listed derived files byte for byte. The original ROM and pinned private proof baseline remain local prerequisites for the separate native proof scripts; original cartridge sprite sheets and diagnostic savestates stay under ignored `private/` and are excluded from the reproduction whitelist.
