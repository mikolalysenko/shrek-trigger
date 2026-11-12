# Standalone SNES release plan

This document turns the JavaScript-hook and native-cartridge audit into a release contract. It describes the current architecture, the evidence already available, and the work required before calling Shrek Trigger complete. The copy-ready assignment for a follow-up agent is in [Release agent goal](release-agent-goal.md).

## Status, November 11, 2026

The sections below were written on November 4 and describe an older scope. Where they disagree with this section, this section is current.

- **Baseline:** `main` at `242ab4a` (game content) is the integrated baseline. Every feature branch is merged; version 0.1.0 was never released.
- **Scope change:** the "77 stock, 39 custom" technique split and the "do not add out-of-scope work" rule in blocker 3 no longer apply. Techniques may be renamed, redrawn and rebalanced for a joke; boss and encounter balance stays stock. The locked list of all 116 is `docs/technique-catalogue.md`; picture techniques, sound swaps and shake are in `docs/tech-pictures-and-juice.md`.
- **Evidence on `242ab4a`:** full suite 518 of 518; technique matrix passed in both Snes9x and bsnes (204 executions, 125 progression cases, 3 mechanism cases each); Snes9x campaign route passed.
- **Evidence on earlier commits of the same day:** campaign route to story 132 in Snes9x (`e0aa8aa`); 13 ending routes in Snes9x after the endings rewrite. The campaign route is timing-sensitive and failed once in a random travel battle on `554d0ff`.
- **Blocker 2 (ending text)** is done; what remains there is route proof (connected Reunion route, Farquaad/Dragon ending combinations).
- **Still open:** blockers 1 (last third of the campaign from a fresh save), 4, 5 (save, reset, reload), 6 (hardware) and 7 (release package: player notes, credits and provenance, non-affiliation notice).
- **Text leftovers fixed (November 11):** the three gift items, six stock map labels, "Porre", the flagged hint lines and the credits-room line. Other stock town and dome names (Truce Inn, Medina, Trann Dome, Proto Dome and so on) are still in both labels and dialogue.
- **Playtest material:** a private build and a teaser trailer are kept outside the repository; `scripts/review-dashboard.mjs` and `scripts/make-trailer.mjs` regenerate the review page and the trailer.

## Audit snapshot (November 4)

The snapshot was taken on 2026-11-04, on branch `claude/all-techs` at commit `14d0ea2` plus the then-present working-tree changes. Other workstreams had uncommitted dialogue, art, and test changes. Do not reset or discard them; establish an integrated, committed baseline before starting a separate release worktree.

The audited working tree builds successfully with `npm run build` and has:

| Property | Audited value |
| --- | --- |
| Cartridge SHA-256 | `9142edab89ca7649735b37ea26b89f22acc2b255eccd4c1d61e8234b83aa0112` |
| Cartridge format | 8 MiB ExHiROM, mapper 35 |
| Technique records | 116: 77 stock and 39 scoped custom/modified |
| Technique presentation status | No `animation-pending` entries |
| Adapted field strings | 3,042 in 161 edited event programs |
| Additional Shrek replies | 373 |
| Inventory records | 212 |
| Provisional player frames | 0 in every party set |
| Free reclaimed original-ROM bytes | 37,292 |
| Free extended data bytes | 1,189,760 |
| Additional WRAM / VRAM allocation | 0 / 0 |
| Physical-hardware acceptance | Not performed |

This is a candidate fingerprint, not a permanent release identifier. Rebuild and record a new fingerprint after every subsequent change. The broader historical evidence is in [production status](production.md); a successful build is not a fresh full-suite or full-campaign result.

## Architectural conclusion

A wholesale JavaScript-to-SNES port is unnecessary. The current builder already emits a standalone native cartridge. JavaScript builds resources, emulates the SNES, provides diagnostics and developer shortcuts, and drives tests. It is not the runtime game engine.

`scripts/build.mjs` imports the native patch builder and emits the private `.local/shrek-trigger.sfc` plus the distributable BPS. It does not import `engine/app.js`, `engine/hooks.js`, or `engine/devtools.js`. The ordinary browser play loop at `engine/app.js:95-97` calls `snes.runFrame()`; it does not evaluate game rules in JavaScript.

Keep the browser tools in source control for QA, but keep them outside release acceptance. A release must run after reset in an independent emulator without JavaScript callbacks, DOM state, host timers, or developer writes.

## Complete JavaScript hook inventory

`content/hooks.json` contains twelve observation points. `engine/hooks.js` verifies their CPU signatures and reports state; it does not provide a gameplay scripting API. Test-specific sentinels such as `four.frame`, `pile.frame`, `dialogue.reply`, and art-load checks are also instrumentation.

| Hook | Purpose and mutation boundary | Release treatment |
| --- | --- | --- |
| `battle.initialized` | Reports native combatant initialization; used to mark a developer arena ready | Omit diagnostics; native battle startup remains |
| `event.prepare` | Observes decompressed field events; the developer arena can replace the WRAM event here | Omit the arena or implement a real ROM event and menu |
| `battle.result` | Records native target, technique, damage, and flags for combat logs | Omit diagnostics |
| `field.nmi` | Observes native field NMI timing | Omit diagnostics |
| `event.init` | Observes object initialization for actor previews and art checks | Omit previews |
| `event.dispatch` | Observes event opcodes; developer jumps/previews and selected tests inject commands | Omit developer commands; campaign events remain native bytecode |
| `dialogue.render` | Records location, table, and string ID | Omit tracing; native text and reply code remain |
| `scene.load` | Records location transitions | Omit tracing |
| `battle.tech` | Records queued player techniques | Omit diagnostics |
| `item.use` | Records successful native item use | Omit diagnostics |
| `battle.ai-message` | Records native enemy AI message actions | Omit diagnostics |
| `battle.enemy-tech` | Records enemy technique setup and AI operands | Omit diagnostics |
| `battle.message` | Records battle text and Tyson charge warnings | Omit diagnostics |

Only developer tools register production-side listeners, and those listeners remain dormant until a developer feature is activated. Test mutations are not missing ROM systems:

- `engine/combat-sandbox.js:9-12` explicitly supplies its arena event in WRAM only.
- `tests/cartridge.test.mjs:126` injects an immediate transition to test NMI behavior.
- Preview and checkpoint code alters scripts, party state, HP, equipment, and story flags to isolate mechanisms.

Such tests are useful, but they are not standalone progression evidence.

## Native systems already implemented

The following behavior is already emitted as native code or data:

- Field-event programs, choices, quest logic, relocated dialogue, and battle text in `engine/patch.js`.
- Shrek's conditional spoken replies through a 96-byte native text-fetch continuation in `engine/shrek-dialogue.js`.
- Enemy AI, Tyson target validation, staged uppercut damage, and pose handlers in `engine/enemy-ai.js` and `engine/finale.js`.
- All 116 technique presentations, including the 39 scoped custom/modified techniques and the 77 stock techniques.
- Native technique selectors and bounded 65C816 routines for custom effects and choreography.
- Field, battle, and menu weapon-frame selection and shared player-frame remapping.
- Native Faygo pickups, item descriptions, element badges, item/shop behavior, and revised technique participants.
- Guarded NPC/enemy graphics streaming in `engine/npc-graphics-streaming.js` and the extended player tile copier in `engine/player-graphics-streaming.js`.
- Native music sequences, SPC code, title presentation, and ending credit.
- Native battery-backed SRAM. Browser localStorage and full emulator snapshots are developer conveniences, not substitutes for in-game save acceptance.

New behavior must follow the same path: deterministic ROM records, native event/AI/animation bytecode, or bounded 65C816 helpers through `engine/asm.js` and `engine/patch.js`. Do not add a JavaScript gameplay fallback.

## Evidence available now

The current production record reports broad focused coverage, including:

- All 4,601 adapted and retained field strings rendered, plus all 373 Shrek replies, in the complete dialogue audit.
- All 222 decision occurrences through 461 option confirmations, with native branch-result and next-PC checks.
- All 22 shops and 169 item options, party replacement/cancel, all eight naming screens, and all three real save slots.
- Native speech routes in Snes9x and bsnes.
- All 1,988 party variants in Snes9x and representative party/portrait poses in bsnes.
- Focused technique, endgame, combat/music, title, credits, source-art, and resource checks.

These are strong subsystem checks. They do not replace a fresh-save full-campaign run, every ending, native reboot/reload persistence, normal-level balance, or physical-hardware acceptance. Read the date and fingerprint attached to each result instead of treating older evidence as a new run.

## Release blockers

### 1. Fresh-save campaign and branch acceptance

Complete connected playthroughs of every mandatory chapter and optional quest. Verify ordinary and Button-gated unlock progression, recruitment, party changes, special equipment, absent-party alternatives, and normal-level survivability. Exercise Active/Wait and supported speed settings where they affect timing.

Tests may seed state for mechanism checks. Standalone acceptance must start from a fresh game or an explicitly documented natural checkpoint and must not alter ROM, CPU registers, WRAM, inventory, HP, or story flags after that boundary.

### 2. Alternate-ending text and logic

> **Status, November 11, 2026:** this section is out of date. Every ending and developer-room string is authored (458 strings checked by `tests/ending-matrix.test.mjs`; see `docs/acceptance.md`, "Retained endings", and the November 11 endings pass in `CHANGELOG.md`). What remains is route proof, not text: the connected pre-rescue Reunion route (the rescue and farewell at event 87 are checked in the text renderer but never played through), and unique output for each Farquaad recruited/defeated and Dragon intact/dive combination, which need connected North Cape and final-dive routes.

The following dialogue-heavy ending events still have no authored layout in `content/event-layouts.json`. Their original payoff text must not ship as an accidental Chrono Trigger remnant.

| Ending or scene | Runtime location(s) | Event ID(s) | Required work |
| --- | --- | --- | --- |
| Beyond Time and parade | 79 / 80 | 83 / 84 | Replace the king, ancestor, celebration, and farewell dialogue; cover party and Dragon variants |
| Reunion | 84, plus related 81 / 85 | 32, 85, 87 | Write absent-Shrek stakes, Time Egg/rescue, and Farquaad/Dragon variations |
| Dream Project | 338 / 340 / 379 | 13 / 15 / 19 | Replace the original developer room with intentional Shrek Trigger credits and characters |
| Successor wedding payoff | 79 | 83 | Adapt the reveal rather than reusing the original Guardia scene |
| The Oath | 345 | 309 | Write the Puss/Bram/Farquaad confrontation and repair/departure scene |
| What the Prophet Seeks | 414 | 222 | Replace the original Lavos/fate declaration with Farquaad and the Cosmic Muffin |
| A Slide Show? | 239 | 159 | Create a new retrospective and final joke; Shrek already speaks throughout the game |
| Apocalypse / loss sequence | 476 | 295 | Replace Truce/Porre/Choras/Lavos disaster reporting |
| Dino Age inn/fair material | 12 and related fair scenes | 325 and shared events | Finish transformed-timeline dialogue and reactions |

Good Night, The Unknown Past, and People of the Times are primarily dialogue-free presentations. They need visual/casting acceptance, not invented prose. Legendary Hero has useful adapted material, but still needs complete scene-order review.

The ending matrix must cover Shrek present/absent, Farquaad recruited/defeated, Dragon intact/used in the dive, early-finale access, and New Game Plus routes. Update broad claims that all verbal strings are adapted until these events are included.

### 3. Technique acceptance

All 39 scoped custom/modified techniques now have native presentations and there are no `animation-pending` records. Remaining work is acceptance, not a JavaScript port:

- Interrupted actions and caster/target death.
- Scene transitions and post-battle cleanup.
- Save/load and ordinary progression.
- Button-gated combination unlocks and participant patterns.
- Every party position and relevant target geometry.
- Both independent emulators, with Active/Wait and speed-sensitive cases where applicable.

Preserve all 77 stock techniques. Do not add generic mob reskins, Milk/all-custom-combo experiments, or other out-of-scope work.

### 4. Dragon and finale matrix

Finish Dragon acquisition, repair, boarding, flight, approach, and ending routes with every retained party composition. Complete shell entry and final-battle branches, including disable/kill during windup, starter revival, universal hints, exact victory conditions, target changes, and recovery. Current default-speed tell/KO/recovery checks do not cover every mode and speed.

### 5. Native save/reboot/reload acceptance

`scripts/audit-menus.mjs:137-154` verifies that all three save slots write the selected SRAM payload, leave other slots unchanged, and cancel without mutation. Add the missing persistence proof:

1. Reach each save through ordinary play and save through the actual menu.
2. Reset or power-cycle without restoring an emulator savestate.
3. Reload each slot through the native menu.
4. Verify story flags, party, inventory, equipment, techniques, Dragon state, and optional-quest branches.
5. Recheck slot isolation and cancel behavior in both independent emulators and on the hardware target.

### 6. Hardware and mapper acceptance

The candidate uses 8 MiB ExHiROM/mapper 35. Snes9x and bsnes support the current mapping; physical hardware remains untested. Select the actual release target, verify its ExHiROM support, and test reset, SRAM, DMA/NMI-sensitive scenes, extended data reads, and the complete campaign.

If the target cannot run this layout, stop and either fix the cartridge layout or explicitly scope the release to named emulators. Do not imply physical compatibility from emulator evidence.

### 7. Release package and provenance

Prepare:

- Deterministic source-only rebuild instructions and a clean-build fingerprint.
- Independent BPS application proof and checksum verification.
- Player instructions with controls, save behavior, emulator/mapper requirements, and known limitations.
- Credits, source-art provenance, third-party notices, and the required non-affiliation notice.
- Spoiler-separated route/ending notes, changelog, and acceptance evidence.
- No original Chrono Trigger ROM in the distributable package or repository. Distribute the BPS, not the private rebuilt cartridge.

Public pushes, tags, announcements, and publication require Mikola's explicit approval at the release gate.

## Resource and implementation constraints

- Keep executable helpers in proven executable regions. Original-ROM space is limited even though extended data space is comparatively large.
- Do not treat `extraWramBytes: 0` or `extraVramBytes: 0` as spare memory. Reuse existing scratch only after proving ownership and lifetime; document any new reservation before changing the budget.
- Preserve native cell, tile-index, palette, scanline, and 32 KiB heap limits. ROM expansion does not relax them.
- Keep NMI work bounded and preserve CPU flags, DB, DP, stack depth, displaced instructions, and timing contracts at every new trampoline.
- Test death, interruption, scene changes, save/load, and following actions for each new helper.
- Prefer content completion over new systems or generic visual replacements.

## Release execution sequence

1. **Baseline:** integrate existing work, commit it through its owners, record `git status`, start an isolated release worktree/branch, and run the full source/unit suite.
2. **Narrative completion:** close the ending-event table above and any remaining player-facing stock names or enemy labels.
3. **Connected campaign:** complete fresh-save normal and alternate routes, recording natural checkpoints and exact failures rather than patching over them with stronger fixtures.
4. **Systems acceptance:** finish technique, Dragon, finale, save/reboot, and party/mode/speed matrices.
5. **Independent cores and hardware:** repeat acceptance in Snes9x and bsnes, then the selected physical target.
6. **Package:** regenerate from a clean checkout, apply the BPS independently, record ROM/BPS hashes, finish player/provenance documents, and present the release candidate for approval.

Useful current commands:

```sh
npm run build
npm test
npm run test:browser
npm run test:dialogue-all
npm run test:dialogue-branches
npm run test:menus
npm run test:independent -- all
```

Additional focused scripts are listed in `package.json`. Independent emulators may require `RETRO_HOST`, `SNES9X_CORE`, and `BSNES_CORE`; see [native-port](native-port.md). Report every skipped command and why. Never convert an unrun or failed check into a pass in documentation.

## Definition of done

A release claim requires all of the following on one identified candidate:

- Clean deterministic build and independent BPS reconstruction.
- Full source/unit/browser checks, with no hidden skips or failures.
- Fresh-save completion of all mandatory chapters and optional quests.
- All retained endings and New Game Plus routes, with adapted text and branch-correct logic.
- All technique, Dragon, finale, party, mode, and speed acceptance.
- Native save/reboot/reload acceptance for all three slots.
- Snes9x and bsnes acceptance, plus physical hardware or an explicitly approved emulator-only release scope.
- Complete player instructions, credits, provenance, changelog, fingerprints, and evidence.
- Mikola's approval before public distribution.
