# Farquaad's fortress and Horner's enforcers

The fortress and hideout adaptation supplies 201 referenced strings across 22 locations. Forty-two entries reuse the existing Carnival Hatchet scenes; 159 are new. The build now contains 2,240 adapted strings in 134 edited event programs. Dialogue changes relocate the native string tables without changing event instructions, conditionals, timed battle messages or the treasure decision in the illusion hall.

Briar Knight and Moth Witch are original fairy-tale enforcers for Jack Horner. The knight's oath, armor and connection to Bram replace the source swordsman's presentation. The witch uses light, wings and deceptive appearances. Horner's scenes consistently concern his hoarded magic and equipment. The hideout has distinct dialogue when Farquaad is present.

## Native artwork

`content/enforcer-actors.js` describes the two families; `engine/enforcer-art.js` draws their indexed pixels. Four knight variants share 86 frames in a 9,024-byte decoded bank. Three witch variants share 16 frames in a 3,680-byte bank. Both banks are smaller than their originals. The original eight-cell allocations, animation programs, enemy statistics, AI and rewards remain intact. Each family owns its replaced palette exclusively.

The knight uses a 64×80 authoring canvas with eight native cells placed differently for extended weapons and tall poses. The compiler validates every layout, rejects overlapping cells or uncovered pixels, and keeps the cell count fixed. The witch uses a 32×64 canvas with cocoon, wing, spell and defeat poses. All 392 variant poses are available in the native preview bench. Their exact native uploads and displayed pixels are checked in SnesJs; independent checks cover all displayed poses in Snes9x and bsnes, plus Snes9x VRAM uploads.

The Blue Faygo bottle left after the witch retains the original Magic Tab reward. Its private bottle selector preserves the generic sparkle graphics and palette for other events. The decoy encounter also retains its separate native actor.

## Development shortcuts and controller checks

Nine reversible presets prepare the knight room, witch room, each hideout rematch, ritual corridor, complete hideout, blade trap, floor-switch battle and final cat scene. Early fixtures carry Puss's first Carnival Hatchet; late fixtures carry the upgraded weapon. Presets prepare flags and the strong diagnostic loadout before entering the native event program. Undo restores the complete prior state. No cartridge bytes are changed by the shortcuts.

The shared acceptance driver exposes reads and ordinary controller input only. After entry it performs no gameplay writes. Checks cover:

- The five-guard ambush, knight's unarmed and armed phases, one-time ReedCutter pickup and real exit to the gallery.
- The witch decoy, transformation, all three early companion reactions, one-time Blue Faygo pickup and real exit.
- Both hideout rematches with Farquaad present and absent, including the actual northern doors.
- The ritual from its real corridor entrance, all three chanting cues, Carnival Hatchet confrontation, battle, vortex and the actual destination's first wake-up dialogue. This runs with Fiona, Donkey and Pinocchio in the third slot.

The ritual test waits for the destination event's textbox because the native location word changes before the long vortex animation ends. Merely reading the destination ID would not prove arrival.

## Connected hideout quest

The continuous route starts at Horner's front door and uses the actual doors through both enforcer rematches, the machinery scene, blade trap, three-enforcer battle, floor switch, fall and return visit. The cat completes the native scene. The party then collects the hidden armory, retraces the rooms and leaves through the real overworld exit. Separate runs include and omit Farquaad.

The three-enforcer fight targets the witch and knight through the native Attack command and live target cursor. The floor-switch battle similarly selects enemy 241 as an ordinary target. No enemy HP, action queue, cursor or completion flag is written after the fixture. The strong loadout is not a normal-level balance result.

Taking the blade's bait leaves every active character at 1 HP. The alternative path preserves their health and lets the native imp scene demonstrate the trap. The hidden entrance opens by walking into its trigger; the controller stops when its native counter changes, avoiding a redundant interaction while the door is already opening.

The route earns Rich Onion Soup, Duloc Cape, Duloc Helm, Tall Order, Swift Ring, Sight Cap and Blue Faygo. Repeated interaction does not award another copy. It verifies the eight hideout milestones in `$7F01A1`, the earlier fall bit in `$7F01A0`, the follow-up flag in `$7F01F4` and the onion bit in `$7F01A4`. Separate cat fixtures cover all six possible final companion reactions. The fixture clears only the relevant bits in shared bytes and the six hideout chest bits; unrelated progress survives.

The full 135-check regression and both full independent suites passed after the art and text changes. The four added hideout checks, updated fixture checks and browser suite also pass on that same cartridge. The shared hideout driver completes 11 cases in each independent core: 119,575 frames in Snes9x and 120,913 in bsnes. Evidence is private under `.local/qa/fortress-full-*`, `.local/qa/hideout-*` and `.local/qa/independent/report.json`. The cartridge remains 4 MiB, with 78,033 reclaimed bytes free and no added WRAM or VRAM reservation.

## Remaining acceptance work

These encounters use a strong development loadout and do not establish normal-level balance. The whole fortress ascent, illusion-hall alternatives, fortress machinery and Horner's original barrier fight still need connected playthrough checks. The hideout route does not yet test stealing the trio's equipment. The wake-up destination marks the end of the ritual route; it does not establish completion of the next Bakery chapter. Full campaign traversal, ending appearances and hardware testing remain required.
