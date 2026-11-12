# Rivet and the racing cart

Rivet is a brass clockwork attraction performer with a teal cap, goggles, a red scarf, a winding key and folding wheel boots. Shrek drives an onion kart: a golden onion bulb with a green sprout nose, a root tuft, a brown leather seat and gold-hubbed wheels. The kart art comes from OpenAI `gpt-image-2` generations; see `assets/imagegen/onion-kart` and `scripts/import-onion-kart-art.mjs`. The image model would not draw Shrek, so the driver is Shrek's own field-sprite head seated on the kart, using his twelve colors plus three onion golds. The parked kart and the race views use the same fifteen colors. Rivet's art is in `engine/rivet-art.js`.

## Native resources

Rivet's field NPC 2 and enemy record 244 share graphics 37, assembly 26 and palette 157. They retain their different native animation programs, 77 and 142 respectively. The replacement has 25 four-cell 32×32 poses, twelve visible colors, 3,328 decoded graphics bytes and 1,000 assembly bytes. The source graphics budget was 4,480 bytes. Native assembly offsets provide small wheel bobs without duplicate tile images. No actor header, AI or animation program changes.

The cinematic pointer table begins at file `3E0006`. The race consumes these packets:

| Packet | Content | Decoded bytes | Layout |
| --- | --- | --- | --- |
| 0 | Seven Shrek/cart views | 11,776 | Raw color indices, 64-byte row stride; left 32 columns used |
| 1 | Four rider patches | 256 | Four linear 8×8 images |
| 2 | Six Rivet views | 9,216 | Raw color indices, 64-byte row stride; left 24 columns used |
| 3 | Race palette | 512 | 256 native BGR555 colors |

The race's software projector converts these raw images into the existing SNES graphics buffers. Packet 0 has three 32×24 side frames, two 32×32 front/back frames and two 32×24 angled frames.

Packet 1 is not a minimap. The race pastes its four 8×8 images over the player's racer every frame as solid blocks; in the stock game they are Crono's hair and face. Patches 0 and 1 land on the side views at (8,0), patch 2 on the front view at (12,8) and patch 3 on the back view at (12,0). Each onion-kart patch repeats the kart frame's own pixels at its paste position, so the paste leaves the art unchanged. The earlier minimap icons in this packet drew a dark block over the driver's face. Rivet has six 24×24 frames. Unused columns remain zero. There is no browser drawing overlay or new projection code.

Only the fifteen visible colors in palette rows 8/12 (cart) and 9/13 (Rivet) change. Transparent entries and the other twelve rows remain byte-identical. Packets 4–12 retain the original HUD, sky, road and maps. Both native race modes retain their program, scoring, steering, boost cooldown, camera controls and finish choreography. `FF 00` starts the boost race; `FF 09` starts the no-boost race.

The parked vehicle is background graphics packet 37 in the separate table at `362220`; it is unrelated to actor graphics bank 37. Tileset 7 uses 72 of that packet's 128 tiles for the 96×48 vehicle. Those tiles occupy local indices `y*16+x`, with `x=0..11` and `y=0..5`. The other 56 tiles stay unchanged. The two orientations share the existing mirrored metatile assembly. Maps 126/127, collision, scene entrances and actor placement remain unchanged.

The parked cart's fifteen colors occupy stored palette 19 row 6, loaded into CGRAM entries 113–127. The builder checks that background bank 37 belongs only to tileset 7, that palette 19 belongs only to locations 212, 213, 223, 224 and 225, and that the cart's tiles and palette have no other assembly owner. This preserves the surrounding road scenery.

The cartridge remains 4 MiB; the current free-space measurement is recorded in [production.md](production.md). Runtime WRAM and VRAM requirements do not increase. Only completely replaced, uniquely referenced packets are reclaimed; conservative pointer matches keep the old cart/minimap cinematic packets reserved.

## Diagnostics and acceptance

Three reversible workshop checkpoints prepare Rivet's introduction, the boost race and the no-boost race with the recorder. The native actor preview exposes all 25 field poses. The checkpoints supply the bike key and, for the last preset, the race recorder; native events control everything after entry. Return from jump restores the complete prior state. These fixtures are absent from the IPS.

`tests/racing.test.mjs` checks resource ownership, decoded sizes, palette isolation, unchanged road maps/collision and unchanged race code. Controller tests play the introduction, walk around the crew to the cart, spend a boost, lose, board again with replenished boosts, win both modes, turn the camera in both directions and record the actual score. Live source buffers, CGRAM and the parked vehicle's VRAM are compared with the emitted assets. The machine tests also verify all 25 Rivet field frames through native uploads and displayed indexed pixels.

`scripts/independent-racing.mjs` repeats the race paths in Snes9x and bsnes. Its driver reads native positions and sends ordinary pad input, including countersteering for the original lateral momentum. It writes no race position, speed, result or score after checkpoint setup. The main independent runner includes this check and records its outcomes under each core's `racing/` directory.

Rare-score fixtures begin at a native completed-race return to exercise the reward branches. They cover 1300, 1500, 2000 and 2300 points; a repeated high reward after the one-time stat item; 777; and the three smaller prize types. They verify awarded item IDs/counts and top-three ordering. These fixtures do not claim a controller earned those exact scores. The 1300-point text now correctly names five Sweet Onions; the 2300-point text names five Rich Onion Soups. The 2000-point branch still awards five Onion Broths. The Orange Faygo is awarded only once.

The [ruined-road controller route](future-wildlife.md) now obtains the recorder from its real chest after three native battles, clears the fourth encounter, walks to the east entrance, introduces the Scorekeeper, selects no-boost mode and wins the return race to the west. Its earned score is recorded by the native event. The same route runs in SnesJs and both independent cores without gameplay writes after fixture setup. The streaming runner also executes the shared western Lab 16 traversal, reporting its five formations and real exit under `westernRuins`.

These scene checks do not replace fresh-campaign progression, continuous traversal of the future or hardware validation. The wildlife pass covers rats, wisps, workshop residues, rootlings, snapping briars, a mounted rider, golems, enchanted pots and beetles. Remaining organic enemies, sewer creatures, workshop props and the archive's Cosmic Muffin presentation remain separate chapter work.
