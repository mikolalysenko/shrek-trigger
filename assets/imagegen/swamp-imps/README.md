# Swamp Imps, Roly mounts and riders — inactive source packet

Root and the sprite-art lead approved the complete generated model and native roles. This packet is frozen for root integration; it does not activate art or alter canonical output.

| Native group | Owners | Assembly | Poses | Cells | Programs |
| --- | --- | --- | --- | --- | --- |
| Imp | NPC78; enemies12–15 | 43 | 28 | 4 | 33 |
| Roly | enemies16–18,242 | 63 | 26 | 4 | 44,100 |
| Rider | enemy19 | 65 | 29 | 8 | 83 |

All ten headers, full size flags, original animations, AI, stats, event programs and names remain unchanged. The seven palettes 63/64/65/67/68/167/231 are exact original bytes, with no palette writes. Palette 67 also belongs to NPC152/226/230; 167 also belongs to enemy 27. AA44 remains shared with Scrap Rat NPC164. NPC78 is unrelated to the separate guard graphics bank 78.

Five unedited imagegen PNGs and their prompts supply the anatomy. Nearest sampling and original palette indexing produce the small waistcoated imp and leaf-eared rolling creature. `provenance.json` records sources, references, direction corrections and sampling. Original tiny shadows, dots and slash rasters remain explicit in `source-native-components.json`; no body anatomy was drawn procedurally.

`native-cell-raster.json` preserves each independent 16×16 indexed cell and its signed native origin. `compile-native-cells.js` is a synchronous, browser-compatible pure compiler that reproduces the exact selected 4bpp bank and assemblies. Earlier cells win overlaps. Rider slots 3–11 put the mount first; other slots put the imp first. Flattening the mounted pictures would lose hidden source pixels. The compiler retains the original component translations, the separate Rider12 bodies, left-turned15 and cropped upper-body28.

The 4/4/8-cell budgets and original body-height/lowest-pixel anchors are retained. The native cell rectangles are authored packings around the new raster, not unchanged original tile partitions. Reviewed width changes are −5…+1px for Imp and −6…+3px for Roly; all 54 unmounted body heights and bottom anchors match. The mounted source reuses those exact component pixels. Two four-pixel old mount-outline fragments in Rider3/5 are replaced by generated anatomy. Full per-slot geometry is in `geometry-audit.json` and each group’s frame map.

| Resource | Original CT and earlier active art | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Decoded graphics | 8,704 | 9,024 | +320 |
| Compressed graphics | 6,152 | 6,976 | +824 |
| Three assemblies | 4,480 | 4,480 | 0 |
| Compressed + assemblies | 10,632 | 11,456 | +824 |

Select gfx86 explicitly for the existing native size0/1 streaming path; preserve the default decoded ceiling for unselected banks. Including the 9,024-byte raw stream gives 20,480 total packet bytes, or +9,848 over either earlier storage baseline. No extra WRAM/VRAM or palette space is required. Root owns production allocation and revalidation of all emitted owners. `handoff.json` gives the exact reclaimable spans and wiring requirements.

Private proof baseline is `21abd2c3bb7bf8e2b7116433753701a4f375a9c8eb39c399ba6666ff824fb361`; candidate is `4d4e08bc43ae8791733e53bc7b3e3f57a74aad554442a8bec580e3312373dc39`. Earlier resource audit baseline is `e4c95d0481930abd79320855dbc5a2f8f9f2c018ac2e881c91ee2456d846d001`; the family bytes match between those baselines.

Native proof covers 273 owner/pose uploads, 1,208 displayed cells and 83,271 exact visible pixels. All 320 original program/action/facing cases passed two cycles, totaling 16,176 ticks. Requests and timers are unchanged. **Four Rider AA83 action6 boundary ticks—one per facing—display the complete previous pose for one extra video frame.** Transfers stay coherent; visible timing is not claimed identical. The separate action-entry/alignment capture adds 31 one-tick Rider delays across 31 cases in 14,876 startup ticks. Combined capture: 35 delayed ticks in 31,052 video ticks, never consecutive. The measured four-cell owners had no delays in either interval. `native-timing-startup-audit.json` records that distinction.

Original Truce Canyon112 formation `[12,12,16]` and Guardia forest119 formation `[19,19,19]` passed native field/combat pointer handoff, original cell placement, normal damage and victory. Original Medina33 NPC78 retained patrol and dialogue220. These checks use reversible native location entry and an endgame kit before normal events/controller input; they are bounded encounter proofs, not complete routes or balance tests. Observed field heaps were 8,192/14,784/160 bytes respectively. Conservative unions for all 26 source-load locations stay below 32 KiB: 30,528 bytes with legacy candidate loading, 21,504 with gfx86 streamed. Streaming is still required by the bank’s original 8,704-byte ceiling.

Review files include complete 1× atlases, enlarged action pages, all original/new source-action loops and `review/original-new-gaits.apng`. Native scene captures and exact trace fingerprints are separate. Real-scene map/party/color-math occlusion is counted honestly; exact isolated pixel proof covers every pose. Independent cores, final production addresses and connected routes remain root integration work.

Run from the repository root:

```sh
node assets/imagegen/swamp-imps/verify-frozen.mjs
node assets/imagegen/swamp-imps/verify-frozen.mjs --sources --proof
```

The second command regenerates from the five PNGs, verifies importer dependencies and checks the private proof fingerprints. It only writes inactive packet intermediates. `freeze.json` separates the minimal source/reproduction files from review and native proof artifacts; private ROMs, traces, surplus previews and unused packing trials are excluded from minimal source dependencies. Do not activate the two source-extraction import specs directly: the complete mounted family is the independent per-cell source.
