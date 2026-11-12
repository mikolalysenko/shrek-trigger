# Townsfolk and woodland artwork

Ordinary townspeople, woodland creatures and generic enemies use their original Chrono Trigger sprites. Custom art is reserved for the playable cast, characters critical to the plot and direct Shrek references (the November 6 art-scope tightening in [decisions](decisions.md)).

## Stock actors

The active build restores the original graphics, assemblies, headers, palettes, animation programs and battle names for:

| Family | Graphics / assembly | Native owners |
| --- | --- | --- |
| Townkeepers | 11 / 7 | NPC22,49,89 |
| Town residents | 125 / 188 | NPC14,79 |
| Village tradesmen | 35 / 24 | NPC25,39,52 |
| Kilwala (former Woodland Sprite) | 81 / 36 | NPC77, enemy3 |
| Hench (former hobgoblins) | 83 / 38 | enemies5,75, including friendly field uses |
| Household residents | 12 / 7 | NPC21,48 |
| Townswomen | 36 / 25 | NPC13,40,213 |
| Mad Bat, Vamp, Cave Bat | 103 / 66 | enemies80,81,115 |
| Juggler and the Flea decoy | 91 / 48 | enemies57,240 |

The Big Bad Wolf, the Blind Mouse and the foal of the red Gate flashback no longer load the townswoman, tradesman and child rows: their rooms load private rows 218, 220 and 221 instead (see [supporting cast](supporting-cast.md)). NPC 213, 39 and 38, their banks, assemblies and palettes stay stock; NPC 39 still stands in the soda contest (room 439), the hero's house (152), the Dream Project (338) and an ending's crowd (90).

The Kilwala keeps its friendly Snail Stop dance and the Hench keeps its peaceful Medina conversation. Their generated replacement packets remain in `assets/imagegen/` only as inactive historical sources; they are not compiled or reclaimed. The keeper, household, tradesman and townswoman banks (11, 12, 35, 36) still stream their stock pixels raw, as in the verified candidate, because the crowded ending scenes rely on that timing in the development emulator; every other restored bank uses the native decompressed heap. The household residents return from private assembly 248 to the shared stock assembly 7. `tests/townsfolk-art.test.mjs` compares every restored bank, assembly, palette, header and name with the base cartridge.

## Native palette corrections

The fair still loads existing NPC89 instead of NPC22 in event27 objects16,24,25. Both are now the stock graphics11/assembly7 merchant in different palette rows; NPC89 uses compatible palette133. This avoids the crowded fair's fifth-row allocation failure without changing conversations, shops or event behavior.

The parade correction is unchanged: the Muffin Man uses unused row4 and Granny uses fixed Shrek row0, while the crowd retains palette133. These are named story characters with genuinely different art, so their palette isolation remains necessary.

Both fixes use native event commands and add no JavaScript gameplay hook, WRAM, VRAM, object cells or palette rows.

## Checks

The existing town, fair, smithy, parade, cathedral and woodland workshop entries still cover the same 29 routes and native frame IDs. Stock-art reversion does not remove any scene or acting program.

```sh
node --test tests/townsfolk-art.test.mjs tests/fair-townkeepers.test.mjs tests/parade-palettes.test.mjs tests/townsfolk-scenes.test.mjs
npm run test:townsfolk-art-cores
npm run test:townsfolk-scenes
```

The independent pose runner still checks every selected native slot, now including the restored stock townsfolk. Older cartridge hashes and generated-art acceptance counts in `production.md` describe historical builds, not the current stock-art scope.
