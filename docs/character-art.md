# Generated character artwork

**Current scope (November 6).** Custom sprites remain only for the playable cast, characters critical to the plot and direct Shrek references. Several families recorded below as integrated milestones are now stock Chrono Trigger art again: the court sergeant, Palace Hexer, frog guards, sewer trolls, Kilnbacks, Crumb Hunters, Bone Guards, Clockwork Ushers, Storekeeper, Bone Warden, Crag Keeper, Woodland Sprite, hobgoblins and storybook townsfolk, bats and jugglers. See the [decision log](decisions.md); the sections below are history for those families.

## Party outline convention

Chrono Trigger reserves two entries of every party sprite palette for the outline. When a status such as Haste or Protect lands, the battle engine cycles entries 1 and 12 of that character's palette through the status color. Entry 1 is a near-black outline that also draws inner line work; entry 12 is a softer dark accent used only on the silhouette (stock Crono: `291820`, `412039`). The imported party art predated that rule: outlines mixed several dark colors and entry 12 was an ordinary body color, so statuses lit up hair, clothes and skin instead of the outline.

`engine/party-palette.js` derives a conforming palette from each imported one, and `engine/raster-art.js` applies it when the art is read. Near-blacks join entry 1, the closest remaining colors merge until ten body colors are left, and every silhouette pixel becomes outline: 1 beside dark colors, 12 beside lit ones. Single-pixel lines such as blades keep their color. Puss's hatchet frames, every party portrait (remapped only, no outline pass) and Granny, who is drawn in Shrek's colors, share their character's conversion. Pinocchio's sprites and portrait are a new cel-shaded render of his model (`assets/raster/pinocchio-clean`) that follows the convention directly. `tests/party-outlines.test.mjs` checks every native frame and a live Haste glow.

## Motion and overworld review

Shrek's four run directions each contain six genuine foot-contact drawings at the original native cadence. Fiona likewise reuses her reviewed four-contact walking gait at run speed, excluding the spread-arm gestures that an earlier sequence had placed in locomotion slots. Fiona, Donkey, Puss (with either weapon), Mongo and Farquaad now use four distinct poses across their six-phase walks and real multi-drawing run/battle/cast cycles where those native loops exist. Pinocchio's existing cycles and Granny's contact/passing gait were already valid and remain intact. Donkey has separate alternate knockout drawings. Direction assignments for Donkey 205, Puss 168, Mongo's corrected story/combat slots and Farquaad's front/back float pairs were checked against the original ROM animation tables rather than inferred from appearance.

The overworld has a different native layout from the field engine: front frames 0/1, back walk/idle frames 2/3, and left idle/step/step frames 4/5/6. OAM mirrors the side frames for right. `engine/environment.js` compiles that exact sequence and reduces each 32×32 field drawing to a seven-opaque-color 16×16 sprite with dominant-color voting and outline/contact preservation. Palette rows remain keyed by playable ID, as selected by player OAM. This avoids the old wrong-direction bank, static side pose, point-sampled feet and magenta out-of-palette pixels.

The gallery defaults to playable run cycles on a light background, with dark and checker alternatives, and includes complete four-direction motion and overworld sheets. Regression coverage:

```sh
node --test tests/sprite-motion.test.mjs tests/overworld-controller.test.mjs
node --test tests/player-art.test.mjs tests/party-outlines.test.mjs tests/shrek-acting.test.mjs
npm run test:party-art-cores
```

The controller test measures the live OAM frame sequence, horizontal mirroring and CGRAM colors while moving in all four directions. Distinct-pixel checks cover the repaired loops; the independent-core run checks every party variant in Snes9x and representative poses in bsnes. Intentional one-frame story holds are not treated as broken animation.

## Court, palace and swamp creatures

The current integration adds three generated banks, 137 native slots and 327 owner/pose cases for the Duloc court sergeant, Palace Hexer, Swamp Imps, rollers and mounted riders. The source contract now contains 50 banks, 853 slots and 2,581 source/evidence files. Compound riders preserve independent covered cells as well as visible pixels. See [court and swamp artwork](court-swamp-art.md) for native ownership, exact source reproduction, scene tests and remaining work.

## Endgame actors and oven interior

The earlier endgame integration adds seven banks and 146 owner/pose combinations for Rumpel, Wishworks Golems, giant Godmother, oven arms and Tyson’s emergence, plus the oven body and pulse. The accepted source contract contains 44 banks, 637 slots and 2,097 files. See [endgame artwork](endgame-art.md) for exact geometry, ownership, native scene coverage, resource budgets and remaining campaign work.

## Civic guards, frog guards and sewer trolls

Three generated banks add79 native slots and 262 owner/pose combinations. NPC 75, both guard enemies, both sewer trolls and all five frog variants retain native ownership, palettes, mechanics and cell budgets. Complete source/assembly reproduction, scene coverage and the compressed-storage decision are documented in [guard artwork](guard-art.md).

## Enchanted pots, beetles and briars

Cartridge `f33843436880bf0b7988308e2d684065c8ef6c715641cfc0d3038232f1f8ca15` integrates the approved generated pots, beetles, Rootlings, snapping briars and Briar Rider. Three complete graphics banks contain 100 native slots and 207 owner/pose combinations. Their seven source groups retain every original owner, header, animation program, cell reservation, AI, stat and reward. Existing approved palettes, including palette 111 shared across pots and beetles, remain exact.

| Bank | Native slots | Decoded bytes | Assembly bytes | Owners |
| --- | ---: | ---: | ---: | ---: |
| Enchanted pots, graphics 112 | 24 across three assemblies | 7,840 | 960 | 7 |
| Scrap/Briar Beetles, graphics 92 | 29 | 6,144 | 1,160 | 2 |
| Rootlings/briars/rider, graphics 89 | 47 across three assemblies | 12,352 | 2,840 | 7 |

The pot and beetle geometry preserves all 424 original X/Y bytes. Their larger source canvases carry the original offsets through a shared bottom anchor; the old procedural offsets are removed rather than applied twice. Beetle slots 21–28 remain explicitly unreferenced source adaptations. Rootling and rider duplicates retain their original translations and four original indexed rider shadows. The rider's mounted poses combine sampled Rootling and guard art in an explicit layer order; every final frame must reproduce its reviewed hash. The importer regenerates these compositions from the source PNGs and recorded mappings, with clipping, invalid layers and shadow overlap rejected.

The rootling source proof records 184 original action/direction cases over 7,536 ticks. Twenty-four rider phase boundaries arrive one video frame later while a complete preceding frame remains visible; four-cell groups have no recorded delay. Pot/beetle proof covers 112 native list executions over 26,880 ticks. These timings belong to the frozen private source candidates; the integrated pose and scene checks below use the current cartridge.

Graphics 89, 92 and 112 use explicit selections in the existing native streaming path, with their ordinary compressed forms placed in existing ExHiROM storage. The 57 raw streams total 405,344 bytes; nine compressed packets total 76,227 bytes. The image leaves 13,102 reclaimed original bytes and 1,390,112 extended bytes free. No WRAM, VRAM, object cells or palette slots are added. Original assembly 50's 1,920 used bytes at `23:F140` remain reserved and unchanged; its unproved tail is never reclaimed.

The source contract covers 37 banks, 547 slots and 1,743 source/evidence files. All 207 poses pass in both independent cores; Snes9x also checks exact native uploads and palettes. Both cores pass the original forest pot/beetle fights, Arris infestation, conveyor battle/return and the rider's four-direction interaction in original developer ending room 342. That room is a display demonstration, not a new battle. Other source-audited location initializations do not establish complete chapter coverage.

The connected future route uses a bounded wait inside the first Lab 16 ambush zone. The old driver moved onward before the original rat/sound work completed and later tried to return through a blocked waypoint. Waiting for the native battle in its original zone fixes the driver without changing any ROM, story flag or actor coordinate. Focused results, complete connected-route status and publication are recorded in [production status](production.md).

## Cosmic Muffin exterior, disaster and offspring

Cartridge `103254b3e126b5716a5957ed7b395ca05ee6c63ff15b35fa5d5063ba2c837d44` adds generated crust, wrapper, mouth, world-disaster, meteor and offspring artwork. The source contract covers 34 banks, 447 slots and 1,545 frozen source/evidence files. The canonical full name is Cosmic Muffin; the eleven-character battle label is `The Muffin`.

The seven mouth poses serve fourteen enemy owners and one time-echo NPC. Original eight-cell layouts, all header flags (including enemy 196's size byte 37), animation programs, AI, statistics and rewards remain intact. The body replaces only its dedicated background tiles; shared vortex edges, map, tile aliases and collision remain unchanged. The main body's exclusive palette ramp and enemy palette 207 receive warm crust colors. The shared time-echo palette 159 remains exact.

The world packet changes 48 of its 256 tiles, preserving all other graphics. The Mode 7 meteor uses the original map, palette and transforms with a generated low-nibble-first packed texture; empty tiles 0 and 36 remain exact. Both packets retain their original 9,440-byte combined decoded size and save 81 compressed bytes. No Tyson art appears in these scenes.

The two offspring mouths retain their two four-cell poses. The fixed bodies retain their original 24-cell upload, one visible frame and one intentional blank slot. Their common palette 208 and all native head/body mechanics remain exact, including the headless body's push-and-climb behavior. Their combined raw and compressed packets shrink by 32 and 204 bytes respectively; the 608-byte head bank uses an explicit raw stream while the 2,528-byte fixed body uses the original loader.

Only graphics 163 and 176 join the existing native raw-stream path. The 54 selected banks occupy 379,008 bytes; six standard extended compressed packets remain 59,534 bytes. The image leaves 6,446 reclaimed original bytes and 1,433,152 extended bytes free. No runtime buffer, palette slot, object cell, WRAM or VRAM is added.

Ten distinct focused source, ownership, upload, scene and reviewer-guard tests pass across their initial/corrective runs. Both independent cores verify all 109 mouth/head owner poses, the original fixed-body uploads/encounters, four offspring battles, the movable platform, the full-size shell arrival and the archive disaster. The meteor acceptance follows the original Furnace Maw fight through the cinematic, impact, flight dialogue and playable overworld continuation. Snes9x additionally verifies exact texture uploads; bsnes verifies native scene execution and displayed output.

Two test-fixture corrections are material. An eight-cell time echo must be selected before the kitchen NPC's original initialization, so the game reserves eight cells; changing a previously initialized four-cell caretaker also failed on the preceding cartridge. Separately, `FF 24` replaces the field engine and resets its stack. A bedroom-only injection displays the meteor but does not establish the story continuation. The accepted meteor test enters before the real predecessor fight and uses only controller input afterward. Neither correction changes ROM behavior.

Source-only regeneration reproduces the raster catalogue, geometry, body/world/meteor module and exact cartridge. Floating IPS reconstructs the 1,573,537-byte BPS (`12e4bc389b8de8334099be84fb0d1c40c25009e2c4254033bf69ecdb651d623c`). Desktop/mobile review covers 115 atlases and 3,800 frames, retaining all four technique cards and adding native shell/offspring captures. Run `npm run test:cosmic-art-cores` and `npm run test:cosmic-scenes`; the scene runner accepts `--section=spawn|shell|archive|meteor`.

Evidence is under `.local/qa/cosmic-103254b3e126/`, `cosmic-pass-art-103254b3e126/` and `cosmic-scenes-103254b3e126/`. The full shell approach/callback/defeat/entrance matrix, other apocalypse branches and later endings remain separate campaign work. The oven interior is a delegated, inactive source-art pass and is not included in this milestone.

## Wisps and workshop residues

Published cartridge `fdb8865eda88fcf8e9aea35de50c688b38a131da48ca73e5c72d42c36b66f2a6` adds thirteen generated poses shared by six wisp/slime enemies (78 owner/pose combinations). Graphics 102 and assembly 64 retain four native cells, all original animation programs and five unchanged palettes. The source package records exact heights and bottom anchors, narrower stretch/curl/mote silhouettes and the wider splash. Unrelated users of palettes 70 and 74 retain their original graphics and palette values.

The 3,424-byte decoded bank fits its original 3,616-byte limit and uses ordinary native decompression. Reclaimed original ROM was too fragmented for the complete new build: a 528-byte event could not fit the largest remaining 284-byte span despite 3,928 free bytes. Only the complete 2,758-byte compressed graphics packet moves into the already supported ExHiROM allocation. No new streaming hook, WRAM, VRAM, palette slot or object cell is needed. The image leaves 6,158 reclaimed original bytes and 1,438,528 extended bytes; six extended compressed packets occupy 59,534 bytes. The 52 raw NPC streams remain 373,632 bytes.

The source contract now contains 31 banks, 436 slots and 1,324 source/evidence files. Ten focused wildlife/source checks plus the separate native factory check pass, including every wildlife pose in SnesJs. Both independent cores pass all 284 selected machine/wildlife owner poses and the actual factory terminal, five-enemy ambush, victory and control return. The laboratory's original RNG selects its Sour/Lye mixture; the controller fixture checks the five legal enemies rather than requiring one particular random composition. Connected future-route status and publication evidence are recorded in [production status](production.md).

Source-only regeneration reproduces both generated modules and the exact cartridge. Floating IPS reconstructs the 1,548,781-byte BPS (`0a3bb2d2b9fa76cd5b81ac0abb61c208d44becaa0dafd5a91fcce9186c95c642`). The review pack adds all six variants, bringing the gallery to 109 atlases and 3,778 frames; every atlas passes desktop/mobile checks. Cartridge, patch and gallery are published together without resetting the live game. Evidence is under `.local/qa/residues-fdb8865eda88/`, `machine-pass-art-fdb8865eda88/` and `machine-scenes-fdb8865eda88/`.

## Machine and wildlife integration

Published cartridge `74274150609bd926882a96bab0f13b63d17b06b330b7b2c93f03f16f95a997e2` adds nine generated graphics banks, 104 native slots and 207 owner/pose combinations. The frozen source contract now covers 30 banks, 423 native slots, three background packets and four racing packets. The sprites are sampled from saved generated images into the existing SNES colors; the Golem also retains its original indexed shadow. Original actor IDs, animation programs, palettes, statistics, AI, rewards and object-cell reservations are preserved.

| Family | Slots | Decoded bytes | Native cells |
| --- | ---: | ---: | ---: |
| Duloc Tank chassis | 1 | 2,432 | 24 |
| Tank head | 5 | 2,112 | 4 |
| Tank wheel | 2 | 1,024 | 4 |
| Mire / Iron Golems | 32 | 18,656 | 8 |
| Drain Imps | 20 | 2,912 | 4 |
| Scavenger Rats | 13 | 2,560 | 4 |
| Sugar Ward | 3 | 1,120 | 4 |
| Muffin Core | 3 | 1,376 | 4 |
| Rivet | 25 | 6,944 | 4 |

Rivet's six race views and both minimap frames also use the generated source. The existing Shrek cart, first half of the minimap packet and shared racing palettes remain exact. Every native field and race assembly is checked against the frozen packet. The Golem's 32 slots are reproduced by explicit whole-source translations/mirrors and the unchanged shadow, with overlap and clipping rejected. Source timing proof records four phase boundaries delayed by one video frame across 1,560 ticks; complete poses remain coherent. It does not claim cycle-identical loading.

The image leaves 4,454 reclaimed original-ROM bytes and 1,440,896 extended bytes free. Its 52 selected raw NPC streams occupy 373,632 bytes. Five complete compressed packets (graphics 133, 139, 154, 170 and 171) occupy 56,776 bytes in owned ExHiROM lower halves. The fixed tank chassis stays on the original decompression path. No WRAM, VRAM, palette slot or object cell is added.

All 206 ordinary owner/pose combinations pass displayed-pixel checks in Snes9x and bsnes; Snes9x additionally compares exact uploads and palettes. The 24-cell tank chassis is checked after its original catwalk initialization, which reserves its fixed tiles; Snes9x verifies the complete 3,072-byte upload. Both cores pass the three-target fight and collapse, six scavenger theft branches, the password chase, Rivet's introduction, both race modes and the connected Lab 16, Lab 32 and sewer routes. These remain documented diagnostic loadouts, not normal-level balance or fresh-campaign completion claims.

The finale fixture exposed a test-harness issue: continued HP edits after core death repeatedly restored bsnes states during the native SPC upload and stalled its acknowledgement loop. The old canonical cartridge reproduced it. Ending the assists at core death lets the unchanged candidate reach ending location 82. The driver now makes no writes during the final defeat or ending transition; its ordinary menu revival, Ward/Tyson exposure and rebuild branches remain covered. Exact acceptance logs and final status are in [production status](production.md).

Source-only regeneration reproduces both generated modules and the exact image from 1,275 minimal source/evidence files. Floating IPS independently reconstructs the 1,548,984-byte BPS (`34241a52686aecf10d79791e416e0b5cc542939d73a875b928d7cb31d8512dd3`). That gallery contains 3,700 mapped frames across 103 atlases; all atlases and four implemented technique cards pass desktop/mobile loading checks. Cartridge, patch and gallery were published together without resetting the live game; revision `124161de` remains available. Evidence is under `.local/qa/character-machines-74274150609b/`, `machine-pass-art-74274150609b/` and `machine-scenes-74274150609b/`. Run `npm run test:machine-art-cores` for poses and `npm run test:machine-scenes` for native routes; the latter accepts `--section=tank|rats|factory|finale|future` and an optional `--rom=path` comparison cartridge.

## Earlier character milestone

The earlier art milestone is cartridge `124161de9f5446c480ecad9b54f3891536643095d94bd90f7ecf477c7932c4f0`. It combines the supplied-logo title, the first nine generated families and twelve further native graphics banks. All 725 owner/pose combinations pass in Snes9x and bsnes; Snes9x also verifies exact uploaded tile and palette values. This is an intermediate development build, not a full-game release.

That milestone's accepted source contract covers 21 banks and 319 native slots. Every original actor ID, animation program, AI, statistic, reward and cell reservation is preserved. Ownership and palette bytes for those banks are checked against the preceding title-integrated cartridge, rather than inferred only from the new build. Both village color ramps and all bone-guard palettes remain exact; palette 92 still serves the unrelated enemy 47. The following resource figures and validation describe that earlier fingerprint.

| Family | Slots | Decoded bytes | Native cells | Owners |
| --- | ---: | ---: | ---: | --- |
| Master Glaze | 20 | 5,728 | 4 | Enemy 154 |
| Kilnback / Iron Kilnback | 28 | 18,784 | 12 | Enemies 155–156 |
| Crumb Hunters | 21 | 5,536 | 4 | Enemies 1, 61; NPC 76 |
| Court Beast / Masquerader | 31 | 18,048 | 8 | Enemies 144, 199 |
| Furnace Maw / Buried Furnace | 8 | 7,200 | 12 | Enemies 188–189 |
| Bone Guards | 24 | 4,960 | 4 | Enemies 43–46 |
| Bread Porter | 23 | 5,856 | 4 | NPCs 30, 62 |
| Cinnamon Baker | 23 | 7,008 | 4 | NPCs 31, 63 |
| Clockwork Ushers | 25 | 8,032 | 4 | Enemies 137–139; NPC 170 |
| Crumb Children | 15 | 2,368 | 4 | NPCs 32, 64 |
| Brioche Elder | 19 | 5,760 | 4 | NPC 33 |
| Bread Drummer | 2 | 928 | 4 | NPC 122 |
| Bun Percussionist | 2 | 928 | 4 | NPC 123 |
| Onion Bread Platter | 8 | 1,024 | 4 | NPC 94 |
| Clockwork Mites | 9 | 2,272 | 4 | Three enemy variants |
| Watch Bells | 5 | 2,240 | 4 | Two enemy variants |
| Storekeeper overlays | 4 | 1,344 | 12 | Enemy 212 |
| Sewer Pods | 14 | 2,848 | 4 | Two enemy variants |
| Lantern Bats | 7 | 2,016 | 4 | Four enemy variants |
| Bone Warden legs | 10 | 7,712 | 12 | Enemies 179, 181 |
| Bone Warden crown | 21 | 11,840 | 8 | Enemies 180, 182 |

Furnace Maw includes a generated background body within the existing 4,096-byte body packet and 512-byte buried-edge packet. Shared architecture, maps, scrolling, collision and reveal choreography remain unchanged. The live head attaches at body-local `[56,96]` in the keep and `[56,95]` in the buried room. Its 64×96 staging canvas is packed into the original twelve cells; it does not reserve a larger hardware sprite.

The larger staging canvases permit source poses with different silhouettes while retaining the same number of 16×16 native cells. Their per-frame origins and anchors come from frozen source manifests via `scripts/import-native-geometry.mjs`. Only Kilnback poses 6 and 9 and Bone Warden crown poses 9, 18 and 20 permit overlapping cells. Those cells sample identical source pixels; all other overlap and uncovered-pixel guards remain active.

The Bakery civilians retain their original dance timing. The Baker's final native animation mode reads an adjacent idle frame for five ticks before looping; this original behavior is preserved. Brass Usher enemy 138 retains animation 159, while its shared workshop NPC 170 retains animation 41. Rivet likewise retains its distinct NPC animation 77 and enemy animation 142.

## Cartridge placement

The first six families exposed fragmentation in reclaimed original-ROM space: a 992-byte event could not fit the largest remaining 228-byte span despite 3,130 free bytes in total. Four complete compressed graphics packets, gfx 133, 139, 170 and 171, now occupy owned lower halves of the existing ExHiROM layout. Their 24-bit table pointers are read by the original `C3:0557` decompressor. No new decompression hook is needed. Every packet has exact ownership, stays within one lower-half bank, and cannot overwrite preserved upper mirrors or raw streams.

The image retains 9,724 free reclaimed original bytes and 1,486,784 extended bytes. Its 48 selected raw NPC banks occupy 342,560 bytes; the four extended compressed packets occupy 41,998 bytes. Executable code, event programs and assemblies remain in original fast ROM. No WRAM, VRAM, palette slot or object cell is added.

`node scripts/check-extended-compressed.mjs all` boots diagnostic cartridges through real reset vectors in Snes9x and bsnes. Both original LZ modes produce exact 19,008-byte outputs with intact guards from banks 40, 46 and 7D, including packets ending at the lower-half boundary. Native CPU tests also verify allocation rejection, ownership, alignment and exact decompression. This does not claim physical-cartridge testing.

## Review and diagnostics

Six combat sandbox fixtures select the Masquerader, Kilnback, Master Glaze, Crumb Hunters, Bone Guards and Clockwork Ushers. They run the cartridge's ordinary formation, AI, damage and victory paths. The sandbox obtains its budget from the actual native loader table, verifies both complete helper routines and compares raw streams to their compressed resources. It excludes streamed banks from the original 32 KiB decoded heap.

The sprite gallery includes the new families with actual native cell positions and all shared palette variants. Storekeeper uses a generated body in its existing 4,096-byte background packet: 94 owned tiles change and 34 architecture tiles remain exact. The moving head retains its original four slots, including the blank resting slot, and attaches at body-local `[64,120]`. The child’s final blank pose, the elder’s blank/head fragments, all five Bell phases and the bats’ full size flags are preserved.

The Bone Warden retains separate crown and leg actors, all 31 poses and both color variants. The original bridge separates their roots by `[0,-32]`; the later Echo encounter uses `[0,-39]`. Both positions match the unchanged baseline. Source proof covers 62 actor/pose uploads, 7,560 timed ticks, the complete three-battle bridge route and the Echo reveal/three-part battle loading. The later core enemy 58 remains untouched. Production streaming reduces their decoded heap cost without adding object cells.

Acceptance evidence for the current batch is fingerprinted under `.local/qa/character-pass-art-124161de9f54/` and `independent-124161de9f54/`. The current regression log is `character-followup-full-regression.txt`. The earlier nine-family milestone has separate evidence under `character-pass-art-766df7990632/`, `character-scenes-766df7990632/` and `independent-766df7990632/`; its 257 passing checks are not relabeled as current results. `assets/imagegen/character-art-manifest.json` fixes accepted graphics, assemblies, palettes and complete ownership; `character-art-sources.json` records 879 minimal source/evidence files. Source-only regeneration must reproduce both generated modules and the exact cartridge before publication.

The 259-case regression completed with 257 passes and two outdated ownership-test fixtures that omitted the newly streamed bat/pod banks. Both fixtures now declare those streams, and their focused rerun passes. A separate mapper regression also passes: the sprite reviewer reads native assemblies through the cartridge mapper, including extended lower-half addresses, instead of aliasing them into original HiROM. These test and reviewer corrections do not change the cartridge bytes.

The older independent Bakery driver could miss an optional four-imp patrol by dashing through its approach at a different native RNG phase. It now walks between the patrol's original tiles until contact, using only ordinary controller input. All six arrival encounters pass in Snes9x; the connected first chapter passes in SnesJs, and both complete chapters pass in bsnes across 315,838 frames. This corrects coverage of the original encounter without changing its events or enemies. Evidence is `character-followup-bakery-patrol-js.txt`, `bakery-arrival-124161de9f54-snes9x-accepted/report.json` and `independent-124161de9f54/bsnes/bakery-patrol-report.json`.

The long independent run completed every Snes9x section. Its bsnes run passed all earlier sections and the Bakery preset/scene checks, then encountered the old patrol-count failure because that process had imported the previous driver before its correction. The separate corrected bsnes run covers both remaining connected chapters on this exact cartridge. Acceptance therefore combines that run with the focused correction; it does not claim a clean single invocation of the entire suite.

The staged sources reproduce both generated modules and this exact image. Floating IPS independently reconstructs it from the 1,492,414-byte BPS (`3d9ed26a047978b9db7134a74316412c3bda8fed65db736c66212459b5d6e092`). Desktop/mobile game diagnostics and all 91 gallery atlases pass. The published gallery contains 3,531 mapped frames and native title/Storekeeper captures. The previously shared `art-review/revisions/124161de/` preview remains available.

## Shared cinematic blank tile

The full Dragon approach exposed an absolute consumer of the old Farquaad graphics allocation. Native cinematic routines at WRAM `7E:7EF8` and `7E:7F05` copy 32 and 16 bytes from `D2:0000` into their callback tables. That source is the original blank sprite tile. Relocating Farquaad's graphics pointer does not relocate these reads. Reclaiming the tile let unrelated data become callback addresses, eventually reaching the native interrupt halt.

The allocator now permanently reserves physical `120000–12001F`, validates the original zeros and rejects generated graphics that would overwrite them. The fix costs 32 original-ROM bytes and needs no CPU patch or additional buffer. The regression also existed in the published Swamp Belch image; earlier pose, combat and short arrival tests did not execute this full cinematic. A new test runs the approach through its music cues, branch and original recovery dialogue without subsequent state writes. Diagnostics now recognize the native BRK/COP halt loops as well as the field-error halt.

The full game is still in development. Remaining artwork includes further enemy families, scenery, the frozen oven-interior and giant-Godmother integrations, and the interim Tyson reveal; 111 custom technique presentations and remaining campaign/ending work are tracked in [production status](production.md).
