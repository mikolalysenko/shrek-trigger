# Hench hobgoblins — frozen inactive source

The approved model is an ordinary stout hobgoblin with a soft work cap, broad nose and ears, patched tunic and bare fists. It serves both peaceful townsfolk and hired guards. Root and the art lead approved all 37 native poses. This packet changes no active registry, content module, canonical ROM, title or music.

The pinned published baseline is `af338374669168012da0165d385209c5d3aa9789bb713ef488ef7dcb06e555a7`. The private native candidate is `9d6988fc1b04a340d0a64c42fa5ecb891d4b06bbcc128855204fd00ae0dffcc3`. The copied audit describes the original resources before generation; `freeze.json` and `handoff.json` describe the completed candidate.

Enemy 5 and enemy 75 exclusively own gfx83 / asm38 / AA30. Their exact palettes are 24 and 23 respectively. Neither has an NPC header alias, but enemy75 is also used as a friendly field resident. No palette, header, animation program, AI, stat, event or name changes are proposed. All 37 original slots retain four cells, authored cell order, XY origins and overlaps.

Five unchanged imagegen PNGs supply 29 authored source poses. Only the eight exact original mirror relations are reused to make 37 distinct native images. Six isolated original one-pixel motion flecks remain at their original coordinates and palette index4. Connected arm arcs and all anatomy come from generated sources. Provenance records original imagegen paths, hashes, prompts, selected and omitted cells, and source-reference images.

`import-spec.draft.json` plus `native-composition.json` reproduces the complete raster through the ordinary preview importer. Its 37 native slots are already composed: do not apply the 29-source map again. The canvas is 96×64, source origin [48,48], with native group anchor [0,16]. `compileHenchHobgoblins(art, geometry)` reproduces the exact 4bpp, compressed packet and assembly. The standalone compiler applies the anchor to assembly Y; integration should apply the group anchor once.

All native cells and lowest body pixels remain fixed. Approved source differences are explicit in `geometry-audit.json`: idle widths 26/26/19 pixels versus 27/29/24; wind-up13 shifts two pixels left; arcs14/17 are two pixels shorter while retaining the original flecks; pose17 is two pixels narrower; wind-ups16/19/22 are one pixel narrower. Full per-pose sampling and placements are recorded. No opaque source pixels are clipped and no body pixels collide with the retained flecks.

| Resource | Original CT and pinned af338 | Generated candidate | Difference |
| --- | ---: | ---: | ---: |
| Decoded graphics | 8,928 | 12,096 | +3,168 |
| Compressed graphics | 7,491 | 9,003 | +1,512 |
| Assembly | 1,480 | 1,480 | 0 |
| Compressed graphics + assembly | 8,971 | 10,483 | +1,512 |

Explicit gfx83 streaming is required. Compressed + raw stream + assembly totals 22,579 bytes, or +13,608 ROM bytes if the old 8,971 bytes are reclaimed. Root owns placement and reclamation. The unchanged native stream helper requires no additional WRAM or VRAM; the default decoded-size rejection must remain for unselected banks. The conservative kitchen202 union would be 34,496 bytes through legacy loading, exceeding the 32 KiB heap by 1,728. With gfx83 streamed, the real kitchen run measured 22,400 bytes. Other source-load unions are branch inventories, not simultaneous-residency claims.

Native proof in the repository 65816/PPU core passed 74 owner/pose uploads, 296 exact cells and 35,322 exact final palette pixels. All 72 nonempty owner/facing/action cases executed two cycles: 3,392 scored ticks plus 3,080 startup ticks, with unchanged AA30 requests/timers and zero measured isolated field display delay. Each of six battle layer samples also matched its current requested frame and XY state. These are bounded observations, not universal latency or independent-core claims.

Seven original-scene phases passed after reversible diagnostic entry and ordinary controller input: cathedral201 portrait ambush [75,75,75], fortress170 [5,5], hostile Medina inn35 [75,72,72], peaceful inn35, peaceful market39, peaceful square31 and kitchen202. All three battles reached normal damage and victory. The square retained enemy75 and delivered original dialogue219. The kitchen executed its original AA1 / AA5 / AA0 reactions. Peaceful inn/market instead load enemy13/gfx86; these prove unchanged branching, not visible hobgoblins. Existing historical checkpoint seeds precede Medina entry; square31 reuses that same seed before the original loader. Cathedral, fortress and kitchen retain the bedroom story value and use the development party kit.

The eight APNGs, 23 scene images, native cell/pixel reports and timing traces are private expanded evidence listed in `native-proof-manifest.json`. The kitchen capture includes dialogue dismissal and the actual reaction sequence; the square capture starts after its conversation. Map/text/party occlusion is reported separately from raw cell agreement. Other audited rooms, full campaign traversal, ordinary-level balance, independent cores and final production allocation remain root integration checks.

Reproduce from the repository root:

```sh
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/hench-hobgoblins/import-spec.draft.json
node assets/imagegen/hench-hobgoblins/verify-frozen.mjs --sources --proof
```

`freeze.json` separates the minimal source recipe from review material and expanded private proof. Only `import-spec.draft.json` is supplied; activation is intentionally absent.
