# Acceptance evidence — 0.1.0 candidate

## Candidate identity

- Source branch: `claude/all-techs`
- Source commit: `bbfeb856158414a761359a0a2aacacceefccf93b` (verified ROM/BPS build)
- Base SHA-256: `06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9`
- Rebuilt ROM SHA-256: `c04e7dcdfb3b3226394539dd730a62746932e918f56ef9553c1d10154b89c6db`
- BPS SHA-256: `99318a65c11d6def7e6d49b810d247dec4f89f7a32c7daf72788a3b3061933b8` (1,775,134 bytes)
- Format: 8 MiB ExHiROM, mapper 35, 116 techniques, 212 items, 5,018 dialogue replacements in 335 runtime locations (5,003 source-owned plus the Walmart greeter's 5 and Mr. Worldwide's 10).
- Change since the previous candidate (`afa41bc8`): the November 8 polish pass in the [changelog](../CHANGELOG.md):
  - **Dragon:** her world and Mode 7 views now face her direction of travel; the approach dive uses her palette; the hangar no longer shows a detached block of her body.
  - **Art:** hand-drawn overworld sprites; Shrek's tunic shadow and knockout pose; Farquaad's hair, Donkey's fur and Guy Fieri's face colors.
  - **Text:** five battle names follow the story, and two of Shrek's opening replies were rewritten.

  No technique, item, progression or mechanic changed. The hangar change is one sprite-priority byte.

Every result below belongs to this candidate unless it is explicitly marked as carried over, pending or historical.
- **Re-run on `c04e7dcd`:**
  - clean reproduction in a detached worktree and Floating IPS;
  - the full `npm test` suite;
  - the party-art cores (Snes9x and bsnes);
  - the Dragon matrix: 145 cases in each core, zero failures (`.local/qa/dragon-matrix-c04e7dcdfb3b/`);
  - the NPC art cores (`.local/qa/npc-art-c04e7dcdfb3b/`);
  - the fresh-save opening and medieval campaign routes in both cores (`.local/qa/campaign-opening-c04e7dcdfb3b/`, `.local/qa/campaign-medieval-c04e7dcdfb3b/`);
  - the new fresh-save cathedral and court route to Fiona's return (story 33) in both cores;
  - the new fresh-save homecoming, trial and escape route to the future (story 51) in both cores;
  - the endgame art pass (146 frames per core) after fixing its relocated-assembly pointer mapping;
  - all 13 ending routes in each core, including What the Prophet Seeks, New Game+ and the Beyond Time victory;
  - in both cores: the finale matrix, all four technique-matrix sections, combat/music, speech, compressed, Mr. Worldwide, complete dialogue rendering, menus and persistence suites, and the boss, machine, character, cosmic, woodland, endgame, guard, court-swamp and townsfolk scene drivers (reports under `.local/qa/*-c04e7dcdfb3b`).
- **Also re-run on `c04e7dcd`:** `npm run test:independent -- all`, the Eye Lasers, Swamp Belch, Piledriver, four-layer and resurrection cores, every per-family art pass, native decision acceptance, the dialogue size check and the browser checks. No independent suite is carried over from an earlier candidate.

Carried-over results are not claimed as evidence for `c04e7dcd`.

## Verified results

### Clean build and independent patch application

```sh
npm run build
.local/reference/flips/flips --apply --exact dist/shrek-trigger-0.1.0.bps \
  .local/chrono-trigger-usa.sfc .local/qa/release-candidate-flips.sfc
shasum -a 256 .local/shrek-trigger.sfc .local/qa/release-candidate-flips.sfc
```

Floating IPS reconstructed the candidate ROM exactly. The test-only BPS reader also validates all command types and checksums. No original ROM is included in the package.

A separate detached worktree at `bbfeb85` was built from committed source alone. It reproduced both the ROM and BPS byte for byte; the worktree was removed afterward. Evidence: `.local/qa/release-reproduction.json`.

### Source dialogue, event, and pointer checks

```sh
node --test tests/dialogue-choices.test.mjs tests/dialogue-coverage.test.mjs tests/dialogue-pools.test.mjs
```

All 14 checks pass. Every verbal source string has an authored replacement at every runtime owner. All native choice counts and selectable-row masks, event branch bytes, source-string ownership, and rebuilt event/text pointers pass. The final global event entry is rebuilt and checked rather than assumed to remain untouched.

### Native source and integration suite

```sh
npm test
```

All **485 tests pass** on this candidate, with zero failures, skips, cancellations, or todos. This includes exact stock-restoration checks for every retired family (graphics packet, assembly, header, palette, battle name, stream status), the ten Mr. Worldwide source/SnesJs tests, the Fireball · Boss Battle 2 music checks, exact source/frame data, native mechanics, long connected Bakery and guard routes, complete dialogue ownership, pointer checks, and finale mechanisms.

### Independent real-scene routes

```sh
npm run test:independent -- all
```

Both Snes9x and bsnes pass native travel, combat, puzzles, quests, and connected chapter routes on this candidate, including the real three-part tank battle, the stock Guardian background, sky-drake world data and the ordinary seed scene in the storeroom that the Kodiak visit borrows (room 344). Report: `.local/qa/independent-c04e7dcdfb3b/` (re-run on this candidate). Actor-preview coverage runs separately (below).

The connected Hunter Den route was hardened on the previous candidate: two stock Reptites, whose patrol timing shifts with their native decompression, can stand still across the straight path, so the walker now engages a blocker or steps around it after 90 motionless frames.

### Party art and actor previews (re-run on `c04e7dcd`)

```sh
npm run test:party-art-cores
```

Snes9x compares all 1,988 party frames tile for tile with the cartridge's assembly data; bsnes checks 108 representative frames. Both cores also pass the workshop puppets, both Puss weapons and all seven portraits. Reports: `.local/qa/party-art-a514d8198fcc/`.

This suite had failed at `shrek-0 upper tiles` since the November 4 candidates. The cause was the fixture, not the art: it injects its preview loop at the kitchen NPC's init return and saved the stage 600 frames later. After the kitchen song change the scene no longer stalls there, so the NPC had already halted at `$5AB` and every capture read stale tiles. The stage is now saved on the arrival frame.

### Complete native dialogue rendering (re-run on `c04e7dcd`)

```sh
npm run test:dialogue-all
```

Report: `.local/qa/dialogue-full-a0f828fd363e/report.json`.

- 5,018 strings across 335 runtime locations.
- 224 decisions and 465 options (222 source decisions plus the greeter's and Mr. Worldwide's choices).
- All 373 conditional Shrek replies.
- Zero failures and no skipped locations.

### Native decision acceptance (re-run on `c04e7dcd`)

```sh
npm run test:dialogue-branches
```

Report: `.local/qa/dialogue-branches-a0f828fd363e.json`.

- 224 decision occurrences.
- 465 option confirmations.
- 653 native comparisons, 391 fallthroughs, 72 skips, and two explicitly unused result options.
- Zero failures.

### Native menus (re-run on `c04e7dcd`)

```sh
npm run test:menus
```

Report: `.local/qa/menus-a0f828fd363e.json`. All 22 shops and 169 item options pass real purchase/sell/cancel checks, party replacement/cancel passes, all eight naming screens accept Start, and all three immediate native slot writes and cancel behavior pass. The separate persistence proof above performs the actual reset/reload cycle.

### Fresh campaign opening (re-run on `c04e7dcd`)

```sh
npm run test:campaign-opening
```

Report: `.local/qa/campaign-opening-a0f828fd363e/report.json` (41,147 Snes9x and 41,144 bsnes frames).

Starting from zeroed SRAM and using only reads/controller input, both Snes9x and bsnes complete the bedroom/kitchen, Donkey naming, overworld, Fiona meeting and pendant choices, required vendor interaction, teleporter accident, left-platform pendant recovery, gate dialogue, and two ordinary canyon encounters. Both reach **medieval overworld 497, story 12**, with no post-start WRAM/ROM/CPU writes, savestates, diagnostic jumps, or stat/inventory/flag changes. The rescue and later chapters are separate pending work.

### Fresh medieval route to Fiona’s chamber (re-run on `c04e7dcd`)

```sh
node scripts/check-campaign-medieval.mjs all
```

The fresh-save continuation passes in both Snes9x and bsnes. It fights the ordinary Guardia Forest encounter, enters Guardia Castle through the real overworld/double-door route, completes the queen introduction, circles the throne platform, takes the actual right tower staircase, climbs both native tower connectors, and reaches **Fiona’s chamber at location 122**. It completes Fiona’s disappearance at **story 16** and Donkey’s reunion at **story 18**, returns through the forest, buys **12 Onions for 120 G** through Truce’s native shop, and heals through the ordinary field Item menu. It wins the normal-level hairpin battle, completes Puss’s native naming and recruitment at **story 21**, lets the recruitment event settle, and plays the organ to enter the **secret passage at location 130**. The controller uses only reads and ordinary directional/button input after the fresh start, with no savestates, diagnostic jumps, stat/inventory/flag writes, or bypassed connectors. Reports: `.local/qa/campaign-medieval-a514d8198fcc/` (167,296 Snes9x and 161,843 bsnes frames). The remaining passage, impostor battle, and subsequent chapters are pending.

The forest return leg was hardened on that candidate. It held fixed directions down the forest's diagonal terraces, where two pixels of drift change which collision slide a held direction takes; the restored stock enemies' shifted timing produced that drift. Each step now nudges the leader onto the position an encounter-free run reached, and an encounter during a step returns the party to the step's start.

### Fresh cathedral and court route to Fiona’s return (new on `c04e7dcd`)

```sh
npm run test:campaign-cathedral
```

Continuing the same fresh save from the organ passage (location 130), both cores cross the nave, use both spike-hall switches and the altar switch the native way (drop into the lower-left chapel, climb to the gallery, drop into the right side room), open the gallery door, and win the **impostor battle at normal level** (formation 144). The party then follows the queen's return to court (**story 28**, Puss leaves), climbs back to Fiona's chamber and completes her restoration (**story 33**, party Shrek, Donkey and Fiona). Controller input and reads only, no savestates or writes. Reports: `.local/qa/campaign-cathedral-c04e7dcdfb3b/` (about 260,000 frames per core). Three consecutive runs pass in each core.

The impostor fight is close at normal level: by then the party has used all twelve Onions, and the route survives by having Puss cast his healing technique whenever an ally drops below 60% HP. With a 50% threshold one bsnes run lost the fight. Players who arrive without healing items can lose this battle; that is a balance observation, not a defect in native code.

### Fresh homecoming, trial and escape to the future (new on `c04e7dcd`)

```sh
npm run test:campaign-homecoming
```

The same fresh save continues from Fiona's restoration: out of the castle, south through Guardia Forest, up the canyon to the gate and back to the present (**story 39**). The party restocks thirty Onions at the Duloc market's native shop, crosses the present forest to the castle, and plays the arrest, trial, verdict and cell. Donkey's execution-room rescue follows (**story 46**), then the prison climb through the corridor, outer stair and office to the bridge. The **Duloc Tank falls at normal level**: the route attacks the Repair Head first, then the wheel and chassis, and drinks Onions from the native battle Item menu below half HP. Fiona confronts Harold and joins the escape (**story 48**), and the forest gate opens to the future (**location 208, story 51**), with Shrek, Donkey and Fiona. Controller input and reads only. Reports: `.local/qa/campaign-homecoming-c04e7dcdfb3b/` (459,963 Snes9x and 418,172 bsnes frames, including the medieval and cathedral routes). On November 9 the same fresh-save chain passed again on build `4b5b24d9e6e6` in both cores. This build adds the sixty-Onion restock, the market equipment and the route-tactics fixes (slot targeting, Onion stock by item ID, revives first). Both runs end at story 51 at the future arrival: 427,386 Snes9x and 421,334 bsnes frames, reports in `.local/qa/campaign-homecoming-4b5b24d9e6e6/`.

The tank's stats are the original Dragon Tank's. Its earlier fixture check passed only because it equips the endgame kit; at normal level, plain Attack commands lose.

### Technique presentation builds (November 8–9)

The roar spells and Milk build (`56d265934db9…`, commit `ed9def5`) passes `npm run test:technique-matrix` (all four sections, both cores), `test:combat-cores`, `test:finale-matrix`, `test:eye-laser-cores` and `test:swamp-belch-cores` in Snes9x and bsnes. The color-theme and generated-sprite build (commit `e8beb50`: 71 themed techniques plus Waffle Toss, Waffle Bomb, Parfait Bomb, Dragon Kiss, Sing-Along, Fairy Dust and Noble Steed) passes the same five suites in both cores. Wish Dust (`c36ffc5`) reuses Fairy Dust's art. On November 9 (build `4b5b24d9e6e6…`), `check-technique-matrix.mjs all --section=execution --capture` passed in Snes9x and bsnes for Wish Dust and every other redrawn or rethemed signature spell: Sing-Along, Fairy Dust, Waffle Toss, Dragon Kiss, Waffle Bomb, Noble Steed, Parfait Bomb, Milk and Milk 2. The bsnes captures show Wish Dust's violet stars over the caster (`.local/qa/technique-matrix-4b5b24d9e6e6/bsnes-execution-tech-15/`).

### Dragon matrix (re-run on `c04e7dcd`)

The Dragon checks pass acquisition/naming, all 35 boarding/flight compositions, four-direction flight, landing, pre-repair time travel, upgraded flight for every party, approach/escape, and both ending variants in both cores: **145/145 cases per core**. The connected repair→deck battle→escape route also passes. Reports: `.local/qa/dragon-matrix-a514d8198fcc/`.

The former Mongo+Farquaad stall was a fixture error, not a ROM defect. Native stock code has no spoken prompt for that party and waits for **X**; the corrected controller completes it and verifies Farquaad-second permutations. Joined-mask setup was corrected to the native `0x80 >> character` convention. No native change was needed.

### Technique progression (re-run on `c04e7dcd`)

```sh
node scripts/check-technique-matrix.mjs snes9x                         # all four sections in one process
node scripts/check-technique-matrix.mjs bsnes --section=persistence    # and progression, mechanisms
node scripts/check-technique-matrix.mjs bsnes --section=execution --start=69
```

Every section passes in both cores on that candidate. Snes9x ran all four sections in one process. For bsnes, a single-process run passed executions for techniques 1–68 (118 executions) before it was split into parallel section runs to save time: execution resumed at technique 69 (86 executions), and persistence, progression and mechanisms ran separately. Together they cover all 204 bsnes executions.

- **Execution:** 204 executions per core cover all 116 techniques, every custom technique in all three party positions, and the gated triples. Each one is selected through the native battle menu and must dispatch, spend its MP, and return the battle to a ready command menu (or end it cleanly) within 3,000 frames. Custom techniques also run a following action, to catch leftover renderer state.
- **Progression:** 125 cases per core. They cover all 56 single-technique thresholds across the seven characters (including Shrek's eight), the ordinary double/triple unlocks, missing-prerequisite negatives and the Button-gated triples, each reached through two native victories.
- **Mechanisms:** enemy interruption, caster death with a following action, and target death with Life II revival and a following Fart.
- **Persistence:** learned techniques, levels/TP, equipment and Buttons survive a native save, console reset and power cycle.

Two harness defects were fixed during this run; neither involved native code:

- The progression expectation counted Shrek's zero-cost third technique as reachable from his first, but it sits behind a 90-TP second technique. The runner now models the native learner one technique at a time, which reproduces all 56 expectations from the earlier per-owner reports.
- The all-sections run continued its own persistence save instead of starting new games. Fresh starts now clear battery RAM.

Reports: `.local/qa/technique-matrix-a514d8198fcc/`.

**Earlier verified native fixes (previous candidates):** Mongo Heal uses participant 5; Omega Flare selects populated animation programs 35/45; Swamp Hoedown uses 15 and copies all required timing/frame records; rock masks use one-byte entries at `0xC2983+index`, with ordinary masks restored and Dark Eternal at `0x62`. Three-Ring and Grand Dream use learned group `techId-102`.

### Retained endings (re-run on `c04e7dcd`)

```sh
node --test tests/ending-matrix.test.mjs
node scripts/check-endings.mjs snes9x --section=scenes
node scripts/check-endings.mjs snes9x --section=access
node scripts/check-endings.mjs snes9x --section=beyond
node scripts/check-endings.mjs bsnes --section=scenes
node scripts/check-endings.mjs bsnes --section=access
node scripts/check-endings.mjs bsnes --section=beyond
```

All 16 source tests pass, including 458 ending/developer-room string checks. Each core passes 13 routes and 155 ordered rendered-message checks: Beyond Time/parade, early Dream Project, Good Night, Unknown Past, Legendary Hero, People of the Times, The Oath, Dino Age, Prophet, Slide Show, Apocalypse, Reunion, Last Inn bucket, and New Game Plus right telepod. Slide Show reaches all 50 messages and its new final joke. Reports: `.local/qa/endings-a0f828fd363e/`.

Connected pre-rescue Reunion selection and unique Farquaad/Dragon combinations are **not** claimed without the corresponding North Cape and final-dive routes. Fixture victories are not normal-balance or fresh-campaign proof.

### Finale mechanism matrix (re-run on `c04e7dcd`)

```sh
node --test tests/finale-matrix.test.mjs
node scripts/check-finale-matrix.mjs snes9x --section=timing
node scripts/check-finale-matrix.mjs bsnes --section=timing
node scripts/check-finale-matrix.mjs snes9x --section=mechanisms
node scripts/check-finale-matrix.mjs bsnes --section=mechanisms
```

Seven source checks and all 44 independent-core timing/mechanism checks pass. Active and Wait modes and speeds 1–8 cover tell/strike/KO/recovery/following-tell timings. Target slots, dead/changed targets, windup disable/kill, starter revival without Donkey, exact victory with Tyson standing, and following actions pass. These are disclosed diagnostic fixtures, not normal-level balance or physical-hardware evidence; all four core/section runs pass on this candidate, which shares the relocated battle-message table with Mr. Worldwide.

### Native persistence in independent emulators (re-run on `c04e7dcd`)

```sh
RETRO_HOST=/path/to/retro-host \
SNES9X_CORE=/path/to/snes9x_libretro.dylib \
BSNES_CORE=/path/to/bsnes_libretro.dylib \
npm run test:persistence
```

Report: `.local/qa/persistence-a0f828fd363e/report.json`.

Starting from a fresh game, the route uses only directional/controller input through the bedroom, kitchen, Donkey naming screen, and real overworld exit. It saves each slot through the native menu, performs both console reset and power-cycle/title-load, and compares story, party, inventory, equipment, learned techniques, Dragon state, and quest flags. All three slots pass in **Snes9x and bsnes**, with slot isolation and cancel unchanged. No savestates or post-start writes are used.

### Mr. Worldwide (optional superboss)

```sh
node --test tests/mr-worldwide.test.mjs tests/inn.test.mjs tests/empty-future.test.mjs tests/music.test.mjs
npm run test:mr-worldwide-cores
```

The ten SnesJs checks pass (included in the 478 above):
- the unused source record and flag byte, every cartridge record and the AI bytes;
- the Fire technique clones, battle and room text, and the authored frames;
- Guy's kitchen with every lesson-room function preserved, and the storeroom with its two guarded functions as verbatim copies;
- the story gate, the greeter's refusal and the trip;
- the Kodiak meeting with Donkey's line, its refusal and the repeat visit;
- the native formation and song, and the kitchen theme on return;
- victory rewards and retirement, and the no-game-over loss with rematch;
- ordinary storeroom visits staying stock, and Guy's practice staying one-on-one;
- all four phases, the FIREBALL tell, and the Fire reactions through the native battle menu.

The inn and empty-future suites check both rooms against their source events, and the music suite checks the spare song slot, every quoted Fireball note and native playback through the loop.

In unmodified Snes9x and bsnes cores, a documented fixture (the level-60 kit, story value, cleared flag and native jump to Guy's kitchen) is followed by controller input only. Both cores pass all six cases:
- the story gate;
- the greeter's refusal, the trip, the first meeting with Donkey's line, leaving Kodiak, and a repeat trip and acceptance into the native slot-3 formation with Fireball · Boss Battle 2 and 30,000 HP;
- all four barrier phases with their exact element, defense and magic-defense bytes;
- a technique rotation through all four phases until all eight private techniques have dispatched (43 casts in each core with identical counts, each finishing within 692 frames against a 1,800-frame freeze bound). It lands an ordinary party Attack through the native menu in every phase and ends in a clean victory, with field control restored in Guy's kitchen.
- the victory reward (Spectacular Specs, three Onion Feasts plus the native drop), retirement, and the greeter's goodbye;
- the no-game-over loss with restoration and a rematch through the greeter.

Boss and party HP seeds that shorten the fights are labeled diagnostic. Report: `.local/qa/mr-worldwide-afa41bc879b8/report.json`. This is not normal-level balance evidence. Two Fire candidates (enemy techniques 0x96 and 0x97) stalled the battle when cloned onto this enemy during development and are not used.

The combat and music cores (`npm run test:combat-cores`) also pass on this candidate in both cores, including full swamp and boss music loops and three native Fart casts with the generated gas puffs. `npm run test:eye-laser-cores` passes in both cores with the generated target flames (exact Snes9x VRAM).

### Stock-art restoration and native sprite scenes (re-run on `c04e7dcd`)

```sh
npm run test:npc-art-cores        # story cast, Granny, clowns and the six crowded ending variants
npm run test:townsfolk-art-cores  # and court-swamp, guard, character, machine, woodland and boss art passes
npm run test:townsfolk-scenes     # and court-swamp, guard, boss, character, machine and woodland scenes
npm run test:compressed-cores
```

Every art pass and scene driver passed in both cores on that candidate. `npm run test:npc-art-cores` was re-run on this one and passes in both cores (report `.local/qa/npc-art-afa41bc879b8/`), and `npm run test:compressed-cores` passed on `a0f828fd363e`. The art passes compare each displayed actor's tiles and palette with the cartridge's own data, so the restored stock banks are checked the same way as the remaining custom ones. The scene drivers now match a stock bank by its native heap source and owner palette, and a custom bank by its raw stream. Every field scene stays inside the native 32 KiB sprite heap; the largest measured is 16,000 bytes, in the castle Briar Knight scene. The crowded ending scenes use 12,928–13,888 bytes now that the stock Nu decompresses there, and their regression bound is 16 KiB (half the native heap).

The keeper, household, tradesman and townswoman banks (11, 12, 35, 36) keep their raw streams of stock pixels. Decompressing them shifts the crowded ending scenes' timing so that SnesJs, which does not model the short odd-frame scanline, phase-locks the native `$4210` vblank poll in "What the Prophet Seeks"; Snes9x and bsnes complete that ending either way.

### Browser integration

```sh
SHREK_TEST_PORT=5291 npm run test:browser
```

The desktop/mobile browser checks pass on this candidate. In a worktree, `.local/chrono-trigger-usa.sfc` must be a real file or hard link inside the checkout: the development server refuses a base ROM whose real path leaves the project.

## Pending or incomplete checks

- Fresh-save connected mandatory chapters, optional quests, all retained endings, and New Game Plus are not complete. The accepted opening and medieval continuation complete Fiona’s disappearance, Donkey’s reunion, normal shopping/healing, the cathedral battle, and Puss recruitment, then reach the secret passage at location 130. The cathedral route then completes the passage, the impostor battle, the queen's return and Fiona's restoration (story 33). The homecoming route then reaches the future (story 51) through the trial, prison, Duloc Tank and escape. The future chapter, the return through Medina and the mountain cave, the bridge defense (story 90) and the Denadoro-style mountain with the clown challenge (story 96) now have fresh-save routes (below); later chapters remain unfinished. Existing connected route fragments and diagnostic fixtures do not establish normal-level campaign balance.
- **The future chapter is now a fresh-save route (story 51 to 69).** `npm run test:campaign-future` (build `4b5b24d9e6e6`) chains the medieval, cathedral and homecoming routes into `tests/campaign-future-controller.mjs` and passed in **Snes9x (1,148,661 frames) and bsnes (1,147,559 frames)**, with controller input and reads only. The future leg trains in Lab 16 to level 11 with Trann Dome rests, beats the supply keeper at original stats, and plays the food store, the rat chase, both passage switches, the archive (story 54), the seed return (story 55), Rivet's race, and Pinocchio's first repair. Fiona is the companion. In the factory it plays the security tag, crane rides and conveyor, the X A / B B crane codes, crane training to level 15, the console guards and lab hatch, the laser terminal, the X A B Y lock and the generator escape. It then wins the six brothers (story 66) and the second repair (story 69, Steve's place). Room travel replays 43 recorded paths (`tests/data/future-route-paths.json`) found by a development-only savestate search. Reports: `.local/qa/campaign-future-4b5b24d9e6e6/`.
- **The return leg extends the fresh-save route to story 81.** `npm run test:campaign-return` adds `tests/campaign-return-controller.mjs` after the future leg and passed in **Snes9x (1,242,918 frames) and bsnes (1,261,962 frames)**. The leg covers Steve's welcome at the Last Inn (the native party-swap menu closes with B), Steve's call back, Guy Fieri's lesson (instructions, three clockwise laps along the kitchen walls, the second talk, declining the practice round), Steve's farewell, the Medina Village pillar, the Medina house, and the mountain cave. The cave route runs through 49's lower doorway, the chamber ladder, the lower hall of 47 and a pocket of 49 to the keeper (the original Heckran). The keeper's AI sets bit 7 of its stat byte 0x1A while it taunts, and the route withholds attacks during that stance. After the fight the party rides the current out. Reports: `.local/qa/campaign-return-4b5b24d9e6e6/`.
- **The bridge leg extends the fresh-save route to story 90.** `npm run test:campaign-bridge` adds `tests/campaign-bridge-controller.mjs` after the return leg. Snes9x passed (1,361,340 frames). bsnes passed on a rerun (1,379,084 frames): its first run lost the cathedral impostor fight, which earlier runs won in both cores. That fight is close enough that harness timing under load decides it, and it needs more margin. Four travelers spill every gate into the Last Inn, so the route takes the festival gate, then the Old Kingdom Canyon pillar back to 600 A.D. (story 84). It then plays the captain's ration request, crosses Guardia Forest north (the medieval crossing, now shared in `tests/forest-controller.mjs`) to the castle chef for the Onion Bread, and returns south through the forest. It delivers the bread (story 87) and defends the bridge against Horner and the original Zombor with the party's spells (story 90). Reports: `.local/qa/campaign-bridge-4b5b24d9e6e6/`.
- **The mountain leg extends the fresh-save route to story 96.** `npm run test:campaign-mountain` adds `tests/campaign-mountain-controller.mjs` after the bridge leg and passed in **Snes9x (1,582,569 frames) and bsnes (1,568,960 frames)** on cartridge `4b5b24d9e6e6`. The party shops at Dorino's general store (Onions, Mid Tonics, Revives), meets the ogre ambush at the mountain foot (story 93), climbs the west ladder onto the south face, crosses the east faces, the summit rooms and 149's plateau to the cave, and wins the clown challenge: the duo, then the Great Milenko, whose stored tornado energy Shrek's Eye Lasers scatter, as the Dorino tip says. It collects the Broken Hatchet Head and rides the wind down. The same run includes the safer impostor and cave keeper tactics: the keeper is never struck with blows, a spell is cancelled at its target screen if the taunt begins, nobody attacks while an ally is below 75%, and Shrek and Fiona heal with the native Aura Whirl double tech. Boss stats are unchanged. Reports: `.local/qa/campaign-mountain-4b5b24d9e6e6/`.
- November 9 discovery update (savestate-assisted, not yet a committed controller): the keeper now falls at normal level by targeting the bits by slot, reviving with OnionJuice and healing with Fiona. Discovery then plays the food store, the rat chase and password (`0x100ec`=97), both passage switches (`0x100a4`=97; the right switch is reached by stepping down, right and back up), the archive (**story 54**), the seed return at the shelter (**story 55**, race key 213), Rivet's introduction and a won boost race (the race controller wins through the native finish), and Pinocchio's first repair, naming screen (Start keeps "Pinoc") and recruitment (**story 60**, party Shrek, Pinocchio, Donkey; levels 12/10/12). In the factory, the security tag opens the right grate (`0x10058` bit 2); the upper doors of the entrance and the two lifts (229 and 230, string 32's two-way choice) open with A, not by walking into them. The rest of the factory follows the original route, now known end to end. Lingering at the crane room's red shutter lets the crane carry the party through two fights to the room's lower west side. From there the route goes through the beetle conveyor (232), up its ladder and through room 233. The crane console then takes X A and B B, and the barrels move (`0x10058`=100). Back at the entrance, the left lift room's guard fight (Acid and Alkaline) switches on its console, which opens the hatch to the lab (`0x1005c` bit 5). The lab terminal and its ambush shut off the lasers (`0x10058` bit 0). The ZABIE lock reads X A B Y only from presses held for about 12 frames (`0x101d0`=1). The generator escape follows (**story 63**), then the six brothers at normal level (**story 66**) and the second repair (**story 69**, location 464). The brothers fight decides the companion choice and the preparation. Donkey's branch and an unprepared Fiona branch both lost at levels 12–13: the 60 market Onions and all three OnionJuice were spent before the factory. The route therefore takes Fiona at Pinocchio's recruitment. It levels on the repeatable crane fights (12/10/12 to 15/14/15), healing in the field with Sing-Along and refilling MP with OnionBroth, and heals before the fight. Boss stats are unchanged. Route-kit fixes from this pass (committed): Onion stock is found by item ID, untargetable scenery slots are skipped, and revives come before area techs. Scripts and savestates are archived privately.
- Technique, Dragon and Mr. Worldwide checks pass, but their diagnostic loadouts are not normal-level balance evidence. Unique ending outputs still need the connected North Cape and final-dive routes.
- Every independent suite was re-run on `c04e7dcd`. Report paths in re-run sections that name an older hash are superseded by the `*-c04e7dcdfb3b` reports.
- No physical flashcart or console test has been performed. Mapper 35, reset behavior, extended reads, SRAM, and NMI/DMA-sensitive scenes therefore have **no hardware acceptance**. FXPak Pro is the intended target, but its public specifications establish capacity without confirming this mapping: [EverDrive](https://everdrive.me/cartridges/fxpak-pro/halloween-edition-2025.html) and [Stone Age Gamer](https://stoneagegamer.com/fxpak-pro-halcyon-future.html).

## Release scope decision

On 2026-11-04, Mikola explicitly approved an **emulator-scoped release** for Snes9x and bsnes rather than waiting for physical hardware. This is not hardware acceptance and does not imply FXPak/console compatibility. Release readiness still requires the connected campaign, retained endings, Dragon parties, technique progression, and final candidate evidence below.

## Verdict

**Blocked — not release-ready.** Native content and focused persistence evidence are substantial, but the complete connected campaign and ending matrix are unfinished. The approved scope is Snes9x and bsnes, with no physical-hardware compatibility claim. No public push, tag, announcement, or publication is authorized by this report.
