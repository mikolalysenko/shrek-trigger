# Native Duloc guards

Farquaad's Duloc guards are a direct Shrek reference and keep their custom art. The frog guards and sewer trolls that once shared this pass use stock Chrono Trigger art again after the November 6 art-scope tightening (see [decisions](decisions.md) and [future wildlife](future-wildlife.md)).

| Family | Graphics / assembly | Native slots | Owners |
| --- | --- | ---: | --- |
| Duloc civic guard and spectral Sentry | 78 / 33 | 26 | NPC 75, enemies49/50 |

The guard remains a human Duloc soldier with visor, plume, plate, cloth, shield and sword; the Sentry uses its original spectral ramp. Both original guard palettes 14/15 are unchanged. Battle labels are `Duloc Guard` and `Duloc Shade`. NPC 75 shares the complete bank and retains its ordinary field header, including the directly selected fallen pose 25 used by the prison rescue.

All native animation programs, enemy AI, stats, rewards, original headers and object-cell reservations remain unchanged. Frozen source proofs cover 84 guard lists over 7,200 ticks; they belong to their recorded private candidate, not the integrated cartridge. The integrated source test reproduces the complete tile bank and assembly byte for byte.

## Storage

Graphics 78 streams raw through the guarded cartridge loader, and its standard compressed packet sits in owned ExHiROM data. No runtime hook, WRAM, VRAM, object cell or palette slot is added.

## Diagnostic coverage

`npm run test:guard-art-cores` checks every guard pose, plus the stock Krawlie, Hexapod and frog banks, in Snes9x and bsnes. Snes9x checks exact VRAM and palette values; both check displayed output. `npm run test:guard-scenes` follows the actual prison countdown/rescue, prison breakout, complete noisy sewer route, Northern Ruins Sentries, forest frogs and the desert Hexapod (Bog Baron). The runner accepts `--section=KEY` and `--resume`; resumed evidence must match the exact ROM hash, core and scene key.

The workshop has reversible **Duloc Shades · Northern Ruins**, **Pond Pages · original forest ambush** and **Bog Baron · original desert encounter** entries. They use the existing level 60 diagnostic kit and original events. Prison and sewer entries remain available. The route controllers receive only read operations and ordinary controller input after entry; they cannot write battle state or force victory. Return from jump restores the complete pre-entry machine state.

The adjacent court/jail officer, NPC 16, uses its stock art; see [court and palace artwork](court-swamp-art.md).
