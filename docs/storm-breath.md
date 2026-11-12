# Storm Breath

Storm Breath replaces Lightning II’s caster presentation with a planted inhale, an open-mouth roar, sparks and the original storm over all enemies. The native 8 MP cost, Air damage, targeting, progression and combination records are unchanged. No status effect is added. The menu help reads **Air storm on all**.

The 29-byte caster script fits the original exclusive 45-byte prefix at `CE:0CB0`. It leaves the remaining sixteen bytes and every shared target/effect channel intact. Royal Gale uses those same later channels, so the patch audits their ownership and never rewrites them. The build rejects another header, channel, subscript or technique pointing into the caster prefix and rejects an aliased help string.

Shrek’s current native mouth frames replace the source levitation. The scene uses the resident roar and original storm sound, with existing Lightning II tiles, palettes and background animation. Its original counters coordinate the spark buildup, storm, target reactions and renderer cleanup. No CPU hook, graphics allocation, additional ROM space, WRAM, VRAM, palette slot or object cell is needed.

## Validation

Published cartridge `5018f48b599c67f33131c3d05350115484625450d2e8b44e5389f27144e21770` differs from the preceding endgame cartridge in only 46 bytes: the caster prefix, its own help string and checksums in the two headers. All shared effect data, art and gameplay remain byte-identical.

Three focused checks pass. The native cast test covers every party slot and both the clown duo and Great Milenko, mouth poses, both sound requests, planted coordinates, damage to every actual enemy, source MP with Gold Stud, audio bounds, complete cleanup and a following Eye Lasers turn. An initial assertion counted unused battle slots with stale HP; it now reads the actual formation IDs. No cartridge change was needed.

Snes9x and bsnes pass all three party positions in the original two-clown encounter, then execute ordinary Eye Lasers turns. Their respective runs cover 29,756 and 29,749 frames, with controller input only after initial diagnostic entry. Both enemies take damage, Shrek stays planted, the renderer clears and audio does not clip. These strong diagnostic loadouts establish execution, not normal-level balance.

Run `node --test tests/storm-breath.test.mjs` or `npm run test:storm-breath-cores`. Evidence is `.local/qa/storm-breath-5018f48b599c/`; the source prototype and its captures remain separate. The combat sandbox selects the same cartridge tech through the native menu.

## Reproduction and review

Clean staged sources reproduce all three generated art modules and this exact cartridge. Floating IPS reconstructs the 1,723,323-byte BPS, SHA-256 `23e6d1c92b38d6babc8042bd918122fe2221581731460f547433eeb7f1c9f9f8`. The browser checks pass, and all six SnesJs endgame routes pass again with fresh matching captures. The desktop/mobile gallery retains 141 atlases, 4,153 mapped frames and seven endgame captures; Storm Breath becomes its sixth native technique recording. Cartridge, patch and gallery were published together without resetting the live game.
