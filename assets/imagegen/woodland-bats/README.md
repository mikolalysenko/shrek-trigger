# Woodland and cave bats — frozen inactive artwork

This packet replaces the eight poses in gfx 103/asm 66 with an actual generated organic bat model: pale muzzle, large ears, fur and leather membranes. All three existing enemies remain Mad Bat 80, Vamp 81 and Cave Bat 115. Their original palettes 78/79, AA47, full size flags 192/224, four native cells, AI, stats, names and events remain unchanged. There are no NPC header owners or external bank/assembly/program/palette aliases on the pinned baseline.

Root and the art lead approved all eight native poses in both ramps. Review [the full native sheet](review/native-frames-1x.png), [poses 0–5](review/native-frames-0-5-3x.png) and [poses 6–7](review/native-frames-6-7-3x.png). Static approval is separate from the execution evidence below.

`source-v1.png` is the unmodified output of the built-in image generation tool; its exact prompt and hashes are in `provenance.json`. All eight source images are independently authored. Sampling uses nearest pixels and the unchanged original palette indices. No procedural anatomy, source mirrors or retained original body/effect pixels are used.

The source canvas is 64×80 with native origin [32,64] and group anchor [0,16]. Every original cell coordinate and cell order is preserved, including overlaps in 4/5/6/7 and the large native vertical displacement of the low folded poses. Only poses 5/6 change visible bounds: 19→17 px wide, centered at the same X and retaining their heights and lowest pixels. This fits the irregular four-cell coverage without clipping. The per-frame geometry and sampling factors are recorded in `geometry-audit.json`; `native-frame-map.draft.json` is the integration contract. Use the eight already-composed slots once and apply the anchor once.

| Resource | Original CT / published af338 | Candidate | Change |
| --- | ---: | ---: | ---: |
| Decoded 4bpp graphics |1,760|3,008|+1,248|
| Compressed graphics |1,281|2,225|+944|
| Assembly |320|320|0|
| Compressed graphics + assembly |1,601|2,545|+944|

Explicit gfx 103 selection in the existing native stream contract is required because 3,008 decoded bytes exceed the original 1,760-byte bank ceiling. Keep the default guard for unselected banks. Compressed + raw stream + assembly costs 5,553 bytes, or 3,952 net ROM bytes if the original 1,601 bytes are reclaimed. No extra WRAM/VRAM or native helper changes were used. All eight audited scene-load unions stay below 32 KiB, but those unions do not authorize bypassing the original per-bank ceiling.

The immutable baseline is `af338374669168012da0165d385209c5d3aa9789bb713ef488ef7dcb06e555a7`. The private proof candidate is `8565c1f02e1d49920be0618a9f0848883e54048898a378d0c7bdb2533c77765b`; it is not a canonical publication. Its existing native streaming helper is unchanged.

- All 24 owner/pose uploads pass: 96 exact cells and 7,542 exact unobstructed final palette pixels, preserving upper size flags and both ramps.
- All 84 nonempty AA47 owner/action/facing cases pass: 168 cycles, 4,584 scored ticks plus 4,080 startup ticks, unchanged requests/timers and coherent transfers. No isolated display delay was observed.
- Original encounters in cathedral 131, Heckran Cave 47 and Magic Cave 164 retain formations [75,75,80,75], [115,115,115] and [135,81,81], then complete native damage and victory. Entry used a reversible diagnostic with development party resources; subsequent traversal/combat used controller inputs. Each phase restored its pre-entry state exactly and left the cartridge unchanged.
- Six sampled battle layers preserve exact source cells/palettes/anchors with no observed sample delay. Original map/party overlap obscures some final pixels in the cave scenes; all opaque pixels are checked separately in the isolated proof.
- Both original Magic Cave Vamp patrols match baseline world XY at 1/16 px and frame/timer/phase/mode for 899 ticks each. Candidate tick 0 matches baseline tick 1: a one-video-frame startup phase offset, not a claim of universally identical display timing.
- Slot 7 is fully source-authored and uploaded for all three owners, but AA47 references only 0–6 and no real timing consumer for 7 was observed. Do not assign invented timing. Five other audited locations are load evidence only; independent cores and final production placement remain root-owned checks.

`native-proof-manifest.json` hashes the bounded private evidence, including 24 display images, 84 timing traces, three original encounter reports, nine screenshots, six native APNG captures and both flying-route traces. `motion-review.json` distinguishes native captures from the source-list HTML playback. `scene-budget-audit.json` records conditional load unions and measured encounter heaps.

From the repository root, reproduce the source raster and exact native binaries with:

```sh
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/woodland-bats/import-spec.draft.json
node assets/imagegen/woodland-bats/verify-frozen.mjs --sources --proof
```

The verifier compiles `native-raster.json` with `compileWoodlandBats(art, geometry)` and byte-compares the 4bpp, compressed packet, assembly and two unchanged palette records. `freeze.json` separates the minimal source/reproduction files from expanded review/proof files. Private ROMs and screenshots are not required source inputs. No active registry, compiler, title/music or canonical output is changed by this packet.
