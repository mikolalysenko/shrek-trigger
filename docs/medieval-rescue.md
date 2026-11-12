# Medieval rescue

`content/medieval-dialogue.js` replaces all 374 referenced strings in twenty medieval locations: the village and gate, Alder's five court rooms, the cathedral and the queen's prison. Later visits to these rooms also cover the bridge war, the Carnival Hatchet, the Rainbow Shell request and the return after Farquaad's fortress. Dialogue names the medieval official as the steward; Prince Charming is a separate character in the present prosecution.

Puss remains an exiled cat. His disgrace and lost title replace the literal frog curse. Fiona's disappearance, the group's rescue of Queen Elowen, Puss's departure and Fiona's return use the original event programs. Shrek speaks briefly at existing dialogue boundaries. All eleven decision boxes retain their native row indices and option order, including the kitchen's MP, HP and combined meals.

Every byte of these event programs is unchanged except the three-byte B8 text-table addresses. The builder verifies table signatures and relocates same-bank strings and compressed scripts. Native flags, battle formations, treasure, recruitment, rewards and exits remain in the cartridge.

## Court beasts

The Masquerader (enemy 144) and Court Beast (enemy 199) have original horned, clawed artwork with a discarded porcelain court mask. They share graphics 133, assembly 127 and animation program 99. Palettes 185 and 249 give the later encounter a separate color treatment. Their headers, AI and combat properties remain unchanged.

The 31 poses use eight 16×16 cells, as the source actors do. Two cells cover the head and six cover the shoulders and feet on a 48×48 editing canvas. Empty upper corners consume no cells. The compiler rejects opaque pixels outside this arrangement or overlapping source cells. Graphics occupy 7,040 decoded bytes; the frame table is 2,480 bytes. Both source resource owners are audited before their original allocations are reused. No WRAM or VRAM is added.

## Reversible checkpoints

The workshop provides four presets: Fiona disappears, recruit Puss, impostor battle and Fiona returns. Each sets the original scene's story prerequisites and party before a native location change. The party override is disabled for these presets. They use the developer test loadout, and Return from jump restores the previous machine state. These fixtures are absent from the IPS.

The court flags are in `$7F00A1` and `$7F00A9`; the post-rescue transport flag is `$7F01ED`. Fiona's return also needs the doorway's bit 2 in `$7F00A1`. A late story counter alone cannot start that scene. Puss's first recruitment is temporary: the active-party entry changes, while his permanent selection bit remains clear until the later hatchet quest.

## Checks

`tests/medieval.test.mjs` checks all strings and pointers, unchanged event instructions and decision rows, then drives Fiona's disappearance, Puss's refusal and acceptance, his naming screen, the impostor battle, queen escort, court return and both answers to Fiona. After a checkpoint is seeded, these scenes run through controller input without enemy-HP edits or event skips. These are scene tests with a strong test loadout, not a balance or fresh-campaign acceptance run.

`tests/court-beasts.test.mjs` checks palette ownership, unchanged AI and headers, both source resource owners and the cell budget. All 62 pose/palette variants pass exact native VRAM comparisons. Ten representative rendered poses are also compared pixel for pixel with the indexed artwork.

The independent runner repeats the rescue, both Fiona answers and the beast poses in Snes9x and bsnes. It checks all VRAM bytes in Snes9x and ten displayed beast images in each core. Browser checks cover the four presets, fixed party, undo and the new actor preview. Hardware and a complete fresh campaign remain separate acceptance requirements.
