# The Carnival Hatchet quest

The user’s revised casting supersedes the design’s Nine Lives Blade: Masa is Violent J, Mune is Shaggy 2 Dope, their fusion is The Great Milenko, and the legendary weapon is the Carnival Hatchet. The upgraded weapon is the Awakened Carnival Hatchet. The two quest parts are a Broken Hatchet Head and Carved Oak Haft; the antiquity precursor is a Ruby Hatchet.

The replacements are cartridge assets. `content/carnival.js` declares enemy, field-clone and prop slots; `engine/carnival-art.js` selects the generated clown and Milenko source poses and the generated hatchet frames (`assets/imagegen/carnival-hatchet/`); `engine/carnival.js` installs the assets. The clown jerseys, distinct face paint and Milenko’s turban, feather and green facial hair use generated raster sources converted to native indexed pixels. `assets/raster/carnival-props/art.mjs` supplies all eleven Ruby Hatchet, broken-part and Carnival Hatchet slots with steel/ruby bevels, wood grain and strong dark outlines. Its seven-slot spin preserves the original vertical haft axis, edge-on foreshortening and mirror timing. The game renders all of these through its original sprite engine; the prop build audit has zero procedural frames.

| Actor | Native role | Frames | Canvas / cells |
| --- | --- | --- | --- |
| Violent J | Enemy 151; field clone NPC 216 | 37 + 15 | 32×32 / 4 |
| Shaggy 2 Dope | Enemy 152; field clone NPC 217 | 37 + 15 | 32×32 / 4 |
| The Great Milenko | Enemy 153 | 20 | 48×64 / 12 |
| Ruby Hatchet | NPC 103 | 2 | 32×32 / 4 |
| Head and haft | NPC 104 | 2 | 32×32 / 4 |
| Carnival Hatchet | NPC 139 | 7 | 32×32 / 4 |

The two clown field/battle presentations share tile banks. All 135 frame slots retain native animation programs and timing. Palettes have twelve opaque 15-bit colors plus transparency. Shared child, item and sword assemblies are isolated before replacement; unrelated villagers and props retain their data. The antiquity scene’s second copy of enemy 151 explicitly becomes Shaggy’s enemy 152. Battle name fields use `G. Milenko` and `Shaggy2Dope`; dialogue uses the full names.

All Masa/Mune-style spirits throughout Zeal and the Ocean Palace use ICP or Great Milenko artwork. `zealSpiritScenes` in `content/carnival.js` records thirteen original loads across locations 335, 340, 350, 355, 401, 404 and 409. `tests/zeal-spirit-coverage.test.mjs` checks every emitted event load against the correct native header and generated raster bank. This includes both Enhasa variants, the other Zeal spirits, the palace pair and the later palace appearances. It is structural coverage of all thirteen loads; complete scene walkthroughs remain separately tracked.

Enhasa's three dream projections in each event variant load enemy 151 directly and therefore use Violent J. Ordinary child NPC 46 is a separate actor and remains available to other towns. `content/zeal-dialogue.js` adapts all 37 strings in each of Enhasa's two event variants, including the three clown conversations, the boy's warning and the fate choices. The native hidden-book order remains Water, Air, Fire. The workshop's **Zeal · Enhasa clown dreams** preset and `tests/zeal.test.mjs` verify the three actor loads, unchanged event instructions and a conversation followed by walking. Wider Zeal chapter adaptation remains in progress.

`content/carnival-dialogue.js` rewrites the mountain challenge, reward, repair, Puss’s flashbacks, cave opening, Farquaad confrontation, grave reunion and related antiquity references. Sir Bram is an original knight in the former Cyrus role. His 23 frames and pre-exile Puss’s 20 frames have private sprite resources. Native choices, quest-item consumption, equipment effects, battle AI, rewards and story flags remain intact. Timed Farquaad introductions retain their original delay and page controls.

## Equipped weapon rendering

Equipment IDs 61 and 66 select a second assembly table for all 245 Puss frame slots. Other weapons retain the rapier presentation. Both assemblies use the same raw PC graphics bank, palette, four-cell footprint and native cache; there is no additional WRAM or VRAM allocation. Every slot now has an explicit pose and original artwork, including the raised weapon and awakening gestures. Both full variants pass native VRAM comparisons and representative independent-emulator pixel checks.

`engine/hatchet-weapon.js` emits three bounded native routines. Each entry checks its original instruction signature before patching. It selects frame data without redirecting gameplay or changing animation timing.

| Entry | Native context | Result |
| --- | --- | --- |
| C0:CC34 | A/X/Y 16-bit, DB 00, DP 0100; object X | JSL replaces frame-offset addition; returns A and the assembly bank at DP+D5. Stack, X/Y, DB and DP survive. |
| C1:1C89 | X/Y 16-bit, DB 7E, DP 0000; resource-table X | JML replays the complete pointer/bank setup and returns at C1:1CA4. Preserves the two bank bytes pushed by the displaced instructions. |
| C2:F4AD | A/X/Y 16-bit, DB 7E, DP 1900 | JSL selects the assembly pointer at DP+07 after loading the normal pointer. Other characters retain their normal table entry. |

The helpers read the existing equipped-weapon byte at 7E:2769. The field and battle helpers identify Puss’s raw D3:0000 graphics source; the menu helper identifies assembly-table entry E4:230C. NMI code is unchanged. The build reports relocated helper addresses and lengths in `audit.carnival.equippedWeapon`.

## Memory and regression checks

Horizontal tile mirroring uses the native assembly bit 14. Vertical mirroring is deliberately unsupported by the encoder because the game’s field loader does not implement it. Pixel reconstruction tests verify every supporting pose after deduplication. Stable walking torsos allow limbs to animate while sharing tiles; the Muffin Man’s bank now fits its original 2,592-byte size, preventing a real festival sprite-heap overflow.

The current ROM is 8 MiB ExHiROM. Native streaming places selected larger graphics banks in the extended cartridge without adding WRAM or VRAM. The allocator packs rewritten text, events, compressed assets and helpers into verified reclaimed spans in the original half. Every reclaimed sprite pointer alias must be rewritten. Original dialogue data and unrelated resources are not assumed to be free. The manifest records all allocations and remaining space.

The workshop has a two-stage challenge preset and repair/shrine destinations, plus native frame previews for every clown and prop. The challenge preset grants a diagnostic loadout and sets the pre-fight quest state; Return from jump restores the prior state. Native fatal-screen loops are reported in diagnostics and fail area tests.

`tests/carnival.test.mjs` covers native CPU dispatch, frame/palette budgets, all 135 previews, the two controller-driven battles and wind ride, both forge helpers, the linked flashbacks and equipment handoff, and the shrine upgrade. The handoff test uses a diagnostic transition between Puss’s home and the mountain entrance; it is not a full campaign playthrough. The independent runner exercises the encounter and native weapon rendering in Snes9x and bsnes. Full campaign, optional branch and hardware acceptance remain tracked in `production.md`.
