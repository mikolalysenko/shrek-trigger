# Furnace Maw and Buried Kiln — inactive source-art packet

This packet replaces the eight animated head slots and the stationary background body with actual generated artwork. The two enemies retain their existing iron/ember and rust/rose palettes. Production engine, content, registry, music and cartridge outputs were not edited here.

The final head model uses `source-heads-v3.png` cells0–4 and the fully shut eye pose from `source-heads-v4.png` cell5. Right-facing heads are exact whole-source mirrors of the left-facing poses. Earlier generated atlases are preserved because they are references in the recorded edit chain; they are not sampled into the final artwork. The body comes from `source-body-v1.png`, sampled into the original twelve colors, then reflected from left to right to obey the original background tile reuse. No anatomy is painted in code.

## Review

- `native-frames.html` / `native-frames.png`: all eight heads, both palettes, and body/head compounds at native and enlarged sizes.
- `furnace-heads-1x.png`, `furnace-heads-3x.png`, and the corresponding `buried-*` sheets: the exact indexed head images.
- `motion.html`: the original animation164 lists at60ticks/s, with native-size and palette controls.
- `scene-verification/bakery-furnace-battle.png` and `buried-furnace-battle.png`: actual original encounter entries with the candidate body and head.
- `scene-verification/baseline/`: unchanged saved-cartridge captures and attachment evidence.

The original open front head is75pixels tall. The old project drawing used a48×64 approximation; this draft instead stages the real extent on a transparent64×96 canvas, while retaining the original twelve16×16cells and960-byte assembly. Generated v3 narrowed the chimney and lower jaw enough to fit without clipped pixels or overlapping cells. The last generated correction makes native7 fully close its eyes so it remains distinct from native6 after palette reduction.

## Exact integration contract

Root owns activation. The two inactive specs are `import-spec.draft.json` (key `furnace-maw`) and `import-spec.body.draft.json` (key `furnace-maw-body`). `draft/family.json` contains the complete proposed head geometry. Use its64×96 staging, `[0,32]` anchor and per-frame twelve-cell origins together. Its empty `frameOffsets` is intentional: the original side/open extents are already placed in the sampled frames. Applying the old procedural offsets again would shift the artwork twice.

The head still uses GFX34 / ASM23 / animation164 / size byte6. Both enemy owners188 and189 are exclusive; palettes229 and230 have no other header owner or pointer alias. Native6 is a narrowed-eye/teeth phase; native7 is fully shut. Original headers, AI, animation programs, duration programs, stats, battle formations and map choreography remain unchanged.

The body remains separate background storage: BG190 is4096bytes with116 owned tiles and12 untouched architecture tiles; BG171 is512bytes with15 owned tiles and one untouched tile. No map, metatile, collision or scrolling data changes. The repeated buried edge tile is proved byte-identical at every use. Background palette groups76(slots5–7) and79(slots6–7), including their existing color13–15 aliases, stay unchanged. All palette/tileset/location ownership checks still run.

The actual native body screen origin is `[72,-16]` in both verified encounters. The head anchor is `[128,80]` in the live lair and `[128,79]` in the buried lair, giving body-relative attachments `[56,96]` and `[56,95]`. Both values are identical to the saved-cartridge baseline. The earlier concept compound assumed a world-map origin without the scrolling tile cache; it is not the final alignment reference.

## Budgets and evidence

The final head uses7200 raw bytes,5776 compressed bytes and960 assembly bytes. This is2880 fewer raw bytes than the original cartridge family, and4416 more than the previous simplified project head. BG190 compresses to2658bytes; BG171 to112bytes. Their raw sizes are unchanged. Against the pinned previous project cartridge, total compressed graphics growth is5192bytes; assembly growth is zero. No additional WRAM or VRAM is reserved.

`native-verification/manifest.json` records all16 native head uploads, both exact12-color CGRAM ramps and30,656 opaque on-screen head pixels through the unchanged special-size6 path. `motion-verification/manifest.json` records900 exact native ticks across six original lists. The private candidate ROM fingerprint is `ea330b53fbb262f69c9722ef46f6963add83790c3e61386c0e71ae5002e776fe`; it was built only in memory from the pinned saved cartridge.

Both actual encounter entries verify the complete BG bank bytes, the native palettes and the attachment. The decoded scene heaps are13,376 and14,752bytes, below32KiB. The scene verifier also counts exact framebuffer body pixels; it deliberately does not call obscured pixels proved. Battle announcement windows, foreground and small sprite/frame-boundary occlusion remain visible in the residual count. Exact source-to-BG tile reconstruction and all shared architecture bytes are independently verified. Full defeat/aftermath routes and independent-emulator integration remain root-owned.

## Reproduction

Run `node assets/imagegen/furnace-maw/reproduce-draft.mjs` from the project root. It uses the saved PNGs and preview-only importer, checks the exact4bpp/compression reconstruction, and regenerates the review artifacts. It never writes the active generated module or a ROM. The local original cartridge at `.local/chrono-trigger-usa.sfc` is required for original ownership checks and preserving the unowned background bytes; it is not included in the packet.

The optional native verifiers are `verify-native.mjs`, `verify-motion.mjs`, and `verify-scenes.mjs`. They use the saved cartridge path recorded in `private-overlay.mjs`, prove their private expanded-bank placement is unused, and do not write a cartridge. Use `verify-scenes.mjs --baseline` for the unchanged comparison. `freeze.json` and `reproducibility-files.txt` identify the minimal frozen inputs, evidence and derived outputs. Unselected sampler experiments, exploratory packing solvers and private original-ROM screenshots are excluded.
