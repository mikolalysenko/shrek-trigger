# Supporting-cast cartridge assets

`content/supporting-cast.js` is the editable role/palette inventory. `engine/supporting-art.js` selects indexed artwork; generated raster actors come through `engine/raster-art.js`, while the earlier procedural assets remain until their replacements pass review. `engine/supporting-cast.js` assigns the native frame IDs, compiles 4bpp tiles and emits ROM records. The build manifest includes the role, source slot, NPC/enemy IDs, all frame assignments, native graphics/assembly/palette indices, dimensions, author, raster provenance when present, and a source scene. These scene IDs contain native load commands for the actor; story flags still govern whether the actor appears on a diagnostic visit.

The current pass contains twenty entries and 345 frame slots. Steve Harwell replaces Gaspar's two appearances and adds two egg-eating frames; [his quest](resurrection.md) uses an imagegen source atlas. Shared Charming/impostor graphics remain shared, with distinct palettes. The Three Pigs occupy one native actor and exposition role. Lyra is an original apprentice fairy; King Alder and Queen Elowen are distinct medieval ancestors. Rowan is the recurring original storyteller. Fiona has separate human court art and her existing ogre party art. Sir Bram and pre-exile Puss replace the two companions in the hatchet quest’s flashbacks.

All supporting frames fit four 16×16 OBJ cells, a 32×32 canvas and twelve opaque colors. Tile zero stays blank. The native animation lists and duration tables are unchanged. Walking direction and gait come from each original animation list; other frame IDs have explicit scene-pose assignments. The queen's assembly grows from fifteen to nineteen frames in a relocated block, matching the full animation shared with court Fiona without overwriting the next actor.

## Shared-resource isolation

| Replacement | Native slots | Reason |
| --- | --- | --- |
| Nobody home | GFX 249, assembly 231, palette 138; NPC 215 | Shrek lives alone. Crono's mother's rooms load this empty actor (21 blank frames) so her event programs run with nobody drawn. NPC 37 keeps its stock townswoman art. |
| Onion jar | GFX 74, assembly 251, palette 61; NPC 219 | The savings jar downstairs and in the fortress illusion: one generated frame in all 21 slots. NPC 219 is loaded by no original event. |
| Big Bad Wolf | GFX 249, assembly 8, palette 13; NPC 218 | The Wolf in Grandma's nightgown and bonnet, in Donkey's house, the red Gate flashback and the parade. The stock townswoman row (NPC 213, GFX 36, palette 8) is untouched. |
| Blind Mouse | GFX 249, assembly 9, stock palette 133; NPC 220 | One of the Three Blind Mice, with dark glasses and a cane, in the workshop, the house, the Telepod exhibit, the parade, the bell and the fortress illusion. The stock tradesman (NPC 39, GFX 35) keeps the smithy, the soda contest and every other room. |
| Young Donkey | GFX 249, assembly 10, stock palette 130; NPC 221 | The foal in the red Gate flashback. The stock child row (NPC 38, GFX 22) is untouched. |
| Human Fiona | GFX 250, assembly 120, palette 150 | Original court Fiona and the medieval queen share GFX 39. |
| King Alder | GFX 251, assembly 14, palette 154 | Original present and medieval kings share GFX 29. |
| Sir Bram | GFX 254, assembly 243, palette 119; NPC 53 | Original knight shares graphics and assembly with soldiers. |
| Pre-exile Puss | GFX 71, assembly 244, palette 120; NPC 54 | Original Glenn shares resources with ordinary villagers. |
| Other story actors | See manifest | Private palettes prevent changes to guards, gate keys, save points and scene props. |

### Donkey's family

The Wolf, the Blind Mouse and young Donkey (`content/donkey-family.js`, `engine/donkey-family.js`) follow the empty-house pattern: each room's event object keeps its script and only its Load NPC operand changes to a row no original event loads (rooms 4, 8, 9, 80, 81 and 125; ten one-byte edits). Each keeps its source actor's animation program and frame count (21, 31 and 15 slots), so every frame ID a scene asks for exists.

No graphics slot is unowned any more, so the three share bank 249 with the empty-house actor, whose frames only reference the blank tile zero. The merged bank is 341 tiles (10,912 bytes), streamed raw like the other story actors; its compressed packet and the three assemblies sit in extended data. Palette 13 was the last unowned palette and is the Wolf's (grey fur, pink nightgown). The Mouse and the foal are indexed directly in the stock palettes of the actors they replace (133 and 130), which are not rewritten: the fair and the parade therefore allocate exactly the OBJ palette rows they did before. The foal is a little bluer than the party Donkey for that reason. The Mouse is 23 pixels tall on the tradesman's baseline; the tradesman's hammer slots hold his cane raised and struck.

Sources are under `assets/imagegen/wolf`, `blind-mouse` and `young-donkey` (prompt, source PNG, provenance, `import-spec.json` with notes). `node scripts/capture-donkey-family.mjs` renders each room to `.local/qa/donkey-family/`; `tests/donkey-family.test.mjs` checks the edits, the stock rows, every frame slot, the streamed uploads and the flashback.

Unused slot claims are checked against all 256 PC/NPC and 256 enemy headers. Palette claims also reject pointer aliases. GFX 255 remains forbidden because the loader uses it as a cache-empty sentinel. Godmother explicitly owns the NPC 74/204 and enemy 37 representations; the shared combat appearance therefore changes with her field appearance.

## Native frame preview

Quick start in the browser workshop, choose a **Character or quest prop**, select a **Native sprite frame**, and click **View in cartridge**. Frame selection then scrubs the actual cartridge assembly. **Return from jump** restores the complete state from before entering the preview, even after changing actors. This is a diagnostic visit, not story progression.

The preview replaces the kitchen caretaker's `82` initialization operand at the verified event-init boundary. Its regular event function becomes an eight-byte native loop: face front, `AC` static frame, pause, jump back. Scrubbing changes one operand; repeated changes never grow the injected script. The kitchen controller is stopped during the preview. No diagnostic code is included in the exported IPS.

`tests/supporting.test.mjs` checks shared-resource preservation, tile bounds, native palettes and all 345 frame selections. Pixel reconstruction checks horizontal tile mirroring against the original indexed rasters. Browser automation checks frame selection and undo. `npm run test:independent -- all` checks front/last frames and palette refresh in Snes9x and bsnes, recording screenshots and ROM hashes. Independent checks use a native kitchen event sequence in WRAM; they do not patch CPU execution or alter the tested ROM.

Guy Fieri’s six additional enemy-backed training tiers are documented in [guy-fieri.md](guy-fieri.md), and the clowns and weapon props in [carnival.md](carnival.md). The full campaign scene review is still pending. Generated Horner, enforcer, swamp, ghost and trainer art and the authentic-model Magic Mirror are now integrated; their per-build acceptance is tracked in production.md. Remaining doubles, rare party acting poses, scene choreography and dialogue still require production work.
