# Abandoned-attraction machines

Generic factory machines and the Guardian boss use their original Chrono Trigger artwork. Only Rivet keeps custom art, because he is a named story character.

## Stock machines

These banks keep their original pointers, decoded pixels, frames, palettes, native headers and battle names:

| Actors | Graphics / assembly |
| --- | --- |
| Bugger, Debugger, Debuggest (former cleaning mites, 84–86) | 96 / 55 |
| Proto 2, 3 and 4 (former Tin, Brass and Iron Ushers, 137–139; NPC170 shares Proto 3) | 97 / 56 |
| Bit and Byte (former Watch and Alarm Bells, 207–208) | 197 / 165 |
| Guardian attack overlay (212) | 172 / 167 |

The Guardian also keeps its original background body (graphics 186, tileset 43, palette 57); neither its background packet nor its palette row is rewritten or reclaimed. Its battle name stays **Storekeeper**, the boss name the November 6 art-scope tightening retained (see [decisions](decisions.md)). Encounter AI, rewards, map, collision, reveal, scrolling and animation timing are unchanged. The retired Usher and Storekeeper sources remain in `engine/future-machine-art.js` and `assets/imagegen/` as inactive history.

## Custom story actor

| Actor | Graphics / assembly | Poses |
| --- | --- | ---: |
| Rivet (244; NPC2) | 37 / 26 | 25 |

Rivet retains separate NPC and enemy animation programs; his racing presentation is described in [racing.md](racing.md).

## Large actor previews

Great Milenko and the Guardian's moving mechanisms use `engine/preview-frames.js` to select existing entries from their native animation programs. The preview changes only reversible WRAM animation descriptors, never cartridge bytes or CPU gameplay state. Return from jump restores the complete previous machine.

## Validation

`tests/future-machines.test.mjs` checks all four stock banks and the Guardian background, Rivet's custom frames, native AI/headers/maps, large-actor queue behavior and the Guardian reveal/battle/return. The independent runner and gallery compare only active custom source pixels; ROM-based native checks still inspect the restored stock machines.

The battle fixture uses a strong developer loadout and does not establish normal-level balance. Continuous future puzzle routes and fresh-campaign continuity remain separate acceptance work.
