# Endgame actor and oven artwork

The published cartridge is `21abd2c3bb7bf8e2b7116433753701a4f375a9c8eb39c399ba6666ff824fb361`. It adds Rumpelstiltskin and his usurper form, both Wishworks Golem palettes, giant Fairy Godmother and both hands, the Cosmic Muffin oven interior and Tyson’s emergence. Generated sources and the supplied Tyson sheet compile directly into native graphics, assemblies and background packets. JavaScript only stages reversible diagnostics.

| Resource | Slots | Decoded bytes | Assembly bytes | Native cells |
| --- | ---: | ---: | ---: | ---: |
| Rumpel, graphics 143 | 28 | 8,256 | 1,120 | 4 |
| Wishworks Golems, graphics 216 | 8 | 8,000 | 960 | 12 |
| Godmother face, graphics 161 | 2 | 2,112 | 240 | 12 |
| Godmother hands, graphics 162 | 20 | 4,416 | 1,600 | 8 |
| Oven arms, graphics 208/209 | 12 each | 12,640 shared | 1,440 each | 12 |
| Tyson emergence, graphics 238 | 8 | 6,880 | 960 | 12 |

The seven banks add 90 slots and 146 owner/pose combinations. The arms share one 12,128-byte compressed packet and preserve their separate native assemblies. Their right-hand geometry mirrors the complete accepted source with recorded original attachment offsets. Two explicit raw streams preserve native loading without consuming the decoded sprite heap.

The oven body replaces background packets 181/182 and metatiles 46. Only tiles 116–163 change in shared pulse packet 22; the other 208 tiles and all three original pulse programs remain exact. The original cave, map, collision, six unrelated background palette slots and shared blank heart actor remain intact. Godmother’s two shadow-bearing hand poses retain their original indexed shadows. Tyson uses the existing final-battle palette without writing it again; the original white-silhouette fade remains part of his emergence.

Original headers, animation programs, enemy AI, statistics, rewards and object-cell limits are preserved. Rumpel and both Golem palettes retain their original color values. Godmother and the oven use approved exclusive palettes. The source contract now fixes 44 banks, 637 slots and 2,097 source/evidence files. Source packets preserve their historical private-cartridge fingerprints; those older timing measurements are not relabeled as current full-scene coverage.

## Native validation

All 146 displayed poses pass in Snes9x and bsnes on this exact cartridge. Snes9x additionally verifies exact uploaded tiles and palettes. The six authored routes pass in SnesJs, Snes9x and bsnes: throne confrontation, Golem twins, the Boss countdown retreat, Dragon-deck battle and escape, giant Godmother through head defeat, and the oven battle through Tyson’s original emergence into final formation 479. The last route observes emergence frames 0, 1 and 3–7; frame 2 is separately covered by the native pose test.

These routes use a level-60 diagnostic kit and the original event entry, with ordinary controller input thereafter. They do not establish normal-level balance, later ending outcomes or complete campaign progression. SnesJs verifies exact WRAM restoration when returning from each shortcut. Five frozen-source/ownership checks and eighteen resource, streaming and sandbox checks pass separately.

The controller now waits for the original item menu to accept input during enemy actions. It also waits for actor IDs after the battle flag rises, because the native formation loader finishes later. Earlier failures were test readiness assumptions. The independent pose fixture moves the test party clear of the oven arm and uses the proven hand positions; no production sprite position or combat logic changed to satisfy those checks.

## Review and shortcuts

F1’s area selector includes six named endgame checkpoints, each with its required party. The native frame inspector includes all ten new actors. `npm run test:endgame-art-cores` checks the poses; `npm run test:endgame-scenes` checks the original encounters and continuations in both independent cores. The scene runner accepts `--section=` followed by a key from `engine/endgame-checkpoints.js`.

The gallery exporter accepts `--endgame-evidence .local/qa/endgame-js-21abd2c3bb7b` to include the seven actual encounter captures. It rejects evidence from a different cartridge fingerprint. The updated gallery has 141 atlases and 4,153 mapped frames, including existing technique recordings.

There are 63 selected raw NPC streams totaling 455,872 bytes. The nine existing extended compressed packets remain 76,227 bytes. This image leaves 14,254 reclaimed original bytes and 1,339,584 extended bytes. No WRAM, VRAM, palette slot or object cell is added.

Exact evidence is under `.local/qa/endgame-art-21abd2c3bb7b/`, `endgame-scenes-21abd2c3bb7b/` and `endgame-js-21abd2c3bb7b/`. The Snes9x evidence combines the five completed per-scene reports from its initial run with the focused corrected oven report; bsnes has one complete final report. The SnesJs evidence similarly combines the first five passing cases with the focused corrected oven case.

Connected late-chapter review, remaining enemy ability labels (including the oven’s original battle label), the complete shell-entry/finale matrix and ending adaptation remain production work. Field dialogue has authored adaptations; this graphics milestone does not validate every scene or ending.

## Reproduction and publication

The staged original sources regenerate all three art modules and cartridge `21abd2c3bb7b` exactly. Floating IPS independently reconstructs the 1,723,274-byte BPS, SHA-256 `4bb78ffeb03da2084bdffb01b1f353a4c4d2c6dd7a42fe93d82fcc2fed3407b3`. Desktop/mobile game checks include all six checkpoints and ten new native previews. All 141 gallery atlases load, with seven verified scene captures and the existing five technique cards. The cartridge, patch and gallery were published together without resetting the live session. See `.local/qa/endgame-21abd2c3bb7b/publication/publication.json`.
