# Medina and the mountain cave

The return from the Last Inn adapts all 79 referenced strings in locations 32–36, 39, 42, 46–48. Villagers distrust royal spies and outsiders, the cupboard hosts offer a welcome and food, and the cave guardian points the party toward Farquaad's medieval ritual. The altered-history mayor, inn and market retain their peaceful branches. The forest pyramid explains the builders' two mutually exclusive gifts.

Every native event instruction is retained except the relocated `B8` dialogue-table operands. Six decision boxes keep their row positions. The timed hero shout retains both delay controls. Shops, prices, healing, treasure, story changes and travel are executed by the cartridge.

## Native artwork

| Actors | Source slots | Frames per actor | Decoded graphics | Source budget |
| --- | --- | --- | --- | --- |
| Jack Horner, hideout Horner, Big Jack | Enemies 166–168; graphics 155; assembly 148 | 30 | 4,736 bytes | 8,192 bytes |

Original indexed artwork is authored in `engine/medina-art.js`; palettes and source mappings live in `content/medina-actors.js`. Horner has a purple coat, cravat, bowl haircut, gestures, spell poses, defeat, dizzy frames and three ice-shield stages. He retains eight native 16×16 cells. Shared ownership is checked before replacing graphics, assemblies or palettes. Headers, animation programs, AI, statistics and rewards remain unchanged; no extra WRAM or VRAM is required.

The cave guardian is the stock Heckran (enemies 169/200, graphics 140, assembly 134) with its original art; the November 6 art-scope tightening (see [decisions](decisions.md)) retired its redraw. It keeps the battle names **Crag Keeper** and **Crag Echo**, which the villagers and the world label use.

## Controller coverage

The read-only route functions in `tests/medina-controller.mjs` run against SnesJs and the external Snes9x/bsnes hosts. After preparing a checkpoint, they use controller inputs, reads and screenshots only.

- Cupboard arrival, welcome, all three early companion combinations, declined meal, accepted meal, full native recovery and house exit. The welcome advances story 77 to 78.
- Hostile inn refusal, confrontation, victory, 200 G lodging, peaceful 10 G lodging, declined lodging and insufficient funds at both prices. The native bed animation performs recovery.
- Hostile market refusal, confrontation and victory; peaceful market greeting; real shop entry, one Onion purchase and exit. The hostile multiplier varies with the native random value. The peaceful multiplier is 191/256; the native shop rounds fractional prices upward, so a base 10 G Onion costs 8 G. Ordinary pricing is restored on exit.
- Crag Keeper's native battle, selecting magic through the actual menu, MP expenditure, both companion explanations, declining the current once, accepting it and reaching the overworld. Story becomes 81 and the shortcut flag is `$7F01F0` bit 0.

Six browser shortcuts prepare these scenes. All seeding occurs before the native `E0` transition. Undo restores the complete saved state, including flags and resources; cartridge bytes remain unchanged. Strong equipment and large shop funds are diagnostic fixtures. These checks do not establish normal-level balance or fresh-campaign continuity.

All 144 frames have exact native VRAM and indexed-pixel tests in SnesJs. The independent suite checks all native tile uploads in Snes9x and all displayed poses in both independent cores. The browser bench exposes each actor and frame.

## Remaining chapter work

The forest pyramid's seal, all six companion reactions, both exclusive gifts, claimed state and real forest exit now have a shared controller route; see [swamp-creatures.md](swamp-creatures.md). The full cave approach and intermediate encounters, ordinary villagers, signs and remaining environment art still require scene acceptance. Horner's later fortress/hideout events and Crag Echo's final-shell callback also require their own progression checks. Replacing their shared graphics now does not establish those later routes as complete.
