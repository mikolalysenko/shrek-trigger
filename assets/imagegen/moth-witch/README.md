# Moth Witch source draft

This inactive generated-source sheet covers all **16 native Moth Witch frames** shared by enemy IDs **159, 160 and 187**. The original character keeps her antennae, plum moth wings with cream eye-spots and teal dress. The sprite-art lead approved its direction, scale and gestures on October 31, 2026.

Review [the native sheet at actual size](draft/native-1x.png), [the same pixels at 4×](draft/native-4x.png), [the generated source](source-v1.png), and [the real fortress battle capture](native-verification/fortress-moth-reveal.png). The small native face limits expression detail; wing shapes, folded-wing stages, hands and body gestures carry the identity.

## Source and conversion

The **built-in image_gen tool** generated `source-v1.png` with transparent output requested. The [exact prompt](prompt-source-v1.txt) and [provenance](provenance.json) are saved. Generated alpha is retained; the importer uses a recorded alpha threshold and area sampling into the existing twelve-color palette. No anatomy, facial marks or wing pixels are drawn by conversion code.

The source contains sixteen cells. Native right-cast phases 5–7 use those source cells; left-cast phases 8–10 mirror them. Native left-step A uses source 11, and left-step B uses reflected source 13. Their right-facing counterparts mirror those results. Source cell 12 faced the wrong direction for its requested slot, so it is not consumed. Source cells 8, 9, 10 and 14 are also unused in favor of coherent explicit mirrored pairs. [The import spec](import-spec.draft.json) records every mapping. There are no blank native slots and no idle substitutions for missing roles.

| Native slots | Source role |
| --- | --- |
| 0 | Front idle |
| 1–3 | Closed-wing invocation / defensive cocoon phases |
| 4 | Front guard / reaction |
| 5–7 | Right charm gather, windup, release |
| 8–10 | Corresponding left charm phases |
| 11–12 | Left steps |
| 13–14 | Right steps |
| 15 | Hunched hurt / defeat recoil |

The earlier nearest-sampled preview remains in `draft-nearest/` as an unselected comparison. Area sampling preserves cleaner wing and gown clusters.

## Native ownership and budget

[The original audit](native-audit.json) records every source cell coordinate, frame bound, header, palette alias, animation byte and AI hash. GFX **182**, ASM **179** and palette **210** belong only to the three listed enemies; palette 210 has no pointer aliases. Animation **137** remains its original 128 bytes.

| Resource | Original ROM | Current active artwork | Candidate |
| --- | ---: | ---: | ---: |
| Decoded graphics | 4,320 bytes | 3,680 bytes | **6,400 bytes / 200 tiles** |
| Compressed graphics | 3,376 bytes | Separate current resource | **4,467 bytes** |
| Assembly | 1,280 bytes | 1,280 bytes | **1,280 bytes** |
| Native frames / cells | 16 / 8 | 16 / 8 | **16 / 8** |

The candidate uses the existing 32×64 rectangular cell layout and existing offsets: frames 11–12 shift by `[0,-2]`, frames 13–14 by `[0,-1]`. It does not claim byte-identical original per-cell coordinates. All header sizes, frame IDs, animation timing, palettes, AI, stats and combat behavior remain unchanged. There is no additional WRAM, VRAM or hardware-cell reservation.

**The ordinary family-size guard is unchanged and intentionally rejects this candidate**, because 6,400 decoded bytes exceeds its original 4,320-byte resource. This inactive art requires a parent-controlled, scoped budget decision and relocated compressed/assembly placement before activation. The draft does not weaken a global guard or rely on unproven large-actor direct-ROM streaming.

The conservative union of every event load branch stays within the 32 KiB heap in both audits:

| Location | Original resources + candidate | Current resources + candidate |
| --- | ---: | ---: |
| 63 | 29,792 | 22,368 |
| 92 | 28,064 | 23,552 |
| 173, fortress duel | 9,568 | 9,568 |
| 180, lieutenant trio | 26,976 | 20,160 |
| 182 / 183, rematch | 14,592 | 11,136 |
| 391 | 25,280 | 25,280 |

[Current co-load details](draft/current-co-loads.json) identify every actual resource and the tested active ROM hash. These are conservative whole-location unions, not an assumption that every event branch loads simultaneously. They must be recalculated when Horner, Briar Knight or other co-loaded artwork changes.

## Native proof

[The private native manifest](native-verification/manifest.json) records the source-fixed active ROM `2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066` and overlay ROM `6d99e8c998a2c256a4e2cb013b6ee3262d19a19ef78dfd519c846c29a79b4494`.

All **48 native frame uploads** passed: sixteen frames for each of the three enemy headers. Every VRAM byte and opaque PPU pixel matches the sampled source. Palette ownership and native vertical offsets are checked. Captures use the settled-frame helper and at least thirty additional frames.

The real location 173 controller route also passed: original decoy 240, transformation/reveal to enemy 159, ordinary battle victory, the one-time item 206 reward and exit to location 125. That proof uses ordinary controller input after the existing development starting preset. AI and event flow are unmodified. Rematch/trio gameplay and independent-core validation remain later integration checks.

The private proof places the compressed packet and assembly in a verified unused lower-half ExHiROM span. It preserves the current build’s ordinary decompression and native large-sprite loader. It never activates the import spec, edits an engine module, or writes a cartridge/checkpoint.

## Reproduction

From the repository root:

```sh
node assets/imagegen/moth-witch/audit-native.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/moth-witch/import-spec.draft.json
node assets/imagegen/moth-witch/compile-draft.mjs
node assets/imagegen/moth-witch/verify-native.mjs
```

The source PNG and prompt are immutable inputs; no regeneration is needed to reproduce the conversion. [freeze.json](freeze.json) records source, conversion and proof hashes. There is no active `import-spec.json` in this directory. Integration would consume `rasterArt('moth-witch', {pose:'native', facing:1, phase:frame})` while retaining the existing header/animation ownership and explicit size checks.
