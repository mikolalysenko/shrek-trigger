# Trial, prison and the escape to the future

`content/trial-dialogue.js` adapts all 304 referenced strings across thirteen locations: the present court and its side rooms, the trial, prison, treasury and forest dead end. The court rooms also contain later-visit dialogue. The later royal-treasure trial itself remains a separate chapter to adapt.

Charming prosecutes Shrek and dismisses Fiona's account. Harold accepts the court's authority at the cost of listening to his daughter. The guilty verdict schedules an execution; the innocent verdict orders three days in a cell, after which Charming invents an execution order. The prison supervisor explicitly questions that discrepancy. Festival evidence remains tied to the original actions, including returning the cat, eating the lunch, taking or selling the pendant, and pulling Fiona away from the stall. The seven jurors, answer branches and flashbacks use the source event instructions.

Queen Lillian remains alive. Later court-room lines describe her absence during illness and Charming's manipulation of that family separation. The eventual reconciliation must expose that account and Harold's choices; it must not restore the source story's deceased Aliza by accident. The present Court Beast works within Charming's scheme. Its defeat does not excuse Charming's prosecution or automatically settle the family's conflict.

The prison's alternatives remain intact: wait through the countdown for Donkey's rescue, or bang on the bars and break out before meeting him in the office. The tank manual retains the head's repair behavior and Lightning/Fire immunity. Fritz's rescue, food, consumable rewards and all seven decision boxes retain their native commands and option rows. The Ruby Hatchet quest remains separate.

## Native text and storage

Only the B8 text-table addresses change in these event programs. Event length, commands, branch offsets, fights, item rewards, party changes and exits are verified against the original cartridge. Text tables and their strings remain in one bank.

The prison counter uses control `$0D`, which reads a one-byte value from a separate argument stream. `$0E` and `$0F` consume two and three argument bytes. None consumes the following text glyph. `{value 8}`, `{value 16}` and `{value 24}` express those widths; `{value}` remains an alias for the first. Delay controls have inline byte operands, and a zero delay ends the string. Tests execute the original formatter at `C2:58B2` through its glyph emitter for zero, boundary and multi-digit values.

`content/dialogue-ownership.js` records addresses and ownership, not original prose. It inventories 492 valid global events and 4,341 unique strings. The global event pointer table has **513** entries: location 449 uses entry 512 at file offset `3CFFF0`. Masking the event ID to nine bits would alias it to another event.

`engine/dialogue-pools.js` reclaims only exact terminated strings in narrative banks 37, 38, 39 and 3C after every known event owner receives a replacement table. It validates original event pointers, B8 signatures, string-pointer fields and control-aware extents. It reserves all 512 bytes of every original table, retains live overlapping suffixes and protects complete direct 24-bit pointers to catalogued string starts in either HiROM mirror. Unreferenced gaps, pointer tables and other banks remain reserved. This is an ownership audit of the identified resources, not a proof about every possible computed pointer into an arbitrary byte.

The builder rejects a layout that omits any inventoried B8 command. With this chapter, 50,655 old text bytes in 274 spans are eligible for reuse. The resulting 4 MiB cartridge has 54,204 bytes left in audited pools, with zero added WRAM or VRAM. Later content must continue to fit these measured allocations.

## Duloc Tank artwork

The three native targets are enemy 147 (Duloc Tank), 173 (Repair Head) and 148 (Duloc Wheel). Their ten-byte headers, AI, stats and part relationships are preserved. Original artwork in `engine/duloc-tank-art.js` replaces the organic dragon outline with a timber platform, plated boiler, crowned repair turret and rotating iron wheel. All parts share the original twelve-color palette 184.

The chassis uses the original irregular 24-cell geometry and anchor. Native size-class 3 loads a single fixed 96-tile frame at `C0:E12A`; it does not animate through the ordinary static-frame command. The following all-zero source record is padding and remains reserved. The repair head has five four-cell frames and the wheel has two. Their source anchors keep the parts assembled in the battle and collapse scene. Generated graphics occupy 2,688, 1,024 and 864 decoded bytes respectively.

Four-cell uploads have separate upper and lower 256-byte blocks. The chassis uses one 3,072-byte upload. Native tests compare those layouts exactly. The head and wheel also pass indexed framebuffer checks. The actual catwalk scene is checked separately from the kitchen preview, where foreground tiles can obscure the large chassis.

## Development checkpoints and acceptance limits

Seven reversible workshop presets cover helpful/selfish trial evidence, the cell, Donkey's office arrival, the tank, Fiona's court confrontation and the forest gate. Each prepares its own party and story flags; the party override is disabled. They use the strong developer loadout, and Return from jump restores the previous machine state. The IPS does not contain these fixtures.

The trial starts with all prison flags clear. Its native intake sets `$7F0190`, `$7F0192` and the three-day counter `$7F0197`. The cell preset bypasses only the initial waking animation. The tank's completed bridge-collapse flag is `$7F021A`, not merely the earlier battle-start flag in `$7F0199`. The future destination number is assigned before the time tunnel ends; acceptance also waits for the destination's event program to load.

`tests/trial.test.mjs` covers unchanged instructions and choice rows, seven innocent/seven guilty votes, both intake branches, the separate ransom confession, live numeric countdown, both Donkey arrivals, the breakout fight, all three tank targets, the collapse, Fiona's recruitment and the gate destination. `tests/duloc-tank.test.mjs` checks the artwork, anchors, palette and tile uploads. Browser checks exercise every new preset, undo and the three part previews. These fixtures establish scene behavior, not fresh-campaign continuity or chapter balance.

The independent runner repeats both verdicts, the countdown rescue, office arrival, tank battle, Fiona's court escape and future gate in Snes9x and bsnes. It checks the eight usable tank frames through native loaders. Its already-initialized kitchen bench disables other object streamers before reserving the chassis's fixed tile range; the real catwalk battle uses ordinary native scene allocation. Results and cartridge fingerprints are retained under `.local/qa/independent/`.
