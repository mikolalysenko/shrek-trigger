# Dragon (Epoch replacement) — generated art pass

Dragon replaces the Epoch. The user asked to clean up her rough procedural art with OpenAI image generation. All sources here were generated with `gpt-image-2` through the Images API. Each call's request ID, size, quality and token usage is in `generation-log.jsonl`; no keys are stored. The selected outputs are in `sources/`.

`node scripts/import-dragon-art.mjs` converts them deterministically into `content/dragon-art.js`, using the base ROM for the native tile layout. `engine/dragon.js` and `engine/dragon-mode7.js` read that file. Native placement and timing are retained; flight selectors deliberately choose the head-down front art for both front/back directions and all non-side glides so the vehicle no longer appears backwards.

| Native use | Size | Source | How it is made |
| --- | --- | --- | --- |
| Hangar/boarding, folded wings (maps 121/52) | 112×160 | `folded.png` (`prompts/prompt-folded-guided-v1.txt`) | Guide + mask edit of `guide-folded.png` |
| Flight scenes, spread wings (maps 51/145/146/53/170) | 240×160 | `winged.png` (`prompt-winged-guided-v3.txt`) | Guide + mask edit of `guide-winged.png` |
| World map front/back/side, wing beats | 32×32 | `world-front.png`, `world-back.png`, `world-left.png` | Generated as enlarged 32-px sprites, grid-sampled |
| First-person saddle view (Mode 7 resource `$24`) | 256×96 | `saddle.png` (`prompt-saddle-v1.txt`) | Guide + mask edit of `guide-saddle.png` |
| Approach, banking and ending glides (`$26`/`$27`/`$46`) | 32×16 | World frames | Squashed 2:1, narrowed between views, sheared when banking |
| Seat actor (NPC 169) | 64×32 | Spread-wing art | Crop at canvas (88,74), where maps 51/145 leave the harness cells empty |

## Native constraints the conversion enforces

- **Guides.** The layout guides were drawn inside the native cells; images outside them would be cut at tile edges. The flight footprint is the Epoch's swept wing band with raised tips. The seats sit where the native rider sprites and the seat actor are drawn.
- **Mirroring.** Every image is mirrored about its center, because the native maps mirror the right half with flipped tiles.
- **Palette.** One twelve-color palette, found by k-means in Lab over both large images and sorted darkest first, is shared by every presentation. It feeds world OBJ palette 7, boarding rows 11/36/68, sprite palette 219, Mode 7 rows 4–8 and the ending palette. Colors 13–15 stay native.
- **Shared tiles.** The spread-wing art shares the folded head, neck, harness, hips and tail. Only the wing-root strips beside the body differ: 34 tiles, within the 52 unreferenced attachment slots that `patchDragon` remaps.
- **Side view.** The world side view keeps everything right of column 15 within rows 8–23, the only rows the native DMA rectangle stores.
- **Saddle view.** Rows 40–95 are fully opaque, because no sky layer exists below the raster split. The tiles the native OAM reuses for needles and levers stay empty.
- **Hand fix.** The front world view's face was redrawn by hand: two 2×2 eyes, cheeks and snout. The palette has no white, so the generated eye highlights collapsed.

## Prompting notes

- **Character references override guides.** Giving `gpt-image-2` a character reference image made it keep that reference's composition and ignore the guide. Guide plus mask with the design described only in text followed the silhouette.
- **Small sprites.** Sprites requested as "32×32 pixels shown enlarged" come back on a near-exact block grid, which `convert.mjs` recovers by edge fitting. Downscaling the large art to 32 pixels was unreadable.

`review/` has before/after captures from the JS core, cross-checked against bsnes: the trailer flight scene, the world map, the boarding scenes, the saddle view and the glide views.
