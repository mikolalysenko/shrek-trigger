# Mr. Worldwide (optional superboss)

Pitbull, Mr. Worldwide, has played every era. Then the internet voted to send him to the Walmart in Kodiak, Alaska. He has lived in its stockroom ever since and calls it his exile. A lost Walmart greeter knows a shortcut there. The fight is optional, late, hard and generous. Nothing in the campaign depends on it. It replaces the earlier Onion Ogre in the same native slots.

## Unlocking it

- **Where:** after the Ocean Palace (storyline `$7F0000 >= 0xCB`, the threshold Guy's own late-game dialogue uses), an elderly Walmart greeter stands on the right side of Guy Fieri's End of Time kitchen (location 465). Before that the room is unchanged.
- **How:** talk to the greeter and choose **Go to Kodiak, Alaska.** **Not today.** is always safe.
- **The stockroom:** the party arrives in the Kodiak Walmart stockroom. Mr. Worldwide's theme starts and he gives his exile speech (Donkey asks whether he is *the* Pitbull). Then he offers the fight or the way home. Every outcome (leaving, winning or losing) returns the party to Guy's kitchen, so the stockroom has no other way in or out.
- **Flag:** `$7F01B5` (saved event memory, unused by every source event and native long-address reference). Values: 0 never met, 2 met (declined or lost), 1 defeated and rewarded, 5/6 a first/repeat Kodiak visit in progress.

The battle uses no-game-over: losing restores the party, and the greeter will take it back for a rematch. After the victory the greeter only says goodbye. In New Game Plus the event memory resets, so he returns.

## The fight

Enemy 0x24 is the unused Chrono Trigger *Octobino* record (no event loads it, no AI transforms into it). It becomes **Pitbull** (battle name), with 30,000 HP, level 60, full status immunity and speed 14–16. The music is **Fireball · Boss Battle 2** (song `0x4F`; see [music](combat-and-music.md)). His four phases are stops on his world tour. Each change is a native Magus-style barrier write (battle offsets 3F–42 for Air/Dirt/Water/Fire, plus defense) fired with **World Tour**, a modest party-wide Fire hit, followed by a hint message.

| Phase | HP | Defense / magic defense | Weak | Resists / absorbs | Hint |
| --- | --- | --- | --- | --- | --- |
| Miami heat | 30,000–22,528 | 200 / 50 | Water ×2 | absorbs Fire | "Miami heat! Cool him with Water!" |
| Penthouse suite | 22,528–15,104 | 80 / 80 | Air ×2 | Fire halved, magic soaked up | "Penthouse suite! Hit him hard!" |
| Fireball mode | 15,104–7,680 | 127 / 50 | Fire ×2 | absorbs Water | "He is a fireball! Use Fire!" |
| Kodiak exile | 7,680–0 | 127 / 50 | Dirt ×2 | absorbs Fire, others halved | "Kodiak exile! Dirt ends it!" |

His moves are private clones of stock enemy techniques in the unused enemy-tech slots E0–E7. Every damaging move but Heat Wave uses a Fire-element source. Each clone keeps its source animation, targeting, element and formula; only power and status chance change, and its name is the native battle message attached to the AI action.

| Move | Source | Effect |
| --- | --- | --- |
| Flaming Mic Drop | enemy tech 0x11 (Fire, physical formula) | heavy single hit |
| Dale! | Son of Sun's Flare | Fire, whole party |
| Pyrotechnics | enemy tech 0x37 | Fire, whole party, 50% poison (the burn) |
| Smoke Machine | enemy tech 0x9D | Fire, whole party, 50% Blind |
| Heat Wave | Golem's Iron Orb | halves one member's HP |
| Hotel Room Service | Mud Imp head repair | heals himself about 1,000 HP (penthouse) |
| World Tour | enemy tech 0x3F | moderate Fire, whole party, on every phase change |
| FIREBALL | enemy tech 0xA6 | the big one, Fire, whole party |

FIREBALL is always telegraphed: "He is counting down! Brace!" and one idle turn come first, so the party can heal or defend. The exile rotation uses it twice as often. Fire is the trap and the payoff. Miami absorbs it ("Fire? He IS the fire!"). Fireball mode is weak to Fire, but each Fire hit hypes him up and raises his attack ("Fire hypes him up! Attack up!"). His dialogue before the fight gives all four hints. Fire protection helps against nearly everything he does. Donkey's innate Fire resistance already takes about a fifth off.

Observed damage per member against the synthetic level-60 test kit (999 HP):

| Move | Damage |
| --- | --- |
| FIREBALL | 525–672 |
| Flaming Mic Drop | 270–490 |
| Dale! | 259–339 |
| Pyrotechnics and Smoke Machine | 161–213 each, plus status |
| World Tour | 147–194 |

These match the tuned Onion Ogre bands. Real late-game parties have less armor, which is the point: come prepared, or come back later. Two Fire candidates, enemy techs 0x96 and 0x97, stall a battle when cloned onto this enemy, so they are not used.

## Rewards

- 9,999 XP, 15,000 onions and 100 TP (native battle rewards).
- Battle drop: one Swamp Feast. **Charm** (Puss) can steal a Pinhead (Gold Stud: −75% MP cost).
- From Mr. Worldwide: his shades, the **Spectacular Specs** (the Prism Specs slot, +50% damage), and three Swamp Feasts. "I have a hundred pairs."

The reward scene plays once. The defeated flag ends the exile, and the greeter stops offering trips.

## Native implementation

`content/mr-worldwide.js` owns the data (slots, phases, moves, text). `engine/mr-worldwide.js` writes the cartridge records, AI and both room events.

- **Enemy records:** stats (`C4:4700`), rewards (`C5:5E00`), battle name, sprite header and AI pointer for enemy 0x24. The AI lives in bank CC at `CC:CBC9`, the source battle-message table that the finale relocated; its only reader (`D0:0298`) now points elsewhere. AI operands avoid the native FE/FF scanner bytes.
- **Battle text:** messages 227–242, merged into the finale's relocated table, which rejects duplicate ownership.
- **Guy's kitchen (465):** the program grows one object (21), the greeter, a stock NPC (28) with ordinary activation. Every source function keeps its bytes after the uniform 32-byte table move. Guy's startup and practice battles are untouched: a field NPC never joins a battle. Strings 177–181 extend the room's own table.
- **The Kodiak stockroom (344):** this borrows the aisle-shelving storeroom map, which is ordinarily an Arris Dome scene. It is not a new location: Chrono Trigger has no spare interior location, since every apparently empty slot belongs to an ending or the developers' room.
  - The program grows one object (9), Mr. Worldwide.
  - Two source functions run from verbatim copies behind a read of the visit flag. Object 0 holds the room's setup script; object 8's startup holds the resident NPC. A branch to the shared trailing return carries that byte along.
  - During a visit, the setup only selects the dialogue table, the resident stays unloaded, and Mr. Worldwide loads in battle slot 3 (the only slot a twelve-cell battle enemy fits).
  - On every other visit the copies run exactly as before, and Mr. Worldwide stays absent.
  - His scene runs from his own startup script, then always changes location back to Guy's kitchen. The kitchen keeps whatever song is playing, so the trip home first restores its theme (song `0x1B`, as Guy's practice returns do; the build checks that signature).
  - Strings 12–21 extend the room's own table.
- No extra WRAM, VRAM, CPU hook or runtime JavaScript is used.

## Artwork

The sprite is eight 48×64 poses in the native twelve-cell class, sharing Golem's eight-frame animation program 167:
- 0–2: breathing with the mic;
- 3: hit, with the shades knocked up;
- 4–5: wind-up and fireball throw;
- 6: the arms-wide "Dale!" pose, also the field idle;
- 7: casting, with a fireball overhead.

It uses a private graphics bank (204), assembly (250) and palette (239). The 12-color palette was picked by role from k-means clusters of the generated sheet:
- outline and black clothing;
- four suit tones from blue-grey shadow to white;
- three skin tones;
- fire red, orange and yellow.

**Source.** The frames are generated with the OpenAI Images API (`gpt-image-2.6-sunburst`, November 7). The prompt carries the art review's fixes:
- a bent-knee stance with angled feet;
- a visible neck between the goatee and the shirt;
- a real recoil with the shades pushed up;
- fold lines on the suit.

`assets/imagegen/mr-worldwide/source-v2.png` is the unchanged API output. `import-spec.json` samples it through the shared importer:
- a recorded magenta key mask;
- area sampling at a 52-pixel idle height.

Frames 1 and 2 are frame 0's breathing shift: rows above the jacket hem move one pixel, so the legs stay fixed. The README there lists the rejected candidates with their request IDs. The bank compiles to 201 tiles: 6,432 graphics bytes (3,819 compressed).

## Development and tests

- F1 workshop:
  - **Mr. Worldwide · Walmart greeter in Guy's kitchen** sets the story gate, a fresh unmet flag and the level-60 test kit. **Return from jump** restores everything.
  - Combat sandbox: **Mr. Worldwide · superboss** runs the native fight with his theme.
  - Native actor inspector: **Mr. Worldwide · optional superboss** scrubs all eight frames through Golem's program.
- `node --test tests/mr-worldwide.test.mjs` checks:
  - the unused source record and flag byte, every cartridge record and the AI bytes;
  - the Fire technique clones, battle and room text, and the authored frames in the cartridge;
  - both rooms' preserved and guarded functions;
  - the story gate, the greeter's refusal and the trip;
  - the stockroom meeting with Donkey's line, its refusal and the repeat visit;
  - the native formation and song;
  - victory rewards and retirement, and loss without game over followed by a rematch;
  - ordinary storeroom visits staying stock, and Guy's practice staying one-on-one;
  - all four phases, the FIREBALL tell, and the Fire reactions through the real battle menu.
- `npm run test:mr-worldwide-cores` repeats the encounter in unmodified Snes9x and bsnes cores. After a documented fixture (the level-60 kit, story value, cleared flag and a native room jump to Guy's kitchen), it uses controller input to cover:
  - the story gate;
  - the greeter's refusal and the trip;
  - the first meeting and its refusal, then the repeat visit and acceptance;
  - all four barrier phases;
  - every technique, resolving in each phase;
  - the victory reward and retirement;
  - the no-game-over loss with a rematch.

  Boss and party HP seeds shorten the fights and are labeled as diagnostic. Reports are under `.local/qa/mr-worldwide-<rom>/`.
- Physical-hardware behavior is untested, like the rest of the cartridge, and balance against real (non-synthetic) late-game parties still needs playtesting.
