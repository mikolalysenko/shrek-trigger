# Shrek Trigger: development

How to build, run and test the patch from source. The player-facing overview is the [README](../README.md).

The [current game design](game-design.md), [conversation decision log](decisions.md) and [complete technique catalogue](techniques.md) record the intended game. [Production status](production.md) tracks what is implemented and tested. Claude's [native Shrek title](title.md) and theme arrangements are integrated; consult the private handoff before related changes.

```sh
npm install
npm run rom:import -- '/path/to/Chrono Trigger (USA).zip'
npm run build
npm start
```

Open http://127.0.0.1:5173 for the player, or http://127.0.0.1:5173/dev.html for the developer workshop (area jumps, combat sandbox, sprite bench, machine state). The original ROM is read locally. No ROM upload is used. If the ROM is already in `.local/chrono-trigger-usa.sfc`, skip the import.

The supported unheadered ROM is 4,194,304 bytes, SHA-256 `06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9`. A 512-byte copier header is stripped before validation. Other revisions are rejected.

## Development shortcuts

- **F1** opens the workshop. **Quick start in the swamp** loads a matching development checkpoint or advances a fresh game with real controller input.
- Choose an area, optionally choose three party members, then **Jump to area**. **Return from jump** restores the exact state at the event boundary before the jump.
- **F5** saves a checkpoint; **F8** restores it; **F6** steps one frame; **Escape** pauses.
- **Grant test techs & onions** changes only the current development save. It grants learned techniques and onion supplies at a field event boundary.
- **Final arena · level 60 test loadout** jumps to the real three-entity finale with all techs, onions and synthetic endgame stats/equipment. This is a diagnostic loadout, not a claim about the original level-60 stat curve. **Return from jump** restores the previous state.
- **Dragon** presets cover the hangar, boarding before and after wing repair, the flight saddle, and her escape after the harness breaks. The world presets park her beside the party for immediate boarding with A.
- **Carnival · clown challenge and fusion** stages the native Violent J / Shaggy 2 Dope battle, Great Milenko fusion and hatchet reward with a test party. Native actor and prop previews expose every clown, Milenko and hatchet frame. The repair workshop and shrine have area shortcuts.
- **Combat sandbox** runs eleven native encounters with the current party or a temporary test loadout, including the Masquerader, Kilnback, Glaze, Crumb Hunters, Bone Guards and Clockwork Ushers. **Retry** restores the complete machine and RNG before battle; **Return** restores the game. Its bounded log records native actions and results. All 39 scoped custom or modified techniques have native presentations, while 77 stock techniques retain their original names, animations and mechanics. Shrek's first tech is **Fart**, with three spins per original cycle, green gas, a falling-buzz sound and a 25% poison chance. Swamp Piledriver grabs, jumps, somersaults and slams a movable target, with an anchored strike for larger bosses. Lightning keeps its stock single-target Air presentation and 2 MP cost. Swamp Belch adds a giant translucent fart cloud while preserving Luminaire's Air mechanics and 20 MP cost. Donkey's Hot Sauce adds a native chili-bottle blast while preserving Flare's mechanics and 20 MP cost. See [combat and music](combat-and-music.md), [techniques](techniques.md) and [Swamp Belch](swamp-belch.md).
- **Ohio · Cleveland clown dreams** visits the native dream-spirit conversations with Shrek, Fiona and Pinocchio. The three projections use Violent J's cartridge sprites; the books and fate choices keep their native behavior.
- **Guy Fieri** practice presets select the original six training tiers and grant a test loadout. All six forms use generated Guy artwork, native lessons and battle names; see [Guy Fieri](guy-fieri.md). The workshop reports native fatal-error loops as well as CPU state.
- **Mr. Worldwide · Walmart greeter in Guy's kitchen** places the party beside the greeter who unlocks the optional late-game superboss, with a fresh encounter and the level-60 test kit; the combat sandbox also has a **Mr. Worldwide** fixture. See [Mr. Worldwide](mr-worldwide.md).
- **Bakery** presets cover both visits, recruitment and the furnace bosses. **Sky drakes and the second chapter** starts at the summit before Mongo joins; the native scene opens the party menu and begins flight. The actor preview includes all four drake poses. See [chapter routes and checks](bakery.md).
- **Future**, **Factory** and **Pinocchio** presets stage the chapter's native puzzles, battles, recruitment and escape. **Rivet** presets cover his introduction and both race modes; his 25 field poses are available in the native preview. Wildlife, sewer creatures, factory machines and the Guardian use stock Chrono Trigger art. See [racing formats and checks](racing.md) and [wildlife checks](future-wildlife.md).
- **Duloc Shades**, **Pond Pages** and **Bog Baron** presets stage their original encounters with a reversible test party. Only the Duloc guards have custom art; see [guard artwork](guard-art.md).
- **Swamp Imps**, **Imp Riders**, **Palace Hexer** and **Duloc Sergeant** presets cover the native canyon, forest, worker, palace lift and shared officer scenes. These scenes use stock art for the swamp mobs, the Mage and the court officer. See [court and swamp artwork](court-swamp-art.md).
- **Run cartridge tests** runs the Node tests locally. CPU registers, hook counters and a bounded event trace are visible in the workshop.
- Arrows/WASD move; Z confirms; X cancels/runs; C opens menus; Enter is Start. Q/E are shoulder buttons. Gamepads and touch controls are supported.

Jumps are diagnostic visits and cannot substitute for a progression test. Ordinary area jumps preserve story flags; named chapter, practice and vehicle scenarios establish their documented prerequisites. Return from jump restores those changes. Requests made in a menu, battle or overworld wait until a field event runs. Field coordinates use 16-pixel tiles; overworld coordinates use 8-pixel units.

```sh
npm test                 # Native 65C816, cartridge and event tests
npm run test:browser     # Desktop/mobile browser integration
npm run test:independent # Native routes/scenes/puzzles/races in Snes9x; append -- all for bsnes
npm run test:party-art-cores # Diagnostic party-frame previews in both cores; not route acceptance
npm run test:npc-art-cores # Story cast, clowns and crowded ending variants in both cores
npm run test:boss-art-cores # All current large-boss frames in both independent cores
npm run test:boss-scenes # Native battle loading and crowded scene budgets
npm run test:character-art-cores # Bakery, court-beast and machine poses in both cores
npm run test:character-scenes # Their native battle variants and shared field initialization
npm run test:machine-art-cores # Generated machines, wildlife and finale companions in both cores
npm run test:machine-scenes # Tank, theft/password, finale branches and connected future routes
npm run test:cosmic-art-cores # All Cosmic Muffin mouths and offspring heads in both cores
npm run test:cosmic-scenes # Offspring fights/platform, shell arrival, archive and meteor aftermath
npm run test:woodland-art-cores # All pot, beetle, rootling and briar poses in both cores
npm run test:woodland-scenes # Original forest/Arris/conveyor fights and the rider demonstration
npm run test:endgame-art-cores # Rumpel, Godmother, oven arms and Tyson emergence poses
npm run test:endgame-scenes # Six authored encounters through their native continuations
npm run test:guard-art-cores # Every Duloc guard pose, plus the stock frog and sewer banks
npm run test:guard-scenes # Prison, sewer, ruins, forest and desert native routes
npm run test:compressed-cores # Original decompressor with owned extended graphics packets
npm run test:combat-cores # Swamp music loop and Fart casts in Snes9x and bsnes
npm run test:eye-laser-cores # Eye Lasers casts in every party position in both cores
npm run test:swamp-belch-cores # Swamp Belch and a following tech in both cores
npm run test:piledriver-cores # Lifts, boss anchors, multipart battle and following turn
npm run test:speech-cores # Shrek/Tyson dialogue, Air/Dirt menus, Cleveland and Wish Palace in both cores
npm run test:dialogue-all # Render every field string and exercise every native dialogue cursor
npm run test:dialogue-branches # Verify every option's native result and branch target
npm run test:dialogue-sizes # Check dialogue tables against native byte budgets
npm run test:menus       # Shops, party selector, naming and real save slots
npm run test:persistence # All three slots through reset/power-cycle/title-load in both cores
npm run test:finale-matrix # Native finale timing/mechanism matrix in both cores
npm run test:campaign-opening # Fresh controller-only opening through the teleporter
npm run test:campaign-medieval # Connected medieval rescue/trial through the future gate
npm run test:endings     # Retained ending scenes and New Game Plus access
npm run test:dragon-matrix # Dragon acquisition, repair, flight and endings
npm run test:technique-matrix # Technique progression, prerequisites and native persistence
npm run package:release  # Commit clean source first; deterministic BPS + docs ZIP
npm run inspect          # Assets, hook signatures and resource budget
npm run art:review       # Review sheets and native combat captures in art-review/
npm run art:tech-sheets  # Contact sheet of every technique's animation in .local/qa/tech-sheets/
npm run test:tech-blanking # Count force-blanked frames during every technique (catches frame overruns)
npm run build            # Deterministic ROM + IPS/BPS + audit manifests
```

`npm run art:review` exports the seven-character pose sheet, complete four-direction walk/run and seven-color overworld sheets, native menu portraits, story-cast sheet (with the onion jar), ICP/Milenko/hatchet/Faygo sheet, all six Guy Fieri forms, Magic Mirror battle captures, and Fart/Eye Lasers/Swamp Piledriver/Four Layer Slam/Swamp Belch battle recordings. Its manifest identifies the exact cartridge hash. The images use the actual indexed art, SNES 15-bit colors and integer enlargement. Open `/art-review/sprites.html` to inspect all 4,143 mapped party/story/boss frames across 125 atlases, including both Puss weapons, the Duloc Tank, Rivet's field/race views all six wisp/slime variants, the Cosmic Muffin mouths/offspring, enchanted pots, beetles and briars, at 1× and integer enlargement with pose/direction filters and stepping controls. The inspector opens on run cycles with a light background that preserves dark line work; dark and transparency-checker backgrounds are also available. Review playback runs at 8 fps; the cartridge uses its original animation programs. Animated PNG battle output requires `ffmpeg`; still sheets and the frame inspector work without it. Start the local server and open `/art-review/index.html` to review the exported pack.

## Outputs

- `.local/shrek-trigger.sfc`: private patched cartridge, 4 MiB HiROM or 8 MiB ExHiROM as required by the assets.
- `dist/shrek-trigger-0.1.0.ips` or `.bps`: patch for the verified base; the manifest identifies the current format. Expanded builds use BPS mirror-copy commands.
- `dist/manifest.json`: content coverage and allocation audit.
- `dist/shrek-trigger-0.1.0.zip`: deterministic candidate package with BPS, instructions, credits, spoilers, checksums and acceptance evidence; never includes the original or rebuilt ROM.
- `.local/qa/`: screenshots from native emulation and browser checks.
- `art-review/`: generated review sheets, battle animations and their cartridge fingerprint.
- `.local/checkpoints/`: generated, ROM-specific developer checkpoints.

ROMs, SRAM, checkpoints, extracted source assets and research checkouts stay in ignored directories. Browser checkpoints are distinct from the game's battery saves. Begin with a new game; save compatibility across changing builds is not promised.

The independent checks use an external libretro host and emulator cores; see the [setup and coverage](native-port.md#independent-emulator-checks).

The swamp's regular indoor theme adapts the supplied All Star MIDI through Chrono Trigger's own SNES instruments. The title theme, the boot cue under the pendulum and the Shrek Trigger logo, and the dragon's flight music are All Star mashups: **All Star Trigger**, **All Star Pendulum** and the **All Star · Wings arrangement**. They are written in place of *Chrono Trigger*, the stock title cue and *Wings that Cross Time* with those songs' own instruments, form and quoted parts, read from your ROM at build time. The morning cue remains intact. The two clown battle phases use the original Hatchet Carnival composition. All five arrangements run in the native sound driver. The four looping ones use six music voices and leave two for sound effects; the one-shot title cue uses all eight, as the stock cue does.

See [implementation notes](README.md), [Shrek artwork](shrek-art.md), [Shrek's dialogue](speaking-shrek.md), [Air and Dirt](elements.md), [Faygo](faygo.md), [Carnival Hatchet](carnival.md), [Dragon formats](dragon.md), [native port plan](native-port.md), [production status](production.md), and [credits](credits.md).

The [endgame artwork notes](endgame-art.md) cover Rumpel, Wishworks Golems, giant Godmother, the oven interior and Tyson’s emergence. Their six area shortcuts are available in the F1 workshop. To include actual scene-check captures in a gallery export, supply `--endgame-evidence` with the matching `endgame-js-<cartridge-hash>` evidence directory; mismatched cartridges are rejected.

The **Revival test · Fiona down** combat loadout starts with a fallen ally so Shrek can immediately use the stock **Life** spell. Its revival, healing and next turn execute in native cartridge code; Retry restores the initial KO and Return restores the game. Gallery exports can explicitly retain earlier scene captures with `--scene-evidence-rom <their-cartridge>`; their original hashes remain visible in captions and capture metadata.

Custom sprite art is limited to the playable cast, characters critical to the plot and direct Shrek references. Generic enemies, townspeople and route bosses with no story role, including the forest Kilwala and the Hench, use their original Chrono Trigger sprites; see [townsfolk and woodland](townsfolk-art.md) and the [art-scope decision](decisions.md). The 26 reversible workshop entries and native fair/parade palette corrections remain. `npm run test:townsfolk-art-cores` checks every selected pose, and `npm run test:townsfolk-scenes` runs the same 29 scene drivers in Snes9x and bsnes. Gallery exports accept `--townsfolk-evidence <scene-check-directory>` for fresh scene captures.

[Four Layer Slam](four-layer-slam.md), shown as **Layer Slams** in the native menu, completes Shrek’s eight single-tech presentations. Three body blows lead into one finishing throw, preserving Confuse’s four hits and 12 MP cost. Large and flying targets stay anchored. All 116 techniques have native presentations, including all 18 custom combinations and all 14 physical/restoration effects. These are emulator checks, not physical-SNES verification.
