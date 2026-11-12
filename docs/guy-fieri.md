# Guy Fieri and the Last Inn

Guy Fieri replaces Spekkio in all six training forms. The Last Inn (464) and lesson room (465) retain their 164 adapted strings, with seven additional messages for [Steve's 24-egg challenge](resurrection.md). Guy introduces Flavortown, explicitly name-drops *Diners, Drive-Ins and Dives*, and carries the road-trip theme through his lap lesson, practice return, victory and reward dialogue. He also explains Air/Fire/Water/Dirt, runs the original three-clockwise-laps lesson and offers native practice fights. Shrek answers him aloud. Pinocchio's magnets/scientist exchange and the original party-specific magic eligibility remain intact.

`content/guy-fieri.js` defines the native slots and six distinct twelve-color palettes. `engine/guy-fieri.js` selects generated source drawings for all 133 animation slots and adds deterministic palette-indexed spark/ember overlays; it does not redraw the accepted body anatomy. Blond spikes, sunglasses, goatee and a stocky chef silhouette identify Guy throughout. The progression runs from the classic black/orange flame shirt and metal spatula to cyan diner flamework and unarmed casting sparks at 10, crimson/gold grill-master flamework and attack embers at 20, a brighter orange flame mantle at 30, and a blue/cyan inferno halo with pale hair at 40. The level-99 Flavortown master uses royal purple and gold, golden utensils, a persistent flame crown and embers, and a fuller golden aura during casts and raises.

| Leader level | Enemy | Frames | Native cells | Presentation |
| --- | --- | --- | --- | --- |
| 1–9 | 224 | 26 | 4 | Classic black/orange starter, spatula gestures and jumps |
| 10–19 | 225 | 15 | 4 | Cyan diner flamework, unarmed casting and blue sparks |
| 20–29 | 226 | 27 | 4 | Crimson/gold grill master, directional ember attacks and guard |
| 30–39 | 227 | 21 | 8 | Brighter orange flame mantle and golden hair glow |
| 40–98 | 228 | 20 | 12 | Blue/cyan inferno halo and pale powered-up hair |
| 99 | 229 | 24 | 4 | Purple/gold Flavortown master, golden utensils, crown, embers and casting aura |

All forms share graphics bank 252: **1,021 tiles / 32,672 decoded bytes**, with 22,932 compressed bytes and 7,760 bytes across assemblies 232–237. The native ROM-streaming path reads the raw bank without decompressing it into the field heap. Room 465 therefore retains only its 3,072 bytes of ordinary props in that heap. Loading Guy through the old compressed-only path would exceed the 32 KiB room budget; the explicit bank selection is required. No extra WRAM, VRAM, cells or frame IDs are allocated. The original level thresholds, animation programs, AI, resistances, statistics and reward quantities remain unchanged.

The accepted source package is `assets/imagegen/guy-fieri/`: five selected generated sheets, 35 consumed body drawings, four effect drawings, prompts, provenance, exact sampling recipes, source-role maps and frozen binary hashes. Those accepted body, mantle and halo sources remain unchanged; the new tier palettes and bounded spark/ember overlays are compiled by `engine/guy-fieri.js`. Rear/right contacts use documented whole-source mirrors. The side walk changes the foreground arm more than the feet; further acting polish remains recorded in the source handoff. `scripts/verify-boss-sources.mjs` regenerates the production raster entries from the saved sources.

## Development and acceptance

The workshop offers **Guy Fieri · practice at level …** for levels 1, 10, 20, 30, 40 and 99. Each supplies a temporary test kit and selects the existing native lesson state. **Return from jump** restores the previous party, inventory, level and story. **Magic training · Guy Fieri** visits the room at the current progression. All six forms also appear in the native actor/frame inspector.

`tests/inn.test.mjs` checks complete text coverage, decision rows, original instructions, all six battle names, six distinct form palettes, signature action effects, the master's persistent flame crown, unchanged AI/stat tables, original level selection and all 133 slots. It completes the first lesson with actual movement around the three laps. Its short practice test sets the opponent's temporary HP to one to isolate the ordinary magic action and victory return; this is not a balance test.

`npm run test:boss-art-cores` checks every training frame in Snes9x and bsnes, including native cell positions and palettes. `npm run test:boss-scenes` checks all six real battle loads and their exact OAM/VRAM cells. Current fingerprints and the broader campaign limits are in [production status](production.md).
