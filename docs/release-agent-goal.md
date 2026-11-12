# Goal: fully release Shrek Trigger as a standalone SNES game

You are the release agent for `/Users/mikolalysenko/Projects/shrek-trigger`. Take the current native build through content completion, connected acceptance, hardware validation, and release packaging. Do not rewrite the game as a browser/JavaScript engine: the existing builder already emits native 65C816 code, event/AI/animation bytecode, and data.

Read [Standalone SNES release plan](release-plan.md), [production status](production.md), [native cartridge path](native-port.md), and [game design](game-design.md) before editing. The release plan is the detailed contract; this goal defines your assignment and handoff.

## Baseline and preservation

- The audit baseline was branch `claude/all-techs`, commit `14d0ea2` plus existing working-tree changes. Candidate ROM SHA-256 at that snapshot was `9142edab89ca7649735b37ea26b89f22acc2b255eccd4c1d61e8234b83aa0112`.
- Other workstreams may have uncommitted changes. **Never reset, clean, checkout over, or discard them.** Integrate/commit through their owners, then create a separate release branch and worktree. Remove that worktree only after its changes are committed and handed back.
- Record the actual starting commit and working-tree fingerprint. Treat every later ROM/BPS hash as candidate-specific.
- Preserve the locked design: 77 stock techniques and 39 scoped custom/modified techniques, all with native presentations. Do not add generic enemy reskins, Milk/all-custom-combo experiments, or unrelated features.
- Do not include or distribute the original Chrono Trigger ROM. The public artifact is the BPS and its instructions/provenance.

## Required outcomes

### 1. Finish the remaining narrative and ending work

Close every unauthored ending event listed in `docs/release-plan.md`: Beyond Time/parade, Reunion, Dream Project, the Successor wedding payoff, The Oath, Prophet, Slide Show, Apocalypse, and Dino Age's remaining scenes.

Write and validate the complete ending matrix:

- Shrek present and absent.
- Farquaad recruited and defeated.
- Dragon intact and used in the dive.
- Early-finale and New Game Plus access.

Give Slide Show a new final joke because Shrek already speaks. Replace original Lavos/Guardia/Magus/Spekkio/developer-room material where it survives. Silent endings need visual/casting review, not unnecessary new dialogue. Reconcile broad claims that all verbal strings are adapted with the actual ending coverage.

### 2. Prove the complete game, not isolated fixtures

Complete fresh-save, normal-level playthroughs of every mandatory chapter and optional quest. Cover recruitment and absent-party alternatives, ordinary and Button-gated unlocks, party changes, special equipment, and all retained endings.

After a fresh game or documented natural checkpoint, do not write ROM, CPU registers, WRAM, HP, inventory, equipment, or story flags. Strong diagnostic loadouts may isolate mechanisms but cannot establish normal balance or standalone completion.

Finish the technique, Dragon, and finale matrices:

- Interrupted actions, caster/target death, scene transitions, cleanup, and following actions.
- All party positions and relevant target geometries.
- Ordinary and Button-gated technique progression.
- Dragon acquisition, repair, boarding, flight, approach, and endings.
- Shell entry, windup disable/kill, starter revival, universal hints, exact victory conditions, target changes, and recovery.
- Active/Wait and supported speed settings where they affect behavior.

### 3. Prove native persistence

The existing menu audit proves all three save slots write correctly and cancel safely. Add actual save/reset-or-power-cycle/reload tests for every slot. Verify story, party, inventory, equipment, learned techniques, Dragon state, and optional-quest branches without restoring an emulator savestate. Run these in both independent emulators and on the selected hardware target.

### 4. Validate independent emulators and hardware

Run the connected acceptance suite in Snes9x and bsnes. Prefer the read/controller-only pattern in `scripts/independent-controller.mjs`; diagnostics stop at the documented fixture boundary.

The candidate is 8 MiB ExHiROM/mapper 35. Select the intended physical target and test its mapper support, reset behavior, SRAM, extended reads, and NMI/DMA-sensitive scenes. If physical compatibility cannot be established, stop and obtain Mikola's approval for an explicitly emulator-scoped release instead of implying hardware support.

### 5. Produce a reproducible release package

On one identified candidate, provide:

- Clean source-only build and independent BPS application proof.
- Full source/unit/browser results with every skip or failure disclosed.
- ROM and BPS SHA-256 fingerprints and the exact source commit.
- Controls, save instructions, emulator/mapper requirements, and known limitations.
- Credits, art/source provenance, third-party notices, and non-affiliation notice.
- Spoiler-separated route/ending notes, changelog, and acceptance evidence.

Do not push, tag, announce, or publish publicly without Mikola's explicit approval at the release gate.

## Working rules

- Use existing native formats and `engine/asm.js`/`engine/patch.js` for new logic. No DOM state, host timers, JavaScript gameplay callbacks, or unbounded runtime arrays.
- Keep developer hooks, combat sandbox injection, previews, and checkpoints out of release behavior.
- Respect the 32 KiB heap, native cell/tile/palette limits, and proven executable regions. Zero additional WRAM/VRAM is a budget result, not free memory.
- Test interrupted effects and following actions, not only successful presentation.
- Keep failed evidence. Do not relabel an old run, a subset, or a strong-loadout fixture as full acceptance.
- Follow the machine's disk, credential, sudo, and cleanup rules. Remove temporary worktrees, clones, dependencies, and scratch output you create.

Start with:

```sh
npm run build
npm test
npm run test:browser
npm run test:dialogue-all
npm run test:dialogue-branches
npm run test:menus
npm run test:independent -- all
```

Use the focused scripts in `package.json` as each area is completed. Independent emulators may require `RETRO_HOST`, `SNES9X_CORE`, and `BSNES_CORE`; document any unavailable tool instead of silently skipping it.

## Handoff format

Return a concise release report with:

1. Source branch/commit and ROM/BPS hashes.
2. Changes made, grouped by campaign/endings, systems, tests, and packaging.
3. Exact commands and evidence for every acceptance item.
4. Remaining failures, skipped checks, balance limitations, and hardware limitations.
5. Clean-build and independent-patch reproduction instructions.
6. A clear **release-ready**, **emulator-only candidate**, or **blocked** verdict with reasons.

Do not declare `release-ready` until every item in `docs/release-plan.md`'s definition of done is satisfied on the same candidate and Mikola has approved publication.
