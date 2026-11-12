# Onion kart (Lab 32 race) — generated art pass

The user asked for the race graphics to be updated ("the old cart used some weird sprite, it looked really bad"). Shrek now drives an onion kart, generated with OpenAI `gpt-image-2`.

- `generation-log.jsonl` records each request ID; no keys are stored.
- `prompts/` holds the prompts and `sources/` the selected outputs.
- `node scripts/import-onion-kart-art.mjs` converts them deterministically into `content/onion-kart-art.js`. `engine/rivet-art.js` and `content/racing.js` read it.

| Native use | Size | Source |
| --- | --- | --- |
| Side views ×3 (packet 0) | 32×24 | `side.png` |
| Angled views ×2 | 32×24 | `angle.png` |
| Front view (faces the camera) | 32×32 | `front.png` |
| Back view | 32×32 | `back.png` |
| Parked kart (background bank 37, both orientations) | 96×48 | `parked.png` |
| Rider patches (packet 1) | 4 × 8×8 | Copied from the race views |

- **Driver.** The safety system rejected a generated kart with the ogre driving it (`prompt-kart-side-v1.txt`). Every kart was therefore generated empty, and the driver is Shrek's own field-sprite head (`rasterArt('shrek')`), seated with the kart drawn over his lower rows. The native phases bob his head one pixel.
- **Conversion.** Sources were drawn on flat magenta, because a green key would eat his skin. Each kart is area-averaged into its native frame.
- **Palette.** The 15-color palette is Shrek's twelve colors plus three onion golds found by k-means. It feeds race palette rows 8/12 and parked-cart palette 19 row 6.
- **Rider patches.** Packet 1 is the four 8×8 rider patches the native race pastes over the player's racer: Crono's hair and face in the stock game. They were previously mistaken for minimap icons, which drew a dark block over the driver's face. The patches now repeat the kart frames' own pixels at the native paste positions: (8,0) for the side views, (12,8) for the front and (12,0) for the back.

`review/` has before/after captures of the attract-demo race and the gameplay race from the JS core.
