# Native event palette sharing audit

This inactive, read-only audit found one additional visible palette regression outside the separately investigated parade in location 80. In the Fair (location 5/event 27), Muffin Man's new palette turns five automatic NPC palette groups into six. The native allocator fails for object 16 at `$C072B2`; the merchant retains row 0 and appears in the racer palette after the camera moves west. The original USA cartridge does not fail in the same sequence.

The evidence is pinned to original USA `06d1c2b06b71…` and published `af3383746691…`, with complete hashes and paths in [headers.json](headers.json). Root owns the active correction and its verification. This packet does not claim that a newer cartridge has the defect or that its fix has passed.

## Confirmed Fair regression

[fair5-report.json](fair5-report.json) records the exact load operands, initial allocation order, native failure, source palettes, actual CGRAM words, actor-specific OAM cells and framebuffer comparisons. At the recorded tick 1600, all 342 visible merchant pixels match the wrong row 0 palette and zero match his intended palette9. The remaining 46 source pixels are behind the original foreground. The original cartridge has 342 intended-color pixels and the same 46 occluded pixels.

| Initial group | Original USA | Published af338 |
| --- | --- | --- |
| Racer NPC75, palette14 | row 0 | row 0 |
| Racer NPC76, palette16 | row1 | row1 |
| Racer NPC59, palette161 | row2 | row2 |
| Crowd, palette133 | row3 | row3 |
| Melchior / Muffin Man NPC0 | shares133/row3 | palette139/row4 |
| Merchant NPC22, palette9 | row4 | allocation failure; stale row 0 |

The normal native NPC allocator uses rows 0–4. The active Shrek in this fixture uses row 5; unused party rows 6/7 are not additional automatic NPC slots. Later culling can free rows, but the failed merchant is not retried while he remains in the same culling window.

Existing NPC89 has the same gfx11, asm7, AA7 and size as NPC22, with compatible palette133. NPC49 still uses palette9. The root-owned correction can therefore replace the three event operands 22→89 without changing the event objects, dialogue, shop functions, global palette data or sprite resource model.

The event has 29 objects and 2570 decoded bytes including its object-count byte. Its original compressed packet is 1685 bytes at physical `$1B05DE`; published af338 is 1680 bytes at `$1DDEA8`. Operand coordinates are:

| Event object | Init/opcode body offset | Operand body offset | Full decoded operand index |
| --- | ---: | ---: | ---: |
| 16 | 2132 | 2133 | 2134 |
| 24 | 2381 | 2382 | 2383 |
| 25 | 2415 | 2416 | 2417 |

Body offsets exclude the object-count byte. Each original load is `82 16` in hexadecimal; the compatible load is `82 59`. Source pointer and decoded packet hashes are in the report.

## Three practical checkpoints

Start from the saved normal new-game field state. Set story byte `$7F0000` to 5 before the reversible diagnostic jump; do not alter palettes, actors or events afterward. The runner sends ordinary three-tick confirm taps every 130 ticks after tick 600 unless a specified movement is active.

| Target | Entry | Controller sequence | Recorded native result |
| --- | --- | --- | --- |
| Object16, crowded camera | `jump({id:5,x:28,y:32})` | Hold Left/key 64 at ticks 1500–1559; capture 1600 | world 304,500; screen 16,116; tiles 288/290/292/294 ; 342 visible wrong-color pixels on af338 |
| Object24, southern tent | `jump({id:5,x:16,y:40})` | Wait 450 | world 240,596; screen 112,84; tiles 328/330/332/334 ; 342 intended-color pixels, 46 foreground-occluded |
| Object25, western bell attendant | `jump({id:5,x:5,y:36})` | Wait 450 | world 56,575.9375; screen 56,127; tiles 352/354/356/358; 388 intended-color pixels, no occlusion |

The latter two placements retain correct palette9 in both pinned cartridges through 900 ticks; they are checkpoint coverage, not additional failures. Their original load-position commands are pixel-position 240,596 and tile-position 3,35 respectively. Compare each actor's source palette to its current CGRAM row; do not require a historical row number after the fix. OAM matches are restricted to that actor's `$0D00` tile slot, so identical merchant frames cannot be mistaken for each other.

Actual captures: [crowded original](native-verification/fair-pan-west-original-1600.png), [crowded af338](native-verification/fair-pan-west-current-1600.png), [object 24](native-verification/fair-merchant24-current-450.png), [object 25](native-verification/fair-merchant25-current-450.png).

## Wider bounded audit

All 512 location pointers were attempted; 504 original/current event packets decode. Eight invalid original pointers are listed in [report.json](report.json). A command-aware parse finds 76 explicit opcode 33 assignments in only three locations: 38,80 and 464. Outside the excluded parade 80, no actors that formerly shared equal source colors acquired incompatible colors on the same explicit row.

Opcode 33 copies the calling actor's source palette into its specified hardware OBJ row. Opcode 8E sets sprite/background priority; it does not assign a palette. [native-semantics.json](native-semantics.json) records byte-identical original/current CPU code and the allocator observation sites.

Original/current native checks cover Fair camera positions, court 27, throne ending 79, End of Time ending 84, Bram flashback 206, scene 38→37 and Last Inn 464. Their complete scope, ticks and actual pixel evidence are in the 24 manifests linked by the report. No other visible color collision was observed in these bounded entry/staging runs. Full stories, every ending branch and every camera path were not traversed.

[automatic-splits.json](automatic-splits.json) is a 32-scene research inventory, not a defect list. It includes hidden, mutually exclusive and offscreen actors; an all-branch palette union does not prove simultaneous allocation. Detailed parade 80 evidence belongs to `assets/imagegen/town-tradesmen/scene-verification/` and is not duplicated here.

## Reproduction

Run from the project root. Inputs are local, private ROM copies and are never included in the whitelist. The scripts assert both input hashes and never write to either cartridge or active project files.

```sh
node assets/raster/event-palette-sharing-af3383746691/extract.mjs
python3 assets/raster/event-palette-sharing-af3383746691/parse-events.py
node assets/raster/event-palette-sharing-af3383746691/analyze.mjs
node assets/raster/event-palette-sharing-af3383746691/analyze-automatic.mjs
node assets/raster/event-palette-sharing-af3383746691/probe-scenes.mjs fair-pan-west fair-merchant24 fair-merchant25
node assets/raster/event-palette-sharing-af3383746691/probe-scenes.mjs fair-east fair-center fair-west court throne-ending end-time-ending bram-flashback smithy-ending last-inn
node assets/raster/event-palette-sharing-af3383746691/write-report.mjs
node assets/raster/event-palette-sharing-af3383746691/verify.mjs
```

The command decoder and local disassembly are existing external research dependencies; their paths and hashes are recorded separately in the freeze. Private decoded source packets and emulator states are reproducible scratch data, not distributable artifacts. The source and proof whitelist intentionally omits redundant scene screenshots.
